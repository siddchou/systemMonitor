// Sandboxed preloads always load as CommonJS, even with "type": "module" in package.json.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gpuMonitor', {
  getGPUs: () => ipcRenderer.invoke('get-gpus'),
  getCPUs: () => ipcRenderer.invoke('get-cpus'),
  clearDataCache: () => ipcRenderer.invoke('clear-data-cache'),
});
