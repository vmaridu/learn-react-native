import type { KnowledgeEntry } from './types';

/**
 * The assistant's entire world. Every answer is grounded in a document that
 * exists in this community's own Document Centre (FR-COM-02), and every answer
 * carries its citation (FR-COM-06). There is no model call here and no general
 * knowledge — ask it about the weather and it will tell you it does not know.
 */
export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'k-refuse',
    keywords: ['trash', 'refuse', 'bin', 'garbage', 'container', 'curb', 'collection'],
    answer:
      'Refuse containers must be stored out of view from the street, except between 6:00 PM the day before collection and 8:00 PM on collection day. Anything left out past that window is a violation, and the Board has adopted a $50 fine for it.\n\nDuring the Labor Day week only, collection shifts one day later and the window moves with it.',
    citations: [
      { documentId: 'd-ccrs', title: 'CC&Rs', locator: 'Article VII §7.3' },
      { documentId: 'd-minutes-jul', title: 'Board Minutes — July 2026', locator: 'Fine schedule' },
    ],
  },
  {
    id: 'k-dues',
    keywords: ['dues', 'assessment', 'monthly', 'how much', 'pay', 'fee', 'cost', '385'],
    answer:
      'The regular monthly assessment for 2026 is $385.00 per unit — a 3.2% increase over 2025, calculated from an $988,200 operating budget across 214 units.\n\nOn top of that, the roof reserve special assessment is $150.00 per month for six instalments. You are on instalment 2 of 6.',
    citations: [
      { documentId: 'd-budget', title: 'Operating Budget 2026', locator: 'Assessment calculation' },
      { documentId: 'd-ccrs', title: 'CC&Rs', locator: 'Article IV — Assessments' },
    ],
  },
  {
    id: 'k-late',
    keywords: ['late', 'overdue', 'delinquent', 'grace', 'past due'],
    answer:
      'Assessments are due on the first of the month. Anything not received within 15 days of the due date is delinquent and picks up a late charge set by Board resolution. Unpaid assessments remain a continuing lien on the lot.',
    citations: [{ documentId: 'd-ccrs', title: 'CC&Rs', locator: 'Article IV — Assessments' }],
  },
  {
    id: 'k-fence',
    keywords: ['fence', 'fencing', 'chain link'],
    answer:
      'Fences may be up to 6 feet in rear yards and 4 feet in side yards forward of the rear building line. Chain link is prohibited anywhere visible from a street or common area. Any fence needs ARC approval before work starts.',
    citations: [
      { documentId: 'd-arch', title: 'Architectural Review Guidelines v4.1', locator: 'Fences' },
      { documentId: 'd-ccrs', title: 'CC&Rs', locator: 'Article IX' },
    ],
  },
  {
    id: 'k-pergola',
    keywords: ['pergola', 'gazebo', 'arbor', 'structure', 'shed', 'height', 'setback'],
    answer:
      'Freestanding structures are capped at 12 feet in height and 200 square feet of footprint, and must sit at least 5 feet from any property line. Materials must be cedar, redwood, or an approved composite, in natural or an ARC-listed stain.\n\nYour own pergola application (ARC-118) is currently under committee review.',
    citations: [
      {
        documentId: 'd-arch',
        title: 'Architectural Review Guidelines v4.1',
        locator: 'Structures — pergolas, arbors, gazebos',
      },
    ],
  },
  {
    id: 'k-arc-timeline',
    keywords: ['arc', 'architectural', 'approval', 'how long', 'committee', 'review', 'submit'],
    answer:
      'The Architectural Review Committee meets on the second Tuesday of each month. A complete application received at least 7 days before a meeting goes on that agenda, and a decision is issued within 45 days of a complete submission.\n\nA complete application means: site plan with setbacks, elevations or manufacturer specs, materials list with colour samples, contractor name and licence number, and estimated start and completion dates.',
    citations: [
      {
        documentId: 'd-arch',
        title: 'Architectural Review Guidelines v4.1',
        locator: 'Submission checklist · Review timeline',
      },
    ],
  },
  {
    id: 'k-paint',
    keywords: ['paint', 'colour', 'color', 'stain', 'palette'],
    answer:
      'Any change in exterior colour needs written ARC approval before work begins — that includes stain. The approved palette is in the Architectural Review Guidelines; Cedar Naturaltone is item 14 on it.',
    citations: [
      { documentId: 'd-ccrs', title: 'CC&Rs', locator: 'Article IX — Architectural Control' },
      { documentId: 'd-arch', title: 'Architectural Review Guidelines v4.1', locator: 'Approved palette' },
    ],
  },
  {
    id: 'k-pool',
    keywords: ['pool', 'swim', 'season', 'cabana', 'hours', 'close', 'closing'],
    answer:
      'The pool runs from the Saturday of Memorial Day weekend through the last Sunday in September, 10:00 AM to 8:00 PM daily. This year it closes on 28 September at 8:00 PM.\n\nBooking the cabana does not reserve the pool itself, and glass is prohibited inside the pool fence.',
    citations: [
      { documentId: 'd-pool', title: 'Pool, Cabana & Garden Rules', locator: 'Hours & season' },
    ],
  },
  {
    id: 'k-guests',
    keywords: ['guest', 'guests', 'visitor', 'friends'],
    answer:
      'Each unit may bring up to 8 guests to the pool, and they must be accompanied by a resident 18 or older inside the pool fence.\n\nFor parking, guests may use marked visitor spaces for up to 72 consecutive hours; longer stays need a pass from the association.',
    citations: [
      { documentId: 'd-pool', title: 'Pool, Cabana & Garden Rules', locator: 'Guests' },
      { documentId: 'd-parking', title: 'Parking & Vehicle Policy', locator: 'Guest parking' },
    ],
  },
  {
    id: 'k-parking',
    keywords: ['park', 'parking', 'street', 'car', 'boat', 'trailer', 'rv', 'camper', 'tow'],
    answer:
      'Garage and driveway first, then street parking on the even-numbered side only — never within 15 feet of a hydrant or the mail kiosk.\n\nBoats, trailers, campers and commercial vehicles over 3/4 ton cannot sit on a lot or street for more than 24 hours.',
    citations: [
      { documentId: 'd-parking', title: 'Parking & Vehicle Policy', locator: 'Resident parking · Prohibited vehicles' },
    ],
  },
  {
    id: 'k-election',
    keywords: ['election', 'vote', 'voting', 'ballot', 'board', 'quorum', 'secret', 'director'],
    answer:
      'The Board has five directors on staggered two-year terms; two seats are up this year. Quorum for a membership meeting is 20% of voting interests, and ballots may be cast electronically.\n\nBallots are secret: the system separates your ballot from any owner-identifying record before tabulation, and the tabulation record is kept for one year.',
    citations: [
      { documentId: 'd-bylaws', title: 'Association Bylaws', locator: 'Article III · IV · V' },
    ],
  },
  {
    id: 'k-roof',
    keywords: ['roof', 'reserve', 'special assessment', '900'],
    answer:
      'The roof reserve special assessment is $900 per unit, payable in six monthly instalments of $150. It passed 121–47 in the referendum.\n\nAs of the July board meeting the roof reserve sits at 61% of the funding plan target, and the Board voted 5-0 to run the assessment through November 2026.',
    citations: [
      { documentId: 'd-minutes-jul', title: 'Board Minutes — July 2026', locator: 'Roof reserve' },
      { documentId: 'd-budget', title: 'Operating Budget 2026', locator: 'Reserve contribution' },
    ],
  },
  {
    id: 'k-garden',
    keywords: ['garden', 'shed', 'code', 'tools', 'plot', 'compost'],
    answer:
      'The community garden has raised 4×8 beds on a shared drip timer. The green shed keypad code is 4-2-9-1 and rotates each spring — return tools clean and closed.',
    citations: [
      { documentId: 'd-pool', title: 'Pool, Cabana & Garden Rules', locator: 'Garden shed' },
    ],
  },
  {
    id: 'k-services',
    keywords: [
      'nanny',
      'babysitter',
      'sitter',
      'notary',
      'dog walker',
      'dog walking',
      'tutor',
      'handyman',
      'electrician',
      'cleaner',
      'cleaning',
      'plumber',
    ],
    answer:
      'The Service Directory lists both neighbours who offer services and external providers the association works with — childcare, pet care, tutoring, notary, home repair, landscaping and cleaning.\n\nA few residents run services here: Marisol Duarte (childcare, Unit 51), Grace Lindqvist (notary, Unit 12), Willow Walkers (dog walking) and Samuel Adeyemi (maths and physics tutoring, Unit 104). Piedmont Electric is the association’s common-area electrician and also takes unit calls.',
    citations: [
      { documentId: 'd-ccrs', title: 'Service Directory', locator: 'Verified providers' },
    ],
  },
  {
    id: 'k-rental',
    keywords: ['rent', 'rental', 'lease', 'airbnb', 'short-term', 'tenant'],
    answer:
      'A short-term rental restriction was added to the Declaration in version 3.1 (August 2024). The current recorded version is 3.2 — read Article XII and the amendment history in the Document Centre for the exact wording before listing a unit.',
    citations: [
      { documentId: 'd-ccrs', title: 'CC&Rs', locator: 'Version history — v3.1' },
    ],
  },
  {
    id: 'k-dispute',
    keywords: ['dispute', 'violation', 'fine', 'appeal', 'contest', 'notice'],
    answer:
      'You can dispute a violation from its detail screen. Management has 30 days to respond, and the fine is held while the dispute is open.\n\nYou currently have one open violation — VIO-2481, refuse container left at curb, with a $50 fine.',
    citations: [
      { documentId: 'd-ccrs', title: 'CC&Rs', locator: 'Article VII §7.3' },
    ],
  },
];

export const SUGGESTED_QUESTIONS = [
  'When can I put my bins out?',
  'How much are my dues and what are they for?',
  'How tall can a fence be?',
  'How long does ARC approval take?',
  'When does the pool close?',
  'How does voting stay anonymous?',
] as const;
