import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'retail_dashboard_v3.dart' as legacy;

const bg = Color(0xFF0A0E13);
const sidebarBg = Color(0xFF1A1017);
const panel = Color(0xFF111821);
const panel2 = Color(0xFF161D27);
const line = Color(0xFF29323D);
const textSoft = Color(0xFF98A1AE);
const wine = Color(0xFF7C1731);
const wineBright = Color(0xFFB62447);
const orange = Color(0xFFF08535);
const blue = Color(0xFF3F8BE8);
const green = Color(0xFF34C877);
const amber = Color(0xFFD88B2D);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: legacy.supabaseUrl, anonKey: legacy.supabaseAnonKey);
  runApp(const RetailV4App());
}

class RetailV4App extends StatelessWidget {
  const RetailV4App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Retail ТОВ «ТС ПЛЮС»',
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: bg,
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(
          seedColor: wineBright,
          brightness: Brightness.dark,
          surface: panel,
        ),
        dividerColor: line,
      ),
      home: const AuthGate(),
    );
  }
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
    sub = Supabase.instance.client.auth.onAuthStateChange.listen((event) {
      if (mounted) setState(() => session = event.session);
    });
  }

  @override
  void dispose() {
    sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => session == null ? const LoginPage() : const OperationsShell();
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

  Future<void> signIn() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) return;
    setState(() { busy = true; error = null; });
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: email.text.trim(),
        password: password.text,
      );
    } on AuthException catch (e) {
      if (mounted) setState(() => error = e.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 410),
          child: Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: panel,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: line),
            ),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.memory(base64Decode(legacy.logoBase64), width: 136, height: 136, fit: BoxFit.cover),
              ),
              const SizedBox(height: 20),
              const Text('Retail ТОВ «ТС ПЛЮС»', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
              const SizedBox(height: 5),
              const Text('Retail Operations', style: TextStyle(color: textSoft)),
              const SizedBox(height: 24),
              TextField(controller: email, decoration: fieldDecoration('Email')),
              const SizedBox(height: 12),
              TextField(controller: password, obscureText: true, decoration: fieldDecoration('Пароль'), onSubmitted: (_) => signIn()),
              if (error != null) ...[
                const SizedBox(height: 10),
                Align(alignment: Alignment.centerLeft, child: Text(error!, style: const TextStyle(color: Colors.redAccent))),
              ],
              const SizedBox(height: 18),
              SizedBox(width: double.infinity, child: FilledButton(
                style: FilledButton.styleFrom(backgroundColor: wineBright, padding: const EdgeInsets.symmetric(vertical: 15)),
                onPressed: busy ? null : signIn,
                child: Text(busy ? 'Вхід…' : 'Увійти'),
              )),
            ]),
          ),
        ),
      ),
    );
  }

  InputDecoration fieldDecoration(String label) => InputDecoration(
    labelText: label,
    filled: true,
    fillColor: panel2,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: line)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: line)),
  );
}

class OperationsShell extends StatefulWidget {
  const OperationsShell({super.key});
  @override
  State<OperationsShell> createState() => _OperationsShellState();
}

