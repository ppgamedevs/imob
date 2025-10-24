import * as React from "react";
import { Heart, Share2, Mail, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * StickyActions - Save, Compare, Share, Contact
 * 
 * Layout:
 * - Mobile: Fixed bottom bar with 4 buttons
 * - Desktop: Part of right column sticky sidebar
 */

export interface StickyActionsProps {
  propertyId: string;
  propertyTitle: string;
  isSaved?: boolean;
  isInCompare?: boolean;
  onSaveToggle?: () => void;
  onCompareToggle?: () => void;
  onShare?: () => void;
  onContact?: () => void;
  className?: string;
}

export default function StickyActions({
  propertyId,
  propertyTitle,
  isSaved = false,
  isInCompare = false,
  onSaveToggle,
  onCompareToggle,
  onShare,
  onContact,
  className,
}: StickyActionsProps) {
  const [showToast, setShowToast] = React.useState<string | null>(null);

  // Default handlers
  const handleSave = () => {
    if (onSaveToggle) {
      onSaveToggle();
    } else {
      // Default: localStorage toggle
      const saved = JSON.parse(localStorage.getItem("saved:set") || "[]");
      const newSaved = isSaved
        ? saved.filter((id: string) => id !== propertyId)
        : [...saved, propertyId];
      localStorage.setItem("saved:set", JSON.stringify(newSaved));
      
      setShowToast(isSaved ? "Eliminat din favorite" : "Adăugat la favorite");
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const handleCompare = () => {
    if (onCompareToggle) {
      onCompareToggle();
    } else {
      // Default: localStorage toggle
      const compareSet = JSON.parse(localStorage.getItem("compare:set") || "[]");
      if (isInCompare) {
        const newSet = compareSet.filter((id: string) => id !== propertyId);
        localStorage.setItem("compare:set", JSON.stringify(newSet));
        setShowToast("Eliminat din comparație");
      } else {
        if (compareSet.length >= 4) {
          setShowToast("Maxim 4 proprietăți în comparație");
        } else {
          localStorage.setItem("compare:set", JSON.stringify([...compareSet, propertyId]));
          setShowToast("Adăugat în comparație");
        }
      }
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    // Default: Native share or copy URL
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: propertyTitle,
          text: `Verifică această proprietate: ${propertyTitle}`,
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        setShowToast("Link copiat în clipboard");
        setTimeout(() => setShowToast(null), 3000);
      } catch (err) {
        setShowToast("Eroare la copiere link");
        setTimeout(() => setShowToast(null), 3000);
      }
    }
  };

  const handleContact = () => {
    if (onContact) {
      onContact();
    } else {
      // Default: scroll to contact section or open email
      setShowToast("Funcție Contact în dezvoltare");
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  return (
    <>
      {/* Desktop: Vertical button stack */}
      <div
        className={cn(
          "hidden lg:flex flex-col gap-2",
          className
        )}
      >
        <Button
          variant={isSaved ? "default" : "outline"}
          className="w-full justify-start"
          onClick={handleSave}
        >
          <Heart className={cn("h-4 w-4 mr-2", isSaved && "fill-current")} />
          {isSaved ? "Salvat" : "Salvează"}
        </Button>

        <Button
          variant={isInCompare ? "default" : "outline"}
          className="w-full justify-start"
          onClick={handleCompare}
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Compară
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Distribuie
        </Button>

        <Button
          variant="default"
          className="w-full justify-start"
          onClick={handleContact}
        >
          <Mail className="h-4 w-4 mr-2" />
          Contact
        </Button>
      </div>

      {/* Mobile: Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface border-t border-border shadow-elev2 safe-bottom">
        <div className="grid grid-cols-4 gap-1 p-2">
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors focus-ring text-xs",
              isSaved
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted active:bg-muted"
            )}
          >
            <Heart className={cn("h-5 w-5", isSaved && "fill-current")} />
            <span className="text-[10px]">{isSaved ? "Salvat" : "Salvează"}</span>
          </button>

          <button
            type="button"
            onClick={handleCompare}
            className={cn(
              "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors focus-ring text-xs",
              isInCompare
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted active:bg-muted"
            )}
          >
            <ArrowLeftRight className="h-5 w-5" />
            <span className="text-[10px]">Compară</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors hover:bg-muted active:bg-muted focus-ring text-xs"
          >
            <Share2 className="h-5 w-5" />
            <span className="text-[10px]">Distribuie</span>
          </button>

          <button
            type="button"
            onClick={handleContact}
            className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-ring text-xs"
          >
            <Mail className="h-5 w-5" />
            <span className="text-[10px]">Contact</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-bg border border-border rounded-lg shadow-elev2 text-sm animate-in fade-in slide-in-from-bottom-2">
          {showToast}
        </div>
      )}
    </>
  );
}
