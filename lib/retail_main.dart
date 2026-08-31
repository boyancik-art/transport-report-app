import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
bool get demoMode => supabaseUrl.isEmpty || supabaseAnonKey.isEmpty;

const _bg = Color(0xFF0B0D10);
const _surface = Color(0xFF12151A);
const _surface2 = Color(0xFF181C22);
const _line = Color(0xFF272C34);
const _textMuted = Color(0xFF8E96A3);
const _accent = Color(0xFFC7A46B);
const _good = Color(0xFF63B78B);
const _warn = Color(0xFFE2B86B);
const _bad = Color(0xFFD97878);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!demoMode) {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  }
  runApp(const TransportControlRetailApp());
}

ThemeData _theme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: _accent,
    brightness: Brightness.dark,
    surface: _surface,
  );
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: _bg,
    dividerColor: _line,
    cardTheme: const CardThemeData(
      color: _surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
        side: BorderSide(color: _line),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: _bg,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: _surface,
      indicatorColor: Color(0x2EC7A46B),
      surfaceTintColor: Colors.transparent,
    ),
    navigationRailTheme: const NavigationRailThemeData(
      backgroundColor: _surface,
      indicatorColor: Color(0x2EC7A46B),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: _surface2,
      labelStyle: const TextStyle(color: _textMuted),
      hintStyle: const TextStyle(color: _textMuted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: _line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: _line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: _accent, width: 1.2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: _accent,
        foregroundColor: const Color(0xFF17120C),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: _accent),
    ),
  );
}

class TransportControlRetailApp extends StatelessWidget {
  const TransportControlRetailApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Transport Control · Retail',
      theme: _theme(),
      home: demoMode ? const RetailShell(demo: true) : const _AuthGate(),
    );
  }
}

class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
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
  Widget build(BuildContext context) {
    return session == null ? const _SignInPage() : const RetailShell(demo: false);
  }
}

class _SignInPage extends StatefulWidget {
  const _SignInPage();

  @override
  State<_SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<_SignInPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String? error;

  Future<void> login() async {
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
      if (mounted) setState(() => error = e.message);
    } catch (_) {
      if (mounted) setState(() => error = 'Не вдалося виконати вхід');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _BrandMark(size: 62),
                const SizedBox(height: 28),
                Text('Transport Control',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          letterSpacing: -.7,
                        )),
                const SizedBox(height: 6),
                const Text('Retail · облік фактичних маршрутів',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: _textMuted)),
                const SizedBox(height: 32),
                TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                TextField(
                  controller: password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Пароль'),
                  onSubmitted: (_) => login(),
                ),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(error!, style: const TextStyle(color: _bad)),
                ],
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: busy ? null : login,
                  child: busy
                      ? const SizedBox.square(
                          dimension: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Увійти'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark({this.size = 46});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: _surface2,
          borderRadius: BorderRadius.circular(size * .26),
          border: Border.all(color: const Color(0xFF343A43)),
        ),
        alignment: Alignment.center,
        child: Text('TC',
            style: TextStyle(
              color: _accent,
              fontSize: size * .31,
              fontWeight: FontWeight.w900,
              letterSpacing: -.8,
            )),
      ),
    );
  }
}

class RetailStore {
  const RetailStore({required this.id, required this.name, this.direction, this.warehouse, this.temperature});
  final int id;
  final String name;
  final String? direction;
  final String? warehouse;
  final String? temperature;

  factory RetailStore.fromJson(Map<String, dynamic> x) => RetailStore(
        id: (x['id'] as num).toInt(),
        name: '${x['name'] ?? ''}',
        direction: x['direction']?.toString(),
        warehouse: x['default_warehouse']?.toString(),
        temperature: x['default_temperature']?.toString(),
      );
}

class RetailVehicle {
  const RetailVehicle({required this.id, required this.plate, this.carrier, this.palletCapacity, this.maxWeightKg});
  final int id;
  final String plate;
  final String? carrier;
  final double? palletCapacity;
  final double? maxWeightKg;

  factory RetailVehicle.fromJson(Map<String, dynamic> x) => RetailVehicle(
        id: (x['id'] as num).toInt(),
        plate: '${x['plate'] ?? ''}',
        carrier: x['carrier']?.toString(),
        palletCapacity: (x['pallet_capacity'] as num?)?.toDouble(),
        maxWeightKg: (x['max_weight_kg'] as num?)?.toDouble(),
      );
}

class RetailPoint {
  RetailPoint({required this.store, required this.pallets, required this.weightKg, this.note = ''});
  final RetailStore store;
  final double pallets;
  final double weightKg;
  final String note;
}

