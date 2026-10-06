import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Search, Film, X } from "lucide-react";
import { useState, memo } from "react";
import { cn } from "@/lib/utils";
import { useMovieSearch, MovieSearchResult } from "@/hooks/useMovieSearch";
import { ConfirmDialog } from "./ConfirmDialog";
import { MovieDetails } from "@/types/session";

export interface Person {
  id: string;
  name: string;
  movies: string[];
  isPresent: boolean;
}

interface PersonCardProps {
  person: Person;
  onUpdatePerson: (person: Person, movieDetailsMap?: Record<string, Partial<MovieDetails>>) => void;
  onDeletePerson: (id: string) => void;
}

export const PersonCard = memo(({ person, onUpdatePerson, onDeletePerson }: PersonCardProps) => {
  const [newMovie, setNewMovie] = useState("");
  const { searchResults, isSearching, showSearchResults, searchMovies, clearResults } = useMovieSearch();
  const [pendingConfirm, setPendingConfirm] = useState<
    | { type: 'remove-movie'; index: number }
    | { type: 'delete-person' }
    | null
  >(null);

  const handleConfirm = () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.type === 'remove-movie') {
      onUpdatePerson({ ...person, movies: person.movies.filter((_, i) => i !== pendingConfirm.index) });
    } else {
      onDeletePerson(person.id);
    }
    setPendingConfirm(null);
  };

  const addMovie = (selectedMovie?: MovieSearchResult) => {
    const title = selectedMovie?.title || newMovie.trim();
    if (title && person.movies.length < 3) {
      const detailsMap = selectedMovie ? {
        [title]: {
          poster: selectedMovie.poster,
          genre: selectedMovie.genre,
          runtime: selectedMovie.runtime,
          year: selectedMovie.year,
          director: selectedMovie.director,
          plot: selectedMovie.plot,
          imdbRating: selectedMovie.imdbRating,
          imdbId: selectedMovie.imdbId,
          tmdbId: selectedMovie.tmdbId,
        }
      } : undefined;

      onUpdatePerson(
        {
          ...person,
          movies: [...person.movies, title]
        },
        detailsMap
      );
      setNewMovie("");
      clearResults();
    }
  };

  const removeMovie = (index: number) => {
    setPendingConfirm({ type: 'remove-movie', index });
  };

  const togglePresent = (checked: boolean) => {
    onUpdatePerson({
      ...person,
      isPresent: checked
    });
  };

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-glow",
      person.isPresent && "ring-2 ring-primary shadow-glow"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={person.isPresent}
              onCheckedChange={togglePresent}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <h3 className="font-semibold text-lg">{person.name}</h3>
            <Badge variant={person.isPresent ? "default" : "secondary"}>
              {person.isPresent ? "Present" : "Absent"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPendingConfirm({ type: 'delete-person' })}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Movie Suggestions ({person.movies.length}/3)
          </h4>
          
          {person.movies.map((movie, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md">
              <span className="text-sm">{movie}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMovie(index)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        {person.movies.length < 3 && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search for a movie..."
                value={newMovie}
                onChange={(e) => {
                  setNewMovie(e.target.value);
                  if (!e.target.value.trim()) clearResults();
                }}
                onKeyPress={(e) => e.key === "Enter" && searchMovies(newMovie)}
                className="flex-1"
              />
              <Button onClick={() => searchMovies(newMovie)} size="sm" disabled={!newMovie.trim() || isSearching}>
                <Search className="w-4 h-4" />
              </Button>
              <Button onClick={() => addMovie()} size="sm" disabled={!newMovie.trim()} variant="outline" title="Add manually without selecting details">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {showSearchResults && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>{isSearching ? "Searching..." : `${searchResults.length} options found (select one):`}</span>
                  <Button variant="ghost" size="sm" onClick={clearResults} className="h-5 px-1 text-xs">
                    <X className="w-3 h-3 mr-1" /> Close
                  </Button>
                </div>

                {isSearching && (
                  <div className="text-sm text-muted-foreground p-3 text-center border rounded-md">Searching for options...</div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1.5 rounded-md border p-1 bg-background/50">
                    {searchResults.map((movie, index) => (
                      <div
                        key={movie.tmdbId ?? index}
                        className="p-2.5 border rounded-md cursor-pointer hover:bg-secondary/80 transition-colors"
                        onClick={() => addMovie(movie)}
                      >
                        <div className="flex items-start gap-3">
                          {movie.poster && movie.poster !== 'N/A' ? (
                            <img 
                              src={movie.poster} 
                              alt={movie.title}
                              className="w-12 h-16 object-cover rounded flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                              <Film className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <h5 className="font-semibold text-sm truncate leading-tight">
                              {movie.title} {movie.year ? `(${movie.year})` : ""}
                            </h5>
                            {(movie.director || movie.runtime) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {movie.director ? `Dir: ${movie.director}` : ""}
                                {movie.director && movie.runtime ? " • " : ""}
                                {movie.runtime || ""}
                              </p>
                            )}
                            {movie.plot && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{movie.plot}</p>
                            )}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {movie.genre && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{movie.genre}</Badge>
                              )}
                              {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">★ {movie.imdbRating}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isSearching && searchResults.length === 0 && newMovie.trim() && (
                  <div className="text-sm text-muted-foreground p-2 border rounded-md">
                    No movies found. You can still click <Plus className="w-3 h-3 inline mx-0.5" /> to add "{newMovie}" manually.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => { if (!open) setPendingConfirm(null); }}
        title={pendingConfirm?.type === 'delete-person' ? `Remove ${person.name}?` : "Remove proposal?"}
        description={
          pendingConfirm?.type === 'delete-person'
            ? `This will also remove all of ${person.name}'s movie proposals and cannot be undone.`
            : `Remove "${pendingConfirm?.type === 'remove-movie' ? person.movies[pendingConfirm.index] : ''}" from the proposals? This cannot be undone.`
        }
        confirmLabel="Remove"
        onConfirm={handleConfirm}
      />
    </Card>
  );
});