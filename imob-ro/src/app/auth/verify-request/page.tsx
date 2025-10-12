import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyRequestPage() {
  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verifică-ți email-ul</CardTitle>
          <CardDescription>
            Am trimis un link magic de autentificare pe adresa ta de email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Verifică inbox-ul (și spam-ul) și dă click pe link pentru a te autentifica.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            💡 <strong>Dev mode:</strong> link-ul apare în consola serverului
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
