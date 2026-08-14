import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { cin: string; phone: string }) {
    if (!loginDto.cin || !loginDto.phone) {
      throw new UnauthorizedException('Please provide CIN and phone');
    }
    return this.authService.login(loginDto.cin, loginDto.phone);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    await this.authService.logout(req.user);
    return { success: true };
  }
}
