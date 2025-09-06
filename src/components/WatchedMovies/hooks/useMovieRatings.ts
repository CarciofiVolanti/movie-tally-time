import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { DetailedRating } from "../types";

export const useMovieRatings = (
  detailedRatings: DetailedRating[],
  setDetailedRatings: React.Dispatch<React.SetStateAction<DetailedRating[]>>
) => {
  const [localPresentStates, setLocalPresentStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const updateDetailedRating = async (
    watchedMovieId: string,
    personId: string,
    rating: number | null,
    present?: boolean
  ) => {
    try {
      if (rating !== null || present) {
        const { error } = await supabase
          .from("detailed_ratings")
          .upsert({
            watched_movie_id: watchedMovieId,
            person_id: personId,
            rating,
            present
          }, {
            onConflict: "watched_movie_id,person_id"
          });

        if (error) throw error;

        setDetailedRatings(prev => {
          const existingIndex = prev.findIndex(r => 
            r.watched_movie_id === watchedMovieId && r.person_id === personId
          );

          if (existingIndex >= 0) {
            const newRatings = [...prev];
            newRatings[existingIndex] = { ...newRatings[existingIndex], rating, present };
            return newRatings;
          } else {
            return [...prev, {
              id: `temp-${Date.now()}`,
              watched_movie_id: watchedMovieId,
              person_id: personId,
              rating,
              present
            }];
          }
        });

        if (rating !== null) {
          toast({
            title: "Rating saved",
            description: `Rating of ${rating}/10 saved successfully`,
          });
        }
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  return {
    localPresentStates,
    setLocalPresentStates,
    updateDetailedRating
  };
};
