sealed class AppException implements Exception {
  const AppException(this.message);
  final String message;

  @override
  String toString() => '$runtimeType: $message';
}

final class AppAuthException extends AppException {
  const AppAuthException(super.message);
}

final class AuthCancelledException extends AppException {
  const AuthCancelledException() : super('Inicio de sesión cancelado por el usuario');
}

final class NetworkException extends AppException {
  const NetworkException([super.message = 'Sin conexión a internet']);
}

final class ServerException extends AppException {
  const ServerException(super.message, {this.statusCode});
  final int? statusCode;
}

final class StreamException extends AppException {
  const StreamException([super.message = 'Error en la transmisión de datos']);
}

final class UnknownException extends AppException {
  const UnknownException([super.message = 'Ocurrió un error inesperado']);
}