class RetailRoute {
  const RetailRoute({
    required this.id,
    required this.routeDate,
    required this.warehouse,
    required this.status,
    required this.points,
    this.temperature,
    this.vehicle,
    this.driver,
    this.carrier,
    this.routeNo,
    this.tariff,
    this.comment,
  });

  final int id;
  final DateTime routeDate;
  final String warehouse;
  final String status;
  final List<RetailPoint> points;
  final String? temperature;
  final RetailVehicle? vehicle;
  final String? driver;
  final String? carrier;
  final String? routeNo;
  final double? tariff;
  final String? comment;

  double get pallets => points.fold(0, (s, p) => s + p.pallets);
  double get weightKg => points.fold(0, (s, p) => s + p.weightKg);
  int get tt => points.length;
  double get loadPercent {
    final cap = vehicle?.palletCapacity ?? 0;
    return cap <= 0 ? 0 : pallets / cap * 100;
  }

  factory RetailRoute.fromJson(Map<String, dynamic> x) {
    final vRaw = x['tc_retail_vehicles'];
    final vehicle = vRaw is Map ? RetailVehicle.fromJson(Map<String, dynamic>.from(vRaw)) : null;
    final pointsRaw = x['tc_retail_route_points'];
    final points = <RetailPoint>[];
    if (pointsRaw is List) {
      for (final raw in pointsRaw) {
        if (raw is! Map) continue;
        final row = Map<String, dynamic>.from(raw);
        final sRaw = row['tc_retail_stores'];
        final store = sRaw is Map
            ? RetailStore.fromJson(Map<String, dynamic>.from(sRaw))
            : RetailStore(id: (row['store_id'] as num? ?? 0).toInt(), name: 'ТТ');
        points.add(RetailPoint(
          store: store,
          pallets: (row['pallets'] as num? ?? 0).toDouble(),
          weightKg: (row['weight_kg'] as num? ?? 0).toDouble(),
          note: '${row['note'] ?? ''}',
        ));
      }
    }
    return RetailRoute(
      id: (x['id'] as num).toInt(),
      routeDate: DateTime.tryParse('${x['route_date']}') ?? DateTime.now(),
      warehouse: '${x['warehouse'] ?? ''}',
      temperature: x['temperature']?.toString(),
      vehicle: vehicle,
      driver: x['driver_name']?.toString(),
      carrier: x['carrier']?.toString(),
      routeNo: x['route_no']?.toString(),
      tariff: (x['tariff'] as num?)?.toDouble(),
      comment: x['comment']?.toString(),
      status: '${x['status'] ?? 'draft'}',
      points: points,
    );
  }
}

class RetailRepository {
  RetailRepository(this.demo);
  final bool demo;

  SupabaseClient get db => Supabase.instance.client;

  Future<List<RetailStore>> loadStores() async {
    if (demo) return _demoStores;
    final rows = await db
        .from('tc_retail_stores')
        .select('id,name,direction,default_warehouse,default_temperature')
        .eq('is_active', true)
        .order('name');
    return (rows as List).map((x) => RetailStore.fromJson(Map<String, dynamic>.from(x as Map))).toList();
  }

  Future<List<RetailVehicle>> loadVehicles() async {
    if (demo) return _demoVehicles;
    final rows = await db
        .from('tc_retail_vehicles')
        .select('id,plate,carrier,pallet_capacity,max_weight_kg')
        .eq('is_active', true)
        .order('plate');
    return (rows as List).map((x) => RetailVehicle.fromJson(Map<String, dynamic>.from(x as Map))).toList();
  }

  Future<List<RetailRoute>> loadRoutes(DateTimeRange range) async {
    if (demo) return _demoRoutes;
    final from = DateFormat('yyyy-MM-dd').format(range.start);
    final to = DateFormat('yyyy-MM-dd').format(range.end);
    final rows = await db
        .from('tc_retail_routes')
        .select('id,route_date,warehouse,temperature,driver_name,carrier,route_no,tariff,comment,status,tc_retail_vehicles(id,plate,carrier,pallet_capacity,max_weight_kg),tc_retail_route_points(id,store_id,pallets,weight_kg,note,sort_order,tc_retail_stores(id,name,direction,default_warehouse,default_temperature))')
        .gte('route_date', from)
        .lte('route_date', to)
        .order('route_date', ascending: false)
        .order('created_at', ascending: false);
    return (rows as List).map((x) => RetailRoute.fromJson(Map<String, dynamic>.from(x as Map))).toList();
  }

