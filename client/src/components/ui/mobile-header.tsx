import { ArrowLeft } from "lucide-react";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function MobileHeader({ title, subtitle, onBack, rightElement }: MobileHeaderProps) {
  return (
    <header className="bg-brand-bianco border-b border-brand-nero/20 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button onClick={onBack} className="text-brand-nero">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-brand-nero">{title}</h1>
            {subtitle && <p className="text-sm text-brand-nero/70">{subtitle}</p>}
          </div>
        </div>
        {rightElement}
      </div>
    </header>
  );
}
