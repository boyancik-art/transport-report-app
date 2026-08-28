import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

bool get demoMode => supabaseUrl.isEmpty || supabaseAnonKey.isEmpty;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!demoMode) {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  }
  runApp(const TransportReportApp());
}

class TransportReportApp extends StatelessWidget {
  const TransportReportApp({super.key});

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF1677FF);
    return MaterialApp(
      title: 'Transport Report',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: seed),
        scaffoldBackgroundColor: const Color(0xFFF6F8FC),
        cardTheme: const CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(18)),
          ),
        ),
        inputDecorationTheme: const InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(14)),
            borderSide: BorderSide(color: Color(0xFFE1E6EF)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(14)),
            borderSide: BorderSide(color: Color(0xFFE1E6EF)),
          ),
        ),
      ),
      home: demoMode ? const AppShell(demo: true) : const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  StreamSubscription<AuthState>? _sub;
  Session? _session;

  @override
  void initState() {
    super.initState();
    _session = Supabase.instance.client.auth.currentSession;
    _sub = Supabase.instance.client.auth.onAuthStateChange.listen((event) {
      if (mounted) setState(() => _session = event.session);
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _session == null ? const SignInPage() : const AppShell(demo: false);
  }
}

class SignInPage extends StatefulWidget {
  const SignInPage({super.key});

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String? error;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> signIn() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: email.text.trim(),
        password: password.text,
      );
    } on AuthException catch (e) {
      setState(() => error = e.message);
    } catch (_) {
      setState(() => error = 'Не вдалося виконати вхід');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const CircleAvatar(
                    radius: 40,
                    backgroundColor: Color(0xFFE7F0FF),
                    child: Icon(Icons.local_shipping_rounded,
                        size: 42, color: Color(0xFF1677FF)),
                  ),
                  const SizedBox(height: 20),
                  Text('Transport Report',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          )),
                  const SizedBox(height: 8),
                  const Text('Єдина база транспортної логістики',
                      textAlign: TextAlign.center),
                  const SizedBox(height: 32),
                  TextField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email'),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: password,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Пароль'),
                    onSubmitted: (_) => signIn(),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: busy ? null : signIn,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(54),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: busy
                        ? const CircularProgressIndicator(strokeWidth: 2)
                        : const Text('Увійти'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class RouteModel {
  const RouteModel({
    required this.id,
    required this.routeDate,
    required this.routeDeliveryId,
    required this.expeditor,
    required this.warehouse,
    required this.points,
    required this.documents,
    required this.weight,
    required this.pallets,
    required this.bottles,
    required this.places,
    required this.orderAmount,
    this.driver,
    this.vehicle,
    this.carrier,
    this.wave,
    this.tariff,
    this.tariffUnknown = false,
    this.completed = false,
    this.assignedLogisticianId,
  });

  final int id;
  final DateTime routeDate;
  final String routeDeliveryId;
  final String expeditor;
  final String warehouse;
  final int points;
  final int documents;
  final double weight;
  final double pallets;
  final double bottles;
  final double places;
  final double orderAmount;
  final String? driver;
  final String? vehicle;
  final String? carrier;
  final String? wave;
  final double? tariff;
  final bool tariffUnknown;
  final bool completed;
  final String? assignedLogisticianId;

  factory RouteModel.fromJson(Map<String, dynamic> r) {
    final facts = r['route_facts'];
    final f = facts is List && facts.isNotEmpty
        ? Map<String, dynamic>.from(facts.first as Map)
        : facts is Map
            ? Map<String, dynamic>.from(facts)
            : <String, dynamic>{};
    return RouteModel(
      id: (r['id'] as num).toInt(),
      routeDate: DateTime.tryParse('${r['route_date']}') ?? DateTime.now(),
      routeDeliveryId: '${r['route_delivery_id'] ?? ''}',
      expeditor: '${r['expeditor_name'] ?? ''}',
      warehouse: '${r['warehouse'] ?? ''}',
      points: (r['total_points'] as num? ?? 0).toInt(),
      documents: (r['total_documents'] as num? ?? 0).toInt(),
      weight: (r['total_weight'] as num? ?? 0).toDouble(),
      pallets: (r['total_pallets'] as num? ?? 0).toDouble(),
      bottles: (r['total_bottles'] as num? ?? 0).toDouble(),
      places: (r['total_places'] as num? ?? 0).toDouble(),
      orderAmount: (r['total_order_amount'] as num? ?? 0).toDouble(),
      driver: f['driver_name']?.toString(),
      vehicle: f['vehicle_number']?.toString(),
      carrier: f['carrier_name']?.toString(),
      wave: f['wave']?.toString(),
      tariff: (f['tariff'] as num?)?.toDouble(),
      tariffUnknown: f['tariff_unknown'] == true,
      completed: f['completed'] == true,
      assignedLogisticianId: r['assigned_logistician_id']?.toString(),
    );
  }
}

class DemoData {
  static final routes = <RouteModel>[
    RouteModel(
      id: 1,
      routeDate: DateTime(2026, 8, 27),
      routeDeliveryId: '61287185',
      expeditor: 'Сніжана Глушко',
      warehouse: 'Розумовського',
      points: 24,
      documents: 37,
      weight: 6240,
      pallets: 24,
      bottles: 1536,
      places: 198,
      orderAmount: 187450,
      carrier: 'ФОП Діденко',
      wave: '24',
      tariff: 7450,
      completed: true,
    ),
    RouteModel(
      id: 2,
      routeDate: DateTime(2026, 8, 27),
      routeDeliveryId: '61287204',
      expeditor: 'Сергій Кузьменко',
      warehouse: 'Чайка',
      points: 18,
      documents: 29,
      weight: 9480,
      pallets: 36,
      bottles: 2208,
      places: 286,
      orderAmount: 246300,
      carrier: 'СТВ',
      wave: '48',
      tariff: 12600,
    ),
    RouteModel(
      id: 3,
      routeDate: DateTime(2026, 8, 27),
      routeDeliveryId: '61287231',
      expeditor: 'Сніжана Глушко',
      warehouse: 'Розумовського',
      points: 15,
      documents: 22,
      weight: 7850,
      pallets: 30,
      bottles: 1900,
      places: 224,
      orderAmount: 198760,
      carrier: 'САВ',
      wave: 'Мережа',
      tariff: 9750,
    ),
  ];
}

class RouteRepository {
  RouteRepository(this.demo);
  final bool demo;

  Future<List<RouteModel>> loadRoutes(DateTime date) async {
    if (demo) {
      await Future<void>.delayed(const Duration(milliseconds: 250));
      return DemoData.routes;
    }
    final c = Supabase.instance.client;
    final rows = await c
        .from('routes')
        .select('*, route_facts(*)')
        .eq('route_date', DateFormat('yyyy-MM-dd').format(date))
        .order('route_delivery_id');
    return (rows as List)
        .map((e) => RouteModel.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<void> claimRoute(RouteModel route) async {
    if (demo) return;
    final c = Supabase.instance.client;
    final uid = c.auth.currentUser?.id;
    if (uid == null) throw StateError('Користувач не авторизований');
    final updated = await c
        .from('routes')
        .update({'assigned_logistician_id': uid})
        .eq('id', route.id)
        .isFilter('assigned_logistician_id', null)
        .select('id');
    if ((updated as List).isEmpty && route.assignedLogisticianId != uid) {
      throw StateError('Цей маршрут уже обрав інший логіст');
    }
  }

  Future<void> saveFact({
    required RouteModel route,
    required String driver,
    required String vehicle,
    required String carrier,
    required String wave,
    required double? tariff,
    required bool tariffUnknown,
    required String comment,
  }) async {
    if (demo) return;
    await Supabase.instance.client.from('route_facts').upsert({
      'route_id': route.id,
      'driver_name': driver,
      'vehicle_number': vehicle,
      'carrier_name': carrier,
      'wave': wave,
      'tariff': tariffUnknown ? null : tariff,
      'tariff_unknown': tariffUnknown,
      'comment': comment,
      'completed': true,
      'updated_at': DateTime.now().toIso8601String(),
    }, onConflict: 'route_id');
  }
}

class AppShell extends StatefulWidget {
  const AppShell({required this.demo, super.key});
  final bool demo;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;
  late final repo = RouteRepository(widget.demo);
  DateTime date = DateTime(2026, 8, 27);

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardPage(repo: repo, date: date, demo: widget.demo),
      RoutesPage(repo: repo, date: date, demo: widget.demo),
      ReportsPage(repo: repo, date: date),
      MorePage(demo: widget.demo),
    ];
    return Scaffold(
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Дашборд'),
          NavigationDestination(icon: Icon(Icons.route_outlined), selectedIcon: Icon(Icons.route), label: 'Маршрути'),
          NavigationDestination(icon: Icon(Icons.assessment_outlined), selectedIcon: Icon(Icons.assessment), label: 'Звіти'),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'Ще'),
        ],
      ),
    );
  }
}

