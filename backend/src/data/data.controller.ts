import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DataService } from './data.service';

@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('samples')
  async getAllSamples() {
    return this.dataService.findAllSamples();
  }

  @Get('samples/:id')
  async getSample(@Param('id') id: string) {
    return this.dataService.findSampleById(parseInt(id));
  }

  @Post('samples')
  async createSample(@Body() body: { name: string; description?: string }) {
    return this.dataService.createSample(body.name, body.description);
  }
}
