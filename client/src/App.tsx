import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Album from "@/pages/album";
import Match from "@/pages/match";
import Chat from "@/pages/chat";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  useEffect(() => {
    if (isLoading) return;
    
    if (!user && location !== "/login") {
      setLocation("/login");
    } else if (user && location === "/login") {
      setLocation("/");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-brand-azzurro border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-nero/60">Caricamento...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Don't show bottom nav on login or admin pages
  const showBottomNav = location !== "/login" && !location.startsWith("/admin") && isMobile;

  return (
    <div className="relative">
      {children}
      {showBottomNav && <BottomNavigation onNavigate={setLocation} />}
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  // Admin panel only accessible on desktop
  if (location.startsWith("/admin") && isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Desktop Required</h2>
          <p className="text-gray-600">Il pannello admin è accessibile solo da desktop.</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/admin" component={Admin} />
        
        {/* Protected routes */}
        <Route path="/">
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        </Route>
        <Route path="/album">
          <AuthGuard>
            <Album />
          </AuthGuard>
        </Route>
        <Route path="/match">
          <AuthGuard>
            <Match />
          </AuthGuard>
        </Route>
        <Route path="/chat/:matchId">
          <AuthGuard>
            <Chat />
          </AuthGuard>
        </Route>
        <Route path="/profile">
          <AuthGuard>
            <Profile />
          </AuthGuard>
        </Route>
        
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
