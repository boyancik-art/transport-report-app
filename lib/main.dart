import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
bool get demoMode => supabaseUrl.isEmpty || supabaseAnonKey.isEmpty;

const brandBlue = Color(0xFF1677FF);
const darkBg = Color(0xFF0B1020);
const darkCard = Color(0xFF151C2F);

final appTheme = ThemeController();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await appTheme.load();
  if (!demoMode) {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  }
  runApp(const TransportReportApp());
}

class ThemeController extends ValueNotifier<ThemeMode> {
  ThemeController() : super(ThemeMode.dark);
  static const _storage = FlutterSecureStorage();

  Future<void> load() async {
    try {
      final saved = await _storage.read(key: 'theme_mode');
      value = saved == 'light' ? ThemeMode.light : ThemeMode.dark;
    } catch (_) {
      value = ThemeMode.dark;
    }
  }

  Future<void> toggle() async {
    value = value == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    try {
      await _storage.write(
        key: 'theme_mode',
        value: value == ThemeMode.light ? 'light' : 'dark',
      );
    } catch (_) {}
  }
}

ThemeData buildLightTheme() {
  final scheme = ColorScheme.fromSeed(seedColor: brandBlue);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: const Color(0xFFF6F8FC),
    cardTheme: const CardThemeData(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE1E6EF)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE1E6EF)),
      ),
    ),
  );
}

ThemeData buildDarkTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: brandBlue,
    brightness: Brightness.dark,
    surface: darkCard,
  );
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: darkBg,
    appBarTheme: const AppBarTheme(backgroundColor: darkBg),
    navigationBarTheme: const NavigationBarThemeData(backgroundColor: darkCard),
    cardTheme: const CardThemeData(
      elevation: 0,
      color: darkCard,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF11182A),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF26324A)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF26324A)),
      ),
    ),
  );
}

