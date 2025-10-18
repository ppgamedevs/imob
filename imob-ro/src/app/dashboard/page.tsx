import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Hero from "@/components/ui/hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Authenticated view
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Hero
        title={<>Dashboard</>}
        subtitle="Gestionează-ți anunțurile și vezi performanța"
        image={"/images/hero-dashboard.jpg"}
        cta={<Button>Adaugă anunț</Button>}
      />

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
