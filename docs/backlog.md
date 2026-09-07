# AstroCast Backlog

Categories follow the roadmap: **Must** is required for the current week's definition of done, **Should** improves quality without blocking it, **Later** is deliberately out of scope.

## Week 3 — Complete

- [x] Separate clients, repositories, services, schemas, and routes.
- [x] Remove database operations from route functions.
- [x] Response DTOs that do not expose ORM objects.
- [x] Source timestamps and data-freshness fields.
- [x] `GET /api/space-weather/alerts` with severity, type, source, issued-date, and status filters.
- [x] `GET /api/space-weather/alerts/{id}` returning 404 for missing records.
- [x] Validate filter values.
- [x] Store a time-series metric and expose `GET /api/space-weather/trends/kp`.
- [x] Support start, end, and limit parameters; return ordered chart-friendly points.
- [x] `GET /api/space-weather/trends/solar-wind`.
- [x] Risk engine with Low, Moderate, High, and Severe thresholds.
- [x] Keep raw scientific values separate from interpreted risk.
- [x] Return contributing factors and rule identifiers.
- [x] Threshold boundary tests.
- [x] Deterministic explanation templates for Kp, solar wind, alerts, aurora implications, and technology impacts.
- [x] Caveats where the data cannot support a local conclusion.
- [x] Explanations available in current and detail responses.
- [x] Global exception handlers and a standard error envelope.
- [x] Timeouts and bounded retries for transient source errors.
- [x] Serve stored data during an external outage, verified against a live database.
- [x] Bruno request collection covering every route plus failure cases.
- [x] Update OpenAPI descriptions and `docs/api.md`.
- [x] Week 3 progress report.

Fixed during Week 3 verification, outside the listed tasks:

- [x] Ingestion counter semantics. `normalized_count` now reconciles every source; superseded alerts are no longer reported as skipped duplicates.
- [x] Ingestion 502 responses no longer echo upstream exception text.
- [x] Removed superseded commented-out code from `main.py` and `noaa_alert_parser.py`.

## Week 4 — Must

Multi-page frontend built against mock data first, so layout work does not wait on backend endpoints.

- [x] Add React Router with Dashboard, Observe Tonight, Space Weather, Alerts, Trends, Learn, and About routes.
- [x] Desktop and mobile navigation.
- [x] Page-level loading, empty, and error patterns.
- [x] Shared `Card`, `MetricCard`, `SeverityBadge`, `SectionHeader`, `LoadingState`, `ErrorState`, `EmptyState`, and `DataFreshness` components.
- [x] Night-friendly colour and typography system.
- [x] Dashboard built on mock data.
- [x] Move and improve the Week 1 forecast into the Observe Tonight page.
- [ ] Space Weather and Alerts pages with severity badges and filters.
- [ ] Recharts line charts on mock time series.
- [ ] Learn page concept cards.
- [ ] Responsive and keyboard-navigation review.
- [ ] Week 4 screenshots and report.

## Should

Quality improvements that must not delay required work.

- [ ] Switch the frontend space-weather card to `explanation_detail` and render caveats distinctly.
- [ ] Expose the hourly weather series and the per-factor score penalties from the backend. Both are already fetched and computed in `weather_service.py` and `scoring_service.py`, then discarded before the response, which blocks wiring the Observe Tonight hourly table and score breakdown in Week 5.
- [ ] Structured backend logging.
- [ ] Authenticate the ingestion administration routes.
- [ ] Scheduled ingestion instead of manual runs.
- [ ] Location disambiguation for cities sharing a name; show region and country before selection.
- [ ] Persist searched locations to the `locations` table.
- [ ] Replace the fixed 10:00 PM forecast hour with the next appropriate local observing time.
- [ ] Improve failed-search UI so stale cards cannot be mistaken for valid output.
- [ ] Update corrected NOAA measurements rather than skipping them.
- [ ] Frontend TypeScript interfaces regenerated from the OpenAPI schema.

## Week 8 — Must

- [ ] Replace `backend/requirements.txt` with a trimmed runtime dependency list. It is currently a full `pip freeze` pinning jupyter, streamlit, scikit-learn, matplotlib, seaborn, folium, and pyarrow, none of which AstroCast imports. Left alone during Week 3 because changing it mid-week risks breaking the working virtual environment for no Week 3 benefit, but it would produce a needlessly large Docker image and slow CI.

## Later

Outside the current milestone.

- NASA DONKI event enrichment
- User accounts, saved locations, notifications
- AI summary layer over validated facts
- Interactive sky maps
- Observation journal
- Mobile application
- Partial-record ingestion, populating `failed_count`
