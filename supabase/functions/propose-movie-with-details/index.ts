import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
    const { sessionId, personId, movieTitle } = await req.json();

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

    // Fetch movie details from OMDB API
    const omdbApiKey = Deno.env.get('OMDB_API_KEY');
    let movieDetails = {
      poster: null,
      genre: null,
      runtime: null,
      year: null,
      director: null,
      plot: null,
      imdb_rating: null,
      imdb_id: null
    };

    if (omdbApiKey) {
      try {
        console.log(`Fetching details for movie: ${movieTitle}`);
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
            imdb_id: movieData.imdbID !== 'N/A' ? movieData.imdbID : null
          };
          console.log(`Successfully fetched details for: ${movieData.Title}`);
        } else {
          console.log(`Movie not found in OMDB: ${movieTitle}`);
        }
      } catch (error) {
        console.error('Error fetching movie details from OMDB:', error);
        // Continue with empty details if API fails
      }
    } else {
      console.warn('OMDB API key not available, creating proposal without details');
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
        detailsFetched: !!omdbApiKey && !!movieDetails.imdb_id
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});