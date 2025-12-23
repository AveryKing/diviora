import { Controller, Post } from '@nestjs/common';
import { DevOpsService } from '../services/dev-ops.service';

@Controller('dev')
export class DevController {
  constructor(private readonly devOpsService: DevOpsService) {}

  @Post('wipe-all')
  async wipeAll() {
    return this.devOpsService.wipeAllData();
  }
}
