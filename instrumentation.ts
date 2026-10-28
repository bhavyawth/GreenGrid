export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[MQTT] Instrumentation: starting MQTT client...');
    const { startIoTMqtt, stopIoTMqtt } = await import('./lib/mqtt');
    startIoTMqtt();

    const globalState = globalThis as typeof globalThis & { mqttShutdownHandlers?: boolean };
    if (!globalState.mqttShutdownHandlers) {
      globalState.mqttShutdownHandlers = true;
      process.once('SIGINT', stopIoTMqtt);
      process.once('SIGTERM', stopIoTMqtt);
    }
  }
}
