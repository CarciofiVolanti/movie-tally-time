import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "./StarRating";
import { Film, Search } from "lucide-react";
import { useState } from "react";
import { MovieDetails, MovieRating, Person } from "@/types/session";

interface MovieCardProps {
  movie: MovieRating;
  people: Person[];
  currentPersonId?: string;
  onRatingChange: (movieTitle: string, personId: string, rating: number) => Promise<void>;
  onSearchAgain: (movieTitle: string) => Promise<void>;
  onMarkAsWatched: (movieTitle: string) => Promise<void>;
  showAllRatings: boolean;
}

export const MovieCard = ({
  movie,
  people,
  currentPersonId,
  onRatingChange,
  onSearchAgain,
  onMarkAsWatched,
  showAllRatings = false
}: MovieCardProps) => {
  const [searchTitle, setSearchTitle] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  
  const presentPeople = people.filter(p => p.isPresent);
  const ratedPeople = presentPeople.filter(p => movie.ratings[p.id] && movie.ratings[p.id] > 0);
  const totalRatings = ratedPeople.length;
  const averageRating = totalRatings > 0
    ? ratedPeople.reduce((sum, p) => sum + movie.ratings[p.id], 0) / totalRatings
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
      <CardHeader className="pb-3 p-4">
        {/* Mobile-first layout with responsive adjustments */}
        <div className="space-y-3 sm:space-y-0">
          {/* Header with title and rating - always on top */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {movie.details?.imdbId ? (
                <a 
                  href={`https://www.imdb.com/title/${movie.details.imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-base sm:text-lg group-hover:text-primary transition-colors block hover:underline leading-tight"
                >
                  {movie.movieTitle}
                </a>
              ) : (
                <h3 className="font-semibold text-base sm:text-lg group-hover:text-primary transition-colors leading-tight">
                  {movie.movieTitle}
                </h3>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Proposed by {movie.proposedBy}
              </p>
            </div>
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex-shrink-0 ml-2">
              ★ {averageRating.toFixed(1)}
            </Badge>
          </div>

          {/* Content area with poster and details */}
          <div className="flex gap-3">
            {/* Poster - smaller on mobile */}
            {movie.details?.poster && movie.details.poster !== 'N/A' ? (
              <img 
                src={movie.details.poster} 
                alt={`${movie.movieTitle} poster`}
                className="w-12 h-18 sm:w-16 sm:h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-18 sm:w-16 sm:h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Film className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
              </div>
            )}
            
            {/* Movie details */}
            <div className="flex-1 min-w-0 space-y-2">
              {movie.details && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {movie.details.year && <p>Year: {movie.details.year}</p>}
                  {movie.details.director && <p>Director: {movie.details.director}</p>}  {/* Add this line */}
                  {movie.details.runtime && <p>Runtime: {movie.details.runtime}</p>}
                  {movie.details.genre && <p className="break-words">Genre: {movie.details.genre}</p>}
                </div>
              )}
              
              {/* Search button - moved to bottom on mobile */}
              {onSearchAgain && (!movie.details || !movie.details.poster || movie.details.poster === 'N/A') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearchInput(!showSearchInput)}
                  className="text-xs h-7 px-2"
                >
                  <Search className="w-3 h-3 mr-1" />
                  Search
                </Button>
              )}
            </div>
          </div>

          {/* Search input - full width when shown */}
          {showSearchInput && onSearchAgain && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Enter movie title..."
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
                disabled={!searchTitle.trim()}
                className="h-8 px-3 text-sm sm:w-auto"
              >
                Search
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{totalRatings}/{presentPeople.length} ratings</span>
          <StarRating rating={averageRating} readonly size="sm" />
        </div>

        {showAllRatings && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Individual Ratings</h4>
            <div className="space-y-2">
              {presentPeople.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md gap-2">
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{person.name}</span>
                  <div className="flex-shrink-0">
                    <StarRating
                      rating={movie.ratings[person.id] || 0}
                      onRatingChange={(rating) =>
                        onRatingChange?.(movie.movieTitle, person.id, rating)
                      }
                      readonly={false}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentPersonId && !showAllRatings && (
          <div className="pt-3 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm font-medium">Your Rating</span>
              <div className="flex justify-center sm:justify-end">
                <StarRating
                  rating={movie.ratings[currentPersonId] || 0}
                  onRatingChange={(rating) =>
                    onRatingChange?.(movie.movieTitle, currentPersonId, rating)
                  }
                  size="md"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};