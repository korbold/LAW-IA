import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/di/providers.dart';
import '../../domain/entities/message.dart';
import '../../domain/repositories/chat_repository.dart';

final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map((results) {
    return !results.contains(ConnectivityResult.none);
  });
});

final chatNotifierProvider =
    NotifierProvider<ChatNotifier, ChatState>(ChatNotifier.new);

class ChatState {
  const ChatState({
    this.messages = const [],
    this.isStreaming = false,
    this.error,
    this.currentSessionId = 'default',
  });

  final List<Message> messages;
  final bool isStreaming;
  final String? error;
  final String currentSessionId;

  ChatState copyWith({
    List<Message>? messages,
    bool? isStreaming,
    String? error,
    String? currentSessionId,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isStreaming: isStreaming ?? this.isStreaming,
      error: error,
      currentSessionId: currentSessionId ?? this.currentSessionId,
    );
  }
}

class ChatNotifier extends Notifier<ChatState> {
  late final ChatRepository _chatRepository;
  StreamSubscription<String>? _streamSubscription;

  @override
  ChatState build() {
    _chatRepository = ref.watch(chatRepositoryProvider);
    ref.onDispose(() => _streamSubscription?.cancel());
    return const ChatState();
  }

  void sendMessage(String content) {
    if (content.trim().isEmpty || state.isStreaming) return;

    final userMessage = Message(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sessionId: state.currentSessionId,
      role: MessageRole.user,
      content: content.trim(),
      createdAt: DateTime.now(),
    );

    final assistantMessage = Message(
      id: '${DateTime.now().millisecondsSinceEpoch}_assistant',
      sessionId: state.currentSessionId,
      role: MessageRole.assistant,
      content: '',
      createdAt: DateTime.now(),
      isStreaming: true,
    );

    state = state.copyWith(
      messages: [...state.messages, userMessage, assistantMessage],
      isStreaming: true,
      error: null,
    );

    _streamSubscription?.cancel();
    _streamSubscription = _chatRepository
        .sendMessage(
      sessionId: state.currentSessionId,
      content: content.trim(),
    )
        .listen(
      (token) {
        final messages = [...state.messages];
        final lastIndex = messages.length - 1;
        messages[lastIndex] = Message(
          id: messages[lastIndex].id,
          sessionId: messages[lastIndex].sessionId,
          role: MessageRole.assistant,
          content: messages[lastIndex].content + token,
          createdAt: messages[lastIndex].createdAt,
          isStreaming: true,
        );
        state = state.copyWith(messages: messages);
      },
      onDone: () {
        final messages = [...state.messages];
        if (messages.isNotEmpty) {
          final lastIndex = messages.length - 1;
          messages[lastIndex] = Message(
            id: messages[lastIndex].id,
            sessionId: messages[lastIndex].sessionId,
            role: MessageRole.assistant,
            content: messages[lastIndex].content,
            createdAt: messages[lastIndex].createdAt,
            isStreaming: false,
          );
        }
        state = state.copyWith(messages: messages, isStreaming: false);
      },
      onError: (error) {
        state = state.copyWith(
          isStreaming: false,
          error: error.toString(),
        );
      },
    );
  }

  void clearMessages() {
    _streamSubscription?.cancel();
    state = const ChatState();
  }
}
