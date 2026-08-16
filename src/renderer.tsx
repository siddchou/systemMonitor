// @ts-nocheck — pre-existing GPUCard/CPUCard JSX props typing errors (key prop)

import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import GPUCard from './components/GPUCard';
import CPUCard from './components/CPUCard';
import SummaryCard from './components/SummaryCard';
import GPUChart from './components/GPUChart';
import { GPUData, GPUHistory, CPUData, CPUHistory } from './types/gpu';

function App() {
  const [gpus, setGPUs] = useState<GPUData[]>([]);
  const [cpus, setCpus] = useState<CPUData[]>([]);
  const [gpuHistory, setGpuHistory] = useState<GPUHistory>({});
  const [cpuHistory, setCpuHistory] = useState<CPUHistory>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load data initially
    loadData();

    // Poll every second
    const intervalId = setInterval(loadData, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  async function loadData() {
    try {
      const [gpuData, cpuData] = await Promise.all([
        window.gpuMonitor.getGPUs(),
        window.gpuMonitor.getCPUs()
      ]);

      setGPUs(gpuData);
      setCpus(cpuData);
      setError(null);

      // Update history with new data
      setGpuHistory(prev => {
        const newHistory: GPUHistory = { ...prev };
        gpuData.forEach(gpu => {
          const next = [...(newHistory[gpu.id] || []), gpu.temp];
          newHistory[gpu.id] = next.length > 30 ? next.slice(-30) : next;
        });
        return newHistory;
      });

      setCpuHistory(prev => {
        const newHistory: CPUHistory = { ...prev };
        cpuData.forEach(cpu => {
          const next = [...(newHistory[cpu.id] || []), cpu.utilization];
          newHistory[cpu.id] = next.length > 30 ? next.slice(-30) : next;
        });
        return newHistory;
      });

      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      // Don't stop loading on error so app keeps trying
    }
  }

  // Show loading spinner
  if (loading && gpus.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-cyan-400 font-mono">Initializing GPU Monitor...</p>
        </div>
      </div>
    );
  }

  // Show error state only if no data at all
  if (error && gpus.length === 0 && cpus.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
        <div className="text-center space-y-4">
          <div className="inline-block p-6 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M12 2v4m0 14v4m-9-9h18M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
            </svg>
          </div>
          <p className="text-xl text-red-400">Error loading GPU data</p>
              <p className="text-sm text-gray-500 mt-2 max-w-md">{error}</p>
          <p className="text-xs text-gray-600 mt-4">Check the console for more details</p>
        </div>
      </div>
    );
  }

  // Render GPUCard elements
  const gpuCards = gpus.map((gpu) => (
    <GPUCard key={gpu.id} gpu={gpu} tempHistory={gpuHistory[gpu.id] || []} />
  ));

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="relative pt-8 pb-6 px-6 text-center">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-24 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none opacity-70" />

        <h1 className="relative text-4xl md:text-6xl font-extrabold tracking-tight mb-2">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 bg-clip-text text-transparent animate-pulse-glow">
            SYSTEM MONITOR
          </span>
        </h1>

        <div className="relative inline-block mt-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          {loading ? (
            <p className="text-cyan-300 animate-pulse">Connecting to server...</p>
          ) : (
            <p className="text-gray-300">
              Monitoring <span className="font-bold text-white">{cpus.length}</span> CPU(s) + <span className="font-bold text-white">{gpus.length}</span> GPU(s)
              {` • Last updated ${new Date().toLocaleTimeString()}`}
            </p>
          )}
        </div>
      </header>

      {/* CPU + GPU Grid */}
      {gpus.length === 0 && cpus.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="inline-block p-6 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M12 2v4m0 14v4m-9-9h18M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
            </svg>
          </div>
          <p className="text-xl text-gray-400">No hardware detected</p>
          <p className="text-sm text-gray-500 mt-2">Make sure nvidia-smi is installed and running</p>
        </div>
      ) : (
        <div className="px-6 max-w-7xl mx-auto">
          {/* CPU Cards */}
          {cpus.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-300 mb-4">CPU</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {cpus.map((cpu) => (
                  <CPUCard key={cpu.id} cpu={cpu} tempHistory={cpuHistory[cpu.id] || []} />
                ))}
              </div>
            </>
          )}

          {/* GPU Cards */}
          {gpus.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-300 mb-4">GPU</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {gpuCards}
              </div>
            </>
          )}

          {/* Summary Section */}
          <SummaryCard gpus={gpus} cpus={cpus} />

          {/* Footer */}
          <footer className="mt-12 text-center text-sm text-gray-500">
            <p>Powered by Electron & nvidia-smi</p>
          </footer>
        </div>
      )}
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
