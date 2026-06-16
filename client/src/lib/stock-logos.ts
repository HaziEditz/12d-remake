export const STOCK_DOMAINS: Record<string, string> = {
  AAPL: "apple.com",
  GOOGL: "google.com",
  MSFT: "microsoft.com",
  AMZN: "amazon.com",
  TSLA: "tesla.com",
  META: "meta.com",
  NVDA: "nvidia.com",
  NFLX: "netflix.com",
  AMD: "amd.com",
  JPM: "jpmorgan.com",
  V: "visa.com",
  JNJ: "jnj.com",
  WMT: "walmart.com",
  PG: "pg.com",
  DIS: "disney.com",
  BABA: "alibaba.com",
  BRK: "berkshirehathaway.com",
  BAC: "bankofamerica.com",
  BTC: "bitcoin.org",
  ETH: "ethereum.org",
};

export function getStockLogoUrl(symbol: string): string | null {
  const domain = STOCK_DOMAINS[symbol.toUpperCase()];
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}
