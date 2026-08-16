import type { DocumentRecord } from './types';

/** Title, summary and body are all searchable (FR-DOC-01). */
export function searchDocuments(
  documents: DocumentRecord[],
  query: string,
): DocumentRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return documents;
  return documents.filter((doc) => {
    if (doc.title.toLowerCase().includes(q)) return true;
    if (doc.summary.toLowerCase().includes(q)) return true;
    if (doc.category.toLowerCase().includes(q)) return true;
    return doc.sections.some(
      (section) =>
        section.heading.toLowerCase().includes(q) || section.body.toLowerCase().includes(q),
    );
  });
}

export function pendingAcknowledgments(documents: DocumentRecord[]): DocumentRecord[] {
  return documents.filter((doc) => doc.requiresAck && !doc.acknowledgedAt);
}

/** The first body excerpt containing the query, for the search result row. */
export function matchExcerpt(doc: DocumentRecord, query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const section of doc.sections) {
    const index = section.body.toLowerCase().indexOf(q);
    if (index >= 0) {
      const start = Math.max(0, index - 40);
      const excerpt = section.body.slice(start, start + 130).trim();
      return `${start > 0 ? '…' : ''}${excerpt}…`;
    }
  }
  return null;
}
