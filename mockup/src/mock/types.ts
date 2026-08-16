/**
 * Domain types for the mockup's fake backend.
 *
 * Scope: the 🏠 Homeowner (owner-occupant) persona from the Phase 1 spec only.
 * Board member, CAM, executive, platform admin and auditor surfaces are
 * deliberately absent — this mockup does not model them.
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type ISOTimestamp = string; // full ISO 8601
export type HHMM = string; // '14:30'

// ── Identity ────────────────────────────────────────────────────────────────

export interface Community {
  id: string;
  name: string;
  address: string;
  managerName: string;
  managerTitle: string;
  units: number;
}

export interface Member {
  id: string;
  name: string;
  unit: string;
  streetAddress: string;
  email: string;
  phone: string;
  memberSince: ISODate;
  /** Owner-occupant. The mockup has exactly one persona. */
  role: 'Homeowner';
  directoryOptIn: boolean;
  showEmail: boolean;
  showPhone: boolean;
}

export interface Session {
  token: string;
  memberId: string;
  issuedAt: ISOTimestamp;
}

// ── Amenities & reservations ────────────────────────────────────────────────

export type AmenityCategory = 'social' | 'sport' | 'wellness' | 'outdoors';

export interface AmenityRules {
  maxDurationMinutes: number;
  leadTimeDays: number;
  /** Per-unit booking quota inside a rolling 7-day window (FR-RES-03). */
  quotaPerWeek: number;
  guestsAllowed: number;
  notes: string[];
}

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  icon: string;
  blurb: string;
  location: string;
  capacity: number;
  openHour: number;
  closeHour: number;
  slotMinutes: number;
  rules: AmenityRules;
}

export type ReservationStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export interface Reservation {
  id: string;
  amenityId: string;
  date: ISODate;
  start: HHMM;
  minutes: number;
  guests: number;
  status: ReservationStatus;
  /** Non-null when the booking repeats weekly (FR-RES-05). */
  recurringWeeks: number | null;
  /** Position when status is 'waitlisted' (FR-RES-06). */
  waitlistPosition: number | null;
  createdAt: ISOTimestamp;
}

export interface Slot {
  start: HHMM;
  minutes: number;
  /** 'open' | 'taken' — taken slots are another unit's booking or the member's own. */
  state: 'open' | 'taken' | 'mine' | 'past';
  label?: string;
}

// ── Documents ───────────────────────────────────────────────────────────────

export type DocumentCategory =
  | 'Governing'
  | 'Rules'
  | 'Minutes'
  | 'Financial'
  | 'Forms';

export interface DocumentVersion {
  version: string;
  date: ISODate;
  note: string;
}

export interface DocumentSection {
  heading: string;
  body: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  category: DocumentCategory;
  version: string;
  updatedAt: ISODate;
  pages: number;
  summary: string;
  sections: DocumentSection[];
  versions: DocumentVersion[];
  /** e-signature acknowledgment required (FR-DOC-04). */
  requiresAck: boolean;
  acknowledgedAt: ISOTimestamp | null;
  acknowledgedAs: string | null;
}

// ── Compliance: violations & ARC ────────────────────────────────────────────

export type ViolationStatus = 'open' | 'disputed' | 'resolved' | 'escalated';

export interface TimelineEvent {
  at: ISOTimestamp;
  label: string;
  detail: string;
  tone: 'neutral' | 'positive' | 'warning' | 'negative';
}

export interface Violation {
  id: string;
  reference: string;
  title: string;
  ruleCitation: string;
  description: string;
  status: ViolationStatus;
  reportedAt: ISOTimestamp;
  cureByDate: ISODate;
  fineCents: number;
  finePaid: boolean;
  /** Evidence photo placeholders — the mockup renders tinted tiles, not files. */
  evidence: { id: string; caption: string }[];
  disputeText: string | null;
  timeline: TimelineEvent[];
}

export type ArcStatus = 'submitted' | 'in_review' | 'more_info' | 'approved' | 'denied';

