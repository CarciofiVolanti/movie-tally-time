import { MovieDetails, MovieRating, Person } from "@/types/session";

// Pure transformation functions

export const transformPeopleData = (peopleData: any[], proposals: any[]): Person[] => {
  return peopleData.map(person => ({
    id: person.id,
    name: person.name,
    isPresent: person.is_present,
    movies: proposals
      .filter(p => p.person_id === person.id)
      .map(p => p.movie_title)
  }));
};

export const transformRatingsData = (proposalsData: { proposals: any[] }, peopleData: any[]): MovieRating[] => {
  return proposalsData.proposals.map(proposal => {
    const proposer = peopleData.find(p => p.id === proposal.person_id);
    
    // Transform ratings array to object
    const ratings: Record<string, number> = {};
    (proposal.movie_ratings || []).forEach((r: any) => {
      ratings[r.person_id] = r.rating;
    });

    // Extract comment (first one if multiple exist)
    const commentRow = proposal.proposal_comments?.[0];

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
      comment: commentRow?.comment,
      proposalId: proposal.id,
      proposerId: proposal.person_id
    };
  });
};

export const sortMovieRatings = (ratings: MovieRating[], personId: string): MovieRating[] => {
  if (!personId) {
    return [...ratings].sort((a, b) => a.movieTitle.localeCompare(b.movieTitle));
  }

  return [...ratings].sort((a, b) => {
    const aRated = a.ratings[personId] !== undefined && a.ratings[personId] > 0;
    const bRated = b.ratings[personId] !== undefined && b.ratings[personId] > 0;
    
    // Group: not-voted first, then voted
    // If aRated is true (voted) and bRated is false (not voted) -> return 1 (put a after b)
    // We want NOT VOTED first.
    // Not Voted (false) < Voted (true)
    
    if (aRated !== bRated) return aRated ? 1 : -1;
    return a.movieTitle.localeCompare(b.movieTitle);
  });
};
