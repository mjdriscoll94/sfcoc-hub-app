import { redirect } from 'next/navigation';

export default function LegacyMemberEventsPage() {
  redirect('/admin/households/events');
}
