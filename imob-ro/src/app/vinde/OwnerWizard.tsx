"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { calcOwnerLead, createOwnerLead } from "./actions";

const AREA_SLUGS = [
  { value: "centru-vechi", label: "Centru Vechi" },
  { value: "unirii", label: "Unirii" },
  { value: "romana", label: "Romană" },
  { value: "universitate", label: "Universitate" },
  { value: "victoriei", label: "Victoriei" },
  { value: "floreasca", label: "Floreasca" },
  { value: "pipera", label: "Pipera" },
  { value: "baneasa", label: "Băneasa" },
  { value: "titan", label: "Titan" },
  { value: "militari", label: "Militari" },
  { value: "drumul-taberei", label: "Drumul Taberei" },
  { value: "berceni", label: "Berceni" },
  { value: "pantelimon", label: "Pantelimon" },
  { value: "colentina", label: "Colentina" },
  { value: "vitan", label: "Vitan" },
];

export default function OwnerWizard({ initialArea }: { initialArea?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [areaSlug, setAreaSlug] = useState(initialArea ?? "");
  const [addressHint, setAddressHint] = useState("");
  const [rooms, setRooms] = useState(2);
  const [areaM2, setAreaM2] = useState(50);
  const [yearBuilt, setYearBuilt] = useState(2000);
  const [conditionScore, setConditionScore] = useState(0.6);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("areaSlug", areaSlug);
      formData.set("addressHint", addressHint);
      formData.set("rooms", rooms.toString());
      formData.set("areaM2", areaM2.toString());
      formData.set("yearBuilt", yearBuilt.toString());
      formData.set("conditionScore", conditionScore.toString());
      formData.set("email", email);
      formData.set("phone", phone);
      formData.set("notes", notes);

      const result = await createOwnerLead(formData);
      if (result.ok && result.id) {
        // Calculate AVM/TTS/Rent
        await calcOwnerLead(result.id);
        // Redirect to owner report
        router.push(`/owner/${result.id}`);
      }
    } catch (error) {
      console.error("Failed to submit:", error);
      alert("A apărut o eroare. Vă rugăm încercați din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 mx-1 rounded ${s <= step ? "bg-primary" : "bg-gray-200"}`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Pasul {step} din 3
        </p>
      </div>

      {/* Step 1: Location */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Locație</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="areaSlug">Zona</Label>
              <Select value={areaSlug} onValueChange={setAreaSlug}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează zona" />
                </SelectTrigger>
                <SelectContent>
                  {AREA_SLUGS.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="addressHint">Adresă (opțional)</Label>
              <Input
                id="addressHint"
                placeholder="ex: Str.Example nr. 10"
                value={addressHint}
                onChange={(e) => setAddressHint(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nu publicăm adresa exactă
              </p>
            </div>

            <Button onClick={() => setStep(2)} className="w-full">
              Continuă
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalii proprietate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Camere: {rooms}</Label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={rooms}
                onChange={(e) => setRooms(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>4+</span>
              </div>
            </div>

            <div>
              <Label htmlFor="areaM2">Suprafață (m²)</Label>
              <Input
                id="areaM2"
                type="number"
                min="20"
                max="300"
                value={areaM2}
                onChange={(e) => setAreaM2(Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="yearBuilt">An construcție</Label>
              <Input
                id="yearBuilt"
                type="number"
                min="1950"
                max={new Date().getFullYear()}
                value={yearBuilt}
                onChange={(e) => setYearBuilt(Number(e.target.value))}
              />
            </div>

            <div>
              <Label>Stare</Label>
              <Select
                value={conditionScore.toString()}
                onValueChange={(v) => setConditionScore(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.3">Necesită renovare</SelectItem>
                  <SelectItem value="0.6">Stare decentă</SelectItem>
                  <SelectItem value="0.85">Modern / Renovat recent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Înapoi
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continuă
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Contact */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Contact (opțional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="notes">Observații (opțional)</Label>
              <Textarea
                id="notes"
                placeholder="ex: Am făcut renovare acum 2 ani..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Datele tale sunt protejate. Le folosim doar pentru a-ți oferi evaluarea.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Înapoi
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Se calculează..." : "Calculează preț recomandat"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
