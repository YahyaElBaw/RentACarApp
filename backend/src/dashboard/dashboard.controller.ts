import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getStats(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getStats(req.user, from, to);
  }

  @UseGuards(JwtAuthGuard)
  @Post('alerts/dismiss')
  dismissAlert(@Req() req: any, @Body() body: any) {
    if (!body?.password) {
      throw new UnauthorizedException('Mot de passe requis.');
    }
    return this.dashboardService.dismissAlert(
      req.user.id,
      String(body.key || ''),
      String(body.password),
    );
  }
}
