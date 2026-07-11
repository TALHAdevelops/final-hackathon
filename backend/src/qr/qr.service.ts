import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

export interface AssetQr {
  assetId: string;
  code: string;
  name: string;
  location: string;
  publicUrl: string;
  qrDataUrl: string;
}

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** The safe public page URL encoded inside the QR — only the stable publicId. */
  publicUrlFor(publicId: string): string {
    const base =
      this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:3000';
    return `${base.replace(/\/$/, '')}/a/${publicId}`;
  }

  private async getAsset(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: { id: true, code: true, name: true, location: true, publicId: true },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  /** QR as a base64 PNG data URL (for on-screen preview / <img src>). */
  async getQrData(assetId: string): Promise<AssetQr> {
    const asset = await this.getAsset(assetId);
    const publicUrl = this.publicUrlFor(asset.publicId);
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    return {
      assetId: asset.id,
      code: asset.code,
      name: asset.name,
      location: asset.location,
      publicUrl,
      qrDataUrl,
    };
  }

  /** QR as a raw PNG buffer (for file download). */
  async getQrPng(assetId: string): Promise<Buffer> {
    const asset = await this.getAsset(assetId);
    const publicUrl = this.publicUrlFor(asset.publicId);
    return QRCode.toBuffer(publicUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  /** Print-ready label payload — org name, asset identity, QR, scan hint. */
  async getLabel(assetId: string) {
    const qr = await this.getQrData(assetId);
    return {
      organization:
        this.config.get<string>('ORG_NAME') ?? 'MaintainIQ',
      assetName: qr.name,
      assetCode: qr.code,
      location: qr.location,
      publicUrl: qr.publicUrl,
      qrDataUrl: qr.qrDataUrl,
      scanInstruction: 'Scan to view asset details or report an issue.',
    };
  }
}
