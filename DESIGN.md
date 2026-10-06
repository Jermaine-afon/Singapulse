---
name: Singapulse
description: A calm, weather-aware day planner for visiting Singapore.
colors:
  primary: "#9fe870"
  primary-active: "#cdffad"
  primary-pale: "#e2f6d5"
  canvas: "#ffffff"
  canvas-soft: "#e8ebe6"
  canvas-line: "#d3d8d0"
  ink: "#0e0f0c"
  ink-deep: "#163300"
  body: "#454745"
  mute: "#6b6d6a"
  positive: "#2ead4b"
  positive-deep: "#054d28"
  warning: "#ffd11a"
  warning-pale: "#fff3c4"
  warning-deep: "#b86700"
  warning-content: "#4a3b1c"
  negative: "#d03238"
  negative-pale: "#fbe3e3"
  negative-deep: "#a72027"
  negative-darkest: "#a7000d"
  category-coastal: "#0b7fae"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(3rem, 7.5vw, 5.75rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
  title-sm:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body-lead:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'calt', 'cv11'"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
  numeral:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1.4
    fontFeature: "'tnum'"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink-deep}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-active}"
  button-secondary:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.canvas-line}"
  button-tertiary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
    height: "48px"
  button-tertiary-hover:
    backgroundColor: "{colors.canvas-soft}"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
    height: "48px"
  button-ghost-hover:
    backgroundColor: "{colors.canvas-soft}"
  button-sm:
    rounded: "20px"
    padding: "8px 16px"
    height: "40px"
  button-icon:
    rounded: "{rounded.pill}"
    size: "44px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-soft:
    backgroundColor: "{colors.canvas-soft}"
    rounded: "{rounded.xl}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
  badge-positive:
    backgroundColor: "{colors.primary-pale}"
    textColor: "{colors.positive-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  badge-warning:
    backgroundColor: "{colors.warning-pale}"
    textColor: "{colors.warning-content}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  badge-negative:
    backgroundColor: "{colors.negative-pale}"
    textColor: "{colors.negative-darkest}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  badge-neutral:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  nav-tab:
    textColor: "{colors.body}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  nav-tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink-deep}"
  footer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas-soft}"
---

# Design System: Singapulse

## Overview

**Creative North Star: "The Calm Ledger"**

Singapulse is a planning tool before it is a travel brochure. The world is a sage-and-white ledger: soft sage bands carry the page, white cards sit inside them without borders, and near-black olive ink does all the talking. One lime accent marks the thing to do next, and nothing else. The day-planner card is the hero object, the way a calculator widget is the hero of a finance product; the headline beside it is set in very heavy Inter so the page has a voice without needing photography.

Density is moderate and deliberate. Forms are generous (48px controls), times and readings are tabular, and depth comes from surface contrast (white on sage, sage on white) rather than shadow. Motion is short and exponential: content rises into place, overlays fade, and reduced-motion users see everything at once.

The system explicitly refuses the travel-template arrangement: no full-bleed photo hero, no eyebrow labels over every block, no cards strewn with chips. Photography appears only inside landmark cards and modals, inset in a rounded frame.

