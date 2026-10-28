export interface EnergyReading {
  timestamp: Date;
  consumption: number; // kWh
  cost: number; // USD
  carbonIntensity: number; // gCO2/kWh
}

export interface CarbonEmission {
  reading: EnergyReading;
  totalEmission: number; // kg CO2
}

export interface Forecast {
  hour: number;
  carbonIntensity: number;
  isGreenWindow: boolean;
  recommendedLoad: string;
}

export interface BlockchainTransaction {
  id: string;
  timestamp: Date | string;
  type: 'EMISSION_RECORDED' | 'CREDIT_EARNED' | 'CREDIT_TRANSFERRED' | string;
  amount: number;
  hash: string;
  previousHash: string;
  nonce: number;
  userId?: string;
  userName?: string;
  description?: string;
}

export interface CarbonCredits {
  userId: string;
  totalVerified: number;
  available: number;
  timestamp: Date;
}

export interface GreenCertificate {
  id: string;
  owner: string;
  ownerId?: string;
  carbonReduced: number; // Legacy stored amount; unit and methodology are not validated.
  dateIssued: Date | string;
  tokenId: string;
  verified: boolean;
  blockchainTxn?: string;
}

export interface MarketData {
  timestamp: Date;
  price: number; // USD per credit
  volume: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface NewsEvent {
  id: string;
  timestamp: Date;
  title: string;
  impact: number; // -5 to 5
  description: string;
}
