import { Resend } from 'resend';
import { DEMO_MODE } from '@/lib/demo-mode';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendWelcomeEmail(name: string, email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send welcome email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: `Welcome ${escapeHtml(name)}!`,
      html: `
        <h1>Welcome to our platform!</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>Thanks for signing up. We're excited to have you on board.</p>
        <p>Get started by logging into your dashboard.</p>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

export async function sendPaymentFailedEmail(email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send payment failed email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Payment Failed - Action Required',
      html: `
        <h1>Payment Failed</h1>
        <p>Hi,</p>
        <p>We tried to process your subscription payment but it failed.</p>
        <p>Please update your payment method in your account settings.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Update Payment Method</a>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
    throw error;
  }
}

export async function sendSubscriptionCanceledEmail(email: string) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send subscription canceled email to ${email}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Subscription Canceled',
      html: `
        <h1>Subscription Canceled</h1>
        <p>Hi,</p>
        <p>Your subscription has been canceled and will end at the next billing cycle.</p>
        <p>If you have any questions, please reach out to our support team.</p>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send subscription canceled email:', error);
    throw error;
  }
}

export async function sendTeamInviteEmail(
  inviterName: string,
  orgName: string,
  recipientEmail: string,
  signupUrl: string,
) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send team invite email to ${recipientEmail}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }
  try {
    const escapedInviter = escapeHtml(inviterName);
    const escapedOrg = escapeHtml(orgName);
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: recipientEmail,
      subject: `${escapedInviter} lädt dich zu ${escapedOrg} ein`,
      html: `
        <h1>Du wurdest eingeladen!</h1>
        <p>Hallo,</p>
        <p><strong>${escapedInviter}</strong> hat dich eingeladen, dem Team <strong>${escapedOrg}</strong> auf LogistikApp beizutreten.</p>
        <p>
          <a
            href="${signupUrl}"
            style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;"
          >
            Jetzt beitreten
          </a>
        </p>
        <p style="color:#999;font-size:12px;">Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send team invite email:', error);
    throw error;
  }
}

export async function sendAlertSummaryEmail(
  recipientName: string,
  recipientEmail: string,
  lowStockCount: number,
  maintenanceCount: number,
  orgName: string
) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send alert summary to ${recipientEmail}`);
    return { data: { id: 'demo-email-id' }, error: null };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.logistikapp.ch';
  const parts: string[] = [];
  if (lowStockCount > 0) {
    parts.push(`<li>${lowStockCount} Material${lowStockCount !== 1 ? 'ien' : ''} unter Meldebestand</li>`);
  }
  if (maintenanceCount > 0) {
    parts.push(`<li>${maintenanceCount} Werkzeug${maintenanceCount !== 1 ? 'e' : ''} mit fälliger Wartung</li>`);
  }

  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: recipientEmail,
      subject: `Logistik-Alarm: ${orgName} — Handlungsbedarf`,
      html: `
        <h2>Logistik-Alarm von LogistikApp</h2>
        <p>Hallo ${escapeHtml(recipientName)},</p>
        <p>Es gibt Handlungsbedarf in deiner Organisation <strong>${escapeHtml(orgName)}</strong>:</p>
        <ul>${parts.join('')}</ul>
        <p>
          <a href="${appUrl}/dashboard"
             style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
            Dashboard öffnen
          </a>
        </p>
        <p style="color:#999;font-size:12px;">
          Diese Benachrichtigung wird täglich um 07:00 Uhr CET verschickt,
          sofern Handlungsbedarf besteht. Du kannst die Einstellungen unter
          Einstellungen &rarr; Benachrichtigungen anpassen.
        </p>
      `,
    });
    return result;
  } catch (error) {
    console.error('Failed to send alert summary email:', error);
    throw error;
  }
}
