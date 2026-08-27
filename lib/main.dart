import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    runApp(const ConfigurationErrorApp());
    return;
  }

  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  runApp(const TransportReportApp());
}

class ConfigurationErrorApp extends StatelessWidget {
  const ConfigurationErrorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        appBar: AppBar(title: const Text('Transport Report')),
        body: const Padding(
          padding: EdgeInsets.all(24),
          child: Center(
            child: Text(
              'Supabase configuration is missing. Start the application with '
              'SUPABASE_URL and SUPABASE_ANON_KEY dart defines.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}

class TransportReportApp extends StatelessWidget {
  const TransportReportApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Transport Report',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff155eef)),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
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
  StreamSubscription<AuthState>? _subscription;
  Session? _session;

  @override
  void initState() {
    super.initState();
    _session = Supabase.instance.client.auth.currentSession;
    _subscription = Supabase.instance.client.auth.onAuthStateChange.listen((event) {
      if (mounted) {
        setState(() => _session = event.session);
      }
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _session == null ? const SignInPage() : const RoutesPage();
  }
}

class SignInPage extends StatefulWidget {
  const SignInPage({super.key});

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
    } on AuthException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Не вдалося виконати вхід.');
    } finally {
      if (mounted) setState(() => _busy = false);
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
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(Icons.local_shipping_outlined,
                        size: 72, color: Theme.of(context).colorScheme.primary),
                    const SizedBox(height: 20),
                    Text('Transport Report',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(labelText: 'Email'),
                      validator: (value) {
                        final email = value?.trim() ?? '';
                        return email.contains('@') ? null : 'Введіть коректний email';
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      autofillHints: const [AutofillHints.password],
                      decoration: const InputDecoration(labelText: 'Пароль'),
                      validator: (value) => (value?.isNotEmpty ?? false)
                          ? null
                          : 'Введіть пароль',
                      onFieldSubmitted: (_) => _busy ? null : _signIn(),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _busy ? null : _signIn,
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: _busy
                            ? const SizedBox.square(
                                dimension: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Увійти'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class RouteItem {
  const RouteItem({
    required this.id,
    required this.number,
    required this.origin,
    required this.destination,
    required this.scheduledAt,
    required this.status,
    required this.assignedLogisticianId,
  });

  final String id;
  final String number;
  final String origin;
  final String destination;
  final DateTime? scheduledAt;
  final String status;
  final String? assignedLogisticianId;

  factory RouteItem.fromJson(Map<String, dynamic> json) {
    return RouteItem(
      id: json['id'].toString(),
      number: (json['route_number'] ?? '').toString(),
      origin: (json['origin'] ?? '').toString(),
      destination: (json['destination'] ?? '').toString(),
      scheduledAt: DateTime.tryParse((json['scheduled_at'] ?? '').toString()),
      status: (json['status'] ?? '').toString(),
      assignedLogisticianId: json['assigned_logistician_id']?.toString(),
    );
  }
}

class RoutesPage extends StatefulWidget {
  const RoutesPage({super.key});

  @override
  State<RoutesPage> createState() => _RoutesPageState();
}

class _RoutesPageState extends State<RoutesPage> {
  bool _loading = true;
  String? _error;
  String _role = '';
  String _name = '';
  List<RouteItem> _routes = const [];

  SupabaseClient get _client => Supabase.instance.client;
  String get _userId => _client.auth.currentUser!.id;
  bool get _isAdmin => _role == 'admin';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profile = await _client
          .from('profiles')
          .select('role, full_name')
          .eq('id', _userId)
          .single();
      final rawRoutes = await _client.from('routes').select(
          'id, route_number, origin, destination, scheduled_at, status, assigned_logistician_id');
      final parsed = (rawRoutes as List)
          .map((row) => RouteItem.fromJson(row as Map<String, dynamic>))
          .toList()
        ..sort((a, b) {
          final left = a.scheduledAt ?? DateTime(9999);
          final right = b.scheduledAt ?? DateTime(9999);
          return left.compareTo(right);
        });
      final role = (profile['role'] ?? '').toString();
      if (role != 'admin' && role != 'logistician') {
        throw StateError('Обліковий запис не має дозволеної ролі.');
      }
      if (mounted) {
        setState(() {
          _role = role;
          _name = (profile['full_name'] ?? '').toString();
          _routes = role == 'admin'
              ? parsed
              : parsed
                  .where((route) =>
                      route.assignedLogisticianId == null ||
                      route.assignedLogisticianId == _userId)
                  .toList();
        });
      }
    } on PostgrestException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _selectRoute(RouteItem route) async {
    try {
      final selected = await _client
          .from('routes')
          .update({'assigned_logistician_id': _userId, 'status': 'selected'})
          .eq('id', route.id)
          .isFilter('assigned_logistician_id', null)
          .select('id');
      if ((selected as List).isEmpty) {
        throw StateError('Маршрут уже вибрав інший логіст.');
      }
      await _load();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString())),
        );
      }
    }
  }

  Future<void> _openReport(RouteItem route) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ReportPage(route: route)),
    );
    if (saved == true) await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_name.isEmpty ? 'Маршрути' : 'Маршрути · $_name'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
          IconButton(
            tooltip: 'Вийти',
            onPressed: () => _client.auth.signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _routes.isEmpty
                      ? ListView(children: const [
                          SizedBox(height: 180),
                          Center(child: Text('Доступних маршрутів немає')),
                        ])
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _routes.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final route = _routes[index];
                            final mine = route.assignedLogisticianId == _userId;
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(children: [
                                      Expanded(
                                        child: Text(
                                          route.number,
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleLarge,
                                        ),
                                      ),
                                      Chip(label: Text(route.status)),
                                    ]),
                                    const SizedBox(height: 8),
                                    Text('${route.origin} → ${route.destination}'),
                                    if (route.scheduledAt != null) ...[
                                      const SizedBox(height: 6),
                                      Text(DateFormat('dd.MM.yyyy HH:mm')
                                          .format(route.scheduledAt!.toLocal())),
                                    ],
                                    const SizedBox(height: 14),
                                    if (!_isAdmin && route.assignedLogisticianId == null)
                                      FilledButton.icon(
                                        onPressed: () => _selectRoute(route),
                                        icon: const Icon(Icons.add_task),
                                        label: const Text('Обрати маршрут'),
                                      )
                                    else if (!_isAdmin && mine)
                                      FilledButton.icon(
                                        onPressed: () => _openReport(route),
                                        icon: const Icon(Icons.edit_note),
                                        label: const Text('Заповнити фактичні дані'),
                                      )
                                    else
                                      Text(route.assignedLogisticianId == null
                                          ? 'Маршрут не призначений'
                                          : 'Маршрут призначений'),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({required this.message, required this.onRetry, super.key});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Повторити')),
          ],
        ),
      ),
    );
  }
}

