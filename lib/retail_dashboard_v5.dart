import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'retail_dashboard_v3.dart' as legacy;

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

const bg = Color(0xFF090C11);
const sidebarBg = Color(0xFF170D13);
const panel = Color(0xFF111720);
const panel2 = Color(0xFF171D27);
const border = Color(0xFF2A303A);
const muted = Color(0xFF949CAA);
const text = Color(0xFFF0E7E8);
const wine = Color(0xFF8D1E3A);
const wine2 = Color(0xFFB5264A);
const orange = Color(0xFFF47A36);
const green = Color(0xFF3FCA7C);
const blue = Color(0xFF4B8FEA);
const amber = Color(0xFFE6A13A);

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
          fontFamily: 'Arial',
          colorScheme: ColorScheme.fromSeed(seedColor: wine2, brightness: Brightness.dark, surface: panel),
          dividerColor: border,
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
  Widget build(BuildContext context) => session == null ? const LoginPage() : const RetailShell();
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
          child: Container(
            width: 410,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(18), border: Border.all(color: border)),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Center(child: ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.memory(base64Decode(legacy.logoBase64), width: 126, height: 126, fit: BoxFit.cover))),
              const SizedBox(height: 20),
              const Text('Retail ТОВ «ТС ПЛЮС»', textAlign: TextAlign.center, style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
              const SizedBox(height: 5),
              const Text('Retail Operations Control', textAlign: TextAlign.center, style: TextStyle(color: muted)),
              const SizedBox(height: 24),
              TextField(controller: email, decoration: fieldDecoration('Email')),
              const SizedBox(height: 12),
              TextField(controller: password, obscureText: true, decoration: fieldDecoration('Пароль'), onSubmitted: (_) => login()),
              if (error != null) ...[const SizedBox(height: 10), Text(error!, style: const TextStyle(color: Colors.redAccent))],
              const SizedBox(height: 18),
              FilledButton(style: FilledButton.styleFrom(backgroundColor: wine2, padding: const EdgeInsets.symmetric(vertical: 15)), onPressed: busy ? null : login, child: Text(busy ? 'Вхід…' : 'Увійти')),
            ]),
          ),
        ),
      );
}

InputDecoration fieldDecoration(String label) => InputDecoration(
      labelText: label,
      filled: true,
      fillColor: panel2,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: wine2)),
    );

class RetailShell extends StatefulWidget {
  const RetailShell({super.key});
  @override
  State<RetailShell> createState() => _RetailShellState();
}

