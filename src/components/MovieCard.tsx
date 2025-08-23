import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { Film } from "lucide-react";

export interface MovieRating {
  movieTitle: string;
  proposedBy: string;
  ratings: Record<string, number>; // personId -> rating
}

interface MovieCardProps {
  movie: MovieRating;
  people: Array<{ id: string; name: string; isPresent: boolean }>;
  currentPersonId?: string;
  onRatingChange?: (personId: string, rating: number) => void;
  showAllRatings?: boolean;
}

export const MovieCard = ({ 
  movie, 
  people, 
  currentPersonId, 
  onRatingChange,
  showAllRatings = false 
}: MovieCardProps) => {
  const presentPeople = people.filter(p => p.isPresent);
  const totalRatings = presentPeople.filter(p => movie.ratings[p.id] !== undefined).length;
  const averageRating = presentPeople.length > 0 
    ? presentPeople.reduce((sum, p) => sum + (movie.ratings[p.id] || 0), 0) / presentPeople.length
    : 0;

  return (
    <Card className="transition-all duration-300 hover:shadow-glow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {movie.movieTitle}
              </h3>
              <p className="text-sm text-muted-foreground">
                Proposed by {movie.proposedBy}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
            ★ {averageRating.toFixed(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalRatings}/{presentPeople.length} ratings</span>
          <StarRating rating={averageRating} readonly size="sm" />
        </div>

        {showAllRatings && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Individual Ratings</h4>
            {presentPeople.map((person) => (
              <div key={person.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                <span className="text-sm">{person.name}</span>
                <StarRating
                  rating={movie.ratings[person.id] || 0}
                  onRatingChange={
                    currentPersonId === person.id 
                      ? (rating) => onRatingChange?.(person.id, rating)
                      : undefined
                  }
                  readonly={currentPersonId !== person.id}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}

        {currentPersonId && !showAllRatings && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Rating</span>
              <StarRating
                rating={movie.ratings[currentPersonId] || 0}
                onRatingChange={(rating) => onRatingChange?.(currentPersonId, rating)}
                size="md"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};