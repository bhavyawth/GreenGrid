'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownRight, BarChart3, Plus, ShoppingCart, Shield, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { GreenCertificate } from '../types/index';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CarbonMarketProps {
  userId: string;
  token: string;
}

interface ActiveListing {
  id: string;
  sellerId: string;
  sellerName: string;
  certificateId: string;
  quantity: number;
  price: number;
  status: string;
  carbonReduced: number;
  tokenId: string;
  createdAt: string;
}

interface TradeHistory {
  id: string;
  listingId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  certificateId: string;
  quantity: number;
  price: number;
  carbonReduced: number;
  timestamp: string;
}

interface MarketQuote {
  price: number | null;
  power: number | null;
  changePercent: number | null;
  explanation: string;
}

interface TradePricePoint {
  timestamp: string;
  price: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static px-4 py-3 text-sm">
      <p className="text-zinc-400 text-xs mb-1">
        {new Date(label).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color || '#a78bfa' }} className="font-medium">
          {entry.name}: {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

export const CarbonMarket: React.FC<CarbonMarketProps> = ({ userId, token }) => {
  const [listings, setListings] = useState<ActiveListing[]>([]);
  const [trades, setTrades] = useState<TradeHistory[]>([]);
  const [myCertificates, setMyCertificates] = useState<GreenCertificate[]>([]);
  const [selectedCertId, setSelectedCertId] = useState<string>('');
  const [listingPrice, setListingPrice] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMarketData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resListings, resTrades, resCerts, resWallet, resQuote] = await Promise.all([
        fetch('/api/market/listings', { headers }),
        fetch('/api/market/history', { headers }),
        fetch('/api/certificates', { headers }),
        fetch('/api/market/wallet', { headers }),
        fetch('/api/market/quote', { headers })
      ]);

      if (resListings.ok) {
        setListings(await resListings.json());
      }
      if (resTrades.ok) {
        setTrades(await resTrades.json());
      }
      if (resCerts.ok) {
        setMyCertificates(await resCerts.json());
      }
      if (resWallet.ok) setWalletBalance((await resWallet.json()).balance);
      if (resQuote.ok) {
        const nextQuote = await resQuote.json();
        setQuote(nextQuote);
        if (typeof nextQuote.price === 'number' && Number.isFinite(nextQuote.price)) {
          setListingPrice((current) => current || nextQuote.price.toFixed(2));
        }
      }
    } catch (err) {
      console.error('Error loading market data:', err);
      setError('Failed to connect to the GreenGrid marketplace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, [token]);

  const handleListCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCertId || !listingPrice || parseFloat(listingPrice) <= 0) {
      setError('Please select an app record and enter a valid asking price.');
      return;
    }
    const confirmed = window.confirm(
      `Confirm listing at your asking price of ${formatCurrency(parseFloat(listingPrice))}?\n\nThe listing can be bought back later at the platform's sensor-based reference estimate.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const res = await fetch('/api/market/listings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          certificateId: selectedCertId,
          price: parseFloat(listingPrice)
        })
      });

      if (res.ok) {
        setSuccess('Your asking-price listing is live on GreenGrid.');
        setSelectedCertId('');
        setListingPrice('');
        await fetchMarketData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to list certificate.');
      }
    } catch (err) {
      setError('Failed to connect to marketplace service.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyListing = async (listingId: string) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const res = await fetch('/api/market/buy', {
        method: 'POST',
        headers,
        body: JSON.stringify({ listingId })
      });

      if (res.ok) {
        setSuccess('In-app trade completed and listing ownership updated.');
        await fetchMarketData();
      } else {
        const data = await res.json();
        setError(data.error || 'Purchase transaction failed.');
      }
    } catch (err) {
      setError('Failed to execute purchase trade.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuyBackListing = async (listingId: string) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const cancelRes = await fetch(`/api/market/buyback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ listingId })
      });

      if (cancelRes.ok) {
        const data = await cancelRes.json();
        setSuccess(`Listing bought back at ${formatCurrency(data.price)}. Your certificate is back in your account.`);
        await fetchMarketData();
      } else {
        const data = await cancelRes.json();
        setError(data.error || 'Listing may have already been closed or removed. Please refresh and try again.');
      }
    } catch (err) {
      setError('Connection error while cancelling listing.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter out certificates that are already listed
  const availableCertificates = myCertificates.filter(
    cert => !listings.some(l => l.certificateId === cert.id) && cert.ownerId === userId
  );

  const activeAskPrices = listings.map((listing) => listing.price).filter(Number.isFinite);
  const lastTrade = trades[0] ?? null;
  const tradePriceHistory: TradePricePoint[] = [...trades]
    .reverse()
    .map((trade) => ({ timestamp: trade.timestamp, price: trade.price }));
  const totalTradeValue = trades.reduce((sum, trade) => sum + trade.price, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
        <span className="text-sm text-zinc-500 font-medium">Connecting to Carbon Marketplace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header" style={{ background: 'linear-gradient(135deg, rgba(22, 22, 29, 0.9) 0%, rgba(139, 92, 246, 0.08) 100%)', borderColor: 'rgba(139, 92, 246, 0.15)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">GreenGrid P2P Market</span>
          </div>
          <h1 className="text-2xl font-bold text-white">GreenGrid P2P Marketplace</h1>
          <p className="text-sm text-zinc-400 mt-1">
            GreenGrid participant offers and completed app trades. The meter-derived reference quote is an internal estimate, not an external benchmark.
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Internal app wallet: {formatCurrency(walletBalance)} · {quote?.power === null || quote?.power === undefined
              ? 'No current sensor power reading'
              : `PZEM reading: ${quote.power.toFixed(1)} W`}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded-lg p-4 flex items-center gap-3 text-sm text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500 bg-opacity-10 border border-emerald-500 border-opacity-20 rounded-lg p-4 flex items-center gap-3 text-sm text-emerald-400">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Price Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-stagger">
        <div className="metric-card accent-purple">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Meter-Based Reference Estimate</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">
              {quote?.price === null || !quote ? '—' : formatCurrency(quote.price)}
            </p>
            <p className="text-xs text-zinc-500 mt-1.5">Internal model suggestion; not a market quote</p>
          </div>
        </div>

        <div className="metric-card accent-blue">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Last App Trade</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">
              {lastTrade ? formatCurrency(lastTrade.price) : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-1.5">
              {lastTrade ? formatDate(lastTrade.timestamp) : 'No completed trades yet'}
            </p>
          </div>
        </div>

        <div className="metric-card accent-green">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Listings</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">{listings.length}</p>
            <p className="text-xs text-zinc-500 mt-1.5">Current participant offers</p>
          </div>
        </div>

        <div className="metric-card accent-red">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Completed App Trades</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">{trades.length}</p>
            <p className="text-xs text-zinc-500 mt-1.5">Internal ownership records; no cash settlement</p>
          </div>
        </div>
      </div>

      {/* Main Trade Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sell / List Form */}
        <div className="glass-card p-6 h-fit">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-purple-400" /> List App Record
          </h2>
          <p className="text-xs text-zinc-500 mb-5">
            Set your asking price in USD. Buyers can accept an offer inside the app; no external payment or credit registry is connected.
          </p>
          <p className="text-xs text-amber-300/80 mb-4">
            Buy back closes your listing using the platform's sensor-based reference estimate. This is an in-app balance operation, not a cash refund.
          </p>

          <form onSubmit={handleListCertificate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Select App Record
              </label>
              <select
                value={selectedCertId}
                onChange={(e) => setSelectedCertId(e.target.value)}
                className="input-field w-full text-zinc-300"
                disabled={actionLoading}
              >
                <option value="">-- Choose Record --</option>
                {availableCertificates.map(c => (
                  <option key={c.id} value={c.id}>
                    ID: {c.id.slice(0, 8)}... ({c.carbonReduced} CO₂e app-recorded units)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Listing Price (USD)
              </label>
              <input
                type="number"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="e.g. 15.00"
                className="input-field w-full text-zinc-300"
                min="0.01"
                step="0.01"
                disabled={actionLoading}
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                {quote?.price !== null && quote
                  ? `Internal reference estimate: ${formatCurrency(quote.price)}. This model is not an external market quote.`
                  : 'No sensor-based reference estimate is available; enter your own asking price.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={actionLoading || !selectedCertId || !listingPrice}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              <span>{actionLoading ? 'Publishing...' : 'Publish Asking Price'}</span>
            </button>
          </form>
        </div>

        {/* Active Listings Grid */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-purple-400" /> Active Listings
          </h2>
          <p className="text-xs text-zinc-500 mb-5">
            Live offers from GreenGrid users. Accepting an offer updates in-app ownership and wallet records; prices are seller-set, and carbon amounts are not independently certified.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
            {listings.length === 0 ? (
              <div className="col-span-2 py-10 text-center border-2 border-dashed border-white/[0.08] rounded-xl">
                <ShoppingCart className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No active listings available. List one of your certificates above!</p>
              </div>
            ) : (
              listings.map((l) => (
                <div key={l.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-zinc-500">ID: {l.id.slice(0, 8)}...</span>
                      <span className="badge badge-purple font-mono text-xs">{l.carbonReduced} app-recorded units</span>
                    </div>
                    <p className="text-xs text-indigo-400 font-mono mb-1">Project Token #{l.tokenId}</p>
                    <p className="text-sm text-zinc-300 font-semibold mb-1">Seller: {l.sellerName}</p>
                    <p className="text-xs text-zinc-500">Listed: {formatDate(l.createdAt)}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                    <span className="text-lg font-bold text-white tabular-nums">{formatCurrency(l.price)}</span>
                    {l.sellerId === userId ? (
                      <button
                        onClick={() => handleBuyBackListing(l.id)}
                        disabled={actionLoading}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Buy back at the internal sensor-based reference estimate"
                      >
                        <ArrowDownRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyListing(l.id)}
                        disabled={actionLoading}
                        className="py-1.5 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Accept offer
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Trade History */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Recent Transactions & Trade History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="dark-table">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Asset</th>
                <th>Price</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-zinc-500 py-8 text-sm">
                    No transactions recorded yet in the marketplace history.
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.01]">
                    <td><code className="text-xs text-zinc-500 font-mono">{t.id.slice(0, 12)}...</code></td>
                    <td className="text-xs text-zinc-300">{t.sellerName}</td>
                    <td className="text-xs text-zinc-300">{t.buyerName}</td>
                    <td className="font-semibold text-white text-xs">{t.carbonReduced} app-recorded units</td>
                    <td className="font-semibold text-purple-400 tabular-nums">{formatCurrency(t.price)}</td>
                    <td className="text-xs text-zinc-500">{formatDate(t.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Completed Trade Prices</h2>
          <p className="text-xs text-zinc-500 mb-5">
            Each point is a completed GreenGrid in-app trade at the listing price. This is not an external carbon-market index.
          </p>
          {tradePriceHistory.length === 0 ? (
            <div className="h-[240px] flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-center px-6">
              <ShoppingCart className="w-8 h-8 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-300">No completed trades to chart yet</p>
              <p className="text-xs text-zinc-500 mt-1">The chart will use actual app trades once a buyer accepts a listing.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={tradePriceHistory}>
                <defs>
                  <linearGradient id="colorPriceDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#52525b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#52525b" tick={{ fontSize: 11 }} tickFormatter={(price) => `$${price}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPriceDark)"
                  name="Trade price"
                  activeDot={{ r: 4, fill: '#a855f7', stroke: '#0a0a0f', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-6 h-fit">
          <h3 className="text-sm font-semibold text-white mb-5">GreenGrid Market Snapshot</h3>
          <div className="space-y-4">
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-zinc-500">Active asking-price range</span>
              <span className="text-zinc-300 text-right">
                {activeAskPrices.length
                  ? `${formatCurrency(Math.min(...activeAskPrices))} – ${formatCurrency(Math.max(...activeAskPrices))}`
                  : 'No active offers'}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-zinc-500">Recorded in-app trade value</span>
              <span className="text-zinc-300">{formatCurrency(totalTradeValue)}</span>
            </div>
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-zinc-500">External benchmark feed</span>
              <span className="text-amber-400">Not connected</span>
            </div>
            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Listing prices are real offers entered by GreenGrid participants. Completed trades record in-app ownership
                changes at those prices; the app does not process cash payments or certify the underlying carbon amount.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">How this market price is formed</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The average active ask summarizes current seller offers. The trade chart uses actual prices attached to completed
          GreenGrid trades. These are platform-level observations, not a global carbon-credit benchmark; no price is shown
          when the platform has no listing or trade data.
        </p>
      </div>
    </div>
  );
};
