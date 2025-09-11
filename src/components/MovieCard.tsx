import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "./StarRating";
import { Film, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { MovieDetails, MovieRating, Person } from "@/types/session";

interface MovieCardProps {
  movie: MovieRating;
  people: Person[];
  currentPersonId?: string;
  onRatingChange: (movieTitle: string, personId: string, rating: number) => Promise<void>;
  onSearchAgain: (movieTitle: string) => Promise<void>;
  onMarkAsWatched: (movieTitle: string) => Promise<void>;
  showAllRatings: boolean;
  // new optional prop to persist proposer comment
  onSaveComment?: (proposalId: string, comment: string) => Promise<void>;
}

export const MovieCard = ({
  movie,
  people,
  currentPersonId,
  onRatingChange,
  onSearchAgain,
  onMarkAsWatched,
  showAllRatings = false,
  onSaveComment
}: MovieCardProps) => {
  const [searchTitle, setSearchTitle] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  // --- proposal comment state & helpers (added) ---
  const initialComment = (movie as any).comment ?? "";
  const proposalId = (movie as any).proposalId ?? (movie as any).proposal_id;
  // try a few common names / ids for proposer stored on the movie object
  const proposerId =
    (movie as any).proposedBy

  const [commentText, setCommentText] = useState<string>(initialComment);
  const [isSavingComment, setIsSavingComment] = useState(false);
  // track last saved comment so Save is disabled until field changes after a save
  const [lastSavedComment, setLastSavedComment] = useState<string | null>(null);

  // keep local comment in sync when movie prop changes (e.g. after parent re-fetch)
  useEffect(() => {
    // When either the underlying comment changes OR the current user changes,
    // ensure the local input and "last saved" flag reflect the new context.
    setCommentText(initialComment);
    setLastSavedComment(null);
  }, [initialComment, currentPersonId]);

  const MAX_WORDS = 15;
  const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

  const onCommentChange = (value: string) => {
    // enforce 20-word client-side limit by trimming extras
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length <= MAX_WORDS) {
      setCommentText(value);
    } else {
      setCommentText(words.slice(0, MAX_WORDS).join(" "));
    }
  };

  const saveComment = async () => {
    if (!proposalId || !onSaveComment) return;
    const trimmed = commentText.trim();
    // avoid saving unchanged content relative to initial or last saved
    const compareBase = (lastSavedComment ?? initialComment ?? "").trim();
    if (trimmed === compareBase) return;
    setIsSavingComment(true);
    try {
      await onSaveComment(proposalId, trimmed);
      // mark saved value so Save stays disabled until user edits
      setLastSavedComment(trimmed);
      // parent should re-fetch to reflect persisted changes
    } catch (err) {
      console.error("Failed to save proposal comment", err);
    } finally {
      setIsSavingComment(false);
    }
  };

  // Determine proposer match more robustly:
  // - match by proposer id fields if present
  // - fallback to comparing current person's name to movie.proposedBy
  const currentPersonName = people.find(p => p.id === currentPersonId)?.name;
  const isProposer = Boolean(
    currentPersonId &&
    (
      (proposerId && currentPersonId === proposerId) ||
      (movie as any).proposedBy && currentPersonName && currentPersonName === (movie as any).proposedBy ||
      (movie as any).proposedBy === currentPersonName
    )
  );
  // --- end comment additions ---

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
                  {movie.details.director && <p>Director: {movie.details.director}</p>}
                  {movie.details.runtime && <p>Runtime: {movie.details.runtime}</p>}
                  {movie.details.genre && <p className="break-words">Genre: {movie.details.genre}</p>}

                  {/* Proposer comment aligned under Genre */}
                  <div className="mt-1">
                    {isProposer ? (
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                        <span className="text-xs font-medium text-muted-foreground flex-shrink-0">Proposer comment:</span>
                        <div className="flex-1 flex items-start gap-2">
                          <Input
                            placeholder="Add a short comment (max 20 words)"
                            value={commentText}
                            onChange={(e) => onCommentChange(e.target.value)}
                            className="flex-1 text-xs"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{wordCount(commentText)}/{MAX_WORDS}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={saveComment}
                              disabled={isSavingComment || commentText.trim() === ((lastSavedComment ?? initialComment) ?? "").trim()}
                            >
                              {isSavingComment ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-muted-foreground flex-shrink-0">Proposer comment:</span>
                        <div className="text-xs font-normal text-foreground/90 italic break-words">
                          {(initialComment && initialComment.trim()) ? initialComment : <span className="text-muted-foreground italic">No comment</span>}
                        </div>
                      </div>
                    )}
                  </div>
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