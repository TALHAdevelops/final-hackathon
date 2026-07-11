import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('assets/:id')
export class QrController {
  constructor(private readonly qr: QrService) {}

  // QR + public URL as JSON (for on-screen preview and copy-link).
  @Get('qr')
  getQr(@Param('id') id: string) {
    return this.qr.getQrData(id);
  }

  // Downloadable PNG of the QR code.
  @Get('qr.png')
  @Header('Content-Type', 'image/png')
  async getQrPng(@Param('id') id: string, @Res() res: Response) {
    const png = await this.qr.getQrPng(id);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="asset-${id}-qr.png"`,
    );
    res.send(png);
  }

  // Print-ready label payload.
  @Get('label')
  getLabel(@Param('id') id: string) {
    return this.qr.getLabel(id);
  }
}
