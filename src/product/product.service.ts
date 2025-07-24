import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}
  async create(createProductDto: CreateProductDto) {
    const { categoryId, imageUrls, name, description, price, stock } =
      createProductDto;
    if (!categoryId) {
      throw new NotFoundException('Category is required to create a product');
    }
    const category = await this.prisma?.category?.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma?.product?.create({
      data: {
        categoryId,
        name,
        stock,
        price,
        description: description ?? '',
        images: {
          create: imageUrls?.map((url) => ({ url })) || [],
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

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { categoryId, imageUrls, ...rest } = updateProductDto;

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Delete old images if new ones are provided
    if (imageUrls) {
      await this.prisma.productImage.deleteMany({
        where: { productId: id },
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryId ? { categoryId } : {}),
        ...(imageUrls && {
          images: {
            create: imageUrls.map((url) => ({ url })),
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
