import React, { useEffect, useState } from "react";
import { MovieWithStats, Person } from "@/types/session";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film, Trophy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ResultsPanel = ({ rankedMovies, people, markMovieAsWatched }: {
  rankedMovies: MovieWithStats[];
  people: Person[];
  markMovieAsWatched: (title: string) => Promise<void>;
}) => {
  const presentPeople = people.filter(p => p.isPresent);

  const [favouritesByProposal, setFavouritesByProposal] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("favourite_movies" as any)
          .select("person_id, proposal_id");
        if (error) throw error;

        // raw data fetched from DB (no logging)

        if (!mounted) return;
        const map: Record<string, string[]> = {};
        (data || []).forEach((row: any) => {
          if (!row || !row.proposal_id || !row.person_id) return;
          map[row.proposal_id] = map[row.proposal_id] || [];
          map[row.proposal_id].push(row.person_id);
        });

        // built map proposal_id => [person_id]
 
        setFavouritesByProposal(map);
      } catch (err) {
        console.error("Failed to load favourites:", err);
        setFavouritesByProposal({});
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Movie Rankings</h3>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Movies ranked by average rating from present participants</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 mt-4">
        {rankedMovies.map((movie, index) => (
          (
           <Card key={movie.movieTitle} className="w-full max-w-full">
             <CardHeader className="pb-3 p-3 sm:p-6">
               <div className="flex items-center gap-2 sm:gap-3">
                 <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground font-bold text-xs sm:text-sm flex-shrink-0">
                   {index + 1}
                 </div>
                 <div className="flex-1 min-w-0">
                   <h3 className="font-semibold text-base sm:text-lg leading-tight truncate">{movie.movieTitle}</h3>
                   <p className="text-xs sm:text-sm text-muted-foreground">Proposed by {movie.proposedBy}</p>
                 </div>
                 <Badge variant="secondary" className="text-base sm:text-lg">★ {movie.averageRating.toFixed(1)}</Badge>
               </div>
             </CardHeader>
             <CardContent className="pt-0">
               <div className="flex gap-3 mb-3">
                 {movie.details?.poster && movie.details.poster !== 'N/A' ? (
                   <img src={movie.details.poster} alt={`${movie.movieTitle} poster`} className="w-16 h-24 object-cover rounded-lg shadow-sm flex-shrink-0" />
                 ) : (
                   <div className="w-16 h-24 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                     <Film className="w-6 h-6 text-primary" />
                   </div>
                 )}
                 <div className="space-y-1 text-xs text-muted-foreground flex-1">
                   {movie.details?.year && <p>Year: {movie.details.year}</p>}
                   {movie.details?.director && <p>Director: {movie.details.director}</p>}
                   {movie.details?.runtime && <p>Runtime: {movie.details.runtime}</p>}
                   {movie.details?.genre && <p className="break-words">Genre: {movie.details.genre}</p>}
                   <p>{movie.totalRatings}/{presentPeople.length} people rated</p>

                  {(() => {
                    const absentVoters = people.filter(p => !p.isPresent && movie.ratings[p.id] === 1).map(p => p.name);
                    const proposalId = (movie as any).proposalId ?? (movie as any).proposal_id ?? null;
                    const favPersonIds = proposalId ? favouritesByProposal[proposalId] ?? [] : [];
                    const absentFavNames = people.filter(p => !p.isPresent && favPersonIds.includes(p.id)).map(p => p.name);
                    const notYetRated = presentPeople.filter(p => !(movie.ratings[p.id] > 0)).map(p => p.name);

                    const nodes: React.ReactNode[] = [];
                    if (notYetRated.length > 0) {
                      nodes.push(<p key="not-rated" className="text-yellow-600 font-medium mt-1">Waiting for: {notYetRated.join(", ")}</p>);
                    }
                    if (absentVoters.length > 0) {
                      nodes.push(<p key="absent-1" className="text-green-600 font-medium mt-1">Rated 1 by absent: {absentVoters.join(", ")}</p>);
                    }
                    if (absentFavNames.length > 0) {
                      nodes.push(<p key="absent-fav" className="text-red-500 font-medium mt-1">Favoured by absent: {absentFavNames.join(", ")}</p>);
                    }

                    return nodes.length > 0 ? <>{nodes}</> : null;
                  })()}
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                 {movie.details?.imdbId && (
                   <a href={`https://www.imdb.com/title/${movie.details.imdbId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View on IMDb</a>
                 )}

                 <button onClick={() => markMovieAsWatched(movie.movieTitle)} className="inline-flex items-center gap-2 px-3 py-1 border rounded text-xs">
                   <Check className="w-3 h-3" />
                   Watched
                 </button>
               </div>
             </CardContent>
           </Card>
        )))}
      </div>

      {rankedMovies.length === 0 && (
        <Card className="text-center py-8 mt-4">
          <CardContent>
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No results found. Make sure people have rated the movies!</p>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default ResultsPanel;