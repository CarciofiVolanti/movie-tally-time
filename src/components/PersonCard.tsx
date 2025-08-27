import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface Person {
  id: string;
  name: string;
  movies: string[];
  isPresent: boolean;
}

interface PersonCardProps {
  person: Person;
  onUpdatePerson: (person: Person) => void;
  onDeletePerson: (id: string) => void;
}

export const PersonCard = ({ person, onUpdatePerson, onDeletePerson }: PersonCardProps) => {
  const [newMovie, setNewMovie] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const addMovie = (movieTitle?: string) => {
    const title = movieTitle || newMovie.trim();
    if (title && person.movies.length < 3) {
      onUpdatePerson({
        ...person,
        movies: [...person.movies, title]
      });
      setNewMovie("");
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  const searchMovies = async () => {
    if (!newMovie.trim()) return;
    
    setIsSearching(true);
    setShowSearchResults(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-movie', {
        body: { title: newMovie.trim() }
      });
      
      if (error) throw error;
      
      setSearchResults([data]);
    } catch (error) {
      console.error('Error searching movies:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const removeMovie = (index: number) => {
    const movieTitle = person.movies[index];
    if (!window.confirm(`Are you sure you want to remove the proposal for "${movieTitle}"? This cannot be undone.`)) return;
    onUpdatePerson({
      ...person,
      movies: person.movies.filter((_, i) => i !== index)
    });
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
            onClick={() => onDeletePerson(person.id)}
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
                  if (!e.target.value.trim()) {
                    setShowSearchResults(false);
                    setSearchResults([]);
                  }
                }}
                onKeyPress={(e) => e.key === "Enter" && searchMovies()}
                className="flex-1"
              />
              <Button onClick={searchMovies} size="sm" disabled={!newMovie.trim() || isSearching}>
                <Search className="w-4 h-4" />
              </Button>
              <Button onClick={() => addMovie()} size="sm" disabled={!newMovie.trim()} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {showSearchResults && (
              <div className="space-y-2">
                {isSearching && (
                  <div className="text-sm text-muted-foreground p-2">Searching...</div>
                )}
                {searchResults.map((movie, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-md cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => addMovie(movie.title)}
                  >
                    <div className="flex items-start gap-3">
                      {movie.poster && movie.poster !== 'N/A' && (
                        <img 
                          src={movie.poster} 
                          alt={movie.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm truncate">{movie.title} ({movie.year})</h5>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{movie.plot}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{movie.genre}</Badge>
                          {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                            <Badge variant="outline" className="text-xs">IMDb: {movie.imdbRating}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!isSearching && searchResults.length === 0 && newMovie.trim() && showSearchResults && (
                  <div className="text-sm text-muted-foreground p-2">No movies found. You can still add "{newMovie}" manually.</div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};