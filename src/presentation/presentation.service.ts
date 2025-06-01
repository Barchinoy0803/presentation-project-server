import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePresentationDto } from './dto/create-presentation.dto';
import { UpdatePresentationDto } from './dto/update-presentation.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PresentationService {
  constructor(
    private readonly prisma: PrismaService
  ) { }

  create(createPresentationDto: CreatePresentationDto) {
    return 'This action adds a new presentation';
  }


  async findAll() {
    try {
      let presentations = await this.prisma.presentation.findMany({
        include: {
          slides: true,
          users: true
        }
      })
      if (!presentations) throw new NotFoundException("Not found presentation!")
      return presentations
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
