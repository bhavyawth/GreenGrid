'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, AlertCircle, Gauge, DollarSign, Cpu, Wifi, WifiOff } from 'lucide-react';
import { EnergyReading, CarbonEmission } from '../types/index';
import { formatKilograms, formatTime, getColorForCarbonIntensity } from '../utils/formatters';
import { getIoTReadings, getIoTStatus, getLatestReading, getHourlySummary, getCarbonIntensity, IoTEnergyReading, IoTStatus } from '../lib/api';
import { toHouseholdEquivalent, HOUSEHOLD_LOAD_SCALE_FACTOR } from '../lib/household-equivalent';

const ESTIMATED_TARIFF_INR_PER_KWH = 8;

function formatEstimatedCostInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

interface DashboardProps {
  userId: string;
  token: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static px-4 py-3 text-sm">
      <p className="text-zinc-400 text-xs mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ userId, token }) => {
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [totalDayEmission, setTotalDayEmission] = useState<number>(0);
  const [iotReading, setIotReading] = useState<IoTEnergyReading | null>(null);
  const [iotReadings, setIotReadings] = useState<IoTEnergyReading[]>([]);
  const [iotStatus, setIotStatus] = useState<IoTStatus | null>(null);
  const [iotLoading, setIotLoading] = useState(true);
  const [iotError, setIotError] = useState('');
  const [intensity, setIntensity] = useState(260);

  const fetchIoTData = async () => {
    try {
      const [latest, readings, status, summary, configuredIntensity] = await Promise.all([
        getLatestReading(token),
        getIoTReadings(token, 50),
        getIoTStatus(token),
        getHourlySummary(token),
        getCarbonIntensity().catch((error) => {
          console.error('Unable to load configured carbon factor:', error);
          return null;
        })
      ]);

      setIotReading(latest.reading);
      setIotReadings(readings.readings);
      setIotStatus(status);
      setHourlyData(summary);
      setTotalDayEmission(summary.reduce((sum, item) => sum + (item.emission || 0), 0));
      if (configuredIntensity) setIntensity(configuredIntensity.intensity);
      setIotError('');
    } catch (error) {
      setIotError(error instanceof Error ? error.message : 'Backend unavailable');
    } finally {
      setIotLoading(false);
    }
  };

  useEffect(() => {
    fetchIoTData();
    const interval = window.setInterval(fetchIoTData, 5000);
    return () => window.clearInterval(interval);
  }, [token]);

