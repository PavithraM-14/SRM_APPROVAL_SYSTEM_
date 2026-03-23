/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
    instrumentationHook: true,
  },
}

module.exports = nextConfig