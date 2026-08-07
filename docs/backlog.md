# AstroCast Backlog

## Week 2 Must

These items are required for the Week 2 definition of done.

- [ ] Preserve all existing Week 1 routes and frontend forecast behavior.
- [ ] Run PostgreSQL locally with a documented command.
- [ ] Prefer Docker Compose for local PostgreSQL.
- [ ] Install SQLAlchemy.
- [ ] Install Alembic.
- [ ] Install a PostgreSQL driver.
- [ ] Centralize `DATABASE_URL` and API configuration.
- [ ] Create database engine and session modules.
- [ ] Verify FastAPI can connect to PostgreSQL.
- [ ] Add database health verification.
- [ ] Create a `locations` model.
- [ ] Create a `space_weather_alerts` model.
- [ ] Create a `space_weather_measurements` model.
- [ ] Create an `api_fetch_logs` model.
- [ ] Create the first Alembic migration.
- [ ] Apply, roll back, and reapply the migration.
- [ ] Add unique constraints that support deduplication.
- [ ] Document the schema in `docs/database.md`.
- [ ] Choose one NOAA SWPC endpoint.
- [ ] Create a source-specific NOAA client.
- [ ] Add timeout and error handling to the NOAA client.
- [ ] Inspect and document the external JSON structure.
- [ ] Add Pydantic source-response schemas where practical.
- [ ] Parse NOAA data into normalized internal records.
- [ ] Create an ingestion service.
- [ ] Store new normalized records.
- [ ] Skip duplicate records.
- [ ] Write an API fetch log for every successful attempt.
- [ ] Write an API fetch log for every failed attempt.
- [ ] Return fetched, inserted, skipped, and failed counts.
- [ ] Create `POST /api/admin/ingestion/noaa`.
- [ ] Verify repeated ingestion does not add duplicates.
- [ ] Create simple rule-based risk classification.
- [ ] Create `GET /api/space-weather/current`.
- [ ] Return source timestamp and freshness.
- [ ] Return risk level and source facts.
- [ ] Return a plain-English explanation.
- [ ] Add one real space-weather frontend card.
- [ ] Add parser unit tests.
- [ ] Add risk-classification unit tests.
- [ ] Add a mocked ingestion integration test.
- [ ] Update README setup instructions.
- [ ] Update the environment-variable example.
- [ ] Create the Week 2 progress report.
- [ ] Capture screenshots or API examples.
- [ ] Merge or tag Week 2 only after the definition of done passes.

## Should

These improvements support quality but must not delay the required work.

- [ ] Add `.env.example`.
- [ ] Add structured backend logging.
- [ ] Add explicit response schemas for ingestion endpoints.
- [ ] Save a sanitized NOAA response fixture for tests.
- [ ] Add a source-freshness label to the frontend.
- [ ] Add helpful empty-state behavior when NOAA data has not been ingested.
- [ ] Add clear admin-endpoint error responses.
- [ ] Add type hints and focused docstrings to new backend modules.
- [ ] Add a Postman or Bruno request collection.
- [ ] Add location disambiguation for cities sharing the same name.
- [ ] Display city, region, and country before final location selection.
- [ ] Request forecasts using selected coordinates.
- [ ] Improve failed-search UI so result cards cannot be mistaken for valid output.
- [ ] Replace the fixed first-day 10:00 PM selection with the next appropriate local observing time.
- [ ] Remove or integrate unused placeholder frontend components.

## Later

These items are intentionally outside Week 2.

- Multiple NOAA sources
- NASA DONKI integration
- User accounts
- Favorite locations
- Notifications
- AI-generated summaries
- Historical trend dashboards
- Full frontend redesign
- Interactive sky maps
- Observation journal
- Advanced object-specific observing scores
- Mobile application
- Cloud deployment
- GitHub Actions
- Replacing FastAPI with Spring Boot
