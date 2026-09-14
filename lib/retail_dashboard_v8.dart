import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'retail_dashboard_v7.dart' as v7;

const _u = String.fromEnvironment('SUPABASE_URL');
const _k = String.fromEnvironment('SUPABASE_ANON_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: _u, anonKey: _k);
  runApp(const RetailV8());
}

class RetailV8 extends StatelessWidget {
  const RetailV8({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Retail ТОВ «ТС ПЛЮС»',
        theme: ThemeData(
          brightness: Brightness.dark,
          useMaterial3: true,
          scaffoldBackgroundColor: v7.bg,
          colorScheme: ColorScheme.fromSeed(seedColor: v7.wine, brightness: Brightness.dark),
          fontFamily: 'Arial',
        ),
        home: const GateV8(),
      );
}

class GateV8 extends StatefulWidget {
  const GateV8({super.key});
  @override
  State<GateV8> createState() => _GateV8State();
}

class _GateV8State extends State<GateV8> {
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
  Widget build(BuildContext context) => session == null ? const LoginV8() : const HomeV8();
}

class LoginV8 extends StatefulWidget {
  const LoginV8({super.key});
  @override
  State<LoginV8> createState() => _LoginV8State();
}

class _LoginV8State extends State<LoginV8> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String? error;
  Future<void> login() async {
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
            width: 420,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(color: v7.panel, borderRadius: BorderRadius.circular(18), border: Border.all(color: v7.border)),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Center(child: WineLogo(width: 172, height: 132)),
              const SizedBox(height: 20),
              const Text('Retail ТОВ «ТС ПЛЮС»', textAlign: TextAlign.center, style: TextStyle(fontSize: 25, fontWeight: FontWeight.w800)),
              const SizedBox(height: 22),
              TextField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
              const SizedBox(height: 12),
              TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Пароль'), onSubmitted: (_) => login()),
              if (error != null) ...[const SizedBox(height: 8), Text(error!, style: const TextStyle(color: Colors.redAccent))],
              const SizedBox(height: 16),
              FilledButton(onPressed: busy ? null : login, child: Text(busy ? 'Вхід…' : 'Увійти')),
            ]),
          ),
        ),
      );
}

class HomeV8 extends StatelessWidget {
  const HomeV8({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: FittedBox(
            fit: BoxFit.contain,
            alignment: Alignment.topCenter,
            child: SizedBox(
              width: 1536,
              height: 1024,
              child: Row(children: [
                const SizedBox(width: 250, child: SidebarV8()),
                Expanded(child: Column(children: [
                  const v7.Top(),
                  Expanded(child: Padding(
                    padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
                    child: Column(children: const [
                      HeroV8(),
                      SizedBox(height: 12),
                      v7.Kpis(),
                      SizedBox(height: 12),
                      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(flex: 39, child: v7.Inbound()),
                        SizedBox(width: 12),
                        Expanded(flex: 32, child: v7.Hubs()),
                        SizedBox(width: 12),
                        Expanded(flex: 29, child: v7.Types()),
                      ]),
                      SizedBox(height: 12),
                      v7.Routes(),
                    ]),
                  )),
                ])),
              ]),
            ),
          ),
        ),
      );
}

class SidebarV8 extends StatelessWidget {
  const SidebarV8({super.key});
  static const items = [
    ('Головна', Icons.home_rounded), ('Вхідні вантажі', Icons.local_shipping_rounded), ('Консолідація', Icons.inventory_2_rounded),
    ('Маршрути', Icons.location_on_rounded), ('Талони комплектації', Icons.assignment_rounded), ('ТТН', Icons.description_rounded),
    ('Магазини WT', Icons.storefront_rounded), ('Склади', Icons.home_work_rounded), ('Перевізники', Icons.local_shipping_outlined),
    ('Тарифи', Icons.stacked_bar_chart_rounded), ('Аналітика', Icons.bar_chart_rounded), ('Довідники', Icons.menu_book_rounded),
    ('Користувачі', Icons.group_rounded), ('Налаштування', Icons.settings_rounded),
  ];
  @override
  Widget build(BuildContext context) => Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF30111E), Color(0xFF170E14), Color(0xFF1D1018)]),
          border: Border(right: BorderSide(color: Color(0xFF30242B))),
        ),
        child: Stack(children: [
          const Positioned(left: 0, right: 0, bottom: 0, height: 290, child: v7.Road()),
          Column(children: [
            const SizedBox(height: 14),
            const WineLogo(width: 172, height: 132),
            const SizedBox(height: 12),
            Expanded(child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: items.length,
              itemBuilder: (_, i) => Container(
                height: 44,
                margin: const EdgeInsets.only(bottom: 4),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(color: i == 0 ? v7.wine : Colors.transparent, borderRadius: BorderRadius.circular(10)),
                child: Row(children: [
                  Icon(items[i].$2, size: 20, color: Colors.white.withValues(alpha: .9)),
                  const SizedBox(width: 13),
                  Text(items[i].$1, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                ]),
              ),
            )),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 18, 22),
              child: Align(alignment: Alignment.centerLeft, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Retail ТОВ «ТС ПЛЮС»', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                SizedBox(height: 5), Text('Логістика, що рухає бізнес', style: TextStyle(fontSize: 11, color: v7.muted)),
                SizedBox(height: 12), Text('v1.0.0   |   2026', style: TextStyle(fontSize: 10, color: v7.muted)),
              ])),
            ),
          ]),
        ]),
      );
}

