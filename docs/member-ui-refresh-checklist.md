# Member UI Refresh Checklist

Branch: `feature/member-ui-refresh`

This checklist is the source of truth for the usability refresh. Existing features, permissions, integrations, and data structures must remain intact unless a separately discussed change removes a step while producing the same result.

## Guardrails

- [x] Create the feature branch from the latest `main`.
- [x] Keep all existing user-facing routes and actions reachable.
- [x] Preserve role permissions, approval rules, Firebase schemas, notifications, and integrations.
- [x] Avoid production data mutations during UI testing.
- [ ] Do not merge without explicit approval.

## Phase 1: Shared foundations

- [x] Establish consistent page widths, spacing, headings, cards, buttons, forms, and status messages.
- [x] Use at least 16px body text and comfortable line height.
- [x] Use 44x44px minimum interactive targets.
- [x] Add visible keyboard focus states.
- [x] Keep coral branding while meeting WCAG AA contrast.
- [x] Pair color and icons with visible text.
- [x] Standardize loading, empty, error, retry, and success states.
- [x] Reduce unnecessary uppercase and letter spacing.
- [x] Preserve existing theme behavior.

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

- [x] Preserve announcement category filters and expand/collapse behavior.
- [x] Deep-link dashboard announcement selections to the expanded item.
- [x] Replace the icon-only notification control with explanatory text.
- [x] Explain notification scope before requesting browser permission.
- [x] Default the calendar to month view on phones and year view on larger screens.
- [x] Preserve calendar year, month, and week views, filters, downloads, and role-based editing.
- [x] Combine Bulletin and Lesson Notes into one member-facing area with two clear tabs.
- [x] Add focused search and year filtering for Bulletin and Lesson Notes.
- [x] Preserve every PDF and download action.
- [x] Retain document dates while removing redundant upload dates from the visible member list.
- [x] Preserve all Prayer Board filters, expansion, submission, support, and approval behavior.
- [x] Preserve all Life Group participant resources, leader resources, households, and role-controlled contact details.
- [x] Keep Instant Church Directory as the primary member directory.
- [x] Preserve the internal directory for its authorized roles.

## Phase 6: Remaining member experience

- [x] Review Volunteer Opportunities for clear actions, forms, and status feedback.
- [x] Review Service Roles and history for clear assignments and response actions.
- [x] Review Sermons search, filters, media actions, and empty/error states.
- [x] Review Giving for embed loading, failure, and fallback behavior.
- [x] Standardize Settings sections and notification controls.
- [x] Preserve the onboarding tour but make it optional.
- [x] Add Take a quick tour and Not now choices.
- [x] Keep Restart tour in Settings.

## Phase 7: Manage Church workspace

- [x] Replace the Admin label with Manage Church.
- [x] Show pending approvals and follow-up items before tool navigation.
- [x] Show only tools each role is authorized to use.
- [x] Add direct task navigation without a Dashboard-to-category-to-tool detour.
- [x] People: Users, Teachers, Directory, Households, Life Groups.
- [x] Communication: Announcements, Email, Email Lists, Prayer Requests.
- [x] Scheduling: Calendar, Events, Service Roles, Volunteer Opportunities.
- [x] Attendance: Entry, History, Reports, Imports, Follow-up.
- [x] Content: Bulletin, Lesson Notes.
- [x] System: Settings.
- [x] Use a labeled sidebar on larger screens and a flat Manage menu on phones.
- [x] Add consistent breadcrumbs and a return to Manage Church.
- [x] Preserve approval queues and every existing management action.

## Phase 8: Forms and interaction consistency

- [x] Place visible labels above fields.
- [x] Mark and explain required fields consistently with visible “(required)” labels, a plain-language form note, and native required semantics where the submit rules already required a value.
- [x] Provide plain-language help and inline validation.
- [x] Use consistent submit, loading, success, and failure states.
- [x] Require confirmation only for destructive or difficult-to-reverse actions.
- [x] Use specific external/download labels instead of generic or icon-only actions.
- [x] Keep focused search on long lists rather than adding global search.

## Phase 9: Validation

- [x] Run linting. Changed files pass; the repository-wide command still reports pre-existing failures outside this refresh.
- [x] Run type checking. The repository-wide command still reports pre-existing failures outside this refresh.
- [x] Run the automated test suite.
- [x] Produce a successful production build.
- [x] Verify every existing page route remains reachable.
- [x] Test signed-out, member, organizer, and administrator navigation. Signed-out and administrator flows were verified in live browser sessions; Member, Service Organizer, Life Group Organizer, and Admin visibility are also covered by an automated permission matrix without changing account roles or production data.
- [x] Test phone, tablet, and desktop layouts. Verified representative public, authentication, sermon, Bulletin, and Lesson Notes screens at 390×844, 768×1024, and 1440×900 without horizontal overflow.
- [x] Test keyboard-only navigation.
- [x] Check basic screen-reader structure and control names.
- [x] Test at 200% zoom. Verified with Chrome's native 200% zoom on representative public, authentication, sermon, Bulletin, and Lesson Notes screens without horizontal overflow or clipped controls.
- [x] Check contrast and non-color status cues.
- [x] Test loading, empty, error, retry, and permission-denied states.
- [x] Confirm protected access boundaries remain intact; Life Groups was added to the shared signed-out route guard.
- [x] Confirm no database migration or new stored fields were introduced.

## Review checkpoints

- [x] Checkpoint 1: shared foundations, navigation, public homepage, and member dashboard.
- [x] Checkpoint 2: priority member pages and Manage Church workspace.
- [x] Checkpoint 3: remaining member pages and form consistency.
- [ ] Final end-to-end UI and regression review.
- [ ] Obtain explicit approval before merge.
