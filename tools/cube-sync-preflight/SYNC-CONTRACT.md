# Контракт наступного етапу — НЕ опис уже активованих функцій

## Перевірений поточний стан

- Репозиторій: boyancik-art/transport-report-app, cloudflare-migration,
  ce3717bc06ad3a6ed89e6be3e70a79360ef06279; web TEST v44.7.
- Supabase project ccmwhtojyofefyzespty; endpoint import-cube-json v1.
- Старий JSON import не атомарний і видаляє документи та ТТ до запису.
- route_points має nullable customer_id в UNIQUE; allocations має nullable
  employee_id/business_unit. Upsert з NULL сам по собі не гарантує відсутності дублів.
- Наявна перевірка gateway JWT не замінює перевірки active Administrator усередині handler.
- Базові одиниці/суми та формули SAV/STV не змінюються.

## Передумови активації

1. Фактичний preflight з Windows підтверджує refresh і дозволяє перевірити
   повноту вибірки за 01.08–03.09 включно (не лише min/max).
2. Унікальний, стабільний source row ID; відхилення неоднозначних записів,
   без мовчазного dedupe/додавання фінансових значень або row index у ключ.
3. Перевірена відповідність source row → invoice → TT → route, включно зі
   зміною адреси/маршруту/бізнесу, виправленням документа і скасуваннями.
4. Перевірені дозволи робочого ПК: інтерактивний Excel, доступ до Куба,
   корпоративне виконання скриптів. Автоматизація Office під SYSTEM не застосовується.

## Безпечний FORCE

Administrator створює запит з періодом на сервері. Сервер перевіряє чинну
роль/active у profiles; user_metadata не використовується для прав.
Локальний worker робить outbound HTTPS polling, без відкритого порту на ПК.
Зареєстрований worker має окремий відкличний credential з мінімальними правами,
збережений через Windows DPAPI. service_role не передається на ПК/у браузер.

Реквізити запиту: UUID, source ID, mode, period, requested_by, requested_at,
status, lease token/expiry, worker ID, attempt, start/finish, refreshed_at,
manifest hash, added/updated/skipped/errors. Стани:
queued → running → succeeded / failed. Втрата lease → failed/retryable,
а не success. В офлайні ПК запит залишається queued.

Claim атомарний через FOR UPDATE SKIP LOCKED або еквівалентний single-update;
тільки поточний lease owner може подовжувати lease і завершувати запит.
Retry/повторне натискання не створюють дубль імпорту. UI читає фактичний статус,
не пише «Оновлено» при постановці запиту. Сервер сам встановлює final success
після commit, worker не може самостійно позначити невиконаний імпорт успішним.

## DAILY / incremental

Використовує той самий refresh+upload pipeline, що FORCE. Перед записом:
повний валідований staging manifest, кількість чанків/рядків, контрольна сума,
підтверджений source ID/period/refresh evidence, idempotency key.

Commit — одна транзакція з серіалізацією для джерела. Стабільні source keys,
route ID/TT ID зберігаються. Змінюються лише source-owned поля і вже визначені
агрегати; ручні тарифи, групування, додаткові ТТ, призначення й витрати не зачіпаються.
Упередження nullable uniqueness перевіряється до активації, без небезпечного
злиття різних ТТ. Відсутність рядка в частковому snapshot не означає видалення.
Скасування/переміщення — тільки за підтвердженою семантикою джерела.

Поточний destructive endpoint не є fallback. Помилка будь-якого етапу
скасовує весь commit. Повторний merge того самого payload дає нуль змін.
Видалені Administrator маршрути не воскресають при наступній синхронізації.

## CLEAN — залишається вимкненим

Окреме майбутнє підтвердження користувача для конкретного source manifest hash
і періоду. До нього: backup/перевірка відновлення, повнота джерела, inventory
FK/залежностей, точний allowlist операційних таблиць. Жодного TRUNCATE CASCADE
по всій схемі та видалення користувачів/довідників/іншої retail-системи.
Одноразовий journal marker, атомарність очищення+імпорту, збереження тарифів,
зон та правил SAV/STV. Старі ручні витрати не відновлюються. CLEAN не доступний
щоденному worker credential і не виконується після звичайного FORCE.

## Task Scheduler (після backend regression)

Installer має встановлювати під поточним користувачем два завдання:
короткий polling і ранковий DAILY з погодженим часом/часовим поясом.
InteractiveToken/RunOnlyWhenLoggedOn, без збереження Windows-пароля,
IgnoreNew + mutex + timeout, повтор при мережевій помилці, backlog коли ПК недоступний.
Статус offline/last heartbeat видимий Administrator. Нічого не вважати
«щоденно налаштованим», доки не перевірені реальний запуск і наступний повтор.

## Regression до активації

- reorder, identical retry, доданий/змінений документ, nullable keys, колізії;
- неповний payload, missing chunk, некоректні дати, Excel error, stale refresh;
- збій/rollback посеред commit, втрата lease, подвійний worker, offline ПК;
- ручні поля/витрати та route/TT IDs до/після merge незмінні;
- Admin/User/Логіст: backend і UI; credential revoke та відсутність ключів у логах;
- SAV/STV outputs на тих самих даних строго дорівнюють чинним;
- після майбутнього CLEAN витрати лише SAV/STV, довідники/ролі незмінні;
- повторний sync після заповнення ручних даних їх не скидає.

Production очистка, Cloudflare реліз і TestFlight у цьому етапі не виконуються.