class _OperationsShellState extends State<OperationsShell> {
  int selected = 0;
  final items = const [
    _Nav('Головна', Icons.home_rounded),
    _Nav('Вхідні вантажі', Icons.local_shipping_rounded),
    _Nav('Консолідація', Icons.inventory_2_rounded),
    _Nav('Маршрути', Icons.location_on_rounded),
    _Nav('Талони комплектації', Icons.assignment_rounded),
    _Nav('ТТН', Icons.description_rounded),
    _Nav('Магазини WT', Icons.storefront_rounded),
    _Nav('Склади', Icons.warehouse_rounded),
    _Nav('Перевізники', Icons.fire_truck_rounded),
    _Nav('Тарифи', Icons.payments_rounded),
    _Nav('Аналітика', Icons.bar_chart_rounded),
    _Nav('Довідники', Icons.menu_book_rounded),
    _Nav('Користувачі', Icons.group_rounded),
    _Nav('Налаштування', Icons.settings_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final desktop = width >= 1100;
    return Scaffold(
      drawer: desktop ? null : Drawer(width: 260, child: _sidebar()),
      body: Row(children: [
        if (desktop) SizedBox(width: 258, child: _sidebar()),
        Expanded(child: Column(children: [
          _topBar(desktop),
          Expanded(child: selected == 0 ? const DashboardPage() : _placeholder(items[selected])),
        ])),
      ]),
    );
  }

  Widget _sidebar() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF25111B), Color(0xFF171017), Color(0xFF150F15)],
        ),
        border: Border(right: BorderSide(color: Color(0xFF2A2228))),
      ),
      child: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 18, 22, 12),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.memory(base64Decode(legacy.logoBase64), width: 126, height: 100, fit: BoxFit.cover),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 0),
              itemCount: items.length,
              itemBuilder: (_, i) {
                final active = i == selected;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Material(
                    color: active ? wine : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () {
                        setState(() => selected = i);
                        if (Scaffold.maybeOf(context)?.isDrawerOpen ?? false) Navigator.pop(context);
                      },
                      child: SizedBox(
                        height: 36,
                        child: Row(children: [
                          const SizedBox(width: 9),
                          Icon(items[i].icon, size: 18, color: active ? Colors.white : const Color(0xFFCDD2DB)),
                          const SizedBox(width: 11),
                          Expanded(child: Text(items[i].title, style: TextStyle(fontSize: 13.2, fontWeight: active ? FontWeight.w700 : FontWeight.w500))),
                        ]),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Retail ТОВ «ТС ПЛЮС»', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                SizedBox(height: 4),
                Text('Логістика, що рухає бізнес', style: TextStyle(color: textSoft, fontSize: 11.5)),
                SizedBox(height: 10),
                Text('v1.0.0   |   2026', style: TextStyle(color: Color(0xFF737C89), fontSize: 10.5)),
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _topBar(bool desktop) {
    final user = Supabase.instance.client.auth.currentUser;
    final short = (user?.email ?? 'user').split('@').first;
    return Container(
      height: 90,
      padding: EdgeInsets.symmetric(horizontal: desktop ? 28 : 14),
      decoration: const BoxDecoration(color: Color(0xFF0E141C), border: Border(bottom: BorderSide(color: line))),
      child: Row(children: [
        if (!desktop) Builder(builder: (context) => IconButton(onPressed: () => Scaffold.of(context).openDrawer(), icon: const Icon(Icons.menu))),
        Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: const [
          Text('Retail ТОВ «ТС ПЛЮС»', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800, letterSpacing: -.5)),
          SizedBox(height: 4),
          Text('Логістика. Контроль. Результат.', style: TextStyle(color: textSoft, fontSize: 13)),
        ])),
        const Icon(Icons.calendar_month_rounded, color: wineBright, size: 22),
        const SizedBox(width: 10),
        Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(DateFormat('dd.MM.yyyy').format(DateTime.now()), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(height: 2),
          Text(DateFormat('EEEE, HH:mm', 'uk').format(DateTime.now()), style: const TextStyle(color: textSoft, fontSize: 10.5)),
        ]),
        const SizedBox(width: 26),
        Container(width: 1, height: 38, color: line),
        const SizedBox(width: 18),
        CircleAvatar(radius: 20, backgroundColor: wine, child: Text(short.isEmpty ? 'U' : short[0].toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w700))),
        const SizedBox(width: 10),
        if (desktop) Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(short, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const Text('Транспортний відділ', style: TextStyle(color: textSoft, fontSize: 10.5)),
        ]),
        const SizedBox(width: 16),
        IconButton(tooltip: 'Вийти', onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout_rounded)),
      ]),
    );
  }

  Widget _placeholder(_Nav item) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(item.icon, size: 54, color: wineBright),
    const SizedBox(height: 14),
    Text(item.title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
    const SizedBox(height: 6),
    const Text('Модуль підключимо до операційної моделі наступним кроком.', style: TextStyle(color: textSoft)),
  ]));
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      return SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
        child: ConstrainedBox(
          constraints: BoxConstraints(minWidth: constraints.maxWidth),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const _Hero(),
            const SizedBox(height: 14),
            const _Kpis(),
            const SizedBox(height: 14),
            LayoutBuilder(builder: (context, inner) {
              if (inner.maxWidth < 1050) {
                return const Column(children: [
                  _InboundPanel(), SizedBox(height: 12), _ConsolidationPanel(), SizedBox(height: 12), _RouteTypesPanel(),
                ]);
              }
              return const SizedBox(height: 302, child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Expanded(flex: 39, child: _InboundPanel()),
                SizedBox(width: 12),
                Expanded(flex: 38, child: _ConsolidationPanel()),
                SizedBox(width: 12),
                Expanded(flex: 30, child: _RouteTypesPanel()),
              ]));
            }),
            const SizedBox(height: 14),
            const _RoutesTable(),
          ]),
        ),
      );
    });
  }
}

