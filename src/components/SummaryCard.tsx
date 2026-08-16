import { GPUData, CPUData } from '../types/gpu';
import { getTempStyles } from '../utils/tempThresholds';

interface SummaryCardProps {
  gpus: GPUData[];
  cpus: CPUData[];
}

const SummaryCard = ({ gpus, cpus }: SummaryCardProps) => {
  if (gpus.length === 0 && cpus.length === 0) return null;

  // Optimize: Calculate all values in a single pass
  const gpuStats = gpus.length > 0 ? gpus.reduce((acc, gpu) => ({
    totalTemp: acc.totalTemp + gpu.temp,
    maxTemp: Math.max(acc.maxTemp, gpu.temp),
    totalPower: acc.totalPower + gpu.powerDraw
  }), { totalTemp: 0, maxTemp: 0, totalPower: 0 }) : null;

  const cpuStats = cpus.length > 0 ? cpus.reduce((acc, cpu) => ({
    totalUtil: acc.totalUtil + cpu.utilization,
    totalMemoryUsed: acc.totalMemoryUsed + cpu.memoryUsed,
    totalMemory: acc.totalMemory + cpu.memoryTotal
  }), { totalUtil: 0, totalMemoryUsed: 0, totalMemory: 0 }) : null;

  const avgCpuUtil = cpuStats ? cpuStats.totalUtil / cpus.length : 0;
  const maxGpuTemp = gpuStats ? gpuStats.maxTemp : 0;
  const totalPower = gpuStats ? gpuStats.totalPower : 0;

  return (
    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* CPU Usage */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6 text-center backdrop-blur-sm">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">CPU Usage</p>
        <p className={`text-3xl font-bold ${avgCpuUtil > 80 ? 'text-red-500' : avgCpuUtil > 60 ? 'text-orange-400' : 'text-white'}`}>
          {avgCpuUtil.toFixed(1)}%
        </p>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <CpuIcon />
        </div>
      </div>

      {/* Memory */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-6 text-center backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse" />
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Memory</p>
        <p className="text-3xl font-bold text-white">
          {(cpuStats ? cpuStats.totalMemoryUsed / 1024 : 0).toFixed(1)} / {(cpuStats ? cpuStats.totalMemory / 1024 : 0).toFixed(1)}
        </p>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <MemoryIcon />
        </div>
      </div>

      {/* GPU Temp */}
      {gpus.length > 0 && (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 p-6 text-center backdrop-blur-sm">
            <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Max GPU Temp</p>
            <p className={`text-3xl font-bold ${getTempStyles(maxGpuTemp).textClass}`}>
              {maxGpuTemp.toFixed(1)}°C
            </p>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
              <ThermometerIcon />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6 text-center backdrop-blur-sm">
            <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Total Power</p>
            <p className="text-3xl font-bold text-white">{totalPower.toFixed(1)}W</p>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
              <BoltIcon />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ThermometerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

const BoltIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const CpuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 9h6v6H9z" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
  </svg>
);

const MemoryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10v4M10 10v4M14 10v4M18 10v4" />
  </svg>
);

export default SummaryCard;
