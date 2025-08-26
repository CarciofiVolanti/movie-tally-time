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

  // Generate buttons for 0.5, 1, 1.5, 2, ... up to 10
  const ratingButtons = [];
  for (let i = 0.5; i <= 10; i += 0.5) {
    ratingButtons.push(
      <button
        key={i}
        type="button"
        disabled={readonly}
        onClick={() => handleClick(i)}
        className={cn(
          "px-1 py-0.5 text-xs rounded transition-colors",
          readonly ? "cursor-default" : "cursor-pointer hover:bg-accent/20",
          rating === i ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground",
          size === "sm" && "text-xs px-0.5",
          size === "lg" && "text-sm px-2"
        )}
        title={`Rate ${i}/10`}
      >
        {i}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className="flex items-center gap-0.5 flex-wrap">
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
                    ? "fill-accent text-accent"
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