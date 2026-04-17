import '../../domain/entities/message.dart';
import '../../domain/repositories/chat_repository.dart';
import '../datasources/chat_remote_datasource.dart';

class ChatRepositoryImpl implements ChatRepository {
  ChatRepositoryImpl(this._datasource);

  final ChatRemoteDatasource _datasource;

  @override
  Stream<String> sendMessage({
    required String sessionId,
    required String content,
  }) {
    return _datasource.sendMessage(sessionId: sessionId, content: content);
  }

  @override
  Future<List<Message>> getSessionMessages(String sessionId) async {
    final models = await _datasource.getSessionMessages(sessionId);
    return models.map((m) => m.toEntity()).toList();
  }
}