  Future<int> createRoute({
    required DateTime date,
    required String warehouse,
    required String? temperature,
    required RetailVehicle? vehicle,
    required String driver,
    required String routeNo,
    required double? tariff,
    required String comment,
    required List<RetailPoint> points,
  }) async {
    if (demo) return DateTime.now().millisecondsSinceEpoch;
    final uid = db.auth.currentUser?.id;
    final route = await db
        .from('tc_retail_routes')
        .insert({
          'route_date': DateFormat('yyyy-MM-dd').format(date),
          'warehouse': warehouse,
          'temperature': temperature,
          'vehicle_id': vehicle?.id,
          'driver_name': driver.trim().isEmpty ? null : driver.trim(),
          'carrier': vehicle?.carrier,
          'route_no': routeNo.trim().isEmpty ? null : routeNo.trim(),
          'tariff': tariff,
          'comment': comment.trim().isEmpty ? null : comment.trim(),
          'status': 'completed',
          'created_by': uid,
        })
        .select('id')
        .single();
    final routeId = (route['id'] as num).toInt();
    if (points.isNotEmpty) {
      await db.from('tc_retail_route_points').insert([
        for (var i = 0; i < points.length; i++)
          {
            'route_id': routeId,
            'store_id': points[i].store.id,
            'pallets': points[i].pallets,
            'weight_kg': points[i].weightKg,
            'sort_order': i + 1,
            'note': points[i].note.trim().isEmpty ? null : points[i].note.trim(),
          }
      ]);
    }
    return routeId;
  }

  static const _demoStores = [
    RetailStore(id: 1, name: 'Мокра', direction: 'Київ'),
    RetailStore(id: 2, name: 'Здановської', direction: 'Київ'),
    RetailStore(id: 3, name: 'Голосіївська', direction: 'Київ'),
    RetailStore(id: 4, name: 'Чернігів', direction: 'Регіони'),
  ];

  static const _demoVehicles = [
    RetailVehicle(id: 1, plate: 'КА 4042 РТ', carrier: 'ТОВ ТС ПЛЮС', palletCapacity: 15, maxWeightKg: 5000),
    RetailVehicle(id: 2, plate: 'АА 8638 ХЕ', carrier: 'ФОП Діденко', palletCapacity: 8, maxWeightKg: 3000),
  ];

  static final _demoRoutes = [
    RetailRoute(
      id: 1,
      routeDate: DateTime.now(),
      warehouse: 'Чайка',
      temperature: 'Сухий',
      vehicle: _demoVehicles[0],
      driver: 'Олександр К.',
      carrier: 'ТОВ ТС ПЛЮС',
      routeNo: 'R-1048',
      tariff: 6000,
      status: 'completed',
      points: [
        RetailPoint(store: _demoStores[0], pallets: 2, weightKg: 870),
        RetailPoint(store: _demoStores[1], pallets: 2, weightKg: 940),
        RetailPoint(store: _demoStores[2], pallets: 2, weightKg: 1080),
      ],
    ),
    RetailRoute(
      id: 2,
      routeDate: DateTime.now(),
      warehouse: 'Малехів',
      temperature: 'ОЗ',
      vehicle: _demoVehicles[1],
      driver: 'Сергій В.',
      carrier: 'ФОП Діденко',
      routeNo: 'R-1049',
      tariff: null,
      status: 'draft',
      points: [RetailPoint(store: _demoStores[3], pallets: 5, weightKg: 2250)],
    ),
  ];
}

class RetailShell extends StatefulWidget {
  const RetailShell({required this.demo, super.key});
  final bool demo;

  @override
  State<RetailShell> createState() => _RetailShellState();
}

class _RetailShellState extends State<RetailShell> {
  int index = 0;
  late final repo = RetailRepository(widget.demo);
  DateTimeRange range = DateTimeRange(
    start: DateUtils.dateOnly(DateTime.now()),
    end: DateUtils.dateOnly(DateTime.now()),
  );
  int refreshKey = 0;

  void refresh() => setState(() => refreshKey++);

