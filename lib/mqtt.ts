import crypto from 'crypto';
import mqtt, { type MqttClient } from 'mqtt';
import { addIoTEnergyReading, getLatestIoTEnergyReading } from './db';

const MQTT_URL = process.env.MQTT_BROKER_URL || process.env.MQTT_URL || 'mqtt://127.0.0.1:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'energy/ESP32-001';
const DEFAULT_DEVICE_ID = process.env.IOT_DEVICE_ID || 'ESP32-001';
const ONLINE_WINDOW_MS = 6500;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

const globalState = globalThis as typeof globalThis & {
  mqttClient?: MqttClient;
  mqttConnected?: boolean;
  mqttReconnectAttempts?: number;
  mqttReconnectTimer?: ReturnType<typeof setTimeout>;
  mqttStopped?: boolean;
  mqttPendingReadings?: Array<ReturnType<typeof normalizeIoTReading>>;
  mqttPersisting?: boolean;
  mqttPersistAttempts?: number;
  mqttPersistRetryTimer?: ReturnType<typeof setTimeout>;
};

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickNumber(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      return toNumber(payload[key]);
    }
  }
  return null;
}

export function normalizeIoTReading(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Payload must be a JSON object');
  }
  const payload = input as Record<string, unknown>;

  const voltage = pickNumber(payload, ['voltage', 'Voltage', 'v']);
  const current = pickNumber(payload, ['current', 'Current', 'i']);
  const power = pickNumber(payload, ['power', 'Power', 'p']);
  const energy = pickNumber(payload, ['energy', 'Energy', 'e']);
  const frequency = pickNumber(payload, ['frequency', 'Frequency', 'freq']);
  const powerFactor = pickNumber(payload, ['powerFactor', 'pf', 'PowerFactor', 'power_factor']);
  if (
    voltage === null ||
    current === null ||
    power === null ||
    energy === null ||
    frequency === null ||
    powerFactor === null
  ) {
    throw new Error('One or more required telemetry fields are missing or non-numeric');
  }
  if (voltage < 0 || voltage > 300) throw new Error('voltage must be between 0 and 300 V');
  if (current < 0 || current > 100) throw new Error('current must be between 0 and 100 A');
  if (power < 0 || power > 30000) throw new Error('power must be between 0 and 30000 W');
  if (energy < 0 || energy > 1_000_000_000) {
    throw new Error('cumulative energy must be between 0 and 1000000000 kWh');
  }
  if (frequency < 45 || frequency > 65) throw new Error('frequency must be between 45 and 65 Hz');
  if (powerFactor < 0 || powerFactor > 1) throw new Error('power factor must be between 0 and 1');
  if (power > voltage * current + 5) {
    throw new Error('power exceeds the voltage-current apparent-power bound');
  }

  const rawDeviceId = payload.deviceId ?? payload.device ?? DEFAULT_DEVICE_ID;
  if (
    typeof rawDeviceId !== 'string' ||
    !/^[A-Za-z0-9._:-]{1,100}$/.test(rawDeviceId.trim())
  ) {
    throw new Error('deviceId must be a 1-100 character identifier');
  }

  const receivedAt = new Date();
  let timestamp = receivedAt;
  if (payload.timestamp !== undefined) {
    if (
      typeof payload.timestamp !== 'string' ||
      !/([zZ]|[+-]\d{2}:\d{2})$/.test(payload.timestamp) ||
      Number.isNaN(Date.parse(payload.timestamp))
    ) {
      throw new Error('timestamp must be a valid timezone-aware ISO-8601 string');
    }
    timestamp = new Date(payload.timestamp);
    if (timestamp.getTime() > receivedAt.getTime() + 5 * 60 * 1000) {
      throw new Error('timestamp cannot be more than five minutes in the future');
    }
  }

  return {
    id: crypto.randomUUID(),
    deviceId: rawDeviceId.trim(),
    voltage,
    current,
    power,
    energy,
    frequency,
    powerFactor,
    timestamp: timestamp.toISOString(),
    receivedAt: receivedAt.toISOString(),
  };
}

function scheduleReconnect(client: MqttClient) {
  if (globalState.mqttStopped || globalState.mqttReconnectTimer) return;

  const attempts = globalState.mqttReconnectAttempts || 0;
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY_MS * (2 ** attempts),
    MAX_RECONNECT_DELAY_MS,
  );
  globalState.mqttReconnectAttempts = attempts + 1;
  console.warn(`[MQTT] Reconnect scheduled in ${delay}ms (attempt ${attempts + 1}).`);

  globalState.mqttReconnectTimer = setTimeout(() => {
    globalState.mqttReconnectTimer = undefined;
    if (!globalState.mqttStopped && globalState.mqttClient === client) {
      client.reconnect();
    }
  }, delay);
  globalState.mqttReconnectTimer.unref?.();
}

