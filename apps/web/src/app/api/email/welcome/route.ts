import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';
import { auth } from '@/lib/auth';
import { checkDailyRateLimit } from '@/lib/rate-limit';
import * as Sentry from '@sentry/nextjs';

export async function POST(req: NextRequest) {
  try {
    // Require authenticated session
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limit: max 1 welcome email per user per day
    const allowed = await checkDailyRateLimit(`welcome-email:${session.user.id}`);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Welcome email already sent recently. Please try again later.' },
        { status: 429 }
      );
    }

    // Use session data only — never accept email/name from request body
    const email = session.user.email;
    const name = session.user.name || '';

    if (!email) {
      return NextResponse.json(
        { error: 'No email address associated with your account' },
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