  Future<void> pickRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2025),
      lastDate: DateTime(2035),
      initialDateRange: range,
      helpText: 'Період обліку',
      cancelText: 'Скасувати',
      confirmText: 'Обрати',
    );
    if (picked != null && mounted) setState(() => range = picked);
  }

  Future<void> createRoute() async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => CreateRetailRoutePage(repo: repo)),
    );
    if (saved == true && mounted) refresh();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      RetailDashboard(repo: repo, range: range, refreshKey: refreshKey, onCreate: createRoute),
      RetailRoutesPage(repo: repo, range: range, refreshKey: refreshKey, onCreate: createRoute),
      RetailReferencesPage(repo: repo, refreshKey: refreshKey),
      _SettingsPage(demo: widget.demo),
    ];
    final wide = MediaQuery.sizeOf(context).width >= 920;

    final content = Column(
      children: [
        _TopBar(range: range, onPickRange: pickRange, onCreate: createRoute),
        Expanded(child: pages[index]),
      ],
    );

    if (wide) {
      return Scaffold(
        body: SafeArea(
          child: Row(
            children: [
              NavigationRail(
                selectedIndex: index,
                onDestinationSelected: (value) => setState(() => index = value),
                labelType: NavigationRailLabelType.all,
                leading: const Padding(
                  padding: EdgeInsets.only(top: 12, bottom: 22),
                  child: _BrandMark(size: 46),
                ),
                destinations: const [
                  NavigationRailDestination(icon: Icon(Icons.space_dashboard_outlined), selectedIcon: Icon(Icons.space_dashboard), label: Text('Огляд')),
                  NavigationRailDestination(icon: Icon(Icons.route_outlined), selectedIcon: Icon(Icons.route), label: Text('Маршрути')),
                  NavigationRailDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: Text('Довідники')),
                  NavigationRailDestination(icon: Icon(Icons.tune_outlined), selectedIcon: Icon(Icons.tune), label: Text('Налаштування')),
                ],
              ),
              const VerticalDivider(width: 1),
              Expanded(child: content),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(child: content),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.space_dashboard_outlined), selectedIcon: Icon(Icons.space_dashboard), label: 'Огляд'),
          NavigationDestination(icon: Icon(Icons.route_outlined), selectedIcon: Icon(Icons.route), label: 'Маршрути'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Довідники'),
          NavigationDestination(icon: Icon(Icons.tune_outlined), selectedIcon: Icon(Icons.tune), label: 'Ще'),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.range, required this.onPickRange, required this.onCreate});
  final DateTimeRange range;
  final VoidCallback onPickRange;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final same = DateUtils.isSameDay(range.start, range.end);
    final label = same
        ? DateFormat('dd.MM.yyyy').format(range.start)
        : '${DateFormat('dd.MM').format(range.start)} — ${DateFormat('dd.MM.yyyy').format(range.end)}';
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 18),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _line))),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Transport Control', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -.3)),
                SizedBox(height: 2),
                Text('Retail', style: TextStyle(color: _textMuted, fontSize: 12)),
              ],
            ),
          ),
          TextButton.icon(onPressed: onPickRange, icon: const Icon(Icons.calendar_today_outlined, size: 17), label: Text(label)),
          const SizedBox(width: 8),
          FilledButton.icon(onPressed: onCreate, icon: const Icon(Icons.add, size: 18), label: const Text('Маршрут')),
        ],
      ),
    );
  }
}

class RetailDashboard extends StatelessWidget {
  const RetailDashboard({required this.repo, required this.range, required this.refreshKey, required this.onCreate, super.key});
  final RetailRepository repo;
  final DateTimeRange range;
  final int refreshKey;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<RetailRoute>>(
      key: ValueKey(refreshKey),
      future: repo.loadRoutes(range),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (snapshot.hasError) return _ErrorState(message: '${snapshot.error}');
        final routes = snapshot.data ?? const <RetailRoute>[];
        final tt = routes.fold<int>(0, (s, x) => s + x.tt);
        final pallets = routes.fold<double>(0, (s, x) => s + x.pallets);
        final weight = routes.fold<double>(0, (s, x) => s + x.weightKg);
        final spend = routes.fold<double>(0, (s, x) => s + (x.tariff ?? 0));
        final missing = routes.where((x) => x.tariff == null || x.vehicle == null || x.driver == null || x.driver!.trim().isEmpty).length;
        final avgLoadValues = routes.map((x) => x.loadPercent).where((x) => x > 0).toList();
        final avgLoad = avgLoadValues.isEmpty ? 0 : avgLoadValues.reduce((a, b) => a + b) / avgLoadValues.length;
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const _SectionTitle(title: 'Операційний огляд', subtitle: 'Фактичні маршрути Retail за обраний період'),
            const SizedBox(height: 18),
            LayoutBuilder(builder: (context, box) {
              final cols = box.maxWidth >= 1100 ? 4 : box.maxWidth >= 620 ? 2 : 1;
              return GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: cols,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: cols == 1 ? 2.8 : 1.95,
                children: [
                  _Kpi(label: 'Маршрути', value: '${routes.length}', note: '$tt ТТ', icon: Icons.route_outlined),
                  _Kpi(label: 'Палети', value: _num(pallets), note: '${_num(weight)} кг', icon: Icons.view_in_ar_outlined),
                  _Kpi(label: 'Витрати', value: '${_money(spend)} грн', note: tt == 0 ? '—' : '${_money(spend / tt)} грн / ТТ', icon: Icons.account_balance_wallet_outlined),
                  _Kpi(label: 'Середнє завантаження', value: '${_num(avgLoad)}%', note: '${routes.where((x) => x.loadPercent > 100).length} перевантажень', icon: Icons.local_shipping_outlined),
                ],
              );
            }),
            const SizedBox(height: 22),
            _AttentionCard(missing: missing, noTariff: routes.where((x) => x.tariff == null).length, overload: routes.where((x) => x.loadPercent > 100).length),
            const SizedBox(height: 22),
            Row(
              children: [
                const Expanded(child: _SectionTitle(title: 'Останні маршрути', subtitle: 'Швидкий контроль внесених рейсів')),
                if (routes.isEmpty) TextButton(onPressed: onCreate, child: const Text('Створити перший')),
              ],
            ),
            const SizedBox(height: 12),
            if (routes.isEmpty)
              _EmptyState(onCreate: onCreate)
            else
              ...routes.take(6).map((route) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _RouteCard(route: route),
                  )),
          ],
        );
      },
    );
  }
}

