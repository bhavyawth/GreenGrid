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
    await client.query('BEGIN');

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
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS market_balance NUMERIC NOT NULL DEFAULT 100000;`);
    await client.query(`ALTER TABLE users ALTER COLUMN market_balance SET DEFAULT 100000;`);

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

    // 7. Create user energy data table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_energy_data (
        user_id VARCHAR(100) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        readings JSONB NOT NULL DEFAULT '[]'::jsonb,
        hourly_readings JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_energy_used NUMERIC NOT NULL DEFAULT 0
      );
    `);

    // 8. Create local off-chain ledger table
    await client.query(`
      CREATE TABLE IF NOT EXISTS local_blockchain (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100),
        user_name VARCHAR(255),
        type VARCHAR(100) NOT NULL,
        amount NUMERIC NOT NULL,
        description TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        previous_hash VARCHAR(255) NOT NULL,
        nonce BIGINT NOT NULL,
        hash VARCHAR(255) NOT NULL
      );
    `);

    // 9. Create user credits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_credits (
        user_id VARCHAR(100) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        available NUMERIC NOT NULL DEFAULT 100,
        verified NUMERIC NOT NULL DEFAULT 100,
        retired NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. Create green certificates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS green_certificates (
        id UUID PRIMARY KEY,
        owner_id VARCHAR(100) NOT NULL REFERENCES users(id),
        carbon_reduced NUMERIC NOT NULL,
        date_issued TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        token_id VARCHAR(100) NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT TRUE,
        blockchain_txn VARCHAR(255)
      );
    `);
    await client.query(`ALTER TABLE green_certificates ADD COLUMN IF NOT EXISTS baseline_emission NUMERIC NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE green_certificates ADD COLUMN IF NOT EXISTS actual_emission NUMERIC NOT NULL DEFAULT 0;`);

    // 11. Create carbon market tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_listings (
        id UUID PRIMARY KEY,
        seller_id VARCHAR(100) NOT NULL REFERENCES users(id),
        certificate_id UUID NOT NULL REFERENCES green_certificates(id),
        quantity NUMERIC NOT NULL DEFAULT 1,
        price NUMERIC NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS market_trades (
        id UUID PRIMARY KEY,
        listing_id UUID NOT NULL REFERENCES market_listings(id),
        buyer_id VARCHAR(100) NOT NULL REFERENCES users(id),
        seller_id VARCHAR(100) NOT NULL REFERENCES users(id),
        certificate_id UUID NOT NULL REFERENCES green_certificates(id),
        quantity NUMERIC NOT NULL,
        price NUMERIC NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Database tables setup successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during database setup:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

setup().catch((error) => {
  console.error('Database setup failed:', error);
  process.exitCode = 1;
});
