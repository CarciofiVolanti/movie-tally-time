import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMovieSearch } from "../useMovieSearch";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("useMovieSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles multi-option search results from TMDB response", async () => {
    const mockResults = [
      {
        title: "Dune",
        year: "2021",
        poster: "https://image.tmdb.org/t/p/w500/dune2021.jpg",
        director: "Denis Villeneuve",
        runtime: "155 min",
        genre: "Action, Sci-Fi",
        imdbRating: "8.0",
        imdbId: "tt1160419",
        tmdbId: 438631,
      },
      {
        title: "Dune",
        year: "1984",
        poster: "https://image.tmdb.org/t/p/w500/dune1984.jpg",
        director: "David Lynch",
        runtime: "137 min",
        genre: "Action, Sci-Fi",
        imdbRating: "6.3",
        imdbId: "tt0087182",
        tmdbId: 841,
      },
    ];

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        ...mockResults[0],
        results: mockResults,
      },
      error: null,
    } as unknown as ReturnType<typeof supabase.functions.invoke>);

    const { result } = renderHook(() => useMovieSearch());

    await act(async () => {
      await result.current.searchMovies("Dune");
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith("search-movie", {
      body: { title: "Dune" },
    });
    expect(result.current.searchResults).toHaveLength(2);
    expect(result.current.searchResults[0].title).toBe("Dune");
    expect(result.current.searchResults[0].year).toBe("2021");
    expect(result.current.searchResults[1].year).toBe("1984");
    expect(result.current.showSearchResults).toBe(true);
    expect(result.current.isSearching).toBe(false);
  });

  it("falls back to single object response if results array is not present", async () => {
    const singleMovie = {
      title: "Inception",
      year: "2010",
      poster: "https://image.tmdb.org/t/p/w500/inception.jpg",
      genre: "Sci-Fi",
      imdbRating: "8.8",
    };

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: singleMovie,
      error: null,
    } as unknown as ReturnType<typeof supabase.functions.invoke>);

    const { result } = renderHook(() => useMovieSearch());

    await act(async () => {
      await result.current.searchMovies("Inception");
    });

    expect(result.current.searchResults).toHaveLength(1);
    expect(result.current.searchResults[0].title).toBe("Inception");
  });

  it("clears search results when clearResults is called", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { results: [{ title: "Alien", year: "1979" }] },
      error: null,
    } as unknown as ReturnType<typeof supabase.functions.invoke>);

    const { result } = renderHook(() => useMovieSearch());

    await act(async () => {
      await result.current.searchMovies("Alien");
    });

    expect(result.current.searchResults).toHaveLength(1);
    expect(result.current.showSearchResults).toBe(true);

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.searchResults).toHaveLength(0);
    expect(result.current.showSearchResults).toBe(false);
  });

  it("handles errors gracefully and resets search results", async () => {
    vi.mocked(supabase.functions.invoke).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useMovieSearch());

    await act(async () => {
      await result.current.searchMovies("Bad Query");
    });

    expect(result.current.searchResults).toHaveLength(0);
    expect(result.current.isSearching).toBe(false);
  });
});
