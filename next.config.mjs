/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  serverExternalPackages: ['mqtt', 'viem'],
};

export default nextConfig;