class _Hero extends StatelessWidget {
  const _Hero();
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 178,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: const Color(0xFF5D2535)),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFF231018), Color(0xFF11161F), Color(0xFF17141B)],
          stops: [0, .55, 1],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(children: [
        Positioned.fill(child: CustomPaint(painter: _WarehousePainter())),
        Padding(
          padding: const EdgeInsets.fromLTRB(28, 22, 28, 18),
          child: Row(children: [
            Expanded(flex: 5, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('PEOPLE  ·  PROCESS  ·  DELIVERY', style: TextStyle(color: Color(0xFFE36F72), fontSize: 11.5, letterSpacing: 3.2, fontWeight: FontWeight.w600)),
              const SizedBox(height: 11),
              const Text('НАДІЙНА ЛОГІСТИКА', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, height: 1.05)),
              const SizedBox(height: 3),
              Row(children: const [
                Text('ДЛЯ РОЗВИТКУ ', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w400, color: Color(0xFFD7DADF))),
                Text('RETAIL', style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800, color: Color(0xFFE15760))),
              ]),
              const Spacer(),
              const Text('Більше, ніж доставка', style: TextStyle(color: textSoft, fontSize: 13)),
            ])),
            Expanded(flex: 5, child: Align(
              alignment: Alignment.centerRight,
              child: Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                Icon(Icons.warehouse_rounded, size: 58, color: Colors.white.withValues(alpha: .35)),
                const SizedBox(width: 16),
                Icon(Icons.local_shipping_rounded, size: 88, color: const Color(0xFF8F455A)),
                const SizedBox(width: 14),
                Icon(Icons.route_rounded, size: 57, color: Colors.white.withValues(alpha: .32)),
              ]),
            )),
            const SizedBox(width: 14),
            const SizedBox(width: 115, child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('СКЛАДИ', style: TextStyle(color: textSoft, fontSize: 10, letterSpacing: 2.4)),
              SizedBox(height: 7),
              Text('МАРШРУТИ', style: TextStyle(color: textSoft, fontSize: 10, letterSpacing: 2.4)),
              SizedBox(height: 7),
              Text('КОНСОЛІДАЦІЯ', style: TextStyle(color: textSoft, fontSize: 10, letterSpacing: 2.1)),
              SizedBox(height: 7),
              Text('КОНТРОЛЬ', style: TextStyle(color: textSoft, fontSize: 10, letterSpacing: 2.4)),
              SizedBox(height: 7),
              Row(mainAxisAlignment: MainAxisAlignment.end, children: [Text('РЕЗУЛЬТАТ', style: TextStyle(color: textSoft, fontSize: 10, letterSpacing: 2.2)), SizedBox(width: 10), SizedBox(width: 20, child: Divider(color: wineBright, thickness: 2))]),
            ])),
          ]),
        ),
      ]),
    );
  }
}

