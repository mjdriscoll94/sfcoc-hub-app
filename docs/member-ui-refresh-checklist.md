# Member UI Refresh Checklist

Branch: `feature/member-ui-refresh`

This checklist is the source of truth for the usability refresh. Existing features, permissions, integrations, and data structures must remain intact unless a separately discussed change removes a step while producing the same result.

## Guardrails

- [x] Create the feature branch from the latest `main`.
- [ ] Keep all existing user-facing routes and actions reachable.
- [ ] Preserve role permissions, approval rules, Firebase schemas, notifications, and integrations.
- [ ] Avoid production data mutations during UI testing.
- [ ] Do not merge without explicit approval.

## Phase 1: Shared foundations

- [ ] Establish consistent page widths, spacing, headings, cards, buttons, forms, and status messages.
- [x] Use at least 16px body text and comfortable line height.
- [x] Use 44x44px minimum interactive targets.
- [x] Add visible keyboard focus states.
- [ ] Keep coral branding while meeting WCAG AA contrast.
- [x] Pair color and icons with visible text.
- [ ] Standardize loading, empty, error, retry, and success states.
- [ ] Reduce unnecessary uppercase and letter spacing.
- [ ] Preserve existing theme behavior.

## Phase 2: Navigation and application shell

- [x] Replace abstract member navigation groups with task-based destinations.
- [x] Mobile primary navigation: Home, Announcements, Calendar, Resources, More.
- [x] Desktop primary navigation: Announcements, Calendar, Bulletin & Notes, Prayer Board, Life Groups.
- [x] Add a flat, single-level More menu with visible section headings.
- [x] Member Information: Prayer Board, Life Groups, Member Directory.
- [x] Participate: Volunteer, Service Roles.
- [x] Church Resources: Sermons, Giving.
- [x] Account: Settings, Sign Out.
- [x] Staff: Manage Church for authorized roles only.
- [x] Ensure ordinary member destinations require no more than one menu expansion.
- [x] Clearly label external links and new-window behavior.
- [x] Preserve role-aware visibility and permissions.

## Phase 3: Public and authentication experience

- [x] Reduce the public homepage hero height while preserving church photography and identity.
- [x] Surface service times, address, directions, contact information, and what to expect.
- [x] Keep protected calendar details unavailable before sign-in.
- [x] Make public Sermons discoverable from Resources.
- [x] Keep the giving embed and add context plus a secure fallback link.
- [x] Rename Sign up to Request member access.
- [x] Explain administrator approval before account submission.
- [x] Preserve forgot-password and password-reset functionality.
- [x] Return members to their originally requested protected page after sign-in.
- [x] Use the member dashboard as the default signed-in destination.

## Phase 4: Member homepage

- [x] Render an authenticated member dashboard instead of the public homepage.
- [x] Use one column on phones and two columns on larger screens.
- [x] Avoid carousels and hidden dashboard tabs.
- [x] Show the three newest announcements with a View all action.
- [x] Show the next three calendar events with a View full calendar action.
- [x] Show the latest Bulletin and Lesson Notes.
- [x] Show only a neutral Prayer Board activity count, not prayer details.
- [ ] Show the member's Life Group and next meeting when it can be derived reliably.
- [x] Fall back to a neutral Life Groups card when membership cannot be derived.
- [x] Add secondary shortcuts for Directory, Volunteer, Service Roles, Giving, and Sermons.

## Phase 5: Priority member pages

- [ ] Preserve announcement category filters and expand/collapse behavior.
- [ ] Deep-link dashboard announcement selections to the expanded item.
- [ ] Replace the icon-only notification control with explanatory text.
- [ ] Explain notification scope before requesting browser permission.
- [ ] Default the calendar to month view on phones and year view on larger screens.
- [ ] Preserve calendar year, month, and week views, filters, downloads, and role-based editing.
- [x] Combine Bulletin and Lesson Notes into one member-facing area with two clear tabs.
- [x] Add focused search and year filtering for Bulletin and Lesson Notes.
- [x] Preserve every PDF and download action.
- [x] Retain document dates while removing redundant upload dates from the visible member list.
- [ ] Preserve all Prayer Board filters, expansion, submission, support, and approval behavior.
- [ ] Preserve all Life Group participant resources, leader resources, households, and role-controlled contact details.
- [ ] Keep Instant Church Directory as the primary member directory.
- [ ] Preserve the internal directory for its authorized roles.

## Phase 6: Remaining member experience

- [ ] Review Volunteer Opportunities for clear actions, forms, and status feedback.
- [ ] Review Service Roles and history for clear assignments and response actions.
- [ ] Review Sermons search, filters, media actions, and empty/error states.
- [x] Review Giving for embed loading, failure, and fallback behavior.
- [ ] Standardize Settings sections and notification controls.
- [x] Preserve the onboarding tour but make it optional.
- [x] Add Take a quick tour and Not now choices.
- [ ] Keep Restart tour in Settings.

## Phase 7: Manage Church workspace

- [ ] Replace the Admin label with Manage Church.
- [ ] Show pending approvals and follow-up items before tool navigation.
- [ ] Show only tools each role is authorized to use.
- [ ] Add direct task navigation without a Dashboard-to-category-to-tool detour.
- [ ] People: Users, Teachers, Directory, Households, Life Groups.
- [ ] Communication: Announcements, Email, Email Lists, Prayer Requests.
- [ ] Scheduling: Calendar, Events, Service Roles, Volunteer Opportunities.
- [ ] Attendance: Entry, History, Reports, Imports, Follow-up.
- [ ] Content: Bulletin, Lesson Notes.
- [ ] System: Settings.
- [ ] Use a labeled sidebar on larger screens and a flat Manage menu on phones.
- [ ] Add consistent breadcrumbs and a return to Manage Church.
- [ ] Preserve approval queues and every existing management action.

## Phase 8: Forms and interaction consistency

- [ ] Place visible labels above fields.
- [ ] Mark and explain required fields consistently.
- [ ] Provide plain-language help and inline validation.
- [ ] Use consistent submit, loading, success, and failure states.
- [ ] Require confirmation only for destructive or difficult-to-reverse actions.
- [ ] Use specific external/download labels instead of generic or icon-only actions.
- [ ] Keep focused search on long lists rather than adding global search.

## Phase 9: Validation

- [ ] Run linting.
- [ ] Run type checking.
- [x] Run the automated test suite.
- [x] Produce a successful production build.
- [x] Verify every existing page route remains reachable.
- [ ] Test signed-out, member, organizer, and administrator navigation.
- [ ] Test phone, tablet, and desktop layouts.
- [ ] Test keyboard-only navigation.
- [ ] Check basic screen-reader structure and control names.
- [ ] Test at 200% zoom.
- [ ] Check contrast and non-color status cues.
- [ ] Test loading, empty, error, retry, and permission-denied states.
- [ ] Confirm no permissions or access boundaries changed.
- [x] Confirm no database migration or new stored fields were introduced.

## Review checkpoints

- [ ] Checkpoint 1: shared foundations, navigation, public homepage, and member dashboard.
- [ ] Checkpoint 2: priority member pages and Manage Church workspace.
- [ ] Final end-to-end UI and regression review.
- [ ] Obtain explicit approval before merge.
