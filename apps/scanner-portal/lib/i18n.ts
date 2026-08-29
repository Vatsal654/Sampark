/**
 * Purpose: Minimal English/Nepali translation dictionary for the scanner
 * portal, deliberately not pulling in a full i18n framework to keep the
 * bundle light for low-bandwidth Nepali mobile networks.
 * Responsibilities: A flat key→{en,ne} map and a `t(key)` lookup used by
 * every component.
 * Related: components/LanguageProvider.tsx.
 */
export type Locale = 'en' | 'ne';

export const DICTIONARY = {
  appIntro: {
    en: 'You are contacting a vehicle owner through Sampark.',
    ne: 'तपाईं सम्पर्क मार्फत सवारी मालिकलाई सम्पर्क गर्दै हुनुहुन्छ।',
  },
  privacyExplainer: {
    en: 'The owner’s phone number is never shown to you, and your number is never shown to them.',
    ne: 'मालिकको फोन नम्बर तपाईंलाई कहिल्यै देखाइँदैन, र तपाईंको नम्बर पनि उनीहरूलाई कहिल्यै देखाइँदैन।',
  },
  loading: { en: 'Loading…', ne: 'लोड हुँदैछ…' },
  vehicleLabelFallback: { en: 'This vehicle', ne: 'यो सवारी साधन' },
  sendAlert: { en: 'Send an alert', ne: 'सतर्कता पठाउनुहोस्' },
  requestCallback: { en: 'Request a private callback', ne: 'निजी कलब्याक अनुरोध गर्नुहोस्' },
  emergency: { en: 'This is an emergency', ne: 'यो एउटा आपतकालीन अवस्था हो' },
  reportTag: { en: 'Report a damaged or suspicious tag', ne: 'बिग्रिएको वा शंकास्पद ट्यागको रिपोर्ट गर्नुहोस्' },
  categoryBlockingAccess: { en: 'Blocking access', ne: 'बाटो रोकिएको' },
  categoryLightsOn: { en: 'Lights left on', ne: 'लाइट खुला छ' },
  categoryWindowOpen: { en: 'Window or door open', ne: 'झ्याल वा ढोका खुला छ' },
  categoryBeingTowed: { en: 'Being towed', ne: 'टो गरिँदैछ' },
  categoryParkingConcern: { en: 'Parking concern', ne: 'पार्किङ सम्बन्धी समस्या' },
  categoryOther: { en: 'Other', ne: 'अन्य' },
  optionalNote: { en: 'Add a short note (optional)', ne: 'छोटो टिप्पणी थप्नुहोस् (वैकल्पिक)' },
  shareLocation: { en: 'Share my location with the vehicle owner', ne: 'सवारी मालिकसँग मेरो स्थान साझा गर्नुहोस्' },
  locationRequesting: { en: 'Requesting your location…', ne: 'तपाईंको स्थान अनुरोध गर्दै…' },
  locationReady: { en: 'Location ready to share', ne: 'स्थान साझा गर्न तयार छ' },
  locationUnavailable: { en: 'Location unavailable — send without location', ne: 'स्थान उपलब्ध छैन — स्थान बिना पठाउनुहोस्' },
  locationReasonInsecureContext: {
    en: 'This preview address doesn\'t support location sharing (it needs a secure https:// connection). You can still send the alert.',
    ne: 'यो पूर्वावलोकन ठेगानाले स्थान साझेदारी समर्थन गर्दैन (यसलाई सुरक्षित https:// जडान चाहिन्छ)। तपाईं अझै पनि सतर्कता पठाउन सक्नुहुन्छ।',
  },
  locationReasonPermissionDenied: {
    en: 'Location access was denied. You can still send the alert without it.',
    ne: 'स्थान पहुँच अस्वीकार गरियो। तपाईं यसबिना नै सतर्कता पठाउन सक्नुहुन्छ।',
  },
  locationReasonPositionUnavailable: {
    en: "Your device couldn't determine its location right now. You can still send the alert.",
    ne: 'तपाईंको यन्त्रले अहिले स्थान पत्ता लगाउन सकेन। तपाईं अझै पनि सतर्कता पठाउन सक्नुहुन्छ।',
  },
  locationReasonTimeout: {
    en: 'Finding your location took too long. You can still send the alert.',
    ne: 'तपाईंको स्थान फेला पार्न धेरै समय लाग्यो। तपाईं अझै पनि सतर्कता पठाउन सक्नुहुन्छ।',
  },
  locationReasonUnsupported: {
    en: "This browser doesn't support sharing location. You can still send the alert.",
    ne: 'यो ब्राउजरले स्थान साझेदारी समर्थन गर्दैन। तपाईं अझै पनि सतर्कता पठाउन सक्नुहुन्छ।',
  },
  submit: { en: 'Send', ne: 'पठाउनुहोस्' },
  cancel: { en: 'Cancel', ne: 'रद्द गर्नुहोस्' },
  alertSentTitle: { en: 'Alert sent securely', ne: 'सतर्कता सुरक्षित रूपमा पठाइयो' },
  alertSentBody: {
    en: 'The vehicle owner may not be available immediately. Thank you for helping.',
    ne: 'सवारी मालिक तुरुन्तै उपलब्ध नहुन सक्नुहुन्छ। मद्दतको लागि धन्यवाद।',
  },
  errorGeneric: { en: 'Something went wrong. Please try again.', ne: 'केही समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।' },
  errorRateLimited: { en: 'Too many requests. Please wait a moment and try again.', ne: 'धेरै अनुरोधहरू। कृपया केही समय पर्खनुहोस्।' },
  rateLimitedTitle: { en: 'Too many requests', ne: 'धेरै अनुरोधहरू' },
  tagNotFoundTitle: { en: 'Tag not found', ne: 'ट्याग फेला परेन' },
  tagNotFoundBody: {
    en: 'This link is invalid or has expired. If you scanned a physical tag, it may be damaged.',
    ne: 'यो लिंक अमान्य छ वा म्याद सकिएको छ। यदि तपाईंले भौतिक ट्याग स्क्यान गर्नुभयो भने, यो बिग्रिएको हुन सक्छ।',
  },
  tagUnactivatedTitle: { en: 'This tag is not yet activated', ne: 'यो ट्याग अझै सक्रिय गरिएको छैन' },
  tagUnactivatedBody: {
    en: 'The owner has not finished setting up this tag yet, so alerts cannot be sent.',
    ne: 'मालिकले यो ट्याग अझै सेटअप गर्न सकेका छैनन्, त्यसैले सतर्कता पठाउन सकिँदैन।',
  },
  tagPausedTitle: { en: 'This tag is temporarily paused', ne: 'यो ट्याग अस्थायी रूपमा रोकिएको छ' },
  tagPausedBody: { en: 'The owner has paused alerts for now, for example while parking with an attendant.', ne: 'मालिकले अहिलेको लागि सतर्कता रोक्नुभएको छ।' },
  tagUnavailableTitle: { en: 'This tag is unavailable', ne: 'यो ट्याग उपलब्ध छैन' },
  tagUnavailableBody: { en: 'This tag has been revoked, reported lost, or replaced by its owner.', ne: 'यो ट्याग रद्द, हराएको रिपोर्ट, वा प्रतिस्थापन गरिएको छ।' },
  invalidLinkTitle: { en: 'Invalid link', ne: 'अमान्य लिंक' },
  invalidLinkBody: {
    en: 'This link is not shaped like a real Sampark tag link. Please rescan the physical tag.',
    ne: 'यो लिंक वास्तविक सम्पर्क ट्याग लिंक जस्तो देखिँदैन। कृपया भौतिक ट्याग पुन: स्क्यान गर्नुहोस्।',
  },
  unauthorizedTitle: { en: "This link can't be used right now", ne: 'यो लिंक अहिले प्रयोग गर्न सकिँदैन' },
  unauthorizedBody: {
    en: 'Sampark rejected this request. Please rescan the physical tag, or try again later.',
    ne: 'सम्पर्कले यो अनुरोध अस्वीकार गर्यो। कृपया भौतिक ट्याग पुन: स्क्यान गर्नुहोस्, वा पछि फेरि प्रयास गर्नुहोस्।',
  },
  serverErrorTitle: { en: 'Sampark is temporarily unavailable', ne: 'सम्पर्क अस्थायी रूपमा उपलब्ध छैन' },
  serverErrorBody: {
    en: "Something went wrong on our end. Please try again in a moment — this isn't a problem with your tag.",
    ne: 'हाम्रो तर्फबाट केही समस्या भयो। कृपया केही क्षणमा फेरि प्रयास गर्नुहोस् — यो तपाईंको ट्यागको समस्या होइन।',
  },
  networkErrorTitle: { en: 'Unable to connect to Sampark', ne: 'सम्पर्कमा जडान गर्न असमर्थ' },
  networkErrorBody: {
    en: "Your device couldn't reach Sampark's servers. Check your internet connection and try again.",
    ne: 'तपाईंको यन्त्रले सम्पर्कको सर्भरमा पुग्न सकेन। कृपया आफ्नो इन्टरनेट जडान जाँच गरेर फेरि प्रयास गर्नुहोस्।',
  },
  retry: { en: 'Try again', ne: 'फेरि प्रयास गर्नुहोस्' },
  emergencyWarning: {
    en: 'For immediate danger to life, contact local emergency services first.',
    ne: 'जीवनलाई तत्काल खतरा भएमा, पहिले स्थानीय आपतकालीन सेवाहरूलाई सम्पर्क गर्नुहोस्।',
  },
  emergencyConfirm: { en: 'I confirm this is a genuine emergency', ne: 'म पुष्टि गर्छु कि यो साँचो आपतकालीन अवस्था हो' },
  phoneNumberLabel: { en: 'Your phone number', ne: 'तपाईंको फोन नम्बर' },
  phoneNumberHelp: {
    en: 'Used only to connect a private callback. It is never shown to the vehicle owner.',
    ne: 'यो निजी कलब्याक जडान गर्न मात्र प्रयोग गरिन्छ। यो सवारी मालिकलाई कहिल्यै देखाइँदैन।',
  },
  sendCode: { en: 'Send verification code', ne: 'प्रमाणीकरण कोड पठाउनुहोस्' },
  enterCode: { en: 'Enter the 6-digit code', ne: '6-अंकको कोड प्रविष्ट गर्नुहोस्' },
  verifyAndCall: { en: 'Verify and request callback', ne: 'प्रमाणित गर्नुहोस् र कलब्याक अनुरोध गर्नुहोस्' },
  callbackNotEnabled: {
    en: 'Private callback is not available for this vehicle right now.',
    ne: 'अहिले यो सवारीको लागि निजी कलब्याक उपलब्ध छैन।',
  },
  callConsent: {
    en: 'I agree to be connected through a private callback. My number will not be shared with the owner.',
    ne: 'म निजी कलब्याक मार्फत जडान हुन सहमत छु। मेरो नम्बर मालिकसँग साझा गरिने छैन।',
  },
  callRequested: { en: 'Callback requested', ne: 'कलब्याक अनुरोध गरियो' },
  callRequestedBody: { en: 'You should receive a call shortly through a private, masked number.', ne: 'तपाईंले चाँडै एउटा निजी, लुकेको नम्बर मार्फत कल प्राप्त गर्नुहुनेछ।' },
  backHome: { en: 'Back', ne: 'फिर्ता' },
  reportReasonDamaged: { en: 'The tag looks damaged', ne: 'ट्याग बिग्रिएको देखिन्छ' },
  reportReasonSuspicious: { en: 'This looks suspicious or copied', ne: 'यो शंकास्पद वा नक्कल गरिएको देखिन्छ' },
  reportReasonOther: { en: 'Other issue', ne: 'अन्य समस्या' },
  reportSent: { en: 'Thank you, your report was received.', ne: 'धन्यवाद, तपाईंको रिपोर्ट प्राप्त भयो।' },
} as const;

export type TranslationKey = keyof typeof DICTIONARY;

export function translate(locale: Locale, key: TranslationKey): string {
  return DICTIONARY[key][locale];
}
