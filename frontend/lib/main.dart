import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/constants/app_constants.dart';
import 'core/theme/app_theme.dart';
import 'presentation/providers/auth_notifier.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/chat/chat_history_screen.dart';
import 'presentation/screens/chat/chat_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: '.env');
  debugPrint('ENV BACKEND_BASE_URL=${dotenv.env['BACKEND_BASE_URL']}');
  debugPrint('ENV keys loaded: ${dotenv.env.keys.toList()}');

  await Supabase.initialize(
    url: dotenv.env[AppConstants.supabaseUrlKey]!,
    anonKey: dotenv.env[AppConstants.supabaseAnonKeyKey]!,
  );

  await GoogleSignIn.instance.initialize(
    serverClientId: dotenv.env[AppConstants.googleWebClientIdKey],
  );

  runApp(const ProviderScope(child: LegalTechApp()));
}

final _routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: LoginScreen.routeName,
    redirect: (context, state) {
      final isAuthenticated = authState.value != null;
      final isOnLogin = state.matchedLocation == LoginScreen.routeName;

      if (!isAuthenticated && !isOnLogin) return LoginScreen.routeName;
      if (isAuthenticated && isOnLogin) return ChatScreen.routeName;
      return null;
    },
    routes: [
      GoRoute(
        path: LoginScreen.routeName,
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: ChatScreen.routeName,
        builder: (_, __) => const ChatScreen(),
      ),
      GoRoute(
        path: ChatHistoryScreen.routeName,
        builder: (_, __) => const ChatHistoryScreen(),
      ),
    ],
  );
});

class LegalTechApp extends ConsumerWidget {
  const LegalTechApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(_routerProvider);

    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