class RetailRoutesPage extends StatelessWidget {
  const RetailRoutesPage({required this.repo, required this.range, required this.refreshKey, required this.onCreate, super.key});
  final RetailRepository repo;
  final DateTimeRange range;
  final int refreshKey;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<RetailRoute>>(
      key: ValueKey('routes-$refreshKey'),
      future: repo.loadRoutes(range),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (snapshot.hasError) return _ErrorState(message: '${snapshot.error}');
        final routes = snapshot.data ?? const <RetailRoute>[];
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _SectionTitle(title: 'Реєстр маршрутів', subtitle: '${routes.length} записів у вибраному періоді'),
            const SizedBox(height: 16),
            if (routes.isEmpty) _EmptyState(onCreate: onCreate),
            ...routes.map((x) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _RouteCard(route: x, detailed: true))),
          ],
        );
      },
    );
  }
}

class RetailReferencesPage extends StatelessWidget {
  const RetailReferencesPage({required this.repo, required this.refreshKey, super.key});
  final RetailRepository repo;
  final int refreshKey;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      key: ValueKey('refs-$refreshKey'),
      future: Future.wait([repo.loadStores(), repo.loadVehicles()]),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
        if (snapshot.hasError) return _ErrorState(message: '${snapshot.error}');
        final stores = (snapshot.data?[0] as List<RetailStore>?) ?? const [];
        final vehicles = (snapshot.data?[1] as List<RetailVehicle>?) ?? const [];
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const _SectionTitle(title: 'Довідники Retail', subtitle: 'База для стандартизованого введення без вільного тексту'),
            const SizedBox(height: 18),
            _ReferenceSummary(icon: Icons.storefront_outlined, title: 'Торгові точки', count: stores.length, sample: stores.take(4).map((x) => x.name).join(' · ')),
            const SizedBox(height: 12),
            _ReferenceSummary(icon: Icons.local_shipping_outlined, title: 'Автомобілі', count: vehicles.length, sample: vehicles.take(4).map((x) => x.plate).join(' · ')),
          ],
        );
      },
    );
  }
}

class _SettingsPage extends StatelessWidget {
  const _SettingsPage({required this.demo});
  final bool demo;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const _SectionTitle(title: 'Система', subtitle: 'Transport Control · Retail v1'),
        const SizedBox(height: 18),
        Card(
          child: Column(
            children: [
              const ListTile(leading: Icon(Icons.dark_mode_outlined), title: Text('Візуальний стиль'), subtitle: Text('Темний графіт · стриманий корпоративний інтерфейс')),
              const Divider(height: 1),
              ListTile(leading: const Icon(Icons.cloud_outlined), title: const Text('Режим даних'), subtitle: Text(demo ? 'Demo' : 'Supabase production')),
              if (!demo) ...[
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.logout),
                  title: const Text('Вийти'),
                  onTap: () => Supabase.instance.client.auth.signOut(),
                ),
              ]
            ],
          ),
        ),
      ],
    );
  }
}

class CreateRetailRoutePage extends StatefulWidget {
  const CreateRetailRoutePage({required this.repo, super.key});
  final RetailRepository repo;

  @override
  State<CreateRetailRoutePage> createState() => _CreateRetailRoutePageState();
}

class _CreateRetailRoutePageState extends State<CreateRetailRoutePage> {
  DateTime date = DateUtils.dateOnly(DateTime.now());
  String warehouse = 'Чайка';
  String? temperature = 'Сухий';
  RetailVehicle? vehicle;
  final driver = TextEditingController();
  final routeNo = TextEditingController();
  final tariff = TextEditingController();
  final comment = TextEditingController();
  final points = <RetailPoint>[];
  bool busy = false;
  late Future<List<RetailStore>> storesFuture;
  late Future<List<RetailVehicle>> vehiclesFuture;

  @override
  void initState() {
    super.initState();
    storesFuture = widget.repo.loadStores();
    vehiclesFuture = widget.repo.loadVehicles();
  }

