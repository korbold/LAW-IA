abstract final class AppConstants {
  static const supabaseUrlKey = 'SUPABASE_URL';
  static const supabaseAnonKeyKey = 'SUPABASE_ANON_KEY';
  static const googleWebClientIdKey = 'GOOGLE_WEB_CLIENT_ID';
  static const backendBaseUrlKey = 'BACKEND_BASE_URL';

  static const defaultBackendUrl = 'http://localhost:8080';
  static const chatStreamPath = '/api/v1/chat/stream';
  static const userMePath = '/api/v1/users/me';

  static const appName = 'LegalTech Ecuador';
  static const sseRetryDelayMs = 3000;
}
