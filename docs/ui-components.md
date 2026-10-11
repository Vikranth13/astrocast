# Shared UI Components

The reusable presentation layer for the AstroCast frontend, built in Week 4 Day 2 and
consolidated on Day 7. The page-level structure these fit into is described in
[week-4-ui-structure.md](week-4-ui-structure.md). Every
component lives in `frontend/src/components/ui/` and is purely presentational: none of them
fetch, and none of them know about the API client. That keeps them usable against mock data
during Week 4 and against real responses from Week 5 onward without changes.

Styling comes from design tokens defined in `frontend/src/index.css`. The components share a
single stylesheet, `ui.css`, rather than one file each, because several of them reuse the same
badge, surface, and spacing rules.

## Design tokens

`index.css` defines the whole visual system as custom properties on `:root`. The palette is
dark-only — `color-scheme: dark` — because AstroCast is used at night.

| Group | Tokens |
| --- | --- |
| Surfaces | `--color-bg`, `--color-surface`, `--color-surface-raised` |
| Lines | `--color-border`, `--color-border-strong` |
| Text | `--color-text`, `--color-text-muted`, `--color-text-heading` |
| Interaction | `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-accent-text`, `--color-action`, `--color-action-hover`, `--color-focus` |
| Tones | `--tone-{quiet,info,caution,warning,critical}-{bg,border,text}` |
| Type | `--font-sans`, `--font-mono`, `--text-xs` … `--text-hero`, `--leading-tight`, `--leading-normal` |
| Space | `--space-1` … `--space-8` |
| Radii | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` |

Stylesheets should reference tokens rather than literal colours or pixel values, so a palette
change stays in one file.

Filled buttons use `--color-action`, not `--color-accent`. White text on the accent blue measures
3.7:1, below the 4.5:1 WCAG AA requires for body-size text; `--color-action` gives 5.2:1. The
accent stays for links, chart lines, and meters, where it is drawn on the dark page at 5.3:1.

## Tone mapping

`severity.ts` holds the tone scale and the functions that map backend enumerations onto it. It
is a plain module with no components, so component files export only components.

`Tone` is `"quiet" | "info" | "caution" | "warning" | "critical"`.

| Function | Input | Notes |
| --- | --- | --- |
| `toneForNoaaScale` | `"G1"`–`"G5"`, `"R1"`–`"R5"`, `"S1"`–`"S5"`, or `null` | Tone comes from the **digit**; the family letter does not change urgency. `null` is `quiet`. |
| `toneForRiskLevel` | `low`, `moderate`, `high`, `severe` | The risk engine's own scale. |
| `toneForActivityLevel` | `below_storm` … `extreme` | Geomagnetic activity level. |
| `toneForFreshness` | `current`, `delayed`, `stale` | |
| `toneForAlertStatus` | `active`, `expired`, `unknown` | |

`severity.ts` also holds the backend's alert enumerations as runtime lists — `ALERT_STATUSES`,
`ALERT_TYPES`, and `ALERT_SEVERITIES` — with their types derived from them. The Alerts filters
use these both to build their options and to ignore URL values the backend would reject.

Note that NOAA alert severity is a **scale code**, not a word. A `G3` alert must render as
`G3`. Rendering it as "High" would present a derived judgement as though NOAA had issued it.

## Components

### Card

The base surface. Everything with a border and a background should use it rather than
re-declaring the surface rules.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `children` | `ReactNode` | yes | |
| `className` | `string` | no | Appended to `ui-card` for layout variations. |

### SectionHeader

A titled section boundary, optionally with a description and a control on the right.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | `string` | yes | Rendered as an `h2`. |
| `description` | `string` | no | Constrained to 70 characters per line for readability. |
| `action` | `ReactNode` | no | Right-aligned slot for a filter, link, or badge. |

### MetricCard

A single labelled measurement.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `label` | `string` | yes | |
| `value` | `string \| number \| null \| undefined` | yes | `null` and `undefined` render an em dash. |
| `unit` | `string` | no | Hidden when the value is missing, so no bare unit is shown. |
| `footnote` | `string` | no | Small print under the value, e.g. an observation time. |

`0` is a real measurement and renders as `0`, not as a dash. Several backend fields
(`a_running`, `station_count`, `speed_km_s`) are genuinely nullable, so the distinction
matters.

### SeverityBadge

A pill showing a status or scale code.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `label` | `string` | yes | Rendered verbatim. |
| `tone` | `Tone` | no | Defaults to `quiet`. Pair with a `toneFor…` helper. |

### DataFreshness

Shows how old stored data is. Wraps `SeverityBadge` for the status and formats the age.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | `"current" \| "delayed" \| "stale"` | yes | |
| `ageMinutes` | `number` | yes | Rendered as `45 minutes`, `3 hours`, or `3h 15m`. |

Because space-weather reads are served from storage rather than live NOAA calls, every view of
that data should show its age.

### LoadingState, ErrorState, EmptyState

The three page-level states. Each takes one optional `message` prop and falls back to a
default. `LoadingState` renders `role="status"` with `aria-live="polite"`; `ErrorState` renders
`role="alert"`; `EmptyState` renders neither, because an empty result is not an event a screen
reader should be interrupted for.

### PageState

Not part of the `ui/` set — it lives at `components/PageState.tsx` and composes the three state
components behind the page-level contract defined on Day 1.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | `"loading" \| "error" \| "empty" \| "ready"` | yes | |
| `loadingMessage`, `errorMessage`, `emptyMessage` | `string` | no | Forwarded to the matching state. |
| `children` | `ReactNode` | no | Rendered only when `status` is `ready`. |

Pages should hold one status value and render through `PageState` rather than writing their own
conditional chains.

### PageSection

A titled region of a page. It renders a `section` whose accessible name is its own heading, so
screen readers can list the sections on a page and jump between them.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | `string` | yes | Rendered as the section's `h2` and used to name the region. |
| `description` | `string` | no | Forwarded to `SectionHeader`. |
| `action` | `ReactNode` | no | Right-aligned slot, such as the freshness badge on Space Weather. |
| `children` | `ReactNode` | yes | |

### Meter

A thin bar for a value from 0 to 100.

| Prop | Type | Required | Notes |
| --- | --- | --- | --- |
| `percent` | `number` | yes | Clamped to 0–100. |
| `tone` | `"accent" \| "caution"` | no | Defaults to `accent`. `caution` marks a penalty. |
| `className` | `string` | no | For sizing, such as the fixed-width meters in the hourly table. |

A meter is `aria-hidden`. It always sits beside the number it draws, so assistive technology
reads the number once rather than twice.

## Feature components built on the primitives

These live beside the feature that owns them, but more than one page uses each.

| Component | Location | Used by |
| --- | --- | --- |
| `ScoreReadout` | `components/observe/` | The `74 / 100 Good` display on the Dashboard and Observe Tonight. |
| `AlertBadges` | `components/alerts/` | Type, scale, and status badges on the alert list, the alert detail page, and the Dashboard. |
| `ExplanationPanel` | `components/spaceWeather/` | Space Weather and alert detail. Renders a backend explanation with its caveats in a separate note. |
| `TrendLineChart` | `components/trends/` | Trends. A line chart with a text summary and a data table, described below. |

`TrendLineChart` takes `title`, `points` (`{ observed_at, value | null }`), `unit`, and optional
`curve`, `yDomain`, `yTicks`, `thresholds`, and `formatValue`. A `null` value is drawn as a gap,
never joined across. The chart is exposed to assistive technology as a single image named by its
summary, and the collapsible data table is the keyboard route to every reading.

## Layout and type classes

`ui.css` also holds the small set of classes pages are composed from, so a feature stylesheet only
contains layout that genuinely belongs to that feature.

| Class | Use |
| --- | --- |
| `.page-sections` | The vertical stack of sections on a page. |
| `.page-section` | One section. Applied by `PageSection`. |
| `.ui-stack` | A vertical stack inside a card. |
| `.ui-row` | A label and a value pushed to opposite ends, wrapping on narrow screens. |
| `.ui-grid` | An auto-fit card grid with a 240px minimum column. `.ui-grid-compact` (200px) and `.ui-grid-wide` (280px) adjust it. |
| `.ui-span-2`, `.ui-span-all` | Widen a grid item. `.ui-span-2` resets below 900px. |
| `.ui-badge-row` | A wrapping row of badges. |
| `.ui-eyebrow` | The small uppercase label above a card's content. |
| `.ui-label` | A smaller uppercase label for definition terms and field labels. |
| `.ui-card-title` | A title inside a card, used on an `h3`. |
| `.ui-headline` | The large bold value in a card. |
| `.ui-muted`, `.ui-caption`, `.ui-footnote` | Secondary text at body, small, and extra-small size. |
| `.ui-title-link` | A heading link that reads as a heading until it is hovered. |
| `.ui-button-secondary` | The quieter button, used by the menu toggle and Clear filters. |
| `.visually-hidden` | Hidden on screen but still read aloud, such as the city search label. |

Before Day 7 each page carried its own copy of most of these. A scan for identical rule bodies
across the stylesheets found 53 redundant rules in 24 groups. After consolidation the same scan
finds 5, and each is a coincidence of two unrelated rules sharing one declaration.
