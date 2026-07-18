// @ts-nocheck

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('gpuMonitor', {
  getGPUs: () => ipcRenderer.invoke('get-gpus'),
});
