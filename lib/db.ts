import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { query } from './pg';

const demoStore = globalThis as typeof globalThis & {
  greengridDemoUsers?: any[];
  greengridDemoReadings?: any[];
  greengridDemoTransactions?: any[];
  greengridDemoCredits?: Record<string, { userId: string; available: number; verified: number; retired: number }>;
  greengridDemoCertificates?: any[];
};

const demoUsers = () => {
  if (!demoStore.greengridDemoUsers) {
    demoStore.greengridDemoUsers = [
      {
        id: 'demo-user-1',
        email: 'user1@example.com',
        password: '$2b$10$7EqJtq98hPqEX7fNZaFWoO8Y7QWwJ8t9w1g7X5Q4QJQJQJQJQJQJQ',
        name: 'Demo User',
        role: 'user',
        totalEnergyUsed: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-admin-1',
        email: 'admin@example.com',
        password: '$2b$10$7EqJtq98hPqEX7fNZaFWoO8Y7QWwJ8t9w1g7X5Q4QJQJQJQJQJQJQ',
        name: 'Demo Admin',
        role: 'admin',
        totalEnergyUsed: 0,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return demoStore.greengridDemoUsers;
};

const demoHash = (transaction: any) =>
  CryptoJS.SHA256(JSON.stringify({ ...transaction, hash: undefined })).toString();

const demoTransactions = () => {
  if (!demoStore.greengridDemoTransactions) {
    let previousHash = '0';
    demoStore.greengridDemoTransactions = [1, 2, 3].map((index) => {
      const transaction: any = {
        id: `SIM_BLOCK_${index}`,
        userId: 'demo-user-1',
        userName: 'Demo User',
        type: 'EMISSION_RECORDED',
        amount: Number((1.2 + index * 0.65).toFixed(2)),
        description: 'Simulated energy reading for local demonstration',
        timestamp: new Date(Date.now() - (3 - index) * 60000).toISOString(),
        previousHash,
        nonce: 0,
        hash: '',
      };
      transaction.hash = demoHash(transaction);
      previousHash = transaction.hash;
      return transaction;
    });
  }
  return demoStore.greengridDemoTransactions;
};

export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: string;
  totalEnergyUsed: number;
  createdAt: string;
}

interface IoTEnergyReadingInput {
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

// User operations
export async function findUserById(userId: string) {
  if (!process.env.DB_URI) return demoUsers().find((user) => user.id === userId) || null;
  const res = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (res.rows.length === 0) return null;
  const u = res.rows[0];
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    totalEnergyUsed: Number(u.total_energy_used || 0),
    createdAt: u.created_at,
  };
}

export async function findUserByEmail(email: string) {
  if (!process.env.DB_URI) return demoUsers().find((user) => user.email === email) || null;
  const res = await query('SELECT * FROM users WHERE email = $1', [email]);
  if (res.rows.length === 0) return null;
  const u = res.rows[0];
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    password: u.password,
    role: u.role,
    totalEnergyUsed: Number(u.total_energy_used || 0),
    createdAt: u.created_at,
  };
}

export async function createUser(user: any) {
  if (!process.env.DB_URI) {
    demoUsers().push(user);
    return user;
  }
  await query(
    'INSERT INTO users (id, email, password, name, role, total_energy_used, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [
      user.id,
      user.email,
      user.password,
      user.name,
      user.role || 'user',
      user.totalEnergyUsed || 0,
      user.createdAt || new Date(),
    ]
  );
  return user;
}

export async function updateUser(userId: string, updates: any) {
  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    params.push(updates.name);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${idx++}`);
    params.push(updates.role);
  }
  if (updates.totalEnergyUsed !== undefined) {
    fields.push(`total_energy_used = $${idx++}`);
    params.push(updates.totalEnergyUsed);
  }

  if (fields.length === 0) return findUserById(userId);

  params.push(userId);
  await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`,
    params
  );
  return findUserById(userId);
}

export async function addCarbonRecord(record: {
  id: string;
  deviceId: string;
  carbonEmission: number;
  timestamp: string;
}) {
  await query(
    `INSERT INTO carbon_records (id, energy_reading_id, device_id, carbon_emission, timestamp)
     VALUES ($1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
     SET carbon_emission = EXCLUDED.carbon_emission, timestamp = EXCLUDED.timestamp`,
    [record.id, record.deviceId, record.carbonEmission, record.timestamp]
  );
}

