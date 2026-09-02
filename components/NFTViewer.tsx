'use client';

import React, { useState, useEffect } from 'react';
import { Award, Trophy, Zap, Plus, X, ExternalLink, Download, Share2, Shield, Wifi, WifiOff, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { GreenCertificate } from '../types/index';
import { formatDate } from '../utils/formatters';

interface NFTViewerProps {
  userId: string;
  token: string;
}

interface CarbonCredits {
  userId: string;
  available: number;
  verified: number;
  retired: number;
}

interface OnchainStatus {
  connected: boolean;
  network: string;
  chainId: number;
  contractAddress: string;
  explorerUrl: string;
  walletConfigured: boolean;
  blockNumber?: string;
  error?: string;
}

interface OnchainRecord {
  id: string;
  tokenId: string;
  transactionHash: string;
  chainId: number;
  contractAddress: string;
  status: string;
  timestamp: string;
  carbonRecordId?: string;
  carbonReduction: number;
}

export const NFTViewer: React.FC<NFTViewerProps> = ({ userId, token }) => {
  const [certificates, setCertificates] = useState<GreenCertificate[]>([]);
  const [credits, setCredits] = useState<CarbonCredits | null>(null);
  const [onchainRecords, setOnchainRecords] = useState<OnchainRecord[]>([]);
  const [selectedCert, setSelectedCert] = useState<GreenCertificate | null>(null);
  
  const [onchainStatus, setOnchainStatus] = useState<OnchainStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchNFTData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resCerts, resCredits, resRecords] = await Promise.all([
        fetch('/api/certificates', { headers }),
        fetch('/api/certificates/credits', { headers }),
        fetch('/api/onchain/records', { headers })
      ]);

      if (resCerts.ok) {
        setCertificates(await resCerts.json());
      }
      if (resCredits.ok) {
        setCredits(await resCredits.json());
      }
      if (resRecords.ok) {
        setOnchainRecords(await resRecords.json());
      }
    } catch (err) {
      console.error('Error fetching NFT/certificates data:', err);
      setError('Failed to connect to the certificates service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Fetch on-chain status
    fetch('/api/onchain/status')
      .then((r) => r.json())
      .then(setOnchainStatus)
      .catch(() => setOnchainStatus({ 
        connected: false, 
        network: 'Local Hardhat Node', 
        chainId: 31337, 
        contractAddress: '0x5fbdb2315678afecb367f032d93f642f64180aa3', 
        explorerUrl: '', 
        walletConfigured: false, 
        error: 'Could not reach blockchain API' 
      }))
      .finally(() => setStatusLoading(false));

    // 2. Fetch data from DB
    fetchNFTData();
  }, [token]);

  const handleIssueCertificate = async (record: OnchainRecord) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          carbonReduced: record.carbonReduction,
          tokenId: record.tokenId,
          blockchainTxn: record.transactionHash
        })
      });

      if (res.ok) {
        setSuccess(`Green Certificate issued successfully for Token ID: ${record.tokenId}!`);
        await fetchNFTData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to issue certificate.');
      }
    } catch (err) {
      setError('Failed to connect to the certificates service.');
    } finally {
      setActionLoading(false);
    }
  };

  const getNFTGrade = (carbonReduced: number): string => {
    if (carbonReduced > 150) return 'PLATINUM';
    if (carbonReduced > 100) return 'GOLD';
    if (carbonReduced > 75) return 'SILVER';
    return 'BRONZE';
  };

  const getGradeAccent = (grade: string) => {
    switch (grade) {
      case 'PLATINUM': return { gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20', text: 'text-blue-400', bg: 'bg-blue-500/10', icon: 'from-blue-400 to-cyan-400' };
      case 'GOLD': return { gradient: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/20', text: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: 'from-yellow-400 to-amber-400' };
      case 'SILVER': return { gradient: 'from-zinc-400/20 to-zinc-500/20', border: 'border-zinc-400/20', text: 'text-zinc-300', bg: 'bg-zinc-500/10', icon: 'from-zinc-300 to-zinc-400' };
      case 'BRONZE': return { gradient: 'from-orange-500/20 to-amber-600/20', border: 'border-orange-500/20', text: 'text-orange-400', bg: 'bg-orange-500/10', icon: 'from-orange-400 to-amber-500' };
      default: return { gradient: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: 'from-emerald-400 to-green-400' };
    }
  };

  const getColorByGrade = (grade: string): string => {
    switch (grade) {
      case 'PLATINUM': return '#3b82f6';
      case 'GOLD': return '#facc15';
      case 'SILVER': return '#9ca3af';
      case 'BRONZE': return '#f97316';
      default: return '#22c55e';
    }
  };

  // Filter records that have status = 'verified' and are not already certified
  const pendingCertRecords = onchainRecords.filter(
    record => record.status === 'verified' && !certificates.some(c => c.tokenId === record.tokenId)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-sm text-zinc-500 font-medium">Loading Green Certificates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-accent-400" />
            <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider">Digital Credentials</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Green Certificates</h1>
          <p className="text-sm text-zinc-400 mt-1">Verified carbon reduction credentials & digital badges</p>
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

      {/* On-Chain Status Panel */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusLoading ? (
              <Loader className="w-4 h-4 animate-spin text-zinc-400" />
            ) : onchainStatus?.connected ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm font-semibold text-white">
              {statusLoading ? 'Checking Network...' : onchainStatus?.connected ? 'Local Hardhat Node Connected' : 'Local Node Offline'}
            </span>
            {onchainStatus?.connected && (
              <span className="badge badge-green text-xs">Active</span>
            )}
          </div>
          {onchainStatus?.blockNumber && (
            <span className="text-xs text-zinc-500 font-mono">Block #{parseInt(onchainStatus.blockNumber).toLocaleString()}</span>
          )}
        </div>

        {onchainStatus && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-zinc-500 font-semibold uppercase tracking-wider mb-1">Contract Address</p>
              <code className="text-indigo-400 font-mono break-all">
                {onchainStatus.contractAddress || 'Not configured'}
              </code>
            </div>
            <div>
              <p className="text-zinc-500 font-semibold uppercase tracking-wider mb-1">Local Network</p>
              <p className="text-zinc-300">{onchainStatus.network} (Chain {onchainStatus.chainId})</p>
            </div>
            <div>
              <p className="text-zinc-500 font-semibold uppercase tracking-wider mb-1">Server Wallet Status</p>
              <p className={onchainStatus.walletConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                {onchainStatus.walletConfigured ? '✓ Configured' : '⚠ Read-only'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Credits Summary */}
      {credits && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-stagger">
          <div className="metric-card accent-green">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Verified Credits</p>
                <p className="text-3xl font-bold text-white mt-2 tabular-nums">{credits.verified.toLocaleString()}</p>
                <p className="text-xs text-zinc-500 mt-1.5">Cumulative earned credits</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="metric-card accent-blue">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Available Credits</p>
                <p className="text-3xl font-bold text-white mt-2 tabular-nums">{credits.available.toLocaleString()}</p>
                <p className="text-xs text-zinc-500 mt-1.5">Ready for trading / listing</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="metric-card accent-purple">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Certificates Earned</p>
                <p className="text-3xl font-bold text-white mt-2 tabular-nums">{certificates.length}</p>
                <p className="text-xs text-zinc-500 mt-1.5">Green Certificate credentials</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <Trophy className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Blockchain Verifications Panel */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-400" /> Pending Blockchain Verifications
        </h2>
        <p className="text-xs text-zinc-500 mb-5">
          Issue Green Certificate digital credentials for your verified on-chain carbon reduction records.
        </p>

        {pendingCertRecords.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-white/[0.08] rounded-xl text-zinc-500 text-xs">
            No pending on-chain verifications found. Go to "Blockchain Ledger" to record real emission data!
          </div>
        ) : (
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {pendingCertRecords.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Token ID: {r.tokenId}</span>
                    <span className="badge badge-green text-[10px] font-mono">{r.carbonReduction} kg CO₂</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono break-all">Tx: {r.transactionHash}</p>
                </div>
                <button
                  onClick={() => handleIssueCertificate(r)}
                  disabled={actionLoading}
                  className="py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Issue Certificate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NFT Grid */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Your Green Certificate Collection</h2>
        {certificates.length === 0 ? (
          <div className="glass-card p-12 text-center border-2 border-dashed border-white/[0.08]">
            <Award className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No certificates yet. Start earning by reducing your carbon emissions!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {certificates.map((cert) => {
              const grade = getNFTGrade(cert.carbonReduced);
              const accent = getGradeAccent(grade);
              return (
                <div
                  key={cert.id}
                  onClick={() => setSelectedCert(selectedCert?.id === cert.id ? null : cert)}
                  className={`cursor-pointer group rounded-xl overflow-hidden border ${accent.border} hover:border-opacity-60 transition-all duration-300 hover:-translate-y-1`}
                  style={{ background: 'rgba(22, 22, 29, 0.7)' }}
                >
                  {/* NFT Badge Visual */}
                  <div className={`h-36 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br ${accent.gradient}`}>
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                      backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                      backgroundSize: '16px 16px'
                    }} />
                    <Trophy className={`w-12 h-12 mb-2 relative z-10 bg-gradient-to-br ${accent.icon} bg-clip-text`} style={{ color: getColorByGrade(grade) }} />
                    <p className={`text-xs font-bold relative z-10 tracking-wider ${accent.text}`}>{grade}</p>
                  </div>

                  {/* Certificate Details */}
                  <div className="p-4">
                    <p className="text-xs text-zinc-600 font-mono mb-1.5">ID: {cert.id.slice(0, 16)}...</p>
                    <p className="text-sm font-semibold text-white mb-2">
                      {cert.carbonReduced} kg CO₂ Reduced
                    </p>
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                      <span>Issued: {formatDate(cert.dateIssued)}</span>
                      {cert.verified && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Shield className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 font-mono break-all">
                      Token ID: {cert.tokenId}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificate Details Modal */}
      {selectedCert && (() => {
        const grade = getNFTGrade(selectedCert.carbonReduced);
        const accent = getGradeAccent(grade);
        return (
          <div className="glass-card p-8" style={{ borderLeft: `3px solid ${getColorByGrade(grade)}` }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Green Certificate Details</h3>
                <p className="text-sm text-zinc-500 mt-1">On-chain authenticated credential</p>
              </div>
              <button
                onClick={() => setSelectedCert(null)}
                className="p-2 rounded-lg hover:bg-white/[0.05] text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Certificate ID</p>
                  <p className="font-mono text-sm text-zinc-300 break-all mt-1">{selectedCert.id}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Carbon Reduced</p>
                  <p className="text-3xl font-bold text-white mt-1">{selectedCert.carbonReduced} <span className="text-lg text-zinc-500">kg</span></p>
                  <p className="text-xs text-zinc-500">CO₂ Equivalent</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Grade</p>
                  <span className={`badge ${
                    grade === 'PLATINUM' ? 'badge-blue' :
                    grade === 'GOLD' ? 'badge-amber' :
                    grade === 'SILVER' ? 'badge-blue' :
                    'badge-orange'
                  }`}>
                    {grade}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Token ID (Local Blockchain)</p>
                  <p className="font-mono text-xs text-zinc-400 break-all mt-1">{selectedCert.tokenId}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Issued Date</p>
                  <p className="text-sm text-zinc-300 mt-1">{formatDate(selectedCert.dateIssued)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">Status</p>
                  {selectedCert.verified && (
                    <div className="flex items-center gap-2">
                      <div className="glow-indicator bg-emerald-500" style={{ width: 6, height: 6 }} />
                      <span className="text-sm text-emerald-400 font-semibold">Verified on Blockchain</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Blockchain Verification Details */}
            {selectedCert.blockchainTxn && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">On-Chain Evidence Audit</p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  This certificate represents a cryptographically verified energy reduction recorded on the local node.
                  Its integrity is protected by block consensus.
                </p>
                <p className="text-xs font-mono text-zinc-500 mt-2 break-all">
                  Transaction Hash: {selectedCert.blockchainTxn}
                </p>
              </div>
            )}

            {/* Share & Export */}
            <div className="mt-6 flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-sm font-medium text-zinc-300 transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/15 hover:bg-emerald-500/15 text-sm font-medium text-emerald-400 transition-colors">
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        );
      })()}

      {/* Tiers overview */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Certificate Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'BRONZE', range: '< 75 kg CO₂', sub: 'Entry level', accent: getGradeAccent('BRONZE') },
            { label: 'SILVER', range: '75–100 kg CO₂', sub: 'Intermediate', accent: getGradeAccent('SILVER') },
            { label: 'GOLD', range: '100–150 kg CO₂', sub: 'Advanced', accent: getGradeAccent('GOLD') },
            { label: 'PLATINUM', range: '> 150 kg CO₂', sub: 'Elite', accent: getGradeAccent('PLATINUM') },
          ].map(({ label, range, sub, accent }) => (
            <div key={label} className={`text-center p-4 rounded-xl bg-gradient-to-br ${accent.gradient} border ${accent.border}`}>
              <p className={`text-sm font-bold ${accent.text}`}>{label}</p>
              <p className="text-xs text-zinc-400 mt-2">{range}</p>
              <p className="text-xs text-zinc-600 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
