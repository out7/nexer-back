import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RemnawaveService } from './remnawave.service';

@Module({
  imports: [HttpModule],
  providers: [RemnawaveService],
  exports: [RemnawaveService],
})
export class RemnawaveModule {}
