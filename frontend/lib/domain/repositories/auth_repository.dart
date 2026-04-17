import '../entities/user.dart';

abstract interface class AuthRepository {
  Future<UserEntity> signInWithGoogle();
  Future<void> signOut();
  Stream<UserEntity?> authStateChanges();
  UserEntity? get currentUser;
}
