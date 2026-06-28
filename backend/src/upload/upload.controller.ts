import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Inject } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CLOUDINARY } from '../cloudinary/cloudinary.provider';

@Controller('upload')
export class UploadController {
  constructor(@Inject(CLOUDINARY) private readonly cloudinary: any) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'RentACarData',
          public_id: file.originalname.replace(/\.[^/.]+$/, '') + '-' + Date.now(),
        },
        (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    return {
      url: result.secure_url,
    };
  }
}
