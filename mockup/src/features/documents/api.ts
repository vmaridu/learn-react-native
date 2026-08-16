import { db, delay, MockApiError } from '~/mock/db';
import type { DocumentRecord } from '~/mock/types';

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  return delay(db.documents);
}

export async function fetchDocument(documentId: string): Promise<DocumentRecord> {
  const doc = db.documents.find((d) => d.id === documentId);
  if (!doc) throw new MockApiError('That document is no longer published.');
  return delay(doc, 180);
}

/**
 * e-signature acknowledgment (FR-DOC-04). A typed full name stands in for a
 * signature — a real build needs a signed, timestamped, tamper-evident record.
 */
export async function acknowledgeDocument(input: {
  documentId: string;
  signedName: string;
}): Promise<DocumentRecord> {
  await delay(null, 700);
  const doc = db.documents.find((d) => d.id === input.documentId);
  if (!doc) throw new MockApiError('That document is no longer published.');
  if (!doc.requiresAck) throw new MockApiError('That document does not need an acknowledgment.');
  if (doc.acknowledgedAt) throw new MockApiError('You have already acknowledged this version.');

  const expected = db.member.name.trim().toLowerCase();
  if (input.signedName.trim().toLowerCase() !== expected) {
    throw new MockApiError(`Type your full name exactly as it appears on the account: ${db.member.name}`);
  }

  doc.acknowledgedAt = new Date().toISOString();
  doc.acknowledgedAs = input.signedName.trim();
  return doc;
}
