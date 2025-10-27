import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '../../../lib/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, tenantSlug } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    const result = await registerUser({ email, password, name, tenantSlug });

    if (!result) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário. Email já pode estar em uso.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      message: 'Usuário criado com sucesso',
      user: result.user,
    }, { status: 201 });

    // Definir cookie com o token
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}