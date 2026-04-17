class ChatSession {
  const ChatSession({
    required this.id,
    required this.title,
    required this.createdAt,
    this.lastMessageAt,
  });

  final String id;
  final String title;
  final DateTime createdAt;
  final DateTime? lastMessageAt;
}
