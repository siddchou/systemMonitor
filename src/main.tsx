import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import GPUCard from './components/GPUCard';
import SummaryCard from './components/SummaryCard';
import { GPUData, GPUHistory } from './types/gpu';

function App() {
  const [gpus, setGPUs] = useState<GPUData[]>([]);
  const [tempHistory, setTempHistory] = useState<GPUHistory>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const data = await fetchGPUs();
        if (mounted) {
          setGPUs(data);

          // Initialize history for each GPU
          const initialHistory: GPUHistory = {};
          data.forEach(gpu => {
            initialHistory[gpu.id] = Array(30).fill(gpu.temp);
          });
          setTempHistory(initialHistory);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load GPUs:', error);
      }
    }

    loadData();

    // Poll for updates every second
    const interval = setInterval(async () => {
      try {
        const data = await fetchGPUs();

        setGPUs(data);

        // Update history - keep last 30 values
        setTempHistory(prev => {
          const newHistory: GPUHistory = { ...prev };
          data.forEach(gpu => {
            if (!newHistory[gpu.id]) {
              newHistory[gpu.id] = [];
            }
            const history = [...newHistory[gpu.id], gpu.temp];
            if (history.length > 30) history.shift();
            newHistory[gpu.id] = history;
          });
          return newHistory;
        });
      } catch (error) {
        console.error('Failed to update GPUs:', error);
      }
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch function - defined here since we're in React component
  async function fetchGPUs(): Promise<GPUData[]> {
    try {
      const response = await fetch('http://localhost:8080/api/gpus');
      if (!response.ok) throw new Error('Failed to fetch GPUs');
      return await response.json();
    } catch (error) {
      console.error('Error fetching GPUs:', error);
      return [];
    }
  }

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

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="relative pt-8 pb-6 px-6 text-center">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-24 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none opacity-70" />

        <h1 className="relative text-4xl md:text-6xl font-extrabold tracking-tight mb-2">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 bg-clip-text text-transparent animate-pulse-glow">
            GPU MONITOR
          </span>
        </h1>

        <div className="relative inline-block mt-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          {loading ? (
            <p className="text-cyan-300 animate-pulse">Connecting to server...</p>
          ) : (
            <p className="text-gray-300">
              Monitoring <span className="font-bold text-white">{gpus.length}</span> GPU(s)
              {gpus.length > 0 && ` • Last updated ${new Date().toLocaleTimeString()}`}
            </p>
          )}
        </div>
      </header>

      {/* GPU Grid */}
      {gpus.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="inline-block p-6 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M12 2v4m0 14v4m-9-9h18M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
            </svg>
          </div>
          <p className="text-xl text-gray-400">No GPUs detected</p>
          <p className="text-sm text-gray-500 mt-2">Make sure nvidia-smi is installed and running</p>
        </div>
      ) : (
        <div className="px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {gpus.map((gpu) => (
              <GPUCard key={gpu.id} gpu={gpu} tempHistory={tempHistory[gpu.id] || []} />
            ))}
          </div>

          {/* Summary Section */}
          <SummaryCard gpus={gpus} />

          {/* Footer */}
          <footer className="mt-12 text-center text-sm text-gray-500">
            <p>Powered by nvidia-smi • Electron App</p>
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
