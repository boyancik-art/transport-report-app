import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

const bg = Color(0xFF090C11);
const panel = Color(0xFF111720);
const panel2 = Color(0xFF171D27);
const border = Color(0xFF2B313B);
const muted = Color(0xFF9AA3B2);
const wine = Color(0xFF7A1F35);
const wine2 = Color(0xFFA62A48);
const orange = Color(0xFFFF7338);
const good = Color(0xFF40C97A);
const blue = Color(0xFF4B8FEA);
const warn = Color(0xFFE49B3B);

const logoBase64 = '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';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  runApp(const RetailApp());
}

class RetailApp extends StatelessWidget {
  const RetailApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Retail ТОВ «ТС ПЛЮС»',
        theme: ThemeData(
          brightness: Brightness.dark,
          useMaterial3: true,
          scaffoldBackgroundColor: bg,
          colorScheme: ColorScheme.fromSeed(seedColor: wine2, brightness: Brightness.dark, surface: panel),
          filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: wine2, foregroundColor: Colors.white)),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: panel2,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
          ),
        ),
        home: const AuthGate(),
      );
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  Session? session;
  StreamSubscription<AuthState>? sub;
  @override
  void initState() {
    super.initState();
    session = Supabase.instance.client.auth.currentSession;
    sub = Supabase.instance.client.auth.onAuthStateChange.listen((e) {
      if (mounted) setState(() => session = e.session);
    });
  }
  @override
  void dispose() {
    sub?.cancel();
    super.dispose();
  }
  @override
  Widget build(BuildContext context) => session == null ? const LoginPage() : const Shell();
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String? error;

  Future<void> login() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) return;
    setState(() { busy = true; error = null; });
    try {
      await Supabase.instance.client.auth.signInWithPassword(email: email.text.trim(), password: password.text);
    } on AuthException catch (e) {
      if (mounted) setState(() => error = e.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: SizedBox(
            width: 420,
            child: Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(18), border: Border.all(color: border)),
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Center(child: ClipRRect(borderRadius: BorderRadius.circular(18), child: Image.memory(base64Decode(logoBase64), width: 128, height: 128, fit: BoxFit.cover))),
                const SizedBox(height: 20),
                const Text('Retail ТОВ «ТС ПЛЮС»', textAlign: TextAlign.center, style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                const Text('Retail Operations Control', textAlign: TextAlign.center, style: TextStyle(color: muted)),
                const SizedBox(height: 24),
                TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Пароль'), onSubmitted: (_) => login()),
                if (error != null) ...[const SizedBox(height: 10), Text(error!, style: const TextStyle(color: Colors.redAccent))],
                const SizedBox(height: 18),
                FilledButton(onPressed: busy ? null : login, child: Text(busy ? 'Вхід…' : 'Увійти')),
              ]),
            ),
          ),
        ),
      );
}

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int selected = 0;
  DateTime date = DateTime.now();
  final nav = const [
    ('Головна', Icons.home_rounded),
    ('Вхідні вантажі', Icons.local_shipping_rounded),
    ('Консолідація', Icons.inventory_2_rounded),
    ('Маршрути', Icons.alt_route_rounded),
    ('Талони комплектації', Icons.assignment_rounded),
    ('ТТН', Icons.description_rounded),
    ('Магазини WT', Icons.storefront_rounded),
    ('Склади', Icons.warehouse_rounded),
    ('Перевізники', Icons.fire_truck_rounded),
    ('Тарифи', Icons.payments_rounded),
    ('Аналітика', Icons.bar_chart_rounded),
    ('Довідники', Icons.menu_book_rounded),
    ('Користувачі', Icons.group_rounded),
    ('Налаштування', Icons.settings_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 1050;
    return Scaffold(
      drawer: wide ? null : Drawer(child: sidebar()),
      body: Row(children: [
        if (wide) SizedBox(width: 250, child: sidebar()),
        Expanded(child: Column(children: [
          topbar(wide),
          Expanded(child: selected == 0 ? const Dashboard() : placeholder(nav[selected].$1, nav[selected].$2)),
        ])),
      ]),
    );
  }

  Widget sidebar() => Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF28111B), Color(0xFF141015), Color(0xFF1A1018)]),
          border: Border(right: BorderSide(color: Color(0xFF2B252A))),
        ),
        child: SafeArea(child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
            child: ClipRRect(borderRadius: BorderRadius.circular(18), child: Image.memory(base64Decode(logoBase64), width: 168, height: 118, fit: BoxFit.cover)),
          ),
          Expanded(child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: nav.length,
            itemBuilder: (_, i) {
              final active = selected == i;
              return Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Material(
                  color: active ? wine : Colors.transparent,
                  borderRadius: BorderRadius.circular(11),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(11),
                    onTap: () {
                      setState(() => selected = i);
                      if (Navigator.canPop(context)) Navigator.pop(context);
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                      child: Row(children: [
                        Icon(nav[i].$2, size: 19, color: active ? Colors.white : const Color(0xFFCCD0D7)),
                        const SizedBox(width: 12),
                        Expanded(child: Text(nav[i].$1, style: TextStyle(fontSize: 14, fontWeight: active ? FontWeight.w700 : FontWeight.w500))),
                      ]),
                    ),
                  ),
                ),
              );
            },
          )),
          const Padding(
            padding: EdgeInsets.all(20),
            child: Align(alignment: Alignment.centerLeft, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Retail ТОВ «ТС ПЛЮС»', style: TextStyle(fontWeight: FontWeight.w700)),
              SizedBox(height: 4), Text('Retail Operations', style: TextStyle(color: muted, fontSize: 12)),
              SizedBox(height: 8), Text('v0.2 · 2026', style: TextStyle(color: Color(0xFF777D88), fontSize: 11)),
            ])),
          ),
        ])),
      );

  Widget topbar(bool wide) {
    final email = Supabase.instance.client.auth.currentUser?.email ?? 'user';
    return Container(
      height: 82,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: const BoxDecoration(color: Color(0xFF0D1219), border: Border(bottom: BorderSide(color: border))),
      child: Row(children: [
        if (!wide) Builder(builder: (c) => IconButton(onPressed: () => Scaffold.of(c).openDrawer(), icon: const Icon(Icons.menu))),
        const Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Retail ТОВ «ТС ПЛЮС»', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          SizedBox(height: 3), Text('Логістика. Контроль. Результат.', style: TextStyle(color: muted, fontSize: 13)),
        ])),
        TextButton.icon(
          onPressed: () async {
            final d = await showDatePicker(context: context, initialDate: date, firstDate: DateTime(2025), lastDate: DateTime(2035));
            if (d != null) setState(() => date = d);
          },
          icon: const Icon(Icons.calendar_month_rounded, color: wine2),
          label: Text(DateFormat('dd.MM.yyyy').format(date), style: const TextStyle(color: Colors.white)),
        ),
        const SizedBox(width: 12),
        const VerticalDivider(width: 18, indent: 22, endIndent: 22, color: border),
        CircleAvatar(backgroundColor: wine, child: Text(email.substring(0, 1).toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w800))),
        const SizedBox(width: 10),
        SizedBox(width: 130, child: Text(email.split('@').first, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700))),
        IconButton(tooltip: 'Вийти', onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout_rounded)),
      ]),
    );
  }

  Widget placeholder(String title, IconData icon) => Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 620),
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.all(34),
          decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(18), border: Border.all(color: border)),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 50, color: wine2),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            const Text('Каркас розділу вже закладений. Далі підключаємо робочу логіку та дані.', textAlign: TextAlign.center, style: TextStyle(color: muted)),
          ]),
        ),
      );
}

