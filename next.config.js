import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const projectRoot = dirname(fileURLToPath(import.meta.url))

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: projectRoot,
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  serverExternalPackages: ['firebase-admin'],
  allowedDevOrigins: ['10.112.183.165'],
}

export default nextConfig

