import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import * as Sentry from '@sentry/nextjs';
import { DEMO_MODE } from '@/lib/demo-mode';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ success: true });
  }

  try {
    // Require authenticated session
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limit per user
    const allowed = await checkRateLimit(`welcome-email:${session.user.id}`);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { name, email } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    await sendWelcomeEmail(name, email);

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: '/api/email/welcome' },
    });

    console.error('Welcome email failed:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}
