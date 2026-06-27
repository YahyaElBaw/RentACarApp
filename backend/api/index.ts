import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(),
  );
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.enableCors();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

let cachedServer: any;

export default async function handler(req: Request, res: Response) {
  if (!cachedServer) {
    try {
      cachedServer = await bootstrap();
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Bootstrap failed' });
      return;
    }
  }
  cachedServer(req, res);
}
