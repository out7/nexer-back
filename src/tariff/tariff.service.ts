import { PrismaService } from '@/prisma/prisma.service';
import { TariffDto } from '@/tariff/dto/tariff.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TariffService {
  constructor(private readonly prisma: PrismaService) {}

  async getTariffs(): Promise<TariffDto[]> {
    return this.prisma.tariff.findMany({
      orderBy: {
        months: 'asc',
      },
    });
  }
}
