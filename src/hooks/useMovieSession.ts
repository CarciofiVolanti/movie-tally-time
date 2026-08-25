import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { setSelectedPersonForSession } from "@/lib/sessionCookies";
import { Person, MovieRating } from "@/types/session";
import { transformPeopleData, transformRatingsData, sortRatings } from "@/lib/sessionHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useSessionSetup } from "./useSessionSetup";
import { usePeopleManager } from "./usePeopleManager";
import { useProposalRatings } from "./useProposalRatings";
import { useRealtimeSync } from "./useRealtimeSync";

export const useMovieSession = (opts?: { onSessionLoad?: (id: string) => void }) => {
  const { toast } = useToast();

  // ── Shared state ──────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [currentView, setCurrentView] = useState<'session' | 'watched' | 'stats'>('session');

  const [people, setPeople] = useState<Person[]>([]);
  const [movieRatings, setMovieRatings] = useState<MovieRating[]>([]);

  const [selectedPersonId, setSelectedPersonIdState] = useState<string>("");
  const [shouldSort, setShouldSort] = useState(true);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [collapsedMovies, setCollapsedMovies] = useState<Record<string, boolean>>({});

  // Keep a ref to people for use in real-time callbacks
  const peopleRef = useRef<Person[]>(people);
  useEffect(() => { peopleRef.current = people; }, [people]);

  // Validate selected person still exists after people updates
  useEffect(() => {
    if (sessionId && selectedPersonId && people.length > 0) {
      if (!people.some(p => p.id === selectedPersonId)) setSelectedPersonIdState("");
    }
  }, [sessionId, selectedPersonId, people]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const fetchSessionPeople = async (sid: string) => {
    const { data, error } = await supabase
      .from('session_people').select('*').eq('session_id', sid);
    if (error) throw error;
    return data || [];
  };

  const fetchProposalsWithRatingsAndComments = async (sid: string) => {
    const { data: proposals, error } = await supabase
      .from('movie_proposals')
      .select('*, movie_ratings(*), proposal_comments(*)')
      .eq('session_id', sid);
    if (error) throw error;

    if (proposals && proposals.length > 0) {
      const hasAnyComment = proposals.some(p => {
        const c = (p as any).proposal_comments ?? (p as any).proposal_comment;
        return Array.isArray(c) ? c.length > 0 : Boolean(c);
      });

      if (!hasAnyComment) {
        const proposalIds = proposals.map(p => p.id);
        const { data: directComments } = await supabase
          .from('proposal_comments')
          .select('*')
          .in('proposal_id', proposalIds);

        if (directComments && directComments.length > 0) {
          const commentsByProposalId = new Map(directComments.map(c => [c.proposal_id, c]));
          proposals.forEach(p => {
            const match = commentsByProposalId.get(p.id);
            if (match) {
              (p as any).proposal_comments = match;
            }
          });
        }
      }
    }

    return { proposals: proposals || [] };
  };

  const loadSessionData = async (sid: string, savedPersonId?: string) => {
    try {
      const [peopleData, proposalsWithDetails] = await Promise.all([
        fetchSessionPeople(sid),
        fetchProposalsWithRatingsAndComments(sid),
      ]);
      const transformedPeople = transformPeopleData(peopleData, proposalsWithDetails.proposals);
      const transformedRatings = transformRatingsData(proposalsWithDetails, peopleData);
      setPeople(transformedPeople);
      setMovieRatings(sortRatings(transformedRatings, savedPersonId || selectedPersonId));
      setShouldSort(true);
    } catch (err) {
      console.error('Error loading session data:', err);
      toast({ title: "Error", description: "Failed to load session data", variant: "destructive" });
    }
  };

  // ── Sub-hooks (behavior only) ─────────────────────────────────────────────
  const { createNewSession } = useSessionSetup({
    onSessionLoad: opts?.onSessionLoad,
    setSessionId,
    setLoading,
    setShowNewSession,
    setSelectedPersonIdState,
    onDataLoaded: loadSessionData,
    toast,
  });

  const { addPerson, updatePerson, deletePerson } = usePeopleManager({
    sessionId,
    people,
    setPeople,
    setMovieRatings,
    toast,
  });

  const {
    presentPeople, rankedMovies,
    toggleCollapse, updateRating, updateComment, markMovieAsWatched,
    fetchAllMovieDetails, searchMovieAgain,
  } = useProposalRatings({
    sessionId, people, setPeople, movieRatings, setMovieRatings,
    shouldSort, setShouldSort, setFetchingDetails, setCollapsedMovies, toast,
  });

  useRealtimeSync({ sessionId, setMovieRatings, setPeople, peopleRef });

  // ── selectedPersonId setter (needs movieRatings + sessionId) ──────────────
  const setSelectedPersonId = (id: string) => {
    setShouldSort(true);
    setSelectedPersonIdState(id);
    setMovieRatings(prev => sortRatings(prev, id));
    if (sessionId) setSelectedPersonForSession(sessionId, id);
  };

  // getSortedMovies from sub-hook doesn't know about selectedPersonId; wrap it here
  const getSortedMovies = () => {
    if (!shouldSort) return movieRatings;
    return sortRatings(movieRatings, selectedPersonId);
  };

  return {
    people,
    movieRatings,
    sessionId,
    loading,
    showNewSession,
    fetchingDetails,
    collapsedMovies,
    selectedPersonId,
    currentView,
    presentPeople,
    rankedMovies,
    getSortedMovies,
    setShowNewSession,
    setSessionId,
    setCurrentView,
    setSelectedPersonId,
    setCollapsedMovies,
    setShouldSort,
    createNewSession,
    loadSessionData,
    fetchAllMovieDetails,
    searchMovieAgain,
    addPerson,
    updatePerson,
    deletePerson,
    updateRating,
    updateComment,
    markMovieAsWatched,
    toggleCollapse,
  };
};

export default useMovieSession;
