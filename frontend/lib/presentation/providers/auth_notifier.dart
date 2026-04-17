import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/di/providers.dart';
import '../../core/errors/app_exceptions.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';

final authNotifierProvider =
    AsyncNotifierProvider<AuthNotifier, UserEntity?>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<UserEntity?> {
  late final AuthRepository _authRepository;
  StreamSubscription<UserEntity?>? _authSubscription;

  @override
  Future<UserEntity?> build() async {
    _authRepository = ref.watch(authRepositoryProvider);

    _authSubscription?.cancel();
    _authSubscription = _authRepository.authStateChanges().listen((user) {
      state = AsyncData(user);
    });

    ref.onDispose(() => _authSubscription?.cancel());

    return _authRepository.currentUser;
  }

  Future<void> signInWithGoogle() async {
    state = const AsyncLoading();
    try {
      final user = await _authRepository.signInWithGoogle();
      state = AsyncData(user);
    } on AuthCancelledException {
      state = AsyncData(_authRepository.currentUser);
    } on AppException catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  Future<void> signOut() async {
    await _authRepository.signOut();
    state = const AsyncData(null);
  }
}