  @override
  void dispose() {
    driver.dispose();
    routeNo.dispose();
    tariff.dispose();
    comment.dispose();
    super.dispose();
  }

  double get totalPallets => points.fold(0, (s, p) => s + p.pallets);
  double get totalWeight => points.fold(0, (s, p) => s + p.weightKg);

  Future<void> addPoint(List<RetailStore> stores) async {
    final point = await showDialog<RetailPoint>(
      context: context,
      builder: (_) => _PointDialog(stores: stores),
    );
    if (point != null && mounted) setState(() => points.add(point));
  }

  Future<void> save() async {
    if (points.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Додайте щонайменше одну ТТ')));
      return;
    }
    if (vehicle == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Оберіть автомобіль')));
      return;
    }
    if (driver.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Вкажіть водія')));
      return;
    }
    final parsedTariff = double.tryParse(tariff.text.replaceAll(',', '.').replaceAll(' ', ''));
    setState(() => busy = true);
    try {
      await widget.repo.createRoute(
        date: date,
        warehouse: warehouse,
        temperature: temperature,
        vehicle: vehicle,
        driver: driver.text,
        routeNo: routeNo.text,
        tariff: parsedTariff,
        comment: comment.text,
        points: points,
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Не вдалося зберегти маршрут: $e')));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Новий маршрут Retail'),
        actions: [TextButton(onPressed: busy ? null : save, child: const Text('Зберегти'))],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: Future.wait([storesFuture, vehiclesFuture]),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snapshot.hasError) return _ErrorState(message: '${snapshot.error}');
          final stores = snapshot.data![0] as List<RetailStore>;
          final vehicles = snapshot.data![1] as List<RetailVehicle>;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 34),
            children: [
              const _SectionTitle(title: 'Основні дані', subtitle: 'Фіксуємо вже сформований фактичний маршрут'),
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _FieldBox(
                    width: 260,
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12),
                      title: const Text('Дата', style: TextStyle(color: _textMuted, fontSize: 12)),
                      subtitle: Text(DateFormat('dd.MM.yyyy').format(date), style: const TextStyle(fontWeight: FontWeight.w700)),
                      trailing: const Icon(Icons.calendar_month_outlined),
                      onTap: () async {
                        final x = await showDatePicker(context: context, firstDate: DateTime(2025), lastDate: DateTime(2035), initialDate: date);
                        if (x != null && mounted) setState(() => date = x);
                      },
                    ),
                  ),
                  SizedBox(
                    width: 260,
                    child: DropdownButtonFormField<String>(
                      value: warehouse,
                      decoration: const InputDecoration(labelText: 'Склад'),
                      items: const ['Чайка', 'Розумовського', 'Малехів'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
                      onChanged: (x) => setState(() => warehouse = x ?? warehouse),
                    ),
                  ),
                  SizedBox(
                    width: 220,
                    child: DropdownButtonFormField<String>(
                      value: temperature,
                      decoration: const InputDecoration(labelText: 'Температура'),
                      items: const ['Сухий', 'FRESH', 'ОЗ', 'Мультитемп'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
                      onChanged: (x) => setState(() => temperature = x),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  const Expanded(child: _SectionTitle(title: 'Точки маршруту', subtitle: 'ТТ, палети та фактична вага')),
                  OutlinedButton.icon(onPressed: () => addPoint(stores), icon: const Icon(Icons.add), label: const Text('Додати ТТ')),
                ],
              ),
              const SizedBox(height: 12),
              if (points.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      children: [
                        const Icon(Icons.add_location_alt_outlined, color: _textMuted, size: 32),
                        const SizedBox(height: 8),
                        const Text('Точки ще не додані', style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 3),
                        const Text('Додайте фактичні ТТ цього рейсу', style: TextStyle(color: _textMuted)),
                        const SizedBox(height: 12),
                        TextButton.icon(onPressed: () => addPoint(stores), icon: const Icon(Icons.add), label: const Text('Додати ТТ')),
                      ],
                    ),
                  ),
                )
              else
                Card(
                  child: Column(
                    children: [
                      for (var i = 0; i < points.length; i++) ...[
                        ListTile(
                          leading: CircleAvatar(backgroundColor: _surface2, foregroundColor: _accent, child: Text('${i + 1}')),
                          title: Text(points[i].store.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('${_num(points[i].pallets)} пал · ${_num(points[i].weightKg)} кг'),
                          trailing: IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => points.removeAt(i))),
                        ),
                        if (i < points.length - 1) const Divider(height: 1),
                      ],
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              _TotalsStrip(tt: points.length, pallets: totalPallets, weight: totalWeight, vehicle: vehicle),
              const SizedBox(height: 22),
              const _SectionTitle(title: 'Транспорт', subtitle: 'Авто визначає перевізника та норматив завантаження'),
              const SizedBox(height: 14),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  SizedBox(
                    width: 320,
                    child: DropdownButtonFormField<RetailVehicle>(
                      value: vehicle,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Автомобіль'),
                      items: vehicles.map((x) => DropdownMenuItem(value: x, child: Text('${x.plate} · ${x.carrier ?? 'без перевізника'}', overflow: TextOverflow.ellipsis))).toList(),
                      onChanged: (x) => setState(() => vehicle = x),
                    ),
                  ),
                  SizedBox(width: 280, child: TextField(controller: driver, decoration: const InputDecoration(labelText: 'Водій'))),
                  SizedBox(width: 220, child: TextField(controller: routeNo, decoration: const InputDecoration(labelText: '№ маршруту'))),
                  SizedBox(
                    width: 220,
                    child: TextField(
                      controller: tariff,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Тариф, грн'),
                    ),
                  ),
                ],
              ),
              if (vehicle != null) ...[
                const SizedBox(height: 12),
                Text('Перевізник: ${vehicle!.carrier ?? '—'} · місткість: ${_num(vehicle!.palletCapacity ?? 0)} пал · до ${_num(vehicle!.maxWeightKg ?? 0)} кг', style: const TextStyle(color: _textMuted)),
              ],
              const SizedBox(height: 18),
              TextField(controller: comment, maxLines: 3, decoration: const InputDecoration(labelText: 'Коментар', alignLabelWithHint: true)),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: busy ? null : save,
                icon: busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.check),
                label: const Text('Зберегти маршрут'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PointDialog extends StatefulWidget {
  const _PointDialog({required this.stores});
  final List<RetailStore> stores;

  @override
  State<_PointDialog> createState() => _PointDialogState();
}

class _PointDialogState extends State<_PointDialog> {
  RetailStore? store;
  final pallets = TextEditingController();
  final weight = TextEditingController();
  final note = TextEditingController();

  @override
  void dispose() {
    pallets.dispose();
    weight.dispose();
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Додати ТТ'),
      content: SizedBox(
        width: 440,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<RetailStore>(
              value: store,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Торгова точка'),
              items: widget.stores.map((x) => DropdownMenuItem(value: x, child: Text(x.name, overflow: TextOverflow.ellipsis))).toList(),
              onChanged: (x) => setState(() => store = x),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: TextField(controller: pallets, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Палети'))),
                const SizedBox(width: 12),
                Expanded(child: TextField(controller: weight, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Вага, кг'))),
              ],
            ),
            const SizedBox(height: 12),
            TextField(controller: note, decoration: const InputDecoration(labelText: 'Примітка')),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Скасувати')),
        FilledButton(
          onPressed: () {
            final p = double.tryParse(pallets.text.replaceAll(',', '.')) ?? 0;
            final w = double.tryParse(weight.text.replaceAll(',', '.')) ?? 0;
            if (store == null || p <= 0) return;
            Navigator.pop(context, RetailPoint(store: store!, pallets: p, weightKg: w, note: note.text));
          },
          child: const Text('Додати'),
        ),
      ],
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.label, required this.value, required this.note, required this.icon});
  final String label;
  final String value;
  final String note;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(children: [Icon(icon, size: 18, color: _accent), const Spacer(), Text(label, style: const TextStyle(color: _textMuted, fontSize: 12))]),
            Text(value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.7)),
            Text(note, style: const TextStyle(color: _textMuted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _AttentionCard extends StatelessWidget {
  const _AttentionCard({required this.missing, required this.noTariff, required this.overload});
  final int missing;
  final int noTariff;
  final int overload;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Потребують уваги', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _Signal(label: 'Неповні дані', value: missing, color: missing > 0 ? _bad : _good),
                _Signal(label: 'Без тарифу', value: noTariff, color: noTariff > 0 ? _warn : _good),
                _Signal(label: 'Перевантаження', value: overload, color: overload > 0 ? _bad : _good),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Signal extends StatelessWidget {
  const _Signal({required this.label, required this.value, required this.color});
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: .08), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: .25))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)), const SizedBox(width: 8), Text('$label · $value', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12))]),
    );
  }
}

