/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Proxy /uploads requests to the backend server
  // This allows images stored on the backend to be served through the frontend origin
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: '/commonassets/:path*',
        destination: `${backendUrl}/commonassets/:path*`,
      },
    ];
  },
}

module.exports = nextConfig




