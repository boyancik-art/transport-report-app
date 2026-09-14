import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

const bg = Color(0xFF0A0D12);
const panel = Color(0xFF121720);
const panel2 = Color(0xFF181E28);
const border = Color(0xFF29313D);
const textMuted = Color(0xFF97A2B3);
const accent = Color(0xFF7CA7FF);
const good = Color(0xFF5FC38D);
const warn = Color(0xFFF0B65A);
const bad = Color(0xFFEF7777);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  runApp(const RetailShipmentsApp());
}

class RetailShipmentsApp extends StatelessWidget {
  const RetailShipmentsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Retail Shipments',
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: bg,
        colorScheme: ColorScheme.fromSeed(seedColor: accent, brightness: Brightness.dark, surface: panel),
        cardTheme: const CardThemeData(
          color: panel,
          margin: EdgeInsets.zero,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(18)),
            side: BorderSide(color: border),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: panel2,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: accent)),
        ),
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
  StreamSubscription<AuthState>? sub;
  Session? session;

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
  Widget build(BuildContext context) => session == null ? const LoginPage() : const HomePage();
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  String? error;

  Future<void> login() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) return;
    setState(() { loading = true; error = null; });
    try {
      await Supabase.instance.client.auth.signInWithPassword(email: email.text.trim(), password: password.text);
    } on AuthException catch (e) {
      setState(() => error = e.message);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SizedBox(
          width: 420,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Icon(Icons.local_shipping_rounded, size: 54, color: accent),
                const SizedBox(height: 18),
                const Text('Retail Shipments', textAlign: TextAlign.center, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                const Text('WT · онлайн-контроль маршрутів', textAlign: TextAlign.center, style: TextStyle(color: textMuted)),
                const SizedBox(height: 26),
                TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Пароль'), onSubmitted: (_) => login()),
                if (error != null) ...[const SizedBox(height: 10), Text(error!, style: const TextStyle(color: bad))],
                const SizedBox(height: 18),
                FilledButton(onPressed: loading ? null : login, child: Text(loading ? 'Вхід…' : 'Увійти')),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class Store {
  Store({required this.id, required this.name, required this.city, required this.address, required this.kind});
  final int id;
  final String name;
  final String city;
  final String address;
  final String kind;

  factory Store.fromJson(Map<String, dynamic> x) => Store(
    id: (x['id'] as num).toInt(),
    name: '${x['name'] ?? ''}',
    city: '${x['city'] ?? ''}',
    address: '${x['address'] ?? ''}',
    kind: '${x['location_kind'] ?? 'store'}',
  );
}

class Vehicle {
  Vehicle({required this.id, required this.plate, required this.carrier});
  final int id;
  final String plate;
  final String carrier;
  factory Vehicle.fromJson(Map<String, dynamic> x) => Vehicle(
    id: (x['id'] as num).toInt(),
    plate: '${x['plate'] ?? ''}',
    carrier: '${x['carrier'] ?? ''}',
  );
}

class RoutePoint {
  RoutePoint({required this.store, required this.pallets, this.plannedArrival});
  final Store store;
  final double pallets;
  final DateTime? plannedArrival;
}

class RouteItem {
  RouteItem({
    required this.id,
    required this.date,
    required this.routeType,
    required this.warehouse,
    required this.status,
    required this.points,
    this.temperature,
    this.responsible,
    this.carrier,
    this.vehicle,
    this.plannedDeparture,
    this.actualDeparture,
    this.plannedFinish,
    this.actualFinish,
    this.issueReason,
  });
  final int id;
  final DateTime date;
  final String routeType;
  final String warehouse;
  final String status;
  final String? temperature;
  final String? responsible;
  final String? carrier;
  final Vehicle? vehicle;
  final DateTime? plannedDeparture;
  final DateTime? actualDeparture;
  final DateTime? plannedFinish;
  final DateTime? actualFinish;
  final String? issueReason;
  final List<RoutePoint> points;

  int get tt => points.length;
  double get pallets => points.fold(0, (sum, p) => sum + p.pallets);

  factory RouteItem.fromJson(Map<String, dynamic> x) {
    Vehicle? vehicle;
    if (x['tc_retail_vehicles'] is Map) vehicle = Vehicle.fromJson(Map<String, dynamic>.from(x['tc_retail_vehicles'] as Map));
    final points = <RoutePoint>[];
    final rawPoints = (x['tc_retail_route_points'] as List? ?? const []);
    for (final raw in rawPoints) {
      final row = Map<String, dynamic>.from(raw as Map);
      if (row['tc_retail_stores'] is! Map) continue;
      points.add(RoutePoint(
        store: Store.fromJson(Map<String, dynamic>.from(row['tc_retail_stores'] as Map)),
        pallets: (row['pallets'] as num? ?? 0).toDouble(),
        plannedArrival: DateTime.tryParse('${row['planned_arrival_at'] ?? ''}'),
      ));
    }
    return RouteItem(
      id: (x['id'] as num).toInt(),
      date: DateTime.parse('${x['route_date']}'),
      routeType: '${x['route_type'] ?? 'retail'}',
      warehouse: '${x['warehouse'] ?? ''}',
      status: '${x['status'] ?? 'planned'}',
      temperature: x['temperature']?.toString(),
      responsible: x['responsible_name']?.toString(),
      carrier: x['carrier']?.toString(),
      vehicle: vehicle,
      plannedDeparture: DateTime.tryParse('${x['planned_departure_at'] ?? ''}'),
      actualDeparture: DateTime.tryParse('${x['actual_departure_at'] ?? ''}'),
      plannedFinish: DateTime.tryParse('${x['planned_finish_at'] ?? ''}'),
      actualFinish: DateTime.tryParse('${x['actual_finish_at'] ?? ''}'),
      issueReason: x['issue_reason']?.toString(),
      points: points,
    );
  }
}

class RetailRepo {
  SupabaseClient get db => Supabase.instance.client;

  Future<List<Store>> stores() async {
    final data = await db.from('tc_retail_stores')
        .select('id,name,city,address,location_kind')
        .eq('is_active', true)
        .eq('location_kind', 'store')
        .order('city')
        .order('name');
    return (data as List).map((x) => Store.fromJson(Map<String, dynamic>.from(x as Map))).toList();
  }

  Future<List<Vehicle>> vehicles() async {
    final data = await db.from('tc_retail_vehicles').select('id,plate,carrier').eq('is_active', true).order('plate');
    return (data as List).map((x) => Vehicle.fromJson(Map<String, dynamic>.from(x as Map))).toList();
  }

  Future<List<RouteItem>> routes(DateTime from, DateTime to) async {
    final f = DateFormat('yyyy-MM-dd').format(from);
    final t = DateFormat('yyyy-MM-dd').format(to);
    final data = await db.from('tc_retail_routes').select(
      'id,route_date,route_type,warehouse,temperature,responsible_name,carrier,status,planned_departure_at,actual_departure_at,planned_finish_at,actual_finish_at,issue_reason,'
      'tc_retail_vehicles(id,plate,carrier),'
      'tc_retail_route_points(pallets,planned_arrival_at,sort_order,tc_retail_stores(id,name,city,address,location_kind))'
    ).gte('route_date', f).lte('route_date', t).neq('status', 'cancelled').order('route_date').order('created_at');
    return (data as List).map((x) => RouteItem.fromJson(Map<String, dynamic>.from(x as Map))).toList();
  }

  Future<void> createRoute({
    required DateTime date,
    required String routeType,
    required String warehouse,
    required String temperature,
    required String responsible,
    Vehicle? vehicle,
    required DateTime plannedDeparture,
    required DateTime? plannedFinish,
    required List<RoutePointDraft> points,
    required String comment,
  }) async {
    final userId = db.auth.currentUser!.id;
    final inserted = await db.from('tc_retail_routes').insert({
      'route_date': DateFormat('yyyy-MM-dd').format(date),
      'route_type': routeType,
      'warehouse': warehouse,
      'temperature': temperature,
      'responsible_name': responsible.trim().isEmpty ? null : responsible.trim(),
      'vehicle_id': vehicle?.id,
      'carrier': vehicle?.carrier,
      'planned_departure_at': plannedDeparture.toIso8601String(),
      'planned_finish_at': plannedFinish?.toIso8601String(),
      'comment': comment.trim().isEmpty ? null : comment.trim(),
      'status': 'planned',
      'created_by': userId,
      'updated_at': DateTime.now().toIso8601String(),
    }).select('id').single();
    final routeId = (inserted['id'] as num).toInt();
    if (points.isNotEmpty) {
      await db.from('tc_retail_route_points').insert([
        for (var i = 0; i < points.length; i++) {
          'route_id': routeId,
          'store_id': points[i].store.id,
          'pallets': points[i].pallets,
          'weight_kg': 0,
          'sort_order': i + 1,
          'planned_arrival_at': points[i].plannedArrival?.toIso8601String(),
          'point_status': 'planned',
        }
      ]);
    }
  }

  Future<void> markDeparted(RouteItem route) async {
    await db.from('tc_retail_routes').update({
      'status': 'in_transit',
      'actual_departure_at': DateTime.now().toIso8601String(),
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', route.id);
  }

  Future<void> markDelivered(RouteItem route) async {
    await db.from('tc_retail_routes').update({
      'status': 'delivered',
      'actual_finish_at': DateTime.now().toIso8601String(),
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', route.id);
  }
}

class RoutePointDraft {
  RoutePointDraft(this.store, {this.pallets = 0, this.plannedArrival});
  final Store store;
  double pallets;
  DateTime? plannedArrival;
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final repo = RetailRepo();
  DateTime selectedDate = DateUtils.dateOnly(DateTime.now());
  int refreshKey = 0;

  Future<void> createRoute() async {
    final saved = await showDialog<bool>(context: context, barrierDismissible: false, builder: (_) => CreateRouteDialog(repo: repo, initialDate: selectedDate));
    if (saved == true && mounted) setState(() => refreshKey++);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          Container(
            height: 74,
            padding: const EdgeInsets.symmetric(horizontal: 22),
            decoration: const BoxDecoration(color: panel, border: Border(bottom: BorderSide(color: border))),
            child: Row(children: [
              const Icon(Icons.local_shipping_rounded, color: accent),
              const SizedBox(width: 12),
              const Text('Retail Shipments', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const Spacer(),
              IconButton(onPressed: () async {
                final d = await showDatePicker(context: context, initialDate: selectedDate, firstDate: DateTime(2025), lastDate: DateTime(2035));
                if (d != null) setState(() => selectedDate = d);
              }, icon: const Icon(Icons.calendar_month)),
              Text(DateFormat('dd.MM.yyyy').format(selectedDate)),
              const SizedBox(width: 16),
              FilledButton.icon(onPressed: createRoute, icon: const Icon(Icons.add), label: const Text('Новий маршрут')),
              const SizedBox(width: 8),
              IconButton(onPressed: () => Supabase.instance.client.auth.signOut(), icon: const Icon(Icons.logout)),
            ]),
          ),
          Expanded(child: FutureBuilder<List<RouteItem>>(
            key: ValueKey('$refreshKey-$selectedDate'),
            future: repo.routes(selectedDate, selectedDate),
            builder: (context, snap) {
              if (!snap.hasData) return const Center(child: CircularProgressIndicator());
              if (snap.hasError) return Center(child: Text('Помилка: ${snap.error}'));
              final routes = snap.data!;
              return Dashboard(routes: routes, repo: repo, onChanged: () => setState(() => refreshKey++));
            },
          )),
        ]),
      ),
    );
  }
}

class Dashboard extends StatelessWidget {
  const Dashboard({required this.routes, required this.repo, required this.onChanged, super.key});
  final List<RouteItem> routes;
  final RetailRepo repo;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final tt = routes.fold<int>(0, (s, r) => s + r.tt);
    final pallets = routes.fold<double>(0, (s, r) => s + r.pallets);
    final inTransit = routes.where((r) => r.status == 'in_transit').length;
    final delivered = routes.where((r) => r.status == 'delivered').length;
    final cold = routes.where((r) => r.routeType == 'cold').length;
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 900;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Wrap(spacing: 12, runSpacing: 12, children: [
          Kpi(title: 'Маршрути', value: '${routes.length}', icon: Icons.route),
          Kpi(title: 'ТТ', value: '$tt', icon: Icons.storefront),
          Kpi(title: 'Палети', value: pallets.toStringAsFixed(1), icon: Icons.inventory_2_outlined),
          Kpi(title: 'В дорозі', value: '$inTransit', icon: Icons.local_shipping_outlined),
          Kpi(title: 'Доставлено', value: '$delivered', icon: Icons.task_alt, valueColor: good),
          Kpi(title: 'Холодний склад', value: '$cold', icon: Icons.ac_unit, valueColor: accent),
        ]),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Відвантаження', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              const Text('Корпоратура + маршрути холодного складу', style: TextStyle(color: textMuted)),
              const SizedBox(height: 16),
              if (routes.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 42), child: Center(child: Text('На цю дату маршрутів ще немає', style: TextStyle(color: textMuted))))
              else if (compact)
                ...routes.map((r) => RouteCard(route: r, repo: repo, onChanged: onChanged))
              else
                RouteTable(routes: routes, repo: repo, onChanged: onChanged),
            ]),
          ),
        ),
      ],
    );
  }
}