class _RetailShellState extends State<RetailShell> {
  int selected = 0;
  final nav = const [
    ('Головна', Icons.home_rounded), ('Вхідні вантажі', Icons.local_shipping_rounded), ('Консолідація', Icons.inventory_2_rounded),
    ('Маршрути', Icons.location_on_rounded), ('Талони комплектації', Icons.assignment_rounded), ('ТТН', Icons.description_rounded),
    ('Магазини WT', Icons.storefront_rounded), ('Склади', Icons.home_work_rounded), ('Перевізники', Icons.fire_truck_rounded),
    ('Тарифи', Icons.stacked_bar_chart_rounded), ('Аналітика', Icons.bar_chart_rounded), ('Довідники', Icons.menu_book_rounded),
    ('Користувачі', Icons.group_rounded), ('Налаштування', Icons.settings_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    final desktop = w >= 1000;
    return Scaffold(
      drawer: desktop ? null : Drawer(backgroundColor: sidebarBg, child: sidebar()),
      body: Row(children: [
        if (desktop) SizedBox(width: 174, child: sidebar()),
        Expanded(child: Column(children: [
          header(desktop),
          Expanded(child: selected == 0 ? const Dashboard() : placeholder(nav[selected].$1, nav[selected].$2)),
        ])),
      ]),
    );
  }

  Widget sidebar() => Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF211019), Color(0xFF160D13), Color(0xFF211019)]),
          border: Border(right: BorderSide(color: Color(0xFF3A252D))),
        ),
        child: SafeArea(child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.memory(base64Decode(legacy.logoBase64), width: 105, height: 105, fit: BoxFit.cover)),
          ),
          Expanded(child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(10, 2, 10, 4),
            itemCount: nav.length,
            itemBuilder: (_, i) {
              final active = i == selected;
              return Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Material(
                  color: active ? const Color(0xFF8F1E3A) : Colors.transparent,
                  borderRadius: BorderRadius.circular(7),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(7),
                    onTap: () => setState(() => selected = i),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
                      child: Row(children: [
                        Icon(nav[i].$2, size: 15, color: active ? Colors.white : const Color(0xFFC9C9CE)),
                        const SizedBox(width: 11),
                        Expanded(child: Text(nav[i].$1, style: TextStyle(fontSize: 11.5, fontWeight: active ? FontWeight.w700 : FontWeight.w500, color: active ? Colors.white : const Color(0xFFD0CED1)))),
                      ]),
                    ),
                  ),
                ),
              );
            },
          )),
          const Padding(
            padding: EdgeInsets.fromLTRB(14, 8, 14, 14),
            child: Align(alignment: Alignment.centerLeft, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Retail ТОВ «ТС ПЛЮС»', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
              SizedBox(height: 4), Text('Логістика, що рухає бізнес', style: TextStyle(fontSize: 9, color: muted)),
              SizedBox(height: 10), Text('v1.0.0   |   2026', style: TextStyle(fontSize: 8.5, color: muted)),
            ])),
          ),
        ])),
      );

  Widget header(bool desktop) => Container(
        height: 62,
        padding: const EdgeInsets.symmetric(horizontal: 18),
        decoration: const BoxDecoration(color: Color(0xFF0C1118), border: Border(bottom: BorderSide(color: border))),
        child: Row(children: [
          if (!desktop) Builder(builder: (ctx) => IconButton(onPressed: () => Scaffold.of(ctx).openDrawer(), icon: const Icon(Icons.menu))),
          const Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Retail ТОВ «ТС ПЛЮС»', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: text)),
            SizedBox(height: 2), Text('Логістика. Контроль. Результат.', style: TextStyle(fontSize: 9.5, color: muted)),
          ]),
          const Spacer(),
          const Icon(Icons.calendar_month_rounded, size: 18, color: wine2),
          const SizedBox(width: 9),
          Text(DateFormat('dd.MM.yyyy').format(DateTime.now()), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
          const SizedBox(width: 18),
          Container(width: 1, height: 28, color: border),
          const SizedBox(width: 16),
          CircleAvatar(radius: 18, backgroundColor: wine, child: const Text('ІБ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700))),
          const SizedBox(width: 8),
          if (desktop) const Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Ігор Бойко', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
            Text('Транспортний відділ', style: TextStyle(fontSize: 8.5, color: muted)),
          ]),
          const SizedBox(width: 10),
          IconButton(onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout_rounded, size: 18)),
        ]),
      );

  Widget placeholder(String title, IconData icon) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 48, color: wine2), const SizedBox(height: 12), Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 6), const Text('Розділ буде підключений до робочих даних', style: TextStyle(color: muted)),
      ]));
}

class Dashboard extends StatelessWidget {
  const Dashboard({super.key});
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) {
        final compact = c.maxWidth < 900;
        return SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(compact ? 12 : 14, 12, compact ? 12 : 14, 16),
          child: Column(children: [
            const HeroPanel(),
            const SizedBox(height: 8),
            compact ? const Wrap(spacing: 8, runSpacing: 8, children: [KpiCard(Icons.local_shipping_rounded, '5', 'Вхідних вантажів', 'сьогодні', wine2), KpiCard(Icons.inventory_2_rounded, '33', 'Палети на хабах', 'до розконсолідації', orange), KpiCard(Icons.hub_rounded, '12', 'Маршрутів', 'сьогодні', wine2), KpiCard(Icons.storefront_rounded, '38', 'Магазинів WT', 'в роботі', Color(0xFFB7BBC2)), KpiCard(Icons.check_circle_rounded, '8', 'Доставлено', 'сьогодні', green)])
                : const Row(children: [Expanded(child: KpiCard(Icons.local_shipping_rounded, '5', 'Вхідних вантажів', 'сьогодні', wine2)), SizedBox(width: 8), Expanded(child: KpiCard(Icons.inventory_2_rounded, '33', 'Палети на хабах', 'до розконсолідації', orange)), SizedBox(width: 8), Expanded(child: KpiCard(Icons.hub_rounded, '12', 'Маршрутів', 'сьогодні', wine2)), SizedBox(width: 8), Expanded(child: KpiCard(Icons.storefront_rounded, '38', 'Магазинів WT', 'в роботі', Color(0xFFB7BBC2))), SizedBox(width: 8), Expanded(child: KpiCard(Icons.check_circle_rounded, '8', 'Доставлено', 'сьогодні', green))]),
            const SizedBox(height: 8),
            compact ? const Column(children: [InboundPanel(), SizedBox(height: 8), ConsolidationPanel(), SizedBox(height: 8), RouteTypesPanel()]) : const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(flex: 11, child: InboundPanel()), SizedBox(width: 8), Expanded(flex: 11, child: ConsolidationPanel()), SizedBox(width: 8), Expanded(flex: 10, child: RouteTypesPanel())]),
            const SizedBox(height: 8),
            const RoutesPanel(),
          ]),
        );
      });
}

