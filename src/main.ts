import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'node:path';
import * as url from 'node:url';
import { execSync } from 'node:child_process';

// Setup __dirname and __filename for ES modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Subsystem ID to manufacturer lookup (last 4 chars of SUBSYS)
const MANUFACTURERS: Record<string, string> = {
  // Core Silicon / Core Chipset Manufacturers
  '1002': 'AMD',
  '10DE': 'NVIDIA',
  '8086': 'Intel',
  '13B5': 'ARM',
  '5143': 'Qualcomm',
  '10EC': 'Realtek',
  '1106': 'VIA',

  // System & Component Board Manufacturers
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

// Get GPU data
function getGPUs(): Promise<any[]> {
  return new Promise((resolve) => {
    try {
      const output = execSync(
        'nvidia-smi --query-gpu=name,temperature.gpu,power.draw,power.limit,utilization.gpu,memory.used,memory.total,gpu_bus_id,pci.sub_device_id --format=csv,noheader',
        { encoding: 'utf8' }
      );
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
      resolve(gpus);
    } catch (error) {
      console.error('Error fetching GPUs:', error);
      resolve([]);
    }
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
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 16 },
  });

  // Load the app from dist/renderer/src/index.html
  const htmlPath = path.join(__dirname, 'renderer', 'src', 'index.html');
  console.log('Loading HTML from:', htmlPath);
  mainWindow.loadFile(htmlPath);

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle GPU data requests from renderer
  ipcMain.handle('get-gpus', async () => {
    return await getGPUs();
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

// Graceful shutdown
app.on('before-quit', () => {
  console.log('GPU Monitor shutting down...');
});
