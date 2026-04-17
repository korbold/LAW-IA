import 'package:flutter/material.dart';

class CustomTextField extends StatelessWidget {
  const CustomTextField({
    super.key,
    required this.controller,
    this.hintText,
    this.errorText,
    this.onSubmitted,
    this.enabled = true,
    this.maxLines = 1,
    this.suffixIcon,
    this.autofocus = false,
  });

  final TextEditingController controller;
  final String? hintText;
  final String? errorText;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;
  final int maxLines;
  final Widget? suffixIcon;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      maxLines: maxLines,
      autofocus: autofocus,
      textInputAction: TextInputAction.send,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        hintText: hintText,
        errorText: errorText,
        suffixIcon: suffixIcon,
      ),
    );
  }
}