class WineLogo extends StatelessWidget {
  final double width, height;
  const WineLogo({super.key, required this.width, required this.height});
  @override
  Widget build(BuildContext context) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF611326), Color(0xFF84162F), Color(0xFF4A0F20)]),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF9A2947)),
          boxShadow: const [BoxShadow(color: Color(0x55000000), blurRadius: 16, offset: Offset(0, 6))],
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: const [
          FoxMark(),
          SizedBox(height: 5),
          Text('WINETIME', style: TextStyle(fontFamily: 'serif', fontSize: 28, fontWeight: FontWeight.w500, letterSpacing: 1.2)),
          SizedBox(height: 4),
          Text('GASTRO & WINE\nMARKET', textAlign: TextAlign.center, style: TextStyle(fontSize: 7.3, fontWeight: FontWeight.w700, height: 1.05)),
        ]),
      );
}

class FoxMark extends StatelessWidget {
  const FoxMark({super.key});
  @override
  Widget build(BuildContext context) => CustomPaint(size: const Size(72, 31), painter: FoxPainter());
}

class FoxPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size s) {
    final p = Paint()..color = const Color(0xFFFF7138);
    final path = Path()
      ..moveTo(2, 15)..cubicTo(12, 4, 26, 8, 35, 7)..cubicTo(44, 6, 50, 1, 58, 5)
      ..lineTo(56, 10)..cubicTo(65, 9, 70, 13, 68, 18)..cubicTo(61, 20, 56, 21, 52, 24)
      ..cubicTo(43, 31, 30, 31, 21, 27)..cubicTo(12, 24, 6, 21, 2, 15)..close();
    canvas.drawPath(path, p);
    canvas.drawPath(Path()..moveTo(10,15)..cubicTo(2,11,0,5,2,1)..cubicTo(8,8,14,8,18,10), p);
  }
  @override bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class HeroV8 extends StatelessWidget {
  const HeroV8({super.key});
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(17),
        child: Container(
          height: 179,
          decoration: BoxDecoration(border: Border.all(color: const Color(0xFF5A2B39)), borderRadius: BorderRadius.circular(17)),
          child: Stack(fit: StackFit.expand, children: [
            const CustomPaint(painter: LogisticsHeroPainter()),
            Container(decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [Color(0xE6090E15), Color(0x8C0B1017), Color(0x120B1017)]))),
            const Positioned(left: 27, top: 24, child: Text('P E O P L E   •   P R O C E S S   •   D E L I V E R Y', style: TextStyle(fontSize: 12, color: Color(0xFFFF826F), letterSpacing: 1.7))),
            const Positioned(left: 27, top: 59, child: Text('НАДІЙНА ЛОГІСТИКА', style: TextStyle(fontSize: 29, fontWeight: FontWeight.w800))),
            const Positioned(left: 27, top: 97, child: Row(children: [Text('ДЛЯ РОЗВИТКУ ', style: TextStyle(fontSize: 27)), Text('RETAIL', style: TextStyle(fontSize: 27, fontWeight: FontWeight.w800, color: Color(0xFFE14250)))])),
            const Positioned(left: 27, bottom: 18, child: Text('Більше, ніж доставка', style: TextStyle(fontSize: 14, color: Color(0xFFB6BAC3)))),
            const Positioned(right: 30, top: 29, child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('СКЛАДИ', style: TextStyle(fontSize: 12, color: Color(0xFFD1C9CD), letterSpacing: 2)), SizedBox(height: 7),
              Text('МАРШРУТИ', style: TextStyle(fontSize: 12, color: Color(0xFFD1C9CD), letterSpacing: 2)), SizedBox(height: 7),
              Text('КОНСОЛІДАЦІЯ', style: TextStyle(fontSize: 12, color: Color(0xFFD1C9CD), letterSpacing: 2)), SizedBox(height: 7),
              Text('КОНТРОЛЬ', style: TextStyle(fontSize: 12, color: Color(0xFFD1C9CD), letterSpacing: 2)), SizedBox(height: 7),
              Text('РЕЗУЛЬТАТ', style: TextStyle(fontSize: 12, color: Color(0xFFD1C9CD), letterSpacing: 2)),
            ])),
          ]),
        ),
      );
}