class Kpi extends StatelessWidget {
  const Kpi({required this.title, required this.value, required this.icon, this.valueColor, super.key});
  final String title;
  final String value;
  final IconData icon;
  final Color? valueColor;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 205,
    child: Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
      Container(width: 42, height: 42, decoration: BoxDecoration(color: panel2, borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: valueColor ?? accent)),
      const SizedBox(width: 12),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: valueColor)), Text(title, style: const TextStyle(color: textMuted))]),
    ]))),
  );
}

class RouteTable extends StatelessWidget {
  const RouteTable({required this.routes, required this.repo, required this.onChanged, super.key});
  final List<RouteItem> routes;
  final RetailRepo repo;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: DataTable(columns: const [
      DataColumn(label: Text('Тип')),
      DataColumn(label: Text('Склад')),
      DataColumn(label: Text('Маршрут')),
      DataColumn(label: Text('ТТ')),
      DataColumn(label: Text('Палети')),
      DataColumn(label: Text('План виїзду')),
      DataColumn(label: Text('Авто')),
      DataColumn(label: Text('Статус')),
      DataColumn(label: Text('Дії')),
    ], rows: [for (final r in routes) DataRow(cells: [
      DataCell(TypeBadge(type: r.routeType)),
      DataCell(Text(r.warehouse)),
      DataCell(SizedBox(width: 260, child: Text(r.points.map((p) => p.store.name.replaceFirst('WT ', '')).join(' → '), maxLines: 2, overflow: TextOverflow.ellipsis))),
      DataCell(Text('${r.tt}')),
      DataCell(Text(r.pallets.toStringAsFixed(1))),
      DataCell(Text(r.plannedDeparture == null ? '—' : DateFormat('HH:mm').format(r.plannedDeparture!.toLocal()))),
      DataCell(Text(r.vehicle?.plate ?? '—')),
      DataCell(StatusBadge(status: r.status)),
      DataCell(RouteActions(route: r, repo: repo, onChanged: onChanged)),
    ])]),
  );
}

