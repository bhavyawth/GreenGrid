'use client';

import React, { useEffect, useState } from 'react';
import { Zap, AlertCircle, Loader } from 'lucide-react';
import { User } from './AuthContext';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
  initialMode?: 'login' | 'register';
}

export default function Login({ onLoginSuccess, initialMode = 'login' }: LoginProps) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    setIsLogin(initialMode !== 'register');
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin
        ? { email, password }
        : { email, password, name };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred');
        return;
      }

      // Save token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(isLogin ? 'Login successful!' : 'Account created! Logging in...');
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
      }, 500);
    } catch (err) {
      setError('Connection error. Make sure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-small opacity-10" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-8 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <Zap className="w-8 h-8 text-emerald-500 mr-3" />
            <h1 className="text-2xl font-bold text-white">CarbonCredit.AI</h1>
          </div>

          {/* Subtitle */}
          <p className="text-slate-400 text-center text-sm mb-8">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (register only) */}
            {!isLogin && (
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  required={!isLogin}
                />
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            {/* Password field */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="bg-emerald-500 bg-opacity-10 border border-emerald-500 border-opacity-30 rounded-lg p-3">
                <p className="text-emerald-400 text-sm">{success}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Toggle between login and register */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="ml-2 text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Test credentials */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-slate-500 text-xs text-center mb-2">Demo Credentials:</p>
            <div className="bg-slate-800 bg-opacity-50 rounded p-3 text-slate-400 text-xs space-y-2">
              <p><span className="text-emerald-400 font-medium">User 1:</span> user1@example.com / demo123</p>
              <p><span className="text-emerald-400 font-medium">User 2:</span> user2@example.com / demo123</p>
              <p><span className="text-emerald-400 font-medium">Admin:</span> admin@example.com / admin123</p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for grid background */}
      <style>{`
        .bg-grid-small {
          background-image: 
            linear-gradient(90deg, rgba(226, 232, 240, 0.1) 1px, transparent 1px),
            linear-gradient(rgba(226, 232, 240, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
