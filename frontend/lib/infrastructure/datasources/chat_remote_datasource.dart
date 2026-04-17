import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/constants/app_constants.dart';
import '../../core/errors/app_exceptions.dart';
import '../models/message_model.dart';

class ChatRemoteDatasource {
  ChatRemoteDatasource(this._supabaseClient);

  final SupabaseClient _supabaseClient;

  String get _baseUrl =>
      dotenv.env[AppConstants.backendBaseUrlKey] ?? AppConstants.defaultBackendUrl;

  String? get _accessToken => _supabaseClient.auth.currentSession?.accessToken;

  Stream<String> sendMessage({
    required String sessionId,
    required String content,
  }) async* {
    final token = _accessToken;
    developer.log('ChatDatasource: baseUrl=$_baseUrl', name: 'CHAT');
    developer.log('ChatDatasource: token=${token != null ? "present" : "NULL"}', name: 'CHAT');
    if (token == null) throw const AppAuthException('No hay sesión activa');

    final url = '$_baseUrl${AppConstants.chatStreamPath}';
    developer.log('ChatDatasource: POST $url', name: 'CHAT');

    final request = http.Request('POST', Uri.parse(url));

    request.headers.addAll({
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': 'Bearer $token',
    });

    request.body = jsonEncode({
      'sessionId': sessionId,
      'content': content,
    });

    final client = http.Client();
    try {
      developer.log('ChatDatasource: sending request...', name: 'CHAT');
      final response = await client.send(request).timeout(
        const Duration(seconds: 15),
        onTimeout: () => throw const StreamException(
          'No se pudo conectar al servidor. Verifica tu conexión.',
        ),
      );
      developer.log('ChatDatasource: response status=${response.statusCode}', name: 'CHAT');

      if (response.statusCode != 200) {
        throw ServerException(
          'Error del servidor: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }

      var buffer = StringBuffer();
      var pendingData = StringBuffer();
      await for (final chunk in response.stream.transform(utf8.decoder)) {
        buffer.write(chunk);
        var content = buffer.toString();
        var lastNewline = content.lastIndexOf('\n');
        if (lastNewline == -1) continue;

        var complete = content.substring(0, lastNewline);
        buffer = StringBuffer(content.substring(lastNewline + 1));

        for (final line in complete.split('\n')) {
          final trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            // Yield previous accumulated data if any
            if (pendingData.isNotEmpty) {
              final text = pendingData.toString();
              pendingData = StringBuffer();
              if (text == '[DONE]') return;
              yield text;
            }
            final data = trimmed.substring(5);
            // data: with content after it (single-line event)
            if (data.trim().isNotEmpty) {
              pendingData.write(data.trim());
            } else {
              // empty data: line = newline in original text
              pendingData.write('\n');
            }
          } else if (trimmed.startsWith('event:') || trimmed.isEmpty) {
            // Event boundary - yield accumulated data
            if (pendingData.isNotEmpty) {
              final text = pendingData.toString();
              pendingData = StringBuffer();
              if (text == '[DONE]') return;
              yield text;
            }
          }
        }
      }
      // Yield any remaining data
      if (pendingData.isNotEmpty) {
        final text = pendingData.toString();
        if (text != '[DONE]') yield text;
      }
    } on AppException {
      rethrow;
    } catch (e) {
      developer.log('ChatDatasource: ERROR $e', name: 'CHAT');
      throw StreamException('Error en la conexión SSE: $e');
    } finally {
      client.close();
    }
  }

  Future<List<MessageModel>> getSessionMessages(String sessionId) async {
    final token = _accessToken;
    if (token == null) throw const AppAuthException('No hay sesión activa');

    final response = await http.get(
      Uri.parse('$_baseUrl/api/v1/chat/sessions/$sessionId/messages'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode != 200) {
      throw ServerException(
        'Error al obtener mensajes',
        statusCode: response.statusCode,
      );
    }

    final List<dynamic> data = jsonDecode(response.body) as List<dynamic>;
    return data
        .map((json) => MessageModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
