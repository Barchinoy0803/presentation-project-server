import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PresentationService } from './presentation.service';

@Controller('presentation')
export class PresentationController {
  constructor(private readonly presentationService: PresentationService) {}

  @Post('create')
  async createPresentation(
    @Body() data: { username: string; title: string }
  ) {
    const presentation = await this.presentationService.createPresentation(
      data.username,
      data.title
    );
    return { presentationId: presentation.id };
  }

  @Get()
  async findAll() {
    return this.presentationService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.presentationService.findOne(id);
  }
}