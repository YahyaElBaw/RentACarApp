import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('version')
  getVersion(): { version: string } {
    return { version: this.appService.getAppVersion() };
  }

  @Get('ping')
  ping(): { ok: boolean; ts: number } {
    // Lightweight keep-alive endpoint — used by Vercel cron to prevent cold starts
    return { ok: true, ts: Date.now() };
  }
}
