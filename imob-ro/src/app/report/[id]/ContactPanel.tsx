"use client";

/**
 * ContactPanel - Lead capture form with channel buttons
 *
 * Features:
 * - Multi-channel contact (tel, email, WhatsApp)
 * - Lead form with inline validation
 * - Anti-spam (honeypot, timing)
 * - GDPR consent
 * - Trust indicators
 */

import { AlertCircle, Check, Mail, MessageCircle, Phone, Send } from "lucide-react";
import * as React from "react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/ui/Surface";
import { Textarea } from "@/components/ui/textarea";
import { formatPhoneDisplay, getWhatsAppLink } from "@/lib/lead/guards";
import { cn } from "@/lib/utils";

import { createLeadAction, trackChannelClick } from "./lead.actions";

export interface ContactPanelProps {
  analysisId: string;
  seller?: {
    name?: string;
    avatar?: string;
    source?: string;
    verified?: boolean;
  };
  channels?: {
    phone?: string;
    email?: string;
    whatsapp?: string;
  };
  kpis?: {
    priceEur: number;
    areaM2: number;
    rooms: number;
  };
  className?: string;
}

const PRESET_MESSAGES = [
  "Sunt interesat de vizionare. Când aveți disponibil?",
  "Doresc detalii suplimentare despre proprietate.",
  "Sunt investitor și mă interesează potențialul de închiriere.",
];

export function ContactPanel({ analysisId, seller, channels, kpis, className }: ContactPanelProps) {
  const [state, formAction, isPending] = useActionState(createLeadAction, null);
  const [showForm, setShowForm] = React.useState(false);
  const [mountTime] = React.useState(() => Date.now());

  // Auto-expand form on mobile if no channels available
  React.useEffect(() => {
    if (!channels?.phone && !channels?.email && !channels?.whatsapp) {
      setShowForm(true);
    }
  }, [channels]);

  const handleChannelClick = (channel: "tel" | "email" | "whatsapp", url: string) => {
    trackChannelClick(analysisId, channel);
    window.open(url, "_blank", channel === "whatsapp" ? "noopener,noreferrer" : undefined);
  };

  return (
    <Surface elevation={0} className={cn("overflow-hidden", className)}>
      {/* Seller Identity */}
      {seller && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            {seller.avatar && <img src={seller.avatar} alt="" className="w-10 h-10 rounded-full" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {seller.name || "Proprietar"}
                {seller.verified && <span className="ml-2 text-xs text-success">✓ Verificat</span>}
              </div>
              {seller.source && <div className="text-xs text-muted truncate">{seller.source}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Mini KPI Recap */}
      {kpis && (
        <div className="px-4 py-3 border-b border-border bg-surface">
          <div className="flex items-center gap-4 text-xs">
            <span className="font-bold text-base">€{kpis.priceEur.toLocaleString("ro-RO")}</span>
            <span className="text-muted">{kpis.areaM2} m²</span>
            <span className="text-muted">{kpis.rooms} camere</span>
          </div>
        </div>
      )}

      {/* Channel Buttons */}
      {(channels?.phone || channels?.email || channels?.whatsapp) && (
        <div className="p-4 border-b border-border space-y-2">
          <div className="text-xs font-medium text-muted mb-3">Contactează direct:</div>
          <div className="flex flex-col gap-2">
            {channels.phone && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleChannelClick("tel", `tel:${channels.phone}`)}
              >
                <Phone className="h-4 w-4 mr-2" />
                {formatPhoneDisplay(channels.phone)}
              </Button>
            )}

            {channels.whatsapp && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-green-600 hover:text-green-700"
                onClick={() =>
                  handleChannelClick(
                    "whatsapp",
                    getWhatsAppLink(
                      channels.whatsapp!,
                      `Bună! Sunt interesat de proprietatea ${analysisId}`,
                    ),
                  )
                }
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}

            {channels.email && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleChannelClick("email", `mailto:${channels.email}`)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Lead Form Toggle */}
      <div className="p-4">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="w-full" variant="default">
            <Send className="h-4 w-4 mr-2" />
            Trimite Mesaj
          </Button>
        ) : (
          <LeadForm
            analysisId={analysisId}
            mountTime={mountTime}
            state={state}
            formAction={formAction}
            isPending={isPending}
            onCancel={
              channels?.phone || channels?.email || channels?.whatsapp
                ? () => setShowForm(false)
                : undefined
            }
          />
        )}
      </div>

      {/* Trust Copy */}
      <div className="px-4 pb-4 text-xs text-muted text-center">
        Trimitem mesajul tău direct proprietarului. Fără spam.
      </div>
    </Surface>
  );
}

