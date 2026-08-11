export interface LineItemTemplate {
  id: string;
  description: string;
  category: 'Cat A' | 'Cat B';
  section: string;
}

export const LINE_ITEM_SECTIONS = [
  'First Check',
  'Inside Cabin',
  'Outside Cabin',
  'Fire & Safety Equipment',
  'Tyres & Vehicle Condition',
  'Additional'
] as const;

export const LINE_ITEM_TEMPLATES: LineItemTemplate[] = [
  // First Check (Before Start)
  { id: 'fc-1', description: 'Check vehicle cleanliness', category: 'Cat A', section: 'First Check' },
  { id: 'fc-2', description: 'Check fluid levels (oil, coolant, brake)', category: 'Cat A', section: 'First Check' },
  { id: 'fc-3', description: 'Check battery condition and terminals', category: 'Cat B', section: 'First Check' },
  { id: 'fc-4', description: 'Check all lights are functioning', category: 'Cat A', section: 'First Check' },
  { id: 'fc-5', description: 'Check horn operation', category: 'Cat A', section: 'First Check' },
  { id: 'fc-6', description: 'Check mirrors condition', category: 'Cat A', section: 'First Check' },

  // Inside Cabin
  { id: 'ic-1', description: 'Dashboard warning lights check', category: 'Cat A', section: 'Inside Cabin' },
  { id: 'ic-2', description: 'Seat belt condition and operation', category: 'Cat A', section: 'Inside Cabin' },
  { id: 'ic-3', description: 'Windscreen wipers and washers', category: 'Cat A', section: 'Inside Cabin' },
  { id: 'ic-4', description: 'Air conditioning / heater operation', category: 'Cat B', section: 'Inside Cabin' },
  { id: 'ic-5', description: 'Radio and communication equipment', category: 'Cat B', section: 'Inside Cabin' },
  { id: 'ic-6', description: 'Cleanliness of cabin interior', category: 'Cat A', section: 'Inside Cabin' },
  { id: 'ic-7', description: 'Pedal condition (brake, clutch, accelerator)', category: 'Cat A', section: 'Inside Cabin' },

  // Outside Cabin
  { id: 'oc-1', description: 'Bodywork condition - dents, scratches', category: 'Cat A', section: 'Outside Cabin' },
  { id: 'oc-2', description: 'Windscreen condition - chips, cracks', category: 'Cat A', section: 'Outside Cabin' },
  { id: 'oc-3', description: 'Side mirrors condition', category: 'Cat A', section: 'Outside Cabin' },
  { id: 'oc-4', description: 'Door handles and locks', category: 'Cat B', section: 'Outside Cabin' },
  { id: 'oc-5', description: 'Load area condition', category: 'Cat A', section: 'Outside Cabin' },
  { id: 'oc-6', description: 'Number plate condition and visibility', category: 'Cat A', section: 'Outside Cabin' },

  // Fire & Safety Equipment
  { id: 'fs-1', description: 'Fire extinguisher - valid and accessible', category: 'Cat A', section: 'Fire & Safety Equipment' },
  { id: 'fs-2', description: 'First aid kit - complete and accessible', category: 'Cat A', section: 'Fire & Safety Equipment' },
  { id: 'fs-3', description: 'Warning triangle - present and visible', category: 'Cat A', section: 'Fire & Safety Equipment' },
  { id: 'fs-4', description: 'Reflective vest - present', category: 'Cat B', section: 'Fire & Safety Equipment' },
  { id: 'fs-5', description: 'Spare wheel and tools', category: 'Cat B', section: 'Fire & Safety Equipment' },
  { id: 'fs-6', description: 'Jack and wheel spanner', category: 'Cat B', section: 'Fire & Safety Equipment' },

  // Tyres & Vehicle Condition
  { id: 'tv-1', description: 'Front left tyre tread depth', category: 'Cat A', section: 'Tyres & Vehicle Condition' },
  { id: 'tv-2', description: 'Front right tyre tread depth', category: 'Cat A', section: 'Tyres & Vehicle Condition' },
  { id: 'tv-3', description: 'Rear left tyre tread depth', category: 'Cat A', section: 'Tyres & Vehicle Condition' },
  { id: 'tv-4', description: 'Rear right tyre tread depth', category: 'Cat A', section: 'Tyres & Vehicle Condition' },
  { id: 'tv-5', description: 'Spare tyre condition', category: 'Cat B', section: 'Tyres & Vehicle Condition' },
  { id: 'tv-6', description: 'Tyre pressure check', category: 'Cat A', section: 'Tyres & Vehicle Condition' },
  { id: 'tv-7', description: 'Brake condition check', category: 'Cat A', section: 'Tyres & Vehicle Condition' },
  { id: 'tv-8', description: 'Suspension check', category: 'Cat B', section: 'Tyres & Vehicle Condition' },
  { id: 'tv-9', description: 'Exhaust condition', category: 'Cat B', section: 'Tyres & Vehicle Condition' },
];

export const WORKFLOW_STATUSES = [
  'awaiting_assignment',
  'mechanic_assigned',
  'subcontractor_assigned',
  'mechanic_accepted',
  'job_in_progress',
  'parts_outstanding',
  'parts_received',
  'returned_to_office',
  'job_completed',
  'quality_check_done',
  'job_cancelled'
] as const;

export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  awaiting_assignment: 'Awaiting Assignment',
  mechanic_assigned: 'Mechanic Assigned',
  subcontractor_assigned: 'Subcontractor Assigned',
  mechanic_accepted: 'Mechanic Accepted',
  job_in_progress: 'Job In Progress',
  parts_outstanding: 'Parts Outstanding',
  parts_received: 'Parts Received',
  returned_to_office: 'Returned to Office',
  job_completed: 'Job Completed',
  quality_check_done: 'Quality Check Done',
  job_cancelled: 'Job Cancelled'
};

export const STATUS_COLORS: Record<WorkflowStatus, string> = {
  awaiting_assignment: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  mechanic_assigned: 'bg-blue-100 text-blue-800 border-blue-300',
  subcontractor_assigned: 'bg-purple-100 text-purple-800 border-purple-300',
  mechanic_accepted: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  job_in_progress: 'bg-orange-100 text-orange-800 border-orange-300',
  parts_outstanding: 'bg-amber-100 text-amber-800 border-amber-300',
  parts_received: 'bg-teal-100 text-teal-800 border-teal-300',
  returned_to_office: 'bg-gray-100 text-gray-800 border-gray-300',
  job_completed: 'bg-green-100 text-green-800 border-green-300',
  quality_check_done: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  job_cancelled: 'bg-red-100 text-red-800 border-red-300'
};

export const RETURN_TO_OFFICE_REASONS = [
  'Incorrect Allocation',
  'No Capacity',
  'Parts Unavailable',
  'Requires Subcontractor',
  'Requires Specialist Technician',
  'Additional Work',
  'Other'
];

export const JOB_TYPES = [
  'Maintenance',
  'Service',
  'Repair',
  'Inspection',
  'Breakdown',
  'Accident Repair'
];

export const JOB_PRIORITIES = [
  { value: 'A', label: 'Priority A (Critical)' },
  { value: 'B', label: 'Priority B (High)' },
  { value: 'B#', label: 'Priority B# (Medium)' }
];

export const JOB_SOURCES = [
  { value: 'office', label: 'Office Created' },
  { value: 'defect', label: 'Logged Defect' },
  { value: 'inspection', label: 'Failed Inspection' }
];
