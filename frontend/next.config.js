/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure Next.js can be accessed from external IPs
  output: 'standalone',
}

module.exports = nextConfig