class _RouteCard extends StatelessWidget {
  const _RouteCard({required this.route, this.detailed = false});
  final RetailRoute route;
  final bool detailed;

  @override
  Widget build(BuildContext context) {
    final hasIssue = route.tariff == null || route.vehicle == null || route.driver == null || route.driver!.trim().isEmpty;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(width: 4, height: 48, decoration: BoxDecoration(color: hasIssue ? _warn : _good, borderRadius: BorderRadius.circular(4))),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(route.routeNo?.isNotEmpty == true ? route.routeNo! : 'Маршрут #${route.id}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      const SizedBox(height: 4),
                      Text('${DateFormat('dd.MM').format(route.routeDate)} · ${route.warehouse} · ${route.vehicle?.plate ?? 'авто не вказано'}', style: const TextStyle(color: _textMuted, fontSize: 12)),
                    ],
                  ),
                ),
                _StatusPill(hasIssue: hasIssue),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _Mini(label: 'ТТ', value: '${route.tt}'),
                _Mini(label: 'Палети', value: _num(route.pallets)),
                _Mini(label: 'Вага', value: '${_num(route.weightKg)} кг'),
                _Mini(label: 'Тариф', value: route.tariff == null ? '—' : '${_money(route.tariff!)} грн'),
                if (MediaQuery.sizeOf(context).width > 720) _Mini(label: 'Завантаження', value: route.loadPercent == 0 ? '—' : '${_num(route.loadPercent)}%'),
              ],
            ),
            if (detailed && route.points.isNotEmpty) ...[
              const SizedBox(height: 13),
              const Divider(height: 1),
              const SizedBox(height: 11),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(route.points.map((x) => x.store.name).join('  →  '), style: const TextStyle(color: _textMuted, fontSize: 12)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.hasIssue});
  final bool hasIssue;

  @override
  Widget build(BuildContext context) {
    final color = hasIssue ? _warn : _good;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withValues(alpha: .09), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withValues(alpha: .25))),
      child: Text(hasIssue ? 'Уточнити' : 'Заповнено', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 11)),
    );
  }
}

