# Transport Report App

Мобільний застосунок транспортної звітності для iOS та Android на Flutter.

## Джерело даних

Основою є реальний логістичний куб Excel, який імпортується в Supabase.

Поточна модель:

- `routes` — один маршрут на дату; `route_delivery_id` = реальний ID маршруту з поля `ID Доставки`;
- `route_points` — унікальні фізичні ТТ усередині маршруту;
- `route_business_allocations` — бізнес + EmployeeID усередині ТТ;
- `source_documents` — всі вихідні рядки-накладні;
- `route_facts` — факт логіста: водій, авто, перевізник, хвиля, тариф, коментар;
- `profiles` — ролі користувачів після застосування `supabase_migration_v3.sql`.

## Ролі

- `admin` — повний доступ;
- `manager` — перегляд усіх маршрутів/звітів;
- `logistician` — обирає свої маршрути та заповнює фактичні дані.

## Flutter

```bash
flutter create . --platforms=android,ios --project-name transport_report_app --org com.transportreport
flutter pub get
flutter analyze
flutter run
```

Без Supabase ключів застосунок може працювати в demo mode після переходу на UI v0.2.

Для реального підключення:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=YOUR_LEGACY_ANON_KEY
```

## CI

`.github/workflows/flutter-ci.yml` автоматично:

1. встановлює Flutter;
2. створює відсутні Android/iOS platform folders;
3. запускає `flutter pub get`;
4. запускає `flutter analyze`;
5. збирає Android APK;
6. публікує APK як GitHub Actions artifact.

## Supabase

У проєкті Supabase вже використовується кубова схема. Для авторизації, ролей та вибору логістом своїх маршрутів потрібно один раз виконати `supabase_migration_v3.sql` у SQL Editor.

## iPhone / TestFlight

Після стабільної Flutter-збірки підключаємо Apple Developer + App Store Connect. GitHub CI для iOS/TestFlight буде окремим етапом, оскільки потрібні Apple credentials і code signing.
