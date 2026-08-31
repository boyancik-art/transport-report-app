import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
bool get demoMode => supabaseUrl.isEmpty || supabaseAnonKey.isEmpty;

const bg = Color(0xFF090B0E);
const surface = Color(0xFF111419);
const surface2 = Color(0xFF171B21);
const line = Color(0xFF292E36);
const muted = Color(0xFF9098A4);
const accent = Color(0xFFC6A36A);
const good = Color(0xFF69B58D);
const warn = Color(0xFFE0B465);
const bad = Color(0xFFD97878);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!demoMode) {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  }
  runApp(const RetailApp());
}

ThemeData appTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: accent,
    brightness: Brightness.dark,
    surface: surface,
  );
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: bg,
    dividerColor: line,
    cardTheme: const CardThemeData(
      color: surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
        side: BorderSide(color: line),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: bg,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface2,
      labelStyle: const TextStyle(color: muted),
      hintStyle: const TextStyle(color: muted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: accent, width: 1.2),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: line),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: accent,
        foregroundColor: const Color(0xFF17120C),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: surface,
      indicatorColor: Color(0x2FC6A36A),
      surfaceTintColor: Colors.transparent,
    ),
    navigationRailTheme: const NavigationRailThemeData(
      backgroundColor: surface,
      indicatorColor: Color(0x2FC6A36A),
    ),
  );
}

class RetailApp extends StatelessWidget {
  const RetailApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Transport Control · Retail',
      theme: appTheme(),
      home: demoMode ? const Shell(demo: true) : const AuthGate(),
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
  Widget build(BuildContext context) =>
      session == null ? const SignInPage() : const Shell(demo: false);
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
  Future<void> login() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) return;
    setState(() { busy = true; error = null; });
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
                const BrandMark(size: 68),
                const SizedBox(height: 26),
                Text('Transport Control', textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900, letterSpacing: -.8)),
                const SizedBox(height: 6),
                const Text('Retail · фактичний облік маршрутів',
                    textAlign: TextAlign.center, style: TextStyle(color: muted)),
                const SizedBox(height: 30),
                TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                TextField(controller: password, obscureText: true,
                    decoration: const InputDecoration(labelText: 'Пароль'),
                    onSubmitted: (_) => login()),
                if (error != null) ...[
                  const SizedBox(height: 10),
                  Text(error!, style: const TextStyle(color: bad)),
                ],
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: busy ? null : login,
                  child: busy
                      ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Увійти'),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class BrandMark extends StatelessWidget {
  const BrandMark({this.size = 46, super.key});
  final double size;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: size, height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: surface2,
          borderRadius: BorderRadius.circular(size * .25),
          border: Border.all(color: const Color(0xFF343A43)),
        ),
        child: Text('TC', style: TextStyle(color: accent,
            fontSize: size * .31, fontWeight: FontWeight.w900, letterSpacing: -1)),
      ),
    );
  }
}

class StoreModel {
  const StoreModel({required this.id, required this.name, this.direction});
  final int id;
  final String name;
  final String? direction;
  factory StoreModel.fromJson(Map<String,dynamic> x) => StoreModel(
    id: (x['id'] as num).toInt(), name: '${x['name'] ?? ''}',
    direction: x['direction']?.toString(),
  );
}

class VehicleModel {
  const VehicleModel({required this.id, required this.plate, this.carrier, this.palletCapacity, this.maxWeightKg});
  final int id;
  final String plate;
  final String? carrier;
  final double? palletCapacity;
  final double? maxWeightKg;
  factory VehicleModel.fromJson(Map<String,dynamic> x) => VehicleModel(
    id: (x['id'] as num).toInt(), plate: '${x['plate'] ?? ''}',
    carrier: x['carrier']?.toString(),
    palletCapacity: (x['pallet_capacity'] as num?)?.toDouble(),
    maxWeightKg: (x['max_weight_kg'] as num?)?.toDouble(),
  );
}

class DriverModel {
  const DriverModel({required this.id, required this.name, this.defaultVehicleId});
  final int id;
  final String name;
  final int? defaultVehicleId;
  factory DriverModel.fromJson(Map<String,dynamic> x) => DriverModel(
    id: (x['id'] as num).toInt(), name: '${x['name'] ?? ''}',
    defaultVehicleId: (x['default_vehicle_id'] as num?)?.toInt(),
  );
}

class RoutePointDraft {
  RoutePointDraft({required this.store, this.pallets = 0, this.weightKg = 0, this.note = ''});
  final StoreModel store;
  double pallets;
  double weightKg;
  String note;
}

class ExtraPointDraft {
  ExtraPointDraft({required this.type, required this.name, this.address = '', this.contact = '', this.pallets = 0, this.weightKg = 0, this.note = ''});
  String type;
  String name;
  String address;
  String contact;
  double pallets;
  double weightKg;
  String note;
}

class TemplateModel {
  const TemplateModel({required this.id, required this.name, required this.warehouse, required this.temperature, required this.useCount, required this.stores});
  final int id;
  final String name;
  final String warehouse;
  final String? temperature;
  final int useCount;
  final List<StoreModel> stores;

  factory TemplateModel.fromJson(Map<String,dynamic> x) {
    final stores = <StoreModel>[];
    final raw = x['tc_retail_route_template_points'];
    if (raw is List) {
      final copy = raw.whereType<Map>().map((e) => Map<String,dynamic>.from(e)).toList();
      copy.sort((a,b) => ((a['sort_order'] as num?)?.toInt() ?? 0).compareTo((b['sort_order'] as num?)?.toInt() ?? 0));
      for (final row in copy) {
        final s = row['tc_retail_stores'];
        if (s is Map) stores.add(StoreModel.fromJson(Map<String,dynamic>.from(s)));
      }
    }
    return TemplateModel(
      id: (x['id'] as num).toInt(), name: '${x['name'] ?? ''}',
      warehouse: '${x['warehouse'] ?? ''}', temperature: x['temperature']?.toString(),
      useCount: (x['use_count'] as num? ?? 0).toInt(), stores: stores,
    );
  }
}

class RouteModel {
  const RouteModel({
    required this.id, required this.date, required this.warehouse, required this.status,
    required this.points, required this.extras,
    this.temperature, this.vehicle, this.driver, this.carrier, this.routeNo, this.tariff, this.comment,
  });
  final int id;
  final DateTime date;
  final String warehouse;
  final String status;
  final String? temperature;
  final VehicleModel? vehicle;
  final String? driver;
  final String? carrier;
  final String? routeNo;
  final double? tariff;
  final String? comment;
  final List<RoutePointDraft> points;
  final List<ExtraPointDraft> extras;

