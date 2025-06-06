import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdatePresentationDto } from './dto/update-presentation.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from 'generated/prisma';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PresentationService {
  constructor(private readonly prisma: PrismaService) {}

  async createPresentation(username: string, title: string) {
    let creator = await this.prisma.user.findUnique({
      where: { nickname: username },
    });

    if (!creator) {
      creator = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          nickname: username,
          role: Role.CREATOR,
        },
      });
    }

    const presentation = await this.prisma.presentation.create({
      data: {
        title,
        creatorId: creator.id,
        creatorName: creator.nickname,
        users: {
          connect: { id: creator.id },
        },
        slides: {
          create: {
            id: uuidv4(),
            title: 'First Slide',
            blocks: { create: [] },
          },
        },
      },
      include: {
        users: true,
        slides: { include: { blocks: true } },
      },
    });

    return presentation;
  }

  async findAll() {
    try {
      let presentations = await this.prisma.presentation.findMany({
        include: {
          slides: true,
          users: true,
          creator: true,
        },
      });
      if (!presentations)
        throw new NotFoundException('Not found presentation!');
      return presentations;
    } catch (error) {
      console.log(error);
    }
  }
  findOne(id: number) {
    return `This action returns a #${id} presentation`;
  }

  update(id: number, updatePresentationDto: UpdatePresentationDto) {
    return `This action updates a #${id} presentation`;
  }

  remove(id: number) {
    return `This action removes a #${id} presentation`;
  }
}
