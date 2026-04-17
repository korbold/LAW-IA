enum MessageRole { user, assistant }

class Message {
  Message({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    required this.createdAt,
    this.isStreaming = false,
  });

  final String id;
  final String sessionId;
  final MessageRole role;
  String content;
  final DateTime createdAt;
  bool isStreaming;
}
