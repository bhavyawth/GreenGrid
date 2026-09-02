import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DB_URI;

if (!connectionString) {
  console.error('Error: DB_URI is not defined in .env.local');
  process.exit(1);
}

async function setup() {
  console.log('Connecting to Neon PostgreSQL database...');
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected successfully!');

  try {
    // 1. Create devices table
    console.log('Creating "devices" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'offline' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default device
    await client.query(`
      INSERT INTO devices (device_id, name, status)
      VALUES ('ESP32-001', 'Primary PZEM Monitor', 'offline')
      ON CONFLICT (device_id) DO NOTHING;
    `);

    // 2. Create users table
    console.log('Creating "users" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' NOT NULL,
        total_energy_used NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create energy_readings table
    console.log('Creating "energy_readings" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS energy_readings (
        id UUID PRIMARY KEY,
        device_id VARCHAR(100) REFERENCES devices(device_id) ON DELETE CASCADE,
        voltage NUMERIC NOT NULL,
        current NUMERIC NOT NULL,
        power NUMERIC NOT NULL,
        energy NUMERIC NOT NULL,
        frequency NUMERIC NOT NULL,
        power_factor NUMERIC NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_readings_device_timestamp 
      ON energy_readings (device_id, timestamp DESC);
    `);

    // 4. Create carbon_records table
    console.log('Creating "carbon_records" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS carbon_records (
        id UUID PRIMARY KEY,
        energy_reading_id UUID REFERENCES energy_readings(id) ON DELETE SET NULL,
        device_id VARCHAR(100) REFERENCES devices(device_id) ON DELETE CASCADE,
        carbon_emission NUMERIC NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create ai_predictions table
    console.log('Creating "ai_predictions" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_predictions (
        id UUID PRIMARY KEY,
        device_id VARCHAR(100) REFERENCES devices(device_id) ON DELETE CASCADE,
        prediction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        input_window_start TIMESTAMP WITH TIME ZONE,
        input_window_end TIMESTAMP WITH TIME ZONE,
        prediction_value NUMERIC NOT NULL,
        prediction_horizon INTEGER NOT NULL,
        model_version VARCHAR(100) NOT NULL,
        confidence NUMERIC
      );
    `);

    // 6. Create blockchain_records table
    console.log('Creating "blockchain_records" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS blockchain_records (
        id UUID PRIMARY KEY,
        token_id BIGINT NOT NULL,
        transaction_hash VARCHAR(255) UNIQUE NOT NULL,
        chain_id INTEGER NOT NULL,
        contract_address VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        carbon_record_id UUID REFERENCES carbon_records(id) ON DELETE SET NULL
      );
    `);

    console.log('Database tables setup successfully!');
  } catch (error) {
    console.error('Error during database setup:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

setup();
