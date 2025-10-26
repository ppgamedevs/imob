/**
 * Loading skeleton for Report pages
 */

export default function ReportLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-6">
          <div className="h-7 bg-surface-2 rounded w-3/4 mb-2" />
          <div className="h-4 bg-surface-2 rounded w-1/2" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Photo skeleton */}
            <div className="aspect-video bg-surface-2 rounded-xl" />

            {/* AVM section */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="h-5 bg-surface-2 rounded w-32 mb-4" />
              <div className="h-10 bg-surface-2 rounded w-48 mb-2" />
              <div className="h-4 bg-surface-2 rounded w-64" />
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface p-3">
                  <div className="h-3 bg-surface-2 rounded w-16 mb-2" />
                  <div className="h-5 bg-surface-2 rounded w-20" />
                </div>
              ))}
            </div>

            {/* Scores section */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="h-5 bg-surface-2 rounded w-24 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-2 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-surface-2 rounded w-32 mb-1" />
                      <div className="h-3 bg-surface-2 rounded w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="h-5 bg-surface-2 rounded w-24 mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-surface-2 rounded w-full" />
                <div className="h-4 bg-surface-2 rounded w-5/6" />
                <div className="h-4 bg-surface-2 rounded w-4/6" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="h-5 bg-surface-2 rounded w-32 mb-3" />
              <div className="h-10 bg-surface-2 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
