import {
  EnergyReading,
  CarbonEmission,
  Forecast,
  CarbonCredits,
  MarketData,
  NewsEvent,
  GreenCertificate
} from '../types/index';

// Simulated IoT data generator
export function generateEnergyReading(): EnergyReading {
  const now = new Date();
  const hour = now.getHours();
  
  // Consumption increases throughout the day - early morning low, peaks in evening
  let baseConsumption = 0.5; // 12 AM - 6 AM: minimal usage
  
  if (hour >= 6 && hour < 12) {
    baseConsumption = 1.5 + (hour - 6) * 0.2; // 6 AM - 12 PM: gradually increases
  } else if (hour >= 12 && hour < 17) {
    baseConsumption = 3.0 + (hour - 12) * 0.3; // 12 PM - 5 PM: continues increasing
  } else if (hour >= 17 && hour < 22) {
    baseConsumption = 4.5 + (hour - 17) * 0.4; // 5 PM - 10 PM: peaks (cooking, heating/cooling)
  } else if (hour >= 22) {
    baseConsumption = 2.5 + (24 - hour) * 0.1; // 10 PM - 12 AM: starts decreasing
  }
  
  // Add small random variation for realism
  const variation = Math.random() * 0.3;
  const consumption = Math.max(0.5, baseConsumption + variation);

  // Carbon intensity varies by time of day and grid mix
  const isPeakHours = hour >= 17 && hour <= 21;
  const baseCarbonIntensity = isPeakHours ? 450 : 250;
  const carbonIntensity = baseCarbonIntensity + (Math.random() - 0.5) * 100;

  return {
    timestamp: now,
    consumption: parseFloat(consumption.toFixed(2)),
    cost: parseFloat((consumption * 12).toFixed(2)),
    carbonIntensity: parseFloat(carbonIntensity.toFixed(2))
  };
}

export function calculateCarbonEmission(reading: EnergyReading): CarbonEmission {
  const totalEmission = (reading.consumption * reading.carbonIntensity) / 1000; // Convert to kg CO2

  return {
    reading,
    totalEmission: parseFloat(totalEmission.toFixed(4))
  };
}

// AI Forecasting for next 24 hours
export function generateCarbonForecast(): Forecast[] {
  const forecast: Forecast[] = [];
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() + i) % 24;
    const isPeakHours = hour >= 17 && hour <= 21;
    const baseIntensity = isPeakHours ? 450 : 250;
    const carbonIntensity = baseIntensity + (Math.sin(i / 24 * Math.PI) * 100);

    forecast.push({
      hour: hour,
      carbonIntensity: Math.max(200, parseFloat(carbonIntensity.toFixed(2))),
      isGreenWindow: carbonIntensity < 300,
      recommendedLoad: carbonIntensity < 300 ? 'HIGH' : carbonIntensity < 400 ? 'MEDIUM' : 'LOW'
    });
  }

  return forecast;
}

// Carbon credits simulation
export function calculateCarbonCredits(totalEmissionReduced: number): number {
  // 1 credit = 10 kg CO2 equivalent reduced
  return parseFloat((totalEmissionReduced / 10).toFixed(2));
}

export function getCurrentCarbonCredits(userId: string): CarbonCredits {
  const stored = localStorage.getItem(`credits_${userId}`);
  if (stored) {
    return JSON.parse(stored);
  }

  const credits: CarbonCredits = {
    userId,
    totalVerified: Math.floor(Math.random() * 5000) + 1000,
    available: Math.floor(Math.random() * 1000) + 100,
    timestamp: new Date()
  };

  localStorage.setItem(`credits_${userId}`, JSON.stringify(credits));
  return credits;
}

export function addCarbonCredits(userId: string, amount: number): CarbonCredits {
  const credits = getCurrentCarbonCredits(userId);
  credits.available += amount;
  credits.totalVerified += amount;
  credits.timestamp = new Date();
  localStorage.setItem(`credits_${userId}`, JSON.stringify(credits));
  return credits;
}

// Market simulation
export function generateMarketData(basePrice: number = 25): MarketData[] {
  const data: MarketData[] = [];
  let price = basePrice;

  for (let i = 0; i < 30; i++) {
    const change = (Math.random() - 0.45) * 4;
    price = Math.max(10, price + change);

    data.push({
      timestamp: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 100000) + 10000,
      trend: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'STABLE'
    });
  }

  return data;
}

// News events affecting market
export function generateNewsEvents(): NewsEvent[] {
  const events: NewsEvent[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      title: 'Global renewable energy capacity exceeds 4000 GW',
      impact: 2,
      description: 'IEA reports record renewable energy expansion'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      title: 'New carbon pricing regulation in EU',
      impact: 3,
      description: 'EU increases carbon credit requirements'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      title: 'Tech companies commit to carbon neutrality',
      impact: 2,
      description: 'Microsoft and Google announce 2030 goals'
    }
  ];

  return events;
}

// Green Certificate (NFT) simulation
export function generateGreenCertificate(userId: string, carbonReduced: number): GreenCertificate {
  const id = `CERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tokenId = `0x${Math.random().toString(16).substr(2, 40)}`;

  return {
    id,
    owner: userId,
    carbonReduced,
    dateIssued: new Date(),
    tokenId,
    verified: true
  };
}

export function getCertificates(userId: string): GreenCertificate[] {
  const stored = localStorage.getItem(`certs_${userId}`);
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
}

export function addCertificate(userId: string, certificate: GreenCertificate): void {
  const certs = getCertificates(userId);
  certs.push(certificate);
  localStorage.setItem(`certs_${userId}`, JSON.stringify(certs));
}

// Real-time data streams
export function subscribeToEnergyUpdates(callback: (reading: EnergyReading) => void, interval: number = 3000): () => void {
  const intervalId = setInterval(() => {
    callback(generateEnergyReading());
  }, interval);

  return () => clearInterval(intervalId);
}

export function subscribeToMarketUpdates(callback: (data: MarketData) => void, interval: number = 5000): () => void {
  let lastPrice = 25;

  const intervalId = setInterval(() => {
    const change = (Math.random() - 0.45) * 2;
    lastPrice = Math.max(10, lastPrice + change);

    callback({
      timestamp: new Date(),
      price: parseFloat(lastPrice.toFixed(2)),
      volume: Math.floor(Math.random() * 50000) + 5000,
      trend: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'STABLE'
    });
  }, interval);

  return () => clearInterval(intervalId);
}