class HeroPanel extends StatelessWidget {
  const HeroPanel({super.key});
  @override
  Widget build(BuildContext context) => Container(
        height: 122,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF6A2439)),
          gradient: const LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [Color(0xFF17131A), Color(0xFF21151B), Color(0xFF25131A)]),
        ),
        child: Stack(children: [
          Positioned.fill(child: Opacity(opacity: .20, child: CustomPaint(painter: WarehousePainter()))),
          const Positioned(left: 20, top: 16, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('P E O P L E   •   P R O C E S S   •   D E L I V E R Y', style: TextStyle(fontSize: 8.5, letterSpacing: 1.3, color: Color(0xFFE7786A))),
            SizedBox(height: 9), Text('НАДІЙНА ЛОГІСТИКА', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, height: 1)),
            SizedBox(height: 4), Row(children: [Text('ДЛЯ РОЗВИТКУ ', style: TextStyle(fontSize: 18, color: Color(0xFFD5D1D4))), Text('RETAIL', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: wine2))]),
            SizedBox(height: 7), Text('Більше, ніж доставка', style: TextStyle(fontSize: 9.5, color: muted)),
          ])),
          Positioned(right: 35, top: 18, child: Row(children: [
            Icon(Icons.local_shipping_rounded, size: 82, color: Color(0xFF6E2439)), SizedBox(width: 18),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text('СКЛАДИ', style: TextStyle(fontSize: 9, letterSpacing: 2, color: muted)), SizedBox(height: 5), Text('МАРШРУТИ', style: TextStyle(fontSize: 9, letterSpacing: 2, color: muted)), SizedBox(height: 5), Text('КОНСОЛІДАЦІЯ', style: TextStyle(fontSize: 9, letterSpacing: 2, color: muted)), SizedBox(height: 5), Text('КОНТРОЛЬ', style: TextStyle(fontSize: 9, letterSpacing: 2, color: muted)), SizedBox(height: 5), Text('РЕЗУЛЬТАТ  ━', style: TextStyle(fontSize: 9, letterSpacing: 2, color: wine2))]),
          ])),
        ]),
      );
}

class WarehousePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size s) {
    final p = Paint()..color = const Color(0xFF73636B);
    for (double x = s.width * .43; x < s.width; x += 42) {
      canvas.drawRect(Rect.fromLTWH(x, s.height * .30, 34, s.height * .55), p);
    }
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class KpiCard extends StatelessWidget {
  const KpiCard(this.icon, this.value, this.label, this.sub, this.color, {super.key});
  final IconData icon; final String value, label, sub; final Color color;
  @override
  Widget build(BuildContext context) => Container(
        height: 82,
        padding: const EdgeInsets.symmetric(horizontal: 15),
        decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(11), border: Border.all(color: color.withValues(alpha: .55))),
        child: Row(children: [
          Icon(icon, size: 26, color: color), const SizedBox(width: 13),
          Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 1), Text(label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)),
            Text(sub, style: const TextStyle(fontSize: 8.5, color: muted)),
          ]),
          const Spacer(), const Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF5D6571)),
        ]),
      );
}

class PanelBox extends StatelessWidget {
  const PanelBox({required this.title, required this.icon, required this.child, this.trailing, super.key});
  final String title; final IconData icon; final Widget child; final Widget? trailing;
  @override
  Widget build(BuildContext context) => Container(
        height: 208,
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
        decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(11), border: Border.all(color: border)),
        child: Column(children: [
          Row(children: [Icon(icon, size: 18, color: wine2), const SizedBox(width: 8), Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800)), const Spacer(), if (trailing != null) trailing!]),
          const SizedBox(height: 10), Expanded(child: child),
        ]),
      );
}

