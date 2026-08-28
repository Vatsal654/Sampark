/**
 * Purpose: Application bootstrap — security headers, CORS, global
 * validation/exception handling, and OpenAPI docs.
 * Security: Helmet + a strict CORS allowlist are applied before any route
 * registers; Swagger UI is only mounted when SWAGGER_ENABLED=true (never
 * in production by default). See docs/SECURITY.md "Transport & headers".
 * Related: app.module.ts, docs/API.md.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedactedExceptionFilter } from './common/filters/redacted-exception.filter';
import { baseEnvSchema, loadEnv } from '@sampark/shared-config';

async function bootstrap(): Promise<void> {
  const config = loadEnv(baseEnvSchema);
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], objectSrc: ["'none'"] },
      },
    }),
  );
  app.enableCors({ origin: config.CORS_ALLOWED_ORIGINS, credentials: true });
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.useGlobalFilters(new RedactedExceptionFilter());

  if (config.SWAGGER_ENABLED && config.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Sampark API').setDescription('Nepal-first vehicle-contact platform').setVersion('0.1.0').addBearerAuth().build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console -- startup banner, not request-scoped logging
  console.log(`Sampark API listening on :${port} (${config.NODE_ENV})`);
}

bootstrap();
