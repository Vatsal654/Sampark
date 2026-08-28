/// Purpose: English/Nepali string dictionary for the owner app.
/// Responsibilities: A flat key -> {en, ne} map, looked up via
/// `translate(locale, key)`. Deliberately hand-written rather than
/// generated from .arb files so the whole app builds without requiring
/// the `flutter gen-l10n` codegen step to have already run.
/// Related: core/i18n/locale_provider.dart.
library;

enum AppLocale { en, ne }

const Map<String, Map<AppLocale, String>> _dictionary = {
  'appName': {AppLocale.en: 'Sampark', AppLocale.ne: 'सम्पर्क'},
  'onboardingTitle': {
    AppLocale.en: 'Contact vehicle owners, safely.',
    AppLocale.ne: 'सवारी मालिकहरूलाई सुरक्षित रूपमा सम्पर्क गर्नुहोस्।',
  },
  'phoneNumberLabel': {AppLocale.en: 'Phone number', AppLocale.ne: 'फोन नम्बर'},
  'sendCode': {AppLocale.en: 'Send code', AppLocale.ne: 'कोड पठाउनुहोस्'},
  'enterCode': {AppLocale.en: 'Enter the 6-digit code', AppLocale.ne: '6-अंकको कोड प्रविष्ट गर्नुहोस्'},
  'verify': {AppLocale.en: 'Verify', AppLocale.ne: 'प्रमाणित गर्नुहोस्'},
  'vehicles': {AppLocale.en: 'Vehicles', AppLocale.ne: 'सवारी साधनहरू'},
  'alerts': {AppLocale.en: 'Alerts', AppLocale.ne: 'सतर्कताहरू'},
  'emergency': {AppLocale.en: 'Emergency', AppLocale.ne: 'आपतकालीन'},
  'settings': {AppLocale.en: 'Settings', AppLocale.ne: 'सेटिङहरू'},
  'documents': {AppLocale.en: 'Documents', AppLocale.ne: 'कागजातहरू'},
  'addVehicle': {AppLocale.en: 'Add vehicle', AppLocale.ne: 'सवारी साधन थप्नुहोस्'},
  'displayLabel': {AppLocale.en: 'Display name (shown to scanners)', AppLocale.ne: 'प्रदर्शन नाम (स्क्यानरहरूलाई देखिने)'},
  'plateNumber': {AppLocale.en: 'Plate number', AppLocale.ne: 'नम्बर प्लेट'},
  'category': {AppLocale.en: 'Category', AppLocale.ne: 'श्रेणी'},
  'save': {AppLocale.en: 'Save', AppLocale.ne: 'सुरक्षित गर्नुहोस्'},
  'activateTag': {AppLocale.en: 'Activate a tag', AppLocale.ne: 'ट्याग सक्रिय गर्नुहोस्'},
  'scanQrCode': {AppLocale.en: 'Scan QR code', AppLocale.ne: 'QR कोड स्क्यान गर्नुहोस्'},
  'tapNfcTag': {AppLocale.en: 'Tap NFC tag', AppLocale.ne: 'NFC ट्याग ट्याप गर्नुहोस्'},
  'activationPin': {AppLocale.en: 'Activation PIN (printed with your tag)', AppLocale.ne: 'सक्रियता पिन (तपाईंको ट्यागसँग छापिएको)'},
  'noAlertsYet': {AppLocale.en: 'No alerts yet.', AppLocale.ne: 'अहिलेसम्म कुनै सतर्कता छैन।'},
  'acknowledge': {AppLocale.en: 'Acknowledge', AppLocale.ne: 'स्वीकार गर्नुहोस्'},
  'archive': {AppLocale.en: 'Archive', AppLocale.ne: 'सङ्ग्रह गर्नुहोस्'},
  'pauseTag': {AppLocale.en: 'Pause this tag', AppLocale.ne: 'यो ट्याग रोक्नुहोस्'},
  'resumeTag': {AppLocale.en: 'Resume this tag', AppLocale.ne: 'यो ट्याग पुनः सुरु गर्नुहोस्'},
  'reportLost': {AppLocale.en: 'Report lost or stolen', AppLocale.ne: 'हराएको वा चोरी भएको रिपोर्ट गर्नुहोस्'},
  'notificationPreferences': {AppLocale.en: 'Notification preferences', AppLocale.ne: 'सूचना प्राथमिकताहरू'},
  'maskedCallsEnabled': {AppLocale.en: 'Allow private callbacks', AppLocale.ne: 'निजी कलब्याक अनुमति दिनुहोस्'},
  'quietHours': {AppLocale.en: 'Quiet hours', AppLocale.ne: 'शान्त घण्टाहरू'},
  'emergencyBypass': {AppLocale.en: 'Let emergencies bypass quiet hours', AppLocale.ne: 'आपतकालीन अवस्थालाई शान्त घण्टा बाइपास गर्न दिनुहोस्'},
  'emergencyProfile': {AppLocale.en: 'Emergency profile', AppLocale.ne: 'आपतकालीन प्रोफाइल'},
  'bloodGroup': {AppLocale.en: 'Blood group', AppLocale.ne: 'रक्त समूह'},
  'allergiesNote': {AppLocale.en: 'Allergies / medical note', AppLocale.ne: 'एलर्जी / चिकित्सा टिप्पणी'},
  'safeInstructions': {AppLocale.en: 'Safe instructions for responders', AppLocale.ne: 'उत्तरदाताहरूको लागि सुरक्षित निर्देशनहरू'},
  'emergencyContacts': {AppLocale.en: 'Emergency contacts', AppLocale.ne: 'आपतकालीन सम्पर्कहरू'},
  'addContact': {AppLocale.en: 'Add contact', AppLocale.ne: 'सम्पर्क थप्नुहोस्'},
  'uploadDocument': {AppLocale.en: 'Upload document', AppLocale.ne: 'कागजात अपलोड गर्नुहोस्'},
  'signOut': {AppLocale.en: 'Sign out', AppLocale.ne: 'साइन आउट'},
  'signOutAllDevices': {AppLocale.en: 'Sign out of all devices', AppLocale.ne: 'सबै उपकरणहरूबाट साइन आउट गर्नुहोस्'},
  'deleteAccount': {AppLocale.en: 'Delete my account', AppLocale.ne: 'मेरो खाता मेटाउनुहोस्'},
  'exportMyData': {AppLocale.en: 'Download my data', AppLocale.ne: 'मेरो डाटा डाउनलोड गर्नुहोस्'},
  'errorGeneric': {AppLocale.en: 'Something went wrong. Please try again.', AppLocale.ne: 'केही समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।'},
  'invalidPhone': {AppLocale.en: 'Enter a valid Nepali mobile number', AppLocale.ne: 'मान्य नेपाली मोबाइल नम्बर प्रविष्ट गर्नुहोस्'},
  'invalidCode': {AppLocale.en: 'Enter the 6-digit code', AppLocale.ne: '6-अंकको कोड प्रविष्ट गर्नुहोस्'},
  'biometricLock': {AppLocale.en: 'Unlock with biometrics', AppLocale.ne: 'बायोमेट्रिक्सको साथ अनलक गर्नुहोस्'},
};

String translate(AppLocale locale, String key) {
  final entry = _dictionary[key];
  if (entry == null) return key;
  return entry[locale] ?? entry[AppLocale.en] ?? key;
}
