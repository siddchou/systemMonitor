import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import * as url from 'node:url';
import { spawn } from 'node:child_process';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANUFACTURERS: Record<string, string> = {
  '1002': 'AMD',
  '10DE': 'NVIDIA',
  '8086': 'Intel',
  '13B5': 'ARM',
  '5143': 'Qualcomm',
  '10EC': 'Realtek',
  '1106': 'VIA',
  '1025': 'Acer',
  '1B49': 'Albatron',
  '196E': 'AORUS',
  '1C10': 'ASRock',
  '1043': 'ASUS',
  '1092': 'Diamond Multimedia',
  '10BD': 'DFI',
  '1028': 'Dell',
  '104D': 'Sony',
  '10CF': 'Fujitsu',
  '1A02': 'GALAX',
  '1458': 'Gigabyte',
  '103C': 'HP',
  '1554': 'Inno3D',
  '17AA': 'Lenovo',
  '107D': 'Leadtek',
  '1462': 'MSI',
  '1569': 'Palit',
  '196D': 'PNY',
  '148C': 'PowerColor',
  '1DA2': 'Sapphire',
  '1179': 'Toshiba',
  '1545': 'VisionTek',
  '1682': 'XFX',
  '19DA': 'Zotac'
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

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f0c29',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const htmlPath = path.join(__dirname, 'renderer', 'index.html');
    mainWindow.loadFile(htmlPath);
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  ipcMain.handle('get-gpus', async () => {
    return await getGPUs();
  });

  ipcMain.handle('get-cpus', async () => {
    return await getCPUs();
  });

  // Clear caches on demand (e.g., if user manually refreshes)
  ipcMain.handle('clear-data-cache', () => {
    // Cache is no longer used, but kept for API compatibility
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (!mainWindow && BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
