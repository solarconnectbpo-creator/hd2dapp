# Nimbus IQ — MVP UI/UX Specification (Milestone 1)

**Document Purpose:** To provide visual structure, layout guidelines, and user flow behaviors for the initial Nimbus IQ PWA build. This should be used alongside the technical architecture document.

**Target:** Mobile-first PWA design (responsive for desktop).
**Framework:** SvelteKit + Tailwind CSS.
**Theme:** Clean, professional, slightly futuristic ("cinematic AI"). Dark mode default.

---

## A. Global Elements (Layout & Navigation)

These elements exist on almost every screen via `apps/web/src/routes/+layout.svelte`.

### 1. The App Header (Top Nav)

A slim top bar meant to maximize screen real estate.

* **Left: Brand & Context**
  * Small Nimbus IQ Logo icon.
  * Current Page Title (e.g., "Dashboard", "Projects", "Inspection AI").

* **Right: System Status & Actions**
  * **Connectivity Indicator (Crucial):** This must be reactive to network status.
    * 🟢 (Green dot or subtle wifi icon): Online.
    * 🟠 (Orange/Gray icon with strike-through): Offline mode.
  * **Global Add Button (+):** Quick action sheet to create a new Project or kick off a generic Task.
  * **Profile Avatar:** Tiny circle for settings/account menu.

### 2. The Navigation Drawer (Mobile Menu)

Accessed via a hamburger menu icon in the Header (replacing logo on mobile if needed).

* **Main Links:**
  * Dashboard (Home)
  * Projects
  * Agents (The Module Registry view)
  * Settings

* **Drawer Footer:** App Version + Sync Status text (e.g., "Last synced: 2m ago" or "Pending uploads: 3").

---

## B. Screen Specifications

### Screen 1: Home Dashboard (`/`)

**Concept:** The command center. Instant overview of system state.
**Layout Structure:** Vertical Stack for easy mobile scrolling.

**1. "Agent Modules" Section (Horizontal Scroll Container)**

* **Label:** H2 heading: "Active Agents".
* **Content:** A horizontal row of squarish "tiles" for installed modules.
* **Tile UI:** Icon (e.g., 🛰️) + Title ("Inspection AI") + subtle status indicator underneath (e.g., "Idle" or "2 tasks running").
* **Action:** Tapping a tile navigates to that module's base route (e.g., `/inspection`).

**2. "Recent Projects" Section (Card List)**

* **Label:** H2 heading: "Recent Projects" with a small "See All" link to `/projects`.
* **Content:** A vertical stack of 3–5 recent project cards fetched from local Dexie DB.
* **Card UI:**
  * Project Name bolded.
  * Tenant/Client name smaller underneath.
  * Right side: Relative timestamp ("Edited 2h ago").
* **Action:** Tapping navigates to project details.

**3. "Activity Stream" Section (Live Feed)**

* **Label:** H2 heading: "Agent Activity".
* **Content:** A reactive list of recent/current tasks from the Dexie `tasks` table.
* **List Item UI (Compact row):**
  * **Left Icon:** Small agent icon indicating type (e.g., Voice vs. Inspection).
  * **Middle Text:** Description of task (e.g., "Processing 14 images for 'Roof Job A'").
  * **Right Status Chip:**
    * `[Queued 🟠]` (Waiting for network)
    * `[Running 🔵]` (Active either locally or remotely confirmed)
    * `[Done 🟢]`
    * `[Failed 🔴]`

---

### Screen 2: Inspection AI Module Route (`/inspection`)

**Concept:** The template for a specific agent module workspace. Focused on data input and reviewing results.
**Layout Structure:** Vertical Stack.

**1. Context Header (Sticky top below main Header)**

* **UI:** A dropdown or selector showing the currently selected Project context for this inspection. Shows "Select a Project" if none is selected.

**2. Input "Dropzone" Area (Prominent Box)**

* **UI:** A large, dashed-border container occupying the top third of the screen.
* **Content Centered:**
  * Big Icon (Camera/Upload).
  * Text: "Tap to take photos or upload drone imagery."
  * Subtext: "Supports JPG, PNG. Max 50MB per batch."
* **Action:** Triggers native file picker or camera API.
* **State - Files Selected:** Once files are chosen, they appear as small thumbnails below the text inside the box.

**3. Primary Action Button**

* **UI:** Full-width button below the dropzone.
* **Text:** "RUN INSPECTION ANALYSIS 🚀".
* **Behavior (The Offline-First Magic):**
  * User taps button.
  * **INSTANTLY**, the UI adds a new item to the "Recent Runs" list below showing `[Queued 🟠]`.
  * **Under the hood:** The app writes the task payload to Dexie DB and registers a Workbox Background Sync event. The UI **does not await** a server response.

**4. "Recent Inspection Runs" Section**

* **Label:** H2 heading: "Previous Analysis".
* **Content:** List of tasks filtered by `agentId: 'inspection-ai'`.
* **Card UI:**
  * Batch ID / Date.
  * Project Name.
  * Status Chip (Queued/Running/Done).
  * *If Done:* A "View Report" button appears on the card.

---

## C. Developer Hand-off Notes (The "Glue")

**1. State Management Strategy**

* Use Svelte stores for transient UI state (is the drawer open? which tab is active?).
* Use **Dexie liveQuery** (via `dexie-svelte-addon` or similar) for nearly all persistent data displayed. The dashboard shouldn't fetch from an API component-side; it should subscribe to the local IndexedDB. The Service Worker is responsible for syncing IndexedDB in the background.

**2. The "Offline First" mental model**

* Crucial: When the user clicks "Run Inspection", **do not fire a `fetch` request directly**.
* Instead, create a Task object, save it to Dexie, and let the Workbox Background Sync plugin handle the actual network call later. The UI must update immediately based on the Dexie write (optimistic UI).

