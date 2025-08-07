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
    <div className="bg-brand-azzurro rounded-xl border border-brand-azzurro overflow-hidden">
      <div className="w-full h-24 bg-gradient-to-br from-brand-bianco to-brand-bianco/90 flex items-center justify-center">
        <span className="text-brand-nero font-bold text-2xl">{sticker.number}</span>
      </div>
      
      <div className="p-3">
        <div className="text-sm font-medium text-brand-bianco mb-1">N. {sticker.number}</div>
        <div className="text-xs text-brand-bianco/90 mb-2">{sticker.name}</div>
        {sticker.team && (
          <div className="text-xs text-brand-bianco/80 mb-3">{sticker.team}</div>
        )}
        
        <div className="grid grid-cols-3 gap-1">
          <Button
            size="sm"
            variant={status === "yes" ? "default" : "outline"}
            className={`py-1 px-2 text-xs touch-manipulation ${
              status === "yes" 
                ? "bg-sticker-yes text-white" 
                : "bg-brand-bianco text-brand-nero/60"
            }`}
            onClick={() => onStatusChange(sticker.id, "yes")}
          >
            <Check className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={status === "no" ? "default" : "outline"}
            className={`py-1 px-2 text-xs touch-manipulation ${
              status === "no" 
                ? "bg-sticker-no text-white" 
                : "bg-brand-bianco text-brand-nero/60"
            }`}
            onClick={() => onStatusChange(sticker.id, "no")}
          >
            <X className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={status === "double" ? "default" : "outline"}
            className={`py-1 px-2 text-xs touch-manipulation ${
              status === "double" 
                ? "bg-sticker-double text-white" 
                : "bg-brand-bianco text-brand-nero/60"
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
