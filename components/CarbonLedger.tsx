'use client';

import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertCircle, Plus, Link, Shield, Loader } from 'lucide-react';
import { BlockchainTransaction } from '../types/index';
import { formatDate, formatKilograms } from '../utils/formatters';
import { NFTViewer } from './NFTViewer';

interface CarbonLedgerProps {
  userId: string;
  token: string;
  userName: string;
}

export const CarbonLedger: React.FC<CarbonLedgerProps> = ({ userId, token }) => {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [chain, setChain] = useState<BlockchainTransaction[]>([]);
  const [chainValid, setChainValid] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all transactions
      const resTxs = await fetch(`${API_BASE}/blockchain/transactions`, { headers });
      let txList: BlockchainTransaction[] = [];
      if (resTxs.ok) {
        txList = await resTxs.json();
        setChain(txList);
        setTransactions([...txList].reverse());
      } else {
        setError('Failed to fetch blockchain ledger data.');
      }

      // Validate chain
      const resVal = await fetch(`${API_BASE}/blockchain/validate`, { headers });
      if (resVal.ok) {
        const valData = await resVal.json();
        setChainValid(valData.isValid);
      }
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setError('Connection error. Failed to load ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const addSampleTransaction = async () => {
    try {
      setActionLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };
      
      const res = await fetch(`${API_BASE}/blockchain/transaction`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.onchain?.success
          ? 'Estimated emissions for the latest PZEM interval were recorded in the ledger and attested on the local blockchain.'
          : 'Estimated emissions for the latest PZEM interval were recorded in the ledger; the on-chain attestation did not complete.');
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to record estimated emissions.');
      }
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Connection error. Failed to record transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalEmissionRecorded = chain
    .filter(t => t.type === 'EMISSION_RECORDED')
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm text-zinc-500 font-medium">Loading Carbon Ledger...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header" style={{ background: 'linear-gradient(135deg, rgba(22, 22, 29, 0.9) 0%, rgba(99, 102, 241, 0.08) 100%)', borderColor: 'rgba(99, 102, 241, 0.15)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Immutable Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Carbon Blockchain Ledger</h1>
          <p className="text-sm text-zinc-400 mt-1">Records estimated emissions for measured PZEM energy intervals; it does not certify avoided emissions.</p>
        </div>
      </div>

      {/* Error message */}
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

      {/* Chain Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-stagger">
        <div className="metric-card accent-indigo">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Blockchain Status</p>
              <p className="text-2xl font-bold text-white mt-2">{chainValid ? 'Valid' : 'Invalid'}</p>
              <p className="text-xs text-zinc-500 mt-1.5">Chain integrity: {chain.length} blocks</p>
            </div>
            <div className={`p-2.5 rounded-xl ${chainValid ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {chainValid ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>
        </div>

        <div className="metric-card accent-green">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Estimated Emissions</p>
              <p className="text-2xl font-bold text-white mt-2">{formatKilograms(totalEmissionRecorded)}</p>
              <p className="text-xs text-zinc-500 mt-1.5">Total CO₂ recorded</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction */}
      <button 
        onClick={addSampleTransaction} 
        disabled={actionLoading}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-zinc-500"
      >
        {actionLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Mining Block...</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>Record Latest PZEM Interval</span>
          </>
        )}
      </button>

      {/* Blockchain Info Box */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-3">How Blockchain Works</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Each transaction is cryptographically hashed and linked to the previous block, creating an immutable audit trail.
          This prevents tampering with carbon credit records.
        </p>
        <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] font-mono text-xs text-zinc-500">
          Hash = SHA256(ID + Type + Amount + PreviousHash + Nonce)
        </div>
      </div>

      {/* Transaction List */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="dark-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-zinc-500 py-8 text-sm">
                    No transactions found in the blockchain ledger.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <tr
                      className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => setShowDetails(showDetails === tx.id ? null : tx.id)}
                    >
                      <td>
                        <code className="text-xs px-2 py-1 rounded bg-white/[0.04] text-zinc-400 font-mono">
                          {tx.id.slice(0, 12)}...
                        </code>
                      </td>
                      <td>
                        <span className="text-xs text-zinc-300 font-medium">
                          {tx.userName || 'System'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge text-xs ${
                          tx.type === 'EMISSION_RECORDED' || tx.type === 'emission' ? 'badge-orange' :
                          tx.type === 'CREDIT_EARNED' || tx.type === 'credit' ? 'badge-green' :
                          'badge-blue'
                        }`}>
                          {(tx.type || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="font-semibold text-white tabular-nums">
                        {tx.type === 'EMISSION_RECORDED' || tx.type === 'emission'
                          ? `${tx.amount.toFixed(4)} kg CO₂e estimated emissions`
                          : `${tx.amount.toFixed(2)} app units`}
                      </td>
                      <td className="text-sm text-zinc-500">
                        {formatDate(tx.timestamp)}
                      </td>
                      <td>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </td>
                    </tr>
                    {showDetails === tx.id && (
                      <tr>
                        <td colSpan={6} className="!p-0">
                          <div className="px-6 py-4 bg-white/[0.02] border-t border-white/[0.04] space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-zinc-500 font-semibold mb-1">User / Initiator</p>
                                <p className="text-xs text-zinc-400 font-mono">{tx.userName || 'Unknown'} (ID: {tx.userId || 'N/A'})</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 font-semibold mb-1">Description</p>
                                <p className="text-xs text-zinc-300">
                                  {tx.description || `Transaction amount: ${tx.amount} (unit depends on transaction type)`}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 font-semibold mb-1">Full Transaction Hash</p>
                              <code className="text-xs text-zinc-400 break-all font-mono">{tx.hash}</code>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 font-semibold mb-1">Previous Block Hash</p>
                              <code className="text-xs text-zinc-400 break-all font-mono">{tx.previousHash}</code>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-zinc-500 font-semibold mb-1">Nonce</p>
                                <p className="text-xs text-zinc-400 font-mono">{tx.nonce}</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500 font-semibold mb-1">Verification</p>
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-xs text-emerald-400 font-semibold">Verified</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chain Visualization */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Blockchain Structure</h3>
        <div className="overflow-x-auto">
          {chain.length === 0 ? (
            <p className="text-xs text-zinc-500">No blocks to visualize</p>
          ) : (
            <div className="flex items-center gap-3 pb-2">
              {chain.slice(-5).map((block, idx, arr) => (
                <React.Fragment key={block.id}>
                  <div className="flex-shrink-0 min-w-[180px] p-4 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 hover:border-indigo-500/30 transition-colors">
                    <p className="text-xs font-bold text-indigo-400 uppercase mb-2">Block {block.id.slice(0, 8)}...</p>
                    <p className="text-xs text-zinc-500 break-all">
                      <span className="font-semibold text-zinc-400">Hash: </span>
                      {block.hash.slice(0, 16)}...
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      <span className="font-semibold text-zinc-400">User: </span>{block.userName || 'System'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      <span className="font-semibold text-zinc-400">Type: </span>{(block.type || '').replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      <span className="font-semibold text-zinc-400">Amount: </span>{block.amount.toFixed(2)} kg
                    </p>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="flex-shrink-0">
                      <Link className="w-4 h-4 text-indigo-500/40" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-stagger">
        <div className="glass-card p-6 text-center">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Total Transactions</p>
          <p className="text-3xl font-bold text-white mt-2 tabular-nums">{chain.length}</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Chain Integrity</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{chainValid ? '100%' : 'Compromised'}</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Last Block</p>
          <p className="text-sm text-zinc-400 mt-3">
            {formatDate(chain[chain.length - 1]?.timestamp || new Date())}
          </p>
        </div>
      </div>

      <NFTViewer userId={userId} token={token} embedded />
    </div>
  );
};
