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

      if (categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          return new NotFoundException('Category not found');
        }
      }

      // Delete old images if new ones are provided
      if (files) {
        const uploadedImagePublicIds = await this.prisma.productImage?.findMany(
          {
            where: {
              productId: id,
            },
            select: {
              publicId: true,
            },
          },
        );
        if (uploadedImagePublicIds?.length) {
          await Promise.all(
            uploadedImagePublicIds
              .filter((el) => Boolean(el.publicId))
              .map((el) => this.cloudinary.deleteFile(el.publicId as string)),
          );
        }
        await this.prisma.productImage.deleteMany({
          where: { productId: id },
        });
      }

      const uploadedImages = await this.cloudinary.uploadFiles(files || []);

      return this.prisma.product.update({
        where: { id },
        data: {
          ...rest,
          ...(categoryId ? { categoryId } : {}),
          ...(uploadedImages?.length > 0 && {
            images: {
              create:
                uploadedImages?.map(({ url, public_id }) => ({
                  url,
                  public_id,
                })) || [],
            },
          }),
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