/** Lead Form Component */
interface LeadFormProps {
  analysisId: string;
  mountTime: number;
  state: any;
  formAction: any;
  isPending: boolean;
  onCancel?: () => void;
}

function LeadForm({
  analysisId,
  mountTime,
  state,
  formAction,
  isPending,
  onCancel,
}: LeadFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [selectedPreset, setSelectedPreset] = React.useState<string>("");

  // Reset form on success
  React.useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state?.ok]);

  const handlePresetClick = (message: string) => {
    setSelectedPreset(message);
    const textarea = formRef.current?.querySelector("textarea");
    if (textarea) {
      textarea.value = message;
      textarea.focus();
    }
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {/* Hidden Fields */}
      <input type="hidden" name="analysisId" value={analysisId} />
      <input type="hidden" name="_timestamp" value={mountTime} />
      <input
        type="text"
        name="hp"
        tabIndex={-1}
        autoComplete="off"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
        }}
        aria-hidden="true"
      />

      {/* Success Message */}
      {state?.ok && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success flex items-start gap-2">
          <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">{state.message}</div>
            <div className="text-xs mt-1 opacity-80">Cod referință: {state.leadId}</div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {state?.blocked && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>{state.message || "Cererea nu a putut fi procesată"}</div>
        </div>
      )}

      {state?.rateLimited && (
        <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>{state.message}</div>
        </div>
      )}

      {!state?.ok && (
        <>
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">
              Nume <span className="text-muted">(opțional)</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Ion Popescu"
              disabled={isPending}
              className={cn(state?.errors?.name && "border-danger")}
            />
            {state?.errors?.name && <p className="text-xs text-danger">{state.errors.name[0]}</p>}
          </div>

          {/* Contact Field */}
          <div className="space-y-1.5">
            <Label htmlFor="contact" className="text-sm">
              Telefon sau Email <span className="text-danger">*</span>
            </Label>
            <Input
              id="contact"
              name="contact"
              type="text"
              placeholder="+40712345678 sau email@example.com"
              required
              disabled={isPending}
              className={cn(state?.errors?.contact && "border-danger")}
            />
            {state?.errors?.contact && (
              <p className="text-xs text-danger">{state.errors.contact[0]}</p>
            )}
          </div>

          {/* Preset Messages */}
          <div className="space-y-2">
            <Label className="text-xs text-muted">Mesaje rapide:</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_MESSAGES.map((msg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetClick(msg)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md border transition-colors",
                    selectedPreset === msg
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted hover:bg-muted/70 border-border",
                  )}
                  disabled={isPending}
                >
                  {msg.slice(0, 30)}...
                </button>
              ))}
            </div>
          </div>

          {/* Message Field */}
          <div className="space-y-1.5">
            <Label htmlFor="message" className="text-sm">
              Mesaj <span className="text-danger">*</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Sunt interesat de vizionare..."
              required
              rows={4}
              disabled={isPending}
              className={cn("resize-none", state?.errors?.message && "border-danger")}
            />
            {state?.errors?.message && (
              <p className="text-xs text-danger">{state.errors.message[0]}</p>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="consent"
                name="consent"
                value="true"
                required
                disabled={isPending}
                className="mt-1 focus-ring rounded"
              />
              <Label
                htmlFor="consent"
                className="text-xs text-muted leading-relaxed cursor-pointer"
              >
                Sunt de acord cu{" "}
                <a href="/termeni" className="underline hover:text-text" target="_blank">
                  Termenii și Condițiile
                </a>{" "}
                și{" "}
                <a href="/confidentialitate" className="underline hover:text-text" target="_blank">
                  Politica de Confidențialitate
                </a>
                . <span className="text-danger">*</span>
              </Label>
            </div>
            {state?.errors?.consent && (
              <p className="text-xs text-danger">{state.errors.consent[0]}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isPending}
                className="flex-1"
              >
                Anulează
              </Button>
            )}
            <Button type="submit" size="sm" disabled={isPending} className="flex-1">
              {isPending ? (
                "Se trimite..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Trimite
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