class PageHeader extends StatelessWidget {
  const PageHeader({required this.title, required this.subtitle, this.trailing, super.key});
  final String title;
  final String subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 3),
                Text(subtitle, style: const TextStyle(color: Color(0xFF6C778A))),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({required this.repo, required this.date, required this.demo, super.key});
  final RouteRepository repo;
  final DateTime date;
  final bool demo;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<RouteModel>>(
        future: repo.loadRoutes(date),
        builder: (context, snapshot) {
          final routes = snapshot.data ?? const <RouteModel>[];
          final documents = routes.fold<int>(0, (s, r) => s + r.documents);
          final tt = routes.fold<int>(0, (s, r) => s + r.points);
          final pallets = routes.fold<double>(0, (s, r) => s + r.pallets);
          final weight = routes.fold<double>(0, (s, r) => s + r.weight);
          final spend = routes.fold<double>(0, (s, r) => s + (r.tariff ?? 0));
          final sales = routes.fold<double>(0, (s, r) => s + r.orderAmount);
          return RefreshIndicator(
            onRefresh: () async {},
            child: ListView(
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                PageHeader(
                  title: 'Transport Report',
                  subtitle: demo ? 'Demo · ${DateFormat('dd.MM.yyyy').format(date)}' : DateFormat('dd.MM.yyyy').format(date),
                  trailing: const CircleAvatar(child: Icon(Icons.person_outline)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: GridView.count(
                    physics: const NeverScrollableScrollPhysics(),
                    shrinkWrap: true,
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.32,
                    children: [
                      KpiCard(label: 'Накладних', value: '$documents', icon: Icons.description_outlined),
                      KpiCard(label: 'ТТ', value: '$tt', icon: Icons.storefront_outlined),
                      KpiCard(label: 'Маршрутів', value: '${routes.length}', icon: Icons.route_outlined),
                      KpiCard(label: 'Палет', value: nf0(pallets), icon: Icons.grid_view_rounded),
                      KpiCard(label: 'Вага, кг', value: nf0(weight), icon: Icons.scale_outlined),
                      KpiCard(label: 'Витрати, грн', value: money0(spend), icon: Icons.account_balance_wallet_outlined),
                      KpiCard(label: 'Продажі, грн', value: money0(sales), icon: Icons.payments_outlined),
                      KpiCard(label: '1 ТТ, грн', value: tt == 0 ? '0' : money2(spend / tt), icon: Icons.calculate_outlined),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Останні маршрути', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                          const SizedBox(height: 10),
                          ...routes.take(4).map((r) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: CircleAvatar(backgroundColor: const Color(0xFFE7F0FF), child: Text('${r.points}')),
                            title: Text('ID ${r.routeDeliveryId}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            subtitle: Text('${r.expeditor} · ${r.wave ?? 'Хвиля не вказана'}'),
                            trailing: Text(money0(r.tariff ?? 0)),
                          )),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class KpiCard extends StatelessWidget {
  const KpiCard({required this.label, required this.value, required this.icon, super.key});
  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: const Color(0xFF1677FF), size: 20),
            const Spacer(),
            Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(color: Color(0xFF6C778A), fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class RoutesPage extends StatefulWidget {
  const RoutesPage({required this.repo, required this.date, required this.demo, super.key});
  final RouteRepository repo;
  final DateTime date;
  final bool demo;

  @override
  State<RoutesPage> createState() => _RoutesPageState();
}

class _RoutesPageState extends State<RoutesPage> {
  late Future<List<RouteModel>> future;
  String filter = 'Всі';

  @override
  void initState() {
    super.initState();
    future = widget.repo.loadRoutes(widget.date);
  }

  void reload() => setState(() => future = widget.repo.loadRoutes(widget.date));

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          PageHeader(title: 'Маршрути', subtitle: DateFormat('dd.MM.yyyy').format(widget.date), trailing: IconButton(onPressed: reload, icon: const Icon(Icons.refresh))),
          SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: ['Всі', 'Заповнено', 'Без тарифу'].map((f) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(label: Text(f), selected: filter == f, onSelected: (_) => setState(() => filter = f)),
              )).toList(),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: FutureBuilder<List<RouteModel>>(
              future: future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                if (snapshot.hasError) return Center(child: Text('Помилка: ${snapshot.error}'));
                var routes = snapshot.data ?? const <RouteModel>[];
                if (filter == 'Заповнено') routes = routes.where((r) => r.completed).toList();
                if (filter == 'Без тарифу') routes = routes.where((r) => r.tariff == null || r.tariffUnknown).toList();
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  itemCount: routes.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) {
                    final r = routes[i];
                    return RouteCard(route: r, onTap: () async {
                      final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => RouteDetailsPage(route: r, repo: widget.repo, demo: widget.demo)));
                      if (saved == true) reload();
                    });
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class RouteCard extends StatelessWidget {
  const RouteCard({required this.route, required this.onTap, super.key});
  final RouteModel route;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final statusColor = route.completed ? const Color(0xFF1A9B5A) : const Color(0xFFE9A20B);
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Expanded(child: Text('ID ${route.routeDeliveryId}', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: statusColor.withValues(alpha: .12), borderRadius: BorderRadius.circular(10)),
                  child: Text(route.completed ? 'Заповнено' : 'В роботі', style: TextStyle(color: statusColor, fontWeight: FontWeight.w700, fontSize: 12)),
                ),
              ]),
              const SizedBox(height: 5),
              Text('${route.expeditor} · ${route.carrier ?? 'Перевізник не вказаний'}'),
              const SizedBox(height: 14),
              Row(children: [
                RouteMetric(icon: Icons.storefront_outlined, text: '${route.points} ТТ'),
                RouteMetric(icon: Icons.grid_view_rounded, text: '${nf0(route.pallets)} пал.'),
                RouteMetric(icon: Icons.scale_outlined, text: '${nf0(route.weight)} кг'),
              ]),
              const Divider(height: 24),
              Row(children: [
                const Icon(Icons.account_balance_wallet_outlined, size: 18),
                const SizedBox(width: 7),
                Text(route.tariffUnknown ? 'Тариф невідомий' : '${money0(route.tariff ?? 0)} грн', style: const TextStyle(fontWeight: FontWeight.w800)),
                const Spacer(),
                const Icon(Icons.chevron_right),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class RouteMetric extends StatelessWidget {
  const RouteMetric({required this.icon, required this.text, super.key});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Expanded(child: Row(children: [Icon(icon, size: 17, color: const Color(0xFF6C778A)), const SizedBox(width: 5), Flexible(child: Text(text, style: const TextStyle(fontSize: 12)))]));
}

class RouteDetailsPage extends StatefulWidget {
  const RouteDetailsPage({required this.route, required this.repo, required this.demo, super.key});
  final RouteModel route;
  final RouteRepository repo;
  final bool demo;

  @override
  State<RouteDetailsPage> createState() => _RouteDetailsPageState();
}

class _RouteDetailsPageState extends State<RouteDetailsPage> {
  late final driver = TextEditingController(text: widget.route.driver ?? '');
  late final vehicle = TextEditingController(text: widget.route.vehicle ?? '');
  late final carrier = TextEditingController(text: widget.route.carrier ?? '');
  late final tariff = TextEditingController(text: widget.route.tariff?.toStringAsFixed(0) ?? '');
  final comment = TextEditingController();
  String wave = '24';
  bool tariffUnknown = false;
  bool saving = false;

  @override
  void initState() {
    super.initState();
    wave = widget.route.wave ?? '24';
    tariffUnknown = widget.route.tariffUnknown;
  }

  @override
  void dispose() {
    driver.dispose(); vehicle.dispose(); carrier.dispose(); tariff.dispose(); comment.dispose();
    super.dispose();
  }

  Future<void> save() async {
    setState(() => saving = true);
    try {
      await widget.repo.claimRoute(widget.route);
      await widget.repo.saveFact(
        route: widget.route,
        driver: driver.text.trim(),
        vehicle: vehicle.text.trim().toUpperCase(),
        carrier: carrier.text.trim(),
        wave: wave,
        tariff: double.tryParse(tariff.text.replaceAll(',', '.')),
        tariffUnknown: tariffUnknown,
        comment: comment.text.trim(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.route;
    return Scaffold(
      appBar: AppBar(title: Text('Маршрут ${r.routeDeliveryId}')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('ID ${r.routeDeliveryId}', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 5),
            Text('${r.expeditor} · ${r.warehouse}'),
            const SizedBox(height: 16),
            Wrap(spacing: 8, runSpacing: 8, children: [
              Chip(label: Text('${r.points} ТТ')), Chip(label: Text('${nf0(r.pallets)} палет')), Chip(label: Text('${nf0(r.weight)} кг')), Chip(label: Text('${r.documents} накладних')),
            ]),
            const SizedBox(height: 10),
            Text('Продажі: ${money0(r.orderAmount)} грн', style: const TextStyle(fontWeight: FontWeight.w700)),
          ]))),
          const SizedBox(height: 16),
          Text('Фактичні дані логіста', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          TextField(controller: driver, decoration: const InputDecoration(labelText: 'Водій')),
          const SizedBox(height: 12),
          TextField(controller: vehicle, decoration: const InputDecoration(labelText: 'Номер авто')),
          const SizedBox(height: 12),
          TextField(controller: carrier, decoration: const InputDecoration(labelText: 'Перевізник')),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: wave,
            decoration: const InputDecoration(labelText: 'Хвиля'),
            items: const ['24', '48', 'Мережа', 'Пекарня', 'Пекарня Заморозка', 'FRESH', 'ОЗ', 'Повернення', 'Інше'].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
            onChanged: (v) => setState(() => wave = v ?? wave),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Не знаю тариф'),
            value: tariffUnknown,
            onChanged: (v) => setState(() => tariffUnknown = v),
          ),
          if (!tariffUnknown) TextField(controller: tariff, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Тариф, грн')),
          const SizedBox(height: 12),
          TextField(controller: comment, maxLines: 3, decoration: const InputDecoration(labelText: 'Коментар')),
          const SizedBox(height: 22),
          FilledButton(
            onPressed: saving ? null : save,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            child: saving ? const CircularProgressIndicator(strokeWidth: 2) : const Text('Зберегти маршрут'),
          ),
        ],
      ),
    );
  }
}

class ReportsPage extends StatelessWidget {
  const ReportsPage({required this.repo, required this.date, super.key});
  final RouteRepository repo;
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<RouteModel>>(
        future: repo.loadRoutes(date),
        builder: (context, snapshot) {
          final routes = snapshot.data ?? const <RouteModel>[];
          final tt = routes.fold<int>(0, (s, r) => s + r.points);
          final pallets = routes.fold<double>(0, (s, r) => s + r.pallets);
          final weight = routes.fold<double>(0, (s, r) => s + r.weight);
          final spend = routes.fold<double>(0, (s, r) => s + (r.tariff ?? 0));
          final sales = routes.fold<double>(0, (s, r) => s + r.orderAmount);
          final noTariff = routes.where((r) => r.tariff == null || r.tariffUnknown).length;
          return ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              PageHeader(title: 'Звіти', subtitle: 'Підсумок за ${DateFormat('dd.MM.yyyy').format(date)}'),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(children: [
                  ReportRow(label: 'ТТ', value: '$tt'),
                  ReportRow(label: 'Палет', value: nf0(pallets)),
                  ReportRow(label: 'Вага, кг', value: nf0(weight)),
                  ReportRow(label: 'Витрати, грн', value: money0(spend)),
                  ReportRow(label: 'Продажі, грн', value: money0(sales)),
                  ReportRow(label: 'Вартість 1 ТТ, грн', value: tt == 0 ? '0' : money2(spend / tt)),
                  ReportRow(label: '% логістики', value: sales == 0 ? '0%' : '${(spend / sales * 100).toStringAsFixed(2)}%'),
                  ReportRow(label: 'Без тарифу', value: '$noTariff авто', last: true),
                ]))),
              ),
            ],
          );
        },
      ),
    );
  }
}

class ReportRow extends StatelessWidget {
  const ReportRow({required this.label, required this.value, this.last = false, super.key});
  final String label;
  final String value;
  final bool last;
  @override
  Widget build(BuildContext context) => Column(children: [
    Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Row(children: [Expanded(child: Text(label)), Text(value, style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF137A49)))])),
    if (!last) const Divider(height: 1),
  ]);
}

