export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[MQTT] Instrumentation: starting MQTT client...');
    const { startIoTMqtt } = await import('./lib/mqtt');
    startIoTMqtt();
  }
}
