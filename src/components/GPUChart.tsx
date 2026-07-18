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

    // Initialize chart once on mount
    if (!chartInstanceRef.current) {
      const config: ChartConfiguration = {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Temp',
            data: [],
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
          animation: { duration: 200 },
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
    }

    // Always update data when data prop changes
    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = data.map((_, i) => i);
      chartInstanceRef.current.data.datasets[0].data = data;
      chartInstanceRef.current.update();
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [color]); // Only re-create chart when color changes

  return <canvas ref={canvasRef} height="60" />;
};

export default GPUChart;
