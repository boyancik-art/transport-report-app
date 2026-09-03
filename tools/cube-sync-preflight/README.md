# Cube Preflight 1.1 — targeted base refresh

Розпакуйте пакет і запустіть **Run-Preflight.cmd**. Інших скриптів вручну запускати не потрібно.
Excel буде видимим. Якщо він запитає авторизацію до Куба, виконайте її у штатному
вікні Excel, не у скрипті. Не закривайте цей окремий Excel до завершення.

## Зміни 1.1

- Оновлюється лише WorkbookConnection **base**, не RefreshAll.
- Немає CalculateUntilAsyncQueriesDone і очікування глобального CalculationState.
- Визначається OLEDB/OLAP/Power Query/ODBC. Для OLAP не вмикається непідтримуваний
  background mode; для інших використовується background, якщо провайдер дозволяє.
- Перевіряються Refreshing підключення та пов'язаних QueryTable/ListObject.
- Успіх вимагає нового RefreshDate самого підключення після початку запуску
  та трьох послідовних станів без активного refresh. Просто idle не означає успіх.
- Немає залежності від RefreshDate сторонніх підключень чи глобального стану Excel.
- Excel видимий, системні діалоги не приховані; макроси залишаються вимкненими.
- Детальні stages.jsonl і watchdog.jsonl входять до Cube-preflight-report.zip.
- Watchdog пише heartbeat навіть якщо виклик COM заблокований.
- Refresh timeout 15 хвилин; загальна межа процесу 20 хвилин. Відсутній доказ
  успішного refresh завершується помилкою, не фальшивим success.
- При timeout завершується тільки власний Excel за PID і часом створення.
  Книга закривається без збереження; чужі Excel-процеси не закриваються.

## Лог

Workbook opened → connection base found → refresh started → refresh state →
refresh completed → data validated → report created.

Перед входом у COM і після повернення записуються окремі фази base.Refresh.enter /
base.Refresh.returned. Якщо запит зависає, буде видно останній пройдений виклик.
При помилці refresh completed/data validated не підробляються.

## Безпека та результат

Це лише діагностика. Немає HTTP-імпорту, записів у Supabase, очищення бази,
Clean Reload, розкладу чи TestFlight. Паролі/connection strings не логуються.
Payload залишається локально зашифрованим DPAPI, до ZIP звіту він не входить.

Звіт у %LOCALAPPDATA%\\TransportReportCubeBridge\\<run-id>.
Наприкінці відкриється папка: надішліть **Cube-preflight-report.zip**.
Повнота періоду 01.08–03.09.2026 усе ще потребує підтвердження джерелом;
успішний refresh сам по собі не доводить повноту вибірки.

Потрібні Windows PowerShell 5.1, настільний Excel і доступ до Куба під поточним
Windows-користувачем. Не запускати під SYSTEM. Group Policy не обходиться.

Перевірка цього пакета охоплює синтаксис/модель станів у Windows PowerShell.
Фактичний Cube refresh має бути повторно перевірений на робочому ПК.

## Довідка Microsoft

https://learn.microsoft.com/en-us/office/vba/api/excel.oledbconnection
https://learn.microsoft.com/en-us/office/vba/api/excel.querytable.refreshing
https://learn.microsoft.com/en-us/office/vba/api/excel.querytable.refresh