class RouteCard extends StatelessWidget {
  const RouteCard({required this.route, required this.repo, required this.onChanged, super.key});
  final RouteItem route;
  final RetailRepo repo;
  final VoidCallback onChanged;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: panel2, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [TypeBadge(type: route.routeType), const SizedBox(width: 8), Expanded(child: Text(route.warehouse, style: const TextStyle(fontWeight: FontWeight.w700))), StatusBadge(status: route.status)]),
      const SizedBox(height: 10),
      Text(route.points.map((p) => p.store.name).join(' → ')),
      const SizedBox(height: 8),
      Text('${route.tt} ТТ · ${route.pallets.toStringAsFixed(1)} пал · ${route.vehicle?.plate ?? 'авто не вказано'}', style: const TextStyle(color: textMuted)),
      const SizedBox(height: 8),
      Align(alignment: Alignment.centerRight, child: RouteActions(route: route, repo: repo, onChanged: onChanged)),
    ]),
  );
}

class TypeBadge extends StatelessWidget {
  const TypeBadge({required this.type, super.key});
  final String type;
  @override
  Widget build(BuildContext context) => Chip(
    visualDensity: VisualDensity.compact,
    avatar: Icon(type == 'cold' ? Icons.ac_unit : Icons.storefront, size: 16),
    label: Text(type == 'cold' ? 'Холодний' : 'Retail'),
  );
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({required this.status, super.key});
  final String status;
  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'in_transit' => ('В дорозі', accent),
      'delivered' => ('Доставлено', good),
      'issue' => ('Проблема', bad),
      _ => ('Заплановано', warn),
    };
    return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: color.withValues(alpha: .13), borderRadius: BorderRadius.circular(99)), child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12)));
  }
}