class _WarehousePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = Colors.black.withValues(alpha: .22);
    canvas.drawRect(Rect.fromLTWH(size.width * .53, 0, size.width * .47, size.height), p);
    final linePaint = Paint()..color = Colors.white.withValues(alpha: .035)..strokeWidth = 1;
    for (var x = size.width * .54; x < size.width; x += 52) {
      canvas.drawLine(Offset(x, 0), Offset(x - 50, size.height), linePaint);
    }
    for (var y = 18.0; y < size.height; y += 32) {
      canvas.drawLine(Offset(size.width * .53, y), Offset(size.width, y), linePaint);
    }
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _Kpis extends StatelessWidget {
  const _Kpis();
  @override
  Widget build(BuildContext context) {
    const cards = [
      _Kpi(Icons.local_shipping_rounded, '5', 'Вхідних вантажів', 'сьогодні', wineBright),
      _Kpi(Icons.inventory_2_rounded, '33', 'Палети на хабах', 'до розконсолідації', orange),
      _Kpi(Icons.alt_route_rounded, '12', 'Маршрутів', 'сьогодні', wineBright),
      _Kpi(Icons.storefront_rounded, '38', 'Магазинів WT', 'в роботі', Color(0xFFD9DCE2)),
      _Kpi(Icons.check_circle_rounded, '8', 'Доставлено', 'сьогодні', green),
    ];
    return LayoutBuilder(builder: (context, c) {
      final cols = c.maxWidth >= 950 ? 5 : (c.maxWidth >= 600 ? 3 : 1);
      final gap = 12.0;
      final w = (c.maxWidth - gap * (cols - 1)) / cols;
      return Wrap(spacing: gap, runSpacing: gap, children: [for (final k in cards) SizedBox(width: w, height: 112, child: _KpiCard(k))]);
    });
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard(this.kpi);
  final _Kpi kpi;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        color: panel,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kpi.color.withValues(alpha: .55)),
      ),
      child: Row(children: [
        Icon(kpi.icon, color: kpi.color, size: 29),
        const SizedBox(width: 18),
        Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(kpi.value, style: const TextStyle(fontSize: 27, fontWeight: FontWeight.w900, height: 1)),
          const SizedBox(height: 5),
          Text(kpi.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(kpi.subtitle, style: const TextStyle(fontSize: 10.5, color: textSoft)),
        ])),
        const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFF727B88)),
      ]),
    );
  }
}

class _InboundPanel extends StatelessWidget {
  const _InboundPanel();
  @override
  Widget build(BuildContext context) {
    return _Box(
      title: 'Вхідні вантажі', icon: Icons.local_shipping_rounded, action: '+  Додати',
      child: Column(children: [
        const _TableHeader(['№', 'Звідки', 'Куди', 'Палети', 'Статус'], [48, 95, 150, 65, 88]),
        const SizedBox(height: 4),
        _inRow('IN-001', 'Корпоратура', 'Розумовського', '33', 'Прийнято', green),
        _inRow('IN-002', 'Острів 1', 'Розумовського', '12', 'В дорозі', blue),
        _inRow('IN-003', 'Корпоратура', 'Острів 2', '18', 'Очікується', amber),
        _inRow('IN-004', 'Острів 2', 'Розумовського', '8', 'План', const Color(0xFF7C8490)),
        _inRow('IN-005', 'Корпоратура', 'Острів 1', '16', 'В дорозі', blue),
        const Spacer(),
        const Align(alignment: Alignment.centerRight, child: Text('Усі вхідні вантажі  →', style: TextStyle(color: wineBright, fontSize: 11.5))),
      ]),
    );
  }

  Widget _inRow(String no, String from, String to, String pal, String status, Color c) => Container(
    height: 35,
    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF222A33)))),
    child: Row(children: [
      SizedBox(width: 48, child: Text(no, style: const TextStyle(fontSize: 10.5))),
      SizedBox(width: 95, child: Text(from, style: const TextStyle(fontSize: 10.5))),
      Expanded(child: Text(to, style: const TextStyle(fontSize: 10.5), overflow: TextOverflow.ellipsis)),
      SizedBox(width: 65, child: Text(pal, style: const TextStyle(fontSize: 10.5))),
      SizedBox(width: 88, child: _Pill(status, c)),
    ]),
  );
}

class _ConsolidationPanel extends StatelessWidget {
  const _ConsolidationPanel();
  @override
  Widget build(BuildContext context) {
    return _Box(
      title: 'Консолідація (хаби)', icon: Icons.warehouse_rounded, action: 'Детальніше  →',
      child: Column(children: [
        const _TableHeader(['Склад', 'Палети', 'Статус', 'Заповнення'], [150, 65, 100, 90]),
        const SizedBox(height: 6),
        _hub('Розумовського 27', '33', .60, orange),
        _hub('Острів 1', '5', .25, orange),
        _hub('Острів 2', '0', 0, const Color(0xFF606A77)),
        _hub('Львів (партнер)', '7', .35, orange),
        _hub('Білогородка', '4', .20, orange),
      ]),
    );
  }

