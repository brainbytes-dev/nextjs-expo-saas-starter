import { Resend } from 'resend';

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

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------
const BRAND = {
  green: '#236B56',
  amber: '#D97706',
  name: 'Zentory',
  domain: 'zentory.ch',
  year: '2026',
} as const;

/** Wraps email body content in a branded layout with header and footer. */
function brandedHtml(bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:${BRAND.green};padding:24px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">ZEN</span><span style="color:#ffffff;font-size:22px;font-weight:300;letter-spacing:2px;">TORY</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              &copy; ${BRAND.year} ${BRAND.name} &middot;
              <a href="https://${BRAND.domain}" style="color:#9ca3af;text-decoration:underline;">${BRAND.domain}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Primary (green) button */
function primaryButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.green};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">${label}</a>`;
}

/** Secondary / CTA (amber) button */
function secondaryButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.amber};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">${label}</a>`;
}

const S = {
  h2: 'color:#1f2937;font-size:20px;font-weight:700;margin:0 0 16px;',
  p: 'color:#4b5563;font-size:15px;line-height:24px;margin:0 0 12px;',
  muted: 'color:#9ca3af;font-size:12px;margin:16px 0 0;',
  center: 'text-align:center;margin:24px 0;',
} as const;

// ---------------------------------------------------------------------------
// Email senders
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(name: string, email: string) {
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: `Willkommen bei Zentory, ${escapeHtml(name)}!`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Willkommen bei Zentory!</h2>
        <p style="${S.p}">Hallo ${escapeHtml(name)},</p>
        <p style="${S.p}">Vielen Dank f&uuml;r deine Registrierung. Wir freuen uns, dich an Bord zu haben.</p>
        <p style="${S.p}">Starte jetzt mit deinem Dashboard.</p>
        <div style="${S.center}">
          ${primaryButton('Zum Dashboard', `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.zentory.ch'}/dashboard`)}
        </div>
      `),
    });
    return result;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

export async function sendPaymentFailedEmail(email: string) {
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Zahlung fehlgeschlagen — Handlungsbedarf',
      html: brandedHtml(`
        <h2 style="${S.h2}">Zahlung fehlgeschlagen</h2>
        <p style="${S.p}">Hallo,</p>
        <p style="${S.p}">Wir konnten deine Abo-Zahlung nicht verarbeiten. Bitte aktualisiere deine Zahlungsmethode, damit dein Abo aktiv bleibt.</p>
        <div style="${S.center}">
          ${secondaryButton('Zahlungsmethode aktualisieren', `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.zentory.ch'}/dashboard/billing`)}
        </div>
      `),
    });
    return result;
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
    throw error;
  }
}

export async function sendSubscriptionCanceledEmail(email: string) {
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Abo gek\u00fcndigt',
      html: brandedHtml(`
        <h2 style="${S.h2}">Abo gek&uuml;ndigt</h2>
        <p style="${S.p}">Hallo,</p>
        <p style="${S.p}">Dein Abo wurde gek&uuml;ndigt und endet zum n&auml;chsten Abrechnungszeitraum.</p>
        <p style="${S.p}">Falls du Fragen hast, wende dich gerne an unser Support-Team.</p>
      `),
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
  try {
    const escapedInviter = escapeHtml(inviterName);
    const escapedOrg = escapeHtml(orgName);
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: recipientEmail,
      subject: `${escapedInviter} l\u00e4dt dich zu ${escapedOrg} ein`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Du wurdest eingeladen!</h2>
        <p style="${S.p}">Hallo,</p>
        <p style="${S.p}"><strong>${escapedInviter}</strong> hat dich eingeladen, dem Team <strong>${escapedOrg}</strong> auf Zentory beizutreten.</p>
        <div style="${S.center}">
          ${primaryButton('Jetzt beitreten', signupUrl)}
        </div>
        <p style="${S.muted}">Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>
      `),
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
  orgName: string,
  expiryCount = 0
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  const parts: string[] = [];
  if (lowStockCount > 0) {
    parts.push(`<li>${lowStockCount} Material${lowStockCount !== 1 ? 'ien' : ''} unter Meldebestand</li>`);
  }
  if (maintenanceCount > 0) {
    parts.push(`<li>${maintenanceCount} Werkzeug${maintenanceCount !== 1 ? 'e' : ''} mit f&auml;lliger Wartung</li>`);
  }
  if (expiryCount > 0) {
    parts.push(`<li>${expiryCount} Versicherung${expiryCount !== 1 ? 'en' : ''}/Garantie${expiryCount !== 1 ? 'n' : ''} laufen demn&auml;chst ab</li>`);
  }

  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: recipientEmail,
      subject: `Logistik-Alarm: ${orgName} — Handlungsbedarf`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Logistik-Alarm</h2>
        <p style="${S.p}">Hallo ${escapeHtml(recipientName)},</p>
        <p style="${S.p}">Es gibt Handlungsbedarf in deiner Organisation <strong>${escapeHtml(orgName)}</strong>:</p>
        <ul style="color:#4b5563;font-size:15px;line-height:28px;margin:0 0 16px;padding-left:20px;">${parts.join('')}</ul>
        <div style="${S.center}">
          ${secondaryButton('Dashboard &ouml;ffnen', `${appUrl}/dashboard`)}
        </div>
        <p style="${S.muted}">
          Diese Benachrichtigung wird t&auml;glich um 07:00 Uhr CET verschickt,
          sofern Handlungsbedarf besteht.
        </p>
      `),
    });
    return result;
  } catch (error) {
    console.error('Failed to send alert summary email:', error);
    throw error;
  }
}

export async function sendMentionNotification(
  mentionedUserEmail: string,
  mentionerName: string,
  entityType: string,
  entityId: string,
  commentBody: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  const entityPath = entityType === 'material'
    ? `materials/${entityId}`
    : entityType === 'tool'
      ? `tools/${entityId}`
      : `${entityType}s/${entityId}`;
  const entityUrl = `${appUrl}/dashboard/${entityPath}`;

  const truncatedBody = commentBody.length > 200
    ? `${commentBody.slice(0, 200)}…`
    : commentBody;

  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: mentionedUserEmail,
      subject: `${escapeHtml(mentionerName)} hat dich in einem Kommentar erw\u00e4hnt`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Du wurdest erw&auml;hnt</h2>
        <p style="${S.p}">Hallo,</p>
        <p style="${S.p}"><strong>${escapeHtml(mentionerName)}</strong> hat dich in einem Kommentar erw&auml;hnt:</p>
        <blockquote style="border-left:3px solid ${BRAND.green};margin:16px 0;padding:8px 16px;color:#4b5563;font-style:italic;">
          ${escapeHtml(truncatedBody)}
        </blockquote>
        <div style="${S.center}">
          ${primaryButton('Kommentar ansehen', entityUrl)}
        </div>
        <p style="${S.muted}">
          Falls du diese Benachrichtigung nicht erwartet hast, kannst du diese E-Mail ignorieren.
        </p>
      `),
    });
    return result;
  } catch (error) {
    console.error('Failed to send mention notification email:', error);
    throw error;
  }
}

