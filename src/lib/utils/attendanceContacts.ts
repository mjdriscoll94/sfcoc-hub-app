export const ATTENDANCE_CONTACT_OUTCOMES = [
  'contacted_with_response',
  'not_coming_back',
  'reached_out_no_response',
] as const;

export type AttendanceContactOutcome = (typeof ATTENDANCE_CONTACT_OUTCOMES)[number];

export const ATTENDANCE_CONTACT_OUTCOME_LABELS: Record<AttendanceContactOutcome, string> = {
  contacted_with_response: 'Contacted with response',
  not_coming_back: 'Contacted, not coming back',
  reached_out_no_response: 'Reached out, no response',
};

export const attendanceContactOutcomeAllowsNotes = (outcome: AttendanceContactOutcome): boolean =>
  outcome === 'contacted_with_response' || outcome === 'not_coming_back';

export const isAttendanceContactOutcome = (value: unknown): value is AttendanceContactOutcome =>
  typeof value === 'string' && ATTENDANCE_CONTACT_OUTCOMES.includes(value as AttendanceContactOutcome);
