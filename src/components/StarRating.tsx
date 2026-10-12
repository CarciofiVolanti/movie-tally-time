import { memo } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const StarRating = memo(({
  rating,
  onRatingChange,
  readonly = false,
  size = "md"
}: StarRatingProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6"
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`Rate ${star} ${star === 1 ? "star" : "stars"}`}
          disabled={readonly}
          onClick={() => onRatingChange?.(rating === star ? 0 : star)}
          className={cn(
            "inline-flex items-center justify-center transition-all duration-200",
            readonly
              ? "cursor-default"
              : "min-h-7 min-w-7 rounded-md cursor-pointer hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            !readonly && "hover:drop-shadow-glow"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors duration-200",
              star <= rating
                ? "fill-accent text-accent"
                : "fill-transparent text-muted-foreground hover:text-accent"
            )}
          />
        </button>
      ))}
    </div>
  );
});
