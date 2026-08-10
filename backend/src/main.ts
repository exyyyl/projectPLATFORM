import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './common/config/cors.config';
import { API_PREFIX } from './common/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs-json', method: RequestMethod.ALL },
    ],
  });

  app.use(helmet());
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: resolveCorsOrigins(process.env),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('projectPLATFORM API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
