import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks = {
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
    
    // Testa se as tabelas existem
    const userCount = await prisma.user.count();
    checks.prisma = `✓ working (${userCount} users)`;
  } catch (error: unknown) {
    checks.database = '✗ error';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    checks.prisma = `✗ ${errorMessage}`;
    
    return NextResponse.json({
      ...checks,
      error: errorMessage,
      code: (error as { code?: string }).code,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }

  return NextResponse.json(checks);
}
