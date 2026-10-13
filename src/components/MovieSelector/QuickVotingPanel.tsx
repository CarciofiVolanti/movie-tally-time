import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Film, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import { MovieRating, Person } from "@/types/session";

interface QuickVotingPanelProps {
  movieRatings: MovieRating[];
  people: Person[];
  selectedPersonId: string;
  updateRating: (proposalId: string, personId: string, rating: number) => Promise<void>;
  searchMovieAgain: (title: string) => Promise<void>;
  markMovieAsWatched: (title: string) => Promise<void>;
  onSaveComment?: (proposalId: string, comment: string) => Promise<void>;
}

export default function QuickVotingPanel(props: QuickVotingPanelProps) {
  const [presentProposersOnly, setPresentProposersOnly] = useState(true);
  const visibleMovies = presentProposersOnly
    ? props.movieRatings.filter(movie => {
        const proposer = movie.proposerId
          ? props.people.find(person => person.id === movie.proposerId)
          : props.people.find(person => person.name === movie.proposedBy);
        return proposer?.isPresent === true;
      })
    : props.movieRatings;
  // Remount the queue when identity changes, including while a vote is saving.
  return <details className="group/quick rounded-lg border border-border bg-card text-card-foreground">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-xl font-semibold [&::-webkit-details-marker]:hidden">
      <span>Quick voting</span>
      <span className="flex shrink-0 items-center gap-2">
        <ChevronDown aria-hidden="true" className="h-5 w-5 transition-transform motion-reduce:transition-none group-open/quick:rotate-180" />
      </span>
    </summary>
    <div className="px-4 pb-4">
      <div className="mb-4 flex items-center gap-2">
        <Switch
          id="quick-voting-present-proposers"
          checked={presentProposersOnly}
          onCheckedChange={setPresentProposersOnly}
        />
        <Label htmlFor="quick-voting-present-proposers" className="cursor-pointer select-none text-sm">
          Only show movies by present people
        </Label>
      </div>
      <VotingQueue
        key={props.selectedPersonId}
        {...props}
        movieRatings={visibleMovies}
        hasUnfilteredMovies={props.movieRatings.length > 0}
      />
    </div>
  </details>;
}

function VotingQueue({ movieRatings, people, selectedPersonId, updateRating, searchMovieAgain, onSaveComment, hasUnfilteredMovies }: QuickVotingPanelProps & { hasUnfilteredMovies: boolean }) {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pendingVote, setPendingVote] = useState<{ movie: MovieRating; rating: number } | null>(null);
  const voteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const selectedPerson = people.find(person => person.id === selectedPersonId);
  const unrated = selectedPerson ? movieRatings.filter(movie => !(movie.ratings[selectedPersonId] > 0)) : [];
  const currentIndex = unrated.length ? index % unrated.length : 0;
  const movie = unrated[currentIndex];
  const activeMovie = pendingVote?.movie ?? movie;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (voteTimer.current) clearTimeout(voteTimer.current);
    };
  }, []);

  const vote = async (votedMovie: MovieRating, proposalId: string, personId: string, rating: number) => {
    if (saving || rating === 0) return;
    setSaving(true);
    setPendingVote({ movie: votedMovie, rating });
    // Removing the saved movie leaves the next proposal at the same index.
    setIndex(currentIndex);
    const startedAt = Date.now();
    try {
      await updateRating(proposalId, personId, rating);
    } finally {
      if (mounted.current) {
        // Keep the selected stars visible briefly, but add no delay when saving is slow.
        const remainingFeedback = Math.max(0, 160 - (Date.now() - startedAt));
        voteTimer.current = setTimeout(() => {
          setPendingVote(null);
          setSaving(false);
        }, remainingFeedback);
      }
    }
  };

  return <div className="space-y-4">
    {!activeMovie && <p className="text-sm text-muted-foreground" aria-live="polite">
      {!selectedPerson ? "Select who you are in the session menu." : movieRatings.length ? "All proposals rated." : hasUnfilteredMovies ? "No movies proposed by present people." : "No movies proposed yet."}
    </p>}
    {activeMovie && <>
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="icon" aria-label="Previous proposal" disabled={saving || unrated.length < 2} onClick={() => setIndex((currentIndex - 1 + unrated.length) % unrated.length)}><ChevronLeft aria-hidden="true" /></Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">{saving ? "Saving vote..." : `${currentIndex + 1} / ${unrated.length}`}</span>
        <Button variant="outline" size="icon" aria-label="Next proposal" disabled={saving || unrated.length < 2} onClick={() => setIndex((currentIndex + 1) % unrated.length)}><ChevronRight aria-hidden="true" /></Button>
      </div>
      <QuickVoteCard
        key={activeMovie.proposalId ?? activeMovie.movieTitle}
        movie={activeMovie}
        ratingOverride={pendingVote?.rating}
        currentPersonId={selectedPersonId}
        currentPersonName={selectedPerson?.name}
        ratingDisabled={saving}
        onRatingChange={(rating) => activeMovie.proposalId && vote(activeMovie, activeMovie.proposalId, selectedPersonId, rating)}
        onSearchAgain={searchMovieAgain}
        onSaveComment={onSaveComment}
      />
    </>}
  </div>;
}

