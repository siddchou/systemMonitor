import { GPUData } from '../types/gpu';

const API_BASE = 'http://localhost:8080';

export async function fetchGPUs(): Promise<GPUData[]> {
  try {
    const response = await fetch(`${API_BASE}/api/gpus`);
    if (!response.ok) throw new Error('Failed to fetch GPUs');
    return await response.json();
  } catch (error) {
    console.error('Error fetching GPUs:', error);
    return [];
  }
}
