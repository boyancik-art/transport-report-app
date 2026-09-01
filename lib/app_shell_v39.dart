import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
bool get demoMode => supabaseUrl.isEmpty || supabaseAnonKey.isEmpty;

const brandBlue = Color(0xFF2F7BFF);
const bg = Color(0xFF0B1020);
const card = Color(0xFF151C2F);
const border = Color(0xFF27324A);

Future<void> runTransportReportV39() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!demoMode) {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
  }
  runApp(const TransportReportV39());
}

class TransportReportV39 extends StatelessWidget {
  const TransportReportV39({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: brandBlue,
      brightness: Brightness.dark,
      surface: card,
    );
    return MaterialApp(
      title: 'Transport Report TS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: scheme,
        scaffoldBackgroundColor: bg,
        appBarTheme: const AppBarTheme(backgroundColor: bg, elevation: 0),
        cardTheme: const CardThemeData(
          color: card,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(20)),
            side: BorderSide(color: border),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF11182A),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: border),
          ),
        ),
      ),
      home: demoMode ? const LogisticsHome(demo: true) : const AuthGate(),
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
    _subscription = Supabase.instance.client.auth.onAuthStateChange.listen((state) {
      if (!mounted) return;
      setState(() => _session = state.session);
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_session != null) return const LogisticsHome(demo: false);
    return const SignInPage();
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
  bool loading = false;
  String? error;

  Future<void> signIn() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) return;
    setState(() {
      loading = true;
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
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
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
                  const _Logo(),
                  const SizedBox(height: 24),
                  Text(
                    'Transport Report TS',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Система транспортної звітності',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 28),
                  TextField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: password,
                    obscureText: true,
                    onSubmitted: (_) => signIn(),
                    decoration: const InputDecoration(labelText: 'Пароль'),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: const TextStyle(color: Colors.redAccent)),
                  ],
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: loading ? null : signIn,
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
                    child: loading
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

class LogisticsHome extends StatefulWidget {
  const LogisticsHome({required this.demo, super.key});
  final bool demo;

  @override
  State<LogisticsHome> createState() => _LogisticsHomeState();
}

class _LogisticsHomeState extends State<LogisticsHome> {
  static const tabs = <String>[
    'База',
    'STV',
    'SAV',
    'ФОП/TS',
    'Пекарня/Фреш',
    'Кур’єрські відправлення',
    'Поповнення філій',
    'Самовивози',
  ];

  int selected = 0;
  DateTime? lastUpdate;
  bool loadingUpdate = true;

  @override
  void initState() {
    super.initState();
    _loadLastUpdate();
  }

  Future<void> _loadLastUpdate() async {
    if (widget.demo) {
      setState(() {
        lastUpdate = DateTime.now();
        loadingUpdate = false;
      });
      return;
    }

    DateTime? found;
    try {
      final row = await Supabase.instance.client
          .from('cube_imports')
          .select('imported_at,status')
          .eq('status', 'completed')
          .order('imported_at', ascending: false)
          .limit(1)
          .maybeSingle();
      if (row != null && row['imported_at'] != null) {
        found = DateTime.tryParse('${row['imported_at']}')?.toLocal();
      }
    } catch (_) {}

    if (found == null) {
      try {
        final row = await Supabase.instance.client
            .from('routes')
            .select('updated_at')
            .order('updated_at', ascending: false)
            .limit(1)
            .maybeSingle();
        if (row != null && row['updated_at'] != null) {
          found = DateTime.tryParse('${row['updated_at']}')?.toLocal();
        }
      } catch (_) {}
    }

    if (!mounted) return;
    setState(() {
      lastUpdate = found;
      loadingUpdate = false;
    });
  }

  String get _today => DateFormat('dd.MM.yyyy').format(DateTime.now());

  String get _lastUpdateLabel {
    if (loadingUpdate) return 'перевіряємо...';
    if (lastUpdate == null) return 'немає даних';
    return DateFormat('dd.MM.yyyy HH:mm').format(lastUpdate!);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        toolbarHeight: 68,
        title: const Row(
          children: [
            _Logo(size: 38),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Transport Report TS',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
              ),
            ),
          ],
        ),
        actions: [
          if (!widget.demo)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert),
              onSelected: (value) async {
                if (value == 'logout') await Supabase.instance.client.auth.signOut();
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'logout', child: Text('Вийти')),
              ],
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          onRefresh: _loadLastUpdate,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 6, 16, 28),
            children: [
              _StatusHeader(
                today: _today,
                lastUpdate: _lastUpdateLabel,
                onRefresh: _loadLastUpdate,
              ),
              const SizedBox(height: 18),
              Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.local_shipping_outlined, color: brandBlue),
                          SizedBox(width: 9),
                          Text(
                            'ЛОГІСТИКА',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, letterSpacing: .4),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        height: 42,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: tabs.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (_, index) {
                            final active = selected == index;
                            return ChoiceChip(
                              selected: active,
                              showCheckmark: false,
                              label: Text(tabs[index]),
                              labelStyle: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: active ? Colors.white : null,
                              ),
                              selectedColor: brandBlue,
                              side: BorderSide(color: active ? brandBlue : border),
                              onSelected: (_) => setState(() => selected = index),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 20),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 180),
                        child: _SectionPlaceholder(
                          key: ValueKey(selected),
                          title: tabs[selected],
                          first: selected == 0,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.today, required this.lastUpdate, required this.onRefresh});
  final String today;
  final String lastUpdate;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(4, 10, 4, 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  today,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 5),
                Text(
                  'Останнє оновлення даних: $lastUpdate',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Оновити статус',
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
    );
  }
}

class _SectionPlaceholder extends StatelessWidget {
  const _SectionPlaceholder({required this.title, required this.first, super.key});
  final String title;
  final bool first;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 18),
      decoration: BoxDecoration(
        color: const Color(0xFF101729),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        children: [
          Icon(first ? Icons.storage_rounded : Icons.tune_rounded, color: brandBlue, size: 30),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text(
            first ? 'Наступним кроком налаштовуємо структуру та показники бази.' : 'Цей напрямок налаштуємо окремим наступним етапом.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, height: 1.35),
          ),
        ],
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  const _Logo({this.size = 68});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(size * .24),
        ),
        alignment: Alignment.center,
        child: Text(
          'TS',
          style: TextStyle(
            color: brandBlue,
            fontSize: size * .38,
            fontWeight: FontWeight.w900,
            letterSpacing: -1.5,
          ),
        ),
      ),
    );
  }
}
