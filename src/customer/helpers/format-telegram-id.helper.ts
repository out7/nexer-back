export function formatTelegramId(customer: any) {
  return {
    ...customer,
    telegramId: customer.telegramId.toString(),
  };
}
