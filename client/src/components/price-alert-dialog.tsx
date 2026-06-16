import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PriceAlertDialogProps {
  symbol: string;
  currentPrice: number;
  type: "simulator" | "watchlist";
  children?: React.ReactNode;
}

export function PriceAlertDialog({ symbol, currentPrice, type, children }: PriceAlertDialogProps) {
  const [targetPrice, setTargetPrice] = useState(currentPrice.toString());
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const createAlertMutation = useMutation({
    mutationFn: (data: {
      symbol: string;
      targetPrice: number;
      direction: string;
      type: string;
    }) => apiRequest("POST", "/api/price-alerts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-alerts"] });
      setOpen(false);
      toast({
        title: "Price alert set",
        description: `We'll notify you when ${symbol} goes ${direction} $${targetPrice}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to set price alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid target price",
        variant: "destructive",
      });
      return;
    }

    createAlertMutation.mutate({
      symbol,
      targetPrice: price,
      direction,
      type,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" data-testid={`button-price-alert-${symbol.toLowerCase()}`}>
            <Bell className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Price Alert for {symbol}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="direction">Notify me when price goes</Label>
            <Select
              value={direction}
              onValueChange={(value: "above" | "below") => setDirection(value)}
            >
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Above</SelectItem>
                <SelectItem value="below">Below</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetPrice">Target Price ($)</Label>
            <Input
              id="targetPrice"
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              data-testid="input-target-price"
            />
            <p className="text-xs text-muted-foreground">
              Current Price: ${currentPrice.toFixed(2)}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={createAlertMutation.isPending}
              data-testid="button-save-alert"
            >
              {createAlertMutation.isPending ? "Saving..." : "Save Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
