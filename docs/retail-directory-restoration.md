# Відновлення довідників Retail Preview

## Baseline та межі

- Branch: `retail-cloudflare-preview`.
- Baseline HEAD: `5240ad2d3cadf40efe73752b3e57b5d0eb06aff0`, deployment #108.
- Scope: відновлення наявних довідників та перевірка наявних операцій. Production unchanged.
- Користувач уточнив: не використовувати його браузер/localStorage; baseline — погоджені дані з коду та історії branch, фінальна перевірка — clean profile.

## Root cause: scope, дані, rendering

1. У `retail-directories.js` після `m.remove();wh()` було п’ять закриваючих `}`, хоча вкладені блоки warehouse save-handler / modal-handler / host-handler / `wh` потребують чотирьох. П’ята достроково закриває IIFE перед `function st`. Це parse-time SyntaxError: жодна частина файлу, включно з `RetailDirectories` та seed initialization, не виконувалась.
2. `directory-router-fix.js` містив фактично активний затверджений UI: таблиці з пошуком, контакти та додавання складу. Він незалежно читав localStorage з fallback `[]`, приховуючи відсутність основного accessor порожнім екраном. Старі `wh/st` у зламаному файлі містили інший renderer для `ops-documents`; просте видалення дужки активувало б дві реалізації одночасно.
3. `dashboard.js` додатково рендерив «Розділ у розробці» для тих самих hashes. Router patch перекривав це delayed callbacks через 20/30/100ms. Результат залежав від порядку виконання.
4. Startup repair міг видаляти keys/reload та переписувати масиви; migration додавав TB і monkey-patched accessor. Відновлення syntax без попереднього відключення цих entry points активувало б автоматичні зміни.

## Затверджене джерело даних

Історія branch містить послідовне доповнення, а не альтернативні вигадані списки:

- `b6d5db05922fdfe025dc1f3e07271dc0a55fa402` — **38 магазинів, 4 склади** у `retail-directories.js`.
- `f260b111b7ad0a7bb8f39f9256554754b16032f7` — **TB Київ №1, вул. Олени Теліги, 14** у `store-directory-migration-v2.js`, commit «include TB Kyiv in WT store directory».
- Тому фактичний погоджений сукупний набір — **39 магазинів, 4 склади**. TB залишається останнім записом, як у попередньому append; назви, контакти, category, поля, порядок незмінні. Дані TB скопійовані буквально з існуючого коду; migration не виконується.
- `tool/retail-directory-baseline.json` містить SHA-256 JSON-масивів із baseline sources і checksum approved UI. Tests порівнюють весь вміст та порядок, не лише count.

## Виправлення

Порядок виконання:

1. Прибрані лише `<script>` підключення `directory-data-repair-v3.js` і `store-directory-migration-v2.js`. Самі файли залишені **побайтово незмінними**. Пошук інших executable references — 0.
2. `retail-directories.js` тепер містить наявні approved records і accessor `RetailDirectories`, без старих конкурентних UI functions та жодних startup writes/timers. Відсутній storage key → read-only approved array. Наявний key → його записи без доповнень/перезапису; порожній список збережений як порожній. Malformed JSON не ремонтується, показується помилка.
3. Затверджений `directory-router-fix.js` залишається єдиним renderer-ом та власником існуючого CRUD. Дані бере з `RetailDirectories`. **CSS, markup, search та warehouse CRUD побайтово незмінні**, що перевіряє regression test. Прибрані delayed listeners; навігація викликає renderer прямо.
4. `dashboard.js` більше не рендерить development placeholder для Stores/Warehouses. Наявний розділ «Довідники» веде до цих двох затверджених екранів.
5. V7 route warehouse select читає той самий `RetailDirectories.warehouses()`; hardcoded route options не додавались. Existing Test1 fleet seed не змінювався.
6. Додано favicon link на вже наявний logo asset, щоб усунути підтверджений `/favicon.ico` 404 у чистому профілі. Оновлено cache versions лише змінених скриптів.

