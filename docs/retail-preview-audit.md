# Retail Preview — аудит і стабілізація, 16.09.2026

> Історичний звіт для commit `5240ad2`. Подальше дозволене відновлення довідників, clean-profile verification і поточний статус описані в [retail-directory-restoration.md](retail-directory-restoration.md). Згадані нижче protected syntax/initialization blockers усунені на наступному етапі.

## Baseline

- Repository: `boyancik-art/transport-report-app`; branch: `retail-cloudflare-preview`.
- Початковий HEAD: `dedda4b8b9c6427161e2999c5d2b437613dec918`; останній контрольний deploy: #107.
- Окремий worktree, чисті tracked files до роботи. Основний checkout на іншій branch не змінювався.
- Preview: https://transport-report-ts-retail-preview.pages.dev. Production `cloudflare-migration` / `transport-report-ts-web` не змінювались і не використовувались для тестування.
- Модуль — статичні HTML/CSS/JS без framework, bundler, окремого lint/build script. Entry: `index.html`, `app.js`, операційні IIFE та patch-файли; hash routing.
- State: масиви в `localStorage`, раніше одночасно docs v2/v3 та кеші в closure. Backend/API/Supabase/IndexedDB у цьому модулі немає. XLSX 0.18.5 завантажується з CDN. Авторизація, offline/PWA worker тут не реалізовані.
- `.github/workflows/retail-cloudflare-preview.yml` матеріалізує legacy v13 зображення та deploy статичної папки через Wrangler у **transport-report-ts-retail-preview**. Root build / wrangler production configuration не запускалися і не редагувалися.

## Problems found

| Severity | Симптом / відтворення | Причина та файли | Виправлення |
|---|---|---|---|
| Critical | Reload профілю без reset-marker видаляє документи, імпорти, талони | Startup reset та v3→v2 overwrite/reload у `dashboard.js` | Автоматичне очищення й перезапис прибрані; v3 — джерело документів, v2 лише read fallback без міграції |
| Critical | Повторний Excel імпорт втрачає документи, яких немає в новому файлі | `operations-fix.js` замінював весь масив | Merge за складеним ключем, preview counts і підтвердження; збереження відсутніх/прив’язаних документів; перевірка stale snapshot |
| High | Різні екрани бачать різні документи | `operations.js` тримав v2 у closure, інші модулі читали v3 | Спільне читання через `retail-state.js`, refresh перед render |
| High | Постійна робота CPU на деталях документів | `picking-group-fix.js`: MutationObserver змінював textContent, провокуючи власний callback | Явне підключення handlers під час render; загальні observers імпорту/clear також прибрані |
| High | Передача в талон має два handlers / неправильний selector | `operations-fix.js`, `picking-group-fix.js`: data-id проти data-doc, дубльована логіка | Один handler, лише вибрані документи, групування та контроль уже призначених |
| High | Талон може взяти документ з іншого дня/складу з тим самим номером | Joins лише за ID у picking/routes/TTN | Нові талони зберігають documentKeys; legacy ID допускається лише за однозначного збігу; missing/ambiguous links — видима помилка |
| High | Після render відкривається стара форма маршруту; міжскладський click запускає чужий handler | `routes-workspace.js`, `route-builder-v7.js`: broad selectors і delayed monkey patch | Один V7 entry point та scoped events; «Скомплектовано» відкриває форму без передчасного persisted draft |
| High | Час доставки зникає після picker; IDs замінені текстом; подвійний submit | `route-builder-v7.js` | Збереження arrivalWindows між redraw, окремі ID/display fields, carrier filtering, validation дат/часу/складів/тарифу, stale cargo check, save guard |
| High | Комплектація автоматично створює/перезаписує дані під час render; actual=0 губиться | `picking-tickets.js`, `picking-enhancements.js` | Без auto-normalize; fresh state на save; узгоджені SKU picked keys; перевірка чисел; routed ticket read-only |
| High | Пошкоджений JSON або quota виглядають як порожні дані/успіх | Операційні get/set та test fleet startup | Guarded read/write, блокування overwrite malformed JSON, rollback попередніх записів при частковому збої, повідомлення й retry; fleet Test1 значення збережені, зайві записи на кожному старті прибрані |
| High | Навігація видаляє порожні рейси та переписує суми | `interwarehouse-fix.js` automatic repair | Видалено auto-repair/dedup; залишено явне підтверджене видалення з блокуванням рейсу, пов’язаного з ТТН |
| Medium | Після видалення номер дублює наявний | length-based IDs | Новий номер більший за максимальний номер у поточному списку (не глобальний довічний sequence) |
| Medium | UI показує перший select option, але зберігає інший legacy value | `interwarehouse-ttn.js` | Невідоме значення явно показується як «поза довідником»; невдале редагування повертає persisted value; double-click guard |
| Medium | ТТН оголошена готовим PDF, суми позицій порожні, журнал не відкриває документ | `route-ttn-generator.js`, `interwarehouse-ttn.js` | Статус «Підготовлено до друку», amount fallback, повторне відкриття/номер без дублювання, передача маршрутних IDs, перевірка popup/storage/missing tickets |
| Medium | 710px зайвого overflow на viewport 390px | Desktop min-width 1100 | `stability.css`: адаптація дозволених операційних екранів/модалів; широкі таблиці мають локальний scroll |
| Medium | Excel CDN затримує старт і помилки завантаження не пояснюються | Eager external script у `index.html` | Lazy single-flight loader з 15s timeout, видимою помилкою та повтором; export також використовує loader |

