import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const port = process.env.CRAWLER_PORT || 4001;
  await app.listen(port, '0.0.0.0');
  console.log(`Crawler app running on http://localhost:${port}`);
  console.log(`Bull Board UI: http://localhost:${port}/admin/queues`);
}

bootstrap();
