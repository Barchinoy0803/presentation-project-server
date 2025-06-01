import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSocketDto } from './dto/create-socket.dto';
import { UpdateSocketDto } from './dto/update-socket.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SocketService {
  constructor(
    private readonly prisma: PrismaService
  ) { }

  create(createSocketDto: CreateSocketDto) {
    return 'This action adds a new socket';
  }

  async findAll() {
    try {
      let presentations = await this.prisma.presentation.findMany()
      if (!presentations) throw new NotFoundException("Not found presentation!")
      return presentations
    } catch (error) {
      console.log(error);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} socket`;
  }

  update(id: number, updateSocketDto: UpdateSocketDto) {
    return `This action updates a #${id} socket`;
  }

  remove(id: number) {
    return `This action removes a #${id} socket`;
  }
}