class TransportReportApp extends StatelessWidget {
  const TransportReportApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: appTheme,
      builder: (_, mode, __) => MaterialApp(
        title: 'Transport Report TS',
        debugShowCheckedModeBanner: false,
        themeMode: mode,
        theme: buildLightTheme(),
        darkTheme: buildDarkTheme(),
        home: demoMode ? const AppShell(demo: true) : const AuthGate(),
      ),
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
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const AppMark(size: 92),
                  const SizedBox(height: 22),
                  Text(
                    'Transport Report TS',
                    textAlign: TextAlign.center,
                    style: Theme.of(context)
                        .textTheme
                        .headlineMedium
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Система транспортної звітності',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
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
                    Text(error!, style: const TextStyle(color: Colors.redAccent)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: busy ? null : signIn,
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
                    child: busy
                        ? const SizedBox.square(
                            dimension: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
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

class AppMark extends StatelessWidget {
  const AppMark({this.size = 54, super.key});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(size * .23),
          boxShadow: const [BoxShadow(blurRadius: 20, color: Color(0x22000000))],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Text(
              'TS',
              style: TextStyle(
                color: brandBlue,
                fontSize: size * .38,
                fontWeight: FontWeight.w900,
                letterSpacing: -2,
              ),
            ),
            Positioned(
              bottom: size * .12,
              child: Icon(Icons.local_shipping_rounded,
                  size: size * .29, color: const Color(0xFF0D3B88)),
            ),
          ],
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
    this.deliveredPoints,
    this.departureTime,
    this.extraPoints = 0,
    this.vtPoints = 0,
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
  final int? deliveredPoints;
  final String? departureTime;
  final int extraPoints;
  final int vtPoints;

  int get totalActualPoints => points + extraPoints + vtPoints;
  double get averageCostPerPoint =>
      tariff == null || totalActualPoints == 0 ? 0 : tariff! / totalActualPoints;

  factory RouteModel.fromJson(Map<String, dynamic> r) {
    final facts = r['route_facts'];
    final f = facts is List && facts.isNotEmpty
        ? Map<String, dynamic>.from(facts.first as Map)
        : facts is Map
            ? Map<String, dynamic>.from(facts)
            : <String, dynamic>{};
    final extrasRaw = r['route_extra_points'];
    final extras = extrasRaw is List ? extrasRaw : const [];
    final extraTt = extras.where((x) => x is Map && x['point_type'] == 'extra_tt').length;
    final vt = extras.where((x) => x is Map && x['point_type'] == 'vt').length;
    final effectiveTariff = (f['corrected_tariff'] as num?)?.toDouble() ??
        (f['tariff'] as num?)?.toDouble();
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
      tariff: effectiveTariff,
      tariffUnknown: f['tariff_unknown'] == true,
      completed: f['completed'] == true,
      assignedLogisticianId: r['assigned_logistician_id']?.toString(),
      deliveredPoints: (f['delivered_points'] as num?)?.toInt(),
      departureTime: f['departure_time']?.toString(),
      extraPoints: extraTt,
      vtPoints: vt,
    );
  }
}

class RoutePointModel {
  RoutePointModel({
    required this.id,
    required this.customer,
    required this.address,
    required this.settlement,
    required this.district,
    required this.region,
    required this.documents,
    required this.weight,
    required this.pallets,
    required this.bottles,
    required this.places,
    required this.amount,
    this.zone,
    this.calculatedCost,
  });

  final int id;
  final String customer;
  final String address;
  final String settlement;
  final String district;
  final String region;
  final int documents;
  final double weight;
  final double pallets;
  final double bottles;
  final double places;
  final double amount;
  int? zone;
  double? calculatedCost;
}

class SourceDocumentModel {
  SourceDocumentModel({
    required this.code,
    required this.business,
    required this.customer,
    required this.addressId,
    required this.weight,
    required this.pallets,
    required this.bottles,
    required this.places,
    required this.amount,
  });

  final String code;
  final String business;
  final String customer;
  final String addressId;
  final double weight;
  final double pallets;
  final double bottles;
  final double places;
  final double amount;
}

class DashboardBusinessStat {
  DashboardBusinessStat(this.business);
  final String business;
  final Set<String> pointKeys = <String>{};
  double pallets = 0;
  double amount = 0;
}

class ZoneTariff {
  const ZoneTariff({
    required this.carrier,
    required this.month,
    required this.ttFixed,
    required this.rates,
  });
  final String carrier;
  final DateTime month;
  final double ttFixed;
  final List<double> rates;

  double rateFor(int zone) => zone >= 1 && zone <= 5 ? rates[zone - 1] : 0;
}

class DemoData {
  static final routes = <RouteModel>[
    RouteModel(
      id: 1,
      routeDate: DateTime.now(),
      routeDeliveryId: '61287185',
      expeditor: 'Експедитор Верес Сергій м. Київ',
      warehouse: 'Розумовського',
      points: 24,
      documents: 37,
      weight: 6240,
      pallets: 24,
      bottles: 1536,
      places: 198,
      orderAmount: 187450,
      driver: 'Верес Сергій Васильович',
      vehicle: 'Renault Kangoo · AA8638XE',
      carrier: 'ФОП Діденко',
      wave: '24',
      tariff: 7450,
      completed: true,
      deliveredPoints: 24,
    ),
    RouteModel(
      id: 2,
      routeDate: DateTime.now(),
      routeDeliveryId: '61287204',
      expeditor: 'Експедитор Універсальний STV м. Київ',
      warehouse: 'Чайки',
      points: 18,
      documents: 29,
      weight: 9480,
      pallets: 12.5,
      bottles: 2208,
      places: 286,
      orderAmount: 246300,
      carrier: 'STV',
      wave: '48',
      tariff: 12600,
    ),
  ];
}

class RouteRepository {
  RouteRepository(this.demo);
  final bool demo;

  SupabaseClient get db => Supabase.instance.client;

  Future<List<RouteModel>> loadRoutes(DateTimeRange range) async {
    if (demo) {
      await Future<void>.delayed(const Duration(milliseconds: 180));
      return DemoData.routes;
    }
    final start = fmtDate(range.start);
    final end = fmtDate(range.end);
    try {
      final rows = await db
          .from('routes')
          .select('*, route_facts(*), route_extra_points(point_type,name)')
          .gte('route_date', start)
          .lte('route_date', end)
          .order('route_date', ascending: false)
          .order('route_delivery_id');
      return (rows as List)
          .map((e) => RouteModel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      final rows = await db
          .from('routes')
          .select('*, route_facts(*)')
          .gte('route_date', start)
          .lte('route_date', end)
          .order('route_date', ascending: false)
          .order('route_delivery_id');
      return (rows as List)
          .map((e) => RouteModel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    }
  }

  Future<Map<String, DashboardBusinessStat>> loadBusinessStats(DateTimeRange range) async {
    if (demo) {
      final a = DashboardBusinessStat('Дистрибуція')
        ..pointKeys.addAll({'a', 'b', 'c'})
        ..pallets = 8
        ..amount = 120000;
      final b = DashboardBusinessStat('ХоРеКа')
        ..pointKeys.addAll({'d', 'e'})
        ..pallets = 5
        ..amount = 80000;
      final c = DashboardBusinessStat('Крафт')
        ..pointKeys.add('f')
        ..pallets = 2
        ..amount = 30000;
      return {a.business: a, b.business: b, c.business: c};
    }
    final out = <String, DashboardBusinessStat>{};
    try {
      final rows = await db
          .from('source_documents')
          .select('document_date,route_delivery_id,address_id,customer_id,business_unit,pallets,order_amount')
          .gte('document_date', fmtDate(range.start))
          .lte('document_date', fmtDate(range.end));
      for (final raw in rows as List) {
        final r = Map<String, dynamic>.from(raw as Map);
        final business = normalizeBusiness('${r['business_unit'] ?? ''}');
        if (!['Дистрибуція', 'ХоРеКа', 'Крафт'].contains(business)) continue;
        final s = out.putIfAbsent(business, () => DashboardBusinessStat(business));
        s.pointKeys.add('${r['document_date']}|${r['route_delivery_id']}|${r['address_id']}|${r['customer_id']}');
        s.pallets += (r['pallets'] as num? ?? 0).toDouble();
        s.amount += (r['order_amount'] as num? ?? 0).toDouble();
      }
    } catch (_) {}
    for (final name in ['Дистрибуція', 'ХоРеКа', 'Крафт']) {
      out.putIfAbsent(name, () => DashboardBusinessStat(name));
    }
    return out;
  }

  Future<void> claimRoute(RouteModel route) async {
    if (demo) return;
    final uid = db.auth.currentUser?.id;
    if (uid == null) throw StateError('Користувач не авторизований');
    final updated = await db
        .from('routes')
        .update({'assigned_logistician_id': uid, 'assigned_at': DateTime.now().toIso8601String()})
        .eq('id', route.id)
        .isFilter('assigned_logistician_id', null)
        .select('id');
    if ((updated as List).isEmpty && route.assignedLogisticianId != uid) {
      final current = await db.from('routes').select('assigned_logistician_id').eq('id', route.id).single();
      if (current['assigned_logistician_id'] != uid) {
        throw StateError('Цей маршрут уже закріплений за іншим логістом');
      }
    }
  }

  Future<Map<String, dynamic>?> loadExpeditorDefault(String expeditor) async {
    if (demo) return null;
    try {
      final rows = await db
          .from('expeditor_defaults')
          .select('*, transport_drivers(full_name), transport_vehicles(brand,plate_number)')
          .eq('expeditor_name', expeditor)
          .limit(1);
      if ((rows as List).isEmpty) return null;
      return Map<String, dynamic>.from(rows.first as Map);
    } catch (_) {
      return null;
    }
  }

  Future<List<String>> loadDrivers() async {
    if (demo) return ['Верес Сергій Васильович', 'Бойко І.Д.', 'Галицький Вадим Юрійович'];
    try {
      final rows = await db.from('transport_drivers').select('full_name').eq('active', true).order('full_name');
      return (rows as List).map((x) => '${(x as Map)['full_name']}').toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<String>> loadVehicles() async {
    if (demo) return ['Renault Kangoo · AA8638XE', 'MAN · AA9424ЕМ'];
    try {
      final rows = await db.from('transport_vehicles').select('brand,plate_number').eq('active', true).order('brand');
      return (rows as List)
          .map((x) => '${(x as Map)['brand']} · ${x['plate_number']}')
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<String>> loadCarriers() async {
    const defaults = [
      'ФОП Діденко',
      'ФОП Різун',
      'ПП Лозицький',
      'ФОП Скібіцька',
      'ТОВ Рабен',
      'ТОВ ФМ Лоджистік',
      'ТОВ Корпоратура',
      'ТОВ ТС ПЛЮС',
    ];
    if (demo) return defaults;
    try {
      final rows = await db
          .from('transport_carriers')
          .select('name,carrier_type')
          .eq('active', true)
          .eq('carrier_type', 'route')
          .order('name');
      final list = (rows as List).map((x) => '${(x as Map)['name']}').toList();
      if (!list.contains('ТОВ ТС ПЛЮС')) list.add('ТОВ ТС ПЛЮС');
      return list;
    } catch (_) {
      return defaults;
    }
  }

  Future<List<String>> loadWaves() async {
    const defaults = ['24', '48', 'Мережа', 'Пекарня', 'Пекарня Заморозка', 'Фреш', 'ОЗ', 'Повернення'];
    if (demo) return defaults;
    try {
      final rows = await db.from('transport_waves').select('name').eq('active', true).order('id');
      return (rows as List).map((x) => '${(x as Map)['name']}').toList();
    } catch (_) {
      return defaults;
    }
  }

  Future<List<String>> loadExtraCatalog(String type) async {
    final defaults = type == 'vt'
        ? ['Стоянка', 'Палладіна', 'Дмитрівська', 'Філатова', 'Здановської', 'Верхогляда', 'Мокра', 'Голосіївська', 'Бажана', 'Маккейна']
        : ['ТТ з Бару', 'Переміщення на офіс'];
    if (demo) return defaults;
    try {
      final rows = await db
          .from('extra_point_catalog')
          .select('name')
          .eq('point_type', type)
          .eq('active', true)
          .order('name');
      return (rows as List).map((x) => '${(x as Map)['name']}').toList();
    } catch (_) {
      return defaults;
    }
  }

  Future<List<Map<String, dynamic>>> loadSelectedExtras(int routeId) async {
    if (demo) return [];
    try {
      final rows = await db.from('route_extra_points').select('point_type,name').eq('route_id', routeId);
      return (rows as List).map((x) => Map<String, dynamic>.from(x as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> replaceExtras(int routeId, String type, Set<String> values) async {
    if (demo) return;
    try {
      await db.from('route_extra_points').delete().eq('route_id', routeId).eq('point_type', type);
      if (values.isNotEmpty) {
        final uid = db.auth.currentUser?.id;
        await db.from('route_extra_points').insert(values
            .map((x) => {'route_id': routeId, 'point_type': type, 'name': x, 'created_by': uid})
            .toList());
      }
    } catch (_) {}
  }

  Future<void> addCatalogItem(String type, String name) async {
    if (demo || name.trim().isEmpty) return;
    await db.from('extra_point_catalog').upsert({
      'point_type': type,
      'name': name.trim(),
      'active': true,
    }, onConflict: 'point_type,name');
  }

  Future<void> addDriver(String fullName) async {
    if (demo || fullName.trim().isEmpty) return;
    await db.from('transport_drivers').upsert({'full_name': fullName.trim(), 'active': true}, onConflict: 'full_name');
  }

  Future<void> addVehicle(String brand, String plate) async {
    if (demo || brand.trim().isEmpty || plate.trim().isEmpty) return;
    await db.from('transport_vehicles').upsert({
      'brand': brand.trim(),
      'plate_number': plate.trim().toUpperCase(),
      'active': true,
    }, onConflict: 'plate_number');
  }

  Future<void> addCarrier(String name) async {
    if (demo || name.trim().isEmpty) return;
    await db.from('transport_carriers').upsert({'name': name.trim(), 'carrier_type': 'route', 'active': true}, onConflict: 'name');
  }

  Future<void> addWave(String name) async {
    if (demo || name.trim().isEmpty) return;
    await db.from('transport_waves').upsert({'name': name.trim(), 'uses_vt': false, 'active': true}, onConflict: 'name');
  }

  Future<String?> detectAutoCarrier(String expeditor) async {
    if (expeditor.toUpperCase().contains('STV')) return 'STV';
    if (expeditor.toUpperCase().contains('SAV') || expeditor.toUpperCase().contains('САВ')) return 'SAV';
    if (demo) return null;
    try {
      final rows = await db
          .from('expeditor_auto_carrier')
          .select('auto_carrier')
          .eq('expeditor_name', expeditor)
          .eq('active', true)
          .limit(1);
      if ((rows as List).isEmpty) return null;
      return '${(rows.first as Map)['auto_carrier']}';
    } catch (_) {
      return null;
    }
  }

  Future<ZoneTariff?> loadZoneTariff(String carrier, DateTime date) async {
    if (demo) {
      return carrier == 'STV'
          ? ZoneTariff(carrier: 'STV', month: DateTime(2026, 8), ttFixed: 105.65, rates: const [572.76, 1320.51, 1893.26, 2275.10, 2641.01])
          : ZoneTariff(carrier: 'SAV', month: DateTime(2026, 8), ttFixed: 82.20, rates: const [510, 1130, 1620, 1940, 2140]);
    }
    final month = DateTime(date.year, date.month, 1);
    try {
      final rows = await db
          .from('monthly_zone_tariffs')
          .select('*')
          .eq('carrier', carrier)
          .eq('month', fmtDate(month))
          .limit(1);
      if ((rows as List).isEmpty) return null;
      final r = Map<String, dynamic>.from(rows.first as Map);
      return ZoneTariff(
        carrier: carrier,
        month: month,
        ttFixed: (r['tt_fixed'] as num? ?? 0).toDouble(),
        rates: [1, 2, 3, 4, 5].map((z) => (r['zone$z'] as num? ?? 0).toDouble()).toList(),
      );
    } catch (_) {
      return null;
    }
  }

  Future<int?> resolveZone(String carrier, String routeRegion, String district) async {
    if (district.trim().isEmpty || demo) return null;
    try {
      var q = db.from('delivery_zones').select('zone,region').eq('carrier', carrier).eq('district', district).eq('active', true);
      final rows = await q;
      final list = (rows as List).map((x) => Map<String, dynamic>.from(x as Map)).toList();
      if (list.isEmpty) return null;
      final byRegion = list.where((x) => '${x['region'] ?? ''}'.toLowerCase() == routeRegion.toLowerCase()).toList();
      final row = byRegion.isNotEmpty ? byRegion.first : list.first;
      return (row['zone'] as num?)?.toInt();
    } catch (_) {
      return null;
    }
  }

  Future<List<RoutePointModel>> loadRoutePoints(RouteModel route, {String? autoCarrier}) async {
    if (demo) {
      return [
        RoutePointModel(id: 1, customer: 'ТОВ Приклад', address: 'вул. Центральна, 1', settlement: 'Сквира', district: 'Сквирський', region: 'Київська', documents: 5, weight: 340, pallets: .5, bottles: 96, places: 12, amount: 8400),
      ];
    }
    final rows = await db
        .from('route_points')
        .select('*, locations(*)')
        .eq('route_id', route.id)
        .order('id');
    final tariff = autoCarrier == null ? null : await loadZoneTariff(autoCarrier, route.routeDate);
    final result = <RoutePointModel>[];
    for (final raw in rows as List) {
      final r = Map<String, dynamic>.from(raw as Map);
      final locRaw = r['locations'];
      final loc = locRaw is Map ? Map<String, dynamic>.from(locRaw) : <String, dynamic>{};
      final p = RoutePointModel(
        id: (r['id'] as num).toInt(),
        customer: '${r['customer_name'] ?? loc['customer_name'] ?? ''}',
        address: '${loc['delivery_address'] ?? ''}',
        settlement: '${loc['settlement'] ?? ''}',
        district: '${loc['district'] ?? ''}',
        region: '${loc['region'] ?? ''}',
        documents: (r['documents_count'] as num? ?? 0).toInt(),
        weight: (r['weight'] as num? ?? 0).toDouble(),
        pallets: (r['pallets'] as num? ?? 0).toDouble(),
        bottles: (r['bottles'] as num? ?? 0).toDouble(),
        places: (r['places'] as num? ?? 0).toDouble(),
        amount: (r['order_amount'] as num? ?? 0).toDouble(),
      );
      if (autoCarrier != null) {
        p.zone = await resolveZone(autoCarrier, shippingRegion(route.warehouse), p.district);
        if (p.zone != null && tariff != null) {
          p.calculatedCost = tariff.ttFixed + tariff.rateFor(p.zone!) * p.pallets;
        }
        try {
          final ov = await db
              .from('point_tariff_overrides')
              .select('corrected_zone,corrected_cost')
              .eq('route_point_id', p.id)
              .eq('carrier', autoCarrier)
              .limit(1);
          if ((ov as List).isNotEmpty) {
            final o = Map<String, dynamic>.from(ov.first as Map);
            final correctedZone = (o['corrected_zone'] as num?)?.toInt();
            final correctedCost = (o['corrected_cost'] as num?)?.toDouble();
            if (correctedZone != null) {
              p.zone = correctedZone;
              if (correctedCost == null && tariff != null) {
                p.calculatedCost = tariff.ttFixed + tariff.rateFor(correctedZone) * p.pallets;
              }
            }
            if (correctedCost != null) p.calculatedCost = correctedCost;
          }
        } catch (_) {}
      }
      result.add(p);
    }
    return result;
  }

  Future<List<SourceDocumentModel>> loadDocuments(RouteModel route) async {
    if (demo) {
      return [
        SourceDocumentModel(code: '123456', business: 'ХоРеКа', customer: 'ТОВ Приклад', addressId: 'A1', weight: 120, pallets: .2, bottles: 36, places: 4, amount: 3200),
        SourceDocumentModel(code: '123457', business: 'Дистрибуція', customer: 'ТОВ Приклад', addressId: 'A1', weight: 220, pallets: .3, bottles: 60, places: 8, amount: 5200),
      ];
    }
    try {
      final rows = await db
          .from('source_documents')
          .select('operation_code,sale_code,business_unit,customer_name,address_id,weight,pallets,bottles,places,order_amount')
          .eq('document_date', fmtDate(route.routeDate))
          .eq('route_delivery_id', route.routeDeliveryId)
          .order('customer_name');
      return (rows as List).map((raw) {
        final r = Map<String, dynamic>.from(raw as Map);
        return SourceDocumentModel(
          code: '${r['sale_code'] ?? r['operation_code'] ?? ''}',
          business: normalizeBusiness('${r['business_unit'] ?? ''}'),
          customer: '${r['customer_name'] ?? ''}',
          addressId: '${r['address_id'] ?? ''}',
          weight: (r['weight'] as num? ?? 0).toDouble(),
          pallets: (r['pallets'] as num? ?? 0).toDouble(),
          bottles: (r['bottles'] as num? ?? 0).toDouble(),
          places: (r['places'] as num? ?? 0).toDouble(),
          amount: (r['order_amount'] as num? ?? 0).toDouble(),
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveZoneOverride(RoutePointModel point, String carrier, int zone, {double? correctedCost}) async {
    if (demo) return;
    final uid = db.auth.currentUser?.id;
    await db.from('point_tariff_overrides').upsert({
      'route_point_id': point.id,
      'carrier': carrier,
      'original_zone': point.zone,
      'corrected_zone': zone,
      'calculated_cost': point.calculatedCost,
      'corrected_cost': correctedCost,
      'corrected_by': uid,
      'corrected_at': DateTime.now().toIso8601String(),
    }, onConflict: 'route_point_id,carrier');
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
    required int deliveredPoints,
    required String? departureTime,
    required String? tariffGroupId,
  }) async {
    if (demo) return;
    final isTsPlus = carrier == 'ТОВ ТС ПЛЮС';
    await db.from('route_facts').upsert({
      'route_id': route.id,
      'driver_name': driver,
      'vehicle_number': vehicle,
      'carrier_name': carrier,
      'wave': wave,
      'tariff': (tariffUnknown || isTsPlus) ? null : tariff,
      'original_tariff': (tariffUnknown || isTsPlus) ? null : tariff,
      'tariff_unknown': isTsPlus ? false : tariffUnknown,
      'comment': comment,
      'delivered_points': deliveredPoints,
      'departure_time': departureTime,
      'tariff_group_id': tariffGroupId,
      'completed': true,
      'updated_at': DateTime.now().toIso8601String(),
    }, onConflict: 'route_id');
  }

  Future<void> linkTariffGroup({
    required List<RouteModel> routes,
    required String groupId,
    required double? tariff,
    required bool tariffUnknown,
  }) async {
    if (demo) return;
    for (final route in routes) {
      await claimRoute(route);
      await db.from('route_facts').upsert({
        'route_id': route.id,
        'tariff': tariffUnknown ? null : tariff,
        'original_tariff': tariffUnknown ? null : tariff,
        'tariff_unknown': tariffUnknown,
        'tariff_group_id': groupId,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'route_id');
    }
  }

  Future<void> saveMonthlyTariff(ZoneTariff tariff) async {
    if (demo) return;
    final uid = db.auth.currentUser?.id;
    await db.from('monthly_zone_tariffs').upsert({
      'carrier': tariff.carrier,
      'month': fmtDate(DateTime(tariff.month.year, tariff.month.month, 1)),
      'tt_fixed': tariff.ttFixed,
      'zone1': tariff.rates[0],
      'zone2': tariff.rates[1],
      'zone3': tariff.rates[2],
      'zone4': tariff.rates[3],
      'zone5': tariff.rates[4],
      'created_by': uid,
      'updated_at': DateTime.now().toIso8601String(),
    }, onConflict: 'carrier,month');
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
  DateTimeRange period = DateTimeRange(start: DateUtils.dateOnly(DateTime.now()), end: DateUtils.dateOnly(DateTime.now()));

  Future<void> pickPeriod() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2024, 1, 1),
      lastDate: DateTime(2035, 12, 31),
      initialDateRange: period,
      helpText: 'Оберіть день або період',
      cancelText: 'Скасувати',
      confirmText: 'Обрати',
      saveText: 'Застосувати',
    );
    if (picked != null && mounted) setState(() => period = picked);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardPage(repo: repo, period: period, demo: widget.demo),
      RoutesPage(repo: repo, period: period, demo: widget.demo),
      ReportsPage(repo: repo, period: period),
      MorePage(repo: repo, demo: widget.demo),
    ];
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        toolbarHeight: 58,
        title: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: pickPeriod,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.date_range_outlined, size: 20),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    periodLabel(period),
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.keyboard_arrow_down, size: 18),
              ],
            ),
          ),
        ),
        actions: [
          IconButton(tooltip: 'Період', onPressed: pickPeriod, icon: const Icon(Icons.calendar_month_outlined)),
          const SizedBox(width: 4),
        ],
      ),
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Головна'),
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
                Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
                const SizedBox(height: 3),
                Text(subtitle, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({required this.repo, required this.period, required this.demo, super.key});
  final RouteRepository repo;
  final DateTimeRange period;
  final bool demo;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  String region = 'Всі філії';
  String business = 'Всі бізнеси';
  late Future<List<RouteModel>> routesFuture;
  late Future<Map<String, DashboardBusinessStat>> businessFuture;

  @override
  void initState() {
    super.initState();
    reload();
  }

  @override
  void didUpdateWidget(covariant DashboardPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.period.start != widget.period.start || oldWidget.period.end != widget.period.end) reload();
  }

  void reload() {
    routesFuture = widget.repo.loadRoutes(widget.period);
    businessFuture = widget.repo.loadBusinessStats(widget.period);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<RouteModel>>(
        future: routesFuture,
        builder: (context, routeSnap) {
          final allRoutes = routeSnap.data ?? const <RouteModel>[];
          final regions = <String>{'Всі філії', ...allRoutes.map((r) => shippingRegion(r.warehouse))}.toList();
          if (!regions.contains(region)) region = 'Всі філії';
          final routes = region == 'Всі філії'
              ? allRoutes
              : allRoutes.where((r) => shippingRegion(r.warehouse) == region).toList();
          return FutureBuilder<Map<String, DashboardBusinessStat>>(
            future: businessFuture,
            builder: (context, businessSnap) {
              final businessStats = businessSnap.data ?? <String, DashboardBusinessStat>{};
              final spend = routes.fold<double>(0, (s, r) => s + (r.tariff ?? 0));
              final sales = business == 'Всі бізнеси'
                  ? routes.fold<double>(0, (s, r) => s + r.orderAmount)
                  : businessStats[business]?.amount ?? 0;
              final tt = business == 'Всі бізнеси'
                  ? routes.fold<int>(0, (s, r) => s + r.totalActualPoints)
                  : businessStats[business]?.pointKeys.length ?? 0;
              final pallets = business == 'Всі бізнеси'
                  ? routes.fold<double>(0, (s, r) => s + r.pallets)
                  : businessStats[business]?.pallets ?? 0;
              final logistics = sales == 0 ? 0 : spend / sales * 100;
              return ListView(
                padding: const EdgeInsets.only(bottom: 28),
                children: [
                  PageHeader(
                    title: 'Transport Report TS',
                    subtitle: periodLabel(widget.period),
                    trailing: const AppMark(size: 48),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 42,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: regions.length,
                            separatorBuilder: (_, __) => const SizedBox(width: 8),
                            itemBuilder: (_, i) {
                              final x = regions[i];
                              return ChoiceChip(
                                label: Text(x),
                                selected: region == x,
                                onSelected: (_) => setState(() => region = x),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text('Бізнес', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: ['Всі бізнеси', 'Дистрибуція', 'ХоРеКа', 'Крафт']
                              .map((x) => ChoiceChip(
                                    label: Text(x),
                                    selected: business == x,
                                    onSelected: (_) => setState(() => business = x),
                                  ))
                              .toList(),
                        ),
                        const SizedBox(height: 18),
                        GridView.count(
                          physics: const NeverScrollableScrollPhysics(),
                          shrinkWrap: true,
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.34,
                          children: [
                            KpiCard(label: 'ТТ', value: '$tt', icon: Icons.storefront_outlined),
                            KpiCard(label: 'Палет', value: nf2(pallets), icon: Icons.grid_view_rounded),
                            KpiCard(label: 'Маршрутів', value: '${routes.length}', icon: Icons.route_outlined),
                            KpiCard(label: 'Продажі, грн', value: money0(sales), icon: Icons.payments_outlined),
                            KpiCard(label: 'Витрати, грн', value: money0(spend), icon: Icons.account_balance_wallet_outlined),
                            KpiCard(label: '1 ТТ, грн', value: tt == 0 ? '0' : money2(spend / tt), icon: Icons.calculate_outlined),
                            KpiCard(label: '% логістики', value: '${logistics.toStringAsFixed(2)}%', icon: Icons.percent),
                            KpiCard(label: 'Без тарифу', value: '${routes.where((r) => r.tariff == null && r.carrier != 'ТОВ ТС ПЛЮС').length}', icon: Icons.warning_amber_rounded),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
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
            Icon(icon, color: brandBlue, size: 20),
            const Spacer(),
            Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class RoutesPage extends StatefulWidget {
  const RoutesPage({required this.repo, required this.period, required this.demo, super.key});
  final RouteRepository repo;
  final DateTimeRange period;
  final bool demo;

  @override
  State<RoutesPage> createState() => _RoutesPageState();
}

class _RoutesPageState extends State<RoutesPage> {
  late Future<List<RouteModel>> future;
  final search = TextEditingController();
  String filter = 'Всі';
  String selectedRegion = 'Всі регіони';
  String selectedWarehouse = 'Всі склади';
  bool groupByExpeditor = true;
  bool onlyMine = false;

  @override
  void initState() {
    super.initState();
    future = widget.repo.loadRoutes(widget.period);
    search.addListener(_searchChanged);
  }

  @override
  void didUpdateWidget(covariant RoutesPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.period.start != widget.period.start || oldWidget.period.end != widget.period.end) reload();
  }

  void _searchChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    search.removeListener(_searchChanged);
    search.dispose();
    super.dispose();
  }

  void reload() => setState(() => future = widget.repo.loadRoutes(widget.period));

  List<RouteModel> _filtered(List<RouteModel> source) {
    var routes = List<RouteModel>.from(source);
    if (onlyMine && !widget.demo) {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      routes = routes.where((r) => r.assignedLogisticianId == uid).toList();
    }
    if (filter == 'Заповнено') routes = routes.where((r) => r.completed).toList();
    if (filter == 'Без тарифу') routes = routes.where((r) => r.tariff == null && r.carrier != 'ТОВ ТС ПЛЮС').toList();
    if (selectedRegion != 'Всі регіони') {
      routes = routes.where((r) => shippingRegion(r.warehouse) == selectedRegion).toList();
    }
    if (selectedWarehouse != 'Всі склади') routes = routes.where((r) => r.warehouse == selectedWarehouse).toList();
    final q = search.text.trim().toLowerCase();
    if (q.isNotEmpty) {
      routes = routes.where((r) =>
          r.expeditor.toLowerCase().contains(q) ||
          r.routeDeliveryId.toLowerCase().contains(q) ||
          r.warehouse.toLowerCase().contains(q) ||
          shippingRegion(r.warehouse).toLowerCase().contains(q)).toList();
    }
    return routes;
  }

  Future<void> addRouteFromSystem(List<RouteModel> all) async {
    final uid = widget.demo ? null : Supabase.instance.client.auth.currentUser?.id;
    final available = all.where((r) => r.assignedLogisticianId == null || r.assignedLogisticianId == uid).toList();
    final picked = await showModalBottomSheet<RouteModel>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: SizedBox(
          height: MediaQuery.of(ctx).size.height * .75,
          child: Column(
            children: [
              const Padding(
                padding: EdgeInsets.all(18),
                child: Text('Додати маршрут із системи', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
              ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                  itemCount: available.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final r = available[i];
                    return ListTile(
                      title: Text('${r.expeditor} · ID ${r.routeDeliveryId}'),
                      subtitle: Text('${shippingRegion(r.warehouse)} · ${r.warehouse} · ${r.points} ТТ'),
                      trailing: const Icon(Icons.add_circle_outline),
                      onTap: () => Navigator.pop(ctx, r),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (picked == null) return;
    try {
      await widget.repo.claimRoute(picked);
      reload();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Маршрут додано до ваших')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<RouteModel>>(
        future: future,
        builder: (context, snapshot) {
          final all = snapshot.data ?? const <RouteModel>[];
          final regions = <String>{'Всі регіони', ...all.map((r) => shippingRegion(r.warehouse))}.toList()..sort();
          if (!regions.contains(selectedRegion)) selectedRegion = 'Всі регіони';
          final warehouses = <String>{
            'Всі склади',
            ...all.where((r) => selectedRegion == 'Всі регіони' || shippingRegion(r.warehouse) == selectedRegion).map((r) => r.warehouse).where((x) => x.isNotEmpty),
          }.toList()..sort();
          if (!warehouses.contains(selectedWarehouse)) selectedWarehouse = 'Всі склади';
          return Column(
            children: [
              PageHeader(
                title: 'Маршрути',
                subtitle: periodLabel(widget.period),
                trailing: IconButton(onPressed: reload, icon: const Icon(Icons.refresh)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                child: TextField(
                  controller: search,
                  decoration: InputDecoration(
                    hintText: 'Пошук: експедитор, ID, склад, регіон',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: search.text.isEmpty ? null : IconButton(onPressed: search.clear, icon: const Icon(Icons.close)),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedRegion,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Регіон', isDense: true),
                        items: regions.map((x) => DropdownMenuItem(value: x, child: Text(x, overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: (v) => setState(() {
                          selectedRegion = v ?? 'Всі регіони';
                          selectedWarehouse = 'Всі склади';
                        }),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: selectedWarehouse,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Склад', isDense: true),
                        items: warehouses.map((x) => DropdownMenuItem(value: x, child: Text(x, overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: (v) => setState(() {
                          selectedWarehouse = v ?? 'Всі склади';
                          if (selectedWarehouse != 'Всі склади') {
                            final r = all.where((x) => x.warehouse == selectedWarehouse).firstOrNull;
                            if (r != null) selectedRegion = shippingRegion(r.warehouse);
                          }
                        }),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: 42,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    ...['Всі', 'Заповнено', 'Без тарифу'].map((f) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(label: Text(f), selected: filter == f, onSelected: (_) => setState(() => filter = f)),
                        )),
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        avatar: const Icon(Icons.person_pin_circle_outlined, size: 18),
                        label: const Text('Тільки мої'),
                        selected: onlyMine,
                        onSelected: (v) => setState(() => onlyMine = v),
                      ),
                    ),
                    FilterChip(
                      avatar: const Icon(Icons.groups_2_outlined, size: 18),
                      label: const Text('По експедитору'),
                      selected: groupByExpeditor,
                      onSelected: (v) => setState(() => groupByExpeditor = v),
                    ),
                  ],
                ),
              ),
              if (onlyMine)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                  child: OutlinedButton.icon(
                    onPressed: () => addRouteFromSystem(all),
                    icon: const Icon(Icons.add),
                    label: const Text('Додати маршрут із системи'),
                  ),
                ),
              const SizedBox(height: 8),
              Expanded(
                child: snapshot.connectionState == ConnectionState.waiting
                    ? const Center(child: CircularProgressIndicator())
                    : snapshot.hasError
                        ? Center(child: Text('Помилка: ${snapshot.error}'))
                        : _routesList(_filtered(all)),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _routesList(List<RouteModel> routes) {
    if (routes.isEmpty) return const Center(child: Text('Маршрути не знайдено'));
    if (!groupByExpeditor) {
      return ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        itemCount: routes.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _routeCard(routes[i]),
      );
    }
    final grouped = <String, List<RouteModel>>{};
    for (final route in routes) {
      final key = route.expeditor.trim().isEmpty ? 'Без експедитора' : route.expeditor.trim();
      grouped.putIfAbsent(key, () => []).add(route);
    }
    final names = grouped.keys.toList()..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        for (final name in names) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 8, 4, 10),
            child: Row(
              children: [
                const Icon(Icons.person_outline, size: 19, color: brandBlue),
                const SizedBox(width: 7),
                Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16))),
                Text('${grouped[name]!.length} марш.', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          ...grouped[name]!.map((r) => Padding(padding: const EdgeInsets.only(bottom: 12), child: _routeCard(r))),
        ],
      ],
    );
  }

  Widget _routeCard(RouteModel r) {
    return RouteCard(
      route: r,
      onTap: () async {
        final saved = await Navigator.of(context).push<bool>(
          MaterialPageRoute(builder: (_) => RouteDetailsPage(route: r, repo: widget.repo, demo: widget.demo)),
        );
        if (saved == true) reload();
      },
    );
  }
}

class RouteCard extends StatelessWidget {
  const RouteCard({required this.route, required this.onTap, super.key});
  final RouteModel route;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final delivered = route.deliveredPoints ?? 0;
    final total = route.totalActualPoints;
    final statusColor = delivered >= total && total > 0
        ? const Color(0xFF2BB673)
        : route.completed
            ? const Color(0xFFE9A20B)
            : const Color(0xFF7F8CA6);
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ID ${route.routeDeliveryId}', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
                        const SizedBox(height: 3),
                        Text(DateFormat('dd.MM.yyyy').format(route.routeDate), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 12)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: statusColor.withValues(alpha: .15), borderRadius: BorderRadius.circular(10)),
                    child: Text('$delivered/$total ТТ', style: TextStyle(color: statusColor, fontWeight: FontWeight.w800, fontSize: 12)),
                  ),
                ],
              ),
              const SizedBox(height: 7),
              Text('${route.expeditor} · ${route.carrier ?? 'Перевізник не вказаний'}'),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  RouteInfoBadge(icon: Icons.warehouse_outlined, text: route.warehouse.isEmpty ? 'Склад не вказаний' : route.warehouse),
                  RouteInfoBadge(icon: Icons.location_city_outlined, text: shippingRegion(route.warehouse)),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  RouteMetric(icon: Icons.storefront_outlined, text: '$total ТТ'),
                  RouteMetric(icon: Icons.grid_view_rounded, text: '${nf2(route.pallets)} пал.'),
                  RouteMetric(icon: Icons.local_drink_outlined, text: nf0(route.bottles)),
                ],
              ),
              const Divider(height: 24),
              Row(
                children: [
                  const Icon(Icons.account_balance_wallet_outlined, size: 18),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      route.carrier == 'ТОВ ТС ПЛЮС'
                          ? 'ТС ПЛЮС · місячні витрати'
                          : route.tariffUnknown
                              ? 'Без тарифу'
                              : route.tariff == null
                                  ? 'Тариф не внесено'
                                  : '${money0(route.tariff!)} грн · ${money2(route.averageCostPerPoint)} грн/ТТ',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class RouteInfoBadge extends StatelessWidget {
  const RouteInfoBadge({required this.icon, required this.text, super.key});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: .55),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.circle, size: 0),
        Icon(icon, size: 15, color: brandBlue),
        const SizedBox(width: 5),
        Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

class RouteMetric extends StatelessWidget {
  const RouteMetric({required this.icon, required this.text, super.key});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Row(children: [
        Icon(icon, size: 17, color: Theme.of(context).colorScheme.onSurfaceVariant),
        const SizedBox(width: 5),
        Flexible(child: Text(text, style: const TextStyle(fontSize: 12))),
      ]),
    );
  }
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
  final comment = TextEditingController();
  final tariff = TextEditingController();
  final delivered = TextEditingController();
  List<String> drivers = [];
  List<String> vehicles = [];
  List<String> carriers = [];
  List<String> waves = [];
  List<String> vtCatalog = [];
  List<String> extraCatalog = [];
  Set<String> selectedVt = {};
  Set<String> selectedExtra = {};
  String? driver;
  String? vehicle;
  String? carrier;
  String wave = '24';
  String? autoCarrier;
  bool tariffUnknown = false;
  bool saving = false;
  TimeOfDay? departure;
  late Future<List<RoutePointModel>> pointsFuture;
  late Future<List<SourceDocumentModel>> documentsFuture;

  bool get usesVt => ['Пекарня', 'Пекарня Заморозка', 'Фреш'].contains(wave);
  int get totalActualPoints => widget.route.points + selectedVt.length + selectedExtra.length;

  @override
  void initState() {
    super.initState();
    tariff.text = widget.route.tariff?.toStringAsFixed(0) ?? '';
    delivered.text = (widget.route.deliveredPoints ?? 0).toString();
    tariffUnknown = widget.route.tariffUnknown;
    wave = widget.route.wave ?? '24';
    if (widget.route.departureTime != null) {
      final p = widget.route.departureTime!.split(':');
      if (p.length >= 2) departure = TimeOfDay(hour: int.tryParse(p[0]) ?? 0, minute: int.tryParse(p[1]) ?? 0);
    }
    pointsFuture = Future.value(const []);
    documentsFuture = widget.repo.loadDocuments(widget.route);
    loadReferences();
  }

  Future<void> loadReferences() async {
    autoCarrier = await widget.repo.detectAutoCarrier(widget.route.expeditor);
    final results = await Future.wait([
      widget.repo.loadDrivers(),
      widget.repo.loadVehicles(),
      widget.repo.loadCarriers(),
      widget.repo.loadWaves(),
      widget.repo.loadExtraCatalog('vt'),
      widget.repo.loadExtraCatalog('extra_tt'),
      widget.repo.loadSelectedExtras(widget.route.id),
    ]);
    final defaults = await widget.repo.loadExpeditorDefault(widget.route.expeditor);
    if (!mounted) return;
    setState(() {
      drivers = List<String>.from(results[0] as List);
      vehicles = List<String>.from(results[1] as List);
      carriers = List<String>.from(results[2] as List);
      waves = List<String>.from(results[3] as List);
      vtCatalog = List<String>.from(results[4] as List);
      extraCatalog = List<String>.from(results[5] as List);
      final selected = List<Map<String, dynamic>>.from(results[6] as List);
      selectedVt = selected.where((x) => x['point_type'] == 'vt').map((x) => '${x['name']}').toSet();
      selectedExtra = selected.where((x) => x['point_type'] == 'extra_tt').map((x) => '${x['name']}').toSet();
      if (widget.route.driver?.isNotEmpty == true) {
        driver = widget.route.driver;
      } else if (defaults != null && defaults['transport_drivers'] is Map) {
        driver = '${(defaults['transport_drivers'] as Map)['full_name']}';
      }
      if (driver != null && !drivers.contains(driver)) drivers.insert(0, driver!);
      if (widget.route.vehicle?.isNotEmpty == true) {
        vehicle = widget.route.vehicle;
      } else if (defaults != null && defaults['transport_vehicles'] is Map) {
        final v = defaults['transport_vehicles'] as Map;
        vehicle = '${v['brand']} · ${v['plate_number']}';
      }
      if (vehicle != null && !vehicles.contains(vehicle)) vehicles.insert(0, vehicle!);
      carrier = autoCarrier ?? widget.route.carrier;
      if (carrier != null && !carriers.contains(carrier) && autoCarrier == null) carriers.insert(0, carrier!);
      pointsFuture = widget.repo.loadRoutePoints(widget.route, autoCarrier: autoCarrier);
    });
  }

  @override
  void dispose() {
    comment.dispose();
    tariff.dispose();
    delivered.dispose();
    super.dispose();
  }

  Future<String?> promptText(String title, {String? secondLabel, void Function(String, String)? onTwo}) async {
    final a = TextEditingController();
    final b = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: a, autofocus: true, decoration: InputDecoration(labelText: secondLabel == null ? 'Назва' : 'Марка авто')),
          if (secondLabel != null) ...[
            const SizedBox(height: 12),
            TextField(controller: b, decoration: InputDecoration(labelText: secondLabel)),
          ],
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Скасувати')),
          FilledButton(onPressed: () => Navigator.pop(ctx, a.text.trim()), child: const Text('Додати')),
        ],
      ),
    );
    if (result != null && result.isNotEmpty && secondLabel != null && b.text.trim().isNotEmpty) onTwo?.call(result, b.text.trim());
    return result;
  }

  Future<void> addDriver() async {
    final value = await promptText('Новий водій');
    if (value == null || value.isEmpty) return;
    try { await widget.repo.addDriver(value); } catch (_) {}
    setState(() { if (!drivers.contains(value)) drivers.add(value); driver = value; });
  }

  Future<void> addVehicle() async {
    String? brand;
    String? plate;
    await promptText('Нове авто', secondLabel: 'Державний номер', onTwo: (a, b) { brand = a; plate = b; });
    if (brand == null || plate == null) return;
    try { await widget.repo.addVehicle(brand!, plate!); } catch (_) {}
    final value = '$brand · ${plate!.toUpperCase()}';
    setState(() { if (!vehicles.contains(value)) vehicles.add(value); vehicle = value; });
  }

  Future<void> addCarrier() async {
    final value = await promptText('Новий перевізник');
    if (value == null || value.isEmpty) return;
    try { await widget.repo.addCarrier(value); } catch (_) {}
    setState(() { if (!carriers.contains(value)) carriers.add(value); carrier = value; });
  }

  Future<void> addWave() async {
    final value = await promptText('Нова хвиля');
    if (value == null || value.isEmpty) return;
    try { await widget.repo.addWave(value); } catch (_) {}
    setState(() { if (!waves.contains(value)) waves.add(value); wave = value; });
  }

  Future<void> addExtraCatalog(String type) async {
    final value = await promptText(type == 'vt' ? 'Нова ВТ' : 'Нова додаткова ТТ');
    if (value == null || value.isEmpty) return;
    try { await widget.repo.addCatalogItem(type, value); } catch (_) {}
    setState(() {
      if (type == 'vt') {
        if (!vtCatalog.contains(value)) vtCatalog.add(value);
        selectedVt.add(value);
      } else {
        if (!extraCatalog.contains(value)) extraCatalog.add(value);
        selectedExtra.add(value);
      }
    });
  }

  Future<void> pickDeparture() async {
    final value = await showTimePicker(context: context, initialTime: departure ?? TimeOfDay.now());
    if (value != null) setState(() => departure = value);
  }

  Future<List<RouteModel>> chooseTariffPartners() async {
    final all = await widget.repo.loadRoutes(DateTimeRange(start: widget.route.routeDate, end: widget.route.routeDate));
    final options = all.where((x) => x.id != widget.route.id).toList();
    final selected = <int>{};
    if (!mounted) return [];
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => SafeArea(
          child: SizedBox(
            height: MediaQuery.of(ctx).size.height * .72,
            child: Column(children: [
              const Padding(padding: EdgeInsets.all(18), child: Text('Ще експедитори під цей тариф', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900))),
              Expanded(
                child: ListView.builder(
                  itemCount: options.length,
                  itemBuilder: (_, i) {
                    final r = options[i];
                    return CheckboxListTile(
                      value: selected.contains(r.id),
                      title: Text(r.expeditor),
                      subtitle: Text('ID ${r.routeDeliveryId} · ${r.points} ТТ'),
                      onChanged: (v) => setLocal(() => v == true ? selected.add(r.id) : selected.remove(r.id)),
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Готово')),
              ),
            ]),
          ),
        ),
      ),
    );
    if (ok != true) return [];
    return options.where((x) => selected.contains(x.id)).toList();
  }

  Future<void> save() async {
    if (driver == null || vehicle == null || carrier == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Оберіть водія, авто та перевізника')));
      return;
    }
    final deliveredValue = int.tryParse(delivered.text) ?? 0;
    if (deliveredValue < 0 || deliveredValue > totalActualPoints) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Факт доставлених ТТ має бути від 0 до $totalActualPoints')));
      return;
    }
    setState(() => saving = true);
    try {
      await widget.repo.claimRoute(widget.route);
      await widget.repo.replaceExtras(widget.route.id, 'vt', usesVt ? selectedVt : {});
      await widget.repo.replaceExtras(widget.route.id, 'extra_tt', selectedExtra);
      final tariffValue = double.tryParse(tariff.text.replaceAll(',', '.'));
      double? autoTariffValue;
      if (autoCarrier != null) {
        final points = await pointsFuture;
        final unresolved = points.any((p) => p.zone == null || p.calculatedCost == null);
        if (!unresolved) {
          autoTariffValue = points.fold<double>(0, (sum, p) => sum + p.calculatedCost!);
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('STV/SAV: є ТТ без визначеної зони. Маршрут збережено без фінального тарифу.')),
          );
        }
      }
      String? groupId;
      List<RouteModel> partners = [];
      if (autoCarrier == null && carrier != 'ТОВ ТС ПЛЮС') {
        final hasPartners = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Є ще експедитори під цей тариф?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Ні')),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Так')),
            ],
          ),
        );
        if (hasPartners == true) {
          partners = await chooseTariffPartners();
          if (partners.isNotEmpty) groupId = newUuid();
        }
      }
      await widget.repo.saveFact(
        route: widget.route,
        driver: driver!,
        vehicle: vehicle!,
        carrier: autoCarrier ?? carrier!,
        wave: wave,
        tariff: autoCarrier == null ? tariffValue : autoTariffValue,
        tariffUnknown: autoCarrier == null ? tariffUnknown : false,
        comment: comment.text.trim(),
        deliveredPoints: deliveredValue,
        departureTime: departure == null ? null : '${departure!.hour.toString().padLeft(2, '0')}:${departure!.minute.toString().padLeft(2, '0')}:00',
        tariffGroupId: groupId,
      );
      if (groupId != null && partners.isNotEmpty) {
        await widget.repo.linkTariffGroup(routes: partners, groupId: groupId, tariff: tariffValue, tariffUnknown: tariffUnknown);
      }
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
    final effectiveCarrier = autoCarrier ?? carrier;
    return Scaffold(
      appBar: AppBar(title: Text('Маршрут ${r.routeDeliveryId}')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('ID ${r.routeDeliveryId}', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
                const SizedBox(height: 5),
                Text(r.expeditor),
                const SizedBox(height: 8),
                Text('${shippingRegion(r.warehouse)} · ${r.warehouse}', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                const SizedBox(height: 14),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  Chip(label: Text('${r.points} системних ТТ')),
                  Chip(label: Text('${nf2(r.pallets)} палет')),
                  Chip(label: Text('${nf0(r.bottles)} пляшок')),
                  Chip(label: Text('${r.documents} накладних')),
                ]),
                const SizedBox(height: 10),
                Text('Продажі: ${money0(r.orderAmount)} грн', style: const TextStyle(fontWeight: FontWeight.w700)),
              ]),
            ),
          ),
          const SizedBox(height: 18),
          Text('Фактичні дані логіста', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          _DropAddField(label: 'Водій', value: driver, items: drivers, onChanged: (v) => setState(() => driver = v), onAdd: addDriver),
          const SizedBox(height: 12),
          _DropAddField(label: 'Авто · марка та держ. номер', value: vehicle, items: vehicles, onChanged: (v) => setState(() => vehicle = v), onAdd: addVehicle),
          const SizedBox(height: 12),
          if (autoCarrier != null)
            InputDecorator(
              decoration: const InputDecoration(labelText: 'Перевізник · автоматично'),
              child: Row(children: [const Icon(Icons.auto_awesome, size: 18, color: brandBlue), const SizedBox(width: 8), Text(autoCarrier!, style: const TextStyle(fontWeight: FontWeight.w900))]),
            )
          else
            _DropAddField(label: 'Перевізник', value: carrier, items: carriers, onChanged: (v) => setState(() => carrier = v), onAdd: addCarrier),
          const SizedBox(height: 12),
          _DropAddField(label: 'Хвиля', value: wave, items: waves, onChanged: (v) => setState(() => wave = v ?? wave), onAdd: addWave),
          if (usesVt) ...[
            const SizedBox(height: 18),
            MultiChoiceBlock(title: 'ВТ', items: vtCatalog, selected: selectedVt, onChanged: (x) => setState(() => selectedVt = x), onAdd: () => addExtraCatalog('vt')),
          ],
          const SizedBox(height: 18),
          MultiChoiceBlock(title: 'Додаткові ТТ', items: extraCatalog, selected: selectedExtra, onChanged: (x) => setState(() => selectedExtra = x), onAdd: () => addExtraCatalog('extra_tt')),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                Expanded(child: Text('Фактична кількість ТТ', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800))),
                Text('$totalActualPoints', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: brandBlue)),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: delivered,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Факт доставлених ТТ',
              suffixIcon: IconButton(
                tooltip: 'Доставлено всі',
                onPressed: () => setState(() => delivered.text = '$totalActualPoints'),
                icon: const Icon(Icons.done_all),
              ),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => setState(() => departure = TimeOfDay.now()),
            icon: const Icon(Icons.schedule),
            label: Text(departure == null ? 'Фактичний виїзд · Зараз' : 'Виїзд ${departure!.format(context)}'),
          ),
          TextButton(onPressed: pickDeparture, child: const Text('Ввести час вручну')),
          if (autoCarrier == null && effectiveCarrier != 'ТОВ ТС ПЛЮС') ...[
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Без тарифу'),
              value: tariffUnknown,
              onChanged: (v) => setState(() => tariffUnknown = v),
            ),
            if (!tariffUnknown)
              TextField(
                controller: tariff,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Тариф, грн · вводиться вручну'),
              ),
          ],
          if (effectiveCarrier == 'ТОВ ТС ПЛЮС')
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('ТОВ ТС ПЛЮС: тариф у маршруті не запитується. Витрати розподіляються керівником за місяць.'))),
          if (autoCarrier != null)
            Card(child: Padding(padding: const EdgeInsets.all(16), child: Text('$autoCarrier: тариф розраховується автоматично за зоною та мат. палетами.'))),
          const SizedBox(height: 14),
          TextField(controller: comment, maxLines: 3, decoration: const InputDecoration(labelText: 'Коментар')),
          const SizedBox(height: 22),
          FilledButton(
            onPressed: saving ? null : save,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
            child: saving ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Зберегти маршрут'),
          ),
          const SizedBox(height: 24),
          Text('Точки доставки', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          FutureBuilder<List<RoutePointModel>>(
            future: pointsFuture,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) return const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()));
              final points = snap.data ?? [];
              if (points.isEmpty) return const Text('Точки доставки не знайдено');
              return FutureBuilder<List<SourceDocumentModel>>(
                future: documentsFuture,
                builder: (context, docSnap) {
                  final docs = docSnap.data ?? [];
                  return Column(children: points.map((p) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: PointCard(
                      point: p,
                      autoCarrier: autoCarrier,
                      documents: docs,
                      onZoneChanged: autoCarrier == null ? null : (zone) async {
                        await widget.repo.saveZoneOverride(p, autoCarrier!, zone);
                        setState(() => pointsFuture = widget.repo.loadRoutePoints(widget.route, autoCarrier: autoCarrier));
                      },
                    ),
                  )).toList());
                },
              );
            },
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}

class _DropAddField extends StatelessWidget {
  const _DropAddField({required this.label, required this.value, required this.items, required this.onChanged, required this.onAdd});
  final String label;
  final String? value;
  final List<String> items;
  final ValueChanged<String?> onChanged;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final list = <String>{...items}.toList();
    final safeValue = value != null && list.contains(value) ? value : null;
    return Row(children: [
      Expanded(
        child: DropdownButtonFormField<String>(
          value: safeValue,
          isExpanded: true,
          decoration: InputDecoration(labelText: label),
          items: list.map((x) => DropdownMenuItem(value: x, child: Text(x, overflow: TextOverflow.ellipsis))).toList(),
          onChanged: onChanged,
        ),
      ),
      const SizedBox(width: 8),
      IconButton.filledTonal(tooltip: 'Додати', onPressed: onAdd, icon: const Icon(Icons.add)),
    ]);
  }
}

class MultiChoiceBlock extends StatelessWidget {
  const MultiChoiceBlock({required this.title, required this.items, required this.selected, required this.onChanged, required this.onAdd, super.key});
  final String title;
  final List<String> items;
  final Set<String> selected;
  final ValueChanged<Set<String>> onChanged;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w900))),
            TextButton.icon(onPressed: onAdd, icon: const Icon(Icons.add, size: 18), label: const Text('Додати')),
          ]),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: items.map((x) => FilterChip(
              label: Text(x),
              selected: selected.contains(x),
              onSelected: (v) {
                final next = Set<String>.from(selected);
                v ? next.add(x) : next.remove(x);
                onChanged(next);
              },
            )).toList(),
          ),
        ]),
      ),
    );
  }
}

