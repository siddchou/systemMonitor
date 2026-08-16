import { GPUData, GPUHistory } from '../types/gpu';
import GPUChart from './GPUChart';
import { getTempStyles } from '../utils/tempThresholds';

interface GPUCardProps {
  gpu: GPUData;
  tempHistory: number[];
}

const GPUCard = ({ gpu, tempHistory }: GPUCardProps) => {
  // Memoize computed values to avoid recalculation on every render
  const tempPct = Math.min(gpu.temp, 100);
  const tempStyles = getTempStyles(gpu.temp);
  const powerPct = Math.min((gpu.powerDraw / gpu.powerLimit) * 100, 100);
  const utilPct = Math.min(gpu.utilization, 100);
  const memPct = Math.min((gpu.memoryUsed / gpu.memoryTotal) * 100, 100);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-cyan-500/20">
      {/* Glowing accent on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {gpu.name}
            </h3>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">
              {gpu.manufacturer} NVIDIA
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full border ${tempStyles.badgeClass} text-xs font-semibold`}>
            {gpu.temp.toFixed(0)}°C
          </div>
        </div>

        {/* Grid of metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider">
              <span>Temperature</span>
              <span>{tempPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${tempStyles.barGradientClass} transition-all duration-300`}
                style={{ width: `${tempPct}%` }}
              />
            </div>
            <p className="text-sm text-white/80">{gpu.temp.toFixed(1)}°C</p>
          </div>

          {/* Power */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider">
              <span>Power</span>
              <span>{powerPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                style={{ width: `${powerPct}%` }}
              />
            </div>
            <p className="text-sm text-white/80">
              {gpu.powerDraw.toFixed(1)} / {gpu.powerLimit.toFixed(0)}W
            </p>
          </div>

          {/* Utilization */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider">
              <span>Utilization</span>
              <span>{utilPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${utilPct}%` }}
              />
            </div>
            <p className="text-sm text-white/80">{gpu.utilization.toFixed(1)}%</p>
          </div>

          {/* Memory */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider">
              <span>Memory</span>
              <span>{memPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
                style={{ width: `${memPct}%` }}
              />
            </div>
            <p className="text-sm text-white/80">
              {gpu.memoryUsed.toFixed(0)} / {gpu.memoryTotal.toFixed(0)}MB
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="relative h-24 w-full rounded-xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 p-3">
          <GPUChart data={tempHistory} color={tempStyles.chartColor} />
          <div className="absolute top-2 right-3 text-xs text-gray-500 font-mono">
            Last 30s
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPUCard;
