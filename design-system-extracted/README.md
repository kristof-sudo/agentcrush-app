# AgentCrush Design System

**AgentCrush** is the AI agent index run by AI agents — a data-dense discovery and rankings platform for open-source AI agents. Think Bloomberg Terminal meets CoinMarketCap, but for the AI agent ecosystem.

- **URL**: https://agentcrush.xyz
- **Tagline**: "The AI agent index run by AI agents."
- **Value prop**: Live rankings of 1,225+ AI agents by GitHub activity, ecosystem integration, and real adoption signals. Updated every 4 hours.

---

## Sources

| Source | Path / URL |
|--------|-----------|
| Codebase (Next.js app) | `kristof-sudo/agentcrush-app` (GitHub) |
| Screenshots | `uploads/Screenshot 2026-04-20 at 10.24.56.png` etc. |
| Brand images | `uploads/og-default.png`, `uploads/IMG_6377.PNG`, `uploads/IMG_6375.PNG` |
| Cinematic backgrounds | `uploads/KK_*.png` (AI-generated neon noir rooftop scenes) |

---

## Products / Surfaces

1. **Homepage** (`/`) — Hero with stat strip, rising rankings table, signal feed, biggest movers, recently indexed
2. **Rankings** (`/rankings`) — Full searchable/filterable live rankings table with weekly narrative
3. **Categories** (`/categories`) — Agent category grid (Operator, Builder, Researcher, Trader, Framework, etc.)
4. **Use Cases** (`/use-cases`) — Use-case grid linking to curated agent lists
5. **Agent Profile** (`/agent/:handle`) — Individual agent page (score breakdown, signals, bio)
6. **Submit** (`/submit`) — Agent submission form
7. **Mission Control** (`/mission-control`) — Admin/operator dashboard (internal)
8. **Watchlist** (`/watchlist`) — Personal agent watchlist

---

## CONTENT FUNDAMENTALS

### Voice & Tone
- **Terse, factual, zero fluff.** "Live rankings. Real signals. No hype."
- **Third person for data**, direct "you" for CTAs: "Get your agent discovered." / "Submit your agent →"
- **No exclamation marks**. No emoji in UI copy (only used as icon proxies in value-prop cards, sparingly).
- **Sentence case** for headings and labels. ALL CAPS for section headers and stat labels (terminal convention).
- **Numbers are sacred**: always tabular-nums, exact counts shown ("1,225 agents", "+37", "2h ago").
- Dates/times use relative format: "2h ago", "3d ago", "Apr 12".

### Example Copy Patterns
- Hero: "Get your open-source agent discovered."
- Subhead: "Live rankings of 1,225+ AI agents by GitHub activity, ecosystem integration, and real adoption signals. Updated every 4 hours."
- CTA primary: "Submit your agent →"
- CTA secondary: "Browse rankings"
- Stat label: "AGENTS TODAY · SIGNALS TODAY · RANKED"
- Signal feed entry: "AutoGen Studio · GitHub stars growing · star growth · 2h ago"
- Footer: "© 2026 AgentCrush · The AI Agent Ecosystem Index"

### Casing Rules
- Section headers: ALL CAPS mono (`RISING NOW`, `SIGNAL FEED`, `BIGGEST MOVERS`)
- Nav labels: Title Case (`Rankings`, `Use Cases`, `Categories`)
- Archetype tags: ALL CAPS (`RESEARCHER`, `OPERATOR`, `BUILDER`)
- Body copy: Sentence case
- Handles: lowercase with @ prefix (`@autogpt`)

---

## VISUAL FOUNDATIONS

### Color System
| Role | Value | Usage |
|------|-------|-------|
| Background base | `#08080f` | Full-page background |
| Surface | `#0a0a14` | Cards, panels |
| Elevated | `#0c0c1a` | Header bg (blurred) |
| Pink (primary accent) | `#e879f9` | CTAs, corner accents, active states |
| Cyan (secondary accent) | `#00d4ff` | Intel bar, live indicators, integration signals |
| Neon green | `#39ff14` | Positive deltas only |
| Red | `#f87171` | Negative deltas only |
| Amber | `#f0a500` | Collab / new-event signals |
| Violet | `#a78bfa` | Ecosystem mention signals |
| Sky blue | `#60a5fa` | Dev activity signals |

Text uses white at graduated opacities: 100% headings → 90% strong body → 70% secondary → 50% nav → 35% descriptions → 25% metadata → 20% footnotes.

### Typography
| Role | Font | Size | Weight |
|------|------|------|--------|
| Display / hero headlines | Michroma | 24–30px | 400 |
| Section headers | Geist Mono | 12px | 700 |
| Body / descriptions | Geist Mono | 10–12px | 400 |
| Data rows (names, handles) | Geist Mono | 10–12px | 500–700 |
| Labels / stat headers | Geist Mono | 9–10px | 400–500, UPPERCASE |
| Navigation | Geist Mono | 12px | 600 |

**Everything is small and tight.** Data rows cluster at 9–12px. Monospace is used universally — even navigation and badges. This creates a terminal/data-intelligence aesthetic.

### Backgrounds
- **Dot grid**: `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)` at 24px × 24px repeat
- **Atmospheric glow**: subtle pink radial gradient from top center (`rgba(236,72,153,0.06)`)
- **No full-bleed photography** in product UI (cinematic backgrounds reserved for social/brand contexts)
- Cards are `bg-[#0a0a14]` — barely lifted from the page background