Останній baseline commit та пов’язані patch-файли перевірено. Відтворено конфлікти на HEAD; не стверджуємо, що всі перелічені проблеми вперше виникли саме в одному commit. Форматування змінених minified JS розширює line diff, але існуючі імпортні mappings/формули та дизайн не замінено.

## Protected areas

**Магазини WT і Склади не змінювались:** UI, CRUD, структура, seed, записи та порядок даних. Файли побайтово тотожні baseline:

| Файл | SHA-256 |
|---|---|
| `retail-directories.js` | `23cc333149fcd25497752ee97daabbf3804e4b1ad3878a1c4bdce9fa7857e0d9` |
| `directory-router-fix.js` | `9a6525783d3bcd12c733e7c5d657cbe4a9c2ec1c2c8dbed5023d9fd7cafaf1be` |
| `directory-data-repair-v3.js` | `f47b6fd72ac1a835cfca83941dc9bc4b7db8d901825feb8c86dab425a38d9702` |
| `store-directory-migration-v2.js` | `d6bc1e98f57070cb769689bdd8186d2ac4ffb44c828f1ac87321f56de625ce94` |

Їх script tags також залишені без змін. Новий persistence helper забороняє запис у захищені ключі. CSS виключає stores-page/warehouses-page. Порівняння baseline/current screenshots обох екранів при 1536×1024 і 390×844: **0 відмінних колірних каналів у всіх 4 порівняннях** (фіксований час, однакові fixture data).

### Невиправлені захищені дефекти

1. **High:** зайва `}` перед `function st()` у `retail-directories.js` спричиняє `Unexpected token 'function'`. Скрипт не виконується, `RetailDirectories` і початковий seed не створюються. Екрани рендерить `directory-router-fix.js`, але чистий профіль може не мати довідників для створення маршруту. Користувач прямо відмовив у виправленні — лише звіт.
2. **High:** `directory-data-repair-v3.js` має startup/timer repair: за відсутніх/коротких масивів складів/магазинів видаляє ключ і reload, інакше переписує масиви. Нині ранній return через відсутній `RetailDirectories` робить його неактивним, але виправлення синтаксису може активувати механізм.
3. **Medium:** `store-directory-migration-v2.js` на старті додає запис ТБ Київ і змінює accessor довідника. Він залишається підключеним. Окремого дозволу змінювати підключення цих скриптів не отримано.

**Для безпечних тестів обидва auto-repair/migration scripts блокувалися на рівні Playwright route**, а потрібні synthetic records створювались лише в новому ізольованому browser context. Тому результати flow tests не доводять безпечність немодифікованого startup цих двох скриптів. Реальне сховище користувача не відкривалося і не змінювалося.

## Performance

- Baseline на деталях документів: за 1 секунду простою **330 setTimeout, 110 DOM mutations**. Після виправлення: **0 / 0**.
- Baseline startup: 28 запитів у тестовому запуску; XLSX більше не завантажується до операції імпорту/експорту. До додаткових локальних assets додано shared helper і stylesheet; загальне число запитів саме по собі не є оцінкою швидкості.
- 10 циклів Base Excel → Routes, GC: 42 listeners, 194 CDP nodes, ~2.08 MB JS heap, ~24 ms ScriptDuration сумарно. DetachedScriptStates=0. Початковий metric snapshot включав попередні reload/модалі, тому це **не** коректний benchmark відсотка економії пам’яті.
- Зменшено повторний JSON parsing у route render; глобальні DOM observers замінені явними render events. Залишені невеликі legacy startup/hash timers поза підтвердженим циклом.
- Навантажувального тесту великими реальними Excel та тривалого memory soak не проводили; відсутність усіх витоків не заявляється.