class InboundPanel extends StatelessWidget {
  const InboundPanel({super.key});
  @override
  Widget build(BuildContext context) {
    const rows = [
      ['IN-001','Корпоратура','Розумовського','33','Прийнято'], ['IN-002','Острів 1','Розумовського','12','В дорозі'], ['IN-003','Корпоратура','Острів 2','18','Очікується'], ['IN-004','Острів 2','Розумовського','8','План'], ['IN-005','Корпоратура','Острів 1','16','В дорозі'],
    ];
    return PanelBox(
      title: 'Вхідні вантажі', icon: Icons.local_shipping_rounded,
      trailing: MiniButton('＋  Додати'),
      child: Column(children: [
        const Row(children: [SizedBox(width: 44, child: Text('№', style: headerStyle)), Expanded(child: Text('Звідки', style: headerStyle)), Expanded(child: Text('Куди', style: headerStyle)), SizedBox(width: 47, child: Text('Палети', style: headerStyle)), SizedBox(width: 75, child: Text('Статус', style: headerStyle))]),
        const SizedBox(height: 4),
        for (final r in rows) Expanded(child: Row(children: [SizedBox(width: 44, child: Text(r[0], style: cellStyle)), Expanded(child: Text(r[1], style: cellStyle)), Expanded(child: Text(r[2], style: cellStyle)), SizedBox(width: 47, child: Text(r[3], style: cellStyle)), SizedBox(width: 75, child: statusPill(r[4]))])),
        const Align(alignment: Alignment.centerRight, child: Text('Усі вхідні вантажі  →', style: TextStyle(fontSize: 8.5, color: wine2))),
      ]),
    );
  }
}

class ConsolidationPanel extends StatelessWidget {
  const ConsolidationPanel({super.key});
  @override
  Widget build(BuildContext context) {
    const rows = [['Розумовського 27','33','60'],['Острів 1','5','25'],['Острів 2','0','0'],['Львів (партнер)','7','35'],['Білогородка','4','20']];
    return PanelBox(
      title: 'Консолідація (хаби)', icon: Icons.home_work_rounded,
      trailing: const Text('Детальніше  →', style: TextStyle(fontSize: 8.5, color: wine2)),
      child: Column(children: [
        const Row(children: [Expanded(child: Text('Склад', style: headerStyle)), SizedBox(width: 38, child: Text('Палети', style: headerStyle)), SizedBox(width: 120, child: Text('Заповнення', style: headerStyle))]),
        const SizedBox(height: 4),
        for (final r in rows) Expanded(child: Row(children: [Expanded(child: Text(r[0], style: cellStyle)), SizedBox(width: 38, child: Text(r[1], style: cellStyle)), SizedBox(width: 120, child: Row(children: [Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(5), child: LinearProgressIndicator(value: int.parse(r[2]) / 100, minHeight: 7, backgroundColor: const Color(0xFF252C36), valueColor: const AlwaysStoppedAnimation(orange)))), const SizedBox(width: 8), Text('${r[2]}%', style: cellStyle)]))])),
      ]),
    );
  }
}

class RouteTypesPanel extends StatelessWidget {
  const RouteTypesPanel({super.key});
  @override
  Widget build(BuildContext context) {
    const rows = [('Retail (сухий)','Мережа WT, стандартна продукція','8',Icons.storefront_rounded,wine2),('Холодний склад','Fresh / Frozen / Multiref','4',Icons.ac_unit_rounded,blue),('Міжскладські','Корпоратура / Острів / інші','3',Icons.inventory_2_rounded,Color(0xFFB7BBC2))];
    return PanelBox(
      title: 'Типи маршрутів', icon: Icons.hub_rounded,
      child: Column(children: [
        for (final r in rows) Expanded(child: Container(
          margin: const EdgeInsets.only(bottom: 6), padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(color: panel2, borderRadius: BorderRadius.circular(8)),
          child: Row(children: [Icon(r.$4, size: 20, color: r.$5), const SizedBox(width: 10), Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(r.$1, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700)), const SizedBox(height: 2), Text(r.$2, style: const TextStyle(fontSize: 8, color: muted))])), Text(r.$3, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)), const SizedBox(width: 4), const Icon(Icons.chevron_right_rounded, size: 15, color: muted)]),
        )),
        const Align(alignment: Alignment.centerRight, child: Text('Створити маршрут  →', style: TextStyle(fontSize: 8.5, color: wine2))),
      ]),
    );
  }
}

