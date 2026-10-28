export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatKilograms(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} T`;
  }
  if (value > 0 && value < 0.01) return `${value.toFixed(3)} kg`;
  return `${value.toFixed(2)} kg`;
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch (e) {
    return 'Invalid Date';
  }
}

export function formatTime(date: Date | string | number | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return 'Invalid Time';
    }
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  } catch (e) {
    return 'Invalid Time';
  }
}

export function getColorForCarbonIntensity(intensity: number): string {
  if (intensity < 250) return '#22c55e'; // Green
  if (intensity < 350) return '#eab308'; // Yellow
  if (intensity < 450) return '#f97316'; // Orange
  return '#dc2626'; // Red
}

export function getColorForTrend(trend: string): string {
  if (trend === 'UP') return '#22c55e';
  if (trend === 'DOWN') return '#dc2626';
  return '#64748b';
}
