// Configurable GPU temperature thresholds (°C) and per-level colors.
// green: temp < TEMP_WARN_THRESHOLD_C
// amber: TEMP_WARN_THRESHOLD_C <= temp <= TEMP_CRITICAL_THRESHOLD_C
// red:   temp > TEMP_CRITICAL_THRESHOLD_C

export const TEMP_WARN_THRESHOLD_C = 70;
export const TEMP_CRITICAL_THRESHOLD_C = 85;

export type TempLevel = 'normal' | 'warning' | 'critical';

export function getTempLevel(tempC: number): TempLevel {
  if (tempC > TEMP_CRITICAL_THRESHOLD_C) return 'critical';
  if (tempC >= TEMP_WARN_THRESHOLD_C) return 'warning';
  return 'normal';
}

interface TempLevelStyles {
  /** Hex color for the Chart.js line */
  chartColor: string;
  /** Header pill on GPUCard */
  badgeClass: string;
  /** Temperature progress bar gradient stops */
  barGradientClass: string;
  /** Large readout text (SummaryCard) */
  textClass: string;
}

// Full literal class strings so Tailwind's JIT compiler generates them.
export const TEMP_LEVEL_STYLES: Record<TempLevel, TempLevelStyles> = {
  normal: {
    chartColor: '#4ade80',
    badgeClass: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    barGradientClass: 'from-emerald-400 to-teal-500',
    textClass: 'text-emerald-400',
  },
  warning: {
    chartColor: '#fbbf24',
    badgeClass: 'bg-amber-500/20 border-amber-500/30 text-amber-300',
    barGradientClass: 'from-amber-400 to-orange-500',
    textClass: 'text-amber-400',
  },
  critical: {
    chartColor: '#ff6b6b',
    badgeClass: 'bg-red-500/20 border-red-500/30 text-red-300',
    barGradientClass: 'from-red-500 via-orange-500 to-red-500',
    textClass: 'text-red-500',
  },
};

export function getTempStyles(tempC: number): TempLevelStyles {
  return TEMP_LEVEL_STYLES[getTempLevel(tempC)];
}
