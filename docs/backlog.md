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
- [x] Space Weather and Alerts pages with severity badges and filters.
- [x] Recharts line charts on mock time series.
- [x] Learn page concept cards.
- [x] Responsive and keyboard-navigation review.
- [ ] Week 4 screenshots and report.

## Week 5 — Must

Replace mock data with typed real API calls, keeping UI behaviour stable.

- [x] Shared TypeScript response types matching the backend schemas.
- [x] API client modules by feature.
- [x] Centralized base URL and error parsing.
- [x] No direct fetch calls in UI components.
- [x] Dashboard connected to the local observing and current space-weather endpoints. The Dashboard's latest-alert and mini-trend cards were connected on Day 2 as well; the Alerts and Trends pages remain Days 3 and 4.
- [x] Independent loading and error states, so one failed source does not blank the dashboard.
- [x] Data timestamps and freshness shown.
- [ ] Alert list and detail pages connected.
- [ ] Filter controls connected to backend query parameters.
- [ ] Pagination or result limits if needed.
- [ ] No-results and expired-alert states.
- [ ] Kp and solar-wind trends connected.
- [ ] Units and timestamps formatted consistently.
- [ ] Accessible chart labels and text summaries.
- [ ] Forecast snapshots saved when appropriate.
- [ ] Recent searches or location history endpoint, without user accounts.
- [ ] Recent forecast comparisons or a small history list.
- [ ] Request cancellation for superseded searches.
- [ ] Duplicate button submissions prevented.
- [ ] Friendly retry controls.
- [ ] Backend errors never expose internal traces.
- [ ] Full application run from a clean setup.
- [ ] Expected and invalid cities tested.
- [ ] Backend-unavailable and NOAA-unavailable scenarios tested.
- [ ] Documentation and Week 5 report.

Fixed during Week 5, outside the listed tasks:

- [x] `/geocode`, `/forecast`, and `/apod` 502 responses no longer echo upstream exception text. The APOD message had included the request URL, and with it the NASA API key. Found on Day 1, because correct error parsing would have shown that text in the UI.

## Should

Quality improvements that must not delay required work.

- [ ] Switch the frontend space-weather card to `explanation_detail` and render caveats distinctly.
- [x] Expose the hourly weather series and the per-factor score penalties from the backend. Done on Week 5 Day 2, together with a best observing window and a Pydantic response model for `/forecast`.
- [ ] Structured backend logging.
- [ ] Authenticate the ingestion administration routes.
- [ ] Scheduled ingestion instead of manual runs.
- [ ] Location disambiguation for cities sharing a name; show region and country before selection.
- [ ] Persist searched locations to the `locations` table.
- [ ] Replace the fixed 10:00 PM forecast hour with the next appropriate local observing time. Since Week 5 Day 2 the hourly night (18:00 for twelve readings) and the best window are anchored to the same first forecast day, so a search made late in the evening can report hours that have already passed.
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
