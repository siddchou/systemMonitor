import { GPUData } from '../types/gpu';

interface SummaryCardProps {
  gpus: GPUData[];
}

const SummaryCard = ({ gpus }: SummaryCardProps) => {
  if (gpus.length === 0) return null;

  const totalTemp = gpus.reduce((sum, gpu) => sum + gpu.temp, 0);
  const maxTemp = Math.max(...gpus.map(gpu => gpu.temp));
  const totalPower = gpus.reduce((sum, gpu) => sum + gpu.powerDraw, 0);

  return (
    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Avg Temp */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-6 text-center backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse" />
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Avg Temperature</p>
        <p className="text-3xl font-bold text-white">
          {(totalTemp / gpus.length).toFixed(1)}°C
        </p>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <ThermometerIcon />
        </div>
      </div>

      {/* Max Temp */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 p-6 text-center backdrop-blur-sm">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Max Temperature</p>
        <p className={`text-3xl font-bold ${maxTemp > 80 ? 'text-red-500' : maxTemp > 60 ? 'text-orange-400' : 'text-white'}`}>
          {maxTemp.toFixed(1)}°C
        </p>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <ThermometerIcon />
        </div>
      </div>

      {/* Total Power */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6 text-center backdrop-blur-sm">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Total Power</p>
        <p className="text-3xl font-bold text-white">{totalPower.toFixed(1)}W</p>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <BoltIcon />
        </div>
      </div>

      {/* GPU Count */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6 text-center backdrop-blur-sm">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Active GPUs</p>
        <p className="text-3xl font-bold text-white">{gpus.length}</p>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
          <GPUIcon />
        </div>
      </div>
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

const GPUIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="16" rx="2" />
    <path d="M6 6h.01" />
    <path d="M18 6h.01" />
    <path d="M2 22h20" />
    <path d="M10 22v-5" />
    <path d="M14 22v-5" />
  </svg>
);

export default SummaryCard;
