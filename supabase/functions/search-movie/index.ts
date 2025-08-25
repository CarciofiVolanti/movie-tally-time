import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title } = await req.json();

    if (!title || title.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Movie title is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const omdbApiKey = Deno.env.get('OMDB_API_KEY');
    if (!omdbApiKey) {
      console.error('OMDB API key not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const omdbUrl = `https://www.omdbapi.com/?apikey=${omdbApiKey}&t=${encodeURIComponent(title)}`;
    
    console.log(`Searching for movie: ${title}`);
    
    const response = await fetch(omdbUrl);
    const movieData = await response.json();

    if (movieData.Response === 'False') {
      return new Response(
        JSON.stringify({ error: movieData.Error || 'Movie not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return relevant movie information
    const movieInfo = {
      title: movieData.Title,
      year: movieData.Year,
      genre: movieData.Genre,
      director: movieData.Director,
      actors: movieData.Actors,
      plot: movieData.Plot,
      poster: movieData.Poster,
      imdbRating: movieData.imdbRating,
      runtime: movieData.Runtime,
      imdbId: movieData.imdbID
    };

    return new Response(
      JSON.stringify(movieInfo),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in search-movie function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});