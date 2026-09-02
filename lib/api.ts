const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface IoTEnergyReading {
  id: string;
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency: number;
  powerFactor: number;
  timestamp: string;
  receivedAt: string;
}

export interface LatestReadingResponse {
  success: boolean;
  reading: IoTEnergyReading | null;
}

export interface ReadingsResponse {
  success: boolean;
  readings: IoTEnergyReading[];
}

export interface IoTStatus {
  deviceId: string;
  mqttConnected: boolean;
  online: boolean;
  lastReadingAt: string | null;
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getLatestReading(): Promise<LatestReadingResponse> {
  return requestJson<LatestReadingResponse>('/energy/iot/latest');
}

export function getIoTReadings(limit = 50): Promise<ReadingsResponse> {
  return requestJson<ReadingsResponse>(`/energy/iot/readings?limit=${limit}`);
}

export function getIoTStatus(): Promise<IoTStatus> {
  return requestJson<IoTStatus>('/energy/iot/status');
}

export function getHourlySummary(token: string): Promise<any[]> {
  return fetch(`${API_BASE}/energy/hourly-summary`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  }).then(r => {
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return r.json();
  });
}
