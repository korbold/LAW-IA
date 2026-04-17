import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/supabase_auth_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._datasource);

  final SupabaseAuthDatasource _datasource;

  @override
  Future<UserEntity> signInWithGoogle() async {
    final model = await _datasource.signInWithGoogle();
    return model.toEntity();
  }

  @override
  Future<void> signOut() => _datasource.signOut();

  @override
  Stream<UserEntity?> authStateChanges() {
    return _datasource.authStateChanges().map((model) => model?.toEntity());
  }

  @override
  UserEntity? get currentUser => _datasource.currentUser?.toEntity();
}