  int get tt => points.length + extras.length;
  double get pallets => points.fold(0.0,(s,p)=>s+p.pallets) + extras.fold(0.0,(s,p)=>s+p.pallets);
  double get weightKg => points.fold(0.0,(s,p)=>s+p.weightKg) + extras.fold(0.0,(s,p)=>s+p.weightKg);
  double get loadPercent {
    final pCap = vehicle?.palletCapacity ?? 0;
    final wCap = vehicle?.maxWeightKg ?? 0;
    final byPal = pCap > 0 ? pallets / pCap : 0;
    final byWeight = wCap > 0 ? weightKg / wCap : 0;
    return [byPal, byWeight].reduce((a,b)=>a>b?a:b) * 100;
  }

  factory RouteModel.fromJson(Map<String,dynamic> x) {
    VehicleModel? vehicle;
    final vr = x['tc_retail_vehicles'];
    if (vr is Map) vehicle = VehicleModel.fromJson(Map<String,dynamic>.from(vr));
    final points = <RoutePointDraft>[];
    final pr = x['tc_retail_route_points'];
    if (pr is List) {
      final copy = pr.whereType<Map>().map((e)=>Map<String,dynamic>.from(e)).toList();
      copy.sort((a,b)=>((a['sort_order'] as num?)?.toInt() ?? 0).compareTo((b['sort_order'] as num?)?.toInt() ?? 0));
      for (final row in copy) {
        final sr = row['tc_retail_stores'];
        if (sr is! Map) continue;
        points.add(RoutePointDraft(
          store: StoreModel.fromJson(Map<String,dynamic>.from(sr)),
          pallets: (row['pallets'] as num? ?? 0).toDouble(),
          weightKg: (row['weight_kg'] as num? ?? 0).toDouble(),
          note: '${row['note'] ?? ''}',
        ));
      }
    }
    final extras = <ExtraPointDraft>[];
    final er = x['tc_retail_extra_points'];
    if (er is List) {
      for (final raw in er.whereType<Map>()) {
        final row = Map<String,dynamic>.from(raw);
        extras.add(ExtraPointDraft(
          type: '${row['task_type'] ?? 'other'}', name: '${row['name'] ?? ''}',
          address: '${row['address'] ?? ''}', contact: '${row['contact'] ?? ''}',
          pallets: (row['pallets'] as num? ?? 0).toDouble(),
          weightKg: (row['weight_kg'] as num? ?? 0).toDouble(), note: '${row['note'] ?? ''}',
        ));
      }
    }
    return RouteModel(
      id: (x['id'] as num).toInt(),
      date: DateTime.tryParse('${x['route_date']}') ?? DateTime.now(),
      warehouse: '${x['warehouse'] ?? ''}', status: '${x['status'] ?? 'filled'}',
      temperature: x['temperature']?.toString(), vehicle: vehicle,
      driver: x['driver_name']?.toString(), carrier: x['carrier']?.toString(),
      routeNo: x['route_no']?.toString(), tariff: (x['tariff'] as num?)?.toDouble(),
      comment: x['comment']?.toString(), points: points, extras: extras,
    );
  }
}

class Repo {
  Repo(this.demo);
  final bool demo;
  SupabaseClient get db => Supabase.instance.client;

  Future<List<StoreModel>> stores() async {
    if (demo) return demoStores;
    final r = await db.from('tc_retail_stores').select('id,name,direction').eq('is_active',true).neq('name','Додаткова ТТ').order('name');
    return (r as List).map((e)=>StoreModel.fromJson(Map<String,dynamic>.from(e as Map))).toList();
  }
  Future<List<VehicleModel>> vehicles() async {
    if (demo) return demoVehicles;
    final r = await db.from('tc_retail_vehicles').select('id,plate,carrier,pallet_capacity,max_weight_kg').eq('is_active',true).order('plate');
    return (r as List).map((e)=>VehicleModel.fromJson(Map<String,dynamic>.from(e as Map))).toList();
  }
  Future<List<DriverModel>> drivers() async {
    if (demo) return demoDrivers;
    final r = await db.from('tc_retail_drivers').select('id,name,default_vehicle_id').eq('is_active',true).order('name');
    return (r as List).map((e)=>DriverModel.fromJson(Map<String,dynamic>.from(e as Map))).toList();
  }
  Future<List<TemplateModel>> templates() async {
    if (demo) return demoTemplates;
    final r = await db.from('tc_retail_route_templates')
      .select('id,name,warehouse,temperature,use_count,tc_retail_route_template_points(sort_order,tc_retail_stores(id,name,direction))')
      .eq('is_active',true).order('use_count',ascending:false).order('name');
    return (r as List).map((e)=>TemplateModel.fromJson(Map<String,dynamic>.from(e as Map))).toList();
  }
  Future<List<RouteModel>> routes(DateTimeRange range) async {
    if (demo) return demoRoutes;
    final from = DateFormat('yyyy-MM-dd').format(range.start);
    final to = DateFormat('yyyy-MM-dd').format(range.end);
    final r = await db.from('tc_retail_routes')
      .select('id,route_date,warehouse,temperature,driver_name,carrier,route_no,tariff,comment,status,tc_retail_vehicles(id,plate,carrier,pallet_capacity,max_weight_kg),tc_retail_route_points(pallets,weight_kg,note,sort_order,tc_retail_stores(id,name,direction)),tc_retail_extra_points(task_type,name,address,contact,pallets,weight_kg,note)')
      .gte('route_date',from).lte('route_date',to).neq('status','cancelled')
      .order('route_date',ascending:false).order('created_at',ascending:false);
    return (r as List).map((e)=>RouteModel.fromJson(Map<String,dynamic>.from(e as Map))).toList();
  }

  Future<int> saveRoute({
    int? routeId,
    required DateTime date, required String warehouse, required String? temperature,
    required VehicleModel vehicle, required String driver, required String routeNo,
    required double? tariff, required String comment,
    required List<RoutePointDraft> points, required List<ExtraPointDraft> extras,
  }) async {
    if (demo) return routeId ?? DateTime.now().millisecondsSinceEpoch;
    final uid = db.auth.currentUser?.id;
    final payload = {
      'route_date': DateFormat('yyyy-MM-dd').format(date), 'warehouse': warehouse,
      'temperature': temperature, 'vehicle_id': vehicle.id, 'driver_name': driver,
      'carrier': vehicle.carrier, 'route_no': routeNo.trim().isEmpty ? null : routeNo.trim(),
      'tariff': tariff, 'comment': comment.trim().isEmpty ? null : comment.trim(),
      'status': tariff == null ? 'needs_attention' : 'filled', 'created_by': uid,
      'updated_at': DateTime.now().toIso8601String(),
    };
    int id;
    if (routeId == null) {
      final r = await db.from('tc_retail_routes').insert(payload).select('id').single();
      id = (r['id'] as num).toInt();
    } else {
      await db.from('tc_retail_routes').update(payload).eq('id',routeId);
      id = routeId;
      await db.from('tc_retail_route_points').delete().eq('route_id',id);
      await db.from('tc_retail_extra_points').delete().eq('route_id',id);
    }
    if (points.isNotEmpty) {
      await db.from('tc_retail_route_points').insert([
        for (var i=0;i<points.length;i++) {
          'route_id': id, 'store_id': points[i].store.id,
          'pallets': points[i].pallets, 'weight_kg': points[i].weightKg,
          'sort_order': i+1, 'note': points[i].note.trim().isEmpty ? null : points[i].note.trim(),
        }
      ]);
    }
    if (extras.isNotEmpty) {
      await db.from('tc_retail_extra_points').insert([
        for (final x in extras) {
          'route_id': id, 'task_type': x.type, 'name': x.name.trim(),
          'address': x.address.trim().isEmpty ? null : x.address.trim(),
          'contact': x.contact.trim().isEmpty ? null : x.contact.trim(),
          'pallets': x.pallets, 'weight_kg': x.weightKg,
          'note': x.note.trim().isEmpty ? null : x.note.trim(),
        }
      ]);
    }
    return id;
  }

