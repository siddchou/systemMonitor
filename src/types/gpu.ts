export interface GPUData {
  id: number;
  name: string;
  manufacturer: string;
  temp: number;
  powerDraw: number;
  powerLimit: number;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
}

export interface GPUHistory {
  [key: number]: number[];
}

export interface CPUData {
  id: number;
  name: string;
  cores: number;
  logicalProcessors: number;
  utilization: number;
  clockSpeed: number;
  memoryUsed: number;
  memoryTotal: number;
}

export interface CPUHistory {
  [key: number]: number[];
}

// Chart.js types
interface ChartDataset {
  label?: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  tension: number;
  fill: boolean;
  pointRadius: number;
  pointHoverRadius: number | null;
}

interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  animation: { duration: number };
  plugins: { legend: { display: false } };
  scales: {
    x: { display: boolean };
    y: { min: number; max: number; display: boolean; grid: { color: string }; ticks: { color: string; font: { size: number } } };
  };
  interaction: { mode: 'index'; intersect: boolean };
}

interface Chart {
  constructor(ctx: CanvasRenderingContext2D, config: { type: string; data: { labels: number[]; datasets: ChartDataset[] }; options: ChartOptions });
  destroy(): void;
}

declare const Chart: {
  new (ctx: CanvasRenderingContext2D, config: { type: string; data: any; options: any }): {
    data: any;
    update(): void;
    destroy(): void;
  };
};
