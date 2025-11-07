# Design Guidelines: Elite NFT-Gated Dating Platform

## Design Approach

**Reference-Based: Premium Dating + Web3 Luxury**

Drawing inspiration from:
- **Raya/The League**: Elite dating app aesthetics - sophisticated, minimal, curated
- **Foundation/SuperRare**: Premium NFT marketplace elegance
- **Soho House App**: Exclusive membership club experience

Core principle: Create an exclusive digital venue that feels like entering a private members' club. Every interaction should reinforce status and exclusivity.

## Typography

**Font Stack:**
- Primary: Inter (Google Fonts) - Clean, modern, professional
- Accent: Playfair Display (Google Fonts) - Elegant serif for headlines

**Hierarchy:**
- Hero Headlines: Playfair Display, 4xl-6xl, font-bold
- Section Headers: Inter, 2xl-3xl, font-semibold
- Body Text: Inter, base-lg, font-normal
- Labels/Metadata: Inter, sm, font-medium, uppercase tracking-wide

## Layout System

**Spacing Primitives:** Tailwind units of 4, 6, 8, 12, 16, 24
- Card padding: p-6 or p-8
- Section spacing: py-16 to py-24
- Component gaps: gap-6 or gap-8
- Grid layouts: grid-cols-2 md:grid-cols-3 for profiles

**Container Strategy:**
- Max-width: max-w-7xl for main content
- Profile cards: max-w-md for focused viewing
- Full-width sections for hero and verification flows

## Component Library

### NFT Verification Gate
- Full-screen modal with blurred background
- Centered card with wallet connection options
- MetaMask/WalletConnect buttons with icons (from Heroicons)
- "Verify NFT Ownership" as primary CTA
- Status indicators for connection/verification progress

### Profile Cards
- Card-based layout with prominent photo (aspect-ratio-3/4)
- Overlay gradient on photo bottom third for text readability
- Name, age, location on photo overlay
- Bio preview below photo
- Icons for interests/traits (Heroicons: heart, star, sparkles)
- NFT badge indicator (subtle, top-right corner)

### Matching Interface
- Tinder-style swipe cards (larger, centered)
- Like/Pass buttons below card (icon + label)
- Match notification: Full-screen celebration overlay with confetti effect (use canvas-confetti library)

### Messaging
- Clean thread list with profile thumbnails
- Message bubbles with subtle shadows
- Typing indicators
- Timestamp formatting (subtle, small text)

### Navigation
- Top nav: Logo left, profile icon right
- Bottom tab bar (mobile): Discover, Matches, Messages, Profile
- Desktop: Sidebar navigation

## Images

**Required Images:**

1. **Hero Section** (Landing page before auth):
   - Large hero image showing elegant, diverse professionals in upscale setting
   - Dimensions: 1920x1080
   - Overlay: Dark gradient (bottom to top, opacity 60-80%)
   - CTA button on overlay with backdrop-blur-md background

2. **Profile Photos**:
   - High-quality portrait photography
   - Consistent aspect ratio (3:4)
   - Professional quality expected from users

3. **Empty States**:
   - Illustration for "No matches yet" - elegant, minimalist
   - "No messages" state - simple icon-based

4. **NFT Verification Success**:
   - Abstract geometric pattern or checkmark celebration
   - Small accent image, not full-screen

## Key Interactions

**Animations:** Use sparingly for premium feel
- Card hover: subtle scale(1.02) transform
- Button interactions: smooth opacity transitions
- Page transitions: fade in/out (300ms)
- Match reveal: Slide-up animation with blur backdrop

**Micro-interactions:**
- Like button: Quick scale pulse on click
- Message sent: Subtle slide-in animation
- Profile load: Skeleton screens with shimmer effect

## Design Principles

1. **Restraint**: Less is more - generous whitespace, minimal UI chrome
2. **Sophistication**: Dark mode as default, metallic accents (avoid bright colors)
3. **Trust**: Clear NFT verification badges, transparent membership criteria
4. **Privacy**: Subtle indicators, no public metrics/follower counts
5. **Exclusivity**: Curated feel through layout density and generous spacing

## Accessibility

- High contrast ratios (WCAG AA minimum)
- Focus states on all interactive elements (ring-2 ring-offset-2)
- Keyboard navigation for all actions
- ARIA labels on icon-only buttons
- Alt text on all profile photos