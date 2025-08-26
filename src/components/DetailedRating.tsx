import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailedRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const DetailedRating = ({ 
  rating, 
  onRatingChange, 
  readonly = false, 
  size = "md" 
}: DetailedRatingProps) => {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  };

  const handleClick = (value: number) => {
    if (readonly || !onRatingChange) return;
    onRatingChange(rating === value ? 0 : value);
  };

  // Generate buttons for 0, 0.5, 1, 1.5, 2, ... up to 10
  const ratingButtons = [];
  
  // Add 0 rating button first
  ratingButtons.push(
    <button
      key={0}
      type="button"
      disabled={readonly}
      onClick={() => handleClick(0)}
      className={cn(
        "px-2 py-1 text-sm rounded-md border transition-all duration-200 min-w-[40px]",
        readonly ? "cursor-default" : "cursor-pointer hover:scale-105",
        rating === 0 ? "bg-destructive text-destructive-foreground border-destructive shadow-md" : "bg-background text-muted-foreground border-border hover:border-accent hover:text-foreground"
      )}
      title="No rating (0/10)"
    >
      0
    </button>
  );

  // Generate rating buttons from 0.5 to 10
  for (let i = 0.5; i <= 10; i += 0.5) {
    const isFullNumber = i % 1 === 0;
    ratingButtons.push(
      <button
        key={i}
        type="button"
        disabled={readonly}
        onClick={() => handleClick(i)}
        className={cn(
          "px-2 py-1 text-sm rounded-md border transition-all duration-200 min-w-[40px]",
          readonly ? "cursor-default" : "cursor-pointer hover:scale-105",
          rating === i 
            ? "bg-primary text-primary-foreground border-primary shadow-md" 
            : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground",
          isFullNumber && "font-medium"
        )}
        title={`Rate ${i}/10`}
      >
        {i}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 flex-wrap max-w-full">
        {ratingButtons}
      </div>
      {rating > 0 && (
        <div className="flex items-center gap-1 ml-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  sizeClasses[size],
                  "transition-colors duration-200",
                  star <= rating / 2
                    ? "fill-primary text-primary"
                    : "fill-transparent text-muted-foreground"
                )}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground ml-1">
            {rating.toFixed(1)}/10
          </span>
        </div>
      )}
    </div>
  );
};