import type { Dispatch, SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Person, MovieRating, MovieDetails } from "@/types/session";
import type { useToast } from "@/hooks/use-toast";

type Toast = ReturnType<typeof useToast>['toast'];

interface UsePeopleManagerConfig {
  sessionId: string | null;
  people: Person[];
  setPeople: Dispatch<SetStateAction<Person[]>>;
  setMovieRatings: Dispatch<SetStateAction<MovieRating[]>>;
  toast: Toast;
}

export const usePeopleManager = ({
  sessionId,
  people,
  setPeople,
  setMovieRatings,
  toast,
}: UsePeopleManagerConfig) => {

  const fetchExistingProposalDetails = async (proposalId: string): Promise<{ details?: MovieDetails; createdAt?: string }> => {
    const { data, error } = await supabase
      .from('movie_proposals').select('*').eq('id', proposalId).single();
    if (error || !data) return {};
    return {
      details: {
        poster: data.poster, genre: data.genre, runtime: data.runtime, year: data.year,
        director: data.director, plot: data.plot,
        imdbRating: data.imdb_rating, imdbId: data.imdb_id,
      },
      createdAt: data.created_at,
    };
  };

  const updatePersonMovies = async (person: Person) => {
    if (!sessionId) return;
    const { data: currentProposals } = await supabase
      .from('movie_proposals').select('movie_title, id').eq('person_id', person.id);
    const currentMovies = currentProposals?.map(p => p.movie_title) || [];
    const moviesToAdd = person.movies.filter(m => !currentMovies.includes(m));
    const moviesToRemove = currentMovies.filter(m => !person.movies.includes(m));

    if (moviesToRemove.length > 0) {
      const proposalIds = currentProposals!
        .filter(p => moviesToRemove.includes(p.movie_title))
        .map(p => p.id);
      await supabase.from('movie_proposals').delete().in('id', proposalIds);
      setMovieRatings(prev => prev.filter(m => !moviesToRemove.includes(m.movieTitle)));
    }

    if (moviesToAdd.length > 0) {
      const now = new Date().toISOString();
      const optimisticMovies = moviesToAdd.map(movieTitle => ({
        movieTitle,
        proposedBy: person.name,
        ratings: { [person.id]: 5 },
        proposerId: person.id,
        createdAt: now,
      }));
      setMovieRatings(prev => [...prev, ...optimisticMovies]);

      // Never-throw wrapper: each movie resolves to {ok, movieTitle, ...}
      const results = await Promise.all(
        moviesToAdd.map(async (movieTitle) => {
          try {
            const { data, error } = await supabase.functions.invoke('propose-movie-with-details', {
              body: { sessionId, personId: person.id, movieTitle },
            });
            if (error) throw error;

            const proposal = data?.proposal;
            const existingId = data?.proposalId;
            let details: MovieDetails | undefined;
            let createdAt: string | undefined = proposal?.created_at;

            if (proposal) {
              details = {
                poster: proposal.poster, genre: proposal.genre, runtime: proposal.runtime,
                year: proposal.year, director: proposal.director, plot: proposal.plot,
                imdbRating: proposal.imdb_rating, imdbId: proposal.imdb_id,
              };
            } else if (existingId) {
              const existingData = await fetchExistingProposalDetails(existingId);
              details = existingData.details;
              createdAt = existingData.createdAt;
            }

            if (proposal?.id) {
              await supabase.from('movie_ratings').upsert({
                proposal_id: proposal.id,
                person_id: person.id,
                rating: 5,
              }, { onConflict: 'proposal_id,person_id' });
            }

            return {
              ok: true as const,
              movieTitle,
              details,
              proposalId: proposal?.id || existingId,
              createdAt: createdAt || now,
            };
          } catch (err) {
            console.error(`Failed to fetch details for "${movieTitle}":`, err);
            return { ok: false as const, movieTitle };
          }
        })
      );

      setMovieRatings(prev => {
        let updated = [...prev];
        for (const result of results) {
          if (result.ok) {
            updated = updated.map(m =>
              m.movieTitle === result.movieTitle
                ? {
                    ...m,
                    details: result.details,
                    proposalId: result.proposalId,
                    proposerId: person.id,
                    createdAt: result.createdAt ?? m.createdAt,
                  }
                : m
            );
          } else {
            updated = updated.filter(m => m.movieTitle !== result.movieTitle);
            toast({ title: "Error", description: `Failed to add "${result.movieTitle}". Please try again.`, variant: "destructive" });
          }
        }
        return updated;
      });
    }
  };

  const addPerson = async (name: string) => {
    if (!name.trim() || !sessionId) return;
    try {
      const { data: person, error } = await supabase
        .from('session_people')
        .insert([{ session_id: sessionId, name: name.trim(), is_present: true }])
        .select().single();
      if (error) throw error;
      setPeople(prev => [...prev, { id: person.id, name: person.name, movies: [], isPresent: person.is_present }]);
    } catch (err) {
      console.error('Error adding person:', err);
      toast({ title: "Error", description: "Failed to add person. Please try again.", variant: "destructive" });
    }
  };

  const updatePerson = async (updatedPerson: Person) => {
    if (!sessionId) return;
    const originalPerson = people.find(p => p.id === updatedPerson.id);
    try {
      setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
      const { error } = await supabase
        .from('session_people').update({ is_present: updatedPerson.isPresent }).eq('id', updatedPerson.id);
      if (error) throw error;
      await updatePersonMovies(updatedPerson);
    } catch (err) {
      console.error('Error updating person:', err);
      setPeople(prev => prev.map(p => p.id === updatedPerson.id ? originalPerson || p : p));
      toast({ title: "Error", description: "Failed to update person. Please try again.", variant: "destructive" });
    }
  };

  const deletePerson = async (id: string) => {
    const person = people.find(p => p.id === id);
    if (!person) return;
    try {
      const { error } = await supabase.from('session_people').delete().eq('id', id);
      if (error) throw error;
      setPeople(prev => prev.filter(p => p.id !== id));
      setMovieRatings(prev => prev.filter(m => m.proposerId !== id));
    } catch (err) {
      console.error('Error deleting person:', err);
      toast({ title: "Error", description: "Failed to remove person. Please try again.", variant: "destructive" });
    }
  };

  return { addPerson, updatePerson, deletePerson };
};
