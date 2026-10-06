import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MovieSearchResult {
  title: string;
  year?: string;
  poster?: string;
  plot?: string;
  genre?: string;
  imdbRating?: string;
  runtime?: string;
  director?: string;
  actors?: string;
  imdbId?: string;
  tmdbId?: number;
}

export const useMovieSearch = () => {
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const searchMovies = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-movie", {
        body: { title: query.trim() },
      });
      if (error) throw error;

      const results = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : data && typeof data === 'object' && data.title
        ? [data]
        : [];

      setSearchResults(results);
    } catch (err) {
      console.error("Error searching movies:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setShowSearchResults(false);
    setSearchResults([]);
  };

  return { searchResults, isSearching, showSearchResults, searchMovies, clearResults };
};
