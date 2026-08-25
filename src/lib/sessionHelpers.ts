import { MovieDetails, MovieRating, Person } from "@/types/session";
import { Tables } from "@/integrations/supabase/types";
import { normalizeTitle } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type SessionPersonRow = Tables<'session_people'>;
type ProposalWithRelations = Tables<'movie_proposals'> & {
  movie_ratings?: Tables<'movie_ratings'>[] | null;
  proposal_comments?: Tables<'proposal_comments'>[] | Tables<'proposal_comments'> | null;
};

export const formatProposalAge = (createdAt?: string | null): string | null => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
};

export const formatDateDDMMYYYY = (dateString?: string | null): string => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  return `${day}/${month}/${year}`;
};

export const sortRatings = (ratings: MovieRating[], personId: string): MovieRating[] => {
  if (!personId) {
    return [...ratings].sort((a, b) => normalizeTitle(a.movieTitle).localeCompare(normalizeTitle(b.movieTitle)));
  }
  return [...ratings].sort((a, b) => {
    const aRated = a.ratings[personId] !== undefined && a.ratings[personId] > 0;
    const bRated = b.ratings[personId] !== undefined && b.ratings[personId] > 0;
    if (aRated !== bRated) return aRated ? 1 : -1;
    return normalizeTitle(a.movieTitle).localeCompare(normalizeTitle(b.movieTitle));
  });
};

export const sortPeople = (people: Person[], selectedPersonId?: string): Person[] => {
  return [...people].sort((a, b) => {
    if (selectedPersonId) {
      if (a.id === selectedPersonId && b.id !== selectedPersonId) return -1;
      if (b.id === selectedPersonId && a.id !== selectedPersonId) return 1;
    }
    return a.name.localeCompare(b.name);
  });
};

// Pure transformation functions

export const transformPeopleData = (peopleData: SessionPersonRow[], proposals: ProposalWithRelations[]): Person[] => {
  return (peopleData || []).map(person => ({
    id: person.id,
    name: person.name,
    isPresent: person.is_present,
    movies: (proposals || [])
      .filter(p => p.person_id === person.id)
      .map(p => p.movie_title)
  }));
};

export const transformRatingsData = (proposalsData: { proposals: ProposalWithRelations[] }, peopleData: SessionPersonRow[]): MovieRating[] => {
  return (proposalsData?.proposals || []).map(proposal => {
    const proposer = (peopleData || []).find(p => p.id === proposal.person_id);

    // Transform ratings array to object
    const ratings: Record<string, number> = {};
    (proposal.movie_ratings || []).forEach(r => {
      if (r && r.person_id) {
        ratings[r.person_id] = r.rating;
      }
    });

    // Extract comment (handles both 1-to-1 object and 1-to-many array)
    const rawComments = (proposal as any).proposal_comments ?? (proposal as any).proposal_comment;
    const commentRow = Array.isArray(rawComments) ? rawComments[0] : rawComments;

    const details: MovieDetails | undefined = proposal.poster ? {
      poster: proposal.poster,
      genre: proposal.genre,
      runtime: proposal.runtime,
      year: proposal.year,
      director: proposal.director,
      plot: proposal.plot,
      imdbRating: proposal.imdb_rating,
      imdbId: proposal.imdb_id
    } : undefined;

    return {
      movieTitle: proposal.movie_title,
      proposedBy: proposer?.name || 'Unknown',
      ratings,
      details,
      comment: commentRow?.comment || undefined,
      proposalId: proposal.id,
      proposerId: proposal.person_id,
      createdAt: proposal.created_at,
    };
  });
};