class PointCard extends StatelessWidget {
  const PointCard({required this.point, required this.documents, this.autoCarrier, this.onZoneChanged, super.key});
  final RoutePointModel point;
  final List<SourceDocumentModel> documents;
  final String? autoCarrier;
  final ValueChanged<int>? onZoneChanged;

  @override
  Widget build(BuildContext context) {
    final pointDocs = documents.where((d) => d.customer == point.customer || d.addressId.isEmpty).toList();
    return Card(
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        title: Text(point.customer.isEmpty ? 'Точка доставки' : point.customer, style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (point.address.isNotEmpty) Text(point.address),
          Text('${point.settlement}${point.district.isEmpty ? '' : ' · ${point.district}'}'),
          const SizedBox(height: 5),
          Wrap(spacing: 8, runSpacing: 4, children: [
            Text('${point.documents} накл.'),
            Text('${nf2(point.pallets)} пал.'),
            Text('${nf0(point.bottles)} пляш.'),
            if (autoCarrier != null)
              Text(point.zone == null ? '⚠️ Зона не визначена' : 'Зона ${point.zone}', style: TextStyle(color: point.zone == null ? Colors.orange : brandBlue, fontWeight: FontWeight.w800)),
          ]),
        ]),
        trailing: autoCarrier == null
            ? null
            : PopupMenuButton<int>(
                tooltip: 'Змінити зону',
                onSelected: onZoneChanged,
                itemBuilder: (_) => [1, 2, 3, 4, 5].map((z) => PopupMenuItem(value: z, child: Text('Зона $z'))).toList(),
                child: const Icon(Icons.tune),
              ),
        children: [
          if (point.calculatedCost != null)
            Align(alignment: Alignment.centerLeft, child: Padding(padding: const EdgeInsets.only(bottom: 10), child: Text('Вартість доставки ТТ: ${money2(point.calculatedCost!)} грн', style: const TextStyle(fontWeight: FontWeight.w900)))),
          if (pointDocs.isEmpty)
            const Align(alignment: Alignment.centerLeft, child: Text('Накладні не завантажені або немає доступу до source_documents.'))
          else
            ...pointDocs.map((d) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: .45), borderRadius: BorderRadius.circular(12)),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Накладна ${d.code.isEmpty ? '—' : d.code}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text('${d.business} · ${nf2(d.pallets)} пал. · ${nf0(d.bottles)} пляш.'),
                ])),
                Text('${money2(d.amount)} грн', style: const TextStyle(fontWeight: FontWeight.w900)),
              ]),
            )),
        ],
      ),
    );
  }
}

