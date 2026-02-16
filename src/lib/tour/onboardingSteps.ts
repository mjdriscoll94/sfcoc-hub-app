import type { StepOptions } from 'shepherd.js';

function isElementVisible(selector: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.querySelector(selector);
  return !!(el && (el as HTMLElement).offsetParent !== null);
}

function attachToIfVisible(
  selector: string,
  on: 'top' | 'bottom' | 'left' | 'right'
): Partial<StepOptions> {
  return isElementVisible(selector) ? { attachTo: { element: selector, on } } : {};
}

const navButtons = (tour: { next: () => void; back: () => void }) => [
  { text: 'Back', action: tour.back, secondary: true, classes: 'shepherd-button-secondary' },
  { text: 'Next', action: tour.next, classes: 'shepherd-button-primary' }
];

const finishButtons = (tour: { complete: () => void }) => [
  { text: 'Back', action: tour.back, secondary: true, classes: 'shepherd-button-secondary' },
  { text: 'Finish', action: tour.complete, classes: 'shepherd-button-primary' }
];

export function getOnboardingSteps(hasUser: boolean): StepOptions[] {
  const steps: StepOptions[] = [
    {
      id: 'welcome',
      title: 'Welcome to SFCOC Hub',
      text: "Let's take a quick tour. We'll show you the navigation menu and where to find events and gatherings.",
      buttons: (tour) => navButtons(tour),
      scrollTo: false
    },
    {
      id: 'nav-home',
      title: 'Home',
      text: 'Return to the homepage anytime for church events and announcements.',
      ...attachToIfVisible('[data-tour="nav-home"]', 'bottom'),
      buttons: (tour) => navButtons(tour),
      scrollTo: { behavior: 'smooth', block: 'center' }
    },
    {
      id: 'nav-resources',
      title: 'Resources',
      text: 'Lesson notes, bulletins, and the Beyond Sunday podcast. Click to expand and browse.',
      ...attachToIfVisible('[data-tour="nav-resources"]', 'bottom'),
      buttons: (tour) => navButtons(tour),
      scrollTo: { behavior: 'smooth', block: 'center' }
    },
    {
      id: 'nav-give',
      title: 'Give',
      text: 'Give online to support the church. Secure giving is available anytime.',
      ...attachToIfVisible('[data-tour="nav-give"]', 'bottom'),
      buttons: (tour) => navButtons(tour),
      scrollTo: { behavior: 'smooth', block: 'center' }
    },
    {
      id: 'events',
      title: 'Events',
      text: "Our regular gatherings—Sunday Service, Wednesday Study, Sunday Fellowship, and more. Click a category to expand and see times and details.",
      ...attachToIfVisible('[data-tour="events-section"]', 'top'),
      buttons: (tour) => navButtons(tour),
      scrollTo: { behavior: 'smooth', block: 'center' }
    }
  ];

  if (hasUser) {
    steps.push({
      id: 'nav-connect',
      title: 'Connect',
      text: 'Prayer Board, Announcements, Volunteer opportunities, Calendar, and Life Groups.',
      ...attachToIfVisible('[data-tour="nav-connect"]', 'bottom'),
      buttons: (tour) => navButtons(tour),
      scrollTo: { behavior: 'smooth', block: 'center' }
    });
    steps.push({
      id: 'nav-user',
      title: 'Your Account',
      text: 'Settings, Service Roles, and sign out. Access your profile from here.',
      ...attachToIfVisible('[data-tour="nav-user"]', 'left'),
      buttons: (tour) => finishButtons(tour),
      scrollTo: { behavior: 'smooth', block: 'center' }
    });
  } else {
    steps.push({
      id: 'sign-in',
      title: 'Sign In for More',
      text: "Sign in to access Prayer Board, Announcements, Volunteer opportunities, and more. You can retake this tour from Settings anytime.",
      buttons: (tour) => finishButtons(tour),
      scrollTo: false
    });
  }

  return steps;
}
