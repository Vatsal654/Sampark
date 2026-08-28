import { Module } from '@nestjs/common';
import { WebhookCallerService } from './webhook-caller';
import { MockSmsProvider, UnimplementedSmsProvider, SMS_PROVIDER_FACTORY } from './sms.provider';
import { MockWhatsAppProvider, UnimplementedWhatsAppProvider, WHATSAPP_PROVIDER_FACTORY } from './whatsapp.provider';
import { MockPushProvider, UnimplementedPushProvider, PUSH_PROVIDER_FACTORY } from './push.provider';
import { MockVoiceBridgeProvider, UnimplementedVoiceBridgeProvider, VOICE_BRIDGE_PROVIDER_FACTORY } from './voice-bridge.provider';

@Module({
  providers: [
    WebhookCallerService,
    MockSmsProvider,
    UnimplementedSmsProvider,
    SMS_PROVIDER_FACTORY,
    MockWhatsAppProvider,
    UnimplementedWhatsAppProvider,
    WHATSAPP_PROVIDER_FACTORY,
    MockPushProvider,
    UnimplementedPushProvider,
    PUSH_PROVIDER_FACTORY,
    MockVoiceBridgeProvider,
    UnimplementedVoiceBridgeProvider,
    VOICE_BRIDGE_PROVIDER_FACTORY,
  ],
  exports: [SMS_PROVIDER_FACTORY.provide, WHATSAPP_PROVIDER_FACTORY.provide, PUSH_PROVIDER_FACTORY.provide, VOICE_BRIDGE_PROVIDER_FACTORY.provide],
})
export class ProvidersModule {}