  const intensityColor = getColorForCarbonIntensity(intensity);
  const isHighEmission = intensity > 400;
  const sensorOnline = Boolean(iotStatus?.online);
  const mqttConnected = Boolean(iotStatus?.mqttConnected);
  const lastReadingDate = iotReading?.receivedAt || iotStatus?.lastReadingAt;
  const secondsAgo = lastReadingDate
    ? Math.max(0, Math.round((Date.now() - new Date(lastReadingDate).getTime()) / 1000))
    : null;
  const iotChartData = iotReadings.map((reading) => ({
    time: new Date(reading.receivedAt || reading.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    power: toHouseholdEquivalent(reading.power),
    voltage: reading.voltage,
    current: reading.current
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-accent-400" />
            <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider">Real-time Monitoring</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Energy Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Household-equivalent demo ({HOUSEHOLD_LOAD_SCALE_FACTOR}× estimate); raw ESP32 readings remain unchanged.
          </p>
        </div>
      </div>

      {/* Live IoT Energy Monitor */}
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live PZEM Sensor</span>
            </div>
            <h2 className="text-xl font-bold text-white">Energy Monitor</h2>
            <p className="text-sm text-zinc-500 mt-1">Device: {iotStatus?.deviceId || iotReading?.deviceId || 'ESP32-001'}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
              sensorOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              <span className={`h-2 w-2 rounded-full ${sensorOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {sensorOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
            {!sensorOnline && (
              <p className="text-xs text-zinc-500">
                Last update: {secondsAgo === null ? 'Waiting for sensor data...' : `${secondsAgo} seconds ago`}
              </p>
            )}
          </div>
        </div>

        {iotLoading && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-sm text-zinc-400">
            Connecting to sensor...
          </div>
        )}

        {!iotLoading && iotError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {iotError}
          </div>
        )}

        {!iotLoading && !iotError && !iotReading && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
            Waiting for sensor data...
          </div>
        )}

        {!iotLoading && !iotError && iotReading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Voltage', value: iotReading.voltage.toFixed(1), unit: 'V' },
                { label: 'Current', value: iotReading.current.toFixed(2), unit: 'A' },
                { label: 'Household-Equivalent Power', value: toHouseholdEquivalent(iotReading.power).toFixed(0), unit: 'W', raw: `ESP32 sensor: ${iotReading.power.toFixed(1)} W` },
                { label: 'Household-Equivalent Energy', value: toHouseholdEquivalent(iotReading.energy).toFixed(2), unit: 'kWh', raw: `ESP32 sensor: ${iotReading.energy.toFixed(4)} kWh` },
                { label: 'Frequency', value: iotReading.frequency.toFixed(1), unit: 'Hz' },
                { label: 'Power Factor', value: iotReading.powerFactor.toFixed(2), unit: '' }
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                    {metric.value} <span className="text-sm text-zinc-500">{metric.unit}</span>
                  </p>
                  {'raw' in metric && <p className="mt-1 text-xs text-zinc-500">{metric.raw}</p>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Live Power Consumption</h3>
                <p className="text-xs text-zinc-500 mb-4">Estimated household-equivalent power ({HOUSEHOLD_LOAD_SCALE_FACTOR}× the bulb reading)</p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={iotChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" stroke="#52525b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#52525b" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="power" name="Power (W)" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-semibold text-white mb-1">Voltage & Current</h3>
                <p className="text-xs text-zinc-500 mb-4">Real PZEM voltage/current over time</p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={iotChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" stroke="#52525b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#52525b" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="voltage" name="Voltage (V)" stroke="#60a5fa" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="current" name="Current (A)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Device Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 md:border-b-0 md:pb-0">
                  <span className="text-zinc-500">MQTT</span>
                  <span className={`flex items-center gap-2 font-semibold ${mqttConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                    {mqttConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                    {mqttConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 md:border-b-0 md:pb-0">
                  <span className="text-zinc-500">ESP32</span>
                  <span className={`font-semibold ${sensorOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                    {sensorOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Last Reading</span>
                  <span className="font-semibold text-zinc-300">{lastReadingDate ? formatTime(lastReadingDate) : 'N/A'}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-stagger">
        {/* Current Energy */}
        <div className="metric-card accent-blue">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cumulative Meter Energy</p>
              <p className="text-3xl font-bold text-white mt-2 tabular-nums">{iotReading ? toHouseholdEquivalent(iotReading.energy).toFixed(4) : '0.0000'} <span className="text-lg text-zinc-500">kWh</span></p>
              <p className="text-xs text-zinc-500 mt-1.5">
                Household-equivalent estimate ({HOUSEHOLD_LOAD_SCALE_FACTOR}×); raw sensor: {iotReading ? `${iotReading.energy.toFixed(4)} kWh` : '0.0000 kWh'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Carbon Intensity */}
        <div className="metric-card accent-amber">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Configured Carbon Factor</p>
              <p className="text-3xl font-bold text-white mt-2 tabular-nums">{intensity.toFixed(0)} <span className="text-lg text-zinc-500">g/kWh</span></p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: intensityColor }} />
                <p className="text-xs text-zinc-500">Estimate; no live grid provider connected</p>
              </div>
            </div>
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${intensityColor}15` }}>
              <TrendingUp className="w-5 h-5" style={{ color: intensityColor }} />
            </div>
          </div>
        </div>

        {/* Estimated Emission */}
        <div className="metric-card accent-red">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Estimated Carbon (Last 24h)</p>
              <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                {formatKilograms(totalDayEmission)}
              </p>
              <p className="text-xs text-zinc-500 mt-1.5">Based on estimated hourly load and the configured factor</p>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-500/10">
              {isHighEmission ? <AlertCircle className="w-5 h-5 text-orange-400" /> : <Gauge className="w-5 h-5 text-orange-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* Cost Indicator */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-500/10">
              <DollarSign className="w-4 h-4 text-accent-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Meter-to-Date Household-Equivalent Cost</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {formatEstimatedCostInr(toHouseholdEquivalent(iotReading?.energy || 0) * ESTIMATED_TARIFF_INR_PER_KWH)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Assumes ₹{ESTIMATED_TARIFF_INR_PER_KWH}/kWh; actual tariffs vary
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Updated at {iotReading?.receivedAt ? formatTime(iotReading.receivedAt) : 'N/A'}</p>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <div className="glow-indicator bg-emerald-500" style={{ width: 6, height: 6 }} />
              <span className="text-xs text-accent-500">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Energy Consumption Over 24h */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-white mb-1">24-Hour Consumption Pattern</h2>
          <p className="text-xs text-zinc-500 mb-5">Estimated household-equivalent energy over the last 24 hours ({HOUSEHOLD_LOAD_SCALE_FACTOR}×)</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" stroke="#52525b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#52525b" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="consumption"
                stroke="#3b82f6"
                name="Consumption (kWh)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: '#0a0a0f', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Carbon Intensity Over 24h */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Grid Carbon Intensity</h2>
          <p className="text-xs text-zinc-500 mb-5">Configured estimate repeated by hour; historical grid observations are unavailable</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" stroke="#52525b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#52525b" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="carbonIntensity" fill="#f59e0b" name="Carbon Intensity (g/kWh)" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Daily Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-stagger">
          {[
            { label: 'Household-Equivalent Consumption', value: `${(hourlyData.reduce((sum, item) => sum + item.consumption, 0)).toFixed(2)} kWh (est.)` },
            { label: 'Estimated Household-Equivalent Emissions', value: formatKilograms(totalDayEmission) },
            { label: 'Avg. Intensity', value: `${(hourlyData.length ? (hourlyData.reduce((sum, item) => sum + item.carbonIntensity, 0) / hourlyData.length).toFixed(0) : 0)} g/kWh` },
            { label: 'Estimated Household-Equivalent Cost', value: formatEstimatedCostInr(hourlyData.reduce((sum, item) => sum + item.consumption * ESTIMATED_TARIFF_INR_PER_KWH, 0)) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <p className="text-xs text-zinc-500 font-medium">{label}</p>
              <p className="text-xl font-bold text-white mt-2 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