async function flushPendingReadings(): Promise<void> {
  if (globalState.mqttPersisting) return;
  globalState.mqttPersisting = true;
  const pending = globalState.mqttPendingReadings || [];

  try {
    while (pending.length > 0) {
      const reading = pending[0];
      try {
        await addIoTEnergyReading(reading);
        pending.shift();
        globalState.mqttPersistAttempts = 0;
        console.info('[MQTT] Reading persisted.', {
          deviceId: reading.deviceId,
          timestamp: reading.timestamp,
          queued: pending.length,
        });
      } catch (error) {
        const attempts = globalState.mqttPersistAttempts || 0;
        const delay = Math.min(500 * (2 ** attempts), MAX_RECONNECT_DELAY_MS);
        globalState.mqttPersistAttempts = attempts + 1;
        console.error('[MQTT] Persistence failed; reading remains queued.', {
          error: error instanceof Error ? error.message : 'Unexpected database error',
          queued: pending.length,
          retryDelayMs: delay,
        });

        globalState.mqttPersistRetryTimer = setTimeout(() => {
          globalState.mqttPersistRetryTimer = undefined;
          void flushPendingReadings();
        }, delay);
        globalState.mqttPersistRetryTimer.unref?.();
        return;
      }
    }
  } finally {
    globalState.mqttPersisting = false;
  }
}

export function startIoTMqtt(): MqttClient {
  if (globalState.mqttClient && !globalState.mqttStopped) {
    return globalState.mqttClient;
  }

  const broker = new URL(MQTT_URL);
  if (!['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(broker.protocol)) {
    throw new Error('MQTT_URL must use mqtt, mqtts, ws, or wss');
  }

  globalState.mqttStopped = false;
  globalState.mqttReconnectAttempts = 0;
  console.info(`[MQTT] Connecting to ${broker.protocol}//${broker.host}`);

  const client = mqtt.connect(MQTT_URL, {
    clientId: process.env.MQTT_CLIENT_ID || `greengrid-next-${process.pid}`,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 0,
    connectTimeout: 10000,
    resubscribe: false,
    clean: true,
  });

  globalState.mqttClient = client;
  globalState.mqttConnected = false;

  client.on('connect', () => {
    globalState.mqttConnected = true;
    globalState.mqttReconnectAttempts = 0;
    if (globalState.mqttReconnectTimer) {
      clearTimeout(globalState.mqttReconnectTimer);
      globalState.mqttReconnectTimer = undefined;
    }
    console.info('[MQTT] Connected to broker.');
    client.subscribe(MQTT_TOPIC, { qos: 0 }, (error) => {
      if (error) {
        console.error('[MQTT] Subscribe error:', error.message);
        return;
      }
      console.info(`[MQTT] Subscribed to ${MQTT_TOPIC}.`);
    });
  });

  client.on('reconnect', () => {
    globalState.mqttConnected = false;
    console.info('[MQTT] Reconnection attempt started.');
  });

  client.on('close', () => {
    globalState.mqttConnected = false;
    console.warn('[MQTT] Connection closed.');
    scheduleReconnect(client);
  });

  client.on('error', (error) => {
    globalState.mqttConnected = false;
    console.error('[MQTT] Connection error:', error.message);
  });

  client.on('message', async (topic, message, packet) => {
    if (topic !== MQTT_TOPIC) return;
    if (packet.retain) {
      console.warn('[MQTT] Ignoring retained telemetry; stale readings are not persisted.');
      return;
    }

    try {
      const payload: unknown = JSON.parse(message.toString());
      const reading = normalizeIoTReading(payload);
      const pending = globalState.mqttPendingReadings || (globalState.mqttPendingReadings = []);
      if (pending.length >= 1000) {
        throw new Error('Database persistence queue is full; refusing to discard older readings');
      }
      pending.push(reading);
      void flushPendingReadings();
    } catch (error) {
      console.error(
        '[MQTT] Message rejected:',
        error instanceof Error ? error.message : 'Unexpected message-processing error',
      );
    }
  });

  return client;
}

export function stopIoTMqtt(): void {
  globalState.mqttStopped = true;
  globalState.mqttConnected = false;
  if (globalState.mqttReconnectTimer) {
    clearTimeout(globalState.mqttReconnectTimer);
    globalState.mqttReconnectTimer = undefined;
  }
  if (globalState.mqttPersistRetryTimer) {
    clearTimeout(globalState.mqttPersistRetryTimer);
    globalState.mqttPersistRetryTimer = undefined;
  }
  if (globalState.mqttPendingReadings?.length) {
    console.warn(`[MQTT] Shutdown with ${globalState.mqttPendingReadings.length} readings still queued in memory.`);
  }
  const client = globalState.mqttClient;
  globalState.mqttClient = undefined;
  client?.end();
}

export const getIoTStatus = async () => {
  const latest = await getLatestIoTEnergyReading();
  const lastReadingAt = latest?.receivedAt || null;
  const online = Boolean(lastReadingAt && Date.now() - new Date(lastReadingAt).getTime() <= ONLINE_WINDOW_MS);

  return {
    deviceId: latest?.deviceId || DEFAULT_DEVICE_ID,
    mqttConnected: Boolean(globalState.mqttClient?.connected && globalState.mqttConnected),
    online,
    lastReadingAt,
  };
};
