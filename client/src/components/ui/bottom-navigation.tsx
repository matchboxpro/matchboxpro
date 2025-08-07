import { Home, Zap, Image, User } from "lucide-react";
import { useLocation } from "wouter";

interface BottomNavigationProps {
  onNavigate: (path: string) => void;
}

export function BottomNavigation({ onNavigate }: BottomNavigationProps) {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-brand-azzurro border-t border-brand-azzurro max-w-md mx-auto">
      <div className="grid grid-cols-4 py-2">
        <button
          onClick={() => onNavigate("/")}
          className={`flex flex-col items-center py-2 ${
            isActive("/") ? "text-[#f8b400]" : "text-white"
          }`}
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-xs">Home</span>
        </button>
        <button
          onClick={() => onNavigate("/match")}
          className={`flex flex-col items-center py-2 ${
            isActive("/match") ? "text-[#f8b400]" : "text-white"
          }`}
        >
          <Zap className="w-5 h-5 mb-1" />
          <span className="text-xs">Match</span>
        </button>
        <button
          onClick={() => {
            // Se siamo già sulla pagina album, resetta la selezione
            if (window.location.pathname === "/album") {
              onNavigate("/album?reset=true");
            } else {
              onNavigate("/album");
            }
          }}
          className={`flex flex-col items-center py-2 ${
            isActive("/album") ? "text-[#f8b400]" : "text-white"
          }`}
        >
          <Image className="w-5 h-5 mb-1" />
          <span className="text-xs">Album</span>
        </button>
        <button
          onClick={() => onNavigate("/profile")}
          className={`flex flex-col items-center py-2 ${
            isActive("/profile") ? "text-[#f8b400]" : "text-white"
          }`}
        >
          <User className="w-5 h-5 mb-1" />
          <span className="text-xs">Profilo</span>
        </button>
      </div>
    </nav>
  );
}
