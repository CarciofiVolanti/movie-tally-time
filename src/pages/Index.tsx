import { MovieSelector } from "@/components/MovieSelector";
import { WatchedMovies } from "@/components/WatchedMovies";
import { useState, useEffect } from "react";

const Index = () => {
  const [currentView, setCurrentView] = useState<'session' | 'watched'>('session');
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFromUrl = urlParams.get('session');
    if (sessionFromUrl) {
      setSessionId(sessionFromUrl);
    }
  }, []);

  if (currentView === 'watched' && sessionId) {
    return (
      <WatchedMovies 
        sessionId={sessionId} 
        onBack={() => setCurrentView('session')} 
      />
    );
  }

  return (
    <MovieSelector 
      onNavigateToWatched={() => setCurrentView('watched')}
      onSessionLoad={(id) => setSessionId(id)}
    />
  );
};

export default Index;
