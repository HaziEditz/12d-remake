import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Newspaper,
  TrendingUp,
  TrendingDown,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Building2,
  Globe
} from "lucide-react";
import { useState } from "react";

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  source: string;
  hoursAgo: number;
  sentiment: "bullish" | "bearish" | "neutral";
  category: string;
  symbols: string[];
  url: string;
}

function getNewsTime(hoursAgo: number): string {
  return formatDistanceToNow(new Date(Date.now() - hoursAgo * 3600 * 1000), { addSuffix: true });
}

const mockNews: NewsItem[] = [
  {
    id: 1,
    title: "NVIDIA Reports Record Q4 Revenue, Beats Expectations",
    summary: "NVIDIA announced quarterly revenue of $22.1 billion, a 265% increase year-over-year, driven by strong demand for AI chips and data center products.",
    source: "Reuters",
    hoursAgo: 2,
    sentiment: "bullish",
    category: "Earnings",
    symbols: ["NVDA"],
    url: "https://www.reuters.com/technology/nvidia-results/"
  },
  {
    id: 2,
    title: "Federal Reserve Signals Potential Rate Cuts Ahead",
    summary: "Fed Chair Powell indicated that the central bank may begin cutting interest rates in the coming months as inflation continues to cool toward the 2% target.",
    source: "Federal Reserve",
    hoursAgo: 3,
    sentiment: "bullish",
    category: "Economic",
    symbols: ["SPY", "QQQ"],
    url: "https://www.federalreserve.gov/newsevents/speeches.htm"
  },
  {
    id: 3,
    title: "Apple Faces Antitrust Investigation in EU",
    summary: "European regulators have opened a formal investigation into Apple's App Store policies, potentially leading to significant fines under the Digital Markets Act.",
    source: "Financial Times",
    hoursAgo: 4,
    sentiment: "bearish",
    category: "Regulatory",
    symbols: ["AAPL"],
    url: "https://www.ft.com/stream/a39a4558-f562-4dca-8906-d7c76bc37285"
  },
  {
    id: 4,
    title: "Tesla Deliveries Miss Expectations in Q4",
    summary: "Tesla reported Q4 deliveries of 484,507 vehicles, below analyst expectations of 490,000, citing production challenges at its Fremont facility.",
    source: "CNBC",
    hoursAgo: 5,
    sentiment: "bearish",
    category: "Earnings",
    symbols: ["TSLA"],
    url: "https://www.cnbc.com/tesla/"
  },
  {
    id: 5,
    title: "Microsoft Cloud Revenue Surges 30% on AI Demand",
    summary: "Microsoft's Azure cloud platform posted 30% revenue growth, with CEO Satya Nadella highlighting strong enterprise AI adoption across its Copilot suite.",
    source: "Wall Street Journal",
    hoursAgo: 6,
    sentiment: "bullish",
    category: "Earnings",
    symbols: ["MSFT"],
    url: "https://www.wsj.com/market-data/quotes/MSFT"
  },
  {
    id: 6,
    title: "Oil Prices Rise Amid Middle East Tensions",
    summary: "Crude oil futures climbed 3% as geopolitical tensions in the Middle East raised concerns about supply disruptions through key shipping lanes.",
    source: "MarketWatch",
    hoursAgo: 7,
    sentiment: "neutral",
    category: "Commodities",
    symbols: ["USO", "XLE"],
    url: "https://www.marketwatch.com/investing/future/crude%20oil%20-%20electronic"
  },
  {
    id: 7,
    title: "Amazon Announces $10B Investment in Logistics Network",
    summary: "Amazon plans to invest $10 billion to expand its delivery network, aiming to enable same-day delivery for more than 500 million additional products.",
    source: "CNBC",
    hoursAgo: 8,
    sentiment: "bullish",
    category: "Corporate",
    symbols: ["AMZN"],
    url: "https://www.cnbc.com/amazon/"
  },
  {
    id: 8,
    title: "Banking Sector Faces Pressure from Commercial Real Estate",
    summary: "Regional banks report increased loan loss provisions as commercial real estate values continue to decline amid higher-for-longer interest rate environment.",
    source: "Bloomberg",
    hoursAgo: 9,
    sentiment: "bearish",
    category: "Sector",
    symbols: ["KRE", "XLF"],
    url: "https://www.bloomberg.com/industries/financials"
  },
];

const marketSentiment = {
  overall: "Bullish",
  bullishCount: 5,
  bearishCount: 2,
  neutralCount: 1,
  fearGreedIndex: 72,
  description: "Greed"
};

function NewsCard({ news }: { news: NewsItem }) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish": return "text-green-500 bg-green-500/10";
      case "bearish": return "text-red-500 bg-red-500/10";
      default: return "text-amber-500 bg-amber-500/10";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Earnings": return DollarSign;
      case "Economic": return Globe;
      case "Regulatory": return AlertTriangle;
      case "Corporate": return Building2;
      default: return Newspaper;
    }
  };

  const CategoryIcon = getCategoryIcon(news.category);

  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`news-item-${news.id}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${getSentimentColor(news.sentiment)}`}>
            {news.sentiment === "bullish" ? (
              <TrendingUp className="w-5 h-5" />
            ) : news.sentiment === "bearish" ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <CategoryIcon className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm line-clamp-2">{news.title}</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex-shrink-0 h-6 w-6" 
                data-testid={`button-external-${news.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(news.url, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{news.summary}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {getNewsTime(news.hoursAgo)}
              </div>
              <span className="text-xs text-muted-foreground">{news.source}</span>
              <Badge variant="outline" className="text-xs">{news.category}</Badge>
              <div className="flex gap-1 ml-auto">
                {news.symbols.map((symbol) => (
                  <Badge key={symbol} variant="secondary" className="text-xs">{symbol}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewsFeedContent() {
  const [filter, setFilter] = useState<"all" | "bullish" | "bearish" | "neutral">("all");

  const filteredNews = filter === "all" 
    ? mockNews 
    : mockNews.filter(n => n.sentiment === filter);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-news-title">Market News</h1>
            <p className="text-muted-foreground">Real-time financial news with sentiment analysis</p>
          </div>
          <Badge variant="outline" className="ml-auto">Live</Badge>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Market Sentiment</p>
                <p className="text-2xl font-bold text-green-500">{marketSentiment.overall}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Fear & Greed Index</p>
                <p className="text-2xl font-bold">{marketSentiment.fearGreedIndex}</p>
                <p className="text-xs text-amber-500">{marketSentiment.description}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-500">{marketSentiment.bullishCount}</p>
                  <p className="text-xs text-muted-foreground">Bullish</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-red-500">{marketSentiment.bearishCount}</p>
                  <p className="text-xs text-muted-foreground">Bearish</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-amber-500">{marketSentiment.neutralCount}</p>
                  <p className="text-xs text-muted-foreground">Neutral</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="text-lg font-semibold">Just now</p>
                <Button variant="ghost" size="sm" className="mt-1 gap-1" data-testid="button-refresh-news">
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-sm text-muted-foreground mr-2">Filter:</span>
          {(["all", "bullish", "bearish", "neutral"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              data-testid={`button-filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filteredNews.map((news) => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  return <NewsFeedContent />;
}
