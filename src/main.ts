import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import * as url from 'node:url';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';

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

// --- Linux CPU/memory via /proc and /sys (no external tools needed) ---

const IS_LINUX = process.platform === 'linux';

// Previous /proc/stat sample, used to compute utilization as a delta between polls
let lastCpuStat: { idle: number; total: number } | null = null;

function readProcStat(): { idle: number; total: number } {
  const line = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0];
  // "cpu user nice system idle iowait irq softirq steal guest guest_nice"
  const fields = line.trim().split(/\s+/).slice(1).map(Number);
  const idleAll = (fields[3] || 0) + (fields[4] || 0); // idle + iowait
  const total = fields.reduce((a, b) => a + b, 0);
  return { idle: idleAll, total };
}

function getCpuUtilization(): number {
  try {
    const cur = readProcStat();
    let util = 0;
    if (lastCpuStat && cur.total > lastCpuStat.total) {
      const dTotal = cur.total - lastCpuStat.total;
      const dIdle = cur.idle - lastCpuStat.idle;
      util = Math.max(0, Math.min(100, ((dTotal - dIdle) / dTotal) * 100));
    }
    lastCpuStat = cur;
    return util;
  } catch {
    return 0;
  }
}

function getLinuxCpuInfo(): any {
  const cpus = os.cpus();
  const name: string = (cpus[0]?.model || 'Unknown CPU').replace(/\s+/g, ' ').trim();

  // Physical cores = unique (physical id, core id) pairs in /proc/cpuinfo
  let physicalCores = 0;
  try {
    const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
    const coreSet = new Set<string>();
    for (const block of cpuinfo.split(/\n\s*\n/)) {
      const get = (key: string): string => {
        const m = block.match(new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm'));
        return m ? m[1].trim() : '';
      };
      const coreId = get('core id');
      if (coreId) coreSet.add(`${get('physical id') || '0'}:${coreId}`);
    }
    physicalCores = coreSet.size;
  } catch {}

  // Current clock: average of per-core scaling_cur_freq (kHz -> MHz), fallback to os.cpus() speed
  let clockSum = 0, clockCount = 0;
  try {
    const cpuDir = '/sys/devices/system/cpu';
    for (const entry of fs.readdirSync(cpuDir).filter((f) => /^cpu\d+$/.test(f))) {
      try {
        const freqKhz = parseInt(fs.readFileSync(`${cpuDir}/${entry}/cpufreq/scaling_cur_freq`, 'utf8'), 10);
        if (!Number.isNaN(freqKhz)) { clockSum += freqKhz / 1000; clockCount++; }
      } catch {}
    }
  } catch {}
  const clockSpeed = clockCount > 0 ? Math.round(clockSum / clockCount) : (cpus[0]?.speed || 0);

  // Memory from /proc/meminfo (values in kB); MemAvailable is a better "free" than MemFree
  let memoryTotal = 0, memoryUsed = 0;
  try {
    const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
    const getKB = (key: string): number => {
      const m = meminfo.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'));
      return m ? parseInt(m[1], 10) : 0;
    };
    const totalKB = getKB('MemTotal');
    const availKB = getKB('MemAvailable') || getKB('MemFree');
    memoryTotal = totalKB / 1024;
    memoryUsed = (totalKB - availKB) / 1024;
  } catch {}

  return {
    id: 0,
    name,
    cores: physicalCores || cpus.length,
    logicalProcessors: cpus.length,
    utilization: getCpuUtilization(),
    clockSpeed,
    memoryUsed,
    memoryTotal
  };
}

function getCPUs(): Promise<any[]> {
  if (IS_LINUX) {
    return new Promise((resolve) => {
      try {
        resolve([getLinuxCpuInfo()]);
      } catch (error) {
        console.error('Error fetching CPUs:', error);
        resolve([]);
      }
    });
  }

  // Windows: PowerShell + WMI
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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
