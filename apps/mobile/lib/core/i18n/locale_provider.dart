/// Purpose: Riverpod provider for the app's current locale and a `t()`
/// lookup, mirroring the pattern used in apps/scanner-portal.
/// Related: core/i18n/translations.dart.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'translations.dart';
export 'translations.dart';

final localeProvider = StateProvider<AppLocale>((ref) => AppLocale.en);

extension TranslateRef on WidgetRef {
  String t(String key) => translate(watch(localeProvider), key);
}