export async function sendApprovalRequestEmail(
  adminName: string,
  adminEmail: string,
  requesterName: string,
  requestType: string,
  entityType: string,
  entityId: string,
  approvalId: string // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  const approvalsUrl = `${appUrl}/dashboard/approvals`;
  const requestTypeLabel = requestType === 'tool_checkout'
    ? 'Werkzeug-Ausleihe'
    : requestType === 'order'
      ? 'Bestellung'
      : requestType;

  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: adminEmail,
      subject: `Genehmigung ausstehend: ${requestTypeLabel} von ${escapeHtml(requesterName)}`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Neue Genehmigungsanfrage</h2>
        <p style="${S.p}">Hallo ${escapeHtml(adminName)},</p>
        <p style="${S.p}"><strong>${escapeHtml(requesterName)}</strong> hat eine ${requestTypeLabel} beantragt, die deine Genehmigung ben&ouml;tigt.</p>
        <ul style="color:#4b5563;font-size:15px;line-height:28px;margin:0 0 16px;padding-left:20px;">
          <li><strong>Typ:</strong> ${requestTypeLabel}</li>
          <li><strong>Objekt:</strong> ${escapeHtml(entityType)} / ${escapeHtml(entityId)}</li>
        </ul>
        <div style="${S.center}">
          ${secondaryButton('Genehmigungen ansehen', approvalsUrl)}
        </div>
        <p style="${S.muted}">
          Melde dich im Dashboard an, um die Anfrage zu genehmigen oder abzulehnen.
        </p>
      `),
    });
    return result;
  } catch (error) {
    console.error('Failed to send approval request email:', error);
    throw error;
  }
}

export async function sendApprovalDecisionEmail(
  requesterName: string,
  requesterEmail: string,
  approverName: string,
  requestType: string,
  status: 'approved' | 'rejected'
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  const requestTypeLabel = requestType === 'tool_checkout'
    ? 'Werkzeug-Ausleihe'
    : requestType === 'order'
      ? 'Bestellung'
      : requestType;
  const statusLabel = status === 'approved' ? 'genehmigt' : 'abgelehnt';
  const statusColor = status === 'approved' ? '#16a34a' : '#dc2626';

  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: requesterEmail,
      subject: `Deine ${requestTypeLabel} wurde ${statusLabel}`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Genehmigungsentscheidung</h2>
        <p style="${S.p}">Hallo ${escapeHtml(requesterName)},</p>
        <p style="${S.p}">
          Deine Anfrage f&uuml;r eine <strong>${requestTypeLabel}</strong> wurde von
          <strong>${escapeHtml(approverName)}</strong>
          <span style="color:${statusColor};font-weight:bold;">${statusLabel}</span>.
        </p>
        <div style="${S.center}">
          ${primaryButton('Zum Dashboard', `${appUrl}/dashboard`)}
        </div>
      `),
    });
    return result;
  } catch (error) {
    console.error('Failed to send approval decision email:', error);
    throw error;
  }
}

