import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { sessionId, personId, movieTitle, tmdbId, movieDetails: passedDetails } = await req.json();

    if (!sessionId || !personId || !movieTitle || movieTitle.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Session ID, person ID, and movie title are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if this movie is already proposed by this person in this session
    const { data: existingProposal } = await supabase
      .from('movie_proposals')
      .select('id')
      .eq('session_id', sessionId)
      .eq('person_id', personId)
      .eq('movie_title', movieTitle.trim())
      .single();

    if (existingProposal) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Movie already proposed by this person',
          proposalId: existingProposal.id 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const tmdbKey = Deno.env.get('TMDB_API_KEY') || Deno.env.get('TMDB_READ_ACCESS_TOKEN');
    const omdbApiKey = Deno.env.get('OMDB_API_KEY');

    let movieDetails = {
      poster: passedDetails?.poster ?? null,
      genre: passedDetails?.genre ?? null,
      runtime: passedDetails?.runtime ?? null,
      year: passedDetails?.year ?? null,
      director: passedDetails?.director ?? null,
      plot: passedDetails?.plot ?? null,
      imdb_rating: passedDetails?.imdbRating ?? passedDetails?.imdb_rating ?? null,
      imdb_id: passedDetails?.imdbId ?? passedDetails?.imdb_id ?? null,
    };

    const hasCompletePassedDetails = !!(
      movieDetails.poster ||
      movieDetails.director ||
      movieDetails.plot ||
      movieDetails.imdb_id
    );

    if (!hasCompletePassedDetails) {
      if (tmdbKey) {
        try {
          const authHeaders: Record<string, string> = { 'Accept': 'application/json' };
          const isApiKey = tmdbKey.length === 32 && !tmdbKey.includes('.');
          if (!isApiKey) {
            authHeaders['Authorization'] = `Bearer ${tmdbKey}`;
          }

          let targetTmdbId = tmdbId;

          // If no specific tmdbId provided, search for the movie by title
          if (!targetTmdbId) {
            let searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movieTitle.trim())}&include_adult=false&language=en-US&page=1`;
            if (isApiKey) searchUrl += `&api_key=${tmdbKey}`;

            const searchRes = await fetch(searchUrl, { headers: authHeaders });
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              if (searchData.results && searchData.results.length > 0) {
                targetTmdbId = searchData.results[0].id;
              }
            }
          }

          if (targetTmdbId) {
            let detailUrl = `https://api.themoviedb.org/3/movie/${targetTmdbId}?append_to_response=credits,external_ids&language=en-US`;
            if (isApiKey) detailUrl += `&api_key=${tmdbKey}`;

            const detailRes = await fetch(detailUrl, { headers: authHeaders });
            if (detailRes.ok) {
              const d: TmdbMovieDetails = await detailRes.json();
              const director = d.credits?.crew
                ?.filter((c: TmdbCrewMember) => c.job === 'Director')
                ?.map((c: TmdbCrewMember) => c.name)
                ?.filter(Boolean)
                ?.join(', ') || null;

              movieDetails = {
                poster: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
                genre: d.genres?.map((g) => g.name).join(', ') || null,
                runtime: d.runtime ? `${d.runtime} min` : null,
                year: d.release_date ? d.release_date.split('-')[0] : null,
                director,
                plot: d.overview || null,
                imdb_rating: d.vote_average ? d.vote_average.toFixed(1) : null,
                imdb_id: d.external_ids?.imdb_id || d.imdb_id || null,
              };
              console.log(`Successfully fetched TMDB details for: ${d.title || movieTitle}`);
            }
          }
        } catch (error) {
          console.error('Error fetching movie details from TMDB:', error);
        }
      } else if (omdbApiKey) {
        try {
          console.log(`Fetching details from OMDB for: ${movieTitle}`);
          const omdbUrl = `https://www.omdbapi.com/?apikey=${omdbApiKey}&t=${encodeURIComponent(movieTitle.trim())}`;
          const response = await fetch(omdbUrl);
          const movieData = await response.json();

          if (movieData.Response !== 'False') {
            movieDetails = {
              poster: movieData.Poster !== 'N/A' ? movieData.Poster : null,
              genre: movieData.Genre !== 'N/A' ? movieData.Genre : null,
              runtime: movieData.Runtime !== 'N/A' ? movieData.Runtime : null,
              year: movieData.Year !== 'N/A' ? movieData.Year : null,
              director: movieData.Director !== 'N/A' ? movieData.Director : null,
              plot: movieData.Plot !== 'N/A' ? movieData.Plot : null,
              imdb_rating: movieData.imdbRating !== 'N/A' ? movieData.imdbRating : null,
              imdb_id: movieData.imdbID !== 'N/A' ? movieData.imdbID : null,
            };
            console.log(`Successfully fetched OMDB details for: ${movieData.Title}`);
          }
        } catch (error) {
          console.error('Error fetching movie details from OMDB:', error);
        }
      } else {
        console.warn('Neither TMDB_API_KEY nor OMDB_API_KEY available, creating proposal without external details');
      }
    }

    // Insert movie proposal with details
    const { data: newProposal, error: insertError } = await supabase
      .from('movie_proposals')
      .insert({
        session_id: sessionId,
        person_id: personId,
        movie_title: movieTitle.trim(),
        ...movieDetails
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting movie proposal:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create movie proposal' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully created proposal for: ${movieTitle}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        proposal: newProposal,
        detailsFetched: !!(movieDetails.poster || movieDetails.imdb_id)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in propose-movie-with-details function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});