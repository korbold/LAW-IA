import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/errors/app_exceptions.dart';
import '../models/user_model.dart';

class SupabaseAuthDatasource {
  SupabaseAuthDatasource(this._client);

  final SupabaseClient _client;

  Future<UserModel> signInWithGoogle() async {
    final GoogleSignInAccount account;
    try {
      account = await GoogleSignIn.instance.authenticate(
        scopeHint: ['email', 'profile'],
      );
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) {
        throw const AuthCancelledException();
      }
      throw AppAuthException('Error de Google Sign-In: ${e.description}');
    } catch (e) {
      throw AppAuthException('Error de Google Sign-In: $e');
    }

    final authentication = account.authentication;
    final idToken = authentication.idToken;

    if (idToken == null) {
      throw const AppAuthException('No se pudo obtener el token de Google');
    }

    final response = await _client.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: idToken,
    );

    final user = response.user;
    if (user == null) {
      throw const AppAuthException('No se pudo autenticar con Supabase');
    }

    return UserModel.fromSupabaseUser(
      user.userMetadata ?? {},
      user.id,
      user.email ?? account.email,
    );
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  Stream<UserModel?> authStateChanges() {
    return _client.auth.onAuthStateChange.map((event) {
      final user = event.session?.user;
      if (user == null) return null;
      return UserModel.fromSupabaseUser(
        user.userMetadata ?? {},
        user.id,
        user.email ?? '',
      );
    });
  }

  UserModel? get currentUser {
    final user = _client.auth.currentUser;
    if (user == null) return null;
    return UserModel.fromSupabaseUser(
      user.userMetadata ?? {},
      user.id,
      user.email ?? '',
    );
  }

  String? get accessToken => _client.auth.currentSession?.accessToken;
}
