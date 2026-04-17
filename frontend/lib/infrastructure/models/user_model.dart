import '../../domain/entities/user.dart';

class UserModel {
  const UserModel({
    required this.id,
    required this.email,
    this.displayName,
    this.avatarUrl,
  });

  final String id;
  final String email;
  final String? displayName;
  final String? avatarUrl;

  factory UserModel.fromSupabaseUser(Map<String, dynamic> userData, String userId, String email) {
    return UserModel(
      id: userId,
      email: email,
      displayName: userData['full_name'] as String? ?? userData['name'] as String?,
      avatarUrl: userData['avatar_url'] as String? ?? userData['picture'] as String?,
    );
  }

  UserEntity toEntity() => UserEntity(
        id: id,
        email: email,
        displayName: displayName,
        avatarUrl: avatarUrl,
      );
}