class ReportsPage extends StatelessWidget {
  const ReportsPage({required this.repo, required this.period, super.key});
  final RouteRepository repo;
  final DateTimeRange period;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: FutureBuilder<List<RouteModel>>(
        future: repo.loadRoutes(period),
        builder: (context, snapshot) {
          final routes = snapshot.data ?? const <RouteModel>[];
          final tt = routes.fold<int>(0, (s, r) => s + r.totalActualPoints);
          final pallets = routes.fold<double>(0, (s, r) => s + r.pallets);
          final weight = routes.fold<double>(0, (s, r) => s + r.weight);
          final spend = routes.fold<double>(0, (s, r) => s + (r.tariff ?? 0));
          final sales = routes.fold<double>(0, (s, r) => s + r.orderAmount);
          final noTariff = routes.where((r) => r.tariff == null && r.carrier != 'ТОВ ТС ПЛЮС').length;
          return ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              PageHeader(title: 'Звіти', subtitle: periodLabel(period)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(children: [
                      ReportRow(label: 'ТТ', value: '$tt'),
                      ReportRow(label: 'Палет', value: nf2(pallets)),
                      ReportRow(label: 'Вага, кг', value: nf0(weight)),
                      ReportRow(label: 'Витрати, грн', value: money0(spend)),
                      ReportRow(label: 'Продажі, грн', value: money0(sales)),
                      ReportRow(label: 'Вартість 1 ТТ, грн', value: tt == 0 ? '0' : money2(spend / tt)),
                      ReportRow(label: '% логістики', value: sales == 0 ? '0%' : '${(spend / sales * 100).toStringAsFixed(2)}%'),
                      ReportRow(label: 'Без тарифу', value: '$noTariff авто', last: true),
                    ]),
                  ),
                ),
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
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(children: [
          Expanded(child: Text(label)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF2BB673))),
        ]),
      ),
      if (!last) const Divider(height: 1),
    ]);
  }
}

