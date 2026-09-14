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
          colorScheme: ColorScheme.fromSeed(seedColor: wine2, brightness: Brightness.dark),
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
      body: Row(children: [
        if (wide) SizedBox(width: 250, child: sidebar()),
        Expanded(child: Column(children: [
          topbar(),
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
                    onTap: () => setState(() => selected = i),
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
              SizedBox(height: 8), Text('v0.3 · 2026', style: TextStyle(color: Color(0xFF777D88), fontSize: 11)),
            ])),
          ),
        ])),
      );

  Widget topbar() {
    final email = Supabase.instance.client.auth.currentUser?.email ?? 'user';
    return Container(
      height: 82,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: const BoxDecoration(color: Color(0xFF0D1219), border: Border(bottom: BorderSide(color: border))),
      child: Row(children: [
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
        const SizedBox(width: 14),
        CircleAvatar(backgroundColor: wine, child: Text(email.substring(0, 1).toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w800))),
        const SizedBox(width: 10),
        SizedBox(width: 130, child: Text(email.split('@').first, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700))),
        IconButton(onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout_rounded)),
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
          Container(
            height: 150,
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 22),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFF5A2532)),
              gradient: const LinearGradient(colors: [Color(0xFF1A1117), Color(0xFF2A151E), Color(0xFF10151D)]),
            ),
            child: Row(children: [
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('PEOPLE  •  PROCESS  •  DELIVERY', style: TextStyle(color: Color(0xFFE78371), letterSpacing: 3, fontSize: 11)),
                SizedBox(height: 8),
                Text('НАДІЙНА ЛОГІСТИКА', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
                Text('ДЛЯ РОЗВИТКУ RETAIL', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w500, color: Color(0xFFD1D5DC))),
                SizedBox(height: 4),
                Text('Склади · Консолідація · Маршрути · Документи', style: TextStyle(color: muted)),
              ])),
              const Row(children: [
                Icon(Icons.warehouse_rounded, size: 70, color: Color(0xFF5A616C)),
                SizedBox(width: 12),
                Icon(Icons.local_shipping_rounded, size: 90, color: Color(0xFF7E4655)),
                SizedBox(width: 8),
                Icon(Icons.route_rounded, size: 60, color: Color(0xFF5A616C)),
              ]),
            ]),
          ),
          const SizedBox(height: 14),
          Wrap(spacing: 12, runSpacing: 12, children: const [
            KpiCard(Icons.local_shipping_rounded, 'Вхідних вантажів', '5', 'сьогодні', wine2),
            KpiCard(Icons.inventory_2_rounded, 'Палети на хабах', '33', 'до розконсолідації', orange),
            KpiCard(Icons.alt_route_rounded, 'Маршрутів', '12', 'сьогодні', wine2),
            KpiCard(Icons.storefront_rounded, 'Магазинів WT', '38', 'в роботі', Color(0xFF9EA4AF)),
            KpiCard(Icons.check_circle_rounded, 'Доставлено', '8', 'сьогодні', good),
          ]),
          const SizedBox(height: 14),
          LayoutBuilder(builder: (_, c) {
            final wide = c.maxWidth >= 1050;
            final cards = [const IncomingCard(), const HubCard(), const RouteTypeCard()];
            if (!wide) return Column(children: [for (final card in cards) ...[card, const SizedBox(height: 12)]]);
            return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: cards[0]), const SizedBox(width: 12), Expanded(child: cards[1]), const SizedBox(width: 12), Expanded(child: cards[2]),
            ]);
          }),
          const SizedBox(height: 14),
          const RoutesCard(),
        ]),
      );
}

class KpiCard extends StatelessWidget {
  const KpiCard(this.icon, this.title, this.value, this.subtitle, this.color, {super.key});
  final IconData icon;
  final String title, value, subtitle;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        width: 210,
        height: 105,
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(15), border: Border.all(color: color.withValues(alpha: .5))),
        child: Row(children: [
          Icon(icon, color: color, size: 28), const SizedBox(width: 14),
          Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(value, style: const TextStyle(fontSize: 27, fontWeight: FontWeight.w900)),
            Text(title, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(subtitle, style: const TextStyle(color: muted, fontSize: 11)),
          ])),
        ]),
      );
}