class RouteActions extends StatelessWidget {
  const RouteActions({required this.route, required this.repo, required this.onChanged, super.key});
  final RouteItem route;
  final RetailRepo repo;
  final VoidCallback onChanged;
  @override
  Widget build(BuildContext context) => Wrap(spacing: 4, children: [
    if (route.status == 'planned') TextButton(onPressed: () async { await repo.markDeparted(route); onChanged(); }, child: const Text('Виїхав')),
    if (route.status == 'in_transit') TextButton(onPressed: () async { await repo.markDelivered(route); onChanged(); }, child: const Text('Доставлено')),
  ]);
}

class CreateRouteDialog extends StatefulWidget {
  const CreateRouteDialog({required this.repo, required this.initialDate, super.key});
  final RetailRepo repo;
  final DateTime initialDate;
  @override
  State<CreateRouteDialog> createState() => _CreateRouteDialogState();
}

class _CreateRouteDialogState extends State<CreateRouteDialog> {
  late DateTime date = widget.initialDate;
  String routeType = 'retail';
  String warehouse = 'Чайки';
  String temperature = 'Сухий';
  final responsible = TextEditingController();
  final comment = TextEditingController();
  TimeOfDay departure = const TimeOfDay(hour: 8, minute: 0);
  Vehicle? vehicle;
  List<Store> stores = [];
  List<Vehicle> vehicles = [];
  final points = <RoutePointDraft>[];
  bool loading = true;
  bool saving = false;

