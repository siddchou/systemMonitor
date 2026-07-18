import { useEffect, useRef } from 'react';
import type { Chart, ChartConfiguration } from 'chart.js';

interface GPUChartProps {
  data: number[];
  color: string;
}

declare global {
  interface Window {
    Chart?: typeof Chart;
  }
}

const GPUChart = ({ data, color }: GPUChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<InstanceType<any> | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clean up existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          label: 'Temp',
          data: data,
          borderColor: color,
          backgroundColor: `${color}20`,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: {
            min: 0,
            max: 100,
            display: true,
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#aaa', font: { size: 10 } }
          }
        },
        interaction: { mode: 'index', intersect: false },
      },
    };

    chartInstanceRef.current = new window.Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data, color]);

  return <canvas ref={canvasRef} height="60" />;
};

export default GPUChart;
