import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getAverageRating, 
  getRatingForPerson, 
  getPresentPersonIds, 
  getPresentPeopleWithoutRating,
  formatWatchDate 
} from "./utils";
import type { WatchedMovie, Person, DetailedRating, RateSortMode } from "./types";

interface WatchedMovieCardProps {
  movie: WatchedMovie;
  people: Person[];
  detailedRatings: DetailedRating[];
  selectedPersonId?: string;
  rateSortMode: RateSortMode;
  localPresentStates: Record<string, boolean>;
  setLocalPresentStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  updateDetailedRating: (
    watchedMovieId: string,
    personId: string,
    rating: number | null,
    present?: boolean
  ) => Promise<void>;
}

const WatchedMovieCard = ({
  movie,
  people,
  detailedRatings,
  selectedPersonId,
  rateSortMode,
  localPresentStates,
  setLocalPresentStates,
  updateDetailedRating
}: WatchedMovieCardProps) => {
  const [collapsed, setCollapsed] = useState(true);

  // Auto-collapse management
  useEffect(() => {
    setCollapsed(true);
  }, [movie.id]);

  const missingPresentRaters = rateSortMode === "not-fully-rated" 
    ? getPresentPeopleWithoutRating(movie.id, people, detailedRatings, localPresentStates)
    : [];

  const getVotingStatus = () => {
    if (!selectedPersonId) return null;
    
    const rating = getRatingForPerson(movie.id, selectedPersonId, detailedRatings);
    const presentIds = getPresentPersonIds(movie.id, people, detailedRatings, localPresentStates);
    const isPresent = presentIds.includes(selectedPersonId);

    if (rating !== null) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">✓ Voted</Badge>;
    }

    if (isPresent) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Not Voted</Badge>;
    }

    return <Badge variant="outline" className="bg-card/40 text-muted-foreground border-border">Absent</Badge>;
  };

  const handlePresentChange = async (personId: string, newPresent: boolean) => {
    const localKey = `${movie.id}-${personId}`;
    setLocalPresentStates(prev => ({
      ...prev,
      [localKey]: newPresent
    }));
    
    const currentRating = getRatingForPerson(movie.id, personId, detailedRatings);
    const detailed = detailedRatings.find(r => r.watched_movie_id === movie.id && r.person_id === personId);
    const entryExists = detailed !== undefined;
    
    if (newPresent || entryExists) {
      try {
        await supabase
          .from("detailed_ratings")
          .upsert({
            watched_movie_id: movie.id,
            person_id: personId,
            rating: currentRating,
            present: newPresent
          }, {
            onConflict: "watched_movie_id,person_id"
          });
      } catch (error) {
        console.error("Error updating present status:", error);
        setLocalPresentStates(prev => ({
          ...prev,
          [localKey]: !newPresent
        }));
      }
    }
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-glow relative">
      <CardHeader className="pb-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand" : "Collapse"}
              className="p-1 rounded hover:bg-accent/20 transition flex-shrink-0 mt-1"
              type="button"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
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
              {rateSortMode === "not-fully-rated" && missingPresentRaters.length > 0 && (
                <div className="mt-1 text-xs text-orange-700 flex flex-wrap gap-1 items-center">
                  <span className="font-medium">Missing:</span>
                  {missingPresentRaters.map((p, idx) => (
                    <span key={p.id} className="inline-flex items-center">
                      <span className="bg-orange-100 border border-orange-200 rounded px-1 py-0.5">
                        {p.name}
                      </span>
                      {idx < missingPresentRaters.length - 1 && (
                        <span className="text-orange-700 mx-1">,</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getVotingStatus()}
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
              ★ {getAverageRating(movie.id, detailedRatings).toFixed(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4 p-4 pt-0">
          {/* Movie info and details */}
          <div className="flex gap-3">
            {/* Poster */}
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
            {/* Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Proposed by {movie.proposed_by}</p>
                <p>Watched on {formatWatchDate(movie.watched_at)}</p>
                {movie.year && <p>Year: {movie.year}</p>}
                {movie.runtime && <p>Runtime: {movie.runtime}</p>}
                {movie.genre && <p className="break-words">Genre: {movie.genre}</p>}
              </div>
            </div>
          </div>
          {/* Ratings UI */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h4 className="text-sm font-medium">Rate this movie (0-10)</h4>
              <Badge variant="outline" className="text-xs self-start sm:self-auto">
                {detailedRatings.filter(r => r.watched_movie_id === movie.id && r.rating !== null).length}/{people.length} rated
              </Badge>
            </div>
            <div className="space-y-3">
              {people.map((person) => {
                const detailed = detailedRatings.find(
                  r => r.watched_movie_id === movie.id && r.person_id === person.id
                );
                const isPresent = detailed?.present ?? false;
                const localKey = `${movie.id}-${person.id}`;
                const localPresent = localPresentStates[localKey] ?? isPresent;

                return (
                  <div key={person.id} className="p-3 bg-card/50 rounded-lg border border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <span className="text-sm font-medium flex-1 min-w-0 truncate">{person.name}</span>
                      {getRatingForPerson(movie.id, person.id, detailedRatings) !== null && getRatingForPerson(movie.id, person.id, detailedRatings)! >= 0 && (
                        <Badge variant="secondary" className="text-xs self-start sm:self-auto">
                          ★ {getRatingForPerson(movie.id, person.id, detailedRatings)}/10
                        </Badge>
                      )}
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={localPresent}
                          onChange={(e) => handlePresentChange(person.id, e.target.checked)}
                          className="accent-primary bg-card border-border rounded"
                        />
                        present
                      </label>
                    </div>
                    <select
                      className="w-full p-2 rounded bg-card text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
                      value={(() => {
                        const rating = getRatingForPerson(movie.id, person.id, detailedRatings);
                        return rating === null ? "" : rating;
                      })()}
                      onChange={e => {
                        const rating = e.target.value === "" ? null : Number(e.target.value);
                        updateDetailedRating(movie.id, person.id, rating, localPresent);
                      }}
                    >
                      <option value="">- Not yet rated -</option>
                      {Array.from({ length: 21 }, (_, i) => (
                        <option key={i} value={i * 0.5}>{(i * 0.5).toFixed(1)}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default WatchedMovieCard;