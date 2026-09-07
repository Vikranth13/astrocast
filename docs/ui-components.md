# Shared UI Components

The reusable presentation layer for the AstroCast frontend, built in Week 4 Day 2. Every
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
| Interaction | `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-accent-text`, `--color-focus` |
| Tones | `--tone-{quiet,info,caution,warning,critical}-{bg,border,text}` |
| Type | `--font-sans`, `--font-mono`, `--text-xs` … `--text-hero`, `--leading-tight`, `--leading-normal` |
| Space | `--space-1` … `--space-8` |
| Radii | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` |

Stylesheets should reference tokens rather than literal colours or pixel values, so a palette
change stays in one file.

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
