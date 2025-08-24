import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const StarRating = ({ 
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
          disabled={readonly}
          onClick={() => onRatingChange?.(rating === star ? 0 : star)}
          className={cn(
            "transition-all duration-200",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
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
};