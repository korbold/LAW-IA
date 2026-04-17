import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../domain/entities/message.dart';

class ChatBubble extends StatelessWidget {
  const ChatBubble({
    super.key,
    required this.message,
  });

  final Message message;

  bool get _isUser => message.role == MessageRole.user;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = _isUser
        ? AppColors.userBubbleText
        : (isDark
            ? AppColors.assistantBubbleTextDark
            : AppColors.assistantBubbleTextLight);

    return Align(
      alignment: _isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        margin: EdgeInsets.only(
          left: _isUser ? 48 : 0,
          right: _isUser ? 0 : 48,
          bottom: 6,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: _isUser
              ? AppColors.userBubble
              : (isDark ? AppColors.assistantBubbleDark : AppColors.assistantBubbleLight),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(_isUser ? 20 : 6),
            bottomRight: Radius.circular(_isUser ? 6 : 20),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_isUser)
              Text(
                message.content,
                style: AppTypography.bodyMedium.copyWith(color: textColor),
              )
            else
              MarkdownBody(
                data: message.content,
                selectable: true,
                styleSheet: MarkdownStyleSheet(
                  p: AppTypography.bodyMedium.copyWith(color: textColor),
                  strong: AppTypography.bodyMedium.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.bold,
                  ),
                  em: AppTypography.bodyMedium.copyWith(
                    color: textColor,
                    fontStyle: FontStyle.italic,
                  ),
                  listBullet: AppTypography.bodyMedium.copyWith(color: textColor),
                  h1: AppTypography.headlineMedium.copyWith(color: textColor),
                  h2: AppTypography.bodyMedium.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                  h3: AppTypography.bodyMedium.copyWith(
                    color: textColor,
                    fontWeight: FontWeight.bold,
                  ),
                  blockSpacing: 8,
                ),
              ),
            if (message.isStreaming) ...[
              const SizedBox(height: 4),
              const _TypingIndicator(),
            ],
          ],
        ),
      ),
    );
  }
}

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dotColor = isDark
        ? AppColors.textSecondaryDark
        : AppColors.textSecondaryLight;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (index) {
            final delay = index * 0.2;
            final value = (_controller.value - delay).clamp(0.0, 1.0);
            final opacity = (0.3 + 0.7 * (0.5 + 0.5 * math.sin(value * 2 * math.pi)));
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Opacity(
                opacity: opacity,
                child: Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          }),
        );
      },
    );
  }
}
