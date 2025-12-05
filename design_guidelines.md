# Design Guidelines: HardcoreDoorToDoorClosers

## Authentication & User Management

**Authentication Required** - This app requires user accounts for CRM data, social features, job applications, and course enrollment.

**Implementation:**
- Use SSO for authentication (Apple Sign-In required for iOS, Google Sign-In for cross-platform)
- Onboarding flow: Welcome screen → Auth screen → Profile setup (industry specialization, location, experience level)
- Profile/Settings screen includes:
  - Professional avatar (generate 6 preset avatars with hardhat/professional attire aesthetic)
  - Display name, company affiliation, certifications earned
  - Industry specializations (checkboxes: Roofing, Solar, Windows, HVAC, Siding, General Contracting)
  - Privacy settings, notification preferences
  - Log out (with confirmation)
  - Account deletion (Settings > Account > Delete Account with double confirmation)

## Navigation Architecture

**Root Navigation: Hybrid Tab + Drawer**

Due to 7 major sections, use a 5-tab navigation with secondary features in a drawer:

**Tab Bar (5 tabs):**
1. **Leads** - Marketplace icon
2. **CRM** - Pipeline/funnel icon
3. **Social** - Center position, community icon (core engagement feature)
4. **Jobs** - Briefcase icon
5. **Profile** - User avatar icon

**Drawer Navigation (accessible from Profile tab):**
- Courses & Certifications (grouped together)
- Events
- Settings
- Help & Support

**Tab Bar Specifications:**
- Height: 70px + safe area bottom inset
- Background: Semi-transparent blur (iOS) or solid (Android)
- Active tab: Primary color with icon + label
- Inactive tabs: Gray-600 with icon only
- Center tab (Social): Elevated with subtle shadow

## Screen Specifications

### 1. Leads Marketplace
**Purpose:** Browse and purchase leads

**Layout:**
- Transparent header with search icon (right) and filter icon (left)
- Scrollable content with safe area: top = headerHeight + 20px, bottom = tabBarHeight + 20px
- Sticky filter chips below header (Industry, Location, Price Range)
- Lead cards in vertical list

**Components:**
- Search bar (modal overlay when tapped)
- Filter chips (horizontal scroll)
- Lead cards showing: Industry badge, location, lead quality score, price, "Buy Lead" CTA
- Pull-to-refresh

### 2. CRM Pipeline
**Purpose:** Manage sales opportunities through deal stages

**Layout:**
- Default navigation header with "CRM" title, "+ Add Deal" button (right)
- Horizontal scrolling stage columns
- Safe area: top = 20px, bottom = tabBarHeight + 20px

**Components:**
- Stage columns: New Lead, Contacted, Qualified, Proposal, Negotiation, Closed Won, Closed Lost
- Deal cards (draggable): Contact name, company, deal value, days in stage
- Floating "+" button for quick deal creation
- Stage headers with deal count

**Deal Detail Modal:**
- Full-screen modal with close button (top-left)
- Scrollable form with sections: Contact Info, Deal Value, Notes, Stage History, Attachments
- Submit button in header (top-right)

### 3. Social Feed
**Purpose:** Industry networking and content sharing

**Layout:**
- Transparent header with "Social" title and compose icon (right)
- Scrollable feed with safe area: top = headerHeight + 20px, bottom = tabBarHeight + 20px
- Infinite scroll

**Components:**
- Post cards: Avatar, username, timestamp, text content, hashtags, like/comment counts
- Like button (heart icon), comment button
- Compose modal: Full-screen with text input, character count (280), hashtag suggestions
- Pull-to-refresh

### 4. Jobs Board
**Purpose:** Browse and apply for jobs

**Layout:**
- Transparent header with search icon (right) and filter icon (left)
- Scrollable job listings with safe area: top = headerHeight + 20px, bottom = tabBarHeight + 20px
- Filter chips: Location, Job Type, Experience Level

**Components:**
- Job cards: Company logo placeholder, job title, location, job type badge, salary range (if available)
- Job detail screen: Company info, full description, requirements, "Apply" CTA
- Application modal: Resume upload placeholder, cover letter input, submit button

