import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TmdbMovieResult {
  id: number;
  title?: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
  vote_average?: number;
}

interface TmdbCrewMember {
  job?: string;
  name?: string;
}

interface TmdbCastMember {
  name?: string;
}

interface TmdbMovieDetails {
  id: number;
  title?: string;
  release_date?: string;
  genres?: Array<{ id: number; name: string }>;
  overview?: string;
  poster_path?: string | null;
  vote_average?: number;
  runtime?: number | null;
  imdb_id?: string | null;
  credits?: {
    crew?: TmdbCrewMember[];
    cast?: TmdbCastMember[];
  };
  external_ids?: {
    imdb_id?: string | null;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, query } = await req.json();
    const movieQuery = (title || query || '').trim();

    if (!movieQuery) {
      return new Response(
        JSON.stringify({ error: 'Movie title is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const tmdbKey = Deno.env.get('TMDB_API_KEY') || Deno.env.get('TMDB_READ_ACCESS_TOKEN');
    const omdbApiKey = Deno.env.get('OMDB_API_KEY');

    if (tmdbKey) {
      console.log(`Searching TMDB for movie: ${movieQuery}`);
      const authHeaders: Record<string, string> = { 'Accept': 'application/json' };
      const isApiKey = tmdbKey.length === 32 && !tmdbKey.includes('.');
      
      let searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movieQuery)}&include_adult=false&language=en-US&page=1`;
      if (isApiKey) {
        searchUrl += `&api_key=${tmdbKey}`;
      } else {
        authHeaders['Authorization'] = `Bearer ${tmdbKey}`;
      }

      const searchRes = await fetch(searchUrl, { headers: authHeaders });
      if (!searchRes.ok) {
        const errorText = await searchRes.text();
        console.error(`TMDB search error (${searchRes.status}):`, errorText);
        return new Response(
          JSON.stringify({ error: 'TMDB search failed', details: errorText }),
          { status: searchRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const searchData = await searchRes.json();
      const rawResults: TmdbMovieResult[] = searchData.results || [];

      if (rawResults.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Movie not found', results: [] }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch full details for top results (up to 6) in parallel
      const topResults = rawResults.slice(0, 6);
      const detailedResults = await Promise.all(
        topResults.map(async (m: TmdbMovieResult) => {
          try {
            let detailUrl = `https://api.themoviedb.org/3/movie/${m.id}?append_to_response=credits,external_ids&language=en-US`;
            if (isApiKey) {
              detailUrl += `&api_key=${tmdbKey}`;
            }

            const detailRes = await fetch(detailUrl, { headers: authHeaders });
            if (!detailRes.ok) {
              throw new Error(`Detail fetch failed with status ${detailRes.status}`);
            }

            const d: TmdbMovieDetails = await detailRes.json();
            const director = d.credits?.crew
              ?.filter((c: TmdbCrewMember) => c.job === 'Director')
              ?.map((c: TmdbCrewMember) => c.name)
              ?.filter(Boolean)
              ?.join(', ') || null;

            const actors = d.credits?.cast
              ?.slice(0, 4)
              ?.map((c: TmdbCastMember) => c.name)
              ?.filter(Boolean)
              ?.join(', ') || null;

            return {
              title: d.title || m.title || '',
              year: d.release_date ? d.release_date.split('-')[0] : (m.release_date ? m.release_date.split('-')[0] : null),
              genre: d.genres?.map((g) => g.name).join(', ') || null,
              director,
              actors,
              plot: d.overview || m.overview || null,
              poster: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : (m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null),
              imdbRating: d.vote_average ? d.vote_average.toFixed(1) : (m.vote_average ? m.vote_average.toFixed(1) : null),
              runtime: d.runtime ? `${d.runtime} min` : null,
              imdbId: d.external_ids?.imdb_id || d.imdb_id || null,
              tmdbId: d.id || m.id,
            };
          } catch (err) {
            console.warn(`Failed to fetch details for movie ${m.id}:`, err);
            return {
              title: m.title || '',
              year: m.release_date ? m.release_date.split('-')[0] : null,
              genre: null,
              director: null,
              actors: null,
              plot: m.overview || null,
              poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
              imdbRating: m.vote_average ? m.vote_average.toFixed(1) : null,
              runtime: null,
              imdbId: null,
              tmdbId: m.id,
            };
          }
        })
      );

      const bestMatch = detailedResults[0];
      return new Response(
        JSON.stringify({
          ...bestMatch,
          results: detailedResults,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (omdbApiKey) {
      console.log(`Falling back to OMDB for movie: ${movieQuery}`);
      const omdbUrl = `https://www.omdbapi.com/?apikey=${omdbApiKey}&t=${encodeURIComponent(movieQuery)}`;
      const response = await fetch(omdbUrl);
      const movieData = await response.json();

      if (movieData.Response === 'False') {
        return new Response(
          JSON.stringify({ error: movieData.Error || 'Movie not found', results: [] }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const movieInfo = {
        title: movieData.Title,
        year: movieData.Year,
        genre: movieData.Genre !== 'N/A' ? movieData.Genre : null,
        director: movieData.Director !== 'N/A' ? movieData.Director : null,
        actors: movieData.Actors !== 'N/A' ? movieData.Actors : null,
        plot: movieData.Plot !== 'N/A' ? movieData.Plot : null,
        poster: movieData.Poster !== 'N/A' ? movieData.Poster : null,
        imdbRating: movieData.imdbRating !== 'N/A' ? movieData.imdbRating : null,
        runtime: movieData.Runtime !== 'N/A' ? movieData.Runtime : null,
        imdbId: movieData.imdbID !== 'N/A' ? movieData.imdbID : null,
        tmdbId: null,
      };

      return new Response(
        JSON.stringify({
          ...movieInfo,
          results: [movieInfo],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.error('Neither TMDB_API_KEY nor OMDB_API_KEY found in environment variables');
    return new Response(
      JSON.stringify({ error: 'API configuration error: Neither TMDB_API_KEY nor OMDB_API_KEY is configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-movie function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});