class IncomingCard extends StatelessWidget {
  const IncomingCard({super.key});
  @override
  Widget build(BuildContext context) => panelBox('Вхідні вантажі', Icons.local_shipping_rounded, const Column(children: [
        MiniLine('Корпоратура → Розумовського', '33 пал.', 'Прийнято', good),
        MiniLine('Острів 1 → Розумовського', '12 пал.', 'В дорозі', blue),
        MiniLine('Острів 2 → Розумовського', '18 пал.', 'Очікується', warn),
      ]));
}

class HubCard extends StatelessWidget {
  const HubCard({super.key});
  @override
  Widget build(BuildContext context) => panelBox('Консолідація (хаби)', Icons.warehouse_rounded, const Column(children: [
        MiniLine('Розумовського 27', '33 пал.', '60%', orange),
        MiniLine('Острів 1', '5 пал.', '25%', orange),
        MiniLine('Острів 2', '0 пал.', '0%', muted),
      ]));
}

class RouteTypeCard extends StatelessWidget {
  const RouteTypeCard({super.key});
  @override
  Widget build(BuildContext context) => panelBox('Типи маршрутів', Icons.alt_route_rounded, const Column(children: [
        MiniLine('Retail (сухий)', '8', 'сьогодні', wine2),
        MiniLine('Холодний склад', '4', 'сьогодні', blue),
        MiniLine('Міжскладські', '3', 'сьогодні', Color(0xFF9EA4AF)),
      ]));
}

Widget panelBox(String title, IconData icon, Widget child) => Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: panel, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
      child: Column(children: [
        Row(children: [Icon(icon, color: wine2), const SizedBox(width: 9), Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16))]),
        const SizedBox(height: 14),
        Expanded(child: child),
      ]),
    );

class MiniLine extends StatelessWidget {
  const MiniLine(this.left, this.mid, this.right, this.color, {super.key});
  final String left, mid, right;
  final Color color;
  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF202630)))),
          child: Row(children: [
            Expanded(child: Text(left, overflow: TextOverflow.ellipsis)),
            Text(mid, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(width: 10),
            Text(right, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)),
          ]),
        ),
      );
}

class RoutesCard extends StatelessWidget {
  const RoutesCard({super.key});
  @override
  Widget build(BuildContext context) {
    const rows = [
      ['R-001', 'Retail', 'Розумовського → Палладіна → Бажана', '5 WT', '8 пал.', 'AA 1234 XX', '12:00', 'В дорозі'],
      ['R-002', 'Retail', 'Розумовського → Маккейна → Філатова', '4 WT', '7 пал.', 'AA 5678 XX', '13:00', 'Скомплектовано'],
      ['F-001', 'Холодний', 'Розумовського → Соборності → Здановської', '6 WT', '9 пал.', 'AA 9012 XX', '14:00', 'В дорозі'],
      ['R-003', 'Retail', 'Розумовського → Верхній Вал → Ярославів Вал', '4 WT', '6 пал.', 'AA 3456 XX', '15:00', 'Заплановано'],
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
        for (final r in rows)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFF202630)))),
            child: Row(children: [
              SizedBox(width: 65, child: Text(r[0], style: const TextStyle(fontWeight: FontWeight.w700))),
              SizedBox(width: 90, child: Text(r[1], style: TextStyle(color: r[1] == 'Холодний' ? blue : wine2, fontWeight: FontWeight.w700))),
              Expanded(child: Text(r[2], overflow: TextOverflow.ellipsis)),
              SizedBox(width: 70, child: Text(r[3])),
              SizedBox(width: 70, child: Text(r[4])),
              SizedBox(width: 100, child: Text(r[5])),
              SizedBox(width: 60, child: Text(r[6])),
              SizedBox(width: 115, child: Text(r[7], style: TextStyle(color: r[7] == 'В дорозі' ? blue : r[7] == 'Скомплектовано' ? warn : muted, fontWeight: FontWeight.w700))),
            ]),
          ),
      ]),
    );
  }
}
