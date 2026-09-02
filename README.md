# CarbonCredit.AI - AI-Driven Electricity Monitoring & Blockchain-Based Carbon Credit Platform

A comprehensive proof-of-concept web application demonstrating integrated energy monitoring, AI-driven carbon optimization, and blockchain-based carbon credit validation.

## Overview

CarbonCredit.AI addresses the growing need for verifiable, transparent carbon reduction at individual and small-business levels. The platform combines:

- **Real-time Energy Monitoring**: Simulated IoT data with live electricity usage meters
- **Grid Carbon Intensity Integration**: Real-time CO₂ emissions calculated from grid carbon intensity
- **AI-Driven Forecasting**: ML-style predictions for optimal "green windows" to run heavy appliances
- **Blockchain Ledger**: Immutable record of verified carbon savings and tokenized Green Certificates
- **Carbon Market**: Live-ish price charts with realistic market simulation
- **NFT Viewer**: Visual badges and certificates for earned credits

## Features

### 1. Dashboard
- Live electricity usage meter with real-time IoT simulation
- Current grid carbon intensity display
- 24-hour consumption and emissions patterns
- Real-time cost tracking
- Daily summary statistics

### 2. AI Forecasting
- 24-hour carbon intensity forecasts
- "Green window" identification for optimal appliance scheduling
- Load recommendations based on carbon intensity
- Machine learning insights for daily savings potential
- Peak carbon hour alerts

### 3. Blockchain Ledger
- Immutable transaction log of verified emissions
- Proof-of-work mining simulation
- Cryptographic hashing with SHA256
- Chain integrity validation
- Transaction explorer with detailed hash information

### 4. Carbon Market
- 30-day historical price data with realistic simulation
- Trading volume charts
- Market news and events with impact metrics
- Sentiment and activity indicators
- Real-time price updates every 5 seconds

### 5. Green Certificates (NFTs)
- Digital badges for verified carbon reductions
- Tiered system: Bronze, Silver, Gold, Platinum
- Blockchain token IDs for each certificate
- Certificate collection viewer
- Detailed metadata and verification status

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + Autoprefixer
- **Charts**: Recharts (data visualization)
- **Icons**: Lucide React (minimalist icon set)
- **Cryptography**: CryptoJS (blockchain hashing)
- **Date Handling**: date-fns

## Project Structure

```
capstone/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx          # Main energy dashboard
│   │   ├── AIForecasting.tsx      # ML predictions & green windows
│   │   ├── CarbonLedger.tsx       # Blockchain transaction ledger
│   │   ├── CarbonMarket.tsx       # Market prices & news
│   │   └── NFTViewer.tsx          # Green certificates viewer
│   ├── services/
│   │   ├── blockchain.ts          # Blockchain simulation
│   │   └── dataService.ts         # IoT & market data generation
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── utils/
│   │   └── formatters.ts          # Display formatting utilities
│   ├── App.tsx                    # Main application
│   ├── main.tsx                   # React entry point
│   └── index.css                  # TailwindCSS styles
├── index.html                     # HTML entry point
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── tailwind.config.js             # TailwindCSS config
├── postcss.config.js              # PostCSS config
└── README.md                      # This file
```

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm

### Steps

1. **Navigate to project directory**:
   ```bash
   cd capstone
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## How It Works

### IoT Data Simulation
Real-time energy readings are simulated with realistic patterns:
- Peak consumption during evening hours (17:00-21:00)
- Lower consumption during night and early morning
- Variable carbon intensity based on grid conditions
- Updates every 3 seconds

### AI Forecasting Algorithm
The system predicts the next 24 hours:
1. Analyzes historical grid carbon patterns
2. Identifies "green windows" (carbon intensity < 300 g CO₂/kWh)
3. Recommends heavy load hours
4. Calculates potential daily CO₂ savings

### Blockchain Carbon Ledger
Each transaction is cryptographically secured:
1. Generates SHA256 hash of transaction data
2. Implements proof-of-work with configurable difficulty
3. Links blocks with previous hash reference
4. Validates chain integrity
5. Prevents tampering and ensures immutability

### Green Certificate (NFT) System
Carbon reductions are tokenized:
1. Verified savings trigger certificate generation
2. Assigns tier based on CO₂ reduction amount
3. Records token ID on blockchain
4. Enables trading and market participation

### Market Simulation
Realistic price movements based on:
- Supply and demand curves
- News events with market impact
- Sentiment indicators
- Historical volatility patterns

## Key Metrics & Calculations

### Carbon Emission Calculation
```
Emission (kg CO₂) = Consumption (kWh) × Carbon Intensity (g CO₂/kWh) ÷ 1000
```

### Carbon Credits
```
Credits = Emission Reduced (kg CO₂) ÷ 10
(1 credit = 10 kg CO₂ equivalent)
```

### Blockchain Hash (Proof-of-Work)
```
Hash = SHA256(ID + Timestamp + Type + Amount + PreviousHash + Nonce)
Valid Hash = starts with N zeros (difficulty = N)
```

## Use Cases

### For Households
- Track daily electricity consumption and costs
- Identify best times to run appliances
- Earn and trade carbon credits
- Participate in carbon markets

### For Small Businesses
- Monitor energy usage across operations
- Reduce carbon footprint with AI guidance
- Generate verifiable sustainability reports
- Access carbon credit trading

### For Policymakers
- Understand real-time energy patterns
- Validate claimed carbon reductions
- Design effective incentive programs
- Monitor market effectiveness

## Future Enhancements

- Real blockchain integration (Ethereum, Polygon)
- Machine learning models with actual historical data
- Smart contracts for automated credit transfers
- Integration with real IoT devices
- Multi-user accounts and social features
- Advanced analytics and reporting
- API for third-party integrations

## Design Philosophy

The application follows a **minimalist, professional design** with:
- Clean, intuitive interface
- Consistent color scheme (emerald green for eco-friendly, professional slate)
- Clear information hierarchy
- Responsive design (mobile-friendly)
- Accessible typography and spacing
- Icons from Lucide React (clean, modern set)
- No emojis; professional throughout

## Environment Variables

No environment variables required for this proof-of-concept. All data is simulated locally.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This is a proof-of-concept demonstration for educational purposes.

## Contact & Attribution

Built as a demonstration of:
- AI-driven energy optimization
- Blockchain-based carbon accounting
- Real-time IoT monitoring
- Sustainable technology implementation

---

**CarbonCredit.AI** - Making carbon reduction transparent, verifiable, and accessible to all.