export async function sendShiftReportEmail({
  recipients,
  orgName,
  date,
  totalStockChanges,
  totalToolBookings,
  totalCommissions,
}: {
  recipients: string[]
  orgName: string
  date: string
  totalStockChanges: number
  totalToolBookings: number
  totalCommissions: number
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  const fmtDate = new Date(date).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: recipients,
      subject: `Schicht-\u00dcbergabe-Bericht — ${orgName} — ${fmtDate}`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Schicht-&Uuml;bergabe-Bericht &mdash; ${escapeHtml(orgName)}</h2>
        <p style="${S.p}">Hallo,</p>
        <p style="${S.p}">Hier ist die automatische Zusammenfassung f&uuml;r <strong>${fmtDate}</strong>:</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:24px;">
          <tr>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;">Lagerbewegungen</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold;text-align:right;color:#1f2937;">${totalStockChanges}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;">Werkzeug-Buchungen</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold;text-align:right;color:#1f2937;">${totalToolBookings}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;">Lieferscheine aktualisiert</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold;text-align:right;color:#1f2937;">${totalCommissions}</td>
          </tr>
        </table>
        <div style="${S.center}">
          ${primaryButton('Vollst&auml;ndigen Bericht ansehen', `${appUrl}/dashboard/reports/shift?date=${date}`)}
        </div>
        <p style="${S.muted}">
          Dieser Bericht wird t&auml;glich um 17:00 Uhr CET automatisch versandt.
        </p>
      `),
    });
    return result;
  } catch (error) {
    console.error('Failed to send shift report email:', error);
    throw error;
  }
}

export async function sendAutoReorderEmail({
  ownerEmail,
  ownerName,
  ordersCreated,
  itemsOrdered,
  details,
  skipped,
}: {
  ownerEmail: string
  ownerName: string
  ordersCreated: number
  itemsOrdered: number
  details: Array<{ materialName: string; quantity: number; unitPrice: number; supplierName: string }>
  skipped: Array<{ materialName: string; reason: string }>
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  const itemRows = details
    .map(
      (d) =>
        `<tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151;">${escapeHtml(d.materialName)}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;color:#1f2937;">${d.quantity}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;color:#1f2937;">CHF ${(d.unitPrice / 100).toFixed(2)}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151;">${escapeHtml(d.supplierName)}</td>
        </tr>`
    )
    .join('');

  const skippedSection =
    skipped.length > 0
      ? `<p style="${S.p}"><strong>Nicht bestellbar (${skipped.length}):</strong></p>
         <ul style="color:#4b5563;font-size:14px;line-height:24px;margin:0 0 16px;padding-left:20px;">
           ${skipped.map((s) => `<li>${escapeHtml(s.materialName)}: ${escapeHtml(s.reason)}</li>`).join('')}
         </ul>`
      : '';

  try {
    return await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@zentory.ch',
      to: ownerEmail,
      subject: `Auto-Nachbestellung: ${ordersCreated} Bestellung${ordersCreated !== 1 ? 'en' : ''} erstellt`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Auto-Nachbestellung</h2>
        <p style="${S.p}">Hallo ${escapeHtml(ownerName)},</p>
        <p style="${S.p}">
          Die automatische Nachbestellung hat heute <strong>${ordersCreated} Bestellung${ordersCreated !== 1 ? 'en' : ''}</strong>
          mit <strong>${itemsOrdered} Position${itemsOrdered !== 1 ? 'en' : ''}</strong> erstellt.
        </p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;color:#374151;">Material</th>
              <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;color:#374151;">Menge</th>
              <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;color:#374151;">Einzelpreis</th>
              <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;color:#374151;">Lieferant</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        ${skippedSection}
        <div style="${S.center}">
          ${primaryButton('Bestellungen ansehen', `${appUrl}/dashboard/orders`)}
        </div>
        <p style="${S.muted}">Diese E-Mail wird automatisch versandt, wenn der Auto-Nachbestellungs-Cron ausgef&uuml;hrt wird.</p>
      `),
    });
  } catch (error) {
    console.error('Failed to send auto-reorder email:', error);
    throw error;
  }
}

