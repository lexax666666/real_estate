import { Module } from '@nestjs/common';
import { SdatAdapter } from './sdat.adapter';
import { SdatBrowserService } from './sdat-browser.service';
import { SdatParserService } from './sdat-parser.service';
import { SITE_ADAPTER } from '../../core/interfaces/site-adapter.interface';

@Module({
  providers: [
    SdatBrowserService,
    SdatParserService,
    {
      provide: SITE_ADAPTER,
      useClass: SdatAdapter,
    },
    SdatAdapter,
  ],
  exports: [SITE_ADAPTER, SdatAdapter],
})
export class SdatModule {}
