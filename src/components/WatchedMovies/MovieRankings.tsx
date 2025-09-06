import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Star, Film } from "lucide-react";
import { getAverageRating, getAllVoters, formatWatchDate } from "./utils";
import type { WatchedMoviesData } from "./types";

const MovieRankings = ({ watchedMovies, detailedRatings, people }: WatchedMoviesData) => {
  const [collapsedMovies, setCollapsedMovies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (watchedMovies.length > 0) {
      setCollapsedMovies(prev => {
        const newCollapsedState = { ...prev };
        watchedMovies.forEach(movie => {
          if (!(movie.id in newCollapsedState)) {
            newCollapsedState[movie.id] = true;
          }
        });
        return newCollapsedState;
      });
    }
  }, [watchedMovies.length]);

  const toggleCollapse = (movieId: string) => {
    setCollapsedMovies(prev => ({
      ...prev,
      [movieId]: !prev[movieId]
    }));
  };

  if (watchedMovies.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No movies have been rated yet.</p>
        </CardContent>
      </Card>
    );
  }

  const sortedMovies = [...watchedMovies]
    .sort((a, b) => getAverageRating(b.id, detailedRatings) - getAverageRating(a.id, detailedRatings));

  return (
    <>
      {sortedMovies.map((movie, index) => (
        <Card key={movie.id} className="transition-all duration-300 hover:shadow-glow relative">
          <CardHeader className="pb-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <button
                  onClick={() => toggleCollapse(movie.id)}
                  aria-label={collapsedMovies[movie.id] ? "Expand" : "Collapse"}
                  className="p-1 rounded hover:bg-accent/20 transition flex-shrink-0 mt-1"
                  type="button"
                >
                  {collapsedMovies[movie.id] ? (
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
                <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex-shrink-0 mt-1">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {movie.imdb_id ? (
                    <a 
                      href={`https://www.imdb.com/title/${movie.imdb_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-base sm:text-lg hover:text-primary transition-colors block hover:underline leading-tight"
                    >
                      {movie.movie_title}
                    </a>
                  ) : (
                    <h3 className="font-semibold text-base sm:text-lg leading-tight">
                      {movie.movie_title}
                    </h3>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 flex-shrink-0 ml-2">
                ★ {getAverageRating(movie.id, detailedRatings).toFixed(1)}
              </Badge>
            </div>
          </CardHeader>
          {!collapsedMovies[movie.id] && (
            <CardContent className="space-y-2 p-4 pt-0">
              <div className="flex gap-3">
                {movie.poster && movie.poster !== 'N/A' ? (
                  <img 
                    src={movie.poster} 
                    alt={`${movie.movie_title} poster`}
                    className="w-12 h-18 sm:w-16 sm:h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-18 sm:w-16 sm:h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Film className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Proposed by {movie.proposed_by}</p>
                    <p>Watched on {new Date(movie.watched_at).toLocaleDateString('it-IT')}</p>
                    {movie.year && <p>Year: {movie.year}</p>}
                    {movie.runtime && <p>Runtime: {movie.runtime}</p>}
                    {movie.genre && <p className="break-words">Genre: {movie.genre}</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-sm text-muted-foreground">
                  {detailedRatings.filter(r => r.watched_movie_id === movie.id && r.rating !== null).length}/{people.length} rated
                </span>
                <span className="text-sm text-muted-foreground">
                  Avg: {getAverageRating(movie.id, detailedRatings).toFixed(2)}/10
                </span>
              </div>

              {/* Individual votes */}
              <div className="mt-3">
                <h5 className="text-sm font-medium mb-2">Votes</h5>
                {(() => {
                  const voters = getAllVoters(movie.id, detailedRatings, people);
                  if (voters.length === 0) {
                    return <p className="text-xs text-muted-foreground">No votes yet.</p>;
                  }
                  return (
                    <div className="flex flex-wrap gap-2">
                      {voters.map(v => (
                        <div
                          key={v.id ?? v.person_id}
                          className="flex items-center gap-2 bg-card/60 border border-border rounded-md px-2 py-1 text-xs max-w-full"
                        >
                          <span className="font-medium truncate max-w-[10rem]">{v.name}</span>
                          <Badge variant="secondary" className="ml-1 shrink-0">
                            ★ {Number(v.rating).toFixed(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </>
  );
};

export default MovieRankings;