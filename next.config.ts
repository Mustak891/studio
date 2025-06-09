
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'th.bing.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Added for Google User profile images
        port: '',
        pathname: '/**',
      }
    ],
  },
  allowedDevOrigins: ['https://9000-firebase-studio-1749438806929.cluster-nzwlpk54dvagsxetkvxzbvslyi.cloudworkstations.dev'],
  // The experimental block is removed as allowedDevOrigins was its only key.
  // If there were other experimental flags, they would remain here.
};

export default nextConfig;
