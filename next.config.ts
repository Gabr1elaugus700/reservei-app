import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['http://localhost:3000', '192.168.0.32:3000'],
  
  async rewrites() {
    return [
      // Rotas de Authentication
      { source: '/auth', destination: '/auth' },
      { source: '/signin', destination: '/auth/signin' },
      { source: '/signup', destination: '/auth/signup' },

      {
        source: '/capacity',
        destination: '/features/booking/Capacity',
      },
      {
        source: '/bookings',
        destination: '/features/booking/Bookings-list',
      },
      {
        source: '/signin',
        destination: '/features/booking/auth/signin',
      },
      {
        source: '/signup',
        destination: '/features/booking/auth/signup',
      },
      {
        source: '/bookings-list',
        destination: '/features/booking/Bookings-list',
      },
      {
        source: '/signin',
        destination: '/features/booking/auth/signin',
      }
    ];
  },
};

export default nextConfig;