class MorePage extends StatelessWidget {
  const MorePage({required this.repo, required this.demo, super.key});
  final RouteRepository repo;
  final bool demo;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(children: [
        const PageHeader(title: 'Ще', subtitle: 'Керування Transport Report TS'),
        ValueListenableBuilder<ThemeMode>(
          valueListenable: appTheme,
          builder: (_, mode, __) => SwitchListTile(
            secondary: Icon(mode == ThemeMode.dark ? Icons.dark_mode_outlined : Icons.light_mode_outlined),
            title: const Text('Темна тема'),
            subtitle: const Text('Можна переключити на світлу'),
            value: mode == ThemeMode.dark,
            onChanged: (_) => appTheme.toggle(),
          ),
        ),
        const Divider(),
        const ListTile(leading: Icon(Icons.people_outline), title: Text('Користувачі та ролі'), subtitle: Text('Admin · Керівник · Логіст')),
        const ListTile(leading: Icon(Icons.local_shipping_outlined), title: Text('Водії та авто'), subtitle: Text('Довідники + автоматична прив’язка до експедитора')),
        const ListTile(leading: Icon(Icons.business_outlined), title: Text('Перевізники'), subtitle: Text('Київські рейсові перевізники')),
        ListTile(
          leading: const Icon(Icons.price_change_outlined),
          title: const Text('Тарифи STV / SAV'),
          subtitle: const Text('Місячні ставки: 1 ТТ + зони 1–5'),
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => MonthlyTariffsPage(repo: repo))),
        ),
        const ListTile(leading: Icon(Icons.account_balance_wallet_outlined), title: Text('Витрати ТС ПЛЮС'), subtitle: Text('Місячний розподіл по напрямках')),
        const ListTile(leading: Icon(Icons.warning_amber_rounded), title: Text('STV/SAV без зони'), subtitle: Text('Ручне визначення зони та коригування тарифу')),
        const ListTile(leading: Icon(Icons.history), title: Text('Історія маршрутів і коригувань')),
        if (demo) const ListTile(leading: Icon(Icons.science_outlined), title: Text('Demo mode')),
        if (!demo)
          ListTile(leading: const Icon(Icons.logout), title: const Text('Вийти'), onTap: () => Supabase.instance.client.auth.signOut()),
      ]),
    );
  }
}

