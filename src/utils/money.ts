/** "PKR 1,400" — thousands separators, no decimals unless the amount has them. */
export function formatMoney(amount: number, currency = 'PKR'): string {
  const hasCents = Math.abs(amount - Math.round(amount)) > 0.001;
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 })}`;
}
