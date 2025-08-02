import { Module } from '@nestjs/common';
import { RemnawaveModule } from '../remnawave/remnawave.module';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

@Module({
  imports: [RemnawaveModule],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
