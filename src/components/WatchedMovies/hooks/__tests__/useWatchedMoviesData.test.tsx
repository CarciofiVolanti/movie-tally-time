import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWatchedMoviesData } from "../useWatchedMoviesData";

const { from, responses, queries, toast } = vi.hoisted(() => {
  const responses: Record<string, { data?: unknown; error?: Error | null }> = {};
  const queries: { table: string; method: string; args: unknown[] }[] = [];
  const toast = vi.fn();

  const from = vi.fn((table: string) => {
    const query: Record<string, (...args: unknown[]) => unknown> & {
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise<unknown>;
    } = {
      select: (...args) => { queries.push({ table, method: "select", args }); return query; },
      eq: (...args) => { queries.push({ table, method: "eq", args }); return query; },
      order: (...args) => { queries.push({ table, method: "order", args }); return query; },
      in: (...args) => { queries.push({ table, method: "in", args }); return query; },
      then: (resolve, reject) => Promise.resolve(responses[table] ?? { data: [], error: null }).then(resolve, reject),
    };
    return query;
  });

  return { from, responses, queries, toast };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

describe("useWatchedMoviesData", () => {
  beforeEach(() => {
    Object.keys(responses).forEach(key => delete responses[key]);
    queries.length = 0;
    from.mockClear();
    toast.mockClear();
  });

  it("loads people, watched movies, and ratings for those movies in the expected order", async () => {
    const people = [{ id: "alice", name: "Alice", is_present: true }];
    const movies = [{ id: "movie-1", movie_title: "First Movie" }];
    const ratings = [{ id: "rating-1", watched_movie_id: "movie-1", person_id: "alice", rating: 8 }];
    responses.session_people = { data: people, error: null };
    responses.watched_movies = { data: movies, error: null };
    responses.detailed_ratings = { data: ratings, error: null };

    const { result } = renderHook(() => useWatchedMoviesData("session-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.people).toEqual(people);
    expect(result.current.watchedMovies).toEqual(movies);
    expect(result.current.detailedRatings).toEqual(ratings);
    expect(queries).toContainEqual({ table: "session_people", method: "order", args: ["created_at", { ascending: true }] });
    expect(queries).toContainEqual({ table: "watched_movies", method: "order", args: ["watched_at", { ascending: false }] });
    expect(queries).toContainEqual({ table: "detailed_ratings", method: "in", args: ["watched_movie_id", ["movie-1"]] });
  });

  it("clears ratings and skips the ratings query when there are no watched movies", async () => {
    responses.session_people = { data: [], error: null };
    responses.watched_movies = { data: [], error: null };

    const { result } = renderHook(() => useWatchedMoviesData("session-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.watchedMovies).toEqual([]);
    expect(result.current.detailedRatings).toEqual([]);
    expect(from).not.toHaveBeenCalledWith("detailed_ratings");
  });

  it("reports load errors and retries successfully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    responses.session_people = { data: null, error: new Error("People request failed") };

    const { result } = renderHook(() => useWatchedMoviesData("session-1"));
    await waitFor(() => expect(result.current.error).toBe("People request failed"));
    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "People request failed",
      variant: "destructive",
    });

    responses.session_people = { data: [{ id: "alice", name: "Alice", is_present: true }], error: null };
    responses.watched_movies = { data: [], error: null };
    await act(async () => { await result.current.retry(); });

    expect(result.current.error).toBeNull();
    expect(result.current.people).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    consoleError.mockRestore();
  });
});
