import { addDays, toISODate } from '~/lib/format';
import type {
  Amenity,
  ArcRequest,
  Autopay,
  Charge,
  Community,
  DirectoryEntry,
  DocumentRecord,
  Election,
  LedgerEntry,
  Member,
  Message,
  NotificationPrefs,
  PaymentMethod,
  Reservation,
  ServiceProvider,
  ServiceRequest,
  Violation,
} from './types';

const NOW = new Date();

const day = (offset: number) => toISODate(addDays(NOW, offset));
const stamp = (daysOffset: number, hour = 9, minute = 0) => {
  const d = addDays(NOW, daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ── Community & member ──────────────────────────────────────────────────────

export const community: Community = {
  id: 'c-willow-creek',
  name: 'Willow Creek',
  address: '1400 Willow Creek Lane, Cary, NC 27519',
  managerName: 'Dana Whitfield',
  managerTitle: 'Community Association Manager',
  units: 214,
};

export const member: Member = {
  id: 'm-0142',
  name: 'Alex Rivera',
  unit: 'Unit 142',
  streetAddress: '1442 Willow Creek Lane',
  email: 'demo@hamlethq.app',
  phone: '(919) 555-0142',
  memberSince: '2021-06-14',
  role: 'Homeowner',
  directoryOptIn: true,
  showEmail: true,
  showPhone: false,
};

/** The one credential pair the mockup accepts. Surfaced on the sign-in screen. */
export const DEMO_CREDENTIALS = {
  email: 'demo@hamlethq.app',
  password: 'hamlet2026',
} as const;

// ── Amenities ───────────────────────────────────────────────────────────────

export const amenities: Amenity[] = [
  {
    id: 'a-clubhouse',
    name: 'Clubhouse Great Room',
    category: 'social',
    icon: 'business',
    blurb: 'Full kitchen, projector, seating for 80. The room for birthdays and showers.',
    location: 'Clubhouse, ground floor',
    capacity: 80,
    openHour: 9,
    closeHour: 22,
    slotMinutes: 60,
    rules: {
      maxDurationMinutes: 240,
      leadTimeDays: 30,
      quotaPerWeek: 2,
      guestsAllowed: 20,
      notes: [
        'A $150 refundable deposit is charged at booking.',
        'Amplified music must stop at 10:00 PM.',
        'Leave the kitchen as you found it — cleaning fees are assessed to the unit.',
      ],
    },
  },
  {
    id: 'a-tennis-1',
    name: 'Tennis Court 1',
    category: 'sport',
    icon: 'tennisball',
    blurb: 'Resurfaced in March. Lights available until close.',
    location: 'North recreation field',
    capacity: 4,
    openHour: 7,
    closeHour: 21,
    slotMinutes: 60,
    rules: {
      maxDurationMinutes: 120,
      leadTimeDays: 7,
      quotaPerWeek: 3,
      guestsAllowed: 3,
      notes: [
        'Non-marking court shoes required.',
        'Singles play yields to a waiting doubles group after 60 minutes.',
      ],
    },
  },
  {
    id: 'a-pickleball',
    name: 'Pickleball Court',
    category: 'sport',
    icon: 'golf',
    blurb: 'Two striped courts sharing one reservation block.',
    location: 'North recreation field',
    capacity: 8,
    openHour: 7,
    closeHour: 21,
    slotMinutes: 60,
    rules: {
      maxDurationMinutes: 120,
      leadTimeDays: 7,
      quotaPerWeek: 3,
      guestsAllowed: 4,
      notes: ['Paddles and balls are stocked in the court-side bin.'],
    },
  },
  {
    id: 'a-cabana',
    name: 'Poolside Cabana',
    category: 'wellness',
    icon: 'water',
    blurb: 'Shaded cabana with grill access, adjacent to the main pool.',
    location: 'Aquatic center',
    capacity: 12,
    openHour: 10,
    closeHour: 20,
    slotMinutes: 60,
    rules: {
      maxDurationMinutes: 180,
      leadTimeDays: 14,
      quotaPerWeek: 2,
      guestsAllowed: 8,
      notes: [
        'Cabana reservations do not reserve the pool itself.',
        'Glass containers are prohibited inside the pool fence.',
      ],
    },
  },
  {
    id: 'a-fitness',
    name: 'Fitness Studio',
    category: 'wellness',
    icon: 'barbell',
    blurb: 'Mirrored studio for private sessions, yoga, or a quiet lift.',
    location: 'Clubhouse, lower level',
    capacity: 10,
    openHour: 5,
    closeHour: 22,
    slotMinutes: 30,
    rules: {
      maxDurationMinutes: 90,
      leadTimeDays: 3,
      quotaPerWeek: 5,
      guestsAllowed: 1,
      notes: ['Wipe down equipment after use.', 'Residents 16+ unless accompanied.'],
    },
  },
  {
    id: 'a-garden',
    name: 'Community Garden Plot',
    category: 'outdoors',
    icon: 'leaf',
    blurb: 'Raised 4×8 beds with drip irrigation on a shared timer.',
    location: 'South greenway',
    capacity: 6,
    openHour: 6,
    closeHour: 20,
    slotMinutes: 60,
    rules: {
      maxDurationMinutes: 240,
      leadTimeDays: 21,
      quotaPerWeek: 3,
      guestsAllowed: 4,
      notes: ['Tools live in the green shed — code is in the Pool & Garden rules doc.'],
    },
  },
];

// ── Reservations already on the member's calendar ───────────────────────────

export const reservations: Reservation[] = [
  {
    id: 'r-8801',
    amenityId: 'a-tennis-1',
    date: day(2),
    start: '18:00',
    minutes: 60,
    guests: 2,
    status: 'confirmed',
    recurringWeeks: null,
    waitlistPosition: null,
    createdAt: stamp(-3, 11, 20),
  },
  {
    id: 'r-8770',
    amenityId: 'a-clubhouse',
    date: day(11),
    start: '16:00',
    minutes: 180,
    guests: 18,
    status: 'confirmed',
    recurringWeeks: null,
    waitlistPosition: null,
    createdAt: stamp(-9, 20, 5),
  },
  {
    id: 'r-8612',
    amenityId: 'a-fitness',
    date: day(-6),
    start: '06:30',
    minutes: 60,
    guests: 0,
    status: 'confirmed',
    recurringWeeks: null,
    waitlistPosition: null,
    createdAt: stamp(-13, 8, 0),
  },
];

// ── Documents ───────────────────────────────────────────────────────────────

export const documents: DocumentRecord[] = [
  {
    id: 'd-ccrs',
    title: 'Declaration of Covenants, Conditions & Restrictions',
    category: 'Governing',
    version: '3.2',
    updatedAt: '2026-03-18',
    pages: 64,
    summary:
      'The recorded declaration that binds every lot in Willow Creek. Defines the association, assessments, use restrictions and enforcement powers.',
    sections: [
      {
        heading: 'Article IV — Assessments',
        body: 'Each owner covenants to pay annual and special assessments established by the Board. Assessments are a continuing lien on the lot. Regular assessments are billed monthly and are due on the first day of each month; any assessment not received within fifteen (15) days of its due date is delinquent and accrues a late charge as set by resolution.',
      },
      {
        heading: 'Article VII §7.3 — Refuse and Containers',
        body: 'Refuse containers shall be stored out of view from the street except between 6:00 PM on the day preceding collection and 8:00 PM on the day of collection. Containers left at the curb outside this window are a violation subject to the fine schedule adopted by the Board.',
      },
      {
        heading: 'Article IX — Architectural Control',
        body: 'No exterior construction, alteration, addition, or change in color shall be commenced until plans have been submitted to and approved in writing by the Architectural Review Committee. The Committee shall act within forty-five (45) days of receipt of a complete application.',
      },
      {
        heading: 'Article XII — Amendment',
        body: 'This Declaration may be amended by an instrument signed by owners holding not less than sixty-seven percent (67%) of the voting interests, recorded in the county registry.',
      },
    ],
    versions: [
      { version: '3.2', date: '2026-03-18', note: 'Amended Art. VII refuse window' },
      { version: '3.1', date: '2024-08-02', note: 'Short-term rental restriction added' },
      { version: '3.0', date: '2021-01-11', note: 'Restated declaration recorded' },
    ],
    requiresAck: false,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
  {
    id: 'd-bylaws',
    title: 'Association Bylaws',
    category: 'Governing',
    version: '2.0',
    updatedAt: '2025-11-04',
    pages: 28,
    summary:
      'How the association governs itself: board composition, meetings, quorum, elections and officer duties.',
    sections: [
      {
        heading: 'Article III — Board of Directors',
        body: 'The Board consists of five (5) directors elected to staggered two-year terms. Two seats stand for election in even-numbered years and three in odd-numbered years. Only owners in good standing are eligible to serve.',
      },
      {
        heading: 'Article IV — Meetings and Quorum',
        body: 'Quorum for a membership meeting is twenty percent (20%) of the voting interests, present in person, by proxy, or by ballot cast through an association-approved electronic voting system.',
      },
      {
        heading: 'Article V — Elections',
        body: 'Ballots shall be secret. The association shall use a method that separates the ballot from any owner-identifying envelope or record before tabulation, and shall retain the tabulation record for one (1) year.',
      },
    ],
    versions: [
      { version: '2.0', date: '2025-11-04', note: 'Electronic voting authorised' },
      { version: '1.4', date: '2022-05-19', note: 'Quorum reduced to 20%' },
    ],
    requiresAck: false,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
  {
    id: 'd-arch',
    title: 'Architectural Review Guidelines',
    category: 'Rules',
    version: '4.1',
    updatedAt: day(-9),
    pages: 18,
    summary:
      'What the Architectural Review Committee approves, the submission checklist, and the approved materials and colour palette.',
    sections: [
      {
        heading: 'Submission checklist',
        body: 'A complete application includes: a site plan showing setbacks, elevation drawings or manufacturer specifications, a materials list with colour samples, the contractor name and licence number, and an estimated start and completion date.',
      },
      {
        heading: 'Structures — pergolas, arbors, gazebos',
        body: 'Freestanding structures may not exceed 12 feet in height or 200 square feet in footprint, must sit at least 5 feet from any property line, and must use cedar, redwood, or an approved composite in a natural or ARC-listed stain.',
      },
      {
        heading: 'Fences',
        body: 'Fence height is limited to 6 feet in rear yards and 4 feet in side yards forward of the rear building line. Chain link is prohibited in all locations visible from a street or common area.',
      },
      {
        heading: 'Review timeline',
        body: 'The Committee meets on the second Tuesday of each month. Complete applications received at least seven (7) days before a meeting are placed on that agenda. A decision is issued within 45 days of a complete submission.',
      },
    ],
    versions: [
      { version: '4.1', date: day(-9), note: 'Composite decking materials added' },
      { version: '4.0', date: '2025-09-30', note: 'Solar panel provisions' },
      { version: '3.5', date: '2024-02-14', note: 'Colour palette refresh' },
    ],
    requiresAck: true,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
  {
    id: 'd-pool',
    title: 'Pool, Cabana & Garden Rules',
    category: 'Rules',
    version: '1.6',
    updatedAt: '2026-04-28',
    pages: 4,
    summary: 'Seasonal hours, guest limits, and the shared-equipment codes.',
    sections: [
      {
        heading: 'Hours & season',
        body: 'The pool is open from the Saturday of Memorial Day weekend through the last Sunday in September, 10:00 AM to 8:00 PM daily. The cabana may be reserved separately and does not reserve the pool.',
      },
      {
        heading: 'Guests',
        body: 'Each unit may bring up to eight (8) guests. Guests must be accompanied by a resident 18 or older at all times inside the pool fence.',
      },
      {
        heading: 'Garden shed',
        body: 'The green shed keypad code is 4-2-9-1 and rotates each spring. Return tools clean and closed.',
      },
    ],
    versions: [
      { version: '1.6', date: '2026-04-28', note: 'Season dates for 2026' },
      { version: '1.5', date: '2025-05-02', note: 'Guest limit raised to 8' },
    ],
    requiresAck: false,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
  {
    id: 'd-parking',
    title: 'Parking & Vehicle Policy',
    category: 'Rules',
    version: '2.3',
    updatedAt: '2026-01-22',
    pages: 6,
    summary: 'Driveway, street and guest parking; towing; commercial and recreational vehicles.',
    sections: [
      {
        heading: 'Resident parking',
        body: 'Residents park in their garage and driveway first. Street parking is permitted on the even-numbered side only, and never within 15 feet of a hydrant or mail kiosk.',
      },
      {
        heading: 'Guest parking',
        body: 'Guests may use marked visitor spaces for up to 72 consecutive hours. Longer stays require a pass requested through the association.',
      },
      {
        heading: 'Prohibited vehicles',
        body: 'Boats, trailers, campers and commercial vehicles over 3/4 ton may not be stored on a lot or street for more than 24 hours.',
      },
    ],
    versions: [
      { version: '2.3', date: '2026-01-22', note: '72-hour visitor limit clarified' },
      { version: '2.2', date: '2023-07-08', note: 'Towing vendor updated' },
    ],
    requiresAck: true,
    acknowledgedAt: stamp(-92, 19, 42),
    acknowledgedAs: 'Alex Rivera',
  },
  {
    id: 'd-minutes-jul',
    title: 'Board Meeting Minutes — July 2026',
    category: 'Minutes',
    version: '1.0',
    updatedAt: day(-24),
    pages: 9,
    summary: 'Roof reserve funding, landscaping RFP shortlist, and the 2026 election calendar.',
    sections: [
      {
        heading: 'Roof reserve',
        body: 'The Treasurer reported the roof reserve at 61% of the funding plan target. The Board voted 5-0 to continue the six-instalment special assessment through November 2026.',
      },
      {
        heading: 'Landscaping RFP',
        body: 'Three bids were reviewed. The Board voted to place the contract award to a membership referendum given the five-year term.',
      },
      {
        heading: 'Election calendar',
        body: 'Two director seats stand for election. Nominations closed 15 July; the ballot opens electronically for fourteen days.',
      },
    ],
    versions: [{ version: '1.0', date: day(-24), note: 'Approved as read' }],
    requiresAck: false,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
  {
    id: 'd-minutes-jun',
    title: 'Board Meeting Minutes — June 2026',
    category: 'Minutes',
    version: '1.0',
    updatedAt: day(-55),
    pages: 7,
    summary: 'Pool opening report, two ARC approvals, and a delinquency review.',
    sections: [
      {
        heading: 'Pool opening',
        body: 'The pool opened on schedule. Two lounge chairs were replaced under warranty.',
      },
      {
        heading: 'ARC decisions',
        body: 'Two applications approved (fence replacement, storm door). One returned for more information.',
      },
      {
        heading: 'Delinquency',
        body: 'Accounts 60+ days past due stand at four units, down from seven in May.',
      },
    ],
    versions: [{ version: '1.0', date: day(-55), note: 'Approved as read' }],
    requiresAck: false,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
  {
    id: 'd-budget',
    title: 'Approved Operating Budget — 2026',
    category: 'Financial',
    version: '1.0',
    updatedAt: '2025-12-12',
    pages: 12,
    summary: 'Line-item operating budget, reserve contribution schedule, and the assessment calculation.',
    sections: [
      {
        heading: 'Assessment calculation',
        body: 'Total operating expense of $988,200 across 214 units yields a monthly regular assessment of $385.00 per unit for 2026, a 3.2% increase over 2025.',
      },
      {
        heading: 'Reserve contribution',
        body: 'The plan contributes $18,400 monthly to reserves, supplemented by the roof special assessment of $150.00 per unit for six instalments.',
      },
      {
        heading: 'Largest line items',
        body: 'Landscaping $214,000 · Insurance $186,500 · Utilities $121,300 · Management $96,000 · Pool operations $74,800.',
      },
    ],
    versions: [{ version: '1.0', date: '2025-12-12', note: 'Adopted at annual meeting' }],
    requiresAck: false,
    acknowledgedAt: null,
    acknowledgedAs: null,
  },
];

// ── Compliance ──────────────────────────────────────────────────────────────

export const violations: Violation[] = [
  {
    id: 'v-2481',
    reference: 'VIO-2481',
    title: 'Refuse container left at curb',
    ruleCitation: 'CC&R Article VII §7.3',
    description:
      'Both refuse containers remained at the curb through the day following collection. Containers must be returned to screened storage by 8:00 PM on collection day.',
    status: 'open',
    reportedAt: stamp(-4, 8, 15),
    cureByDate: day(6),
    fineCents: 5000,
    finePaid: false,
    evidence: [
      { id: 'ev-1', caption: 'Curb view, 7:42 AM' },
      { id: 'ev-2', caption: 'Driveway approach' },
    ],
    disputeText: null,
    timeline: [
      {
        at: stamp(-4, 8, 15),
        label: 'Violation logged',
        detail: 'Reported by management during the Tuesday property walk.',
        tone: 'warning',
      },
      {
        at: stamp(-4, 8, 20),
        label: 'Notice sent',
        detail: 'Courtesy notice delivered by email and push.',
        tone: 'neutral',
      },
      {
        at: stamp(-1, 9, 0),
        label: 'Fine assessed',
        detail: '$50.00 assessed per the adopted fine schedule. Payable with dues.',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'v-2402',
    reference: 'VIO-2402',
    title: 'Unapproved exterior stain colour',
    ruleCitation: 'CC&R Article IX — Architectural Control',
    description:
      'Rear fence appeared to have been stained in a colour outside the approved palette.',
    status: 'resolved',
    reportedAt: stamp(-71, 10, 30),
    cureByDate: day(-56),
    fineCents: 0,
    finePaid: false,
    evidence: [{ id: 'ev-3', caption: 'Rear fence, south elevation' }],
    disputeText:
      'The stain used is Cedar Naturaltone, which is item 14 on the approved palette in the Architectural Review Guidelines v4.0. Receipt and colour chip attached.',
    timeline: [
      {
        at: stamp(-71, 10, 30),
        label: 'Violation logged',
        detail: 'Reported through the resident complaint inbox.',
        tone: 'warning',
      },
      {
        at: stamp(-68, 17, 12),
        label: 'Dispute submitted',
        detail: 'Owner submitted a dispute with supporting documentation.',
        tone: 'neutral',
      },
      {
        at: stamp(-59, 14, 0),
        label: 'Dispute upheld',
        detail: 'ARC confirmed the colour is on the approved palette. Violation closed, no fine.',
        tone: 'positive',
      },
    ],
  },
];

export const arcRequests: ArcRequest[] = [
  {
    id: 'arc-118',
    reference: 'ARC-118',
    title: 'Rear-yard cedar pergola, 12 × 14',
    category: 'Structure',
    description:
      'Freestanding cedar pergola over the existing patio slab, 9 ft peak height, set 8 ft from the rear property line. Natural cedar, no stain.',
    contractor: 'Bright Ridge Outdoor Living (NC #82114)',
    estimatedStart: day(28),
    status: 'in_review',
    submittedAt: stamp(-16, 15, 45),
    attachments: [
      { id: 'at-1', name: 'site-plan.pdf' },
      { id: 'at-2', name: 'pergola-elevation.pdf' },
      { id: 'at-3', name: 'cedar-sample.jpg' },
    ],
    timeline: [
      {
        at: stamp(-16, 15, 45),
        label: 'Submitted',
        detail: 'Application received with 3 attachments.',
        tone: 'neutral',
      },
      {
        at: stamp(-14, 9, 30),
        label: 'Completeness check passed',
        detail: 'Placed on the agenda for the next committee meeting.',
        tone: 'positive',
      },
      {
        at: stamp(-2, 11, 0),
        label: 'Under committee review',
        detail: 'Decision due within 45 days of submission.',
        tone: 'neutral',
      },
    ],
  },
];

export const serviceRequests: ServiceRequest[] = [
  {
    id: 'sr-3320',
    reference: 'SR-3320',
    category: 'Common area maintenance',
    title: 'Path light out near the mail kiosk',
    detail:
      'The second bollard light on the walkway between the mail kiosk and building C has been dark for about a week. It gets very dark there after 9 PM.',
    location: 'Walkway, mail kiosk to building C',
    priority: 'normal',
    status: 'in_progress',
    submittedAt: stamp(-8, 21, 10),
    timeline: [
      {
        at: stamp(-8, 21, 10),
        label: 'Submitted',
        detail: 'Routed to the management inbox.',
        tone: 'neutral',
      },
      {
        at: stamp(-7, 8, 30),
        label: 'Assigned',
        detail: 'Assigned to Piedmont Electric for the Thursday route.',
        tone: 'neutral',
      },
      {
        at: stamp(-2, 16, 0),
        label: 'In progress',
        detail: 'Photocell replaced; fixture still intermittent, ballast on order.',
        tone: 'warning',
      },
    ],
  },
];

// ── Elections ───────────────────────────────────────────────────────────────

export const elections: Election[] = [
  {
    id: 'e-board-2026',
    title: '2026 Board of Directors Election',
    summary:
      'Two director seats are open for two-year terms. Select up to two candidates. Your ballot is separated from your identity before tabulation.',
    type: 'multi',
    seats: 2,
    status: 'open',
    opensAt: stamp(-8, 0, 0),
    closesAt: stamp(6, 23, 59),
    quorum: 20,
    options: [
      {
        id: 'o-nguyen',
        name: 'Thanh Nguyen',
        subtitle: 'Unit 88 · Owner since 2018',
        statement:
          'I want the reserve study revisited every three years, not five, so assessments stop arriving as surprises. I spent eleven years in municipal budgeting and can read the numbers we are handed.',
      },
      {
        id: 'o-okafor',
        name: 'Ifeoma Okafor',
        subtitle: 'Unit 27 · Owner since 2015',
        statement:
          'Two priorities: publish every vendor contract to the document centre, and get the landscaping standard back to what we pay for. I have chaired the landscape committee for three seasons.',
      },
      {
        id: 'o-halvorsen',
        name: 'Erik Halvorsen',
        subtitle: 'Unit 190 · Owner since 2022',
        statement:
          'Our enforcement is inconsistent and that breeds resentment. I would publish the fine schedule, the walk cadence, and an annual summary of every action taken.',
      },
      {
        id: 'o-bhatt',
        name: 'Priya Bhatt',
        subtitle: 'Unit 61 · Owner since 2019',
        statement:
          'The clubhouse sits empty most weeknights. I want a resident-run programming calendar and a simpler booking flow so the amenities we already pay for get used.',
      },
    ],
    eligible: true,
    eligibilityNote: 'Verified against the unit-owner registry · Unit 142 · Account in good standing',
    hasVoted: false,
    receiptCode: null,
    ballotsCast: 96,
    eligibleVoters: 214,
    results: null,
  },
  {
    id: 'e-landscape',
    title: 'Landscaping Contract Referendum',
    summary:
      'The Board proposes awarding a five-year grounds maintenance contract to Carolina Green at $214,000 annually. A five-year term requires membership approval.',
    type: 'referendum',
    seats: 1,
    status: 'open',
    opensAt: stamp(-3, 0, 0),
    closesAt: stamp(12, 23, 59),
    quorum: 20,
    options: [
      {
        id: 'o-yes',
        name: 'Approve',
        subtitle: 'Award the five-year contract',
        statement:
          'Locks pricing for five years with a 2% annual cap and adds quarterly bed refresh at no extra cost.',
      },
      {
        id: 'o-no',
        name: 'Reject',
        subtitle: 'Re-bid on a shorter term',
        statement:
          'Directs the Board to re-issue the RFP for a two-year term with an option to renew.',
      },
    ],
    eligible: true,
    eligibilityNote: 'Verified against the unit-owner registry · Unit 142 · One vote per unit',
    hasVoted: false,
    receiptCode: null,
    ballotsCast: 41,
    eligibleVoters: 214,
    results: null,
  },
  {
    id: 'e-roof-2025',
    title: 'Roof Reserve Special Assessment',
    summary:
      'Closed referendum on a $900 per-unit special assessment for roof replacement, payable in six monthly instalments.',
    type: 'referendum',
    seats: 1,
    status: 'closed',
    opensAt: stamp(-210, 0, 0),
    closesAt: stamp(-196, 23, 59),
    quorum: 20,
    options: [
      {
        id: 'o-yes',
        name: 'Approve',
        subtitle: '$900 per unit, six instalments',
        statement: 'Funds the full roof replacement without a reserve loan.',
      },
      {
        id: 'o-no',
        name: 'Reject',
        subtitle: 'Seek financing instead',
        statement: 'Directs the Board to obtain a reserve loan and repay through regular dues.',
      },
    ],
    eligible: true,
    eligibilityNote: 'Verified against the unit-owner registry · Unit 142',
    hasVoted: true,
    receiptCode: 'WC-4F2A-91K7',
    ballotsCast: 168,
    eligibleVoters: 211,
    results: [
      { optionId: 'o-yes', votes: 121 },
      { optionId: 'o-no', votes: 47 },
    ],
  },
];

// ── Payments ────────────────────────────────────────────────────────────────

const firstOfNextMonth = () => {
  const d = new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1);
  return toISODate(d);
};

export const charges: Charge[] = [
  {
    id: 'ch-dues',
    label: 'Monthly assessment',
    detail: 'Regular dues · September 2026',
    kind: 'dues',
    amountCents: 38500,
    dueDate: firstOfNextMonth(),
    paid: false,
  },
  {
    id: 'ch-assessment',
    label: 'Roof reserve assessment',
    detail: 'Special assessment · instalment 2 of 6',
    kind: 'assessment',
    amountCents: 15000,
    dueDate: firstOfNextMonth(),
    paid: false,
  },
  {
    id: 'ch-fine',
    label: 'Violation fine — VIO-2481',
    detail: 'Refuse container left at curb',
    kind: 'fine',
    amountCents: 5000,
    dueDate: day(6),
    paid: false,
  },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'pm-ach',
    kind: 'ach',
    label: 'Chase checking',
    detail: '•••• 8891 · no processing fee',
    isDefault: true,
  },
  {
    id: 'pm-visa',
    kind: 'card',
    label: 'Visa',
    detail: '•••• 4242 · exp 09/29',
    isDefault: false,
  },
];

export const autopay: Autopay = {
  enabled: false,
  methodId: 'pm-ach',
  dayOfMonth: 1,
};

export const ledger: LedgerEntry[] = [
  {
    id: 'l-9',
    label: 'Violation fine — VIO-2481',
    at: stamp(-1, 9, 0),
    amountCents: 5000,
    kind: 'fine',
    method: null,
  },
  {
    id: 'l-8',
    label: 'Monthly assessment — August',
    at: stamp(-16, 0, 5),
    amountCents: 38500,
    kind: 'dues',
    method: null,
  },
  {
    id: 'l-7',
    label: 'Payment received',
    at: stamp(-15, 7, 42),
    amountCents: -53500,
    kind: 'payment',
    method: 'Chase checking •••• 8891',
  },
  {
    id: 'l-6',
    label: 'Roof reserve assessment — instalment 1',
    at: stamp(-16, 0, 5),
    amountCents: 15000,
    kind: 'assessment',
    method: null,
  },
  {
    id: 'l-5',
    label: 'Monthly assessment — July',
    at: stamp(-47, 0, 5),
    amountCents: 38500,
    kind: 'dues',
    method: null,
  },
  {
    id: 'l-4',
    label: 'Payment received',
    at: stamp(-44, 19, 3),
    amountCents: -38500,
    kind: 'payment',
    method: 'Visa •••• 4242',
  },
  {
    id: 'l-3',
    label: 'Late charge — July assessment',
    at: stamp(-31, 0, 10),
    amountCents: 2500,
    kind: 'late_fee',
    method: null,
  },
  {
    id: 'l-2',
    label: 'Payment received',
    at: stamp(-30, 12, 18),
    amountCents: -2500,
    kind: 'payment',
    method: 'Chase checking •••• 8891',
  },
  {
    id: 'l-1',
    label: 'Monthly assessment — June',
    at: stamp(-78, 0, 5),
    amountCents: 38500,
    kind: 'dues',
    method: null,
  },
];

// ── Inbox ───────────────────────────────────────────────────────────────────

export const messages: Message[] = [
  {
    id: 'msg-1',
    kind: 'announcement',
    subject: 'Ballot open: two board seats and the landscaping referendum',
    body: "Voting is now open for the 2026 Board of Directors election (two seats) and the landscaping contract referendum.\n\nBallots are secret. Your identity is verified against the unit-owner registry before your ballot is accepted, then separated from the ballot before tabulation — no one, including the Board, can see how a unit voted.\n\nThe board election closes in six days. Turnout is at 45% of eligible units; we need 20% for quorum, which we've cleared, but a thin margin on a five-year contract is not a mandate. Please vote.",
    fromName: 'Willow Creek Board',
    fromRole: 'Board of Directors',
    sentAt: stamp(-2, 17, 30),
    read: false,
    pinned: true,
    replies: [],
  },
  {
    id: 'msg-2',
    kind: 'direct',
    subject: 'Your ARC application (ARC-118)',
    body: "Hi Alex — your pergola application passed the completeness check and is on the agenda for the committee meeting on the second Tuesday.\n\nOne note ahead of the meeting: the elevation shows a 9 ft peak, which is fine, but the site plan dimension to the rear line is hard to read. If you have a cleaner copy, send it over and I'll swap it in the packet.\n\nNothing is blocked either way — the committee can ask for it at the meeting if needed.",
    fromName: 'Dana Whitfield',
    fromRole: 'Community Association Manager',
    sentAt: stamp(-2, 11, 5),
    read: false,
    pinned: false,
    replies: [],
  },
  {
    id: 'msg-3',
    kind: 'announcement',
    subject: 'Pool closing for annual maintenance — 28 September',
    body: 'The pool and cabana close for the season on Sunday 28 September at 8:00 PM.\n\nDrain-down and cover installation run the following week. The fitness studio and clubhouse keep normal hours throughout. Cabana reservations after the 28th have been released automatically and no charge was applied.',
    fromName: 'Willow Creek Board',
    fromRole: 'Board of Directors',
    sentAt: stamp(-6, 9, 0),
    read: true,
    pinned: false,
    replies: [],
  },
  {
    id: 'msg-4',
    kind: 'direct',
    subject: 'Path light near the mail kiosk (SR-3320)',
    body: "Thanks for reporting this. Piedmont replaced the photocell on Thursday but the fixture is still cutting out, so they've ordered a ballast. It should be in by the end of next week.\n\nI've asked them to check the other three bollards on that run while they're on site.",
    fromName: 'Dana Whitfield',
    fromRole: 'Community Association Manager',
    sentAt: stamp(-2, 16, 5),
    read: true,
    pinned: false,
    replies: [
      {
        id: 'rep-1',
        body: 'Appreciate the update — no rush, just wanted it on the list before it gets dark earlier.',
        at: stamp(-2, 18, 40),
        mine: true,
      },
    ],
  },
  {
    id: 'msg-5',
    kind: 'announcement',
    subject: 'Refuse collection moves to Wednesday for Labor Day week',
    body: 'Collection shifts one day later for the holiday week only. Containers may go out after 6:00 PM Tuesday and must be back in screened storage by 8:00 PM Wednesday.\n\nThe enforcement walk that week is Thursday.',
    fromName: 'Willow Creek Board',
    fromRole: 'Board of Directors',
    sentAt: stamp(-11, 14, 20),
    read: true,
    pinned: false,
    replies: [],
  },
  {
    id: 'msg-6',
    kind: 'announcement',
    subject: 'Architectural Review Guidelines updated to v4.1',
    body: 'Version 4.1 adds three composite decking products to the approved materials list and clarifies the setback measurement for freestanding structures.\n\nThis revision requires an acknowledgment from every owner. You can read and acknowledge it in the Document Centre — it takes about a minute.',
    fromName: 'Willow Creek Board',
    fromRole: 'Board of Directors',
    sentAt: stamp(-9, 10, 0),
    read: true,
    pinned: false,
    replies: [],
  },
];

export const notificationPrefs: NotificationPrefs = {
  push: true,
  email: true,
  sms: false,
  categories: {
    announcements: true,
    reservations: true,
    billing: true,
    compliance: true,
    elections: true,
  },
};

// ── Directories ─────────────────────────────────────────────────────────────

export const directory: DirectoryEntry[] = [
  {
    id: 'de-1',
    name: 'Ifeoma Okafor',
    unit: 'Unit 27',
    email: 'ifeoma.o@example.com',
    phone: '(919) 555-0127',
    memberSince: '2015-04-02',
    interests: ['Landscape committee', 'Gardening'],
  },
  {
    id: 'de-2',
    name: 'Thanh Nguyen',
    unit: 'Unit 88',
    email: 'thanh.n@example.com',
    phone: null,
    memberSince: '2018-09-19',
    interests: ['Finance', 'Pickleball'],
  },
  {
    id: 'de-3',
    name: 'Marisol Duarte',
    unit: 'Unit 51',
    email: null,
    phone: '(919) 555-0151',
    memberSince: '2020-02-28',
    interests: ['Book club', 'Dog park'],
  },
  {
    id: 'de-4',
    name: 'Erik Halvorsen',
    unit: 'Unit 190',
    email: 'erik.h@example.com',
    phone: '(919) 555-0190',
    memberSince: '2022-07-11',
    interests: ['Tennis', 'Neighborhood watch'],
  },
  {
    id: 'de-5',
    name: 'Priya Bhatt',
    unit: 'Unit 61',
    email: 'priya.b@example.com',
    phone: null,
    memberSince: '2019-11-05',
    interests: ['Events', 'Clubhouse programming'],
  },
  {
    id: 'de-6',
    name: 'Samuel Adeyemi',
    unit: 'Unit 104',
    email: null,
    phone: null,
    memberSince: '2023-03-16',
    interests: ['Cycling'],
  },
  {
    id: 'de-7',
    name: 'Grace Lindqvist',
    unit: 'Unit 12',
    email: 'grace.l@example.com',
    phone: '(919) 555-0112',
    memberSince: '2016-08-30',
    interests: ['Garden plots', 'Composting'],
  },
  {
    id: 'de-8',
    name: 'Devon Carraway',
    unit: 'Unit 173',
    email: 'devon.c@example.com',
    phone: null,
    memberSince: '2021-01-24',
    interests: ['Pickleball', 'Grilling'],
  },
];

export const serviceProviders: ServiceProvider[] = [
  {
    id: 'sp-1',
    name: 'Marisol Duarte',
    category: 'Childcare',
    kind: 'resident',
    blurb: 'Evening and weekend sitting for ages 2+. CPR certified, references from four units.',
    rateLabel: '$22/hr',
    phone: '(919) 555-0151',
    rating: 4.9,
    reviewCount: 23,
    verified: true,
    unit: 'Unit 51',
  },
  {
    id: 'sp-2',
    name: 'Grace Lindqvist',
    category: 'Notary',
    kind: 'resident',
    blurb: 'Commissioned NC notary. Mobile within the community, usually same-day.',
    rateLabel: '$10/signature',
    phone: '(919) 555-0112',
    rating: 5.0,
    reviewCount: 41,
    verified: true,
    unit: 'Unit 12',
  },
  {
    id: 'sp-3',
    name: 'Willow Walkers',
    category: 'Pets',
    kind: 'resident',
    blurb: 'Midday dog walking run by two teenagers in the community. 30 or 60 minute loops.',
    rateLabel: '$15 / 30 min',
    phone: '(919) 555-0166',
    rating: 4.8,
    reviewCount: 57,
    verified: true,
    unit: 'Unit 166',
  },
  {
    id: 'sp-4',
    name: 'Samuel Adeyemi',
    category: 'Tutoring',
    kind: 'resident',
    blurb: 'High-school maths and physics. Meets in the clubhouse study room.',
    rateLabel: '$40/hr',
    phone: '(919) 555-0104',
    rating: 4.9,
    reviewCount: 18,
    verified: true,
    unit: 'Unit 104',
  },
  {
    id: 'sp-5',
    name: 'Piedmont Electric',
    category: 'Home repair',
    kind: 'external',
    blurb: 'The association’s common-area electrician. Also takes unit calls at the contract rate.',
    rateLabel: '$95 call-out',
    phone: '(919) 555-0308',
    rating: 4.6,
    reviewCount: 112,
    verified: true,
    unit: null,
  },
  {
    id: 'sp-6',
    name: 'Kestrel Handyman Co.',
    category: 'Home repair',
    kind: 'external',
    blurb: 'Drywall, doors, gutter cleaning, small carpentry. Licensed and insured.',
    rateLabel: '$75/hr, 2 hr min',
    phone: '(919) 555-0411',
    rating: 4.4,
    reviewCount: 86,
    verified: true,
    unit: null,
  },
  {
    id: 'sp-7',
    name: 'Carolina Green',
    category: 'Landscaping',
    kind: 'external',
    blurb: 'Community grounds contractor. Offers private lot work at a resident rate.',
    rateLabel: 'Quote on request',
    phone: '(919) 555-0290',
    rating: 4.2,
    reviewCount: 64,
    verified: true,
    unit: null,
  },
  {
    id: 'sp-8',
    name: 'Tidewater Cleaning',
    category: 'Cleaning',
    kind: 'external',
    blurb: 'Recurring and move-out cleans. Background-checked crews, bonded.',
    rateLabel: 'From $140/visit',
    phone: '(919) 555-0355',
    rating: 4.7,
    reviewCount: 139,
    verified: true,
    unit: null,
  },
  {
    id: 'sp-9',
    name: 'Devon Carraway',
    category: 'Pets',
    kind: 'resident',
    blurb: 'Overnight pet sitting in your home. Dogs, cats and one memorable parrot.',
    rateLabel: '$55/night',
    phone: '(919) 555-0173',
    rating: 5.0,
    reviewCount: 12,
    verified: true,
    unit: 'Unit 173',
  },
];