class MonthlyTariffsPage extends StatefulWidget {
  const MonthlyTariffsPage({required this.repo, super.key});
  final RouteRepository repo;
  @override
  State<MonthlyTariffsPage> createState() => _MonthlyTariffsPageState();
}

class _MonthlyTariffsPageState extends State<MonthlyTariffsPage> {
  String carrier = 'STV';
  DateTime month = DateTime(DateTime.now().year, DateTime.now().month, 1);
  final fixed = TextEditingController();
  final zones = List.generate(5, (_) => TextEditingController());
  bool loading = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    fixed.dispose();
    for (final c in zones) c.dispose();
    super.dispose();
  }

  Future<void> load() async {
    setState(() => loading = true);
    final t = await widget.repo.loadZoneTariff(carrier, month);
    if (!mounted) return;
    setState(() {
      loading = false;
      fixed.text = t?.ttFixed.toStringAsFixed(2) ?? '';
      for (var i = 0; i < 5; i++) zones[i].text = t?.rates[i].toStringAsFixed(2) ?? '';
    });
  }

  Future<void> pickMonth() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: month,
      firstDate: DateTime(2024, 1, 1),
      lastDate: DateTime(2035, 12, 31),
      helpText: 'Оберіть будь-який день потрібного місяця',
    );
    if (picked != null) {
      month = DateTime(picked.year, picked.month, 1);
      await load();
    }
  }

  Future<void> save() async {
    final rates = zones.map((c) => double.tryParse(c.text.replaceAll(',', '.')) ?? 0).toList();
    final t = ZoneTariff(
      carrier: carrier,
      month: month,
      ttFixed: double.tryParse(fixed.text.replaceAll(',', '.')) ?? 0,
      rates: rates,
    );
    try {
      await widget.repo.saveMonthlyTariff(t);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Тарифи місяця збережено. Розрахунок STV/SAV використовує нові ставки.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Тарифи STV / SAV')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          SegmentedButton<String>(
            segments: const [ButtonSegment(value: 'STV', label: Text('STV')), ButtonSegment(value: 'SAV', label: Text('SAV'))],
            selected: {carrier},
            onSelectionChanged: (v) async { carrier = v.first; await load(); },
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(onPressed: pickMonth, icon: const Icon(Icons.calendar_month), label: Text(DateFormat('LLLL yyyy', 'uk_UA').format(month))),
          const SizedBox(height: 16),
          if (loading) const LinearProgressIndicator(),
          TextField(controller: fixed, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Фікс за 1 ТТ / замовлення, грн')),
          const SizedBox(height: 12),
          for (var i = 0; i < 5; i++) ...[
            TextField(controller: zones[i], keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: 'Зона ${i + 1} · грн / мат. палету')),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 8),
          FilledButton.icon(onPressed: save, icon: const Icon(Icons.save_outlined), label: const Text('Зберегти тарифи місяця')),
        ],
      ),
    );
  }
}