export async function sendAnomalyAlertEmail({
  ownerEmail,
  ownerName,
  orgName,
  highCount,
  anomalyDescriptions,
}: {
  ownerEmail: string
  ownerName: string
  orgName: string
  highCount: number
  anomalyDescriptions: string[]
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  const visibleItems = anomalyDescriptions.slice(0, 5);
  const moreCount = anomalyDescriptions.length > 5 ? anomalyDescriptions.length - 5 : 0;

  const listItems = visibleItems
    .map((desc) => `<li style="margin-bottom:8px;">${escapeHtml(desc)}</li>`)
    .join('');

  const moreNote = moreCount > 0
    ? `<p style="${S.muted}">... und ${moreCount} weitere Anomali${moreCount !== 1 ? 'en' : 'e'}.</p>`
    : '';

  try {
    return await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@zentory.ch',
      to: ownerEmail,
      subject: `Anomalie-Alarm: ${highCount} kritische Bewegung${highCount !== 1 ? 'en' : ''} erkannt \u2014 ${orgName}`,
      html: brandedHtml(`
        <h2 style="color:#dc2626;font-size:20px;font-weight:700;margin:0 0 16px;">Anomalie-Alarm</h2>
        <p style="${S.p}">Hallo ${escapeHtml(ownerName)},</p>
        <p style="${S.p}">
          Die automatische Anomalieerkennung hat <strong>${highCount} kritische
          Lager${highCount !== 1 ? 'bewegungen' : 'bewegung'}</strong> in deiner Organisation
          <strong>${escapeHtml(orgName)}</strong> erkannt:
        </p>
        <ul style="color:#4b5563;font-size:15px;line-height:24px;margin:0 0 16px;padding-left:20px;">
          ${listItems}
        </ul>
        ${moreNote}
        <div style="${S.center}">
          <a href="${appUrl}/dashboard/anomalies" style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">Anomalien pr&uuml;fen</a>
        </div>
        <p style="${S.muted}">
          Diese Benachrichtigung wird alle 4 Stunden verschickt, sofern kritische Anomalien vorliegen.
          Die Erkennung basiert auf statistischen Methoden (Z-Score, Perzentile) und kann Fehlalarme enthalten.
        </p>
      `),
    });
  } catch (error) {
    console.error('Failed to send anomaly alert email:', error);
    throw error;
  }
}

export async function sendAccountDeletionEmail({
  userEmail,
  userName,
  deletionDateFormatted,
  appUrl: appUrlParam,
}: {
  userEmail: string
  userName: string
  deletionDateFormatted: string
  appUrl?: string
}) {
  const appUrl = appUrlParam ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  try {
    return await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@zentory.ch',
      to: userEmail,
      subject: 'Ihre L\u00f6schanfrage wurde registriert',
      html: brandedHtml(`
        <h2 style="${S.h2}">L&ouml;schanfrage best&auml;tigt</h2>
        <p style="${S.p}">Hallo ${escapeHtml(userName)},</p>
        <p style="${S.p}">Ihre Anfrage zur Kontol&ouml;schung wurde erfolgreich registriert.</p>
        <p style="${S.p}"><strong>L&ouml;schdatum:</strong> ${escapeHtml(deletionDateFormatted)}</p>
        <p style="${S.p}">
          Sie haben <strong>30 Tage</strong> Zeit, diese Anfrage zu widerrufen.
          Nach Ablauf dieser Frist werden alle Ihre Daten unwiderruflich gel&ouml;scht.
        </p>
        <div style="${S.center}">
          <a href="${appUrl}/dashboard/settings" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">L&ouml;schung widerrufen</a>
        </div>
        <p style="${S.muted}">
          Falls Sie diese Anfrage nicht gestellt haben, widerrufen Sie die L&ouml;schung umgehend und &auml;ndern Sie Ihr Passwort.
        </p>
      `),
    });
  } catch (error) {
    console.error('Failed to send account deletion email:', error);
    throw error;
  }
}

