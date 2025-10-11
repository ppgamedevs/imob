/**
 * Copilot: Create a protected Dashboard shell:
 * - If not authenticated, show a Card with sign-in CTA (link to /api/auth/signin)
 * - If authenticated: tabs "Anunțurile mele", "Creează anunț", "Setări"
 * - In "Anunțurile mele" show an empty state (Button 'Adaugă anunț')
 */
"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  // For now, we'll show a simple auth CTA
  // In Day 2, we'll integrate NextAuth
  const isAuthenticated = false;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-200px)] max-w-7xl items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Bine ai venit!</CardTitle>
            <CardDescription>
              Conectează-te pentru a vedea și gestiona anunțurile tale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" size="lg" asChild>
              <a href="/api/auth/signin">Conectează-te</a>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Nu ai cont? Înregistrarea este gratuită și rapidă.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated view
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Gestionează-ți anunțurile și setările</p>
      </div>

      <Tabs defaultValue="listings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="listings">Anunțurile mele</TabsTrigger>
          <TabsTrigger value="create">Creează anunț</TabsTrigger>
          <TabsTrigger value="settings">Setări</TabsTrigger>
        </TabsList>

        {/* My Listings Tab */}
        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>Anunțurile mele</CardTitle>
              <CardDescription>Vezi și gestionează toate anunțurile tale</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Nu ai anunțuri încă</h3>
                <p className="mb-6 text-muted-foreground">
                  Adaugă primul tău anunț pentru a începe să vinzi sau închiriezi.
                </p>
                <Button size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Adaugă anunț
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Listing Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Creează anunț nou</CardTitle>
              <CardDescription>Completează detaliile proprietății tale</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcționalitatea de creare anunț va fi implementată în curând...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Setări cont</CardTitle>
              <CardDescription>Gestionează preferințele și informațiile tale</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Setările contului vor fi disponibile în curând...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
