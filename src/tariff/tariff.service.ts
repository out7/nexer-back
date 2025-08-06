import { PrismaService } from '@/prisma/prisma.service';
import { TariffDto } from '@/tariff/dto/tariff.dto';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class TariffService {
  constructor(private readonly prisma: PrismaService) {}

  async getTariffs(): Promise<TariffDto[]> {
    return await this.prisma.tariff.findMany({
      orderBy: {
        months: 'asc',
      },
    });
  }

  async findTariffByCode(code: string): Promise<TariffDto> {
    const tariff = await this.prisma.tariff.findUnique({
      where: { code },
    });

    if (!tariff) {
      throw new NotFoundException('Tariff not found');
    }

    return tariff;
  }
}
