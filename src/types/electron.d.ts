// Type declarations for the Electron preload bridge (window.gpuMonitor)

import { GPUData, CPUData } from './gpu';

declare global {
  interface Window {
    gpuMonitor: {
      getGPUs(): Promise<GPUData[]>;
      getCPUs(): Promise<CPUData[]>;
      clearDataCache(): Promise<void>;
    };
  }
}

export {};