class Dashboard extends StatelessWidget {
  const Dashboard({super.key});

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          hero(),
          const SizedBox(height: 14),
          LayoutBuilder(builder: (_, c) {
            final per = c.maxWidth >= 1150 ? 5 : c.maxWidth >= 760 ? 3 : 1;
            final w = (c.maxWidth - 12 * (per - 1)) / per;
            final items = const [
              Kpi(Icons.local_shipping_rounded, 'Вхідних вантажів', '5', 'сьогодні', wine2),
              Kpi(Icons.inventory_2_rounded, 'Палети на хабах', '33', 'до розконсолідації', orange),
              Kpi(Icons.alt_route_rounded, 'Маршрутів', '12', 'сьогодні', wine2),
              Kpi(Icons.storefront_rounded, 'Магазинів WT', '38', 'в роботі', Color(0xFF9EA4AF)),
              Kpi(Icons.check_circle_rounded, 'Доставлено', '8', 'сьогодні', good),
            ];
            return Wrap(spacing: 12, runSpacing: 12, children: [for (final k in items) SizedBox(width: w, child: kpi(k))]);
          }),
          const SizedBox(height: 14),
          LayoutBuilder(builder: (_, c) {
            final wide = c.maxWidth >= 1050;
            final list = [incoming(), hubs(), routeTypes()];
            if (!wide) return Column(children: [for (final x in list) ...[x, const SizedBox(height: 12)]]);
            return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(flex: 10, child: list[0]), const SizedBox(width: 12),
              Expanded(flex: 9, child: list[1]), const SizedBox(width: 12),
              Expanded(flex: 8, child: list[2]),
            ]);
          }),
          const SizedBox(height: 14),
          routes(),
        ]),
      );

  static Widget hero() => Container(
        height: 150,
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFF5A2532)),
          gradient: const LinearGradient(colors: [Color(0xFF1A1117), Color(0xFF2A151E), Color(0xFF10151D)]),
        ),
        child: Stack(children: [
          Positioned(right: 22, top: 4, bottom: 4, child: Opacity(opacity: .24, child: Row(children: const [
            Icon(Icons.warehouse_rounded, size: 76, color: Colors.white), SizedBox(width: 16),
            Icon(Icons.local_shipping_rounded, size: 94, color: Colors.white), SizedBox(width: 10),
            Icon(Icons.route_rounded, size: 66, color: Colors.white),
          ]))),
          const Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
            Text('PEOPLE  •  PROCESS  •  DELIVERY', style: TextStyle(color: Color(0xFFE78371), letterSpacing: 3, fontSize: 11)),
            SizedBox(height: 8),
            Text('НАДІЙНА ЛОГІСТИКА', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            Text('ДЛЯ РОЗВИТКУ RETAIL', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w500, color: Color(0xFFD1D5DC))),
            SizedBox(height: 4),
            Text('Склади · Консолідація · Маршрути · Документи', style: TextStyle(color: muted)),
          ]),
        ]),
      );

  static Widget kpi(Kpi k) => Container(
        height: 106,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: panel,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: k.color.withOpacity(.55)),
          gradient: LinearGradient(colors: [k.color.withOpacity(.17), panel], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Row(children: [
          Icon(k.icon, color: k.color, size: 30),
          const SizedBox(width: 15),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(k.value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            Text(k.title, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(k.subtitle, style: const TextStyle(color: muted, fontSize: 11)),
          ])),
        ]),
      );

  static Widget box(String title, IconData icon, Widget child, {Widget? action}) => Container(
        height: 260,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
        child: Column(children: [
          Row(children: [Icon(icon, color: wine2, size: 21), const SizedBox(width: 9), Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)), const Spacer(), if (action != null) action]),
          const SizedBox(height: 14),
          Expanded(child: child),
        ]),
      );

  static Widget incoming() => box('Вхідні вантажі', Icons.local_shipping_rounded,
      Column(children: const [
        Expanded(child: Line('Корпоратура → Розумовського', '33 пал.', 'Прийнято', good)),
        Expanded(child: Line('Острів 1 → Розумовського', '12 пал.', 'В дорозі', blue)),
        Expanded(child: Line('Острів 2 → Розумовського', '18 пал.', 'Очікується', warn)),
      ]), action: TextButton.icon(onPressed: () {}, icon: const Icon(Icons.add, size: 18), label: const Text('Додати')));

  static Widget hubs() => box('Консолідація (хаби)', Icons.warehouse_rounded,
      Column(children: const [
        Expanded(child: HubLine('Розумовського 27', '33 пал.', .60)),
        Expanded(child: HubLine('Острів 1', '5 пал.', .25)),
        Expanded(child: HubLine('Острів 2', '0 пал.', 0)),
      ]), action: TextButton(onPressed: () {}, child: const Text('Детальніше')));

  static Widget routeTypes() => box('Типи маршрутів', Icons.alt_route_rounded,
      Column(children: const [
        Expanded(child: TypeLine(Icons.storefront_rounded, 'Retail (сухий)', 'Мережа WT', '8', wine2)),
        Expanded(child: TypeLine(Icons.ac_unit_rounded, 'Холодний склад', 'Fresh / Frozen / Multiref', '4', blue)),
        Expanded(child: TypeLine(Icons.inventory_2_rounded, 'Міжскладські', 'Корпоратура / Острів / інші', '3', Color(0xFF9EA4AF))),
      ]));

  static Widget routes() {
    const rows = [
      ['R-001', 'Retail', 'Розумовського → Палладіна → Бажана', '5', '8', 'AA 1234 XX', '12:00', 'В дорозі'],
      ['R-002', 'Retail', 'Розумовського → Маккейна → Філатова', '4', '7', 'AA 5678 XX', '13:00', 'Скомплектовано'],
      ['F-001', 'Холодний', 'Розумовського → Соборності → Здановської', '6', '9', 'AA 9012 XX', '14:00', 'В дорозі'],
      ['R-003', 'Retail', 'Розумовського → Верхній Вал → Ярославів Вал', '4', '6', 'AA 3456 XX', '15:00', 'Заплановано'],
    ];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
      child: Column(children: [
        Row(children: [
          const Icon(Icons.calendar_month_rounded, color: wine2), const SizedBox(width: 10),
          const Text('Сьогоднішні маршрути', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const Spacer(), FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('Новий маршрут')),
        ]),
        const SizedBox(height: 12),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: DataTable(
          headingRowColor: MaterialStateProperty.all(panel2),
          columns: const [
            DataColumn(label: Text('№')), DataColumn(label: Text('Тип')), DataColumn(label: Text('Маршрут')),
            DataColumn(label: Text('Магазини')), DataColumn(label: Text('Палети')), DataColumn(label: Text('Авто')),
            DataColumn(label: Text('План виїзду')), DataColumn(label: Text('Статус')),
          ],
          rows: [for (final r in rows) DataRow(cells: [
            DataCell(Text(r[0])), DataCell(Pill(r[1], r[1] == 'Холодний' ? blue : wine2)),
            DataCell(SizedBox(width: 290, child: Text(r[2], overflow: TextOverflow.ellipsis))),
            DataCell(Text(r[3])), DataCell(Text(r[4])), DataCell(Text(r[5])), DataCell(Text(r[6])),
            DataCell(Pill(r[7], r[7] == 'В дорозі' ? blue : r[7] == 'Скомплектовано' ? warn : const Color(0xFF747D8A))),
          ]))],
        )),
      ]),
    );
  }
}

