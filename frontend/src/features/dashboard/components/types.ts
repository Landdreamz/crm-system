export interface Communication {
  id: string;
  date: string; // ISO
  direction: 'out' | 'in';
  body: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // ISO date
  time?: string;
  notes?: string;
}

export interface ContactTask {
  id: string;
  title: string;
  dueDate?: string; // ISO date
  completed: boolean;
}

export type PipelineStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closing' | 'Won' | 'Lost';

export interface Contact {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  company: string;
  status: 'Lead' | 'Active' | 'Inactive';
  leadOwner?: string;
  /** @deprecated Use pipelineStages per pipeline id. May be default stage name or custom stage id. */
  pipelineStage?: PipelineStage | string;
  /** Stage id per pipeline id (default stages: Lead, Qualified, etc.; custom stages: stage-123) */
  pipelineStages?: Record<string, string>;
  lastContact: string;
  notes?: string;
  communications?: Communication[];
  appointments?: Appointment[];
  tasks?: ContactTask[];
  // Extended fields
  ownsMultiple?: string;
  phone2?: string;
  phone3?: string;
  phone4?: string;
  phone5?: string;
  phone6?: string;
  phone7?: string;
  phone8?: string;
  phone9?: string;
  phone10?: string;
  mailingAddress?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  propertyType?: string;
  lotSizeSqft?: string;
  totalAssessedValue?: string;
  subdivision?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  latitude?: string;
  longitude?: string;
  apn?: string;
  estimatedValue?: string;
  topography?: string;
  acres?: string;
  taxDelinquent?: string;
  taxDelinquentYear?: string;
  taxAmountDue?: string;
  salesPrice?: string;
  askingPrice?: string;
  salesDate?: string;
  dataSource?: string;
  /** Pipeline name/label (e.g. "Sales", "Land") for display in contacts table */
  pipeline?: string;
  /** Tags (e.g. ["VIP", "Follow-up"]) */
  tags?: string[];
  /** Full address (single line for display in contacts table) */
  fullAddress?: string;
  /** Temperature (e.g. "Hot", "Warm", "Cold") */
  temperature?: string;
  /** Other CRM ids where this contact also exists (e.g. ["dispo"] when viewing in ACQ). Used for cross-CRM visibility (ACQ vs Dispo). */
  alsoInCrmIds?: string[];
}

export type NewContact = Omit<Contact, 'id'>; 