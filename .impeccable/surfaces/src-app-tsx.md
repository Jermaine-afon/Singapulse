---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/components"]
---

# Singapulse app shell (all tabs)

Scope: whole web app (Plan, Discover, Weather, Map tabs, My Trail drawer, modals). Visitor mode: Operate.
Audience/job: visitors planning a day in Singapore; laptop before the trip, phone outdoors during it. Primary task: generate and refine an AI day plan; discovery, weather and map support it.
Constraints: keep every feature, data source and honest labelling; no Wise name, logo or copy; Wise Sans substituted by Inter 900.
Unresolved: real per-landmark photography (only six generic photos exist).

## Direction contract

THESIS: A calm, sage-and-white planning tool where the AI planner card is the hero, the way a converter widget is a fintech hero. Refuses the travel-template arrangement (full-bleed photo hero, duplicate nav, chip-strewn cards, eyebrow labels on every block).

OWN-WORLD: User-pinned system. Sage canvas #e8ebe6 bands, white cards with no borders and 24px radius, near-black olive ink #0e0f0c, one lime accent #9fe870 reserved for primary actions and the active nav/selection, pale lime #e2f6d5 for positive badges, semantic yellow/red for weather risk. Inter: 900 for displays, 600 for sub-displays and labels, 400 body; tabular numerals for times. Pill buttons, 12px-radius inputs with 1px ink borders. Elevation is surface contrast, not shadow.

STORY: The visitor lands on Plan, understands in one line that Singapulse plans a weather-aware day from real places, fills the planner card, gets a timeline, refines it in chat, saves stops to My Trail, and dips into Discover, Weather and Map only as support.

FIRST VIEWPORT: Sticky white nav (wordmark, four tabs, My Trail count). Sage hero band: left, a 900-weight headline at ~64-80px with one sentence beneath and today's weather as a single plain line; right, the white planner card with 1px ink border holding date, times, start point, interests, pace and the lime "Plan my day" pill. On mobile the headline stacks above the card.

FORM: User-pinned design system (pasted fintech system translated to Singapulse); roll c758814d superseded by the user's pin, not a ranked candidate.

SIGNATURE INTERACTION: Generating a plan scrolls to a white timeline band below the hero whose stops enter in sequence with a short exponential ease-out (stagger ~60ms); the chat sits beside it on desktop. Reduced motion shows them at once.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
