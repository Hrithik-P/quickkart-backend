import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}
  async create(
    createProductDto: CreateProductDto,
    files: Express.Multer.File[],
  ) {
    try {
      const { categoryId, name, description, price, stock } = createProductDto;
      if (!categoryId) {
        return {
          message: 'Category is required to create a product',
        };
      }
      const category = await this.prisma?.category?.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        return {
          message: 'Category not found',
        };
      }
      const uploadedImages = await this.cloudinary.uploadFiles(files);
      return this.prisma?.product?.create({
        data: {
          categoryId,
          name,
          stock,
          price,
          description: description ?? '',
          images: {
            create:
              uploadedImages?.map(({ url, public_id }) => ({
                url,
                public_id,
              })) || [],
          },
        },
        include: {
          images: {
            select: {
              id: true,
              url: true,
            },
          },
        },
      });
    } catch (error) {
      return new BadRequestException(error);
    }
  }

  findAll() {
    return this.prisma.product.findMany({
      include: {
        images: {
          select: {
            id: true,
            url: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      omit: {
        categoryId: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          select: {
            id: true,
            url: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      omit: {
        categoryId: true,
      },
    });
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    files: Express.Multer.File[],
  ) {
    try {
      const { categoryId, ...rest } = updateProductDto;

      // Validate category if provided
      if (categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
      }

      // Handle image updates: delete old images and upload new ones
      if (files && files.length > 0) {
        await this.handleImageUpdate(id);
        const uploadedImages = await this.cloudinary.uploadFiles(files);

        // Update product with new images
        return this.prisma.product.update({
          where: { id },
          data: {
            ...rest,
            ...(categoryId && { categoryId }),
            images: {
              create: uploadedImages.map(({ url, public_id }) => ({
                url,
                public_id,
              })),
            },
          },
          include: {
            images: {
              select: {
                id: true,
                url: true,
              },
            },
          },
        });
      }

      // Update product without changing images
      return this.prisma.product.update({
        where: { id },
        data: {
          ...rest,
          ...(categoryId && { categoryId }),
        },
        include: {
          images: {
            select: {
              id: true,
              url: true,
            },
          },
        },
      });
    } catch (error) {
      // Log error for debugging (you can add proper logging here)
      console.error('Product update error:', error);

      // Re-throw specific exceptions, wrap others in BadRequestException
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update product');
    }
  }

  /**
   * Helper method to handle image updates
   * Deletes old images from Cloudinary and database
   */
  private async handleImageUpdate(productId: string): Promise<void> {
    // Get existing image public IDs for deletion from Cloudinary
    const existingImages = await this.prisma.productImage.findMany({
      where: { productId },
      select: { publicId: true },
    });

    // Delete images from Cloudinary if they have public IDs
    if (existingImages.length > 0) {
      const cloudinaryDeletePromises = existingImages
        .filter((img) => img.publicId)
        .map((img) => this.cloudinary.deleteFile(img.publicId as string));

      await Promise.all(cloudinaryDeletePromises);
    }

    // Remove all image records from database
    await this.prisma.productImage.deleteMany({
      where: { productId },
    });
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
    if (product?.images?.length) {
      await this.prisma.productImage.deleteMany({
        where: { productId: id },
      });
    }
    await this.prisma.product.delete({ where: { id } });
    return {
      message: 'Product deleted successfully',
    };
  }
}
