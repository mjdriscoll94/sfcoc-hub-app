import { redirect } from 'next/navigation';

export default function LegacyBirthdayImportPage() {
  redirect('/admin/households/events/import');
}