  @override
  void initState() {
    super.initState();
    Future.wait([widget.repo.stores(), widget.repo.vehicles()]).then((data) {
      if (!mounted) return;
      setState(() { stores = data[0] as List<Store>; vehicles = data[1] as List<Vehicle>; loading = false; });
    });
  }

  DateTime combine(DateTime d, TimeOfDay t) => DateTime(d.year, d.month, d.day, t.hour, t.minute);

  Future<void> addPoint() async {
    Store? selected;
    double pallets = 0;
    TimeOfDay arrival = const TimeOfDay(hour: 12, minute: 0);
    final ok = await showDialog<bool>(context: context, builder: (context) => StatefulBuilder(builder: (context, setLocal) => AlertDialog(
      title: const Text('Додати магазин'),
      content: SizedBox(width: 520, child: Column(mainAxisSize: MainAxisSize.min, children: [
        DropdownButtonFormField<Store>(isExpanded: true, decoration: const InputDecoration(labelText: 'WT'), items: [for (final s in stores) DropdownMenuItem(value: s, child: Text('${s.name} · ${s.city}', overflow: TextOverflow.ellipsis))], onChanged: (v) => setLocal(() => selected = v)),
        const SizedBox(height: 12),
        TextFormField(decoration: const InputDecoration(labelText: 'Палети'), keyboardType: TextInputType.number, onChanged: (v) => pallets = double.tryParse(v.replaceAll(',', '.')) ?? 0),
        const SizedBox(height: 12),
        ListTile(contentPadding: EdgeInsets.zero, title: const Text('План прибуття'), subtitle: Text(arrival.format(context)), trailing: const Icon(Icons.schedule), onTap: () async { final t = await showTimePicker(context: context, initialTime: arrival); if (t != null) setLocal(() => arrival = t); }),
      ])),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Скасувати')), FilledButton(onPressed: selected == null ? null : () => Navigator.pop(context, true), child: const Text('Додати'))],
    )));
    if (ok == true && selected != null) setState(() => points.add(RoutePointDraft(selected!, pallets: pallets, plannedArrival: combine(date, arrival))));
  }

