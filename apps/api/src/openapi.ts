import "reflect-metadata";
import { writeFileSync } from "node:fs";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function exportOpenApi() {
  process.env.SKIP_PRISMA_CONNECT = "true";
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle("Foxtrot Concursos API")
    .setDescription("Contrato REST da plataforma Foxtrot Concursos.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addCookieAuth("access_token")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  writeFileSync("openapi.json", JSON.stringify(document, null, 2));
  await app.close();
}

void exportOpenApi();
