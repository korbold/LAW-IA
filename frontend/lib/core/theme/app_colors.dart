import 'package:flutter/material.dart';

abstract final class AppColors {
  // Primary
  static const primary = Color(0xFF1A73E8);
  static const primaryDark = Color(0xFF4DA3FF);
  static const primaryLight = Color(0xFFE8F0FE);

  // Surfaces — Light
  static const backgroundLight = Color(0xFFF8F9FA);
  static const surfaceLight = Colors.white;
  static const cardLight = Colors.white;

  // Surfaces — Dark
  static const backgroundDark = Color(0xFF121212);
  static const surfaceDark = Color(0xFF1E1E1E);
  static const cardDark = Color(0xFF2C2C2C);

  // Text — Light
  static const textPrimaryLight = Color(0xFF202124);
  static const textSecondaryLight = Color(0xFF5F6368);

  // Text — Dark
  static const textPrimaryDark = Color(0xFFE8EAED);
  static const textSecondaryDark = Color(0xFF9AA0A6);

  // Chat bubbles
  static const userBubble = Color(0xFF1A73E8);
  static const userBubbleText = Colors.white;
  static const assistantBubbleLight = Color(0xFFF1F3F4);
  static const assistantBubbleDark = Color(0xFF303134);
  static const assistantBubbleTextLight = Color(0xFF202124);
  static const assistantBubbleTextDark = Color(0xFFE8EAED);

  // Semantic
  static const error = Color(0xFFD93025);
  static const success = Color(0xFF188038);
  static const warning = Color(0xFFF9AB00);
  static const dividerLight = Color(0xFFDADCE0);
  static const dividerDark = Color(0xFF3C4043);
}