class MorePage extends StatelessWidget {
  const MorePage({required this.demo, super.key});
  final bool demo;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        children: [
          const PageHeader(title: 'Ще', subtitle: 'Керування Transport Report'),
          if (demo)
            const ListTile(leading: Icon(Icons.science_outlined), title: Text('Demo mode'), subtitle: Text('Supabase ключі не передані. Інтерфейс працює на тестових даних.')),
          const ListTile(leading: Icon(Icons.people_outline), title: Text('Користувачі та ролі'), subtitle: Text('Admin · Керівник · Логіст')),
          const ListTile(leading: Icon(Icons.local_shipping_outlined), title: Text('Водії та авто')),
          const ListTile(leading: Icon(Icons.business_outlined), title: Text('Перевізники')),
          const ListTile(leading: Icon(Icons.history), title: Text('Історія маршрутів')),
          if (!demo)
            ListTile(leading: const Icon(Icons.logout), title: const Text('Вийти'), onTap: () => Supabase.instance.client.auth.signOut()),
        ],
      ),
    );
  }
}

String nf0(num value) => NumberFormat('#,##0', 'uk_UA').format(value).replaceAll('\u00A0', ' ');
String money0(num value) => NumberFormat('#,##0', 'uk_UA').format(value).replaceAll('\u00A0', ' ');
String money2(num value) => NumberFormat('#,##0.00', 'uk_UA').format(value).replaceAll('\u00A0', ' ');
