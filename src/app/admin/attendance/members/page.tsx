import { redirect } from 'next/navigation';

export default function LegacyAttendanceMembersPage() {
  redirect('/admin/households');
}
