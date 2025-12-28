import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Configuração necessária para Docker (standalone output)
  output: 'standalone',
  
  // Ignorar arquivos não usados no build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@lexical/react': false,
        '@lexical/link': false,
        '@lexical/utils': false,
        'lexical': false,
      };
    }
    return config;
  },

  async rewrites() {
    const rewrites = [
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

    // Configuração de subdomínios (apenas em produção)
    const adminSubdomain = process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN || "app";
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
    
    if (process.env.NODE_ENV === "production" && baseDomain) {
      return {
        beforeFiles: [
          {
            source: '/:path*',
            has: [{ type: 'host', value: `${adminSubdomain}.${baseDomain}` }],
            destination: '/dashboard/:path*',
          },
        ],
        afterFiles: rewrites,
      };
    }
    
    return rewrites;
  },
};

export default nextConfig;