export interface ArcRequest {
  id: string;
  reference: string;
  title: string;
  category: string;
  description: string;
  contractor: string;
  estimatedStart: ISODate;
  status: ArcStatus;
  submittedAt: ISOTimestamp;
  attachments: { id: string; name: string }[];
  timeline: TimelineEvent[];
}

// ── Service requests / complaints ───────────────────────────────────────────

export type ServiceRequestStatus = 'submitted' | 'assigned' | 'in_progress' | 'closed';

export interface ServiceRequest {
  id: string;
  reference: string;
  category: string;
  title: string;
  detail: string;
  location: string;
  priority: 'low' | 'normal' | 'urgent';
  status: ServiceRequestStatus;
  submittedAt: ISOTimestamp;
  timeline: TimelineEvent[];
}

// ── Elections ───────────────────────────────────────────────────────────────

export type BallotType = 'multi' | 'referendum';
export type ElectionStatus = 'open' | 'closed' | 'upcoming';

export interface BallotOption {
  id: string;
  name: string;
  subtitle: string;
  statement: string;
}

export interface Election {
  id: string;
  title: string;
  summary: string;
  type: BallotType;
  /** Number of choices the voter may select. 1 for a referendum. */
  seats: number;
  status: ElectionStatus;
  opensAt: ISOTimestamp;
  closesAt: ISOTimestamp;
  quorum: number;
  options: BallotOption[];
  /** Eligibility is verified against the unit-owner registry (FR-GOV-03). */
  eligible: boolean;
  eligibilityNote: string;
  hasVoted: boolean;
  /** Anonymised receipt — proves the vote was cast, never who it was for. */
  receiptCode: string | null;
  ballotsCast: number;
  eligibleVoters: number;
  results: { optionId: string; votes: number }[] | null;
}

// ── Payments ────────────────────────────────────────────────────────────────

export type ChargeKind = 'dues' | 'assessment' | 'fine' | 'late_fee';

export interface Charge {
  id: string;
  label: string;
  detail: string;
  kind: ChargeKind;
  amountCents: number;
  dueDate: ISODate;
  paid: boolean;
}

export type PaymentMethodKind = 'card' | 'ach';

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  detail: string;
  isDefault: boolean;
}

export interface LedgerEntry {
  id: string;
  label: string;
  at: ISOTimestamp;
  /** Negative = money leaving the member (a payment). Positive = a charge. */
  amountCents: number;
  kind: ChargeKind | 'payment';
  method: string | null;
}

export interface Autopay {
  enabled: boolean;
  methodId: string | null;
  dayOfMonth: number;
}

// ── Communications ──────────────────────────────────────────────────────────

export type MessageKind = 'announcement' | 'direct';

export interface MessageReply {
  id: string;
  body: string;
  at: ISOTimestamp;
  mine: boolean;
}

export interface Message {
  id: string;
  kind: MessageKind;
  subject: string;
  body: string;
  fromName: string;
  fromRole: string;
  sentAt: ISOTimestamp;
  read: boolean;
  pinned: boolean;
  replies: MessageReply[];
}

export interface NotificationPrefs {
  push: boolean;
  email: boolean;
  sms: boolean;
  categories: {
    announcements: boolean;
    reservations: boolean;
    billing: boolean;
    compliance: boolean;
    elections: boolean;
  };
}

// ── Directories ─────────────────────────────────────────────────────────────

export interface DirectoryEntry {
  id: string;
  name: string;
  unit: string;
  email: string | null;
  phone: string | null;
  memberSince: ISODate;
  interests: string[];
}

export type ServiceCategory =
  | 'Childcare'
  | 'Pets'
  | 'Tutoring'
  | 'Notary'
  | 'Home repair'
  | 'Landscaping'
  | 'Cleaning';

export interface ServiceProvider {
  id: string;
  name: string;
  category: ServiceCategory;
  kind: 'resident' | 'external';
  blurb: string;
  rateLabel: string;
  phone: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  unit: string | null;
}

// ── AI assistant ────────────────────────────────────────────────────────────

export interface AssistantCitation {
  documentId: string;
  title: string;
  locator: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  body: string;
  at: ISOTimestamp;
  citations: AssistantCitation[];
}
