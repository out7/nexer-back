// customer может прийти null (клиента нет в базе) — раньше это давало
// TypeError и 500 вместо честного «не найден».
export function formatTelegramId(customer: any) {
  if (!customer) return null;

  return {
    ...customer,
    telegramId: customer.telegramId.toString(),
  };
}
