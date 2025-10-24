import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-3xl">Pagina nu a fost găsită</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Ne pare rău, dar pagina pe care o cauți nu există sau a fost mutată.
          </p>

          <div className="space-y-3">
            <p className="text-sm font-medium">Încearcă una dintre aceste opțiuni:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Verifică dacă URL-ul este scris corect</li>
              <li>• Mergi la pagina principală și caută informațiile dorite</li>
              <li>• Folosește căutarea pentru a găsi proprietăți</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center pt-4">
            <Button asChild>
              <Link href="/">Acasă</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/discover">Caută proprietăți</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