// readUsers gets all users
export async function readUsers() {
  if (!process.env.DB_URI) {
    return demoUsers().map(({ password, ...user }) => user);
  }
  const res = await query('SELECT * FROM users ORDER BY created_at DESC');
  return res.rows.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    totalEnergyUsed: Number(u.total_energy_used || 0),
    createdAt: u.created_at,
  }));
}

// Blockchain operations (simulated ledger)
export async function addBlockchainTransaction(t: any) {
  if (!process.env.DB_URI) {
    demoTransactions().push(t);
    return t;
  }
  await query(
    'INSERT INTO local_blockchain (id, user_id, user_name, type, amount, description, timestamp, previous_hash, nonce, hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [
      t.id,
      t.userId,
      t.userName,
      t.type,
      t.amount,
      t.description,
      t.timestamp || new Date(),
      t.previousHash,
      t.nonce,
      t.hash,
    ]
  );
  return t;
}

export async function getAllBlockchainTransactions() {
  if (!process.env.DB_URI) return demoTransactions();
  const res = await query('SELECT * FROM local_blockchain ORDER BY timestamp ASC');
  return res.rows.map(t => ({
    id: t.id,
    userId: t.user_id,
    userName: t.user_name,
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    timestamp: t.timestamp,
    previousHash: t.previous_hash,
    nonce: Number(t.nonce),
    hash: t.hash,
  }));
}

// IoT energy readings operations
export async function addIoTEnergyReading(r: IoTEnergyReadingInput) {
  // Ensure device exists
  await query(
    'INSERT INTO devices (device_id, name, status) VALUES ($1, $2, $3) ON CONFLICT (device_id) DO UPDATE SET status = $3, updated_at = NOW()',
    [r.deviceId, 'Primary PZEM Monitor', 'online']
  );

  await query(
    'INSERT INTO energy_readings (id, device_id, voltage, current, power, energy, frequency, power_factor, timestamp, received_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING',
    [
      r.id,
      r.deviceId,
      r.voltage,
      r.current,
      r.power,
      r.energy,
      r.frequency,
      r.powerFactor,
      r.timestamp,
      r.receivedAt,
    ]
  );
  return r;
}

export async function getLatestIoTEnergyReading() {
  const res = await query('SELECT * FROM energy_readings ORDER BY timestamp DESC LIMIT 1');
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    deviceId: r.device_id,
    voltage: Number(r.voltage),
    current: Number(r.current),
    power: Number(r.power),
    energy: Number(r.energy),
    frequency: Number(r.frequency),
    powerFactor: Number(r.power_factor),
    timestamp: r.timestamp,
    receivedAt: r.received_at,
  };
}

export async function getPreviousIoTEnergyReading(reading: { id: string; deviceId: string; timestamp: string | Date }) {
  const res = await query(
    'SELECT * FROM energy_readings WHERE device_id = $1 AND id <> $2 AND timestamp < $3 ORDER BY timestamp DESC LIMIT 1',
    [reading.deviceId, reading.id, reading.timestamp]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    deviceId: r.device_id,
    energy: Number(r.energy),
    timestamp: r.timestamp,
  };
}

export async function getIoTEnergyReadings(limit: number = 50) {
  const res = await query('SELECT * FROM energy_readings ORDER BY timestamp DESC LIMIT $1', [limit]);
  // Reverse to put in chronological order (most recent last, like chart expects)
  return res.rows.reverse().map(r => ({
    id: r.id,
    deviceId: r.device_id,
    voltage: Number(r.voltage),
    current: Number(r.current),
    power: Number(r.power),
    energy: Number(r.energy),
    frequency: Number(r.frequency),
    powerFactor: Number(r.power_factor),
    timestamp: r.timestamp,
    receivedAt: r.received_at,
  }));
}

// Deprecated simulated data operations (mapped to postgres structure)
export async function getAllEnergyData() {
  const res = await query('SELECT * FROM user_energy_data');
  const obj: any = {};
  res.rows.forEach(r => {
    obj[r.user_id] = {
      userId: r.user_id,
      readings: r.readings || [],
      hourlyReadings: r.hourly_readings || [],
      totalEnergyUsed: Number(r.total_energy_used || 0),
    };
  });
  return obj;
}

