import { Paywall } from "@/components/paywall";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Globe
} from "lucide-react";
import { useState } from "react";

interface EconomicEvent {
  id: number;
  dayOffset: number;
  time: string;
  event: string;
  country: string;
  impact: "high" | "medium" | "low";
  previous: string;
  forecast: string;
  actual?: string;
}

const mockEvents: EconomicEvent[] = [
  { id: 1, dayOffset: 0, time: "08:30", event: "Consumer Price Index (CPI) MoM", country: "US", impact: "high", previous: "0.2%", forecast: "0.3%", actual: "0.3%" },
  { id: 2, dayOffset: 0, time: "08:30", event: "Core CPI MoM", country: "US", impact: "high", previous: "0.3%", forecast: "0.3%", actual: "0.2%" },
  { id: 3, dayOffset: 0, time: "10:00", event: "Retail Sales MoM", country: "US", impact: "medium", previous: "0.4%", forecast: "0.3%" },
  { id: 4, dayOffset: 1, time: "09:45", event: "Manufacturing PMI", country: "US", impact: "medium", previous: "49.4", forecast: "49.8" },
  { id: 5, dayOffset: 1, time: "09:45", event: "Services PMI", country: "US", impact: "medium", previous: "50.8", forecast: "50.5" },
  { id: 6, dayOffset: 2, time: "02:00", event: "GDP Growth Rate QoQ", country: "UK", impact: "high", previous: "0.0%", forecast: "0.1%" },
  { id: 7, dayOffset: 3, time: "14:00", event: "Fed Interest Rate Decision", country: "US", impact: "high", previous: "5.50%", forecast: "5.50%" },
  { id: 8, dayOffset: 3, time: "14:30", event: "FOMC Press Conference", country: "US", impact: "high", previous: "-", forecast: "-" },
  { id: 9, dayOffset: 4, time: "08:30", event: "Building Permits", country: "US", impact: "low", previous: "1.49M", forecast: "1.52M" },
  { id: 10, dayOffset: 5, time: "07:00", event: "Unemployment Rate", country: "UK", impact: "medium", previous: "4.2%", forecast: "4.3%" },
  { id: 11, dayOffset: 6, time: "08:30", event: "Non-Farm Payrolls", country: "US", impact: "high", previous: "216K", forecast: "180K" },
  { id: 12, dayOffset: 6, time: "10:00", event: "Consumer Sentiment", country: "US", impact: "medium", previous: "69.4", forecast: "70.0" },
];

function getDateForOffset(baseDate: Date, offset: number): Date {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offset);
  return d;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const getImpactColor = (impact: string) => {
  switch (impact) {
    case "high": return "bg-red-500";
    case "medium": return "bg-amber-500";
    case "low": return "bg-green-500";
    default: return "bg-muted";
  }
};

const getImpactBadge = (impact: string) => {
  switch (impact) {
    case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "medium": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
    default: return "";
  }
};

function EventRow({ event }: { event: EconomicEvent }) {
  const hasActual = !!event.actual;
  const actualNum = parseFloat(event.actual || "0");
  const forecastNum = parseFloat(event.forecast || "0");
  const isBetter = hasActual && actualNum >= forecastNum;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors" data-testid={`event-row-${event.id}`}>
      <div className="w-16 text-sm font-mono text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {event.time}
        </div>
      </div>
      
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getImpactColor(event.impact)}`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{event.event}</p>
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">{event.country}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs flex-shrink-0">
        <div className="text-center">
          <p className="text-muted-foreground">Previous</p>
          <p className="font-medium">{event.previous}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">Forecast</p>
          <p className="font-medium">{event.forecast}</p>
        </div>
        {hasActual && (
          <div className="text-center">
            <p className="text-muted-foreground">Actual</p>
            <p className={`font-bold flex items-center gap-1 ${isBetter ? "text-green-500" : "text-red-500"}`}>
              {isBetter ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {event.actual}
            </p>
          </div>
        )}
        <Badge variant="outline" className={`text-xs ${getImpactBadge(event.impact)}`}>
          {event.impact}
        </Badge>
      </div>
    </div>
  );
}

function EconomicCalendarContent() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [weekStart, setWeekStart] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  const weekDates = Array.from({ length: 7 }, (_, i) => getDateForOffset(weekStart, i));

  const filteredEvents = mockEvents.filter(
    (e) => toDateKey(getDateForOffset(today, e.dayOffset)) === toDateKey(selectedDate)
  );

  const highImpactCount = mockEvents.filter(e => e.impact === "high").length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Economic Calendar</h1>
          <p className="text-muted-foreground">
            Track key economic events that move the markets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            {highImpactCount} High Impact Events This Week
          </Badge>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const prev = getDateForOffset(weekStart, -7);
                setWeekStart(prev);
              }}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 grid grid-cols-7 gap-1">
              {weekDates.map((date, i) => {
                const isSelected = toDateKey(date) === toDateKey(selectedDate);
                const isToday = toDateKey(date) === toDateKey(today);
                const eventsOnDay = mockEvents.filter(e => toDateKey(getDateForOffset(today, e.dayOffset)) === toDateKey(date));

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(new Date(date))}
                    className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                    data-testid={`button-date-${i}`}
                  >
                    <span className="text-xs font-medium">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-lg font-bold ${isToday && !isSelected ? "text-primary" : ""}`}>
                      {date.getDate()}
                    </span>
                    {eventsOnDay.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {eventsOnDay.slice(0, 3).map((e, idx) => (
                          <div key={idx} className={`w-1.5 h-1.5 rounded-full ${getImpactColor(e.impact)}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const next = getDateForOffset(weekStart, 7);
                setWeekStart(next);
              }}
              data-testid="button-next-week"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 border-b">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">
              Events for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </CardTitle>
            <Badge variant="secondary">{filteredEvents.length} events</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEvents.length > 0 ? (
            <div className="divide-y">
              {filteredEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No economic events scheduled for this date</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground justify-center flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>High Impact</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Medium Impact</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Low Impact</span>
        </div>
      </div>
    </div>
  );
}

export default function EconomicCalendarPage() {
  return (
    <Paywall featureName="Economic Calendar">
      <EconomicCalendarContent />
    </Paywall>
  );
}