Це не міграція localStorage: на fresh load ключі довідників залишаються відсутніми, approved записи доступні для читання з наявних bundled data. Явне додавання складу користувачем працює через наявний CRUD, як і раніше.

## Verification

### Unit/static

- Попередні 6 operational tests: PASS.
- 6 directory regressions: PASS — initialization/exact approved data, 0 writes, existing/empty lists unchanged, malformed data preserved, repair/migration OFF, single renderer, approved UI/CRUD checksum.
- Усі JS модуля проходять syntax parsing. Окремого build/lint у статичному модулі немає.
- Production configuration/workflows не змінені.

### Фінальний acceptance test

`tool/retail-preview-clean.cjs` запускає новий browser context без storageState, addInitScript, route interception, mock directories або console patches. CDN Excel завантажується реально. Operational Excel test file створюється окремо; це не підміна довідників.

Перевірено:

- Fresh profile → initial load → Довідники → Магазини WT (39 рядків) → Склади (4 рядки).
- Reload і clear-cache hard reload → повторне відкриття обох екранів.
- На кожному checkpoint hashes approved records однакові; обидва localStorage keys залишаються `null`: **0 доданих, 0 видалених, 0 змінених записів** щодо approved baseline.
- Excel import двічі → один документ; reload; палети з позицій.
- Вибір документа → талон → actual pallets 2.5 → автозбереження → повторне відкриття → комплектування; один ticket із documentKeys.
- Route: Test1 carrier/driver/vehicle, WH-001 зі справжнього accessor, дата, arrival windows після повторного picker, double click save → один маршрут; reload і persisted state.
- TTN з маршруту двічі, маршрутні поля/документи у print HTML, повторне відкриття з журналу, один journal record.
- Після операцій reload/hard reload, повторна перевірка обох довідників.
- Mobile 390×844: таблиця маршрутів та modal без page overflow. Затверджена широка верстка довідників збережена без redesign.
- Console gate: 0 page errors (включно з SyntaxError/unhandled rejection), 0 console errors, 0 failed requests/HTTP errors, 0 запитів repair/migration. Idle scripting обмежено тестом; окремий operational idle test: 0 timers / 0 mutations за секунду.

Попередні browser regression suites також PASS: import merge, quota/error recovery, invalid JSON, picking, routes, interwarehouse create/edit/delete, TTN, mobile. Вони використовують operational fixtures/fault injection для негативних сценаріїв; **не є заміною чистої фінальної deployed перевірки**. Підстановку/блокування довідників із них прибрано.

### Відтворення

```sh
python -m http.server 8766 --bind 127.0.0.1 --directory web/retail-cloudflare
node --test tool/retail-preview-state.test.cjs tool/retail-directories.test.cjs
node tool/retail-preview-clean.cjs
node tool/retail-preview-flows.cjs
node tool/retail-preview-import.cjs
node tool/retail-preview-interwarehouse.cjs
```

Потрібні Playwright Chromium та XLSX 0.18.5. `PLAYWRIGHT_MODULE`, `AUDIT_BROWSER_PATH`, `AUDIT_XLSX_PATH` дозволяють передати шляхи до встановлених dependencies. `AUDIT_BASE_URL` default localhost:8766; для deployed run — `https://transport-report-ts-retail-preview.pages.dev`. `AUDIT_OUTPUT` містить screenshots і `clean-browser-result.json` із кожним before/after snapshot hash. Ніякого доступу до профілю користувача.

## Deployment та залишкові межі

Фактичний SHA, workflow run, Cloudflare deployment ID та результат повторного clean-profile acceptance на deployed origin наведені у фінальному звіті задачі й artifact `deployment-verification.json` після виконання deployment.

- PDF generation не додавалося: існуючий TTN flow — print HTML.
- Storage лишається browser-local; серверної persistence/синхронізації не додано.
- Вже наявні неповні/пошкоджені персональні localStorage-списки не ремонтуються автоматично за прямою забороною. Поточний acceptance scope — approved lists у clean profile.
- Direct-route edit UI відсутній у baseline і не додавався; перевірені наявні операції, включно з редагуванням міжскладського рейсу.
