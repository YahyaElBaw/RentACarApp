import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DepenseService } from './depense.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('depenses')
export class DepenseController {
  constructor(private readonly depenseService: DepenseService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createDepenseDto: any, @Req() req: any) {
    return this.depenseService.create(createDepenseDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  createMany(@Body() createDepenseDtos: any[], @Req() req: any) {
    return this.depenseService.createMany(createDepenseDtos, req.user);
  }

  @Get()
  findAll(@Query('carId') carId?: string) {
    return this.depenseService.findAll(carId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.depenseService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDepenseDto: any) {
    return this.depenseService.update(id, updateDepenseDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.depenseService.remove(id, req.user);
  }
}
