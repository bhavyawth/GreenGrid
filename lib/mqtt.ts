import crypto from 'crypto';
import mqtt from 'mqtt';
import { addIoTEnergyReading, getLatestIoTEnergyReading } from './db';

const MQTT_URL = process.env.MQTT_BROKER_URL || process.env.MQTT_URL || 'mqtt://192.168.1.66:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'energy/ESP32-001';
const DEFAULT_DEVICE_ID = process.env.IOT_DEVICE_ID || 'ESP32-001';
const ONLINE_WINDOW_MS = 4000;

// Use globalThis to prevent multiple clients during Next.js HMR
const globalAny = globalThis as any;

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickNumber = (payload: any, keys: string[]) => {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      return toNumber(payload[key]);
    }
  }
  return null;
};

export const normalizeIoTReading = (payload: any) => {
  const voltage = pickNumber(payload, ['voltage', 'Voltage', 'v']);
  const current = pickNumber(payload, ['current', 'Current', 'i']);
  const power = pickNumber(payload, ['power', 'Power', 'p']);
  const energy = pickNumber(payload, ['energy', 'Energy', 'e']);
  const frequency = pickNumber(payload, ['frequency', 'Frequency', 'freq']);
  const powerFactor = pickNumber(payload, ['powerFactor', 'pf', 'PowerFactor', 'power_factor']);

  const values = { voltage, current, power, energy, frequency, powerFactor };
  const invalidField = Object.entries(values).find(([, value]) => value === null);

  if (invalidField) {
    throw new Error(`Invalid or missing ${invalidField[0]}`);
  }

  const receivedAt = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    deviceId: payload.deviceId || payload.device || DEFAULT_DEVICE_ID,
    voltage,
    current,
    power,
    energy,
    frequency,
    powerFactor,
    timestamp: payload.timestamp || receivedAt,
    receivedAt
  };
};

export const startIoTMqtt = () => {
  if (globalAny.mqttClient) {
    console.log('[MQTT] Client already exists, skipping init.');
    return globalAny.mqttClient;
  }

  console.log(`[MQTT] Connecting to ${MQTT_URL} ...`);
  const client = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 3000,
    connectTimeout: 10000
  });

  globalAny.mqttClient = client;
  globalAny.mqttConnected = false;

  client.on('connect', () => {
    globalAny.mqttConnected = true;
    console.log(`[MQTT] Connected: ${MQTT_URL}`);
    client.subscribe(MQTT_TOPIC, (error) => {
      if (error) {
        console.error('[MQTT] Subscribe error:', error.message);
      } else {
        console.log(`[MQTT] Subscribed to: ${MQTT_TOPIC}`);
      }
    });
  });

  client.on('reconnect', () => {
    globalAny.mqttConnected = false;
    console.log('[MQTT] Reconnecting...');
  });

  client.on('close', () => {
    globalAny.mqttConnected = false;
    console.log('[MQTT] Connection closed.');
  });

  client.on('error', (error) => {
    globalAny.mqttConnected = false;
    console.error('[MQTT] Error:', error.message);
  });

  client.on('message', async (topic, message) => {
    try {
      if (topic !== MQTT_TOPIC) return;
      const payload = JSON.parse(message.toString());
      const reading = normalizeIoTReading(payload);
      await addIoTEnergyReading(reading);
      console.log('[MQTT] Reading saved:', reading.deviceId, reading.power);
    } catch (error: any) {
      console.error('[MQTT] Invalid message:', error.message);
    }
  });

  return client;
};

// Auto-start: ensures client is up the moment this module is imported by any route
if (typeof window === 'undefined' && !globalAny.mqttClient) {
  startIoTMqtt();
}

export const getIoTStatus = async () => {
  const latest = await getLatestIoTEnergyReading();
  const lastReadingAt = latest?.receivedAt || null;
  const online = Boolean(lastReadingAt && Date.now() - new Date(lastReadingAt).getTime() <= ONLINE_WINDOW_MS);

  return {
    deviceId: latest?.deviceId || DEFAULT_DEVICE_ID,
    mqttConnected: globalAny.mqttConnected || false,
    online,
    lastReadingAt
  };
};
