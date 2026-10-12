import { describe, expect, it } from "vitest";
import type {
  DetailedRating,
  MovieProposal,
  MovieRating,
  Person,
  WatchedMovie,
} from "../../hooks/useStatsData";
import {
  calculateAnticipationStats,
  calculateAwards,
  calculateGroupHighlights,
  calculateGenreDistribution,
  calculateMovieAverages,
  calculateOverallAverageRating,
  calculateOverallHype,
  calculatePearsonCorrelation,
  calculatePersonStats,
  calculateSynergyStats,
  calculateTotalRuntime,
  formatRuntime,
  getLengthPreference,
  parseRuntime,
} from "../../utils";

const watchedMovie = (overrides: Partial<WatchedMovie> = {}): WatchedMovie => ({
  id: "movie-1",
  movie_title: "First Movie",
  proposed_by: "Alice",
  watched_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const detailedRating = (overrides: Partial<DetailedRating> = {}): DetailedRating => ({
  id: "score-1",
  watched_movie_id: "movie-1",
  person_id: "alice",
  rating: 8,
  present: true,
  ...overrides,
});

const movieRating = (overrides: Partial<MovieRating> = {}): MovieRating => ({
  proposal_id: "proposal-1",
  watched_movie_id: null,
  person_id: "alice",
  rating: 4,
  ...overrides,
});

const person = (id: string, name: string): Person => ({ id, name });

describe("Stats runtime utilities", () => {
  it("parses runtimes and treats missing or invalid values as zero", () => {
    expect(parseRuntime("142 min")).toBe(142);
    expect(parseRuntime("1h 42m")).toBe(1);
    expect(parseRuntime(null)).toBe(0);
    expect(parseRuntime("N/A")).toBe(0);
  });

  it("sums movie runtimes and formats minutes as days, hours, and minutes", () => {
    expect(calculateTotalRuntime([
      watchedMovie({ runtime: "90 minutes" }),
      watchedMovie({ id: "movie-2", runtime: "150 minutes" }),
    ])).toBe(240);
    expect(formatRuntime(1501)).toBe("1d 1h 1m");
    expect(formatRuntime(0)).toBe("0m");
  });
});

describe("Stats rating utilities", () => {
  it("calculates average, median, and count from positive detailed ratings", () => {
    expect(calculateOverallAverageRating([
      detailedRating({ id: "a", rating: 2 }),
      detailedRating({ id: "b", rating: 6 }),
      detailedRating({ id: "c", rating: 10 }),
      detailedRating({ id: "d", rating: 0 }),
      detailedRating({ id: "e", rating: null }),
    ])).toEqual({ average: 6, count: 3, median: 6 });
  });

  it("returns zero summary values when there are no valid ratings", () => {
    expect(calculateOverallAverageRating([
      detailedRating({ rating: 0 }),
      detailedRating({ rating: null }),
    ])).toEqual({ average: 0, count: 0, median: 0 });
    expect(calculateOverallHype([])).toEqual({ average: 0, count: 0, median: 0 });
  });

  it("calculates hype median for an even number of positive votes", () => {
    expect(calculateOverallHype([
      movieRating({ rating: 1 }),
      movieRating({ rating: 3 }),
      movieRating({ rating: 5 }),
      movieRating({ rating: 0 }),
    ])).toEqual({ average: 3, count: 3, median: 3 });
    expect(calculateOverallHype([
      movieRating({ rating: 2 }),
      movieRating({ rating: 4 }),
    ])).toEqual({ average: 3, count: 2, median: 3 });
  });

  it("calculates each watched movie average and omits movies without positive scores", () => {
    const movies = [
      watchedMovie({ id: "movie-1" }),
      watchedMovie({ id: "movie-2", movie_title: "Second Movie" }),
    ];
    const result = calculateMovieAverages(movies, [
      detailedRating({ id: "a", watched_movie_id: "movie-1", rating: 8 }),
      detailedRating({ id: "b", watched_movie_id: "movie-1", rating: 6 }),
      detailedRating({ id: "c", watched_movie_id: "movie-1", rating: 0 }),
      detailedRating({ id: "d", watched_movie_id: "movie-2", rating: null }),
    ]);

    expect(result).toEqual([{ ...movies[0], averageRating: 7, voteCount: 2 }]);
  });
});

describe("Stats genre and highlight utilities", () => {
  it("splits genre lists, trims names, ignores missing values, and sorts by count", () => {
    expect(calculateGenreDistribution([
      watchedMovie({ genre: "Drama, Comedy" }),
      watchedMovie({ id: "movie-2", genre: "Drama,  Action " }),
      watchedMovie({ id: "movie-3", genre: "N/A" }),
      watchedMovie({ id: "movie-4", genre: "" }),
    ])).toEqual([
      { name: "Drama", value: 2 },
      { name: "Comedy", value: 1 },
      { name: "Action", value: 1 },
    ]);
  });

  it("finds the largest positive and negative score-versus-hype gaps", () => {
    const movies = [
      watchedMovie({ id: "surprise", movie_title: "Surprise" }),
      watchedMovie({ id: "disappointment", movie_title: "Disappointment" }),
    ];
    const scores = [
      detailedRating({ id: "s1", watched_movie_id: "surprise", rating: 9 }),
      detailedRating({ id: "s2", watched_movie_id: "surprise", person_id: "bob", rating: 9 }),
      detailedRating({ id: "d1", watched_movie_id: "disappointment", rating: 2 }),
      detailedRating({ id: "d2", watched_movie_id: "disappointment", person_id: "bob", rating: 2 }),
    ];
    const hypes = [
      movieRating({ watched_movie_id: "surprise", rating: 2 }),
      movieRating({ watched_movie_id: "surprise", person_id: "bob", rating: 2 }),
      movieRating({ watched_movie_id: "disappointment", rating: 5 }),
      movieRating({ watched_movie_id: "disappointment", person_id: "bob", rating: 5 }),
    ];

    expect(calculateGroupHighlights(movies, scores, hypes)).toEqual({
      surprise: { title: "Surprise", avgHype: 2, avgScore: 9, diff: 5 },
      disappointment: { title: "Disappointment", avgHype: 5, avgScore: 2, diff: -8 },
    });
  });

  it("does not report highlights without at least two scores and two hype votes", () => {
    expect(calculateGroupHighlights(
      [watchedMovie()],
      [detailedRating({ rating: 9 })],
      [movieRating({ watched_movie_id: "movie-1" })],
    )).toEqual({ surprise: null, disappointment: null });
  });
});

describe("Stats correlation utilities", () => {
  it("calculates correlation and handles mismatched, short, and constant samples", () => {
    expect(calculatePearsonCorrelation([1, 2, 3], [2, 4, 6])).toBe(1);
    expect(calculatePearsonCorrelation([1, 2, 3], [6, 4, 2])).toBe(-1);
    expect(calculatePearsonCorrelation([1], [2])).toBeNull();
    expect(calculatePearsonCorrelation([1, 2], [1])).toBeNull();
    expect(calculatePearsonCorrelation([1, 1], [2, 3])).toBe(0);
  });

  it("maps correlations to the length preference labels", () => {
    expect(getLengthPreference(null)).toBe("Not enough data");
    expect(getLengthPreference(0.31)).toBe("Prefers longer movies");
    expect(getLengthPreference(-0.31)).toBe("Prefers shorter movies");
    expect(getLengthPreference(0.3)).toBe("No strong preference");
  });
});

describe("Stats award utilities", () => {
  it("ranks attendance, individual score averages, and proposer movie averages", () => {
    const movies = [
      watchedMovie({ id: "movie-1", proposed_by: "Alice" }),
      watchedMovie({ id: "movie-2", proposed_by: "Bob" }),
      watchedMovie({ id: "movie-3", proposed_by: "Bob" }),
    ];
    const ratings = [
      detailedRating({ id: "a1", watched_movie_id: "movie-1", person_id: "alice", rating: 9 }),
      detailedRating({ id: "b1", watched_movie_id: "movie-1", person_id: "bob", rating: 5 }),
      detailedRating({ id: "a2", watched_movie_id: "movie-2", person_id: "alice", rating: 8 }),
      detailedRating({ id: "b2", watched_movie_id: "movie-2", person_id: "bob", rating: 4 }),
      detailedRating({ id: "a3", watched_movie_id: "movie-3", person_id: "alice", rating: 7 }),
      detailedRating({ id: "b3", watched_movie_id: "movie-3", person_id: "bob", rating: 3 }),
    ];
    const awards = calculateAwards(movies, ratings, [person("alice", "Alice"), person("bob", "Bob")]);

    expect(awards.cinephile[0]).toMatchObject({ name: "Alice", score: 3, sampleCount: 3 });
    expect(awards.harshestCritic[0]).toMatchObject({ name: "Bob", score: 4 });
    expect(awards.easyPleaser[0]).toMatchObject({ name: "Alice", score: 8 });
    expect(awards.tastemaker[0]).toMatchObject({ name: "Alice", score: 7 });
    expect(awards.tastemaker[1]).toMatchObject({ name: "Bob", score: 5.5 });
  });

  it("returns empty awards when there are no people or watched movies", () => {
    expect(calculateAwards([], [], [person("alice", "Alice")])).toEqual({
      cinephile: [], harshestCritic: [], easyPleaser: [], tastemaker: [],
    });
  });
});

describe("Stats anticipation and synergy utilities", () => {
  it("ranks people by average hype and proposals by average vote", () => {
    const ratings = [
      movieRating({ proposal_id: "p1", person_id: "alice", rating: 5 }),
      movieRating({ proposal_id: "p2", person_id: "alice", rating: 4 }),
      movieRating({ proposal_id: "p1", person_id: "bob", rating: 3 }),
      movieRating({ proposal_id: "p2", person_id: "bob", rating: 2 }),
    ];
    const proposals: MovieProposal[] = [
      { id: "p1", movie_title: "Big Favorite", person_id: "alice" },
      { id: "p2", movie_title: "Other Movie", person_id: "bob" },
    ];
    const result = calculateAnticipationStats(ratings, [person("alice", "Alice"), person("bob", "Bob")], [], proposals);

    expect(result.hypeMan.map(entry => entry.name)).toEqual(["Alice", "Bob"]);
    expect(result.skeptic.map(entry => entry.name)).toEqual(["Bob", "Alice"]);
    expect(result.mostAnticipated[0]).toMatchObject({ name: "Big Favorite", score: 4, sampleCount: 2 });
  });

  it("returns empty anticipation rankings without ratings or people", () => {
    expect(calculateAnticipationStats([], [person("alice", "Alice")], [], [])).toEqual({
      hypeMan: [], skeptic: [], mostAnticipated: [],
    });
  });

  it("ranks proposal affinity and agreement on watched movie scores", () => {
    const people = [person("alice", "Alice"), person("bob", "Bob")];
    const proposals: MovieProposal[] = [
      { id: "p1", movie_title: "One", person_id: "alice" },
      { id: "p2", movie_title: "Two", person_id: "alice" },
    ];
    const hypes = [
      movieRating({ proposal_id: "p1", person_id: "bob", rating: 5 }),
      movieRating({ proposal_id: "p2", person_id: "bob", rating: 4 }),
    ];
    const scores = [
      detailedRating({ id: "a1", watched_movie_id: "movie-1", person_id: "alice", rating: 8 }),
      detailedRating({ id: "b1", watched_movie_id: "movie-1", person_id: "bob", rating: 8 }),
      detailedRating({ id: "a2", watched_movie_id: "movie-2", person_id: "alice", rating: 7 }),
      detailedRating({ id: "b2", watched_movie_id: "movie-2", person_id: "bob", rating: 7 }),
    ];
    const result = calculateSynergyStats(hypes, scores, people, [], proposals);

    expect(result.perfectMatch[0]).toMatchObject({ score: 4.5, sampleCount: 2 });
    expect(result.soulmates[0]).toMatchObject({ name: "Alice & Bob", score: 0, sampleCount: 2 });
    expect(result.polarOpposites[0]).toMatchObject({ name: "Alice & Bob", score: 0, sampleCount: 2 });
  });

  it("does not rank person pairs with fewer than two shared score samples", () => {
    const result = calculateSynergyStats([], [detailedRating()], [person("alice", "Alice"), person("bob", "Bob")], [], []);
    expect(result.soulmates).toEqual([]);
    expect(result.polarOpposites).toEqual([]);
  });
});

describe("individual Stats", () => {
  it("summarizes attendance, ratings, runtime, alignment, genres, and surprise for a person", () => {
    const movies = [
      watchedMovie({ id: "movie-1", movie_title: "First Movie", runtime: "100 min", genre: "Drama, Comedy" }),
      watchedMovie({ id: "movie-2", movie_title: "Second Movie", runtime: "120 min", genre: "Drama" }),
      watchedMovie({ id: "movie-3", movie_title: "Not Attended", runtime: "90 min", genre: "N/A" }),
    ];
    const scores = [
      detailedRating({ id: "a1", watched_movie_id: "movie-1", person_id: "alice", rating: 8, present: true }),
      detailedRating({ id: "b1", watched_movie_id: "movie-1", person_id: "bob", rating: 6, present: true }),
      detailedRating({ id: "a2", watched_movie_id: "movie-2", person_id: "alice", rating: 6, present: true }),
      detailedRating({ id: "b2", watched_movie_id: "movie-2", person_id: "bob", rating: 8, present: true }),
      detailedRating({ id: "a3", watched_movie_id: "movie-3", person_id: "alice", rating: 4, present: false }),
    ];
    const hypes = [
      movieRating({ watched_movie_id: "movie-1", person_id: "alice", rating: 3 }),
      movieRating({ watched_movie_id: "movie-1", person_id: "bob", rating: 2 }),
      movieRating({ watched_movie_id: "movie-2", person_id: "alice", rating: 4 }),
      movieRating({ watched_movie_id: "movie-2", person_id: "bob", rating: 3 }),
    ];
    const stats = calculatePersonStats("alice", movies, scores, hypes, [], [person("alice", "Alice"), person("bob", "Bob")]);

    expect(stats).toMatchObject({
      moviesWatched: 2,
      totalWatchTime: "3h 40m",
      avgRatingGiven: "6.00",
      medianRating: "6.0",
      avgHypeGiven: "3.50",
      medianHype: "3.5",
      alignmentScore: "1.00",
      alignmentHypeScore: "0.50",
      alignmentCount: 2,
      hypeAlignmentCount: 2,
      totalRatings: 3,
      totalHypeRatings: 2,
      biggestSurprise: { title: "First Movie", hype: 3, score: 8, diff: 2 },
      biggestDisappointment: { title: "Second Movie", hype: 4, score: 6, diff: -2 },
    });
    expect(stats.scoreScatterData).toHaveLength(3);
  });

  it("returns stable empty-state values when a person has no ratings", () => {
    const stats = calculatePersonStats("alice", [], [], [], [], [person("alice", "Alice")]);
    expect(stats).toMatchObject({
      moviesWatched: 0,
      totalWatchTime: "0m",
      avgRatingGiven: "0.00",
      medianRating: "0.0",
      avgHypeGiven: "0.00",
      medianHype: "0.0",
      alignmentScore: "N/A",
      alignmentHypeScore: "N/A",
      bestSynergy: null,
      worstSynergy: null,
      biggestSurprise: null,
      biggestDisappointment: null,
    });
  });
});
