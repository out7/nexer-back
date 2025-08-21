export function maskTelegramId(
  telegramId: bigint | string,
  keep: number = 4,
): string {
  const str = String(telegramId);
  return str.length > keep ? str.slice(-keep) : str;
}
