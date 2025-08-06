import { Check, X, Copy } from "lucide-react";
import { Button } from "./button";

interface StickerCardProps {
  sticker: {
    id: string;
    number: string;
    name: string;
    team?: string;
  };
  status?: "yes" | "no" | "double";
  onStatusChange: (stickerId: string, status: "yes" | "no" | "double") => void;
}

export function StickerCard({ sticker, status, onStatusChange }: StickerCardProps) {
  return (
    <div className="bg-brand-bianco rounded-xl border border-brand-azzurro/20 overflow-hidden">
      <div className="w-full h-24 bg-gradient-to-br from-brand-azzurro to-brand-azzurro/80 flex items-center justify-center">
        <span className="text-brand-bianco font-bold text-2xl">{sticker.number}</span>
      </div>
      
      <div className="p-3">
        <div className="text-sm font-medium text-brand-nero mb-1">N. {sticker.number}</div>
        <div className="text-xs text-brand-nero/80 mb-2">{sticker.name}</div>
        {sticker.team && (
          <div className="text-xs text-brand-nero/60 mb-3">{sticker.team}</div>
        )}
        
        <div className="grid grid-cols-3 gap-1">
          <Button
            size="sm"
            variant={status === "yes" ? "default" : "outline"}
            className={`py-1 px-2 text-xs ${
              status === "yes" 
                ? "bg-sticker-yes hover:bg-sticker-yes/90 text-white" 
                : "bg-brand-bianco text-brand-nero/60 hover:bg-brand-azzurro/10"
            }`}
            onClick={() => onStatusChange(sticker.id, "yes")}
          >
            <Check className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={status === "no" ? "default" : "outline"}
            className={`py-1 px-2 text-xs ${
              status === "no" 
                ? "bg-sticker-no hover:bg-sticker-no/90 text-white" 
                : "bg-brand-bianco text-brand-nero/60 hover:bg-brand-azzurro/10"
            }`}
            onClick={() => onStatusChange(sticker.id, "no")}
          >
            <X className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={status === "double" ? "default" : "outline"}
            className={`py-1 px-2 text-xs ${
              status === "double" 
                ? "bg-sticker-double hover:bg-sticker-double/90 text-white" 
                : "bg-brand-bianco text-brand-nero/60 hover:bg-brand-azzurro/10"
            }`}
            onClick={() => onStatusChange(sticker.id, "double")}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