**Key Characteristics:**
- Sage (#e8ebe6) bands alternate with white sections; white cards on sage, sage panels on white.
- One lime accent for primary actions, the active nav tab, selection and the wordmark dot.
- Inter only: 900 for display voice, 600 for titles and labels, 400 for body.
- Pill buttons and chips, 24px cards, 12px inputs with a 1px ink border.
- Flat by default; shadows only for floating things (dropdowns, map controls, map labels).
- Tabular numerals for every time, duration and reading.

## Colors

A quiet sage-and-ink neutral field with a single lime accent and a semantic set reserved for weather risk and status.

### Primary
- **Signal Lime** (primary): the one accent. Primary action pills ("Plan my day", "Save to My Trail"), the active nav tab, the saved-state bookmark button, text selection, the focus glow on inputs and the dot after the wordmark. Text on it is always Deep Forest Ink, never white.
- **Lime Glow** (primary-active): hover state of lime buttons only.
- **Pale Lime** (primary-pale): positive badge fill ("Rain-safe", "Live").

### Neutral
- **Paper White** (canvas): page sections, cards on sage, header, modals, inputs.
- **Sage Mist** (canvas-soft): hero and tab bands, secondary buttons, cards on white (timeline stops, refine chat), stat tiles, segmented-control track, skeletons.
- **Sage Rule** (canvas-line): the header's bottom hairline, dividers inside cards, timeline spine, chip outline, secondary-button hover.
- **Olive Ink** (ink): headlines, body emphasis, the 1px input and tertiary-button stroke, selected chips, dark buttons, user chat bubbles, the footer band, focus outlines, scrim base (at 60%).
- **Deep Forest Ink** (ink-deep): text on lime surfaces; native checkbox/range accent.
- **Graphite Body** (body): running text and secondary copy.
- **Stone Mute** (mute): placeholders, end times, hints, captions. Set at #6b6d6a so it holds 4.5:1 on sage.

### Semantic
- **Positive** (positive / positive-deep): live-data dot, "good to go" verdict icon, greenery map pins; deep shade is badge text.
- **Warning** (warning-pale / warning-deep / warning-content): model-estimate badges, plan notices band, sun and heat icons, heritage pins.
- **Negative** (negative-pale / negative / negative-darkest): error alerts and validation text, high-risk badges, food-street pins.
- **Coastal Blue** (category-coastal): the coastal category dot and pin, and the simulated rain-radar cells on the map. A data colour, not a brand accent.

### Named Rules
**The One Lime Rule.** Lime marks the next action or the current selection, and appears on at most one or two elements per viewport. There is no second brand accent.

**The Ink On Lime Rule.** Anything on lime is set in Deep Forest Ink. Never white text on lime, never lime on green.

**The Semantic-Only Colour Rule.** Yellow, red and green appear only to report weather risk, data status, errors or map categories, never as decoration.

## Typography

**Display Font:** Inter 900 (with ui-sans-serif, system-ui fallback)
**Body Font:** Inter 400 / 600
**Label/Mono Font:** Inter 600 with tabular numerals for figures

**Character:** One family pushed to its extremes: a black, tightly tracked display that reads as a wordmark-grade voice, against plain, comfortable 400 body text. The contrast in weight does the work a second typeface would otherwise do.

### Hierarchy
- **Display** (900, clamp 3rem to 5.75rem, line-height 0.92, -0.03em): the single hero headline per page. The same treatment sets the wordmark (24px header, 30px footer) and the weather temperature reading (60 to 72px).
- **Headline** (900, 2.25rem mobile to 3rem desktop, 0.92): generated plan titles.
- **Title** (600, 1.5rem): card headings ("Your day", weather location). A 1.25rem step titles secondary cards and asides.
- **Title-sm** (600, 1.125rem): landmark and timeline stop names.
- **Body-lead** (400, 1.125rem to 1.25rem, relaxed): the one sentence under a headline, max ~28rem wide.
- **Body** (400, 1rem, 1.5): running text; 15px for chat bubbles, stop notes and nav tabs.
- **Label** (600, 0.875rem): field labels, chips, badges, small buttons. Sentence case, no tracking.
- **Numeral** (900, 1.125rem to 1.25rem, tabular): timeline start times; secondary times drop to 0.75rem mute.

### Named Rules
**The Nine Hundred Rule.** Hero and plan headlines are Inter 900. Never lighten the display weight; hierarchy below it comes from size, then 600.

**The Tabular Times Rule.** Every time, date, duration, temperature and count uses tabular numerals so columns of times align.

**The Sentence Case Rule.** Labels and buttons are sentence case at normal tracking. No uppercase micro-labels.

## Layout

A 1280px max container (max-w-7xl) with 16 / 24 / 32px side gutters at mobile / sm / lg. Each tab is one full-width band: sage for Plan's hero, Discover, Weather and Map; white for the plan results; ink for the footer. Bands use 40px vertical padding on mobile and 56px from sm (80px for the Plan hero at lg).

- **Plan hero:** two columns at lg (fluid headline column, 500px planner card, 64px gap); stacks with headline first below lg.
- **Plan results:** fluid timeline plus a 380px sticky refine aside at lg (sticky at 96px).
- **Timeline:** a three-track grid (time 64/80px, node 44/52px, content) with a 1px sage spine between nodes.
- **Discover:** a card grid; cards hold photo, facts and a three-up action row.
- **Spacing rhythm:** 4px base; 8, 12, 16, 20, 24 inside cards; 24 to 32 between groups; 40 to 64 between columns.
- **Header:** 64px sticky white bar; at md and up, tabs sit inline centred; below md they become a four-column row beneath the bar.
- **Breakpoints:** Tailwind defaults (sm 640, md 768, lg 1024). Map height 440px mobile, 560px from sm.

## Elevation & Depth

Flat by default. Depth is tonal: white on sage, sage on white, ink under a 60% scrim. Shadow appears only on things that float above other content or the map, and is always a soft olive-ink ambient, never a hard offset.

### Shadow Vocabulary
- **Segment lift** (`0 1px 2px rgb(14 15 12 / 0.12)`): the selected option in a segmented control.
- **Floating panel** (`0 8px 24px rgb(14 15 12 / 0.12)`): autocomplete dropdowns.
- **Map float** (`0 2px 8px rgb(14 15 12 / 0.14)`): zoom control, map labels, radar captions.
- **Pin** (`0 1px 3px rgb(14 15 12 / 0.35)`): map pin dots.
- **Input focus glow** (`0 0 0 3px #9fe870`): input focus ring (a ring, not elevation).

### Named Rules
**The Surface Contrast Rule.** Cards never get a border or shadow to separate them from the page; they separate by colour. A card on sage is white; a card on white is sage.

## Shapes

Soft, generous rounding throughout, scaled by element size. Cards, modals and the planner card are 24px; nested panels (stat tiles, alerts, photo frames inside cards, dropdowns) step down to 16px; segmented options to 12px; inputs to 12px; map tooltips and the attribution corner to 8px. Buttons are 24px pill-rectangles (20px at small size); chips, badges, icon buttons, nav tabs and timeline nodes are full pills or circles. Strokes are rare and always 1px: ink on inputs, tertiary buttons and the planner card; sage on chips at rest. Chat bubbles are 24px with one 8px tail corner toward the speaker.

## Components

### Buttons
Confident and tactile: 48px tall, 600 weight, a 0.98 press scale.
- **Shape:** pill-rectangle (24px radius; 20px for the 40px small size); icon buttons are 44px circles.
- **Primary:** Signal Lime with Deep Forest Ink text, 12px 24px padding; hover to Lime Glow. One per view.
- **Secondary:** Sage Mist fill, ink text; hover to Sage Rule. Used for My Trail and refresh.
- **Tertiary:** white with a 1px inset ink stroke; hover to sage. "Details" and "Place details".
- **Dark:** ink fill, white text; hover #2a2c27. Strong non-primary actions ("Getting there", chat send, sheltered alternative).
- **Ghost:** transparent ink text; hover sage. Inline secondary actions ("Show on map", "Forecast", "Route").
- **Focus / Disabled:** 2px ink outline at 2px offset; disabled at 50% opacity with not-allowed cursor. Transitions 160ms ease.

### Chips
- **Style:** white pill, 36px tall, 600 label, 1px inset Sage Rule outline.
- **State:** hover darkens the outline to ink; pressed (`aria-pressed`) fills ink with white text. Used for interests and chat quick-replies.

### Segmented Control
Sage track at 16px radius with 4px inset; options at 12px radius carry a label and a mute hint. Selected option becomes white with the segment-lift shadow. Used for planner pace.

### Badges
Small status pills (4px 12px, or 2px 10px small), 600 label, optional leading icon or dot: positive (pale lime / positive-deep), warning (pale yellow / warning content), negative (pale red / negative-darkest), neutral (sage / ink).

### Cards / Containers
- **Corner Style:** 24px.
- **Background:** white on sage, sage on white (see Surface Contrast Rule).
- **Shadow Strategy:** none.
- **Border:** none, except the hero planner card, which carries a 1px ink ring as the page's signature object.
- **Internal Padding:** 24px (32px for the planner card at sm); landmark cards use an 8px frame around an inset 16px-radius photo, then 16px content padding.
- **Notices:** 16px-radius tinted bands (warning-pale, negative-pale) with a leading 16px icon and 14px text.

### Inputs / Fields
- **Style:** 48px tall, 12px radius, 1px ink border, white fill, 16px text, mute placeholder; selects use a custom ink chevron at 16px from the right. Labels sit above at 14px / 600 with 6px gap.
- **Focus:** border stays; a 3px Signal Lime ring appears (160ms).
- **Error:** inline 14px / 600 negative-darkest text beneath; form-level errors use the negative notice band.

### Navigation
Sticky white header with a sage hairline. Wordmark in display weight followed by a small lime dot. Tabs are 15px / 600 pills: Graphite Body at rest, ink on sage on hover, Signal Lime with Deep Forest Ink when active (`aria-current="page"`). My Trail is a small secondary button with a white count pill. On mobile the tabs become an equal four-column row of short labels under the bar.

### Plan Timeline (signature)
Each stop is a row: tabular 900 start time over a mute end time, a 36px circular node on a 1px sage spine (ink node with lime icon for landmark stops, sage node with ink icon for meals and breaks), and content. Landmark stops sit in a 24px sage panel with title, meta, a rain-safe badge and tertiary/ghost small buttons; meal and break stops are unboxed text. Stops enter with the rise motion (420ms, cubic-bezier(0.16, 1, 0.3, 1), 10px lift) staggered 60ms.

### Refine Chat
Sage aside. Assistant bubbles white, user bubbles ink with white text, both 24px with an 8px corner toward the speaker. Quick-reply chips beneath, then a borderless white input with a 44px dark circular send button.

### Overlays (Modals and My Trail drawer)
Ink scrim at 60% that fades in (260ms); modal panels are white, 24px radius, and rise in; the drawer slides from the right edge. Max height respects the dynamic viewport.

### Map
OneMap Grey basemap with a #d1d1d1 container fill so out-of-coverage sea blends in. Pins are 2px white-ringed dots in the category colour (architecture ink, heritage warning-deep, greenery positive, food negative, coastal Coastal Blue); a translucent ring pings around the selected or hovered pin (1.4s, removed under reduced motion); a small lime dot with a forest-ink ring marks rain-safe pins. The start point is an ink dot with a soft ink halo; routes are 3px dashed ink. Zoom controls are a white pill stack (40px cells) with the map-float shadow; labels are 12px / 600 white tooltips at 8px radius; radar captions are white pills, hidden below 640px. Simulated radar cells are Coastal Blue at 22% and a deeper blue at 14%, always labelled as simulated. The selected-place panel floats bottom-right at 16px radius on sm and up.

### Motion
- **Rise** (420ms, cubic-bezier(0.16, 1, 0.3, 1)): entering content, modals, timeline stops, map detail panel.
- **Fade** (260ms, same curve): tab bands, scrims, dropdowns.
- **State** (160ms ease): button, chip, input colour and ring changes; 0.98 press scale.
- **Reduced motion:** all animations and transitions collapse to 1ms; the pin ping stops.

## Do's and Don'ts

### Do:
- **Do** put white cards on sage bands and sage panels on white sections; separate by surface, not stroke.
- **Do** keep Signal Lime to the primary action, the active tab, selection and the wordmark dot, with Deep Forest Ink text on it.
- **Do** set hero and plan headlines in Inter 900 at -0.03em and 0.92 line-height.
- **Do** use 48px pill-rectangle buttons (24px radius) and 12px-radius inputs with a 1px ink border and a 3px lime focus ring.
- **Do** set every time, duration and reading in tabular numerals.
- **Do** label estimates and simulations honestly with badges (warning for model estimate, neutral for forecast estimate, positive for live).
- **Do** keep shadows soft olive-ink ambients, used only for floating elements over content or the map.

### Don't:
- **Don't** add a second brand accent, or use semantic yellow, red or green decoratively.
- **Don't** put lime on lime or green backgrounds, or white text on lime.
- **Don't** set the hero display lighter than 900 or swap in a second display face.
- **Don't** use sharp-cornered buttons or square chips.
- **Don't** add borders or drop shadows to resting cards.
- **Don't** add uppercase eyebrow labels above headings, or a full-bleed photo hero.
- **Don't** use Stone Mute for anything but secondary information; body copy is Graphite Body or Olive Ink.