  Future<void> cancelRoute(int id) async {
    if (demo) return;
    await db.from('tc_retail_routes').update({'status':'cancelled','updated_at':DateTime.now().toIso8601String()}).eq('id',id);
  }

  static const demoStores = [
    StoreModel(id:1,name:'WT Бажана',direction:'Київ'),
    StoreModel(id:2,name:'WT Соборний',direction:'Київ'),
    StoreModel(id:3,name:'WT Дмитрівська',direction:'Київ'),
    StoreModel(id:4,name:'WT Філатова',direction:'Київ'),
    StoreModel(id:5,name:'WT Львів',direction:'Захід'),
  ];
  static const demoVehicles = [
    VehicleModel(id:1,plate:'КА 4042 РТ',carrier:'ФОП Діденко',palletCapacity:8,maxWeightKg:3000),
    VehicleModel(id:2,plate:'Корпоратура 20 т.',carrier:'ТОВ Корпоратура',palletCapacity:33,maxWeightKg:20000),
  ];
  static const demoDrivers = [DriverModel(id:1,name:'Руденко Петро',defaultVehicleId:1)];
  static const demoTemplates = [
    TemplateModel(id:1,name:'Бажана + Соборний',warehouse:'Розумовського',temperature:'FRESH',useCount:3,stores:[demoStores[0],demoStores[1]])
  ];
  static final demoRoutes = [
    RouteModel(id:1,date:DateTime.now(),warehouse:'Розумовського',status:'filled',temperature:'FRESH',vehicle:demoVehicles[0],driver:'Руденко Петро',carrier:'ФОП Діденко',routeNo:'1',tariff:4300,comment:null,points:[RoutePointDraft(store:demoStores[0],pallets:4,weightKg:1700),RoutePointDraft(store:demoStores[1],pallets:2,weightKg:800)],extras:[])
  ];
}

class Shell extends StatefulWidget {
  const Shell({required this.demo, super.key});
  final bool demo;
  @override
  State<Shell> createState()=>_ShellState();
}

class _ShellState extends State<Shell> {
  int index=0;
  int refreshKey=0;
  late final Repo repo=Repo(widget.demo);
  DateTimeRange range=DateTimeRange(start:DateUtils.dateOnly(DateTime.now()),end:DateUtils.dateOnly(DateTime.now()));
  void refresh()=>setState(()=>refreshKey++);
  Future<void> pickRange() async {
    final x=await showDateRangePicker(context:context,firstDate:DateTime(2025),lastDate:DateTime(2035),initialDateRange:range,helpText:'Період');
    if(x!=null&&mounted)setState(()=>range=x);
  }
  Future<void> openRoute([RouteModel? route]) async {
    final ok=await Navigator.of(context).push<bool>(MaterialPageRoute(builder:(_)=>RouteEditor(repo:repo,route:route)));
    if(ok==true&&mounted)refresh();
  }
  @override
  Widget build(BuildContext context) {
    final pages=[
      DashboardPage(repo:repo,range:range,refreshKey:refreshKey,onCreate:()=>openRoute()),
      RoutesPage(repo:repo,range:range,refreshKey:refreshKey,onCreate:()=>openRoute(),onEdit:openRoute,onRefresh:refresh),
      ReferencesPage(repo:repo,refreshKey:refreshKey),
      SettingsPage(demo:widget.demo),
    ];
    final wide=MediaQuery.sizeOf(context).width>=960;
    final body=Column(children:[TopBar(range:range,onRange:pickRange,onCreate:()=>openRoute()),Expanded(child:pages[index])]);
    if(wide){
      return Scaffold(body:SafeArea(child:Row(children:[
        NavigationRail(selectedIndex:index,onDestinationSelected:(x)=>setState(()=>index=x),labelType:NavigationRailLabelType.all,
          leading:const Padding(padding:EdgeInsets.only(top:12,bottom:20),child:BrandMark()),destinations:const[
            NavigationRailDestination(icon:Icon(Icons.space_dashboard_outlined),selectedIcon:Icon(Icons.space_dashboard),label:Text('Огляд')),
            NavigationRailDestination(icon:Icon(Icons.route_outlined),selectedIcon:Icon(Icons.route),label:Text('Маршрути')),
            NavigationRailDestination(icon:Icon(Icons.inventory_2_outlined),selectedIcon:Icon(Icons.inventory_2),label:Text('Довідники')),
            NavigationRailDestination(icon:Icon(Icons.tune_outlined),selectedIcon:Icon(Icons.tune),label:Text('Ще')),
          ]),
        const VerticalDivider(width:1),Expanded(child:body)
      ])));
    }
    return Scaffold(body:SafeArea(child:body),bottomNavigationBar:NavigationBar(selectedIndex:index,onDestinationSelected:(x)=>setState(()=>index=x),destinations:const[
      NavigationDestination(icon:Icon(Icons.space_dashboard_outlined),selectedIcon:Icon(Icons.space_dashboard),label:'Огляд'),
      NavigationDestination(icon:Icon(Icons.route_outlined),selectedIcon:Icon(Icons.route),label:'Маршрути'),
      NavigationDestination(icon:Icon(Icons.inventory_2_outlined),selectedIcon:Icon(Icons.inventory_2),label:'Довідники'),
      NavigationDestination(icon:Icon(Icons.tune_outlined),selectedIcon:Icon(Icons.tune),label:'Ще'),
    ]));
  }
}

