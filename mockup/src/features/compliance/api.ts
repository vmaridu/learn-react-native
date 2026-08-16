import { db, delay, MockApiError, nextId } from '~/mock/db';
import type { ArcRequest, ServiceRequest, Violation } from '~/mock/types';

// ── Violations ──────────────────────────────────────────────────────────────

export async function fetchViolations(): Promise<Violation[]> {
  return delay(
    [...db.violations].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)),
  );
}

export async function fetchViolation(violationId: string): Promise<Violation> {
  const violation = db.violations.find((v) => v.id === violationId);
  if (!violation) throw new MockApiError('That violation record was not found.');
  return delay(violation, 180);
}

/** Structured dispute workflow (FR-CMP-02). */
export async function disputeViolation(input: {
  violationId: string;
  reason: string;
}): Promise<Violation> {
  await delay(null, 780);
  const violation = db.violations.find((v) => v.id === input.violationId);
  if (!violation) throw new MockApiError('That violation record was not found.');
  if (violation.status === 'disputed') {
    throw new MockApiError('A dispute is already open on this violation.');
  }
  if (violation.status === 'resolved') {
    throw new MockApiError('This violation is closed and can no longer be disputed.');
  }

  violation.status = 'disputed';
  violation.disputeText = input.reason.trim();
  violation.timeline.push({
    at: new Date().toISOString(),
    label: 'Dispute submitted',
    detail: 'Management has 30 days to respond. The fine is held while the dispute is open.',
    tone: 'neutral',
  });
  return violation;
}

// ── Architectural review ────────────────────────────────────────────────────

export async function fetchArcRequests(): Promise<ArcRequest[]> {
  return delay([...db.arcRequests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
}

export async function fetchArcRequest(requestId: string): Promise<ArcRequest> {
  const request = db.arcRequests.find((r) => r.id === requestId);
  if (!request) throw new MockApiError('That request was not found.');
  return delay(request, 180);
}

export async function submitArcRequest(input: {
  title: string;
  category: string;
  description: string;
  contractor: string;
  estimatedStart: string;
  attachmentNames: string[];
}): Promise<ArcRequest> {
  await delay(null, 900);
  const at = new Date().toISOString();
  const request: ArcRequest = {
    id: nextId('arc'),
    reference: `ARC-${120 + db.arcRequests.length}`,
    title: input.title.trim(),
    category: input.category,
    description: input.description.trim(),
    contractor: input.contractor.trim(),
    estimatedStart: input.estimatedStart,
    status: 'submitted',
    submittedAt: at,
    attachments: input.attachmentNames.map((name) => ({ id: nextId('at'), name })),
    timeline: [
      {
        at,
        label: 'Submitted',
        detail: `Application received with ${input.attachmentNames.length} ${
          input.attachmentNames.length === 1 ? 'attachment' : 'attachments'
        }.`,
        tone: 'neutral',
      },
      {
        at,
        label: 'Awaiting completeness check',
        detail: 'Management reviews the submission before it reaches the committee.',
        tone: 'neutral',
      },
    ],
  };
  db.arcRequests.push(request);
  return request;
}

// ── Service requests & complaints ───────────────────────────────────────────

export async function fetchServiceRequests(): Promise<ServiceRequest[]> {
  return delay(
    [...db.serviceRequests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
  );
}

export async function fetchServiceRequest(requestId: string): Promise<ServiceRequest> {
  const request = db.serviceRequests.find((r) => r.id === requestId);
  if (!request) throw new MockApiError('That request was not found.');
  return delay(request, 180);
}

export async function submitServiceRequest(input: {
  category: string;
  title: string;
  detail: string;
  location: string;
  priority: 'low' | 'normal' | 'urgent';
}): Promise<ServiceRequest> {
  await delay(null, 850);
  const at = new Date().toISOString();
  const request: ServiceRequest = {
    id: nextId('sr'),
    reference: `SR-${3321 + db.serviceRequests.length}`,
    category: input.category,
    title: input.title.trim(),
    detail: input.detail.trim(),
    location: input.location.trim(),
    priority: input.priority,
    status: 'submitted',
    submittedAt: at,
    timeline: [
      {
        at,
        label: 'Submitted',
        detail: 'Routed to the management inbox.',
        tone: 'neutral',
      },
    ],
  };
  db.serviceRequests.push(request);
  return request;
}
