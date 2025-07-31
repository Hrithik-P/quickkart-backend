import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFiles(files: Express.Multer.File[]) {
    const uploadPromise = files.map((image) => {
      const convertedFile = cloudinary.uploader.upload(image?.path, {
        folder: 'products/',
      });
      return convertedFile;
    });
    const uploadedImages = await Promise.all(uploadPromise);
    return uploadedImages?.map((result) => result.url);
  }
}
