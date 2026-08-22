import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSelectedPersonForSession } from "@/lib/sessionCookies";
import type { useToast } from "@/hooks/use-toast";

type Toast = ReturnType<typeof useToast>['toast'];

interface UseSessionSetupConfig {
  onSessionLoad?: (id: string) => void;
  setSessionId: Dispatch<SetStateAction<string | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setShowNewSession: Dispatch<SetStateAction<boolean>>;
  setSelectedPersonIdState: Dispatch<SetStateAction<string>>;
  onDataLoaded: (sid: string, savedPersonId: string) => Promise<void>;
  toast: Toast;
}

export const useSessionSetup = (config: UseSessionSetupConfig) => {
  // Ref so that createNewSession / loadExistingSession always call the latest version
  // of onDataLoaded without re-subscribing the mount effect
  const onDataLoadedRef = useRef(config.onDataLoaded);
  useEffect(() => { onDataLoadedRef.current = config.onDataLoaded; });

  useEffect(() => {
    const sessionIdFromUrl = new URLSearchParams(window.location.search).get('session');
    if (sessionIdFromUrl) {
      loadExistingSession(sessionIdFromUrl);
    } else {
      config.setShowNewSession(true);
      config.setLoading(false);
    }
  }, []);

  const loadExistingSession = async (id: string) => {
    try {
      const { data: session, error } = await supabase
        .from('movie_sessions').select().eq('id', id).maybeSingle();
      if (error) throw error;
      if (session) {
        config.setSessionId(session.id);
        config.onSessionLoad?.(session.id);
        const savedPersonId = getSelectedPersonForSession(session.id);
        if (savedPersonId) config.setSelectedPersonIdState(savedPersonId);
        await onDataLoadedRef.current(session.id, savedPersonId || "");
      } else {
        config.setShowNewSession(true);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      config.setShowNewSession(true);
    } finally {
      config.setLoading(false);
    }
  };

  const createNewSession = async (name: string) => {
    if (!name.trim()) return;
    try {
      config.setLoading(true);
      const { data: session, error } = await supabase
        .from('movie_sessions')
        .insert([{ name: name.trim() }])
        .select()
        .single();
      if (error) throw error;
      config.setSessionId(session.id);
      config.onSessionLoad?.(session.id);
      config.setShowNewSession(false);
      const url = new URL(window.location.href);
      url.searchParams.set('session', session.id);
      window.history.replaceState({}, '', url);
      await onDataLoadedRef.current(session.id, "");
    } catch (err) {
      console.error('Error creating session:', err);
      config.toast({ title: "Error", description: "Failed to create session. Please try again.", variant: "destructive" });
    } finally {
      config.setLoading(false);
    }
  };

  return { createNewSession };
};
