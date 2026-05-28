'use client';

import { useEffect } from 'react';
import { ChurchCalendar } from '@/components/calendar/ChurchCalendar';

export default function CalendarPage() {
  useEffect(() => {
    document.title = 'Calendar | Sioux Falls Church of Christ';
  }, []);

  return (
    <ChurchCalendar
      readOnly
      title="Church Calendar"
      subtitle="View church events and activities. Click a day for details, or subscribe to stay updated."
    />
  );
}