function QuickVoteCard({
  movie,
  ratingOverride,
  currentPersonId,
  currentPersonName,
  ratingDisabled,
  onRatingChange,
  onSearchAgain,
  onSaveComment,
}: {
  movie: MovieRating;
  ratingOverride?: number;
  currentPersonId: string;
  currentPersonName?: string;
  ratingDisabled: boolean;
  onRatingChange: (rating: number) => void;
  onSearchAgain: (title: string) => Promise<void>;
  onSaveComment?: (proposalId: string, comment: string) => Promise<void>;
}) {
  const [searchTitle, setSearchTitle] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const initialComment = movie.comment ?? "";
  const [commentText, setCommentText] = useState(initialComment);
  const [lastSavedComment, setLastSavedComment] = useState<string | null>(null);
  const [savingComment, setSavingComment] = useState(false);
  const hasPoster = Boolean(movie.details?.poster && movie.details.poster !== "N/A");
  const isProposer = Boolean(
    movie.proposerId
      ? movie.proposerId === currentPersonId
      : currentPersonName && currentPersonName === movie.proposedBy
  );

  useEffect(() => {
    setCommentText(initialComment);
    setLastSavedComment(null);
  }, [initialComment, currentPersonId]);

  const handleSearch = () => {
    if (!searchTitle.trim()) return;
    void onSearchAgain(searchTitle.trim());
    setSearchTitle("");
    setShowSearchInput(false);
  };

  const handleCommentChange = (value: string) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    setCommentText(words.length <= 15 ? value : words.slice(0, 15).join(" "));
  };

  const saveComment = async () => {
    if (!movie.proposalId || !onSaveComment) return;
    const trimmed = commentText.trim();
    setSavingComment(true);
    try {
      await onSaveComment(movie.proposalId, trimmed);
      setLastSavedComment(trimmed);
    } catch (error) {
      console.error("Failed to save proposal comment", error);
    } finally {
      setSavingComment(false);
    }
  };

  const commentBase = (lastSavedComment ?? initialComment).trim();

  return (
    <Card className="quick-vote-card-enter">
      <CardContent className="space-y-4 p-4">
        <div className="flex min-w-0 items-start gap-3">
          {hasPoster ? (
            <img
              src={movie.details?.poster}
              alt={`${movie.movieTitle} poster`}
              loading="lazy"
              decoding="async"
              className="h-20 w-14 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div aria-hidden="true" className="flex h-20 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Film className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 space-y-1">
            {movie.details?.imdbId ? (
              <a
                href={`https://www.imdb.com/title/${movie.details.imdbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-words text-lg font-semibold leading-tight hover:text-primary hover:underline"
              >
                {movie.movieTitle}
              </a>
            ) : (
              <h3 className="break-words text-lg font-semibold leading-tight">{movie.movieTitle}</h3>
            )}
            <p className="text-sm text-muted-foreground">
              {movie.proposedBy ? `Proposed by ${movie.proposedBy}` : "Movie proposal"}
              {movie.details?.year ? ` · ${movie.details.year}` : ""}
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium">Your rating</span>
            <StarRating
              rating={ratingOverride ?? movie.ratings[currentPersonId] ?? 0}
              onRatingChange={onRatingChange}
              size="lg"
              readonly={ratingDisabled || !movie.proposalId}
            />
          </div>
          <div aria-hidden="true" className="flex justify-between pl-0.5 text-xs text-muted-foreground sm:pl-1">
            <span>Not keen</span>
            <span>Must watch</span>
          </div>
        </div>

        <details className="border-t border-border pt-3 text-sm">
          <summary className="w-fit cursor-pointer font-medium text-muted-foreground hover:text-foreground">
            Movie details
          </summary>
          <div className="mt-3 space-y-2 text-muted-foreground">
            {movie.details?.director && <p>Director: {movie.details.director}</p>}
            {movie.details?.runtime && <p>Runtime: {movie.details.runtime}</p>}
            {movie.details?.genre && <p>Genre: {movie.details.genre}</p>}
            {movie.details?.plot && <p>{movie.details.plot}</p>}
            {isProposer && onSaveComment ? (
              <div className="space-y-2">
                <label htmlFor={`quick-proposal-comment-${movie.proposalId}`} className="font-medium text-foreground">
                  Proposer comment
                </label>
                <Textarea
                  id={`quick-proposal-comment-${movie.proposalId}`}
                  placeholder="Max 15 words"
                  value={commentText}
                  onChange={(event) => handleCommentChange(event.target.value)}
                  rows={2}
                  className="resize-y text-sm"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {commentText.trim() ? commentText.trim().split(/\s+/).length : 0}/15 words
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={saveComment}
                    disabled={savingComment || commentText.trim() === commentBase}
                  >
                    {savingComment ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : movie.comment?.trim() ? (
              <p><span className="font-medium text-foreground">Proposer comment:</span> {movie.comment}</p>
            ) : null}
            {!hasPoster && (
              <div className="space-y-2 pt-1">
                {showSearchInput ? (
                  <div className="flex gap-2">
                    <Input
                      aria-label={`Search for another movie instead of ${movie.movieTitle}`}
                      placeholder="Movie title"
                      value={searchTitle}
                      onChange={(event) => setSearchTitle(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                      className="h-9"
                    />
                    <Button variant="outline" size="sm" onClick={handleSearch} disabled={!searchTitle.trim()}>
                      Search
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setShowSearchInput(true)} className="h-8 px-2">
                    <Search aria-hidden="true" className="mr-1 h-3 w-3" />
                    Find details
                  </Button>
                )}
              </div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
