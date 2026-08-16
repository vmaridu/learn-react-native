import { db, delay } from '~/mock/db';
import type { Member, NotificationPrefs } from '~/mock/types';

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  return delay(db.notificationPrefs, 150);
}

export interface NotificationPrefsPatch {
  push?: boolean;
  email?: boolean;
  sms?: boolean;
  categories?: Partial<NotificationPrefs['categories']>;
}

export async function updateNotificationPrefs(
  patch: NotificationPrefsPatch,
): Promise<NotificationPrefs> {
  await delay(null, 260);
  db.notificationPrefs = {
    ...db.notificationPrefs,
    ...patch,
    categories: { ...db.notificationPrefs.categories, ...(patch.categories ?? {}) },
  };
  return db.notificationPrefs;
}

/** Self-service profile update (FR-ID / UC-02 profile management). */
export async function updateProfile(patch: {
  name?: string;
  phone?: string;
  email?: string;
}): Promise<Member> {
  await delay(null, 520);
  db.member = { ...db.member, ...patch };
  return db.member;
}

/** Field-level directory privacy (FR-DOC-02, NFR-10). */
export async function updatePrivacy(patch: {
  directoryOptIn?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
}): Promise<Member> {
  await delay(null, 260);
  db.member = { ...db.member, ...patch };
  return db.member;
}
