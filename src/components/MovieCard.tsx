import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "./StarRating";
import { Film, Search } from "lucide-react";
import { useState } from "react";

export interface MovieDetails {
  poster?: string;
  genre?: string;
  runtime?: string;
  year?: string;
  director?: string;
  plot?: string;
  imdbRating?: string;
  imdbId?: string;
}

export interface MovieRating {
  movieTitle: string;
  proposedBy: string;
  ratings: Record<string, number>; // personId -> rating
  details?: MovieDetails;
}

interface MovieCardProps {
  movie: MovieRating;
  people: Array<{ id: string; name: string; isPresent: boolean }>;
  currentPersonId?: string;
  onRatingChange?: (movieTitle: string, personId: string, rating: number) => void;
  onSearchAgain?: (movieTitle: string) => void;
  showAllRatings?: boolean;
}

export const MovieCard = ({
  movie,
  people,
  currentPersonId,
  onRatingChange,
  onSearchAgain,
  showAllRatings = false
}: MovieCardProps) => {
  const [searchTitle, setSearchTitle] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  
  const presentPeople = people.filter(p => p.isPresent);
  const totalRatings = presentPeople.filter(p => movie.ratings[p.id] !== undefined).length;
  const averageRating = presentPeople.length > 0
    ? presentPeople.reduce((sum, p) => sum + (movie.ratings[p.id] || 0), 0) / presentPeople.length
    : 0;

  const handleSearch = () => {
    if (searchTitle.trim() && onSearchAgain) {
      onSearchAgain(searchTitle.trim());
      setSearchTitle("");
      setShowSearchInput(false);
    }
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-glow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {movie.details?.poster && movie.details.poster !== 'N/A' ? (
              <img 
                src={movie.details.poster} 
                alt={`${movie.movieTitle} poster`}
                className="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Film className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {movie.details?.imdbId ? (
                <a 
                  href={`https://www.imdb.com/title/${movie.details.imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-lg group-hover:text-primary transition-colors truncate hover:underline"
                >
                  {movie.movieTitle}
                </a>
              ) : (
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                  {movie.movieTitle}
                </h3>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground mb-1">
                  Proposed by {movie.proposedBy}
                </p>
                {onSearchAgain && (!movie.details || !movie.details.poster || movie.details.poster === 'N/A') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSearchInput(!showSearchInput)}
                    className="text-xs h-6 px-2"
                  >
                    <Search className="w-3 h-3 mr-1" />
                    Search
                  </Button>
                )}
              </div>
              {showSearchInput && onSearchAgain && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter movie title..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1 h-7 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSearch}
                    disabled={!searchTitle.trim()}
                    className="h-7 px-2 text-xs"
                  >
                    Search
                  </Button>
                </div>
              )}
              {movie.details && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {movie.details.year && <p>Year: {movie.details.year}</p>}
                  {movie.details.runtime && <p>Runtime: {movie.details.runtime}</p>}
                  {movie.details.genre && <p className="truncate">Genre: {movie.details.genre}</p>}
                </div>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex-shrink-0">
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
            <div className="grid gap-2 sm:grid-cols-1">
              {presentPeople.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                  <span className="text-sm truncate mr-2">{person.name}</span>
                  <StarRating
                    rating={movie.ratings[person.id] || 0}
                    onRatingChange={(rating) =>
                      onRatingChange?.(movie.movieTitle, person.id, rating)
                    }
                    readonly={false}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPersonId && !showAllRatings && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Rating</span>
              <StarRating
                rating={movie.ratings[currentPersonId] || 0}
                onRatingChange={(rating) =>
                  onRatingChange?.(movie.movieTitle, currentPersonId, rating)
                }
                size="md"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};