class LogisticsHeroPainter extends CustomPainter {
  const LogisticsHeroPainter();
  @override
  void paint(Canvas canvas, Size s) {
    final bg = Paint()..shader = const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF11161C), Color(0xFF21171D), Color(0xFF411522)]).createShader(Offset.zero & s);
    canvas.drawRect(Offset.zero & s, bg);
    final roof = Paint()..color = const Color(0xFF2D3035);
    canvas.drawPath(Path()..moveTo(s.width*.42,0)..lineTo(s.width,0)..lineTo(s.width,s.height*.26)..lineTo(s.width*.48,s.height*.26)..close(), roof);
    for (int i=0;i<8;i++) {
      final x=s.width*(.54+i*.055);
      canvas.drawRect(Rect.fromLTWH(x,s.height*.19,s.width*.043,s.height*.59), Paint()..color=const Color(0xFF24262B));
      canvas.drawRect(Rect.fromLTWH(x+s.width*.006,s.height*.28,s.width*.031,s.height*.43), Paint()..color=const Color(0xFF0E141A));
    }
    canvas.drawRect(Rect.fromLTWH(0,s.height*.78,s.width,s.height*.22), Paint()..color=const Color(0xFF181B20));
    canvas.drawLine(Offset(s.width*.42,s.height*.88),Offset(s.width*.95,s.height*.88),Paint()..color=const Color(0xFF545860)..strokeWidth=3);
    final trailer=RRect.fromRectAndRadius(Rect.fromLTWH(s.width*.58,s.height*.22,s.width*.25,s.height*.50),const Radius.circular(4));
    canvas.drawRRect(trailer,Paint()..color=const Color(0xFF76172E));
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(s.width*.60,s.height*.26,s.width*.21,s.height*.40),const Radius.circular(2)),Paint()..color=const Color(0xFF861A33));
    final cab=Path()..moveTo(s.width*.49,s.height*.37)..lineTo(s.width*.545,s.height*.31)..lineTo(s.width*.585,s.height*.38)..lineTo(s.width*.595,s.height*.67)..lineTo(s.width*.485,s.height*.67)..close();
    canvas.drawPath(cab,Paint()..color=const Color(0xFF77162E));
    canvas.drawRect(Rect.fromLTWH(s.width*.512,s.height*.38,s.width*.045,s.height*.16),Paint()..color=const Color(0xFF1B252D));
    canvas.drawRect(Rect.fromLTWH(s.width*.485,s.height*.58,s.width*.112,s.height*.09),Paint()..color=const Color(0xFF8B1C37));
    final wheel=Paint()..color=const Color(0xFF07090B);
    for(final x in [s.width*.51,s.width*.575,s.width*.645,s.width*.79]){canvas.drawCircle(Offset(x,s.height*.72),s.height*.07,wheel);canvas.drawCircle(Offset(x,s.height*.72),s.height*.035,Paint()..color=const Color(0xFF646A72));}
    for(int r=0;r<2;r++){for(int i=0;i<3;i++){canvas.drawRect(Rect.fromLTWH(s.width*(.845+i*.026),s.height*(.55+r*.075),s.width*.021,s.height*.058),Paint()..color=const Color(0xFF9B6236));}}
    final fox=Paint()..color=const Color(0xFFFF6B35);
    canvas.drawOval(Rect.fromCenter(center:Offset(s.width*.704,s.height*.40),width:s.width*.055,height:s.height*.12),fox);
    final tp=TextPainter(textDirection:TextDirection.ltr,textAlign:TextAlign.center,text:const TextSpan(text:'WINETIME',style:TextStyle(color:Color(0xFFF9EFEB),fontSize:21,fontFamily:'serif')))..layout();
    tp.paint(canvas,Offset(s.width*.673,s.height*.50));
  }
  @override bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
