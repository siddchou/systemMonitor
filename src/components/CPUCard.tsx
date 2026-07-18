import { CPUData, CPUHistory } from '../types/gpu';
import GPUChart from './GPUChart';

interface CPUCardProps {
  cpu: CPUData;
  tempHistory: number[];
}

const CPUCard = ({ cpu, tempHistory }: CPUCardProps) => {
  // Memoize computed values
  const utilPct = Math.min(cpu.utilization, 100);
  const memPct = Math.min((cpu.memoryUsed / cpu.memoryTotal) * 100, 100);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-cyan-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-fuchsia-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
              {cpu.name}
            </h3>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">
              {cpu.cores}C / {cpu.logicalProcessors}T • {(cpu.clockSpeed / 1000).toFixed(1)} GHz
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            {cpu.utilization.toFixed(0)}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider">
              <span>Utilization</span>
              <span>{utilPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                style={{ width: `${utilPct}%` }}
              />
            </div>
            <p className="text-sm text-white/80">{cpu.utilization.toFixed(1)}%</p>
          </div>

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
              {cpu.memoryUsed.toFixed(0)} / {cpu.memoryTotal.toFixed(0)} MB
            </p>
          </div>
        </div>

        <div className="relative h-24 w-full rounded-xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 p-3">
          <GPUChart data={tempHistory} color="#34d399" />
          <div className="absolute top-2 right-3 text-xs text-gray-500 font-mono">
            Last 30s
          </div>
        </div>
      </div>
    </div>
  );
};

export default CPUCard;
