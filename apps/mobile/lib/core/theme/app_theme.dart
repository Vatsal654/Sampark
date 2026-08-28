/// Purpose: Material 3 theme for the owner app — original branding, not
/// derived from any existing commercial product's visual design.
library;

import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary = Color(0xFF0B6E4F);
  static const Color danger = Color(0xFFB3261E);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: primary, brightness: Brightness.light);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      appBarTheme: AppBarTheme(backgroundColor: scheme.surface, foregroundColor: scheme.onSurface, elevation: 0),
      visualDensity: VisualDensity.adaptivePlatformDensity,
    );
  }

  static ThemeData dark() {
    final scheme = ColorScheme.fromSeed(seedColor: primary, brightness: Brightness.dark);
    return ThemeData(useMaterial3: true, colorScheme: scheme, visualDensity: VisualDensity.adaptivePlatformDensity);
  }
}
