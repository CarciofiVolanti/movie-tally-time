import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFavouriteMovie = (selectedPersonId?: string | null) => {
  const { toast } = useToast();
  const [favoriteProposalId, setFavoriteProposalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFavourite = useCallback(async (personId?: string | null) => {
    if (!personId) {
      setFavoriteProposalId(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("favourite_movies")
        .select("proposal_id")
        .eq("person_id", personId)
        .maybeSingle();

      if (error) throw error;
      setFavoriteProposalId(data?.proposal_id ?? null);
    } catch (err) {
      console.error("Failed to load favourite:", err);
      setFavoriteProposalId(null);
    }
  }, []);

  useEffect(() => {
    loadFavourite(selectedPersonId);
  }, [selectedPersonId, loadFavourite]);

  const toggleFavourite = useCallback(async (proposalId: string, proposerPersonId?: string) => {
    if (!selectedPersonId) {
      toast({ title: "Select a person", description: "Please select a person before marking a favourite.", variant: "default" });
      return;
    }

    // disallow own proposal
    if (proposerPersonId && proposerPersonId === selectedPersonId) {
      toast({ title: "Not allowed", description: "You cannot favourite your own proposal.", variant: "default" });
      return;
    }

    // fetch existing favourite by person_id
    const { data: existingFav } = await supabase
      .from("favourite_movies")
      .select("id, proposal_id")
      .eq("person_id", selectedPersonId)
      .maybeSingle();

    if (existingFav && existingFav.proposal_id === proposalId) {
      await supabase.from("favourite_movies").delete().eq("person_id", selectedPersonId);
      setFavoriteProposalId(null);
      return;
    }

    await supabase.from("favourite_movies").upsert({ person_id: selectedPersonId, proposal_id: proposalId }, { onConflict: "person_id" });
    setFavoriteProposalId(proposalId);
  }, [selectedPersonId, toast]);

  return {
    favoriteProposalId,
    loading,
    toggleFavourite,
    reload: () => loadFavourite(selectedPersonId),
  };
};

export default useFavouriteMovie;