class Kpi {
  const Kpi(this.icon, this.title, this.value, this.subtitle, this.color);
  final IconData icon;
  final String title, value, subtitle;
  final Color color;
}

class Pill extends StatelessWidget {
  const Pill(this.text, this.color, {super.key});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(color: color.withOpacity(.18), borderRadius: BorderRadius.circular(99), border: Border.all(color: color.withOpacity(.55))),
        child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
      );
}

class Line extends StatelessWidget {
  const Line(this.left, this.mid, this.right, this.color, {super.key});
  final String left, mid, right;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF202630)))),
        child: Row(children: [Expanded(child: Text(left, overflow: TextOverflow.ellipsis)), Text(mid, style: const TextStyle(fontWeight: FontWeight.w700)), const SizedBox(width: 10), Pill(right, color)]),
      );
}

class HubLine extends StatelessWidget {
  const HubLine(this.name, this.value, this.progress, {super.key});
  final String name, value;
  final double progress;
  @override
  Widget build(BuildContext context) => Container(
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF202630)))),
        child: Row(children: [
          Expanded(child: Text(name)), SizedBox(width: 62, child: Text(value, style: const TextStyle(fontWeight: FontWeight.w700))),
          const SizedBox(width: 8), SizedBox(width: 90, child: LinearProgressIndicator(value: progress, minHeight: 8, borderRadius: BorderRadius.circular(99), backgroundColor: panel2, color: orange)),
          const SizedBox(width: 8), Text('${(progress * 100).round()}%', style: const TextStyle(color: muted, fontSize: 11)),
        ]),
      );
}

class TypeLine extends StatelessWidget {
  const TypeLine(this.icon, this.title, this.subtitle, this.count, this.color, {super.key});
  final IconData icon;
  final String title, subtitle, count;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: panel2, borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          Icon(icon, color: color), const SizedBox(width: 11),
          Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(subtitle, style: const TextStyle(color: muted, fontSize: 11)),
          ])),
          Text(count, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
        ]),
      );
}
