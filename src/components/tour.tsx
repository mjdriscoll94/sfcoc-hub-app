"use client";
import { PropsWithChildren, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShepherdJourneyProvider, useShepherd } from "react-shepherd";
import type { StepOptions } from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";
import "./shepherd-overrides.css";

export const tourOptions = {
  defaultStepOptions: {
    cancelIcon: {
      enabled: true
    }
  },
  useModalOverlay: true
};

const TourInstance: React.FC<PropsWithChildren> = ({ children }) => {
  return <>{children}</>;
};

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const MOBILE_MAX_WIDTH = 767;

/** True when viewport is small (e.g. phone). Use when starting the tour. */
function isMobile(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  const w = window.innerWidth;
  if (w === 0 || w > MOBILE_MAX_WIDTH) return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

/** On mobile, use floating steps (no attachTo) so the tour fits the small screen. */
function stepsForViewport(steps: StepOptions[]): StepOptions[] {
  if (!isMobile()) return steps;
  return steps.map((step) => {
    const { attachTo: _attachTo, scrollTo: _scrollTo, ...rest } = step;
    return {
      ...rest,
      scrollTo: false,
      arrow: false,
    } as StepOptions;
  });
}

/** Hide the step briefly after show so it doesn't flash in the top-left before Floating UI positions it (e.g. after nav to home). */
function hideStepUntilPositioned(this: { el?: HTMLElement | null }) {
  const el = this?.el;
  if (el) {
    el.classList.add("shepherd-hide-until-positioned");
    setTimeout(() => el.classList.remove("shepherd-hide-until-positioned"), 120);
  }
}

/** Wait for an element to exist in the DOM (poll until found or timeout). */
function waitForElement(selector: string, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (document.querySelector(selector)) {
        resolve();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(); // resolve anyway so tour doesn't hang
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}

/** Mobile-only: step that attaches to the hamburger menu and opens it. */
const mobileNavMenuStep: StepOptions = {
  id: "mobile-nav-menu",
  title: "Menu",
  text: [
    "Tap the menu icon to open it. You can reach Prayer Board, Resources, and more from here.",
  ],
  attachTo: { element: "#nav-menu", on: "top" },
  scrollTo: true,
  canClickTarget: true,
  buttons: [
    {
      classes: "shepherd-custom-button-secondary",
      text: "Exit",
      action() {
        this.cancel();
      },
    },
    {
      classes: "shepherd-custom-button-primary",
      text: "Next",
      action() {
        this.next();
      },
    },
  ],
  when: {
    show: () => {
      document.getElementById("nav-menu")?.click();
    },
    hide: () => {},
  },
};

/** Mobile-only: prayer board steps (all floating, no attachTo) + back to home. */
function makePrayerBoardStepsMobile(
  router: ReturnType<typeof useRouter>
): StepOptions[] {
  return [
    {
      id: "mobile-prayer-go",
      title: "Prayer Board",
      text: [
        "Tap Prayer Board in the menu above, or click Next to go to the Prayer Board.",
      ],
      scrollTo: false,
      arrow: false,
      buttons: [
        {
          classes: "shepherd-custom-button-secondary",
          text: "Exit",
          action() {
            this.cancel();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Next",
          action() {
            window.dispatchEvent(new CustomEvent("sfcoc-close-mobile-menu"));
            router.push("/prayer-board");
            waitForElement("#prayer-board-filters", 8000).then(() => {
              setTimeout(() => this.next(), 400);
            });
          },
        },
      ],
    },
    {
      id: "mobile-prayer-filter",
      title: "Filter by type",
      text: ["Use these buttons to view All, Prayers only, or Praises only."],
      scrollTo: false,
      arrow: false,
      beforeShowPromise: () => waitForElement("#prayer-board-filters", 3000),
      buttons: [
        {
          classes: "shepherd-custom-button-secondary",
          text: "Exit",
          action() {
            this.cancel();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Back",
          action() {
            this.back();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Next",
          action() {
            this.next();
          },
        },
      ],
    },
    {
      id: "mobile-prayer-add",
      title: "Add a request or praise",
      text: ["Click here to submit a new prayer request or praise report."],
      scrollTo: false,
      arrow: false,
      beforeShowPromise: () => waitForElement("#prayer-board-add", 3000),
      buttons: [
        {
          classes: "shepherd-custom-button-secondary",
          text: "Exit",
          action() {
            this.cancel();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Back",
          action() {
            this.back();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Next",
          action() {
            router.push("/");
            waitForElement("#tour-home-hero", 8000).then(() => {
              setTimeout(() => this.next(), 400);
            });
          },
        },
      ],
    },
    {
      id: "mobile-prayer-done",
      title: "You're all set!",
      text: ["Thanks for taking the tour. Explore the hub anytime from the menu."],
      scrollTo: false,
      arrow: false,
      beforeShowPromise: () => waitForElement("#tour-home-hero", 3000),
      buttons: [
        {
          classes: "shepherd-custom-button-primary",
          text: "Done",
          action() {
            this.complete();
          },
        },
      ],
      when: {
        show: hideStepUntilPositioned,
        hide: () => {},
      },
    },
  ];
}

/** Build steps that need the router (fifth = navigate to prayer board, then steps on prayer board). */
function makePrayerBoardSteps(
  router: ReturnType<typeof useRouter>
): StepOptions[] {
  return [
    {
      id: "fifth",
      title: "Prayer Board",
      text: ["Let's go to the Prayer Board and see how it works. Click Next to continue."],
      attachTo: { element: "#nav-prayer-board", on: "top" },
      scrollTo: true,
      canClickTarget: true,
      buttons: [
        {
          classes: "shepherd-custom-button-secondary",
          text: "Exit",
          action() {
            this.cancel();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Next",
          action() {
            router.push("/prayer-board");
            waitForElement("#prayer-board-filters", 8000).then(() => {
              setTimeout(() => this.next(), 400);
            });
          },
        },
      ],
      when: {
        show: () => {
          document.getElementById("nav-connect")?.click();
        },
        hide: () => {},
      },
    },
    {
      id: "sixth",
      title: "Filter by type",
      text: ["Use these buttons to view All, Prayers only, or Praises only."],
      attachTo: { element: "#prayer-board-filters", on: "bottom" },
      scrollTo: true,
      beforeShowPromise: () => waitForElement("#prayer-board-filters", 3000),
      buttons: [
        {
          classes: "shepherd-custom-button-secondary",
          text: "Exit",
          action() {
            this.cancel();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Back",
          action() {
            this.back();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Next",
          action() {
            this.next();
          },
        },
      ],
    },
    {
      id: "seventh",
      title: "Add a request or praise",
      text: ["Click here to submit a new prayer request or praise report."],
      attachTo: { element: "#prayer-board-add", on: "left" },
      scrollTo: true,
      beforeShowPromise: () => waitForElement("#prayer-board-add", 3000),
      buttons: [
        {
          classes: "shepherd-custom-button-secondary",
          text: "Exit",
          action() {
            this.cancel();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Back",
          action() {
            this.back();
          },
        },
        {
          classes: "shepherd-custom-button-primary",
          text: "Next",
          action() {
            router.push("/");
            waitForElement("#tour-home-hero", 8000).then(() => {
              setTimeout(() => this.next(), 400);
            });
          },
        },
      ],
    },
    {
      id: "eighth",
      title: "You're all set!",
      text: ["Thanks for taking the tour. Explore the hub anytime from the navigation."],
      attachTo: { element: "#tour-home-hero", on: "bottom" },
      scrollTo: true,
      arrow: false,
      beforeShowPromise: () => waitForElement("#tour-home-hero", 3000),
      buttons: [
        {
          classes: "shepherd-custom-button-primary",
          text: "Done",
          action() {
            this.complete();
          },
        },
      ],
      when: {
        show: hideStepUntilPositioned,
        hide: () => {},
      },
    },
  ];
}

let _onboardingTourActive = false;

/** Whether the onboarding tour is currently running (e.g. we navigated to home for the last step). In-memory only so a refresh or new tab can start the tour. */
export function isOnboardingTourActive(): boolean {
  return _onboardingTourActive;
}

/** Call from a page (e.g. home) to start the onboarding tour. Invoke onComplete when tour is finished or cancelled. */
export function useOnboardingTour() {
  const Shepherd = useShepherd();
  const router = useRouter();
  return useCallback(
    (onComplete?: () => void) => {
      const tour = new Shepherd.Tour(tourOptions);
      const steps = isMobile()
        ? [homeSteps[0], mobileNavMenuStep, ...makePrayerBoardStepsMobile(router)]
        : stepsForViewport([
            ...homeSteps,
            ...makePrayerBoardSteps(router),
          ]);
      steps.forEach((step) => tour.addStep(step));
      if (onComplete) {
        const wrappedComplete = () => {
          _onboardingTourActive = false;
          onComplete();
        };
        tour.on("complete", wrappedComplete);
        tour.on("cancel", wrappedComplete);
      }
      _onboardingTourActive = true;
      tour.start();
    },
    [Shepherd, router]
  );
}

const homeSteps: StepOptions[] = [
  {
    id: "first",
    title: "Welcome to the SFCOC Information Hub",
    text: [
      "Let us take you on a journey to explore the most important features of our site",
    ],
    scrollTo: false,
    arrow: false,
    buttons: [
      {
        classes: "shepherd-custom-button-secondary",
        text: "Exit",
        action() {
          this.cancel();
        },
      },
      {
        classes: "shepherd-custom-button-primary",
        text: "Next",
        action() {
          this.next();
        },
      },
    ],
  },
  {
    id: "second",
    title: "App navigation bar",
    text: ["Explore how you can easily navigate through the app"],
    attachTo: { element: "#navigation", on: "bottom" },
    scrollTo: true,
    buttons: [
      {
        classes: "shepherd-custom-button-secondary",
        text: "Exit",
        action() {
          this.cancel();
        },
      },
      {
        classes: "shepherd-custom-button-primary",
        text: "Back",
        action() {
          this.back();
        },
      },
      {
        classes: "shepherd-custom-button-primary",
        text: "Next",
        action() {
          this.next();
        },
      },
    ],
  },
  {
        id: "third",
        title: "Find extra resources here",
        text: ["Notes, Bulletins, and Podcasts"],
        attachTo: { element: "#nav-resources", on: "right" },
        scrollTo: true,
        canClickTarget: true,
        buttons: [
          {
            classes: "shepherd-custom-button-secondary",
            text: "Exit",
            action() {
              this.cancel();
            },
          },
          {
            classes: "shepherd-custom-button-primary",
            text: "Back",
            action() {
              this.back();
            },
          },
          {
            classes: "shepherd-custom-button-primary",
            text: "Next",
            action() {
              this.next();
            },
          },
        ],
        when: {
          show: () => {
            document.getElementById("nav-resources")?.click();
          },
          hide: () => {},
        },
      },
      {
        id: "fourth",
        title: "More ways to connect and grow here",
        text: ["Prayer Requests, Announcements, Events, and more."],
        attachTo: { element: "#nav-connect", on: "right" },
        scrollTo: true,
        canClickTarget: true,
        buttons: [
          {
            classes: "shepherd-custom-button-secondary",
            text: "Exit",
            action() {
              this.cancel();
            },
          },
          {
            classes: "shepherd-custom-button-primary",
            text: "Back",
            action() {
              this.back();
            },
          },
          {
            classes: "shepherd-custom-button-primary",
            text: "Next",
            action() {
              this.next();
            },
          },
        ],
        when: {
          show: () => {
            document.getElementById("nav-connect")?.click();
          },
          hide: () => {},
        },
      },
      // {
      //   id: "sixth",
      //   title: "Manage your profile here",
      //   text: ["Access your profile settings and preferences, such as notifications and email subscriptions."],
      //   attachTo: { element: "#nav-profile", on: "left" },
      //   scrollTo: true,
      //   canClickTarget: true,
      //   buttons: [
      //     {
      //       classes: "shepherd-custom-button-primary",
      //       text: "Exit",
      //       action() {
      //         this.cancel();
      //       },
      //     },
      //     {
      //       classes: "shepherd-custom-button-primary",
      //       text: "Back",
      //       action() {
      //         this.back();
      //       },
      //     },
      //     {
      //       classes: "shepherd-custom-button-primary",
      //       text: "Next",
      //       action() {
      //         this.next();
      //       },
      //     },
      //   ],
      //   when: {
      //     show: () => {
      //       document.getElementById("nav-profile")?.click();
      //     },
      //     hide: () => {},
      //   },
      // }
  //   {
  //     id: "fourth",
  //     title: "Navigate to about page",
  //     text: ["Click here to quickly navigate to the about page"],
  //     attachTo: { element: "#nav-about", on: "bottom" },
  //     scrollTo: true,
  //     buttons: [
  //       {
  //         classes: "shepherd-button-secondary",
  //         text: "Exit",
  //         type: "cancel",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Back",
  //         type: "back",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Next",
  //         type: "next",
  //       },
  //     ],
  //   },
  //   {
  //     id: "fifth",
  //     title: "Open extra menu options",
  //     text: ["Click here to open extra menu options"],
  //     attachTo: { element: "#nav-menu", on: "right" },
  //     scrollTo: true,
  //     canClickTarget: true,
  //     buttons: [
  //       {
  //         classes: "shepherd-button-secondary",
  //         text: "Exit",
  //         type: "cancel",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Back",
  //         type: "back",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Next",
  //         type: "next",
  //       },
  //     ],
  //     when: {
  //       show: () => {
  //         document.getElementById("nav-menu")?.click();
  //       },
  //       hide: () => {},
  //     },
  //   },
  //   {
  //     id: "sixth",
  //     title: "Open profile options",
  //     text: ["Click here to open profile options"],
  //     attachTo: { element: "#nav-profile", on: "left" },
  //     canClickTarget: true,
  //     scrollTo: true,
  //     buttons: [
  //       {
  //         classes: "shepherd-button-secondary",
  //         text: "Exit",
  //         type: "cancel",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Back",
  //         type: "back",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Next",
  //         type: "next",
  //       },
  //     ],
  //     when: {
  //       show: () => {
  //         document.getElementById("nav-profile")?.click();
  //       },
  //       hide: () => {
  //         console.log("hide step");
  //       },
  //     },
  //   },
  //   {
  //     id: "seventh",
  //     title: "Sales overview",
  //     text: ["Graph that contains visual details about the sales prohgress"],
  //     attachTo: { element: "#sales-chart", on: "bottom" },
  //     scrollTo: true,
  //     buttons: [
  //       {
  //         classes: "shepherd-button-secondary",
  //         text: "Exit",
  //         type: "cancel",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Back",
  //         type: "back",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Next",
  //         type: "next",
  //       },
  //     ],
  //   },
  //   {
  //     id: "eighth",
  //     title: "Quickly find out what's going on",
  //     text: ["Updates on what is going on..."],
  //     attachTo: { element: "#feed", on: "left" },
  //     scrollTo: true,
  //     buttons: [
  //       {
  //         classes: "shepherd-button-secondary",
  //         text: "Exit",
  //         type: "cancel",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Back",
  //         type: "back",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Next",
  //         type: "next",
  //       },
  //     ],
  //   },
  //   {
  //     id: "ninth",
  //     title: "Overview of projects listings",
  //     text: ["Summary of projects carried out"],
  //     attachTo: { element: "#projects-listing", on: "top" },
  //     scrollTo: true,
  //     buttons: [
  //       {
  //         classes: "shepherd-button-secondary",
  //         text: "Exit",
  //         type: "cancel",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Back",
  //         type: "back",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Next",
  //         type: "next",
  //       },
  //     ],
  //   },
  //   {
  //     id: "tenth",
  //     title: "View most recent blog posts",
  //     text: ["View most recent blog posts at a glance"],
  //     attachTo: { element: "#blogs", on: "top" },
  //     scrollTo: true,
  //     buttons: [
  //       {
  //         classes: "shepherd-button-secondary",
  //         text: "Exit",
  //         type: "cancel",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Back",
  //         type: "back",
  //       },
  //       {
  //         classes: "shepherd-button-primary",
  //         text: "Next",
  //         type: "next",
  //       },
  //     ],
  //   },
  //   {
  //   id: "eleventh",
  //   title: "Navigate to any page from here",
  //   text: ["Navigate to the appropriate page by clicking on any"],
  //   attachTo: { element: "#sidemenu-about", on: "top" },
  //   scrollTo: true,
  //   canClickTarget: true,
  //   buttons: [
  //     {
  //       classes: "shepherd-button-secondary",
  //       text: "Restart",
  //       action() {
  //         this.cancel();
  //         router.push("/dashboard");
  //         this.start();
  //       },
  //     },
  //     {
  //       classes: "shepherd-button-primary",
  //       text: "Done",
  //       type: "cancel",
  //     },
  //   ],
  //   when: {
  //     show: () => {
  //       document.getElementById("sidemenu-about")?.click();
  //       localStorage.setItem("demo-done", JSON.stringify(true));
  //     },
  //     hide: () => {},
  //   },
  //   beforeShowPromise: function () {
  //     return new Promise(function (resolve: any) {
  //       setTimeout(function () {
  //         router.push("/about");
  //         resolve();
  //       }, 200);
  //     });
  //   },
  // },
];

/** Wrap your app (e.g. in layout) so the tour is available site-wide. */
export function TourWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ShepherdJourneyProvider>
      <TourInstance>{children}</TourInstance>
    </ShepherdJourneyProvider>
  );
}