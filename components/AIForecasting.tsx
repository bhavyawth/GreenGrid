'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, TrendingUp, AlertTriangle, Clock, Leaf, Activity, Globe } from 'lucide-react';
import { Forecast } from '../types/index';
import { getColorForCarbonIntensity, formatTime } from '../utils/formatters';
import { getCarbonIntensity, getIoTReadings, getIoTStatus, getLatestReading, IoTEnergyReading, IoTStatus } from '../lib/api';
import { toHouseholdEquivalent, HOUSEHOLD_LOAD_SCALE_FACTOR } from '../lib/household-equivalent';
import { useAuth } from './AuthContext';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static px-4 py-3 text-sm">
      <p className="text-zinc-400 text-xs mb-1">{label}:00</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.value?.toFixed(0)} g CO₂/kWh
        </p>
      ))}
    </div>
  );
};

const CustomTooltipPower = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static px-4 py-3 text-sm">
      <p className="text-zinc-400 text-xs mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          Power: {entry.value?.toFixed(1)} W
        </p>
      ))}
    </div>
  );
};

export const AIForecasting: React.FC = () => {
  const { token } = useAuth();
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [insufficientData, setInsufficientData] = useState<boolean>(false);
  const [isAiOnline, setIsAiOnline] = useState<boolean>(true);

  const [iotReading, setIotReading] = useState<IoTEnergyReading | null>(null);
  const [iotReadings, setIotReadings] = useState<IoTEnergyReading[]>([]);
  const [iotStatus, setIotStatus] = useState<IoTStatus | null>(null);
  const [iotLoading, setIotLoading] = useState<boolean>(true);
  const [configuredGridIntensity, setConfiguredGridIntensity] = useState(260);

  const fetchIoTData = async () => {
    try {
      const [latest, readings, status, gridIntensity] = await Promise.all([
        getLatestReading(token || ''),
        getIoTReadings(token || '', 50),
        getIoTStatus(token || ''),
        getCarbonIntensity().catch((error) => {
          console.error('Unable to load configured carbon factor:', error);
          return null;
        })
      ]);

      if (latest.success) {
        setIotReading(latest.reading);
      }
      if (readings.success) {
        setIotReadings(readings.readings);
      }
      setIotStatus(status);
      if (gridIntensity) setConfiguredGridIntensity(gridIntensity.intensity);
    } catch (error) {
      console.error('Error fetching live device data:', error);
    } finally {
      setIotLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setIotLoading(false);
      return;
    }
    fetchIoTData();
    const interval = window.setInterval(fetchIoTData, 5000);
    return () => window.clearInterval(interval);
  }, [token]);

  useEffect(() => {
    async function loadForecast() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        setInsufficientData(false);

        // 1. Check health of the AI service
        const healthRes = await fetch('/api/ai/status');
        const health = await healthRes.json();
        setIsAiOnline(health.available);

        if (!health.available) {
          throw new Error('AI service offline');
        }

        // 2. Fetch the forecast
        const forecastRes = await fetch('/api/ai/forecast', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!forecastRes.ok) {
          const data = await forecastRes.json();
          if (data.insufficientData) {
            setInsufficientData(true);
            setError(data.error || 'Validated hourly grid-carbon observations are unavailable.');
            setForecast([]);
            return;
          }
          throw new Error(data.error || 'Failed to fetch AI forecast');
        }

        const data = await forecastRes.json();
        setForecast(data.forecast);
      } catch (e: any) {
        console.warn('AI Forecasting error:', e.message);
        setError(e.message || 'Error loading AI forecast');
        setForecast([]);
      } finally {
        setLoading(false);
      }
    }

    loadForecast();
  }, [token]);

  const currentHour = new Date().getHours();
  const currentGridIntensityObj = forecast.find(f => f.hour === currentHour) || forecast[0];
  const currentGridIntensity = currentGridIntensityObj?.carbonIntensity ?? configuredGridIntensity;

  const power = toHouseholdEquivalent(iotReading?.power || 0);
  const energy = toHouseholdEquivalent(iotReading?.energy || 0);
  const carbonEmissionRate = (power / 1000) * currentGridIntensity; // g CO2 / hour

  const averageIntensity = forecast.length
    ? (forecast.reduce((sum, f) => sum + f.carbonIntensity, 0) / forecast.length)
    : configuredGridIntensity;
  const cumulativeCarbonGrams = energy * averageIntensity;

  const sensorOnline = Boolean(iotStatus?.online);

  const iotChartData = iotReadings.map((reading) => ({
    time: new Date(reading.receivedAt || reading.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    power: toHouseholdEquivalent(reading.power)
  }));

  const greenWindows = forecast.filter(f => f.isGreenWindow);
  const heavyLoadRecommendations = forecast.filter(f => f.recommendedLoad === 'HIGH');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-accent-400" />
            <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider">Experimental</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Carbon Forecasting</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Grid forecasting needs verified hourly grid data. Device impact is a {HOUSEHOLD_LOAD_SCALE_FACTOR}× household-equivalent estimate.
          </p>
        </div>
      </div>

      {/* Warnings & Loading state banners */}
      {loading && (
        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 flex items-center gap-3 text-sm text-zinc-300">
          <Clock className="w-5 h-5 animate-spin text-zinc-400" />
          <p>Checking the AI service and configured grid-data source...</p>
        </div>
      )}

      {!loading && !isAiOnline && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-sm text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>AI Forecast Unavailable (AI Service at http://localhost:8000 is offline).</p>
        </div>
      )}

      {!loading && isAiOnline && insufficientData && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 text-sm text-amber-400">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!loading && isAiOnline && !insufficientData && error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-sm text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>AI Prediction Error: {error}.</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-stagger">
        <div className="metric-card accent-green">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Green Windows Today</p>
              <p className="text-3xl font-bold text-white mt-2 tabular-nums">{forecast.length ? greenWindows.length : '—'} <span className="text-lg text-zinc-500">hours</span></p>
              <p className="text-xs text-zinc-500 mt-1.5">Optimal times to run appliances</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Leaf className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="metric-card accent-blue">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Avg Intensity (24h)</p>
              <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                {forecast.length ? (forecast.reduce((sum, f) => sum + f.carbonIntensity, 0) / forecast.length).toFixed(0) : '0'}
              </p>
              <p className="text-xs text-zinc-500 mt-1.5">g CO₂/kWh average</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="metric-card accent-amber">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Peak Carbon Hours</p>
              <p className="text-3xl font-bold text-white mt-2 tabular-nums">              {forecast.length ? 24 - greenWindows.length : '—'} <span className="text-lg text-zinc-500">hours</span></p>
              <p className="text-xs text-zinc-500 mt-1.5">High-intensity periods</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">AI CARBON INTENSITY FORECAST</h2>
        <p className="text-xs text-zinc-500 mb-5">
          Forecast target: grid carbon intensity, not household demand. A genuine forecast needs timestamped hourly grid observations; no external provider is configured.
        </p>
        {forecast.length === 0 ? (
          <div className="h-[380px] flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-xl gap-2">
            <AlertTriangle className="w-8 h-8 text-zinc-600" />
            <p className="text-zinc-500 text-sm">AI Forecast Unavailable</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="hour"
                stroke="#52525b"
                tick={{ fontSize: 11 }}
                label={{ value: 'Hour of Day', position: 'insideBottomRight', offset: -5, style: { fill: '#71717a', fontSize: 11 } }}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fontSize: 11 }}
                label={{ value: 'g CO₂/kWh', angle: -90, position: 'insideLeft', style: { fill: '#71717a', fontSize: 11 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="carbonIntensity"
                stroke="#f59e0b"
                name="Carbon Intensity"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const color = payload.isGreenWindow ? '#10b981' : '#f59e0b';
                  return (
                    <circle cx={cx} cy={cy} r={4} fill={color} stroke="#0a0a0f" strokeWidth={2} />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        {forecast.length > 0 && (
          <div className="mt-4 flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-zinc-500">Green Window (&lt;300 g/kWh)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-zinc-500">Moderate/High (&gt;300 g/kWh)</span>
            </div>
          </div>
        )}
      </div>

      {/* Live Device Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Device Impact Metrics */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sensorOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${sensorOnline ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Device Impact</h3>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              sensorOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {sensorOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          
          <p className="text-xs text-zinc-500 mb-6">
            Household-equivalent load ({HOUSEHOLD_LOAD_SCALE_FACTOR}× bulb reading). Carbon uses a configured estimate ({configuredGridIntensity} gCO₂e/kWh), not a live grid provider.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Household-Equivalent Power
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                {iotReading ? power.toFixed(1) : '0.0'} <span className="text-sm font-normal text-zinc-500">W</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Raw bulb reading: {iotReading ? `${iotReading.power.toFixed(1)} W` : '0.0 W'}
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Carbon Rate
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-400">
                {iotReading ? carbonEmissionRate.toFixed(2) : '0.00'} <span className="text-sm font-normal text-zinc-500">g CO₂/h</span>
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Cumulative Meter Energy (Equivalent)
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                {iotReading ? energy.toFixed(4) : '0.0000'} <span className="text-sm font-normal text-zinc-500">kWh</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Raw sensor: {iotReading ? `${iotReading.energy.toFixed(4)} kWh` : '0.0000 kWh'}
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" /> Cumulative Carbon Estimate
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-indigo-400">
                {iotReading ? (cumulativeCarbonGrams < 1000 ? `${cumulativeCarbonGrams.toFixed(2)} g` : `${(cumulativeCarbonGrams / 1000).toFixed(3)} kg`) : '0.00 g'} <span className="text-sm font-normal text-zinc-500">CO₂e</span>
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-zinc-500">Last Telemetry Reading</span>
            <span className="font-semibold text-zinc-300">
              {iotReading?.receivedAt ? formatTime(iotReading.receivedAt) : 'Waiting for sensor data...'}
            </span>
          </div>
        </div>

        {/* Real Device Power Live Chart */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" /> Household-Equivalent Power — Live
          </h3>
          <p className="text-xs text-zinc-500 mb-5">
            Estimated equivalent power ({HOUSEHOLD_LOAD_SCALE_FACTOR}× the bulb reading); raw PZEM readings remain stored unchanged.
          </p>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={iotChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#52525b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#52525b" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltipPower />} />
                <Line
                  type="monotone"
                  dataKey="power"
                  name="Power (W)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981', stroke: '#0a0a0f', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Green Windows */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Recommended Heavy Load Hours</h3>
          </div>
          <div className="space-y-2">
            {heavyLoadRecommendations.slice(0, 5).map((f) => (
              <div key={f.hour} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
                <div>
                  <p className="text-sm font-semibold text-white">{f.hour}:00 – {(f.hour + 1) % 24}:00</p>
                  <p className="text-xs text-zinc-500">{f.carbonIntensity.toFixed(0)} g CO₂/kWh</p>
                </div>
                <span className="badge badge-green text-xs">OPTIMAL</span>
              </div>
            ))}
            {heavyLoadRecommendations.length === 0 && (
              <p className="text-sm text-zinc-500">{forecast.length ? 'No ideal heavy load hours in forecast' : 'No forecast available; grid data is not configured'}</p>
            )}
          </div>
        </div>

        {/* Load Recommendations */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Load Recommendations</h3>
          <div className="space-y-1.5">
            {forecast.slice(0, 12).map((f) => (
              <div key={f.hour} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                <span className="text-xs font-semibold text-zinc-400 tabular-nums w-12">{f.hour}:00</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <div className="progress-track w-28">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.max(20, Math.min(100, (400 - f.carbonIntensity) / 2))}%`,
                        backgroundColor: getColorForCarbonIntensity(f.carbonIntensity)
                      }}
                    />
                  </div>
                  <span className={`badge text-xs w-20 text-center justify-center ${
                    f.recommendedLoad === 'HIGH' ? 'badge-green' :
                    f.recommendedLoad === 'MEDIUM' ? 'badge-amber' :
                    'badge-red'
                  }`}>
                    {f.recommendedLoad}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forecast insights */}
      {forecast.length > 0 && <div className="glass-card p-6 border-accent-500/10">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-accent-400" />
          <h3 className="text-sm font-semibold text-white">AI Insights</h3>
        </div>
        <ul className="space-y-2.5">
          {[
            `Lowest predicted intensity: ${forecast.reduce((best, item) => item.carbonIntensity < best.carbonIntensity ? item : best, forecast[0]).hour}:00`,
            'Recommendations are based on the experimental grid-intensity forecast, not predicted household consumption.'
          ].map((insight, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-1.5 flex-shrink-0" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>}
    </div>
  );
};
