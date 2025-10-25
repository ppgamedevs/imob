"use client";

/**
 * ShareStrip - Share buttons for reports
 *
 * Features:
 * - Copy link with toast
 * - Native share API (mobile)
 * - Social media fallbacks (WhatsApp, X, Email)
 * - UTM tracking on shares
 * - Analytics events
 */

import { Link2, Mail, MessageCircle, Share2, Twitter } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShareStripProps {
  title: string;
  url: string;
  description?: string;
  utmSource?: string;
  className?: string;
}

export function ShareStrip({
  title,
  url,
  description,
  utmSource = "share",
  className,
}: ShareStripProps) {
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState("");

  // Build share URL with UTM
  const shareUrl = React.useMemo(() => {
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.set("utm_source", utmSource);
    urlObj.searchParams.set("utm_medium", "social");
    return urlObj.toString();
  }, [url, utmSource]);

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToastMessage("Link copiat! ✓");
      trackShare("copy");
    } catch (error) {
      showToastMessage("Eroare la copiere");
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title,
        text: description,
        url: shareUrl,
      });
      trackShare("native");
    } catch (error: any) {
      // User cancelled or error
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
  };

  const handleWhatsApp = () => {
    const text = `${title}\n\n${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    trackShare("whatsapp");
  };

  const handleTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer,width=550,height=420");
    trackShare("twitter");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${description || ""}\n\nVezi detalii: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    trackShare("email");
  };

  const trackShare = (channel: string) => {
    // Track share event
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share", {
        method: channel,
        content_type: "report",
        item_id: url,
      });
    }
    console.log("[Analytics] share_click", { channel, url });
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <div className="text-xs font-medium text-muted">Distribuie:</div>

        <div className="flex flex-wrap gap-2">
          {/* Copy Link - Always visible */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="flex-1 min-w-[100px]"
          >
            <Link2 className="h-4 w-4 mr-2" />
            Copiază
          </Button>

          {/* Native Share - Mobile only */}
          {hasNativeShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNativeShare}
              className="flex-1 min-w-[100px]"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Distribuie
            </Button>
          )}

          {/* WhatsApp */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsApp}
            className="flex-1 min-w-[100px] text-green-600 hover:text-green-700"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>

          {/* Twitter/X */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTwitter}
            className="flex-1 min-w-[100px]"
          >
            <Twitter className="h-4 w-4 mr-2" />X
          </Button>

          {/* Email */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmail}
            className="flex-1 min-w-[100px]"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 
                     bg-bg/95 backdrop-blur border border-border rounded-lg 
                     px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="text-sm font-medium">{toastMessage}</div>
        </div>
      )}
    </>
  );
}
