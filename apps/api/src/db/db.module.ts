import { Module, Global } from '@nestjs/common';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const sql = neon(process.env.POSTGRES_URL!);
        return drizzle(sql, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
