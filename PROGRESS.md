# Full Build Progress

Resume by checking this file and `git log`; continue at the first unticked step.

- [x] Step 0 — Orient and run baseline verification. Read `README.md`; reviewed `git log --oneline -25` and `git status`; backend tests passed (25/25), dashboard production build passed, and Android Expo export passed.
- [ ] Step 1 — PARTIAL: (a) guarded Home route stats against malformed API arrays; RouteMap already guards absent routes/coordinates and uses a finite region for zero points. A device crash trace is still needed to confirm the reported native crash cause. (b) logout now clears auth token, cached user, biometric-unlock state, and shift tracking; no API URL is persisted, so the reported “can't reach server” cause is not proven by repository evidence. (c) camera and upload failures now distinguish local media, permission, network, session, server, and storage failures. (d) outlet detail ownership was already fixed in `31bc058`. Android export passes.
- [ ] Step 2 — Not present in the supplied checklist.
- [ ] Step 3 — Add mobile role selection at login and server-role-based navigation.
- [ ] Step 4 — Complete the Telemarketer workflow and retry behavior.
- [ ] Step 5 — Complete the Brand Ambassador activation workflow and offline sync.
- [ ] Step 6 — Complete Merchandiser field additions, sale edit/void, and offline support.
- [ ] Step 7 — Complete Team Leader oversight, scoped data, live map, targets, and broadcasts.
- [ ] Step 8 — Complete the Admin / Account Manager mobile overview.
- [ ] Step 9 — Complete dashboard pages and role management for all workflows.
- [ ] Step 10 — Polish new and existing screens, theme usage, camera styling, and dark mode.
- [ ] Step 11 — Run final verification, add required backend tests, and provide handoff.
