import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFiles(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      return [];
    }

    // Validate files
    this.validateFiles(files);

    try {
      const uploadPromises = files.map(async (file) => {
        try {
          // Convert buffer to base64 string for Cloudinary
          const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          const result = await cloudinary.uploader.upload(base64String, {
            folder: 'products/',
            resource_type: 'auto',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          });

          return result;
        } catch (error) {
          console.error(`Failed to upload file ${file.originalname}:`, error);
          throw new BadRequestException(
            `Failed to upload ${file.originalname}: ${(error as Error).message}`,
          );
        }
      });

      const uploadedImages = await Promise.all(uploadPromises);

      return uploadedImages.map((result) => ({
        url: result.secure_url || result.url,
        public_id: result?.public_id,
      }));
    } catch (error) {
      throw new BadRequestException(
        error,
        'Failed to upload files to Cloudinary',
      );
    }
  }

  private validateFiles(files: Express.Multer.File[]) {
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    files.forEach((file) => {
      // Check file size
      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `File ${file.originalname} is too large. Maximum size is 5MB.`,
        );
      }

      // Check file type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File ${file.originalname} has an unsupported format. Only JPEG, PNG, GIF, and WebP are allowed.`,
        );
      }

      // Check if file has buffer
      if (!file.buffer) {
        throw new BadRequestException(
          `File ${file.originalname} is missing data.`,
        );
      }
    });
  }

  async deleteFile(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      throw new BadRequestException('Failed to delete file from Cloudinary');
    }
  }
}
