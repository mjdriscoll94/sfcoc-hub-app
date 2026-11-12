import { getAdminDb } from '@/lib/firebase/admin';
import { readUnsubscribeToken } from '@/lib/email/unsubscribeToken';
import { unsubscribeFromBroadcasts } from '@/lib/email/unsubscribeStore';

export const dynamic = 'force-dynamic';

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function pageHtml(options: {
  title: string;
  message: string;
  showConfirmation?: boolean;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${options.title} | Sioux Falls Church of Christ</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f7f5f2; color: #26343d; font-family: Arial, sans-serif; }
      main { width: 100%; max-width: 520px; background: #fff; border: 1px solid #ded8d2; border-radius: 16px; padding: 32px; box-shadow: 0 8px 28px rgba(38,52,61,.08); }
      .eyebrow { margin: 0 0 10px; color: #b9471f; font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
      h1 { margin: 0 0 14px; font-size: clamp(26px, 7vw, 34px); line-height: 1.15; }
      p { margin: 0 0 18px; color: #586873; font-size: 17px; line-height: 1.55; }
      .note { font-size: 14px; }
      button { width: 100%; min-height: 48px; border: 0; border-radius: 10px; padding: 12px 18px; background: #b9471f; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      button:hover { background: #963817; }
      button:focus-visible { outline: 3px solid #f2a37e; outline-offset: 3px; }
      @media (max-width: 480px) { main { padding: 24px 20px; } }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Sioux Falls Church of Christ</p>
      <h1>${options.title}</h1>
      <p>${options.message}</p>
      ${
        options.showConfirmation
          ? `<form method="post">
              <input type="hidden" name="confirm" value="yes" />
              <button type="submit">Unsubscribe me</button>
            </form>
            <p class="note" style="margin-top: 18px;">This stops optional announcements, newsletters, event notices, and prayer or praise emails. Essential account and security messages may still be sent.</p>`
          : ''
      }
    </main>
  </body>
</html>`;
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const email = readUnsubscribeToken(token);
  if (!email) {
    return htmlResponse(
      pageHtml({
        title: 'This link is not valid',
        message: 'Please use the unsubscribe link from your most recent church email, or contact the church office for help.',
      }),
      400
    );
  }

  return htmlResponse(
    pageHtml({
      title: 'Unsubscribe from church emails?',
      message: 'Choose the button below to stop optional church emails. Nothing changes until you confirm.',
      showConfirmation: true,
    })
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const email = readUnsubscribeToken(token);
  if (!email) {
    return htmlResponse(
      pageHtml({
        title: 'This link is not valid',
        message: 'No subscription was changed. Please use the link from your most recent church email.',
      }),
      400
    );
  }

  try {
    const body = (await request.text()).slice(0, 200);
    const source = body.includes('List-Unsubscribe=One-Click') ? 'one-click' : 'email-link';
    await unsubscribeFromBroadcasts(getAdminDb(), email, source);
    return htmlResponse(
      pageHtml({
        title: 'You’re unsubscribed',
        message: 'You will no longer receive optional church emails. Your request has been saved, even if this address is imported into a list again later.',
      })
    );
  } catch (error) {
    console.error('Unsubscribe request failed:', error);
    return htmlResponse(
      pageHtml({
        title: 'We couldn’t save that request',
        message: 'Please try again in a few minutes. If the problem continues, contact the church office for help.',
      }),
      500
    );
  }
}
