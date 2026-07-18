import { app, protocol } from 'electron';
import * as http from 'http';
import { spawn } from 'child_process';

// Subsystem ID to manufacturer lookup (last 4 chars of SUBSYS)
const MANUFACTURERS: Record<string, string> = {
  '10DE': 'NVIDIA',
  '1458': 'MSI',
  '1462': 'Gigabyte',
  '19DA': 'ASUS',
  '1043': 'ASUS',
  '107D': 'Zotac',
  '104D': 'EVGA',
  '10BD': 'PNY',
  '10CF': 'Palit',
  '1554': 'Inno3D',
  '196E': 'AORUS',
  '1A02': 'GALAX',
  '1B49': 'Inno3D',
  '1C10': 'ASRock',
  '1D05': 'XFX'
};

function getManufacturer(subsysId: string): string {
  let id = subsysId;
  if (id.startsWith('0x')) {
    id = id.slice(2);
  }
  const vendor = id.slice(-4);
  return MANUFACTURERS[vendor] || 'Unknown';
}

// Async exec with timeout to prevent blocking
function execAsync(command: string, timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    let timeoutId: NodeJS.Timeout | null = null;
    let killed = false;

    const process = spawn(cmd, args, {
      shell: true
    });

    // Set encoding on the streams directly
    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');

    let output = '';
    let errorOutput = '';

    timeoutId = setTimeout(() => {
      killed = true;
      try { process.kill('SIGTERM'); } catch (e) {}
      reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
    }, timeout);

    process.stdout.on('data', (data: string) => {
      output += data;
    });

    process.stderr.on('data', (data: string) => {
      errorOutput += data;
    });

    process.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);

      if (killed) return;
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}: ${errorOutput || output}`));
      }
    });

    process.on('error', (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });
  });
}

// Get CPU data
function getCPUs(): Promise<any[]> {
  return new Promise((resolve) => {
    const cpuCmd = 'powershell -Command "Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,LoadPercentage,CurrentClockSpeed | Format-List"';
    const memCmd = 'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory | Format-List"';

    Promise.all([execAsync(cpuCmd), execAsync(memCmd)]).then(([cpuInfo, memInfo]) => {
      function parseProp(name: string, text: string): string {
        const match = text.match(new RegExp(`${name}\\s*:\\s*(.+)$`, 'm'));
        return match ? match[1].trim() : '0';
      }

      const totalMemMB = parseFloat(parseProp('TotalVisibleMemorySize', memInfo)) / 1024;
      const freeMemMB = parseFloat(parseProp('FreePhysicalMemory', memInfo)) / 1024;

      const result = [{
        id: 0,
        name: parseProp('Name', cpuInfo),
        cores: parseInt(parseProp('NumberOfCores', cpuInfo)) || 0,
        logicalProcessors: parseInt(parseProp('NumberOfLogicalProcessors', cpuInfo)) || 0,
        utilization: parseFloat(parseProp('LoadPercentage', cpuInfo)) || 0,
        clockSpeed: parseFloat(parseProp('CurrentClockSpeed', cpuInfo)) || 0,
        memoryUsed: totalMemMB - freeMemMB,
        memoryTotal: totalMemMB
      }];

      resolve(JSON.parse(JSON.stringify(result)));
    }).catch((error) => {
      console.error('Error fetching CPUs:', error);
      resolve([]);
    });
  });
}

// Get GPU data
function getGPUs(): Promise<any[]> {
  return new Promise((resolve) => {
    const gpuCmd = 'nvidia-smi --query-gpu=name,temperature.gpu,power.draw,power.limit,utilization.gpu,memory.used,memory.total,gpu_bus_id,pci.sub_device_id --format=csv,noheader';

    execAsync(gpuCmd).then((output) => {
      try {
        const lines = output.trim().split('\n');
        const gpus = lines.map((line, i) => {
          const parts = line.split(',').map(p => p.trim());
          const subDeviceId = parts[8]?.trim() || '';
          const manufacturer = getManufacturer(subDeviceId);

          return {
            id: i,
            name: parts[0] || `GPU ${i}`,
            manufacturer,
            temp: parseFloat(parts[1]) || 0,
            powerDraw: parseFloat(parts[2]?.replace('W', '')) || 0,
            powerLimit: parseFloat(parts[3]?.replace('W', '')) || 0,
            utilization: parseFloat(parts[4]?.replace('%', '')) || 0,
            memoryUsed: parseFloat(parts[5]?.replace('MiB', '')) || 0,
            memoryTotal: parseFloat(parts[6]?.replace('MiB', '')) || 0
          };
        });

        resolve(JSON.parse(JSON.stringify(gpus)));
      } catch (error) {
        console.error('Error parsing GPU data:', error);
        resolve([]);
      }
    }).catch((error) => {
      console.error('Error fetching GPUs:', error);
      resolve([]);
    });
  });
}

// Create the API server
export function createAPIServer(): Promise<{ port: number; stop: () => void }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.url === '/api/gpus') {
        try {
          const gpus = await getGPUs();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(gpus));
        } catch (error) {
          console.error('Error fetching GPUs:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to fetch GPU data' }));
        }
      } else if (req.url === '/api/cpus') {
        try {
          const cpus = await getCPUs();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(cpus));
        } catch (error) {
          console.error('Error fetching CPUs:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to fetch CPU data' }));
        }
      } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } else if (req.url === '/cache/clear') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    const PORT = 8080;
    server.listen(PORT, () => {
      console.log(`GPU Monitor API on port ${PORT}`);
      resolve({ port: PORT, stop: () => server.close() });
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}
