import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import slugify from 'slugify';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}
  async create(createCategoryDto: CreateCategoryDto) {
    const slug = slugify(createCategoryDto.name, {
      lower: true,
      strict: true,
      trim: true,
    });
    const isExisting = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (isExisting) {
      throw new ConflictException('Category with this slug already exists');
    }

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        slug,
      },
    });
  }

  findAll() {
    const categories = this.prisma.category.findMany();
    return categories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with id '${id}' not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const isExisting = await this.findOne(id);

    if (Object.keys(updateCategoryDto).length === 0) {
      throw new BadRequestException('No data provided for update.');
    }

    if (isExisting) {
      const slug = slugify(updateCategoryDto.name ?? '', {
        lower: true,
        strict: true,
        trim: true,
      });
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...updateCategoryDto,
          ...(updateCategoryDto.name ? { slug } : {}),
        },
      });
    }
    throw new NotFoundException('Category with this ID does not exist');
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
