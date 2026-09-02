'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Newspaper, BarChart3, ArrowUpRight, ArrowDownRight, Plus, ShoppingCart, Shield, Trash2, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { MarketData, NewsEvent, GreenCertificate } from '../types/index';
import { generateMarketData, generateNewsEvents } from '../services/dataService';
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static px-4 py-3 text-sm">
      <p className="text-zinc-400 text-xs mb-1">
        {typeof label === 'string' ? label : new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color || '#a78bfa' }} className="font-medium">
          {entry.name}: {typeof entry.value === 'number' ? (entry.name === 'Price' ? formatCurrency(entry.value) : `${(entry.value / 1000).toFixed(0)}K units`) : entry.value}
        </p>
      ))}
    </div>
  );
};

export const CarbonMarket: React.FC<CarbonMarketProps> = ({ userId, token }) => {
  // Static historical data for visual index charts
  const [marketIndexData] = useState<MarketData[]>(generateMarketData());
  const [newsEvents] = useState<NewsEvent[]>(generateNewsEvents());
  const [currentPrice] = useState(marketIndexData[marketIndexData.length - 1]?.price || 25);

  // Dynamic database-driven state
  const [listings, setListings] = useState<ActiveListing[]>([]);
  const [trades, setTrades] = useState<TradeHistory[]>([]);
  const [myCertificates, setMyCertificates] = useState<GreenCertificate[]>([]);
  const [selectedCertId, setSelectedCertId] = useState<string>('');
  const [listingPrice, setListingPrice] = useState<string>('');
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMarketData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resListings, resTrades, resCerts] = await Promise.all([
        fetch('/api/market/listings', { headers }),
        fetch('/api/market/history', { headers }),
        fetch('/api/certificates', { headers })
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
    } catch (err) {
      console.error('Error loading market data:', err);
      setError('Failed to connect to the carbon credit marketplace.');
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
      setError('Please select a certificate and enter a valid price.');
      return;
    }

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
        setSuccess('Certificate listed successfully on the carbon market!');
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
        setSuccess('Carbon credit certificate purchased successfully! Ownership updated.');
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

  const handleCancelListing = async (listingId: string) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const res = await fetch(`/api/market/listings`, {
        method: 'POST', // standard endpoint parses cancel if we map it
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ listingId, cancel: true })
      });

      // Let's implement a cancel handler. If we can also call an API like /api/market/listings?cancel=true
      // Let's build a simple cancel route or support it in our API route. We will support it in listings route.
      const cancelRes = await fetch(`/api/market/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ listingId, cancel: true })
      });

      if (cancelRes.ok) {
        setSuccess('Listing cancelled successfully.');
        await fetchMarketData();
      } else {
        setError('Failed to cancel listing.');
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

  const priceChange = marketIndexData.length > 1
    ? marketIndexData[marketIndexData.length - 1].price - marketIndexData[0].price
    : 0;
  const percentChange = ((priceChange / marketIndexData[0].price) * 100).toFixed(2);
  const avgPrice = (marketIndexData.reduce((sum, d) => sum + d.price, 0) / marketIndexData.length).toFixed(2);
  const maxPrice = Math.max(...marketIndexData.map(d => d.price));
  const minPrice = Math.min(...marketIndexData.map(d => d.price));

  const isUp = priceChange > 0;

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
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Market Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Carbon Credit Market</h1>
          <p className="text-sm text-zinc-400 mt-1">Real-time carbon credit pricing & market intelligence</p>
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
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Current Price Index</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">{formatCurrency(currentPrice)}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
              <span className={`text-xs font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.abs(parseFloat(percentChange))}%
              </span>
            </div>
          </div>
        </div>

        <div className="metric-card accent-blue">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">24H Avg</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">{formatCurrency(parseFloat(avgPrice))}</p>
            <p className="text-xs text-zinc-500 mt-1.5">Average index price</p>
          </div>
        </div>

        <div className="metric-card accent-green">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">High (24h)</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">{formatCurrency(maxPrice)}</p>
            <p className="text-xs text-zinc-500 mt-1.5">Peak index price</p>
          </div>
        </div>

        <div className="metric-card accent-red">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Low (24h)</p>
            <p className="text-3xl font-bold text-white mt-2 tabular-nums">{formatCurrency(minPrice)}</p>
            <p className="text-xs text-zinc-500 mt-1.5">Floor index price</p>
          </div>
        </div>
      </div>

      {/* Main Trade Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sell / List Form */}
        <div className="glass-card p-6 h-fit">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-purple-400" /> List Certificate
          </h2>
          <p className="text-xs text-zinc-500 mb-5">
            Convert your verified Green Certificates into tradeable market listings.
          </p>

          <form onSubmit={handleListCertificate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Select Certificate
              </label>
              <select
                value={selectedCertId}
                onChange={(e) => setSelectedCertId(e.target.value)}
                className="input-field w-full text-zinc-300"
                disabled={actionLoading}
              >
                <option value="">-- Choose Certificate --</option>
                {availableCertificates.map(c => (
                  <option key={c.id} value={c.id}>
                    ID: {c.id.slice(0, 8)}... ({c.carbonReduced} kg CO₂)
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
            </div>

            <button
              type="submit"
              disabled={actionLoading || !selectedCertId || !listingPrice}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              <span>{actionLoading ? 'Listing...' : 'List on Marketplace'}</span>
            </button>
          </form>
        </div>

        {/* Active Listings Grid */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-purple-400" /> Active Listings
          </h2>
          <p className="text-xs text-zinc-500 mb-5">
            Verified green assets currently offered for purchase by participants.
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
                      <span className="badge badge-purple font-mono text-xs">{l.carbonReduced} kg CO₂</span>
                    </div>
                    <p className="text-sm text-zinc-300 font-semibold mb-1">Seller: {l.sellerName}</p>
                    <p className="text-xs text-zinc-500">Listed: {formatDate(l.createdAt)}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                    <span className="text-lg font-bold text-white tabular-nums">{formatCurrency(l.price)}</span>
                    {l.sellerId === userId ? (
                      <button
                        onClick={() => handleCancelListing(l.id)}
                        disabled={actionLoading}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Cancel Listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyListing(l.id)}
                        disabled={actionLoading}
                        className="py-1.5 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Buy
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
                    <td className="font-semibold text-white text-xs">{t.carbonReduced} kg CO₂ Asset</td>
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
        {/* Index Price Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-sm font-semibold text-white mb-1">Carbon Index Price Tracker</h2>
          <p className="text-xs text-zinc-500 mb-5">Historical index pricing trend indicator</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={marketIndexData}>
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
                tickFormatter={(date) => {
                  if (typeof date === 'string') return date;
                  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis stroke="#52525b" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#a855f7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPriceDark)"
                name="Price"
                activeDot={{ r: 4, fill: '#a855f7', stroke: '#0a0a0f', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Market Summary Gauges */}
        <div className="glass-card p-6 h-fit">
          <h3 className="text-sm font-semibold text-white mb-5">Market Sentiment Indicator</h3>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">Market Sentiment</span>
                <span className="text-xs font-bold text-emerald-400">Bullish</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-emerald-500" style={{ width: '72%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">Trading Activity</span>
                <span className="text-xs font-bold text-blue-400">High</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill bg-blue-500" style={{ width: '85%' }} />
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-xs text-zinc-500 font-semibold mb-3">Carbon Market Insights</p>
              <ul className="space-y-2">
                {['Direct peer-to-peer certificate trades', 'Instant database verification', 'Automatic balance settlement', 'Cryptographic on-chain asset trace'].map((item) => (
                  <li key={item} className="text-xs text-zinc-400 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* News Intelligence */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Market Intelligence & Policy Updates</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newsEvents.slice(0, 2).map((event) => (
            <div key={event.id} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-4 mb-2">
                  <p className="text-sm font-semibold text-white">{event.title}</p>
                  <span className={`badge ${event.impact > 0 ? 'badge-green' : 'badge-red'} flex-shrink-0`}>
                    {event.impact > 0 ? '+' : ''}{event.impact} Index
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{event.description}</p>
              </div>
              <p className="text-[10px] text-zinc-600 mt-4">{formatDate(event.timestamp)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
