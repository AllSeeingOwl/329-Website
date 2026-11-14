/**
 * Forwards captured emails to MailerLite so its automation can send the welcome email.
 *
 * Configuration (Render → Environment):
 *   MAILERLITE_API_KEY   — API token from MailerLite → Integrations → API (secret)
 *   MAILERLITE_GROUP_ID  — numeric id of the group whose "subscriber joins group" automation
 *                          sends the welcome / data-packet email
 *
 * When the key is not set this is a no-op, so local development and tests never call out.
 * Emails are always stored in Redis first; MailerLite is a best-effort copy.
 */

const MAILERLITE_SUBSCRIBERS_URL = 'https://connect.mailerlite.com/api/subscribers';
const REQUEST_TIMEOUT_MS = 5000;

const isMailerLiteConfigured = (): boolean =>
  Boolean(process.env.MAILERLITE_API_KEY && process.env.MAILERLITE_API_KEY.trim());

export const forwardToMailerLite = async (
  email: string,
  fetchFn: typeof fetch = fetch
): Promise<boolean> => {
  if (!isMailerLiteConfigured()) return false;

  const groupId = (process.env.MAILERLITE_GROUP_ID || '').trim();
  const body: { email: string; groups?: string[] } = { email };
  if (/^\d+$/.test(groupId)) body.groups = [groupId];

  try {
    const res = await fetchFn(MAILERLITE_SUBSCRIBERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${(process.env.MAILERLITE_API_KEY || '').trim()}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`MailerLite subscriber sync failed with status ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('MailerLite subscriber sync error:', err instanceof Error ? err.message : err);
    return false;
  }
};
