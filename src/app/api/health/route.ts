import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks: {
    timestamp: string;
    backend: string;
    database: string;
    prisma: string;
    env: {
      DATABASE_URL: string;
      BETTER_AUTH_SECRET: string;
      BETTER_AUTH_URL: string;
      NODE_ENV: string | undefined;
    };
    data?: {
      users: number;
      bookings: number;
      timeslots: number;
    };
  } = {
    timestamp: new Date().toISOString(),
    backend: 'ok',
    database: 'checking',
    prisma: 'checking',
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? '✓ configured' : '✗ missing',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? '✓ configured' : '✗ missing',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'not set',
      NODE_ENV: process.env.NODE_ENV,
    }
  };

  try {
    // Testa conexão com o banco
    await prisma.$queryRaw`SELECT 1`;
    checks.database = '✓ connected';
    
    // Testa se as tabelas existem e conta registros
    const [userCount, bookingCount, timeslotCount] = await Promise.all([
      prisma.user.count(),
      prisma.booking.count(),
      prisma.timeSlot.count(),
    ]);
    
    checks.prisma = `✓ working`;
    checks.data = {
      users: userCount,
      bookings: bookingCount,
      timeslots: timeslotCount,
    };
  } catch (error: unknown) {
    checks.database = '✗ error';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    checks.prisma = `✗ ${errorMessage}`;
    
    return NextResponse.json({
      ...checks,
      error: errorMessage,
      code: (error as { code?: string }).code,
      meta: (error as { meta?: unknown }).meta,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }

  return NextResponse.json(checks);
}
