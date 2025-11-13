import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  async rewrites() {
    return [
      // Rotas de Authentication
      { source: '/auth', destination: '/auth' },
      { source: '/signin', destination: '/features/booking/auth/signin' },
      { source: '/signup', destination: '/features/booking/auth/signup' },

      {
        source: '/capacity',
        destination: '/features/booking/Capacity',
      },
      {
        source: '/bookings',
        destination: '/features/booking/Bookings-list',
      },
      {
        source: '/bookings-list',
        destination: '/features/booking/Bookings-list',
      },
      {
        source: '/dashboard',
        destination: '/features/booking',
      }
    ];
  },
};

export default nextConfig;
