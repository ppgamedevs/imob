import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getApiKeys, createApiKey, revokeApiKey } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default async function ApiKeysPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/signin');
  }

  const keys = await getApiKeys();

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-muted-foreground">
          Manage your API keys for widget embeds and public API access
        </p>
      </div>

      {/* Create New Key Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New API Key</CardTitle>
          <CardDescription>
            Generate a new API key for widget embeds or third-party integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createApiKey} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Widget for mysite.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="domain">Domain Restriction (Optional)</Label>
                <Input
                  id="domain"
                  name="domain"
                  placeholder="e.g., mysite.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="rateLimit">Rate Limit (requests/day)</Label>
                <Input
                  id="rateLimit"
                  name="rateLimit"
                  type="number"
                  defaultValue="1000"
                  min="100"
                  max="100000"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  name="expiresAt"
                  type="date"
                  className="mt-1"
                />
              </div>
            </div>

            <Button type="submit" className="w-full md:w-auto">
              Generate API Key
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Keys */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your API Keys</h2>
        
        {keys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No API keys yet. Create one above to get started.
            </CardContent>
          </Card>
        ) : (
          keys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {key.name || 'Unnamed Key'}
                    </CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">
                      {key.key.substring(0, 16)}...{key.key.substring(key.key.length - 8)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={key.isActive ? 'default' : 'secondary'}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </Badge>
                    {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                      <Badge variant="destructive">Expired</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Domain</p>
                    <p className="font-medium">{key.domain || 'Any'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rate Limit</p>
                    <p className="font-medium">{key.rateLimit.toLocaleString()}/day</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="font-medium">{key._count.usage.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Used</p>
                    <p className="font-medium">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(key.key);
                    }}
                  >
                    Copy Key
                  </Button>
                  {key.isActive && (
                    <form action={revokeApiKey.bind(null, key.id)}>
                      <Button variant="destructive" size="sm" type="submit">
                        Revoke
                      </Button>
                    </form>
                  )}
                </div>

                {key.expiresAt && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Expires: {new Date(key.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
