import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DB_URI;
const DATA_DIR = path.resolve(process.cwd(), 'data');

if (!connectionString) {
  console.error('Error: DB_URI is not defined in .env.local');
  process.exit(1);
}

async function migrate() {
  console.log('Connecting to Neon PostgreSQL database for migration...');
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected successfully!');

  try {
    // Ensure local_blockchain table exists
    console.log('Creating "local_blockchain" table...');
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

    // Ensure default device exists
    await client.query(`
      INSERT INTO devices (device_id, name, status)
      VALUES ('ESP32-001', 'Primary PZEM Monitor', 'offline')
      ON CONFLICT (device_id) DO NOTHING;
    `);

    // 1. Migrate Users
    const usersFile = path.join(DATA_DIR, 'users.json');
    if (fs.existsSync(usersFile)) {
      console.log('Migrating users from users.json...');
      const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
      for (const u of users) {
        await client.query(`
          INSERT INTO users (id, email, password, name, role, total_energy_used, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE 
          SET email = EXCLUDED.email, name = EXCLUDED.name, password = EXCLUDED.password, role = EXCLUDED.role, total_energy_used = EXCLUDED.total_energy_used;
        `, [u.id, u.email, u.password, u.name, u.role || 'user', u.totalEnergyUsed || 0, u.createdAt || new Date()]);
      }
      console.log(`Migrated ${users.length} users.`);
    }

    // 2. Migrate Local Blockchain Transactions
    const blockchainFile = path.join(DATA_DIR, 'blockchain.json');
    if (fs.existsSync(blockchainFile)) {
      console.log('Migrating blockchain transactions from blockchain.json...');
      const txs = JSON.parse(fs.readFileSync(blockchainFile, 'utf8'));
      for (const t of txs) {
        await client.query(`
          INSERT INTO local_blockchain (id, user_id, user_name, type, amount, description, timestamp, previous_hash, nonce, hash)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING;
        `, [t.id, t.userId, t.userName, t.type, t.amount, t.description, t.timestamp, t.previousHash, t.nonce, t.hash]);
      }
      console.log(`Migrated ${txs.length} simulated blockchain blocks.`);
    }

    // 3. Migrate IoT readings
    const iotFile = path.join(DATA_DIR, 'iotEnergy.json');
    if (fs.existsSync(iotFile)) {
      console.log('Migrating IoT energy readings from iotEnergy.json...');
      const readings = JSON.parse(fs.readFileSync(iotFile, 'utf8'));
      console.log(`Found ${readings.length} readings. Committing to PostgreSQL...`);
      
      // Batch insert for performance
      for (let i = 0; i < readings.length; i += 100) {
        const batch = readings.slice(i, i + 100);
        const queries = batch.map(r => {
          return client.query(`
            INSERT INTO energy_readings (id, device_id, voltage, current, power, energy, frequency, power_factor, timestamp, received_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING;
          `, [r.id, r.deviceId || 'ESP32-001', r.voltage, r.current, r.power, r.energy, r.frequency, r.power_factor || r.powerFactor || 1, r.timestamp, r.receivedAt || r.timestamp]);
        });
        await Promise.all(queries);
      }
      console.log(`Migrated ${readings.length} IoT readings.`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

migrate();
