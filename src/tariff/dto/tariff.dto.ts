import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TariffDto {
  @ApiProperty({
    example: 'monthly',
    description:
      'Unique code of the tariff plan (e.g. monthly, quarterly, halfyear)',
  })
  @Expose()
  code: string;

  @ApiProperty({ example: 1, description: 'Duration of the plan in months' })
  @Expose()
  months: number;

  @ApiProperty({
    example: 200,
    description: 'Current price of the plan in Russian rubles',
  })
  @Expose()
  priceRUB: number;

  @ApiProperty({
    example: 230,
    description: 'Current price of the plan in Telegram Stars',
  })
  @Expose()
  priceStars: number;

  @ApiProperty({
    example: 600,
    nullable: true,
    description: 'Old price in rubles (for discounts), null if no discount',
  })
  @Expose()
  priceOldRUB?: number | null;

  @ApiProperty({
    example: 690,
    nullable: true,
    description:
      'Old price in Telegram Stars (for discounts), null if no discount',
  })
  @Expose()
  priceOldStars?: number | null;

  @ApiProperty({
    example: 15,
    nullable: true,
    description: 'Discount percentage, null or 0 if no discount',
  })
  @Expose()
  discount?: number | null;

  @ApiProperty({
    example: 200,
    description: 'Actual price per month for this plan',
  })
  @Expose()
  perMonth: number;
}
