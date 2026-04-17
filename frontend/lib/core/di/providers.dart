import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/chat_repository.dart';
import '../../infrastructure/datasources/chat_remote_datasource.dart';
import '../../infrastructure/datasources/supabase_auth_datasource.dart';
import '../../infrastructure/repositories/auth_repository_impl.dart';
import '../../infrastructure/repositories/chat_repository_impl.dart';

final supabaseClientProvider = Provider<SupabaseClient>(
  (ref) => Supabase.instance.client,
);

final supabaseAuthDatasourceProvider = Provider<SupabaseAuthDatasource>(
  (ref) => SupabaseAuthDatasource(ref.watch(supabaseClientProvider)),
);

final chatRemoteDatasourceProvider = Provider<ChatRemoteDatasource>(
  (ref) => ChatRemoteDatasource(ref.watch(supabaseClientProvider)),
);

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepositoryImpl(ref.watch(supabaseAuthDatasourceProvider)),
);

final chatRepositoryProvider = Provider<ChatRepository>(
  (ref) => ChatRepositoryImpl(ref.watch(chatRemoteDatasourceProvider)),
);