class _Mini extends StatelessWidget {
  const _Mini({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: _textMuted, fontSize: 10)),
          const SizedBox(height: 3),
          Text(value, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
        ],
      ),
    );
  }
}

class _TotalsStrip extends StatelessWidget {
  const _TotalsStrip({required this.tt, required this.pallets, required this.weight, required this.vehicle});
  final int tt;
  final double pallets;
  final double weight;
  final RetailVehicle? vehicle;

  @override
  Widget build(BuildContext context) {
    final capacity = vehicle?.palletCapacity ?? 0;
    final load = capacity <= 0 ? 0 : pallets / capacity * 100;
    final overload = load > 100;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: _surface2, borderRadius: BorderRadius.circular(14), border: Border.all(color: overload ? _bad.withValues(alpha: .6) : _line)),
      child: Wrap(
        spacing: 22,
        runSpacing: 8,
        children: [
          Text('$tt ТТ', style: const TextStyle(fontWeight: FontWeight.w800)),
          Text('${_num(pallets)} пал', style: const TextStyle(fontWeight: FontWeight.w800)),
          Text('${_num(weight)} кг', style: const TextStyle(fontWeight: FontWeight.w800)),
          if (capacity > 0) Text('Завантаження ${_num(load)}%', style: TextStyle(fontWeight: FontWeight.w800, color: overload ? _bad : _good)),
        ],
      ),
    );
  }
}

class _ReferenceSummary extends StatelessWidget {
  const _ReferenceSummary({required this.icon, required this.title, required this.count, required this.sample});
  final IconData icon;
  final String title;
  final int count;
  final String sample;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(width: 46, height: 46, decoration: BoxDecoration(color: _surface2, borderRadius: BorderRadius.circular(13)), child: Icon(icon, color: _accent)),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 4), Text(sample.isEmpty ? 'Немає записів' : sample, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _textMuted, fontSize: 12))])),
            Text('$count', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class _FieldBox extends StatelessWidget {
  const _FieldBox({required this.width, required this.child});
  final double width;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(width: width, decoration: BoxDecoration(color: _surface2, borderRadius: BorderRadius.circular(14), border: Border.all(color: _line)), child: child);
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -.4)),
        const SizedBox(height: 3),
        Text(subtitle, style: const TextStyle(color: _textMuted, fontSize: 12)),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onCreate});
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 38, horizontal: 20),
        child: Column(
          children: [
            const Icon(Icons.route_outlined, size: 38, color: _textMuted),
            const SizedBox(height: 10),
            const Text('Маршрутів за цей період немає', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 5),
            const Text('Створіть перший фактичний маршрут Retail', style: TextStyle(color: _textMuted)),
            const SizedBox(height: 14),
            FilledButton.icon(onPressed: onCreate, icon: const Icon(Icons.add), label: const Text('Новий маршрут')),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 38, color: _bad),
            const SizedBox(height: 10),
            const Text('Не вдалося завантажити дані', style: TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: _textMuted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

String _num(num value) {
  final d = value.toDouble();
  if ((d - d.round()).abs() < .001) return NumberFormat('#,##0', 'uk_UA').format(d);
  return NumberFormat('#,##0.0', 'uk_UA').format(d);
}

String _money(num value) => NumberFormat('#,##0', 'uk_UA').format(value);