**3. Styling Guide (Tailwind)**

* **Backgrounds:** `bg-slate-900` (app bg), `bg-slate-800` (card/tile bg).
* **Text:** `text-slate-100` (primary), `text-slate-400` (secondary/labels).
* **Accents:** Use a specific color for Nimbus branding (e.g., a slightly desaturated electric blue like `text-blue-500` or buttons with `bg-blue-600 hover:bg-blue-700`) for primary actions and active icons.
* **Status Colors:** Use standard Tailwind utility colors for status chips:
  * Queued/Offline: `bg-yellow-500/20 text-yellow-300`
  * Done/Online: `bg-green-500/20 text-green-300`
  * Error: `bg-red-500/20 text-red-300`
  * Running: `bg-blue-500/20 text-blue-300`

**4. Component Structure (Recommended)**

```
src/
├── routes/
│   ├── +layout.svelte          # Global header + nav drawer
│   ├── +page.svelte            # Dashboard (Screen 1)
│   ├── inspection/
│   │   └── +page.svelte        # Inspection AI workspace (Screen 2)
│   └── projects/
│       └── +page.svelte        # Projects list
├── lib/
│   ├── components/
│   │   ├── AgentTile.svelte
│   │   ├── ProjectCard.svelte
│   │   ├── TaskListItem.svelte
│   │   └── StatusChip.svelte
│   ├── db/
│   │   └── dexie.ts            # Dexie schema definition
│   └── stores/
│       ├── ui.ts               # UI state stores
│       └── sync.ts             # Sync status store
└── service-worker.ts           # Workbox configuration
```

**5. Key User Flows**

**Flow A: Creating an Inspection Task (Offline)**

1. User navigates to `/inspection`
2. User selects a project from dropdown (or creates new)
3. User taps dropzone → uploads 5 roof photos
4. User taps "RUN INSPECTION ANALYSIS 🚀"
5. **Immediately:** New task card appears in "Recent Inspection Runs" with `[Queued 🟠]` status
6. **Background:** Service Worker detects network connectivity
7. **When online:** Task syncs to Firebase, status updates to `[Running 🔵]`
8. **When complete:** Gemini API returns results, status updates to `[Done 🟢]`, "View Report" button appears

**Flow B: Viewing Results (Offline-capable)**

1. User taps "View Report" on completed task
2. App loads results from IndexedDB (already synced when task completed)
3. User can view full analysis report even if offline
4. Report includes: damage detection, measurements, supplement recommendations

---

## D. Progressive Enhancement Features (Post-MVP)

These can be added after the core offline-first functionality is proven:

1. **Push Notifications:** Alert user when long-running tasks complete
2. **Camera Integration:** Direct camera capture instead of file upload
3. **Voice Input:** Voice notes attached to projects
4. **Geolocation Tagging:** Auto-tag projects with GPS coordinates
5. **Multi-tenant Switching:** Quick switcher for contractors managing multiple clients
6. **Export/Share:** Generate PDF reports, share via email/SMS
7. **Analytics Dashboard:** Track task completion rates, average processing times
8. **Offline Maps:** Cache map tiles for project locations

---

## E. Accessibility & Performance Targets

**Accessibility:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader friendly (semantic HTML, ARIA labels)
- Minimum touch target size: 44x44px
- Color contrast ratio: 4.5:1 for normal text, 3:1 for large text

**Performance:**
- Lighthouse PWA score: 90+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Offline functionality: 100% of core features work offline
- Service Worker install time: < 500ms

---

## F. Design System Reference

**Typography:**
- Headings: `font-bold` with `text-2xl` (H1), `text-xl` (H2), `text-lg` (H3)
- Body: `text-base` with `font-normal`
- Labels: `text-sm` with `text-slate-400`
- Monospace (for IDs/codes): `font-mono text-sm`

**Spacing:**
- Section padding: `p-4` (mobile), `p-6` (tablet+)
- Card padding: `p-4`
- Gap between elements: `gap-4` (standard), `gap-2` (compact)

**Borders & Shadows:**
- Card borders: `border border-slate-700`
- Card shadows: `shadow-lg`
- Hover states: `hover:shadow-xl hover:border-slate-600`
- Dropzone border: `border-2 border-dashed border-slate-600`

**Buttons:**
- Primary: `bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg`
- Secondary: `bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-3 px-6 rounded-lg`
- Destructive: `bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg`

---

## G. Implementation Checklist

**Phase 1: Foundation (Week 1)**
- [ ] Set up SvelteKit project with TypeScript
- [ ] Configure Tailwind CSS with custom theme
- [ ] Implement global layout with header and navigation drawer
- [ ] Set up Dexie database schema
- [ ] Configure Workbox service worker

**Phase 2: Core Features (Week 2-3)**
- [ ] Build Dashboard screen with agent tiles and activity feed
- [ ] Implement Inspection AI module with file upload
- [ ] Create offline-first task submission flow
- [ ] Build background sync mechanism
- [ ] Implement status chip reactivity

**Phase 3: Polish & Testing (Week 4)**
- [ ] Add loading states and error handling
- [ ] Implement optimistic UI updates
- [ ] Test offline functionality thoroughly
- [ ] Add accessibility features
- [ ] Performance optimization

**Phase 4: Deployment (Week 5)**
- [ ] Configure PWA manifest
- [ ] Set up Firebase hosting
- [ ] Deploy service worker
- [ ] Test on real devices (iOS, Android)
- [ ] Monitor Lighthouse scores

---

**End of UI/UX Specification**

This document should be used in conjunction with `NIMBUS_IQ_AI_META_INSTRUCTIONS.md` for complete implementation guidance.