String shippingRegion(String warehouse) {
  final w = warehouse.trim().toLowerCase();
  if (w.isEmpty) return 'Регіон не визначено';
  if (w.contains('льв')) return 'Львів';
  if (w.contains('одес')) return 'Одеса';
  if (w.contains('дніпр') || w.contains('днепр')) return 'Дніпро';
  if (w.contains('харків') || w.contains('харьков')) return 'Харків';
  if (w.contains('вінниц') || w.contains('винниц')) return 'Вінниця';
  if (w.contains('черкас')) return 'Черкаси';
  if (w.contains('черніг') || w.contains('черниг')) return 'Чернігів';
  if (w.contains('полтав')) return 'Полтава';
  if (w.contains('хмельниц')) return 'Хмельницький';
  if (w.contains('рівн') || w.contains('ровн')) return 'Рівне';
  if (w.contains('луцьк') || w.contains('волин')) return 'Луцьк';
  if (w.contains('ужгород') || w.contains('закарпат')) return 'Ужгород';
  if (w.contains('франків') || w.contains('франков')) return 'Івано-Франківськ';
  if (w.contains('чернів') || w.contains('чернов')) return 'Чернівці';
  if (w.contains('терноп')) return 'Тернопіль';
  if (w.contains('кременч')) return 'Кременчук';
  if (w.contains('біла церк') || w.contains('белая церк')) return 'Біла Церква';
  if (w.contains('уман')) return 'Умань';
  if (w.contains('розум') || w.contains('чайк') || w.contains('білогород') || w.contains('белогород') || w.contains('київ') || w.contains('киев')) return 'Київ';
  return warehouse;
}

