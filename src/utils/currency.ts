const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  VND: '₫',
  CNY: '¥',
  KRW: '₩',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  THB: '฿',
};

export const getCurrencySymbol = (currencyCode: string): string => {
  return currencySymbols[currencyCode.toUpperCase()] || currencyCode;
};

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  
  // For VND and similar currencies without decimal places
  if (['VND', 'JPY', 'KRW'].includes(currencyCode.toUpperCase())) {
    return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
  }
  
  // For currencies with decimal places
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatAmount = (value: string, currencyCode: string): string => {
  if (!value) return '';
  
  const num = parseFloat(value.replace(/,/g, ''));
  if (isNaN(num)) return value;
  
  // For VND and similar currencies without decimal places
  if (['VND', 'JPY', 'KRW'].includes(currencyCode.toUpperCase())) {
    return Math.round(num).toLocaleString('en-US');
  }
  
  // For currencies with decimal places
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};