### Cards & Panels
- `border-radius: 8px` (`rounded-lg`) — consistent across all cards
- Border: `1px solid rgba(255,255,255,0.06)` (very subtle white)
- Background: `#0a0a14`
- No box shadows — elevation is implied by color, not shadow
- **Corner bracket accents**: thin `1px` L-shapes at all 4 corners using `rgba(232,121,249,0.4)` — 12×12px — signature motif
- Section header row inside card: `border-b border-white/[0.06]`, `px-3 py-2`

### Animations & Motion
- **Live dot**: `animate-ping` (Tailwind) on a green dot — signals realtime data
- **Ticker scroll**: `translateX(-50%)` over 28s linear infinite — hero stat bar on mobile
- **Hover states**: `transition-colors` 150ms; links lighten, cards get very subtle bg lift (`hover:bg-white/[0.025]`)
- **No bounces, no spring animations**. Everything is linear or ease. Terminal feel.
- **Pulse indicator**: `animate-pulse` on violet dot in signal feed

### Borders & Dividers
- Panel borders: `rgba(255,255,255,0.06)`
- Section dividers: `divide-y divide-white/[0.04]`
- Pink-accent borders (CTAs): `rgba(232,121,249,0.35)`
- Trending badge: `border-[rgba(57,255,20,0.25)]`
- No thick borders anywhere

### Spacing
- Page container: max-width with horizontal padding
- Card internal padding: `px-3 py-2` (header rows), `px-3 py-3` (content areas)
- Row items: `px-3 py-2` with `gap-2`
- Grid columns: 12-col with `gap-3`

### Corner Radius
- Cards, panels: `8px` (rounded-lg)
- Buttons/pills: `4px` (rounded-sm) or `9999px` for true pills
- Avatar thumbnails: `4px` (rounded)

### Imagery
- **Color temperature**: Cool, neon-saturated. Purples, cyans, magentas dominate.
- **Cinematic backgrounds** (brand/social use): Futuristic neon-lit rooftop stages at night, cityscape in background
- **Agent avatars**: Colorful letter-based placeholders (7 color variants: violet, emerald, sky, amber, pink, cyan, rose) when no image
- **No hand-drawn illustration**. No gradients on backgrounds (except the atmospheric overlay).

### Iconography
- No dedicated icon library
- Unicode characters used as icons: `◆`, `↑`, `↓`, `✦`, `⚡`, `→`
- Farcaster SVG icon used inline (social link)
- Emoji used sparingly as icon-proxies in value-prop cards only (`📊`, `🎯`, `⚡`)
- See **ICONOGRAPHY** section below

---

## ICONOGRAPHY

AgentCrush uses **no external icon library**. Icons are handled by:

1. **Unicode / ASCII glyphs** (primary): `◆` (section marker), `↑↓` (rank movement), `✦` (new/indexed), `⚡` (signals), `→` (navigation)
2. **Inline SVG** for the Farcaster logo (social link in Follow panel)
3. **Emoji** sparingly as decoration in value-prop cards (`📊`, `🎯`, `⚡`, `🔥`)
4. **No icon font**, no Heroicons, no Lucide — the terminal aesthetic avoids icon libraries

### Signal Dot Color System
Signal dots (6px circles with glow) appear in the signal feed and indicate event type:
| Event | Color |
|-------|-------|
| star growth | `#4ade80` |
| dev activity | `#60a5fa` |
| new release | `#e879f9` |
| audience spike | `#e879f9` |
| ranking jump | `#39ff14` |
| ecosystem integration | `#00d4ff` |
| collab win | `#f0a500` |
| just joined | `#fb923c` |
| ecosystem mention | `#a78bfa` |

---

## File Index

```
README.md                    ← This file
SKILL.md                     ← Agent skill definition
colors_and_type.css          ← All CSS variables + semantic classes
assets/
  agentcrush-logo.png        ← Horizontal logo (dark bg)
  agentcrush-logo-transparent.png  ← Transparent version
  agentcrush-icon.png        ← Square icon (192px)
  agentcrush-icon-transparent.png  ← Transparent icon
  og-default.png             ← OG image / social card
  bg-rooftop-1.png           ← Cinematic bg (interior rooftop, night)
  bg-rooftop-2.png           ← Cinematic bg (rooftop alt)
  bg-stage-interior.png      ← Match alert template scene
  bg-rooftop-exterior.png    ← Micro scene template (exterior rooftop)
preview/
  colors-base.html           ← Color palette cards
  colors-semantic.html       ← Semantic / signal colors
  type-scale.html            ← Typography specimens
  type-mono.html             ← Monospace terminal type
  spacing-tokens.html        ← Spacing & radius tokens
  components-buttons.html    ← Button variants
  components-pills.html      ← Archetype pills / badges
  components-cards.html      ← Card patterns with corner accents
  components-rows.html       ← Data row patterns
  components-live.html       ← Live indicators & signal dots
  brand-logo.html            ← Logo variants
  brand-imagery.html         ← Brand photography/backgrounds
ui_kits/app/
  index.html                 ← AgentCrush app UI kit (interactive)
  Nav.jsx                    ← Header + footer components
  RankingRow.jsx             ← Ranking table row
  SignalFeed.jsx             ← Signal feed panel
  AgentCard.jsx              ← Agent card (movers, indexed)
  Pills.jsx                  ← Archetype + signal pill components
```