export async function getUserEnergyData(userId: string) {
  const res = await query('SELECT * FROM user_energy_data WHERE user_id = $1', [userId]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    userId: r.user_id,
    readings: r.readings || [],
    hourlyReadings: r.hourly_readings || [],
    totalEnergyUsed: Number(r.total_energy_used || 0),
  };
}

export async function setUserEnergyData(userId: string, energyData: any) {
  await query(
    'INSERT INTO user_energy_data (user_id, readings, hourly_readings, total_energy_used) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET readings = EXCLUDED.readings, hourly_readings = EXCLUDED.hourly_readings, total_energy_used = EXCLUDED.total_energy_used',
    [
      userId,
      JSON.stringify(energyData.readings || []),
      JSON.stringify(energyData.hourlyReadings || []),
      energyData.totalEnergyUsed || 0,
    ]
  );
}


// Persist blockchain transaction metadata
export async function addBlockchainRecord(record: {
  tokenId: bigint;
  transactionHash: string;
  chainId: number;
  contractAddress: string;
  status: string;
  carbonRecordId?: string;
}) {
  const id = crypto.randomUUID();
  await query(
    'INSERT INTO blockchain_records (id, token_id, transaction_hash, chain_id, contract_address, status, carbon_record_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [
      id,
      record.tokenId.toString(),
      record.transactionHash,
      record.chainId,
      record.contractAddress,
      record.status,
      record.carbonRecordId || null,
    ]
  );
  return { id, ...record };
}

// Persist AI predictions
export async function addAiPrediction(pred: {
  deviceId: string;
  predictionValue: number;
  predictionHorizon: number;
  modelVersion: string;
  confidence?: number;
  inputWindowStart?: string;
  inputWindowEnd?: string;
}) {
  const id = crypto.randomUUID();
  await query(
    'INSERT INTO ai_predictions (id, device_id, prediction_value, prediction_horizon, model_version, confidence, input_window_start, input_window_end) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [
      id,
      pred.deviceId,
      pred.predictionValue,
      pred.predictionHorizon,
      pred.modelVersion,
      pred.confidence !== undefined ? pred.confidence : null,
      pred.inputWindowStart ? new Date(pred.inputWindowStart) : null,
      pred.inputWindowEnd ? new Date(pred.inputWindowEnd) : null,
    ]
  );
  return { id, ...pred };
}

export async function getUserCredits(userId: string) {
  if (!process.env.DB_URI) {
    demoStore.greengridDemoCredits ||= {};
    demoStore.greengridDemoCredits[userId] ||= { userId, available: 100, verified: 100, retired: 0 };
    return demoStore.greengridDemoCredits[userId];
  }
  // Ensure the user has a credits record. If not, initialize with 100 available.
  const checkRes = await query('SELECT * FROM user_credits WHERE user_id = $1', [userId]);
  if (checkRes.rows.length === 0) {
    await query(
      'INSERT INTO user_credits (user_id, available, verified, retired) VALUES ($1, 100, 100, 0)',
      [userId]
    );
    return { userId, available: 100, verified: 100, retired: 0 };
  }
  const r = checkRes.rows[0];
  return {
    userId: r.user_id,
    available: Number(r.available),
    verified: Number(r.verified),
    retired: Number(r.retired)
  };
}

export async function updateUserCredits(userId: string, availableChange: number, verifiedChange: number, retiredChange: number = 0) {
  if (!process.env.DB_URI) {
    const credits = await getUserCredits(userId);
    credits.available += availableChange;
    credits.verified += verifiedChange;
    credits.retired += retiredChange;
    return credits;
  }
  await getUserCredits(userId); // ensure row exists
  await query(
    `UPDATE user_credits 
     SET available = available + $2, 
         verified = verified + $3, 
         retired = retired + $4,
         updated_at = NOW() 
     WHERE user_id = $1`,
    [userId, availableChange, verifiedChange, retiredChange]
  );
  return getUserCredits(userId);
}