class TopBar extends StatelessWidget {
  const TopBar({required this.range,required this.onRange,required this.onCreate,super.key});
  final DateTimeRange range; final VoidCallback onRange; final VoidCallback onCreate;
  @override
  Widget build(BuildContext context){
    final same=DateUtils.isSameDay(range.start,range.end);
    final label=same?DateFormat('dd.MM.yyyy').format(range.start):'${DateFormat('dd.MM').format(range.start)} — ${DateFormat('dd.MM.yyyy').format(range.end)}';
    return Container(height:72,padding:const EdgeInsets.symmetric(horizontal:18),decoration:const BoxDecoration(border:Border(bottom:BorderSide(color:line))),child:Row(children:[
      const Expanded(child:Column(mainAxisAlignment:MainAxisAlignment.center,crossAxisAlignment:CrossAxisAlignment.start,children:[Text('Transport Control',style:TextStyle(fontSize:18,fontWeight:FontWeight.w900)),SizedBox(height:2),Text('Retail',style:TextStyle(color:muted,fontSize:12))])),
      TextButton.icon(onPressed:onRange,icon:const Icon(Icons.calendar_today_outlined,size:17),label:Text(label)),const SizedBox(width:8),
      FilledButton.icon(onPressed:onCreate,icon:const Icon(Icons.add,size:18),label:const Text('Маршрут')),
    ]));
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({required this.repo,required this.range,required this.refreshKey,required this.onCreate,super.key});
  final Repo repo; final DateTimeRange range; final int refreshKey; final VoidCallback onCreate;
  @override
  Widget build(BuildContext context){
    return FutureBuilder<List<RouteModel>>(key:ValueKey('dash-$refreshKey'),future:repo.routes(range),builder:(context,s){
      if(s.connectionState==ConnectionState.waiting)return const Center(child:CircularProgressIndicator());
      if(s.hasError)return ErrorState('${s.error}');
      final routes=s.data??[];
      final tt=routes.fold<int>(0,(a,b)=>a+b.tt);
      final pal=routes.fold<double>(0,(a,b)=>a+b.pallets);
      final kg=routes.fold<double>(0,(a,b)=>a+b.weightKg);
      final spend=routes.fold<double>(0,(a,b)=>a+(b.tariff??0));
      final attention=routes.where((r)=>r.tariff==null||r.driver==null||r.vehicle==null).length;
      return ListView(padding:const EdgeInsets.all(20),children:[
        const SectionTitle('Операційний огляд','Фактичні маршрути Retail за обраний період'),const SizedBox(height:18),
        LayoutBuilder(builder:(context,b){final c=b.maxWidth>=1100?4:b.maxWidth>=620?2:1;return GridView.count(shrinkWrap:true,physics:const NeverScrollableScrollPhysics(),crossAxisCount:c,crossAxisSpacing:12,mainAxisSpacing:12,childAspectRatio:c==1?2.9:1.9,children:[
          Kpi('Маршрути','${routes.length}','$tt ТТ',Icons.route_outlined),
          Kpi('Палети',numf(pal),'${numf(kg)} кг',Icons.view_in_ar_outlined),
          Kpi('Витрати','${money(spend)} грн',tt==0?'—':'${money(spend/tt)} грн / ТТ',Icons.account_balance_wallet_outlined),
          Kpi('Потребують уваги','$attention','без тарифу / неповні',Icons.warning_amber_rounded),
        ]);}),const SizedBox(height:22),
        Row(children:[const Expanded(child:SectionTitle('Останні маршрути','Внесені сьогодні / у вибраному періоді')),if(routes.isEmpty)TextButton(onPressed:onCreate,child:const Text('Створити'))]),const SizedBox(height:12),
        if(routes.isEmpty)EmptyState(onCreate:onCreate) else ...routes.take(6).map((r)=>Padding(padding:const EdgeInsets.only(bottom:10),child:RouteCard(route:r))),
      ]);
    });
  }
}

class RoutesPage extends StatelessWidget {
  const RoutesPage({required this.repo,required this.range,required this.refreshKey,required this.onCreate,required this.onEdit,required this.onRefresh,super.key});
  final Repo repo; final DateTimeRange range; final int refreshKey; final VoidCallback onCreate; final Future<void> Function(RouteModel) onEdit; final VoidCallback onRefresh;
  @override
  Widget build(BuildContext context){
    return FutureBuilder<List<RouteModel>>(key:ValueKey('routes-$refreshKey'),future:repo.routes(range),builder:(context,s){
      if(s.connectionState==ConnectionState.waiting)return const Center(child:CircularProgressIndicator());
      if(s.hasError)return ErrorState('${s.error}');
      final routes=s.data??[];
      return ListView(padding:const EdgeInsets.all(20),children:[
        SectionTitle('Реєстр маршрутів','${routes.length} записів'),const SizedBox(height:16),
        if(routes.isEmpty)EmptyState(onCreate:onCreate),
        ...routes.map((r)=>Padding(padding:const EdgeInsets.only(bottom:10),child:RouteCard(route:r,detailed:true,onTap:()=>onEdit(r),onCancel:()async{
          final ok=await confirm(context,'Анульувати маршрут?','Маршрут залишиться в історії зі статусом «Анульовано».');
          if(ok==true){await repo.cancelRoute(r.id);onRefresh();}
        }))),
      ]);
    });
  }
}

class ReferencesPage extends StatelessWidget {
  const ReferencesPage({required this.repo,required this.refreshKey,super.key});
  final Repo repo; final int refreshKey;
  @override
  Widget build(BuildContext context){
    return FutureBuilder<List<dynamic>>(key:ValueKey('refs-$refreshKey'),future:Future.wait([repo.stores(),repo.vehicles(),repo.drivers(),repo.templates()]),builder:(context,s){
      if(s.connectionState==ConnectionState.waiting)return const Center(child:CircularProgressIndicator());
      if(s.hasError)return ErrorState('${s.error}');
      final stores=s.data![0] as List<StoreModel>; final vehicles=s.data![1] as List<VehicleModel>; final drivers=s.data![2] as List<DriverModel>; final templates=s.data![3] as List<TemplateModel>;
      return ListView(padding:const EdgeInsets.all(20),children:[
        const SectionTitle('Довідники Retail','Дані для швидкого стандартизованого введення'),const SizedBox(height:18),
        RefCard(Icons.storefront_outlined,'Торгові точки',stores.length,stores.take(4).map((x)=>x.name).join(' · ')),const SizedBox(height:12),
        RefCard(Icons.local_shipping_outlined,'Автомобілі',vehicles.length,vehicles.take(4).map((x)=>x.plate).join(' · ')),const SizedBox(height:12),
        RefCard(Icons.badge_outlined,'Водії',drivers.length,drivers.take(4).map((x)=>x.name).join(' · ')),const SizedBox(height:12),
        RefCard(Icons.auto_awesome_motion_outlined,'Сталі маршрути',templates.length,'Визначені з повторюваності фактичних рейсів за серпень'),
      ]);
    });
  }
}

class SettingsPage extends StatelessWidget {
  const SettingsPage({required this.demo,super.key}); final bool demo;
  @override
  Widget build(BuildContext context)=>ListView(padding:const EdgeInsets.all(20),children:[
    const SectionTitle('Система','Transport Control · Retail v1.2'),const SizedBox(height:18),
    Card(child:Column(children:[
      const ListTile(leading:Icon(Icons.dark_mode_outlined),title:Text('Стиль'),subtitle:Text('Темний графіт · стриманий преміальний інтерфейс')),
      const Divider(height:1),ListTile(leading:const Icon(Icons.cloud_outlined),title:const Text('Дані'),subtitle:Text(demo?'Demo':'Supabase production')),
      if(!demo)...[const Divider(height:1),ListTile(leading:const Icon(Icons.logout),title:const Text('Вийти'),onTap:()=>Supabase.instance.client.auth.signOut())]
    ]))
  ]);
}

class RouteEditor extends StatefulWidget {
  const RouteEditor({required this.repo,this.route,super.key}); final Repo repo; final RouteModel? route;
  @override
  State<RouteEditor> createState()=>_RouteEditorState();
}

class _RouteEditorState extends State<RouteEditor> {
  late DateTime date;
  late String warehouse;
  String? temperature;
  VehicleModel? vehicle;
  DriverModel? driverChoice;
  final driverText=TextEditingController();
  final routeNo=TextEditingController();
  final tariff=TextEditingController();
  final comment=TextEditingController();
  final points=<RoutePointDraft>[];
  final extras=<ExtraPointDraft>[];
  bool busy=false;
  late Future<List<dynamic>> refs;

