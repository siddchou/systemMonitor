import { app, protocol } from 'electron';
import * as http from 'http';
import { execSync } from 'child_process';

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

// Get CPU data
function getCPUs(): any[] {
  try {
    const cpuInfo = execSync(
      'powershell -Command "Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,LoadPercentage,CurrentClockSpeed | Format-List"',
      { encoding: 'utf8' }
    );
    const memInfo = execSync(
      'powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory | Format-List"',
      { encoding: 'utf8' }
    );

    function parseProp(name: string, text: string): string {
      const match = text.match(new RegExp(`${name}\\s*:\\s*(.+)$`, 'm'));
      return match ? match[1].trim() : '0';
    }

    const totalMemMB = parseFloat(parseProp('TotalVisibleMemorySize', memInfo)) / 1024;
    const freeMemMB = parseFloat(parseProp('FreePhysicalMemory', memInfo)) / 1024;

    return [{
      id: 0,
      name: parseProp('Name', cpuInfo),
      cores: parseInt(parseProp('NumberOfCores', cpuInfo)) || 0,
      logicalProcessors: parseInt(parseProp('NumberOfLogicalProcessors', cpuInfo)) || 0,
      utilization: parseFloat(parseProp('LoadPercentage', cpuInfo)) || 0,
      clockSpeed: parseFloat(parseProp('CurrentClockSpeed', cpuInfo)) || 0,
      memoryUsed: totalMemMB - freeMemMB,
      memoryTotal: totalMemMB
    }];
  } catch (error) {
    console.error('Error fetching CPUs:', error);
    return [];
  }
}

// Get GPU data
function getGPUs(): any[] {
  try {
    const output = execSync(
      'nvidia-smi --query-gpu=name,temperature.gpu,power.draw,power.limit,utilization.gpu,memory.used,memory.total,gpu_bus_id,pci.sub_device_id --format=csv,noheader',
      { encoding: 'utf8' }
    );
    return output.trim().split('\n').map((line, i) => {
      const parts = line.split(',').map(p => p.trim());
      const subDeviceId = parts[8]?.trim() || '';
      const manufacturer = getManufacturer(subDeviceId);
      return {
        id: i,
        name: parts[0] || `GPU ${i}`,
        manufacturer,
        temp: parseFloat(parts[1]) || 0,
        powerDraw: parseFloat(parts[3]?.replace('W', '')) || 0,
        powerLimit: parseFloat(parts[4]?.replace('W', '')) || 0,
        utilization: parseFloat(parts[5]?.replace('%', '')) || 0,
        memoryUsed: parseFloat(parts[6]?.replace('MiB', '')) || 0,
        memoryTotal: parseFloat(parts[7]?.replace('MiB', '')) || 0
      };
    });
  } catch (error) {
    console.error('Error fetching GPUs:', error);
    return [];
  }
}

// Create the API server
export function createAPIServer(): Promise<{ port: number; stop: () => void }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/api/gpus') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getGPUs()));
      } else if (req.url === '/api/cpus') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getCPUs()));
      } else if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
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
