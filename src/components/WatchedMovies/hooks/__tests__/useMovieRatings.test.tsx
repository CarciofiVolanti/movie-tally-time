import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMovieRatings } from "../useMovieRatings";
import type { DetailedRating } from "../../types";

const { from, responses, queries, toast } = vi.hoisted(() => {
  const responses: Record<string, { error?: Error | null }> = {};
  const queries: { table: string; method: string; args: unknown[] }[] = [];
  const toast = vi.fn();

  const from = vi.fn((table: string) => ({
    upsert: (...args: unknown[]) => {
      queries.push({ table, method: "upsert", args });
      return Promise.resolve(responses[`${table}:upsert`] ?? { error: null });
    },
  }));

  return { from, responses, queries, toast };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

describe("useMovieRatings", () => {
  beforeEach(() => {
    Object.keys(responses).forEach(key => delete responses[key]);
    queries.length = 0;
    from.mockClear();
    toast.mockClear();
  });

  const mountHook = (initialRatings: DetailedRating[] = []) => renderHook(() => {
    const [ratings, setRatings] = useState(initialRatings);
    const hook = useMovieRatings(ratings, setRatings);
    return { ...hook, ratings };
  });

  it("optimistically adds a rating, persists it with the composite conflict key, and confirms success", async () => {
    const { result } = mountHook();

    await act(async () => {
      await result.current.updateDetailedRating("movie-1", "alice", 8, true);
    });

    expect(result.current.ratings).toHaveLength(1);
    expect(result.current.ratings[0]).toMatchObject({
      watched_movie_id: "movie-1",
      person_id: "alice",
      rating: 8,
      present: true,
    });
    expect(result.current.ratings[0].id).toMatch(/^temp-/);
    expect(queries).toContainEqual({
      table: "detailed_ratings",
      method: "upsert",
      args: [
        { watched_movie_id: "movie-1", person_id: "alice", rating: 8, present: true },
        { onConflict: "watched_movie_id,person_id" },
      ],
    });
    expect(toast).toHaveBeenCalledWith({ title: "Rating saved", description: "Rating of 8/10 saved successfully" });
    expect(result.current.isUpdating["movie-1-alice"]).toBe(false);
  });

  it("updates an existing rating and presence state without adding a duplicate row", async () => {
    const initial = [{ id: "rating-1", watched_movie_id: "movie-1", person_id: "alice", rating: 5, present: false }];
    const { result } = mountHook(initial);

    await act(async () => {
      await result.current.updateDetailedRating("movie-1", "alice", 9, true);
    });

    expect(result.current.ratings).toHaveLength(1);
    expect(result.current.ratings[0]).toEqual({ ...initial[0], rating: 9, present: true });
  });

  it("rolls back an optimistic change and shows an error toast when persistence fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const initial = [{ id: "rating-1", watched_movie_id: "movie-1", person_id: "alice", rating: 5, present: true }];
    responses["detailed_ratings:upsert"] = { error: new Error("write failed") };
    const { result } = mountHook(initial);

    await act(async () => {
      await result.current.updateDetailedRating("movie-1", "alice", 2, true);
    });

    expect(result.current.ratings).toEqual(initial);
    expect(toast).toHaveBeenCalledWith({
      title: "Error",
      description: "Failed to save rating. Please try again.",
      variant: "destructive",
    });
    expect(result.current.isUpdating["movie-1-alice"]).toBe(false);
    consoleError.mockRestore();
  });

  it("persists attendance only and ignores a clear when neither rating nor presence is set", async () => {
    const { result } = mountHook();

    await act(async () => {
      await result.current.updateDetailedRating("movie-1", "alice", null, true);
    });
    expect(queries).toHaveLength(1);
    expect(queries[0].args[0]).toMatchObject({ rating: null, present: true });
    expect(toast).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.updateDetailedRating("movie-2", "bob", null, false);
    });
    expect(queries).toHaveLength(1);
  });
});