class RoutesPanel extends StatelessWidget {
  const RoutesPanel({super.key});
  @override
  Widget build(BuildContext context) {
    const rows = [
      ['R-001','Retail','Розумовського → Палладіна → Бажана','5','8','AA 1234 XX','14.09 12:00','В дорозі'],
      ['R-002','Retail','Розумовського → Маккейна → Філатова','4','7','AA 5678 XX','14.09 13:00','Скомплектовано'],
      ['F-001','Холодний','Розумовського → Соборності → Здановської','6','9','AA 9012 XX','14.09 14:00','В дорозі'],
      ['R-003','Retail','Розумовського → Верхній Вал → Ярославів Вал','4','6','AA 3456 XX','14.09 15:00','Заплановано'],
    ];
    return Container(
      height: 210,
      padding: const EdgeInsets.fromLTRB(14, 11, 14, 10),
      decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(11), border: Border.all(color: border)),
      child: Column(children: [
        Row(children: [
          const Icon(Icons.calendar_month_rounded, size: 18, color: wine2), const SizedBox(width: 8),
          const Text('Сьогоднішні маршрути', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800)),
          const SizedBox(width: 18), filterChip('Усі','12',true), const SizedBox(width: 6), filterChip('Retail','8',false), const SizedBox(width: 6), filterChip('Холодний','4',false), const SizedBox(width: 6), filterChip('Міжскладські','3',false),
          const Spacer(), MiniButton('＋  Новий маршрут'),
        ]),
        const SizedBox(height: 9),
        const Row(children: [SizedBox(width: 50, child: Text('№', style: headerStyle)), SizedBox(width: 76, child: Text('Тип', style: headerStyle)), Expanded(child: Text('Маршрут', style: headerStyle)), SizedBox(width: 62, child: Text('Магазини', style: headerStyle)), SizedBox(width: 50, child: Text('Палети', style: headerStyle)), SizedBox(width: 90, child: Text('Авто', style: headerStyle)), SizedBox(width: 100, child: Text('План виїзду', style: headerStyle)), SizedBox(width: 105, child: Text('Статус', style: headerStyle)), SizedBox(width: 18)]),
        const SizedBox(height: 4),
        for (final r in rows) Expanded(child: Container(
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF202733)))),
          child: Row(children: [
            SizedBox(width: 50, child: Text(r[0], style: cellStyle)), SizedBox(width: 76, child: typePill(r[1])),
            Expanded(child: Text(r[2], style: cellStyle, overflow: TextOverflow.ellipsis)), SizedBox(width: 62, child: Text(r[3], style: cellStyle)), SizedBox(width: 50, child: Text(r[4], style: cellStyle)), SizedBox(width: 90, child: Text(r[5], style: cellStyle)), SizedBox(width: 100, child: Text(r[6], style: cellStyle)), SizedBox(width: 105, child: statusPill(r[7])), const SizedBox(width: 18, child: Icon(Icons.more_horiz, size: 13, color: muted)),
          ]),
        )),
        const Align(alignment: Alignment.centerRight, child: Padding(padding: EdgeInsets.only(top: 4), child: Text('Усі маршрути  →', style: TextStyle(fontSize: 8.5, color: wine2)))),
      ]),
    );
  }
}

const headerStyle = TextStyle(fontSize: 8.2, color: muted, fontWeight: FontWeight.w600);
const cellStyle = TextStyle(fontSize: 8.8, color: Color(0xFFD8D8DC));

class MiniButton extends StatelessWidget {
  const MiniButton(this.label, {super.key});
  final String label;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(color: wine, borderRadius: BorderRadius.circular(7)),
        child: Text(label, style: const TextStyle(fontSize: 8.8, color: Colors.white)),
      );
}

Widget filterChip(String label, String n, bool active) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: active ? wine : panel2, borderRadius: BorderRadius.circular(7)),
      child: Row(children: [Text(label, style: const TextStyle(fontSize: 8.5)), const SizedBox(width: 6), Container(padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1), decoration: BoxDecoration(color: const Color(0xFF242B35), borderRadius: BorderRadius.circular(5)), child: Text(n, style: const TextStyle(fontSize: 7.5)))]),
    );

Widget typePill(String value) {
  final cold = value == 'Холодний';
  return Align(alignment: Alignment.centerLeft, child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: (cold ? blue : wine).withValues(alpha: .5), borderRadius: BorderRadius.circular(20), border: Border.all(color: cold ? blue : wine2)), child: Text(value, style: const TextStyle(fontSize: 8, color: Colors.white))));
}

Widget statusPill(String value) {
  Color c;
  switch (value) {
    case 'Прийнято': c = green; break;
    case 'В дорозі': c = blue; break;
    case 'Очікується': c = amber; break;
    case 'Скомплектовано': c = amber; break;
    default: c = const Color(0xFF69727E);
  }
  return Align(alignment: Alignment.centerLeft, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: c.withValues(alpha: .22), borderRadius: BorderRadius.circular(12), border: Border.all(color: c.withValues(alpha: .6))), child: Text(value, style: TextStyle(fontSize: 7.5, color: c, fontWeight: FontWeight.w700))));
}
