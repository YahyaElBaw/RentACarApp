import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
      {
        code: body.code,
        type: body.type,
        message: body.message,
        metadata: body.metadata,
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('alerts/bulk-dismiss')
  bulkDismissAlerts(@Req() req: any, @Body() body: any) {
    if (!body?.password) {
      throw new UnauthorizedException('Mot de passe requis.');
    }
    if (!Array.isArray(body.alerts) || !body.alerts.length) {
      throw new UnauthorizedException('Aucune alerte selectionnee.');
    }
    return this.dashboardService.bulkDismissAlerts(
      req.user.id,
      body.alerts,
      String(body.password),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('alerts/removed')
  getDismissedAlerts(@Query('code') code?: string) {
    return this.dashboardService.getDismissedAlerts(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Patch('alerts/restore/:id')
  restoreAlert(@Param('id') id: string) {
    return this.dashboardService.restoreAlert(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Delete('alerts/permanent/:id')
  permanentDeleteAlert(@Param('id') id: string) {
    return this.dashboardService.permanentDeleteAlert(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('alerts/bulk-restore')
  bulkRestoreAlerts(@Body() body: { ids: string[] }) {
    return this.dashboardService.bulkRestoreAlerts(body.ids);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('alerts/bulk-permanent-delete')
  bulkPermanentDeleteAlerts(@Body() body: { ids: string[] }) {
    return this.dashboardService.bulkPermanentDeleteAlerts(body.ids);
  }
}