export async function getMarketWallet(userId: string) {
  if (!process.env.DB_URI) return { userId, balance: 100000 };
  const res = await query('SELECT market_balance FROM users WHERE id = $1', [userId]);
  if (res.rows.length === 0) throw new Error('User not found');
  return { userId, balance: Number(res.rows[0].market_balance || 0) };
}

export async function getGreenCertificates(ownerId: string) {
  if (!process.env.DB_URI) {
    return (demoStore.greengridDemoCertificates || []).filter((certificate) => certificate.ownerId === ownerId);
  }
  const res = await query('SELECT * FROM green_certificates WHERE owner_id = $1 ORDER BY date_issued DESC', [ownerId]);
  return res.rows.map(r => ({
    id: r.id,
    ownerId: r.owner_id,
    carbonReduced: Number(r.carbon_reduced),
    dateIssued: r.date_issued,
    tokenId: r.token_id,
    verified: Boolean(r.verified),
    blockchainTxn: r.blockchain_txn
  }));
}

export async function getGreenCertificateById(id: string) {
  if (!process.env.DB_URI) {
    return (demoStore.greengridDemoCertificates || []).find((certificate) => certificate.id === id) || null;
  }
  const res = await query('SELECT * FROM green_certificates WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    ownerId: r.owner_id,
    carbonReduced: Number(r.carbon_reduced),
    dateIssued: r.date_issued,
    tokenId: r.token_id,
    verified: Boolean(r.verified),
    blockchainTxn: r.blockchain_txn
  };
}

export async function createMarketListing(l: {
  id: string;
  sellerId: string;
  certificateId: string;
  quantity?: number;
  price: number;
}) {
  const existing = await query(
    `SELECT id FROM market_listings WHERE certificate_id = $1 AND status = 'active'`,
    [l.certificateId]
  );
  if (existing.rows.length > 0) {
    throw new Error('This certificate is already listed on the marketplace');
  }
  await query(
    `INSERT INTO market_listings (id, seller_id, certificate_id, quantity, price, status)
     VALUES ($1, $2, $3, $4, $5, 'active')`,
    [l.id, l.sellerId, l.certificateId, l.quantity || 1, l.price]
  );
  return l;
}

export async function getMarketListings() {
  const res = await query(
    `SELECT l.*, c.carbon_reduced, c.token_id, u.name as seller_name
     FROM market_listings l
     JOIN green_certificates c ON l.certificate_id = c.id
     JOIN users u ON l.seller_id = u.id
     WHERE l.status = 'active'
     ORDER BY l.created_at DESC`
  );
  return res.rows.map(r => ({
    id: r.id,
    sellerId: r.seller_id,
    sellerName: r.seller_name,
    certificateId: r.certificate_id,
    quantity: Number(r.quantity),
    price: Number(r.price),
    status: r.status,
    carbonReduced: Number(r.carbon_reduced),
    tokenId: r.token_id,
    createdAt: r.created_at
  }));
}

