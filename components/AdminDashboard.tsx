'use client';

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Zap, Link2, AlertCircle, Loader } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalEnergyUsed: number;
  averageEnergyPerUser: number;
  totalBlockchainTransactions: number;
  totalReadings: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  totalEnergyUsed: number;
  totalReadings: number;
}

interface AdminTransaction {
  id: string;
  userName: string;
  type: string;
  amount: number;
  hash: string;
}

export default function AdminDashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch statistics
      const statsRes = await fetch(`${API_BASE}/admin/statistics`, { headers });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      // Fetch users
      const usersRes = await fetch(`${API_BASE}/admin/users`, { headers });
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }

      // Fetch blockchain
      const blockchainRes = await fetch(`${API_BASE}/admin/blockchain`, { headers });
      if (blockchainRes.ok) {
        setTransactions(await blockchainRes.json());
      }
    } catch (err) {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-6">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">Platform overview and user management</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 px-6 flex gap-8">
        {['overview', 'users', 'blockchain'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-4 font-medium text-sm transition-colors border-b-2 ${
              activeTab === tab
                ? 'text-emerald-500 border-emerald-500'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Total Users</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-emerald-500 opacity-20" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Total Energy Used</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.totalEnergyUsed.toFixed(2)} kWh</p>
                  </div>
                  <Zap className="w-8 h-8 text-emerald-500 opacity-20" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Avg Per User</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.averageEnergyPerUser.toFixed(2)} kWh</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-500 opacity-20" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Blockchain Txs</p>
                    <p className="text-3xl font-bold text-white mt-2">{stats.totalBlockchainTransactions}</p>
                  </div>
                  <Link2 className="w-8 h-8 text-emerald-500 opacity-20" />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Platform Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400">Total Readings</span>
                  <span className="text-white font-medium">{stats.totalReadings}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Status</span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Energy Used
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Readings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{user.name}</p>
                            <p className="text-slate-400 text-xs">{user.role}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">{user.email}</td>
                        <td className="px-6 py-4 text-white font-medium">{user.totalEnergyUsed.toFixed(2)} kWh</td>
                        <td className="px-6 py-4 text-slate-300">{user.totalReadings}</td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Blockchain Tab */}
        {activeTab === 'blockchain' && (
          <div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        Hash (First 16 chars)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.slice(0, 20).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800 transition-colors">
                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">{tx.id.slice(0, 12)}...</td>
                        <td className="px-6 py-4 text-white font-medium">{tx.userName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            tx.type === 'emission'
                              ? 'bg-red-500 bg-opacity-20 text-red-400'
                              : 'bg-emerald-500 bg-opacity-20 text-emerald-400'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white">{tx.amount}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">{tx.hash.slice(0, 16)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
