import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  "data-testid"?: string;
}

export function SpinnerInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  className,
  "data-testid": testId,
}: SpinnerInputProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== prevValue) {
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 300);
      setPrevValue(value);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  const increment = useCallback(() => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  }, [value, onChange, max, step]);

  const decrement = useCallback(() => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  }, [value, onChange, min, step]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      increment();
    } else {
      decrement();
    }
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={decrement}
        disabled={value <= min}
        data-testid={`${testId}-decrement`}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <div 
        className="relative overflow-hidden w-20"
        onWheel={handleWheel}
      >
        <Input
          ref={inputRef}
          type="number"
          value={value}
          onChange={handleInputChange}
          className={cn(
            "text-center transition-transform duration-300 h-8",
            isFlipping && (value > prevValue ? "-translate-y-1" : "translate-y-1")
          )}
          data-testid={testId}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={increment}
        disabled={value >= max}
        data-testid={`${testId}-increment`}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
