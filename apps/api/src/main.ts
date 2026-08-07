import "reflect-metadata";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { NestFactory } from "@nestjs/core";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { loadAppConfig } from "./config/env";
import { HttpErrorFilter } from "./core/http-exception.filter";
import { SecureLogger } from "./core/secure-logger.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const appConfig = loadAppConfig();

  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.15 });
  }

  const logger = app.get(SecureLogger);
  app.useGlobalFilters(new HttpErrorFilter(logger));
  app.useWebSocketAdapter(new IoAdapter(app));
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser());
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true }
  }));

  const config = new DocumentBuilder()
    .setTitle("Foxtrot Concursos API")
    .setDescription("Contrato REST da plataforma Foxtrot Concursos.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addCookieAuth("access_token")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));

  await app.listen(appConfig.port);
}

void bootstrap();