### 5. Profile
**Purpose:** User dashboard and app navigation hub

**Layout:**
- Custom header with user avatar, name, and settings icon (right)
- Scrollable content with safe area: top = headerHeight + 20px, bottom = tabBarHeight + 20px

**Components:**
- Stats cards: Deals closed, total revenue, certifications earned
- Quick actions grid: Courses, Events, Settings, Help
- Recent activity feed

### 6. Courses & Certifications (Drawer)
**Purpose:** Browse and enroll in training

**Layout:**
- Default header with "Courses" title and search icon (right)
- Scrollable content with tabs: All Courses, My Courses, Certifications
- Safe area: top = 20px, bottom = insets.bottom + 20px

**Components:**
- Course cards: Thumbnail placeholder, title, instructor, duration, price
- Certification cards: Badge icon, certification name, requirements, progress bar
- Course detail: Description, curriculum, enroll button

### 7. Events (Drawer)
**Purpose:** Discover and RSVP to industry events

**Layout:**
- Default header with "Events" title and "+ Post Event" button (right)
- Scrollable calendar view or list view toggle
- Safe area: top = 20px, bottom = insets.bottom + 20px

**Components:**
- Event cards: Date badge, event title, location, attendee count, RSVP button
- Event detail: Full description, organizer info, attendees list, directions link

## Design System

### Color Palette
**Primary:** #FF6B35 (Bold orange - represents energy, action, sales drive)
**Secondary:** #004E89 (Navy blue - trust, professionalism)
**Accent:** #1AA260 (Green - growth, closed deals)
**Error:** #E63946
**Background:** #FFFFFF (Light mode), #121212 (Dark mode)
**Surface:** #F8F9FA (Light mode), #1E1E1E (Dark mode)
**Text Primary:** #1A1A1A (Light mode), #FFFFFF (Dark mode)
**Text Secondary:** #6B7280
**Borders:** #E5E7EB

### Typography
**Headings:** SF Pro Display (iOS) / Roboto (Android)
- H1: 32px, Bold
- H2: 24px, Semibold
- H3: 20px, Semibold

**Body:** SF Pro Text (iOS) / Roboto (Android)
- Body Large: 17px, Regular
- Body: 15px, Regular
- Body Small: 13px, Regular

**Labels:** 
- Button: 16px, Semibold
- Caption: 12px, Regular

### Component Styles
**Cards:**
- Background: Surface color
- Border radius: 12px
- Padding: 16px
- NO drop shadow by default (clean, flat design)

**Buttons:**
- Primary: Filled with primary color, white text, 12px border radius
- Secondary: Outlined with primary color, primary text
- Ghost: No background, primary text
- Pressed state: Reduce opacity to 0.7

**Floating Action Buttons:**
- Position: Bottom-right, 20px from edges
- Size: 56x56px
- Border radius: 28px (circular)
- Shadow: shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2

**Input Fields:**
- Border: 1px solid border color
- Border radius: 8px
- Padding: 12px
- Focus state: Primary color border, no glow

## Visual Design

**Icons:** Use Feather icons from @expo/vector-icons for all UI elements. NO emojis.
- Navigation: 24px
- Actions: 20px
- Inline: 16px

**Imagery Assets Required:**
1. **Professional Avatars (6 presets):** Illustrated avatars with construction/sales professional aesthetic (hardhat, suit, business casual)
2. **Industry Category Icons (6):** Custom icons for Roofing, Solar, Windows, HVAC, Siding, General Contracting
3. **Certification Badges (5):** Achievement-style badges for completed certifications
4. **Empty States (4):** Illustrations for empty CRM pipeline, no leads, no jobs, no events

**Brand Aesthetic:** Professional, energetic, action-oriented. Avoid overly corporate feel - this is for field workers who hustle.

## Accessibility
- Minimum touch target: 44x44px
- Color contrast ratio: 4.5:1 for text
- Form labels and placeholders clearly visible
- Screen reader support for all interactive elements
- Haptic feedback on important actions (deal stage change, lead purchase, job application)