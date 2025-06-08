import { Module } from '@nestjs/common';
import { PresentationController } from './presentation.controller';
import { PresentationService } from './presentation.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PresentationController],
  providers: [PresentationService, PrismaService],
})
export class PresentationModule {}