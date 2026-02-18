import type { WatchedMovie, DetailedRating, Person, RateSortMode } from "./types";

export const getMovieRatings = (movieId: string, detailedRatings: DetailedRating[]) => {
  return detailedRatings.filter(r => r.watched_movie_id === movieId && r.rating !== null);
};

export const getAverageRating = (movieId: string, detailedRatings: DetailedRating[]) => {
  const ratings = getMovieRatings(movieId, detailedRatings);
  if (ratings.length === 0) return 0;
  return ratings.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratings.length;
};

export const getRatingForPerson = (movieId: string, personId: string, detailedRatings: DetailedRating[]) => {
  const rating = detailedRatings.find(r => r.watched_movie_id === movieId && r.person_id === personId);
  return rating?.rating ?? null;
};

export const hasSelectedPersonVoted = (movieId: string, selectedPersonId: string, detailedRatings: DetailedRating[]) => {
  return detailedRatings.some(
    r => r.watched_movie_id === movieId && r.person_id === selectedPersonId && r.rating !== null
  );
};

export const getPresentPersonIds = (
  movieId: string,
  people: Person[],
  detailedRatings: DetailedRating[],
  localPresentStates: Record<string, boolean>
) => {
  return people
    .filter(person => {
      const localKey = `${movieId}-${person.id}`;
      if (localPresentStates.hasOwnProperty(localKey)) {
        return localPresentStates[localKey];
      }
      const detailed = detailedRatings.find(
        r => r.watched_movie_id === movieId && r.person_id === person.id
      );
      return detailed?.present ?? false;
    })
    .map(person => person.id);
};

export const isFullyRated = (
  movieId: string,
  people: Person[],
  detailedRatings: DetailedRating[],
  localPresentStates: Record<string, boolean>
) => {
  const presentPersonIds = getPresentPersonIds(movieId, people, detailedRatings, localPresentStates);
  if (presentPersonIds.length === 0) return false;
  return presentPersonIds.every(pid =>
    detailedRatings.some(
      r => r.watched_movie_id === movieId && r.person_id === pid && r.rating !== null
    )
  );
};

export const getPresentPeopleWithoutRating = (
  movieId: string,
  people: Person[],
  detailedRatings: DetailedRating[],
  localPresentStates: Record<string, boolean>
) => {
  const presentIds = getPresentPersonIds(movieId, people, detailedRatings, localPresentStates);
  return people.filter(person =>
    presentIds.includes(person.id) &&
    !detailedRatings.some(
      r => r.watched_movie_id === movieId && r.person_id === person.id && r.rating !== null
    )
  );
};

export const getAllVoters = (movieId: string, detailedRatings: DetailedRating[], people: Person[]) => {
  return detailedRatings
    .filter(r => r.watched_movie_id === movieId && r.rating !== null)
    .map(r => {
      const person = people.find(p => p.id === r.person_id);
      return {
        id: r.id,
        person_id: r.person_id,
        rating: r.rating,
        name: person?.name ?? "Unknown"
      };
    });
};

export const getSortedFilteredMovies = (
  watchedMovies: WatchedMovie[],
  rateSortMode: RateSortMode,
  rateSortAsc: boolean,
  selectedPersonId: string | undefined,
  people: Person[],
  detailedRatings: DetailedRating[],
  localPresentStates: Record<string, boolean>
) => {
  let movies = [...watchedMovies];

  if (rateSortMode === "voted" && selectedPersonId) {
    movies = movies.filter(m => hasSelectedPersonVoted(m.id, selectedPersonId, detailedRatings));
  } else if (rateSortMode === "not-voted" && selectedPersonId) {
    movies = movies.filter(m => {
      const presentIds = getPresentPersonIds(m.id, people, detailedRatings, localPresentStates);
      return presentIds.includes(selectedPersonId) && !hasSelectedPersonVoted(m.id, selectedPersonId, detailedRatings);
    });
  } else if (rateSortMode === "absent" && selectedPersonId) {
    movies = movies.filter(m => {
      const presentIds = getPresentPersonIds(m.id, people, detailedRatings, localPresentStates);
      const wasPresent = presentIds.includes(selectedPersonId);
      const voted = hasSelectedPersonVoted(m.id, selectedPersonId, detailedRatings);
      return !wasPresent && !voted;
    });
  } else if (rateSortMode === "not-fully-rated") {
    movies = movies.filter(m => !isFullyRated(m.id, people, detailedRatings, localPresentStates));
  }

  // Sorting
  if (rateSortMode === "date-desc" || rateSortMode === "date-asc") {
    movies.sort((a, b) => {
      const aDate = new Date(a.watched_at).getTime();
      const bDate = new Date(b.watched_at).getTime();
      return rateSortMode === "date-desc"
        ? bDate - aDate
        : aDate - bDate;
    });
  } else if (rateSortMode === "voted" || rateSortMode === "not-voted" || rateSortMode === "absent" || rateSortMode === "not-fully-rated") {
    movies.sort((a, b) => {
      const aDate = new Date(a.watched_at).getTime();
      const bDate = new Date(b.watched_at).getTime();
      return rateSortAsc ? aDate - bDate : bDate - aDate;
    });
  }

  return movies;
};

export const formatWatchDate = (watchedAt: string) => {
  const d = new Date(watchedAt);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};