class ReportPage extends StatefulWidget {
  const ReportPage({required this.route, super.key});

  final RouteItem route;

  @override
  State<ReportPage> createState() => _ReportPageState();
}

class _ReportPageState extends State<ReportPage> {
  final _formKey = GlobalKey<FormState>();
  final _distanceController = TextEditingController();
  final _fuelController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime? _departure;
  DateTime? _arrival;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  @override
  void dispose() {
    _distanceController.dispose();
    _fuelController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadExisting() async {
    try {
      final userId = Supabase.instance.client.auth.currentUser!.id;
      final rows = await Supabase.instance.client
          .from('route_reports')
          .select()
          .eq('route_id', widget.route.id)
          .eq('logistician_id', userId)
          .limit(1);
      if ((rows as List).isNotEmpty) {
        final row = rows.first as Map<String, dynamic>;
        _departure = DateTime.tryParse(
            (row['actual_departure_at'] ?? '').toString());
        _arrival =
            DateTime.tryParse((row['actual_arrival_at'] ?? '').toString());
        _distanceController.text =
            (row['actual_distance_km'] ?? '').toString();
        _fuelController.text = (row['fuel_liters'] ?? '').toString();
        _notesController.text = (row['notes'] ?? '').toString();
      }
    } on PostgrestException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<DateTime?> _pickDateTime(DateTime? current) async {
    final initial = current?.toLocal() ?? DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || !mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_departure == null || _arrival == null) {
      setState(() => _error = 'Вкажіть фактичний час виїзду та прибуття.');
      return;
    }
    if (_arrival!.isBefore(_departure!)) {
      setState(() => _error = 'Прибуття не може бути раніше за виїзд.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final client = Supabase.instance.client;
      final userId = client.auth.currentUser!.id;
      await client.from('route_reports').upsert({
        'route_id': widget.route.id,
        'logistician_id': userId,
        'actual_departure_at': _departure!.toUtc().toIso8601String(),
        'actual_arrival_at': _arrival!.toUtc().toIso8601String(),
        'actual_distance_km': double.parse(_distanceController.text.trim()),
        'fuel_liters': double.parse(_fuelController.text.trim()),
        'notes': _notesController.text.trim(),
        'status': 'submitted',
      }, onConflict: 'route_id,logistician_id');
      await client
          .from('routes')
          .update({'status': 'reported'})
          .eq('id', widget.route.id)
          .eq('assigned_logistician_id', userId);
      if (mounted) Navigator.of(context).pop(true);
    } on PostgrestException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Не вдалося зберегти звіт.');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _formatDate(DateTime? value) => value == null
      ? 'Не вказано'
      : DateFormat('dd.MM.yyyy HH:mm').format(value.toLocal());

  String? _positiveNumber(String? value) {
    final number = double.tryParse((value ?? '').replaceAll(',', '.'));
    return number != null && number >= 0 ? null : 'Введіть невід’ємне число';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Звіт · ${widget.route.number}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('${widget.route.origin} → ${widget.route.destination}',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 20),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final value = await _pickDateTime(_departure);
                        if (value != null) setState(() => _departure = value);
                      },
                      icon: const Icon(Icons.departure_board),
                      label: Text('Фактичний виїзд: ${_formatDate(_departure)}'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final value = await _pickDateTime(_arrival);
                        if (value != null) setState(() => _arrival = value);
                      },
                      icon: const Icon(Icons.flag_outlined),
                      label: Text('Фактичне прибуття: ${_formatDate(_arrival)}'),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _distanceController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration:
                          const InputDecoration(labelText: 'Фактична відстань, км'),
                      validator: _positiveNumber,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _fuelController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration:
                          const InputDecoration(labelText: 'Використано пального, л'),
                      validator: _positiveNumber,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _notesController,
                      maxLines: 4,
                      maxLength: 1000,
                      decoration: const InputDecoration(labelText: 'Примітка'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(_error!,
                          style: TextStyle(
                              color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: _saving ? null : _save,
                      icon: _saving
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.save),
                      label: const Padding(
                        padding: EdgeInsets.all(12),
                        child: Text('Зберегти фактичні дані'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