String normalizeBusiness(String raw) {
  final x = raw.toLowerCase();
  if (x.contains('дистр')) return 'Дистрибуція';
  if (x.contains('horeca') || x.contains('хорека') || x.contains('хо ре ка')) return 'ХоРеКа';
  if (x.contains('крафт')) return 'Крафт';
  return raw.trim();
}

String fmtDate(DateTime d) => DateFormat('yyyy-MM-dd').format(d);
String periodLabel(DateTimeRange r) => DateUtils.isSameDay(r.start, r.end)
    ? DateFormat('dd.MM.yyyy').format(r.start)
    : '${DateFormat('dd.MM.yyyy').format(r.start)} — ${DateFormat('dd.MM.yyyy').format(r.end)}';
String nf0(num value) => NumberFormat('#,##0', 'uk_UA').format(value).replaceAll('\u00A0', ' ');
String nf2(num value) => NumberFormat('#,##0.##', 'uk_UA').format(value).replaceAll('\u00A0', ' ');
String money0(num value) => NumberFormat('#,##0', 'uk_UA').format(value).replaceAll('\u00A0', ' ');
String money2(num value) => NumberFormat('#,##0.00', 'uk_UA').format(value).replaceAll('\u00A0', ' ');

String newUuid() {
  final r = Random.secure();
  final bytes = List<int>.generate(16, (_) => r.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String h(int b) => b.toRadixString(16).padLeft(2, '0');
  final s = bytes.map(h).join();
  return '${s.substring(0, 8)}-${s.substring(8, 12)}-${s.substring(12, 16)}-${s.substring(16, 20)}-${s.substring(20)}';
}

extension FirstOrNullExtension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
