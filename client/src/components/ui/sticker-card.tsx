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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="w-full h-24 bg-gradient-to-br from-brand-teal to-cyan-700 flex items-center justify-center">
        <span className="text-white font-bold text-2xl">{sticker.number}</span>
      </div>
      
      <div className="p-3">
        <div className="text-sm font-medium text-gray-900 mb-1">N. {sticker.number}</div>
        <div className="text-xs text-gray-600 mb-2">{sticker.name}</div>
        {sticker.team && (
          <div className="text-xs text-gray-500 mb-3">{sticker.team}</div>
        )}
        
        <div className="grid grid-cols-3 gap-1">
          <Button
            size="sm"
            variant={status === "yes" ? "default" : "outline"}
            className={`py-1 px-2 text-xs ${
              status === "yes" 
                ? "bg-sticker-yes hover:bg-sticker-yes/90 text-white" 
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
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
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
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
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
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