  Widget _hub(String name, String pal, double v, Color c) => Container(
    height: 42,
    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF222A33)))),
    child: Row(children: [
      Expanded(child: Text(name, style: const TextStyle(fontSize: 11))),
      SizedBox(width: 52, child: Text('$pal пал.', style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700))),
      SizedBox(width: 86, child: ClipRRect(borderRadius: BorderRadius.circular(20), child: LinearProgressIndicator(value: v, minHeight: 8, backgroundColor: const Color(0xFF28303B), valueColor: AlwaysStoppedAnimation(c)))),
      const SizedBox(width: 10),
      SizedBox(width: 34, child: Text('${(v * 100).round()}%', style: const TextStyle(fontSize: 10.5, color: textSoft))),
    ]),
  );
}

class _RouteTypesPanel extends StatelessWidget {
  const _RouteTypesPanel();
  @override
  Widget build(BuildContext context) {
    return _Box(
      title: 'Типи маршрутів', icon: Icons.alt_route_rounded, action: '',
      child: Column(children: [
        _type(Icons.storefront_rounded, 'Retail (сухий)', 'Мережа WT, стандартна продукція', '8', wineBright),
        const SizedBox(height: 10),
        _type(Icons.ac_unit_rounded, 'Холодний склад', 'Fresh / Frozen / Multiref', '4', blue),
        const SizedBox(height: 10),
        _type(Icons.inventory_2_rounded, 'Міжскладські', 'Корпоратура / Острів / інші', '3', const Color(0xFFC8CDD4)),
        const Spacer(),
        const Align(alignment: Alignment.centerRight, child: Text('Створити маршрут  →', style: TextStyle(color: wineBright, fontSize: 11.5))),
      ]),
    );
  }

  Widget _type(IconData icon, String title, String sub, String count, Color c) => Container(
    height: 67,
    padding: const EdgeInsets.symmetric(horizontal: 14),
    decoration: BoxDecoration(color: panel2, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF202A35))),
    child: Row(children: [
      Icon(icon, color: c, size: 25), const SizedBox(width: 12),
      Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4), Text(sub, style: const TextStyle(fontSize: 9.8, color: textSoft)),
      ])),
      Column(mainAxisAlignment: MainAxisAlignment.center, children: [Text(count, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)), const Text('сьогодні', style: TextStyle(color: textSoft, fontSize: 9))]),
      const SizedBox(width: 5), const Icon(Icons.chevron_right_rounded, color: Color(0xFF707A87), size: 18),
    ]),
  );
}