## Verification

### Локальні результати

- Статичний модуль: окремого build/lint немає. Syntax check змінених operational JS, перевірка локальних assets і `git diff --check`: PASS. Повний syntax check усіх JS не може бути PASS через зафіксований protected parse error вище.
- Node tests: **6/6 PASS** — rollback, malformed JSON preservation, protected writes rejected, composite joins, v2 fallback, ID після видалення.
- Desktop 1536×1024: direct route required validation, Test1 selectors, arrival windows після picker, double submit, повторний render V7, persistence reload/hard reload — PASS.
- TTN: повторне формування без дублювання номера/журналу, carrier/driver/vehicle у print page, journal view — PASS.
- Реальний XLSX fixture: новий імпорт, повторний імпорт без дублювання, збереження старих документів, розрахунок палет 1 замість source 99 — PASS.
- Вибраний документ → талон → actual pallets 2.5 → комплектація → route builder без persisted draft — PASS.
- QuotaExceeded save: видима помилка, route не записаний, кнопка відновлена. Broken JSON переживає reload без overwrite. Startup без reset-marker зберігає документи — PASS.
- Mobile 390×844: document screen без page overflow; міжскладський рейс double click створює один запис; edit/reload, cargo picker, repeated TTN, блокування видалення linked рейсу, видалення окремої чернетки — PASS.
- Excel network failure: видима помилка і доступна кнопка повтору — PASS.
- Console: **нових page errors немає**; protected `Unexpected token 'function'` залишається на кожному старті. Навмисно перерваний CDN запит у network failure test очікуваний.
- Захищені localStorage records до/після операцій побайтово однакові; screenshot diff захищених екранів 0.
- Редагування/видалення звичайного direct route не реалізоване в baseline і не додавалося; перевірено наявне редагування/видалення міжскладських рейсів. Authorization/API errors не застосовні до local-only модуля.

### Відтворення тестів

З кореня repository запустити статичний server: `python -m http.server 8766 --bind 127.0.0.1 --directory web/retail-cloudflare`.

```sh
node --test tool/retail-preview-state.test.cjs
node tool/retail-preview-flows.cjs
node tool/retail-preview-import.cjs
node tool/retail-preview-interwarehouse.cjs
```

Browser tests потребують Playwright/Chromium і XLSX 0.18.5. Залежності можна передати через `PLAYWRIGHT_MODULE`, `AUDIT_BROWSER_PATH`, `AUDIT_XLSX_PATH` (absolute paths), без зміни production dependencies. `AUDIT_BASE_URL` задає preview origin; default localhost:8766. `AUDIT_OUTPUT` задає output folder, default нова тимчасова папка. Скрипти створюють **нові** browser contexts, блокують protected mutators, використовують fixture data; до робочого браузера не підключаються. `retail-preview-browser-runtime.cjs` лише читає seed literals для fixture, не запускає protected JS.

### Deployment

Commit і deployment ідентифікуються у GitHub history та підсумковому звіті задачі. Після push обов’язкові Success workflow та повторний isolated smoke на фактичному Preview origin. Цей документ не підміняє результат deployment і не оголошує його успішним до виконання.

## Remaining issues

- **Повна готовність заблокована protected syntax/auto-mutation дефектами.** Вони свідомо залишені за обмеженням користувача. Не слід називати цю версію повністю безпомилковою.
- localStorage — локальне сховище одного браузера, без server backup, shared state, authentication чи міжвкладкового transactional locking. Multi-key rollback best effort; це не транзакційна БД.
- TTN генерує HTML для browser print/Save as PDF, не готовий бінарний PDF. Повторне відкриття регенерує з поточного route/cargo; незмінний архів PDF і юридична валідація форми — наступний етап.
- Legacy міжскладська форма зберігає текстові адреси/transport values, показує legacy значення поза довідником. Новий V7 builder зберігає окремі ID. Повну міграцію старих записів не виконано.
- PWA/offline/background sync, cloud persistence, повний CRUD direct route, dispatch/delivery workflow не додавалися.
- Production, protected довідники, реальні дані не змінювались. Зміни обмежено операційними JS, новим persistence helper, scoped mobile CSS, index cache versions, тестами та цим звітом.