  @override
  void initState(){
    super.initState();
    final r=widget.route;
    date=r?.date??DateUtils.dateOnly(DateTime.now());
    warehouse=r?.warehouse??'Розумовського';
    temperature=r?.temperature??'FRESH';
    vehicle=r?.vehicle;
    driverText.text=r?.driver??'';
    routeNo.text=r?.routeNo??'';
    if(r?.tariff!=null)tariff.text=numf(r!.tariff!);
    comment.text=r?.comment??'';
    if(r!=null){
      points.addAll(r.points.map((p)=>RoutePointDraft(store:p.store,pallets:p.pallets,weightKg:p.weightKg,note:p.note)));
      extras.addAll(r.extras.map((x)=>ExtraPointDraft(type:x.type,name:x.name,address:x.address,contact:x.contact,pallets:x.pallets,weightKg:x.weightKg,note:x.note)));
    }
    refs=Future.wait([widget.repo.stores(),widget.repo.vehicles(),widget.repo.drivers(),widget.repo.templates()]);
  }
  @override
  void dispose(){driverText.dispose();routeNo.dispose();tariff.dispose();comment.dispose();super.dispose();}
  double get totalPal=>points.fold(0.0,(s,p)=>s+p.pallets)+extras.fold(0.0,(s,p)=>s+p.pallets);
  double get totalKg=>points.fold(0.0,(s,p)=>s+p.weightKg)+extras.fold(0.0,(s,p)=>s+p.weightKg);

  Future<void> addStore(List<StoreModel> stores,[RoutePointDraft? existing,int? index])async{
    final p=await showDialog<RoutePointDraft>(context:context,builder:(_)=>PointDialog(stores:stores,initial:existing));
    if(p!=null&&mounted)setState((){if(index==null)points.add(p);else points[index]=p;});
  }
  Future<void> addExtra([ExtraPointDraft? existing,int? index])async{
    final p=await showDialog<ExtraPointDraft>(context:context,builder:(_)=>ExtraDialog(initial:existing));
    if(p!=null&&mounted)setState((){if(index==null)extras.add(p);else extras[index]=p;});
  }
  void applyTemplate(TemplateModel t){
    setState((){
      warehouse=t.warehouse; temperature=t.temperature; points.clear();
      points.addAll(t.stores.map((s)=>RoutePointDraft(store:s)));
    });
  }
  Future<void> save()async{
    if(points.isEmpty&&extras.isEmpty){snack(context,'Додайте хоча б одну ТТ або додаткову задачу');return;}
    if(vehicle==null){snack(context,'Оберіть автомобіль');return;}
    final driverName=driverChoice?.name??driverText.text.trim();
    if(driverName.isEmpty){snack(context,'Оберіть або вкажіть водія');return;}
    final badPoint=points.any((p)=>p.pallets<=0&&p.weightKg<=0);
    if(badPoint){snack(context,'Для кожної ТТ вкажіть палети або вагу');return;}
    final parsed=double.tryParse(tariff.text.replaceAll(' ','').replaceAll(',','.'));
    setState(()=>busy=true);
    try{
      await widget.repo.saveRoute(routeId:widget.route?.id,date:date,warehouse:warehouse,temperature:temperature,vehicle:vehicle!,driver:driverName,routeNo:routeNo.text,tariff:parsed,comment:comment.text,points:points,extras:extras);
      if(mounted)Navigator.pop(context,true);
    }catch(e){if(mounted)snack(context,'Не вдалося зберегти: $e');}
    finally{if(mounted)setState(()=>busy=false);}
  }

