import '../entities/message.dart';

abstract interface class ChatRepository {
  Stream<String> sendMessage({
    required String sessionId,
    required String content,
  });

  Future<List<Message>> getSessionMessages(String sessionId);
}