export async function sendAccountDeletionAdminEmail({
  adminEmail,
  userName,
  userEmail,
  userId,
  requestedAtFormatted,
  deletionDateFormatted,
}: {
  adminEmail: string
  userName: string
  userEmail: string
  userId: string
  requestedAtFormatted: string
  deletionDateFormatted: string
}) {
  try {
    return await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@zentory.ch',
      to: adminEmail,
      subject: `Kontol\u00f6schung beantragt: ${userEmail}`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Kontol&ouml;schung beantragt</h2>
        <p style="${S.p}">Ein Benutzer hat die L&ouml;schung seines Kontos beantragt.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">Name</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1f2937;">${escapeHtml(userName || '—')}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">E-Mail</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1f2937;">${escapeHtml(userEmail)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">Benutzer-ID</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1f2937;font-family:monospace;font-size:12px;">${escapeHtml(userId)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">Beantragt am</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1f2937;">${escapeHtml(requestedAtFormatted)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">L&ouml;schung am</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1f2937;">${escapeHtml(deletionDateFormatted)}</td>
          </tr>
        </table>
      `),
    });
  } catch (error) {
    console.error('Failed to send account deletion admin email:', error);
    throw error;
  }
}

export async function sendOrderCcEmail({
  ccEmail,
  orgName,
  orderNumber,
  supplierName,
  itemCount,
  orderId,
}: {
  ccEmail: string
  orgName: string
  orderNumber: string | null
  supplierName: string
  itemCount: number
  orderId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';
  const displayOrderNumber = orderNumber || orderId.slice(0, 8).toUpperCase();

  try {
    return await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@zentory.ch',
      to: ccEmail,
      subject: `Neue Bestellung #${displayOrderNumber} \u2014 ${orgName}`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Neue Bestellung erstellt</h2>
        <p style="${S.p}">Eine neue Bestellung wurde in <strong>${escapeHtml(orgName)}</strong> erfasst:</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">Bestellnummer</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1f2937;">#${escapeHtml(displayOrderNumber)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">Lieferant</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1f2937;">${escapeHtml(supplierName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">Positionen</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#1f2937;">${itemCount}</td>
          </tr>
        </table>
        <div style="${S.center}">
          ${primaryButton('Bestellung ansehen', `${appUrl}/dashboard/orders/${orderId}`)}
        </div>
      `),
    });
  } catch (error) {
    console.error('Failed to send order CC email:', error);
    throw error;
  }
}

export async function sendInventoryCountCompletedEmail({
  recipientEmail,
  recipientName,
  orgName,
  correctionsCreated,
  countId,
}: {
  recipientEmail: string
  recipientName: string
  orgName: string
  correctionsCreated: number
  countId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.zentory.ch';

  try {
    return await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@zentory.ch',
      to: recipientEmail,
      subject: `Inventur abgeschlossen \u2014 ${orgName}`,
      html: brandedHtml(`
        <h2 style="${S.h2}">Inventur abgeschlossen</h2>
        <p style="${S.p}">Hallo ${escapeHtml(recipientName)},</p>
        <p style="${S.p}">
          Die Inventur in <strong>${escapeHtml(orgName)}</strong> wurde erfolgreich abgeschlossen.
        </p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:bold;color:#374151;">Korrekturen erstellt</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:bold;text-align:right;color:#1f2937;">${correctionsCreated}</td>
          </tr>
        </table>
        ${correctionsCreated > 0
          ? `<p style="${S.p}">Die Lagerbest&auml;nde wurden automatisch auf die gez&auml;hlten Mengen korrigiert.</p>`
          : `<p style="${S.p}">Keine Abweichungen gefunden &mdash; alle Best&auml;nde sind korrekt.</p>`
        }
        <div style="${S.center}">
          ${primaryButton('Inventur ansehen', `${appUrl}/dashboard/inventory-counts/${countId}`)}
        </div>
      `),
    });
  } catch (error) {
    console.error('Failed to send inventory count completed email:', error);
    throw error;
  }
}

export async function sendResetPasswordEmail(email: string, resetUrl: string) {
  try {
    const result = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Passwort zurücksetzen — Zentory',
      html: brandedHtml(`
        <h2 style="${S.h2}">Passwort zur&uuml;cksetzen</h2>
        <p style="${S.p}">Hallo,</p>
        <p style="${S.p}">Wir haben eine Anfrage erhalten, das Passwort f&uuml;r dieses Konto zur&uuml;ckzusetzen. Klicke auf den Button, um ein neues Passwort zu w&auml;hlen.</p>
        <div style="${S.center}">
          ${primaryButton('Neues Passwort setzen', resetUrl)}
        </div>
        <p style="${S.muted}">
          Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.<br/>
          Der Link ist 1 Stunde g&uuml;ltig.
        </p>
      `),
    });
    return result;
  } catch (error) {
    console.error('Failed to send reset password email:', error);
    throw error;
  }
}
