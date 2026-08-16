import { delay, MockApiError, db, nextId } from '~/mock/db';
import { DEMO_CREDENTIALS } from '~/mock/seed';
import type { Member, Session } from '~/mock/types';

/**
 * 🔴 Tier 3 surface (auth). This is a mockup: the "session" is a random string
 * with no signature, no expiry and no server. Nothing here is a reference
 * implementation — a real build replaces this file entirely with Supabase auth
 * and gets a line-by-line review.
 */

function issueSession(): Session {
  return {
    token: `mock_${nextId('tok')}_${Math.random().toString(36).slice(2, 10)}`,
    memberId: db.member.id,
    issuedAt: new Date().toISOString(),
  };
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<Session> {
  await delay(null, 700);
  const emailMatches =
    input.email.trim().toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase();
  if (!emailMatches || input.password !== DEMO_CREDENTIALS.password) {
    throw new MockApiError(
      'That email and password combination is not recognised. Use the demo account below.',
    );
  }
  return issueSession();
}

/** The mockup accepts any six digits — there is no SMS to receive (FR-ID-02). */
export async function signInWithOtp(code: string): Promise<Session> {
  await delay(null, 700);
  if (!/^\d{6}$/.test(code)) throw new MockApiError('Enter the 6-digit code.');
  return issueSession();
}

export async function requestOtp(): Promise<{ sentTo: string }> {
  await delay(null, 600);
  return { sentTo: db.member.phone };
}

export async function fetchMember(): Promise<Member> {
  return delay(db.member);
}
