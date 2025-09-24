import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { Sample } from './entities/sample.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sample])],
  controllers: [DataController],
  providers: [DataService],
})
export class DataModule {}
