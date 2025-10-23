import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
  title: 'Widgets | imob.ro - Add Real Estate Intelligence to Your Website',
  description: 'Embed price estimation and heatmap widgets on your website. Free, customizable, and easy to integrate.',
};

export default function WidgetsPage() {
  return (
    <div className="container mx-auto py-12 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Add Real Estate Intelligence to Your Website
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Embed our interactive widgets to provide instant property valuations and price heatmaps. 
          Zero setup, fully customizable, and free to use.
        </p>
      </div>

      {/* Widget Showcase */}
      <Tabs defaultValue="avm" className="mb-16">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="avm">Price Estimator</TabsTrigger>
          <TabsTrigger value="heatmap">Price Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="avm" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Price Estimator Widget</CardTitle>
              <CardDescription>
                Let visitors estimate property values instantly with our AVM calculator
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Preview */}
              <div className="bg-muted rounded-lg p-8 mb-6">
                <iframe
                  src="/widgets/avm.html"
                  className="w-full h-[600px] border-0 rounded-lg"
                  title="AVM Widget Preview"
                />
              </div>

              {/* Embed Code */}
              <div>
                <h3 className="font-semibold mb-2">Embed Code</h3>
                <div className="relative">
                  <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`<iframe
  src="https://imob.ro/widgets/avm.html"
  width="400"
  height="600"
  frameborder="0"
  title="Price Estimator"
></iframe>`}
                  </pre>
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `<iframe src="https://imob.ro/widgets/avm.html" width="400" height="600" frameborder="0" title="Price Estimator"></iframe>`
                      );
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {/* Customization Options */}
              <div className="mt-6">
                <h3 className="font-semibold mb-4">Customization Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Dark Theme</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-sm">?theme=dark</code>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Custom Color</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-sm">?color=%23ff6b6b</code>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Example with dark theme:{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      https://imob.ro/widgets/avm.html?theme=dark
                    </code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Price Heatmap Widget</CardTitle>
              <CardDescription>
                Show property price variations across Bucharest with an interactive heatmap
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Preview */}
              <div className="bg-muted rounded-lg p-8 mb-6">
                <iframe
                  src="/widgets/heatmap.html"
                  className="w-full h-[600px] border-0 rounded-lg"
                  title="Heatmap Widget Preview"
                />
              </div>

              {/* Embed Code */}
              <div>
                <h3 className="font-semibold mb-2">Embed Code</h3>
                <div className="relative">
                  <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`<iframe
  src="https://imob.ro/widgets/heatmap.html"
  width="800"
  height="700"
  frameborder="0"
  title="Price Heatmap"
></iframe>`}
                  </pre>
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `<iframe src="https://imob.ro/widgets/heatmap.html" width="800" height="700" frameborder="0" title="Price Heatmap"></iframe>`
                      );
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {/* Customization */}
              <div className="mt-6">
                <h3 className="font-semibold mb-4">Customization Options</h3>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dark Theme</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-sm">?theme=dark</code>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Zero Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Just copy and paste the embed code. No registration, no API keys required for basic usage.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              Customizable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Theme options and color customization to match your brand. Fully responsive design.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Real-Time Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Powered by our AVM engine with daily updated price data across Bucharest.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Access CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle>Need More Control?</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Get API access for custom integrations and higher rate limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="secondary" asChild>
              <a href="/admin/api-keys">Get API Key</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/docs/api">View API Docs</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
