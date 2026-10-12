import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { MovieCard } from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MovieRating, Person } from "@/types/session";

interface QuickVotingPanelProps {
  movieRatings: MovieRating[];
  people: Person[];
  selectedPersonId: string;
  updateRating: (proposalId: string, personId: string, rating: number) => Promise<void>;
  searchMovieAgain: (title: string) => Promise<void>;
  markMovieAsWatched: (title: string) => Promise<void>;
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
  const selectedPerson = props.people.find(person => person.id === props.selectedPersonId);
  const remaining = selectedPerson
    ? visibleMovies.filter(movie => !(movie.ratings[selectedPerson.id] > 0)).length
    : null;
  // Remount the queue when identity changes, including while a vote is saving.
  return <details className="group/quick rounded-lg border border-border bg-card text-card-foreground">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-xl font-semibold [&::-webkit-details-marker]:hidden">
      <span className="flex flex-col items-start">
        <span>Quick voting</span>
        <span className="text-sm font-normal text-muted-foreground">In a hurry? Vote for tonight!</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {remaining !== null && <Badge variant={remaining === 0 ? "default" : "outline"} className={remaining === 0 ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30" : "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30"}>{remaining} remaining</Badge>}
        <ChevronDown aria-hidden="true" className="h-5 w-5 transition-transform group-open/quick:rotate-180" />
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

function VotingQueue({ movieRatings, people, selectedPersonId, updateRating, searchMovieAgain, markMovieAsWatched, hasUnfilteredMovies }: QuickVotingPanelProps & { hasUnfilteredMovies: boolean }) {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const selectedPerson = people.find(person => person.id === selectedPersonId);
  const unrated = selectedPerson ? movieRatings.filter(movie => !(movie.ratings[selectedPersonId] > 0)) : [];
  const currentIndex = unrated.length ? index % unrated.length : 0;
  const movie = unrated[currentIndex];

  const vote = async (proposalId: string, personId: string, rating: number) => {
    if (saving || rating === 0) return;
    setSaving(true);
    // Removing the saved movie leaves the next proposal at the same index.
    setIndex(currentIndex);
    try {
      await updateRating(proposalId, personId, rating);
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-4">
    {!movie && <p className="text-sm text-muted-foreground" aria-live="polite">
      {!selectedPerson ? "Select who you are in the session menu." : movieRatings.length ? "All proposals rated." : hasUnfilteredMovies ? "No movies proposed by present people." : "No movies proposed yet."}
    </p>}
    {movie && <>
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="icon" aria-label="Previous proposal" disabled={saving || unrated.length < 2} onClick={() => setIndex((currentIndex - 1 + unrated.length) % unrated.length)}><ChevronLeft aria-hidden="true" /></Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">{saving ? "Saving vote..." : `${currentIndex + 1} / ${unrated.length}`}</span>
        <Button variant="outline" size="icon" aria-label="Next proposal" disabled={saving || unrated.length < 2} onClick={() => setIndex((currentIndex + 1) % unrated.length)}><ChevronRight aria-hidden="true" /></Button>
      </div>
      <MovieCard key={movie.proposalId ?? movie.movieTitle} movie={movie} people={people} currentPersonId={selectedPersonId} showAllRatings={false} quickVoting ratingDisabled={saving} onRatingChange={vote} onSearchAgain={searchMovieAgain} onMarkAsWatched={markMovieAsWatched} />
    </>}
  </div>;
}
