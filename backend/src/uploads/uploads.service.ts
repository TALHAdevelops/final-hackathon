import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { EvidenceType } from '@prisma/client';

export interface UploadResult {
  url: string;
  type: EvidenceType;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const cloud = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const key = this.config.get<string>('CLOUDINARY_API_KEY');
    const secret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (cloud && key && secret) {
      cloudinary.config({
        cloud_name: cloud,
        api_key: key,
        api_secret: secret,
      });
      this.configured = true;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /** Upload an in-memory file buffer to Cloudinary and return its secure URL. */
  async upload(file: Express.Multer.File): Promise<UploadResult> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Media uploads are not configured (missing Cloudinary credentials)',
      );
    }

    const isVideo = file.mimetype.startsWith('video/');
    const type = isVideo ? EvidenceType.VIDEO : EvidenceType.IMAGE;

    const url = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'maintainiq/evidence', resource_type: isVideo ? 'video' : 'image' },
        (err, result) => {
          if (err || !result) {
            reject(err ?? new Error('Upload failed'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });

    this.logger.log(`Uploaded evidence: ${url}`);
    return { url, type };
  }
}
