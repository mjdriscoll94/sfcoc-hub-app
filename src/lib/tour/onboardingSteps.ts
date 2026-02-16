import type { StepOptions } from 'shepherd.js';

/** Check if element exists and is visible (not in a display:none parent) */
function isElementVisible(selector: string): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.querySelector(selector);
  return !!(el && (el as HTMLElement).offsetParent !== null);
}

/** Attach to element only if visible (e.g. desktop nav); otherwise step will be centered (mobile) */
function attachToIfVisible(
  selector: string,
  on: 'top' | 'bottom' | 'left' | 'right'
): { attachTo?: { element: string; on: string } } {
  return isElementVisible(selector)
    ? { attachTo: { element: selector, on } }
    : {};
}

const defaultButtons = (
  tour: { next: () => void; back: () => void; complete: () => void },
  options?: { showBack?: boolean }
) => [
  ...(options?.showBack !== false ? [{
    text: 'Back',
    action: tour.back,
    secondary: true,
    classes: 'shepherd-button-secondary'
  }] : []),
  {
    text: 'Next',
    action: tour.next,
    classes: 'shepherd-button-primary'
  }
];

const lastStepButtons = (tour: { complete: () => void }) => [
  {
    text: 'Back',
    action: tour.back,
    secondary: true,
    classes: 'shepherd-button-secondary'
  },
  {
    text: 'Finish',
    action: tour.complete,
    classes: 'shepherd-button-primary'
  }
];

export function getOnboardingSteps(hasUser: boolean): StepOptions[] {
  const steps: StepOptions[] = [
    {
      id: 'welcome',
      title: 'Welcome to SFCOC Hub',
      text: "Let's take a quick tour of the app. You'll learn where to find sermons, give, connect with the church, and more.",
      buttons: (tour) => defaultButtons(tour, { showBack: false }),
      scrollTo: false
    },
    {
      id: 'nav-home',
      title: 'Home',
      text: isElementVisible('[data-tour="nav-home"]')
        ? 'Start here to see church events and announcements on the homepage.'
        : 'Start at Home to see church events and announcements. On mobile, tap the menu icon (☰) at the top to access navigation.',
      ...attachToIfVisible('[data-tour="nav-home"]', 'bottom'),
      buttons: (tour) => defaultButtons(tour, { showBack: true }),
      scrollTo: { behavior: 'smooth', block: 'center' }
    },
    {
      id: 'nav-resources',
      title: 'Resources',
      text: 'Access lesson notes, bulletins, and our podcast. Click to expand and see all options.',
      ...attachToIfVisible('[data-tour="nav-resources"]', 'bottom'),
      buttons: (tour) => defaultButtons(tour, { showBack: true }),
      scrollTo: { behavior: 'smooth', block: 'center' }
    },
    {
      id: 'nav-give',
      title: 'Give',
      text: 'Give online to support the church. Secure giving is available anytime.',
      ...attachToIfVisible('[data-tour="nav-give"]', 'bottom'),
      buttons: (tour) => defaultButtons(tour, { showBack: true }),
      scrollTo: { behavior: 'smooth', block: 'center' }
    }
  ];

  if (hasUser) {
    steps.push({
      id: 'nav-connect',
      title: 'Connect',
      text: 'Prayer Board, Announcements, Volunteer opportunities, Calendar, and Life Groups—all in one place.',
      ...attachToIfVisible('[data-tour="nav-connect"]', 'bottom'),
      buttons: (tour) => defaultButtons(tour, { showBack: true }),
      scrollTo: { behavior: 'smooth', block: 'center' }
    });
    steps.push({
      id: 'nav-user',
      title: 'Your Account',
      text: 'Access Settings, Service Roles, and sign out from your profile menu.',
      ...attachToIfVisible('[data-tour="nav-user"]', 'left'),
      buttons: (tour) => lastStepButtons(tour),
      scrollTo: { behavior: 'smooth', block: 'center' }
    });
  } else {
    steps.push({
      id: 'sign-in',
      title: 'Sign In for More',
      text: "Sign in to access Prayer Board, Announcements, Volunteer opportunities, Calendar, and Life Groups. You can always retake this tour from Settings after signing in.",
      buttons: (tour) => lastStepButtons(tour),
      scrollTo: false
    });
  }

  // Update last step to use lastStepButtons
  const lastIndex = steps.length - 1;
  if (lastIndex > 0) {
    steps[lastIndex].buttons = (tour) => lastStepButtons(tour);
  }

  return steps;
}
