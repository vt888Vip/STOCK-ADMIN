/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tải các biến môi trường từ .env.local
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  // Bảo vệ thông tin nhạy cảm trong biến môi trường
  serverRuntimeConfig: {
    // Chỉ có ở phía server
    mongodbUri: process.env.MONGODB_URI,
    nextauthSecret: process.env.NEXTAUTH_SECRET,
  },
  publicRuntimeConfig: {
    // Có thể truy cập từ cả client và server
    nextauthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  // Cho phép truy cập cross-origin từ ngrok và các địa chỉ IP local
  experimental: {
    allowedDevOrigins: ["localhost", "192.168.1.4", "*"]
  },
  reactStrictMode: true,
  // Configuration from next.config.mjs
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Đảm bảo React được tải trước
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: 'react',
        'react-dom': 'react-dom',
      };
    }
    return config;
  },
  // Local development configuration
  // Removed external API rewrites for local-only setup
};

export default nextConfig;
