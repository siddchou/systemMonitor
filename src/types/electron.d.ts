// Type declarations for Electron IPC

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production';
    readonly ELECTRON_START_URL?: string;
  }
}

import { GPUData } from './gpu';

// IPC handlers
declare global {
  namespace ipcRenderer {
    function invoke(channel: 'get-gpus'): Promise<GPUData[]>;
  }
}

export {};
