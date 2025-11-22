import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

export default nextConfig;
