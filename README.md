# Transport Report App

Flutter MVP для iOS та Android із Supabase як джерелом маршрутів і Cloudflare Worker для health/runtime configuration.

## Supabase model used by the client

The application reads existing `profiles`, `routes`, and `route_reports` relations. Row Level Security must restrict route selection and report updates to authenticated users with the corresponding role.

Required profile fields: `id`, `full_name`, `role`.

Required route fields: `id`, `route_number`, `origin`, `destination`, `scheduled_at`, `status`, `assigned_logistician_id`.

Required report fields: `route_id`, `logistician_id`, `actual_departure_at`, `actual_arrival_at`, `actual_distance_km`, `fuel_liters`, `notes`, `status`.

`route_reports` must have a unique constraint for `(route_id, logistician_id)` so repeated submissions are idempotent.

## Flutter configuration

```bash
flutter create . --platforms=android,ios
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=SUPABASE_URL=https://your-project.supabase.co --dart-define=SUPABASE_ANON_KEY=your-public-anon-key
flutter build apk --release --dart-define=SUPABASE_URL=https://your-project.supabase.co --dart-define=SUPABASE_ANON_KEY=your-public-anon-key
```

On macOS, validate the unsigned iOS release build with:

```bash
flutter build ios --release --no-codesign --dart-define=SUPABASE_URL=https://your-project.supabase.co --dart-define=SUPABASE_ANON_KEY=your-public-anon-key
```

TestFlight publication additionally requires an Apple Developer team, distribution certificate, provisioning profile, bundle identifier, and App Store Connect API credentials.

## Cloudflare Worker

The Worker exposes:

- `GET /health` — dependency-free service health check.
- `GET /config` — public Supabase URL and anon key from Worker secrets.

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Cloudflare Worker secrets and deploy through the Cloudflare Direct API. GitHub Actions are not used for deployment.