  Future<void> save() async {
    if (points.isEmpty) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Додай хоча б один WT'))); return; }
    setState(() => saving = true);
    try {
      await widget.repo.createRoute(
        date: date,
        routeType: routeType,
        warehouse: warehouse,
        temperature: temperature,
        responsible: responsible.text,
        vehicle: vehicle,
        plannedDeparture: combine(date, departure),
        plannedFinish: points.map((p) => p.plannedArrival).whereType<DateTime>().fold<DateTime?>(null, (max, x) => max == null || x.isAfter(max) ? x : max),
        points: points,
        comment: comment.text,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Не вдалося зберегти: $e')));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const AlertDialog(content: SizedBox(width: 500, height: 220, child: Center(child: CircularProgressIndicator())));
    return AlertDialog(
      title: const Text('Новий маршрут'),
      content: SizedBox(width: 720, child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SegmentedButton<String>(segments: const [ButtonSegment(value: 'retail', label: Text('Retail'), icon: Icon(Icons.storefront)), ButtonSegment(value: 'cold', label: Text('Холодний склад'), icon: Icon(Icons.ac_unit))], selected: {routeType}, onSelectionChanged: (v) => setState(() { routeType = v.first; if (routeType == 'cold') { warehouse = 'Розумовського 27'; temperature = '+2…+5°C'; } })),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: DropdownButtonFormField<String>(value: warehouse, decoration: const InputDecoration(labelText: 'Склад'), items: const ['Чайки','Розумовського 27','Львів · Пасічна 127','Малехів · Тараса Дороша 20-а','Острів · Промислова 3'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(), onChanged: (v) => setState(() => warehouse = v!))),
          const SizedBox(width: 12),
          Expanded(child: DropdownButtonFormField<String>(value: temperature, decoration: const InputDecoration(labelText: 'Температура'), items: const ['Сухий','+2…+5°C','-18°C','Комбінований'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(), onChanged: (v) => setState(() => temperature = v!))),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: TextField(controller: responsible, decoration: const InputDecoration(labelText: 'Відповідальний'))),
          const SizedBox(width: 12),
          Expanded(child: DropdownButtonFormField<Vehicle>(value: vehicle, decoration: const InputDecoration(labelText: 'Авто'), isExpanded: true, items: [for (final v in vehicles) DropdownMenuItem(value: v, child: Text('${v.plate}${v.carrier.isEmpty ? '' : ' · ${v.carrier}'}', overflow: TextOverflow.ellipsis))], onChanged: (v) => setState(() => vehicle = v))),
        ]),
        const SizedBox(height: 12),
        ListTile(tileColor: panel2, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), title: const Text('План виїзду'), subtitle: Text('${DateFormat('dd.MM.yyyy').format(date)} · ${departure.format(context)}'), trailing: const Icon(Icons.schedule), onTap: () async { final t = await showTimePicker(context: context, initialTime: departure); if (t != null) setState(() => departure = t); }),
        const SizedBox(height: 18),
        Row(children: [const Expanded(child: Text('Точки маршруту', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800))), OutlinedButton.icon(onPressed: addPoint, icon: const Icon(Icons.add), label: const Text('Додати WT'))]),
        const SizedBox(height: 8),
        if (points.isEmpty) const Padding(padding: EdgeInsets.all(18), child: Text('Ще немає точок маршруту', style: TextStyle(color: textMuted)))
        else ...[for (var i = 0; i < points.length; i++) Container(
          margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: panel2, borderRadius: BorderRadius.circular(12), border: Border.all(color: border)),
          child: Row(children: [CircleAvatar(radius: 14, child: Text('${i + 1}')), const SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(points[i].store.name, style: const TextStyle(fontWeight: FontWeight.w700)), Text('${points[i].store.city}, ${points[i].store.address}', style: const TextStyle(color: textMuted, fontSize: 12))])), Text('${points[i].pallets.toStringAsFixed(1)} пал'), const SizedBox(width: 12), Text(points[i].plannedArrival == null ? '—' : DateFormat('HH:mm').format(points[i].plannedArrival!)), IconButton(onPressed: () => setState(() => points.removeAt(i)), icon: const Icon(Icons.close))]),
        )],
        const SizedBox(height: 12),
        TextField(controller: comment, minLines: 2, maxLines: 3, decoration: const InputDecoration(labelText: 'Коментар')),
      ]))),
      actions: [TextButton(onPressed: saving ? null : () => Navigator.pop(context, false), child: const Text('Скасувати')), FilledButton.icon(onPressed: saving ? null : save, icon: const Icon(Icons.save), label: Text(saving ? 'Збереження…' : 'Зберегти маршрут'))],
    );
  }
}
