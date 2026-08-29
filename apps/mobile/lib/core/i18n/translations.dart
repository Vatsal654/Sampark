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
  'displayLabel': {AppLocale.en: 'Vehicle nickname (shown to scanners)', AppLocale.ne: 'सवारी साधनको उपनाम (स्क्यानरहरूलाई देखिने)'},
  'plateNumber': {AppLocale.en: 'Registration / plate number', AppLocale.ne: 'दर्ता / नम्बर प्लेट'},
  'category': {AppLocale.en: 'Vehicle type', AppLocale.ne: 'सवारी साधनको प्रकार'},
  'save': {AppLocale.en: 'Save', AppLocale.ne: 'सुरक्षित गर्नुहोस्'},
  'activateTag': {AppLocale.en: 'Activate a tag', AppLocale.ne: 'ट्याग सक्रिय गर्नुहोस्'},
  'scanQrCode': {AppLocale.en: 'Scan QR code', AppLocale.ne: 'QR कोड स्क्यान गर्नुहोस्'},
  'tapNfcTag': {AppLocale.en: 'Tap NFC tag', AppLocale.ne: 'NFC ट्याग ट्याप गर्नुहोस्'},
  'activationPin': {AppLocale.en: 'Activation PIN (printed with your tag)', AppLocale.ne: 'सक्रियता पिन (तपाईंको ट्यागसँग छापिएको)'},
  'vehicleDetails': {AppLocale.en: 'Vehicle details', AppLocale.ne: 'सवारी साधनको विवरण'},
  'make': {AppLocale.en: 'Make (optional)', AppLocale.ne: 'ब्रान्ड (वैकल्पिक)'},
  'makeHelper': {AppLocale.en: 'The manufacturer/brand, e.g. Toyota, Hyundai, Suzuki', AppLocale.ne: 'निर्माता/ब्रान्ड, जस्तै Toyota, Hyundai, Suzuki'},
  'model': {AppLocale.en: 'Model (optional)', AppLocale.ne: 'मोडेल (वैकल्पिक)'},
  'modelHelper': {AppLocale.en: 'The vehicle model, e.g. Corolla, Creta, Swift', AppLocale.ne: 'सवारी साधनको मोडेल, जस्तै Corolla, Creta, Swift'},
  'editVehicle': {AppLocale.en: 'Edit vehicle', AppLocale.ne: 'सवारी साधन सम्पादन गर्नुहोस्'},
  'deleteVehicle': {AppLocale.en: 'Delete vehicle', AppLocale.ne: 'सवारी साधन मेटाउनुहोस्'},
  'deleteVehicleConfirm': {
    AppLocale.en: 'Delete this vehicle? This cannot be undone.',
    AppLocale.ne: 'यो सवारी साधन मेटाउने हो? यो फिर्ता गर्न सकिँदैन।',
  },
  'cancel': {AppLocale.en: 'Cancel', AppLocale.ne: 'रद्द गर्नुहोस्'},
  'delete': {AppLocale.en: 'Delete', AppLocale.ne: 'मेटाउनुहोस्'},
  'variant': {AppLocale.en: 'Variant / trim (optional)', AppLocale.ne: 'भेरियन्ट / ट्रिम (वैकल्पिक)'},
  'variantHelper': {AppLocale.en: 'The specific trim, if you know it, e.g. VXi, ZXi, SX, Sport', AppLocale.ne: 'विशेष ट्रिम, थाहा भए, जस्तै VXi, ZXi, SX, Sport'},
  'manufacturingYear': {AppLocale.en: 'Manufacturing year (optional)', AppLocale.ne: 'निर्माण वर्ष (वैकल्पिक)'},
  'fuelType': {AppLocale.en: 'Fuel type (optional)', AppLocale.ne: 'इन्धनको प्रकार (वैकल्पिक)'},
  'vehicleColor': {AppLocale.en: 'Color (optional)', AppLocale.ne: 'रङ (वैकल्पिक)'},
  'vinNumber': {AppLocale.en: 'VIN / chassis number (optional)', AppLocale.ne: 'VIN / चेसिस नम्बर (वैकल्पिक)'},
  'engineNumber': {AppLocale.en: 'Engine number (optional)', AppLocale.ne: 'इन्जिन नम्बर (वैकल्पिक)'},
  'vehicleInformationSection': {AppLocale.en: 'Vehicle information', AppLocale.ne: 'सवारी साधनको जानकारी'},
  'identificationSection': {AppLocale.en: 'Identification (optional)', AppLocale.ne: 'पहिचान (वैकल्पिक)'},
  'saveChanges': {AppLocale.en: 'Save changes', AppLocale.ne: 'परिवर्तनहरू सुरक्षित गर्नुहोस्'},
  'tagStatusLabel': {AppLocale.en: 'Tag status', AppLocale.ne: 'ट्यागको स्थिति'},
  'noTagAssociated': {AppLocale.en: 'No tag associated yet', AppLocale.ne: 'अहिलेसम्म कुनै ट्याग जोडिएको छैन'},
  'tagStatus_active': {AppLocale.en: 'Active', AppLocale.ne: 'सक्रिय'},
  'tagStatus_paused': {AppLocale.en: 'Paused', AppLocale.ne: 'रोकिएको'},
  'tagStatus_reported_lost': {AppLocale.en: 'Reported lost', AppLocale.ne: 'हराएको रिपोर्ट गरिएको'},
  'tagStatus_replaced': {AppLocale.en: 'Replaced', AppLocale.ne: 'बदलिएको'},
  'tagStatus_revoked': {AppLocale.en: 'Revoked', AppLocale.ne: 'रद्द गरिएको'},
  'tagStatus_pending_activation': {AppLocale.en: 'Pending activation', AppLocale.ne: 'सक्रियता बाँकी'},
  'tagStatus_issued': {AppLocale.en: 'Issued, not yet activated', AppLocale.ne: 'जारी गरिएको, अझै सक्रिय भएको छैन'},
  'tagStatus_manufactured': {AppLocale.en: 'Not yet issued', AppLocale.ne: 'अझै जारी गरिएको छैन'},
  'category_car': {AppLocale.en: 'Car', AppLocale.ne: 'कार'},
  'category_bike': {AppLocale.en: 'Bike', AppLocale.ne: 'बाइक'},
  'category_scooter': {AppLocale.en: 'Scooter', AppLocale.ne: 'स्कुटर'},
  'category_taxi': {AppLocale.en: 'Taxi', AppLocale.ne: 'ट्याक्सी'},
  'category_commercial': {AppLocale.en: 'Commercial', AppLocale.ne: 'व्यावसायिक'},
  'category_other': {AppLocale.en: 'Other', AppLocale.ne: 'अन्य'},
  'fuel_petrol': {AppLocale.en: 'Petrol', AppLocale.ne: 'पेट्रोल'},
  'fuel_diesel': {AppLocale.en: 'Diesel', AppLocale.ne: 'डिजेल'},
  'fuel_electric': {AppLocale.en: 'Electric', AppLocale.ne: 'बिजुली'},
  'fuel_hybrid': {AppLocale.en: 'Hybrid', AppLocale.ne: 'हाइब्रिड'},
  'fuel_cng': {AppLocale.en: 'CNG', AppLocale.ne: 'CNG'},
  'fuel_other': {AppLocale.en: 'Other', AppLocale.ne: 'अन्य'},
  'fuelTypeNotSet': {AppLocale.en: 'Not set', AppLocale.ne: 'सेट गरिएको छैन'},
  'pauseTagConfirmTitle': {AppLocale.en: 'Pause this tag?', AppLocale.ne: 'यो ट्याग रोक्ने हो?'},
  'pauseTagConfirmBody': {
    AppLocale.en: 'While paused, anyone who scans this tag will see it as temporarily unavailable — '
        'they will not be able to contact you or send an alert through it.',
    AppLocale.ne:
        'रोकिएको बेला, यो ट्याग स्क्यान गर्ने जोसुकैले यसलाई अस्थायी रूपमा अनुपलब्ध देख्नेछन् — उनीहरूले तपाईंलाई सम्पर्क गर्न वा यसबाट सतर्कता पठाउन सक्नेछैनन्।',
  },
  'pause': {AppLocale.en: 'Pause', AppLocale.ne: 'रोक्नुहोस्'},
  'reportTagLostConfirmTitle': {AppLocale.en: 'Report this tag as lost or stolen?', AppLocale.ne: 'यो ट्याग हराएको वा चोरी भएको रिपोर्ट गर्ने हो?'},
  'reportTagLostConfirmBody': {
    AppLocale.en: 'This cannot be undone from the app. Once reported lost, this tag can never be '
        'activated again — by you or anyone else — and it will stop working for scanners immediately. '
        'You can request a replacement tag afterward.',
    AppLocale.ne:
        'यो एपबाट फिर्ता गर्न सकिँदैन। हराएको रिपोर्ट गरेपछि, यो ट्याग फेरि कहिल्यै सक्रिय गर्न सकिँदैन — '
        'तपाईं वा अरू कसैले पनि — र यो स्क्यानरहरूको लागि तुरुन्तै काम गर्न छोड्नेछ। तपाईं पछि प्रतिस्थापन ट्यागको लागि अनुरोध गर्न सक्नुहुन्छ।',
  },
  'reportLostAction': {AppLocale.en: 'Report Lost', AppLocale.ne: 'हराएको रिपोर्ट गर्नुहोस्'},
  'tagSectionTitle': {AppLocale.en: 'Tag', AppLocale.ne: 'ट्याग'},
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
  'cameraPermissionDenied': {
    AppLocale.en: 'Camera access is off for Sampark. Enable it in your device Settings to scan a tag.',
    AppLocale.ne: 'सम्पर्कका लागि क्यामेरा पहुँच बन्द छ। ट्याग स्क्यान गर्न आफ्नो डिभाइस सेटिङमा यसलाई सक्षम गर्नुहोस्।',
  },
  'invalidPhone': {AppLocale.en: 'Enter a valid Nepali mobile number', AppLocale.ne: 'मान्य नेपाली मोबाइल नम्बर प्रविष्ट गर्नुहोस्'},
  'invalidPlateNumber': {AppLocale.en: 'Enter a valid plate number (4–12 characters)', AppLocale.ne: 'मान्य नम्बर प्लेट प्रविष्ट गर्नुहोस् (4–12 अक्षर)'},
  'invalidManufacturingYear': {
    AppLocale.en: 'Enter a valid manufacturing year',
    AppLocale.ne: 'मान्य निर्माण वर्ष प्रविष्ट गर्नुहोस्',
  },
  'invalidVinNumber': {AppLocale.en: 'VIN / chassis number should be 4–32 characters', AppLocale.ne: 'VIN / चेसिस नम्बर 4–32 अक्षरको हुनुपर्छ'},
  'invalidEngineNumber': {AppLocale.en: 'Engine number should be 2–32 characters', AppLocale.ne: 'इन्जिन नम्बर 2–32 अक्षरको हुनुपर्छ'},
  'nfcNotAvailable': {AppLocale.en: 'NFC is not available on this device.', AppLocale.ne: 'यो डिभाइसमा NFC उपलब्ध छैन।'},
  'nfcError': {AppLocale.en: 'NFC reading failed. Please try again or use the QR scanner.', AppLocale.ne: 'NFC पढ्न असफल भयो। कृपया फेरि प्रयास गर्नुहोस् वा QR स्क्यानर प्रयोग गर्नुहोस्।'},
  'invalidCode': {AppLocale.en: 'Enter the 6-digit code', AppLocale.ne: '6-अंकको कोड प्रविष्ट गर्नुहोस्'},
  'biometricLock': {AppLocale.en: 'Unlock with biometrics', AppLocale.ne: 'बायोमेट्रिक्सको साथ अनलक गर्नुहोस्'},
};

String translate(AppLocale locale, String key) {
  final entry = _dictionary[key];
  if (entry == null) return key;
  return entry[locale] ?? entry[AppLocale.en] ?? key;
}