class _RoutesTable extends StatelessWidget {
  const _RoutesTable();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(14), border: Border.all(color: line)),
      child: Column(children: [
        Row(children: [
          const Icon(Icons.calendar_month_rounded, color: wineBright, size: 19), const SizedBox(width: 9),
          const Text('Сьогоднішні маршрути', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800)),
          const SizedBox(width: 30),
          _filter('Усі', '12', true), const SizedBox(width: 8), _filter('Retail', '8', false), const SizedBox(width: 8), _filter('Холодний', '4', false), const SizedBox(width: 8), _filter('Міжскладські', '3', false),
          const Spacer(),
          SizedBox(height: 36, child: FilledButton.icon(style: FilledButton.styleFrom(backgroundColor: wine, foregroundColor: Colors.white), onPressed: () {}, icon: const Icon(Icons.add, size: 17), label: const Text('Новий маршрут', style: TextStyle(fontSize: 11.5)))),
        ]),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SizedBox(width: 1110, child: Column(children: [
            const _TableHeader(['№', 'Тип', 'Маршрут', 'Магазини', 'Палети', 'Авто', 'План виїзду', 'Статус', ''], [66, 100, 350, 90, 70, 110, 130, 130, 40]),
            _route('R-001', 'Retail', 'Розумовського → Палладіна → Бажана', '5', '8', 'AA 1234 XX', '14.09 12:00', 'В дорозі', blue),
            _route('R-002', 'Retail', 'Розумовського → Маккейна → Філатова', '4', '7', 'AA 5678 XX', '14.09 13:00', 'Скомплектовано', amber),
            _route('F-001', 'Холодний', 'Розумовського → Соборності → Здановської', '6', '9', 'AA 9012 XX', '14.09 14:00', 'В дорозі', blue),
            _route('R-003', 'Retail', 'Розумовського → Верхній Вал → Ярославів Вал', '4', '6', 'AA 3456 XX', '14.09 15:00', 'Заплановано', const Color(0xFF6C7683)),
          ])),
        ),
        const SizedBox(height: 10),
        const Align(alignment: Alignment.centerRight, child: Text('Усі маршрути  →', style: TextStyle(color: wineBright, fontSize: 11.5))),
      ]),
    );
  }

  static Widget _filter(String t, String n, bool active) => Container(
    height: 31,
    padding: const EdgeInsets.symmetric(horizontal: 11),
    decoration: BoxDecoration(color: active ? wine : panel2, borderRadius: BorderRadius.circular(8)),
    child: Row(children: [Text(t, style: TextStyle(fontSize: 10.5, color: active ? Colors.white : const Color(0xFFCBD0D7))), const SizedBox(width: 7), Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.black.withValues(alpha: .22), borderRadius: BorderRadius.circular(20)), child: Text(n, style: const TextStyle(fontSize: 9.5)))]),
  );

  static Widget _route(String no, String type, String route, String stores, String pal, String car, String time, String status, Color c) => Container(
    height: 40,
    decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF222A33)))),
    child: Row(children: [
      SizedBox(width: 66, child: Text(no, style: const TextStyle(fontSize: 10.5))),
      SizedBox(width: 100, child: Align(alignment: Alignment.centerLeft, child: _Pill(type, type == 'Холодний' ? blue : wineBright))),
      SizedBox(width: 350, child: Text(route, style: const TextStyle(fontSize: 10.5), overflow: TextOverflow.ellipsis)),
      SizedBox(width: 90, child: Text(stores, style: const TextStyle(fontSize: 10.5))),
      SizedBox(width: 70, child: Text(pal, style: const TextStyle(fontSize: 10.5))),
      SizedBox(width: 110, child: Text(car, style: const TextStyle(fontSize: 10.5))),
      SizedBox(width: 130, child: Text(time, style: const TextStyle(fontSize: 10.5))),
      SizedBox(width: 130, child: Align(alignment: Alignment.centerLeft, child: _Pill(status, c))),
      const SizedBox(width: 40, child: Icon(Icons.more_horiz, size: 17, color: textSoft)),
    ]),
  );
}

class _Box extends StatelessWidget {
  const _Box({required this.title, required this.icon, required this.action, required this.child});
  final String title;
  final IconData icon;
  final String action;
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(16, 13, 16, 14),
    decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(14), border: Border.all(color: line)),
    child: Column(children: [
      Row(children: [
        Icon(icon, color: wineBright, size: 20), const SizedBox(width: 9),
        Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5))),
        if (action.isNotEmpty) Text(action, style: const TextStyle(color: wineBright, fontSize: 11.5)),
      ]),
      const SizedBox(height: 12),
      Expanded(child: child),
    ]),
  );
}

class _TableHeader extends StatelessWidget {
  const _TableHeader(this.labels, this.widths);
  final List<String> labels;
  final List<double> widths;
  @override
  Widget build(BuildContext context) => Container(
    height: 30,
    padding: const EdgeInsets.symmetric(horizontal: 0),
    decoration: BoxDecoration(color: panel2, borderRadius: BorderRadius.circular(5)),
    child: Row(children: [
      for (var i = 0; i < labels.length; i++) SizedBox(width: widths[i], child: Padding(padding: const EdgeInsets.only(left: 6), child: Text(labels[i], style: const TextStyle(fontSize: 9.5, color: Color(0xFFB8C0CB))))),
    ]),
  );
}

class _Pill extends StatelessWidget {
  const _Pill(this.text, this.color);
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(color: color.withValues(alpha: .19), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: .55))),
    child: Text(text, style: TextStyle(fontSize: 9.2, color: color, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
  );
}

class _Nav {
  const _Nav(this.title, this.icon);
  final String title;
  final IconData icon;
}

class _Kpi {
  const _Kpi(this.icon, this.value, this.title, this.subtitle, this.color);
  final IconData icon;
  final String value;
  final String title;
  final String subtitle;
  final Color color;
}