  @override
  Widget build(BuildContext context){
    return Scaffold(appBar:AppBar(title:Text(widget.route==null?'Новий маршрут Retail':'Маршрут #${widget.route!.id}'),actions:[TextButton(onPressed:busy?null:save,child:const Text('Зберегти'))]),
      body:FutureBuilder<List<dynamic>>(future:refs,builder:(context,s){
        if(s.connectionState==ConnectionState.waiting)return const Center(child:CircularProgressIndicator());
        if(s.hasError)return ErrorState('${s.error}');
        final stores=s.data![0] as List<StoreModel>;final vehicles=s.data![1] as List<VehicleModel>;final drivers=s.data![2] as List<DriverModel>;final templates=s.data![3] as List<TemplateModel>;
        final filteredTemplates=templates.where((t)=>t.warehouse==warehouse).toList();
        if(driverChoice==null&&driverText.text.isNotEmpty){
          for(final d in drivers){if(d.name==driverText.text){driverChoice=d;break;}}
        }
        return ListView(padding:const EdgeInsets.fromLTRB(20,14,20,36),children:[
          const SectionTitle('Основні дані','Фактичний рейс, без планування'),const SizedBox(height:16),
          Wrap(spacing:12,runSpacing:12,children:[
            FieldBox(260,ListTile(contentPadding:const EdgeInsets.symmetric(horizontal:12),title:const Text('Дата',style:TextStyle(color:muted,fontSize:12)),subtitle:Text(DateFormat('dd.MM.yyyy').format(date),style:const TextStyle(fontWeight:FontWeight.w800)),trailing:const Icon(Icons.calendar_month_outlined),onTap:()async{final x=await showDatePicker(context:context,firstDate:DateTime(2025),lastDate:DateTime(2035),initialDate:date);if(x!=null&&mounted)setState(()=>date=x);})),
            SizedBox(width:260,child:DropdownButtonFormField<String>(value:warehouse,decoration:const InputDecoration(labelText:'Склад відправлення'),items:const ['Розумовського','Чайка','Малехів','Білогородка'].map((x)=>DropdownMenuItem(value:x,child:Text(x))).toList(),onChanged:(x)=>setState(()=>warehouse=x??warehouse))),
            SizedBox(width:220,child:DropdownButtonFormField<String>(value:temperature,decoration:const InputDecoration(labelText:'Температура'),items:const ['FRESH','ОЗ','Мультитемп','Сухий'].map((x)=>DropdownMenuItem(value:x,child:Text(x))).toList(),onChanged:(x)=>setState(()=>temperature=x))),
          ]),
          const SizedBox(height:22),
          Row(children:[const Expanded(child:SectionTitle('Сталі маршрути','Побудовані з повторюваних фактичних рейсів')),Text('${filteredTemplates.length}',style:const TextStyle(color:muted))]),const SizedBox(height:10),
          if(filteredTemplates.isNotEmpty)SizedBox(height:52,child:ListView.separated(scrollDirection:Axis.horizontal,itemCount:filteredTemplates.length,separatorBuilder:(_,__)=>const SizedBox(width:8),itemBuilder:(_,i){final t=filteredTemplates[i];return ActionChip(avatar:const Icon(Icons.auto_awesome_motion_outlined,size:17),label:Text('${t.name} · ${t.useCount}×'),onPressed:()=>applyTemplate(t));})),
          const SizedBox(height:22),
          Row(children:[const Expanded(child:SectionTitle('Точки маршруту','Натисніть ТТ, щоб ввести або змінити палети / вагу')),OutlinedButton.icon(onPressed:()=>addStore(stores),icon:const Icon(Icons.add),label:const Text('ТТ'))]),const SizedBox(height:12),
          if(points.isEmpty)HintCard('Оберіть сталий маршрут або додайте ТТ вручну') else Card(child:Column(children:[for(var i=0;i<points.length;i++)...[
            ListTile(onTap:()=>addStore(stores,points[i],i),leading:CircleAvatar(backgroundColor:surface2,foregroundColor:accent,child:Text('${i+1}')),title:Text(points[i].store.name,style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text(points[i].pallets==0&&points[i].weightKg==0?'Вкажіть обсяг':'${numf(points[i].pallets)} пал · ${numf(points[i].weightKg)} кг'),trailing:IconButton(onPressed:()=>setState(()=>points.removeAt(i)),icon:const Icon(Icons.close,size:18))),
            if(i<points.length-1)const Divider(height:1)
          ]])) ,
          const SizedBox(height:18),
          Row(children:[const Expanded(child:SectionTitle('Додаткові задачі','Фестиваль, обладнання, переміщення, повернення та інше')),OutlinedButton.icon(onPressed:()=>addExtra(),icon:const Icon(Icons.add),label:const Text('Задача'))]),const SizedBox(height:12),
          if(extras.isEmpty)HintCard('Необов’язково. Додавайте точкові задачі, які не є постійними ТТ') else Card(child:Column(children:[for(var i=0;i<extras.length;i++)...[
            ListTile(onTap:()=>addExtra(extras[i],i),leading:CircleAvatar(backgroundColor:surface2,foregroundColor:accent,child:Icon(extraIcon(extras[i].type),size:18)),title:Text(extras[i].name,style:const TextStyle(fontWeight:FontWeight.w800)),subtitle:Text('${extraLabel(extras[i].type)} · ${numf(extras[i].pallets)} пал · ${numf(extras[i].weightKg)} кг${extras[i].address.isEmpty?'':' · ${extras[i].address}'}'),trailing:IconButton(onPressed:()=>setState(()=>extras.removeAt(i)),icon:const Icon(Icons.close,size:18))),
            if(i<extras.length-1)const Divider(height:1)
          ]])) ,
          const SizedBox(height:12),Totals(tt:points.length+extras.length,pallets:totalPal,weight:totalKg,vehicle:vehicle),const SizedBox(height:22),
          const SectionTitle('Транспорт','Авто визначає перевізника та місткість'),const SizedBox(height:14),
          Wrap(spacing:12,runSpacing:12,children:[
            SizedBox(width:330,child:DropdownButtonFormField<VehicleModel>(value:vehicle,isExpanded:true,decoration:const InputDecoration(labelText:'Автомобіль'),items:vehicles.map((x)=>DropdownMenuItem(value:x,child:Text('${x.plate} · ${x.carrier??'—'}',overflow:TextOverflow.ellipsis))).toList(),onChanged:(x)=>setState(()=>vehicle=x))),
            SizedBox(width:300,child:DropdownButtonFormField<DriverModel>(value:driverChoice,isExpanded:true,decoration:const InputDecoration(labelText:'Водій з довідника'),items:drivers.map((x)=>DropdownMenuItem(value:x,child:Text(x.name,overflow:TextOverflow.ellipsis))).toList(),onChanged:(x)=>setState((){driverChoice=x;if(x!=null){driverText.text=x.name;if(vehicle==null&&x.defaultVehicleId!=null){for(final v in vehicles){if(v.id==x.defaultVehicleId){vehicle=v;break;}}}}}))),
            SizedBox(width:240,child:TextField(controller:driverText,decoration:const InputDecoration(labelText:'Водій вручну'))),
            SizedBox(width:180,child:TextField(controller:routeNo,decoration:const InputDecoration(labelText:'№ маршруту'))),
            SizedBox(width:190,child:TextField(controller:tariff,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Тариф, грн'))),
          ]),
          if(vehicle!=null)...[const SizedBox(height:10),Text('${vehicle!.carrier??'—'} · ${numf(vehicle!.palletCapacity??0)} пал · ${numf(vehicle!.maxWeightKg??0)} кг',style:const TextStyle(color:muted))],
          const SizedBox(height:18),TextField(controller:comment,maxLines:3,decoration:const InputDecoration(labelText:'Коментар',alignLabelWithHint:true)),const SizedBox(height:24),
          FilledButton.icon(onPressed:busy?null:save,icon:busy?const SizedBox.square(dimension:18,child:CircularProgressIndicator(strokeWidth:2)):const Icon(Icons.check),label:Text(widget.route==null?'Зберегти маршрут':'Зберегти зміни')),
        ]);
      }));
  }
}

class PointDialog extends StatefulWidget {
  const PointDialog({required this.stores,this.initial,super.key}); final List<StoreModel> stores; final RoutePointDraft? initial;
  @override State<PointDialog> createState()=>_PointDialogState();
}
class _PointDialogState extends State<PointDialog>{
  StoreModel? store; final pal=TextEditingController();final kg=TextEditingController();final note=TextEditingController();
  @override void initState(){super.initState();store=widget.initial?.store;if(widget.initial!=null){pal.text=numf(widget.initial!.pallets);kg.text=numf(widget.initial!.weightKg);note.text=widget.initial!.note;}}
  @override void dispose(){pal.dispose();kg.dispose();note.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>AlertDialog(title:Text(widget.initial==null?'Додати ТТ':'Редагувати ТТ'),content:SizedBox(width:460,child:Column(mainAxisSize:MainAxisSize.min,children:[
    DropdownButtonFormField<StoreModel>(value:store,isExpanded:true,decoration:const InputDecoration(labelText:'Торгова точка'),items:widget.stores.map((x)=>DropdownMenuItem(value:x,child:Text(x.name,overflow:TextOverflow.ellipsis))).toList(),onChanged:(x)=>setState(()=>store=x)),const SizedBox(height:12),
    Row(children:[Expanded(child:TextField(controller:pal,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Палети'))),const SizedBox(width:12),Expanded(child:TextField(controller:kg,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Вага, кг')))]),const SizedBox(height:12),TextField(controller:note,decoration:const InputDecoration(labelText:'Примітка'))
  ])),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Скасувати')),FilledButton(onPressed:(){if(store==null)return;Navigator.pop(context,RoutePointDraft(store:store!,pallets:parseNum(pal.text),weightKg:parseNum(kg.text),note:note.text));},child:const Text('Готово'))]);
}

class ExtraDialog extends StatefulWidget {
  const ExtraDialog({this.initial,super.key});final ExtraPointDraft? initial;
  @override State<ExtraDialog> createState()=>_ExtraDialogState();
}
class _ExtraDialogState extends State<ExtraDialog>{
  String type='other';final name=TextEditingController();final address=TextEditingController();final contact=TextEditingController();final pal=TextEditingController();final kg=TextEditingController();final note=TextEditingController();
  @override void initState(){super.initState();final x=widget.initial;if(x!=null){type=x.type;name.text=x.name;address.text=x.address;contact.text=x.contact;pal.text=numf(x.pallets);kg.text=numf(x.weightKg);note.text=x.note;}}
  @override void dispose(){for(final c in [name,address,contact,pal,kg,note]){c.dispose();}super.dispose();}
  @override Widget build(BuildContext context)=>AlertDialog(title:Text(widget.initial==null?'Додаткова задача':'Редагувати задачу'),content:SizedBox(width:500,child:SingleChildScrollView(child:Column(mainAxisSize:MainAxisSize.min,children:[
    DropdownButtonFormField<String>(value:type,decoration:const InputDecoration(labelText:'Тип'),items:extraTypes.map((x)=>DropdownMenuItem(value:x.$1,child:Text(x.$2))).toList(),onChanged:(x)=>setState(()=>type=x??type)),const SizedBox(height:12),
    TextField(controller:name,decoration:const InputDecoration(labelText:'Назва / що потрібно зробити')),const SizedBox(height:12),TextField(controller:address,decoration:const InputDecoration(labelText:'Адреса / місце')),const SizedBox(height:12),TextField(controller:contact,decoration:const InputDecoration(labelText:'Контакт')),const SizedBox(height:12),
    Row(children:[Expanded(child:TextField(controller:pal,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Палети'))),const SizedBox(width:12),Expanded(child:TextField(controller:kg,keyboardType:const TextInputType.numberWithOptions(decimal:true),decoration:const InputDecoration(labelText:'Вага, кг')))]),const SizedBox(height:12),TextField(controller:note,maxLines:2,decoration:const InputDecoration(labelText:'Коментар'))
  ]))),actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Скасувати')),FilledButton(onPressed:(){if(name.text.trim().isEmpty)return;Navigator.pop(context,ExtraPointDraft(type:type,name:name.text,address:address.text,contact:contact.text,pallets:parseNum(pal.text),weightKg:parseNum(kg.text),note:note.text));},child:const Text('Готово'))]);
}

const extraTypes=[('festival','Фестиваль / подія'),('equipment','Обладнання'),('movement','Переміщення'),('return','Повернення'),('pickup','Забір'),('other','Інше')];
String extraLabel(String type)=>extraTypes.firstWhere((x)=>x.$1==type,orElse:()=>('other','Інше')).$2;
IconData extraIcon(String type)=>switch(type){'festival'=>Icons.celebration_outlined,'equipment'=>Icons.handyman_outlined,'movement'=>Icons.swap_horiz_outlined,'return'=>Icons.keyboard_return_outlined,'pickup'=>Icons.download_for_offline_outlined,_=>Icons.more_horiz};

class RouteCard extends StatelessWidget{
  const RouteCard({required this.route,this.detailed=false,this.onTap,this.onCancel,super.key});final RouteModel route;final bool detailed;final VoidCallback? onTap;final VoidCallback? onCancel;
  @override Widget build(BuildContext context){final issue=route.tariff==null||route.vehicle==null||route.driver==null||route.driver!.trim().isEmpty;return Card(child:InkWell(borderRadius:BorderRadius.circular(18),onTap:onTap,child:Padding(padding:const EdgeInsets.all(16),child:Column(children:[
    Row(crossAxisAlignment:CrossAxisAlignment.start,children:[Container(width:4,height:48,decoration:BoxDecoration(color:issue?warn:good,borderRadius:BorderRadius.circular(4))),const SizedBox(width:12),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(route.routeNo?.isNotEmpty==true?route.routeNo!:'Маршрут #${route.id}',style:const TextStyle(fontWeight:FontWeight.w900,fontSize:15)),const SizedBox(height:4),Text('${DateFormat('dd.MM').format(route.date)} · ${route.warehouse} · ${route.vehicle?.plate??'авто не вказано'}',style:const TextStyle(color:muted,fontSize:12))])),StatusPill(issue:issue),if(onCancel!=null)PopupMenuButton<String>(onSelected:(x){if(x=='cancel')onCancel!();},itemBuilder:(_)=>const [PopupMenuItem(value:'cancel',child:Text('Анульувати'))])]),const SizedBox(height:14),
    Row(children:[Mini('ТТ','${route.tt}'),Mini('Палети',numf(route.pallets)),Mini('Вага','${numf(route.weightKg)} кг'),Mini('Тариф',route.tariff==null?'—':'${money(route.tariff!)} грн'),if(MediaQuery.sizeOf(context).width>760)Mini('Завантаження',route.loadPercent==0?'—':'${numf(route.loadPercent)}%')]),
    if(detailed)...[const SizedBox(height:12),const Divider(height:1),const SizedBox(height:10),Align(alignment:Alignment.centerLeft,child:Text([...route.points.map((x)=>x.store.name),...route.extras.map((x)=>'${extraLabel(x.type)}: ${x.name}')].join('  →  '),style:const TextStyle(color:muted,fontSize:12)))]
  ])))) ;}
}
class StatusPill extends StatelessWidget{const StatusPill({required this.issue,super.key});final bool issue;@override Widget build(BuildContext context){final c=issue?warn:good;return Container(padding:const EdgeInsets.symmetric(horizontal:10,vertical:6),decoration:BoxDecoration(color:c.withValues(alpha:.09),borderRadius:BorderRadius.circular(20),border:Border.all(color:c.withValues(alpha:.25))),child:Text(issue?'Уточнити':'Заповнено',style:TextStyle(color:c,fontSize:11,fontWeight:FontWeight.w800)));}}
class Mini extends StatelessWidget{const Mini(this.label,this.value,{super.key});final String label,value;@override Widget build(BuildContext context)=>Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(label,style:const TextStyle(color:muted,fontSize:10)),const SizedBox(height:3),Text(value,overflow:TextOverflow.ellipsis,style:const TextStyle(fontWeight:FontWeight.w800,fontSize:12))]));}
class Totals extends StatelessWidget{const Totals({required this.tt,required this.pallets,required this.weight,required this.vehicle,super.key});final int tt;final double pallets,weight;final VehicleModel? vehicle;@override Widget build(BuildContext context){final pc=vehicle?.palletCapacity??0;final wc=vehicle?.maxWeightKg??0;final a=pc>0?pallets/pc:0.0;final b=wc>0?weight/wc:0.0;final load=(a>b?a:b)*100;final over=load>100;return Container(padding:const EdgeInsets.all(14),decoration:BoxDecoration(color:surface2,borderRadius:BorderRadius.circular(14),border:Border.all(color:over?bad.withValues(alpha:.6):line)),child:Wrap(spacing:22,runSpacing:8,children:[Text('$tt точок',style:const TextStyle(fontWeight:FontWeight.w900)),Text('${numf(pallets)} пал',style:const TextStyle(fontWeight:FontWeight.w900)),Text('${numf(weight)} кг',style:const TextStyle(fontWeight:FontWeight.w900)),if(vehicle!=null)Text('Завантаження ${numf(load)}%',style:TextStyle(fontWeight:FontWeight.w900,color:over?bad:good))]));}}
class Kpi extends StatelessWidget{const Kpi(this.label,this.value,this.note,this.icon,{super.key});final String label,value,note;final IconData icon;@override Widget build(BuildContext context)=>Card(child:Padding(padding:const EdgeInsets.all(18),child:Column(crossAxisAlignment:CrossAxisAlignment.start,mainAxisAlignment:MainAxisAlignment.spaceBetween,children:[Row(children:[Icon(icon,size:18,color:accent),const Spacer(),Text(label,style:const TextStyle(color:muted,fontSize:12))]),Text(value,style:const TextStyle(fontSize:26,fontWeight:FontWeight.w900,letterSpacing:-.7)),Text(note,style:const TextStyle(color:muted,fontSize:12))])));}
class RefCard extends StatelessWidget{const RefCard(this.icon,this.title,this.count,this.sample,{super.key});final IconData icon;final String title,sample;final int count;@override Widget build(BuildContext context)=>Card(child:Padding(padding:const EdgeInsets.all(18),child:Row(children:[Container(width:46,height:46,decoration:BoxDecoration(color:surface2,borderRadius:BorderRadius.circular(13)),child:Icon(icon,color:accent)),const SizedBox(width:14),Expanded(child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontWeight:FontWeight.w900)),const SizedBox(height:4),Text(sample,maxLines:1,overflow:TextOverflow.ellipsis,style:const TextStyle(color:muted,fontSize:12))])),Text('$count',style:const TextStyle(fontSize:24,fontWeight:FontWeight.w900))])));}
class SectionTitle extends StatelessWidget{const SectionTitle(this.title,this.subtitle,{super.key});final String title,subtitle;@override Widget build(BuildContext context)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[Text(title,style:const TextStyle(fontSize:20,fontWeight:FontWeight.w900,letterSpacing:-.4)),const SizedBox(height:3),Text(subtitle,style:const TextStyle(color:muted,fontSize:12))]);}
class FieldBox extends StatelessWidget{const FieldBox(this.width,this.child,{super.key});final double width;final Widget child;@override Widget build(BuildContext context)=>Container(width:width,decoration:BoxDecoration(color:surface2,borderRadius:BorderRadius.circular(14),border:Border.all(color:line)),child:child);}
class HintCard extends StatelessWidget{const HintCard(this.text,{super.key});final String text;@override Widget build(BuildContext context)=>Container(padding:const EdgeInsets.all(16),decoration:BoxDecoration(color:surface2,borderRadius:BorderRadius.circular(14),border:Border.all(color:line)),child:Row(children:[const Icon(Icons.info_outline,color:muted,size:18),const SizedBox(width:10),Expanded(child:Text(text,style:const TextStyle(color:muted)))]));}
class EmptyState extends StatelessWidget{const EmptyState({required this.onCreate,super.key});final VoidCallback onCreate;@override Widget build(BuildContext context)=>Card(child:Padding(padding:const EdgeInsets.symmetric(vertical:36,horizontal:20),child:Column(children:[const Icon(Icons.route_outlined,size:38,color:muted),const SizedBox(height:10),const Text('Маршрутів немає',style:TextStyle(fontWeight:FontWeight.w900)),const SizedBox(height:5),const Text('Створіть перший фактичний маршрут Retail',style:TextStyle(color:muted)),const SizedBox(height:14),FilledButton.icon(onPressed:onCreate,icon:const Icon(Icons.add),label:const Text('Новий маршрут'))])));}
class ErrorState extends StatelessWidget{const ErrorState(this.message,{super.key});final String message;@override Widget build(BuildContext context)=>Center(child:Padding(padding:const EdgeInsets.all(24),child:Column(mainAxisSize:MainAxisSize.min,children:[const Icon(Icons.error_outline,size:38,color:bad),const SizedBox(height:10),const Text('Не вдалося завантажити дані',style:TextStyle(fontWeight:FontWeight.w900)),const SizedBox(height:6),Text(message,textAlign:TextAlign.center,style:const TextStyle(color:muted,fontSize:12))])));}

Future<bool?> confirm(BuildContext context,String title,String text)=>showDialog<bool>(context:context,builder:(_)=>AlertDialog(title:Text(title),content:Text(text),actions:[TextButton(onPressed:()=>Navigator.pop(context,false),child:const Text('Ні')),FilledButton(onPressed:()=>Navigator.pop(context,true),child:const Text('Так'))]));
void snack(BuildContext context,String text)=>ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(text)));
double parseNum(String text)=>double.tryParse(text.replaceAll(' ','').replaceAll(',','.'))??0;
String numf(num value){final d=value.toDouble();if((d-d.round()).abs()<.001)return NumberFormat('#,##0','uk_UA').format(d);return NumberFormat('#,##0.0','uk_UA').format(d);}
String money(num value)=>NumberFormat('#,##0','uk_UA').format(value);