export async function getMarketListingById(listingId: string) {
  const res = await query('SELECT * FROM market_listings WHERE id = $1', [listingId]);
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function cancelMarketListing(listingId: string, sellerId: string) {
  const res = await query(
    `UPDATE market_listings 
     SET status = 'cancelled', updated_at = NOW() 
     WHERE id = $1 AND seller_id = $2 AND status = 'active'`,
    [listingId, sellerId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function buyBackMarketListing(listingId: string, sellerId: string, currentPrice: number) {
  await query('BEGIN');
  try {
    const listingRes = await query(
      `SELECT * FROM market_listings WHERE id = $1 AND seller_id = $2 AND status = 'active' FOR UPDATE`,
      [listingId, sellerId]
    );
    if (listingRes.rows.length === 0) throw new Error('Listing is no longer active');
    const listing = listingRes.rows[0];

    await query(
      `UPDATE market_listings SET status = 'bought_back', price = $1, updated_at = NOW() WHERE id = $2`,
      [currentPrice, listingId]
    );

    await query('UPDATE users SET market_balance = market_balance + $1 WHERE id = $2', [currentPrice, sellerId]);
    await query('COMMIT');
    return { success: true, listingId, price: currentPrice, certificateId: listing.certificate_id };
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

export async function executeMarketTrade(listingId: string, buyerId: string) {
  // Use a database transaction
  await query('BEGIN');
  try {
    const listingRes = await query('SELECT * FROM market_listings WHERE id = $1 AND status = \'active\' FOR UPDATE', [listingId]);
    if (listingRes.rows.length === 0) {
      throw new Error('Listing is no longer active');
    }
    const listing = listingRes.rows[0];

    if (listing.seller_id === buyerId) {
      throw new Error('You cannot buy your own listing');
    }

    // Verify certificate owner matches seller
    const certRes = await query('SELECT * FROM green_certificates WHERE id = $1 FOR UPDATE', [listing.certificate_id]);
    if (certRes.rows.length === 0) {
      throw new Error('Certificate not found');
    }
    const cert = certRes.rows[0];
    if (cert.owner_id !== listing.seller_id) {
      throw new Error('Seller no longer owns this certificate');
    }

    const walletRes = await query('SELECT market_balance FROM users WHERE id = $1 FOR UPDATE', [buyerId]);
    const buyerBalance = Number(walletRes.rows[0]?.market_balance || 0);
    if (buyerBalance < Number(listing.price)) {
      throw new Error(`Insufficient market balance. You have $${buyerBalance.toFixed(2)}.`);
    }

    // Process trade details
    const tradeId = crypto.randomUUID();
    
    // 1. Update Green Certificate Owner
    await query('UPDATE green_certificates SET owner_id = $1 WHERE id = $2', [buyerId, listing.certificate_id]);

    // 2. Mark listing as sold
    await query('UPDATE market_listings SET status = \'sold\', updated_at = NOW() WHERE id = $1', [listingId]);
    await query('UPDATE users SET market_balance = market_balance - $1 WHERE id = $2', [listing.price, buyerId]);
    await query('UPDATE users SET market_balance = market_balance + $1 WHERE id = $2', [listing.price, listing.seller_id]);

    // 3. Record Trade
    await query(
      `INSERT INTO market_trades (id, listing_id, buyer_id, seller_id, certificate_id, quantity, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tradeId, listingId, buyerId, listing.seller_id, listing.certificate_id, listing.quantity, listing.price]
    );

    // 4. Transfer off-chain carbon credits balance (Award credits to seller, deduct from buyer if demo currency matches)
    const carbonCreditsCost = Math.round(Number(listing.quantity) * Number(cert.carbon_reduced) / 10);
    // Add credits to seller, deduct from buyer (or just transfer credits)
    await updateUserCredits(listing.seller_id, -carbonCreditsCost, 0, 0);
    await updateUserCredits(buyerId, carbonCreditsCost, 0, 0);

    await query('COMMIT');
    return { success: true, tradeId };
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

export async function getMarketTrades() {
  const res = await query(
    `SELECT t.*, c.carbon_reduced, s.name as seller_name, b.name as buyer_name
     FROM market_trades t
     JOIN green_certificates c ON t.certificate_id = c.id
     JOIN users s ON t.seller_id = s.id
     JOIN users b ON t.buyer_id = b.id
     ORDER BY t.timestamp DESC`
  );
  return res.rows.map(r => ({
    id: r.id,
    listingId: r.listing_id,
    buyerId: r.buyer_id,
    buyerName: r.buyer_name,
    sellerId: r.seller_id,
    sellerName: r.seller_name,
    certificateId: r.certificate_id,
    quantity: Number(r.quantity),
    price: Number(r.price),
    carbonReduced: Number(r.carbon_reduced),
    timestamp: r.timestamp
  }));
}

export async function getBlockchainRecords(): Promise<Array<{
  id: string;
  tokenId: string;
  transactionHash: string;
  chainId: number;
  contractAddress: string;
  status: string;
  timestamp: string;
  carbonRecordId?: string;
}>> {
  if (!process.env.DB_URI) {
    return [];
  }
  const res = await query('SELECT * FROM blockchain_records ORDER BY timestamp DESC');
  return res.rows.map(r => ({
    id: r.id,
    tokenId: r.token_id,
    transactionHash: r.transaction_hash,
    chainId: Number(r.chain_id),
    contractAddress: r.contract_address,
    status: r.status,
    timestamp: r.timestamp,
    carbonRecordId: r.carbon_record_id
  }));
}
