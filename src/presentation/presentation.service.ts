import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from 'generated/prisma';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PresentationService {
  constructor(private prisma: PrismaService) {}

  async createPresentation(username: string, title: string) {
    let user = await this.prisma.user.findUnique({
      where: { nickname: username },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          nickname: username,
          role: Role.CREATOR,
        },
      });
    }

    return this.prisma.presentation.create({
      data: {
        id: uuidv4(),
        title,
        creatorId: user.id,
        creatorName: username,
        users: {
          connect: { id: user.id },
        },
        slides: {
          create: [{
            id: uuidv4(),
            title: 'First Slide',
            order: 0,
            blocks: {
              create: [{
                id: uuidv4(),
                content: 'Click to edit text',
                x: 100,
                y: 100,
                width: 200,
                height: 50,
                styles: {},
              }]
            }
          }]
        }
      },
      include: {
        slides: {
          include: {
            blocks: true,
          },
        },
        users: true,
      },
    });
  }

  async findAll() {
    return this.prisma.presentation.findMany({
      include: {
        slides: {
          include: {
            blocks: true,
          },
        },
        users: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.presentation.findUnique({
      where: { id },
      include: {
        slides: {
          include: {
            blocks: true,
          },
        },
        users: true,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.slide.deleteMany({
      where: { presentationId: id },
    });

    return this.prisma.presentation.delete({
      where: { id },
    });
  }
}