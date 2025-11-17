/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@mui/x-charts']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}

module.exports = nextConfig