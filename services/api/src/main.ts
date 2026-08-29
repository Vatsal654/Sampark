/**
 * Purpose: Application bootstrap — security headers, CORS, global
 * validation/exception handling, and OpenAPI docs.
 * Security: Helmet + a strict CORS allowlist are applied before any route
 * registers; Swagger UI is only mounted when SWAGGER_ENABLED=true (never
 * in production by default). See docs/SECURITY.md "Transport & headers".
 * Responsibilities: Loads services/api/.env into process.env before
 * anything else runs — nothing else in this codebase does this (no
 * @nestjs/config ConfigModule, no other dotenv import anywhere), so
 * without this line `.env` is silently never read when the process is
 * started directly (`npm run start` / `node dist/main.js` /
 * `nest start --watch`), and every value in loadEnv(baseEnvSchema)
 * below quietly falls back to its schema default instead — including
 * CORS_ALLOWED_ORIGINS, which is how a correctly-edited .env adding a
 * LAN origin can have zero effect: the app never saw it. dotenv never
 * overwrites a variable already present in process.env (e.g. one a real
 * deployment's platform injected directly), and is a silent no-op when
 * no .env file exists (a production container's normal case), so this
 * is safe everywhere.
 * Related: app.module.ts, docs/API.md, database/data-source.ts (the
 * same gap, fixed the same way, for the migration CLI).
 */
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedactedExceptionFilter } from './common/filters/redacted-exception.filter';
import { baseEnvSchema, loadEnv } from '@sampark/shared-config';

async function bootstrap(): Promise<void> {
  const config = loadEnv(baseEnvSchema);

  // Development-only: prints exactly what this running process resolved
  // CORS_ALLOWED_ORIGINS to, straight from the parsed config object
  // app.enableCors() below is about to receive — origins are not secrets.
  // If a request from an origin you expect to see in this list still
  // doesn't get an Access-Control-Allow-Origin header, this line tells
  // you definitively whether the *process* has the origin (a code/config
  // problem) or not (almost always a stale build/process, or .env not
  // actually being the file this process read — check `pwd` and
  // `ls -la dist/main.js` timestamps against your last edit/build).
  if (config.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console -- intentional dev-only startup diagnostic
    console.log(`[Sampark API] CORS_ALLOWED_ORIGINS resolved to: ${JSON.stringify(config.CORS_ALLOWED_ORIGINS)}`);
  }

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
