/**
 * Loading skeleton for Area pages
 */

export default function AreaLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero section skeleton */}
      <div className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-8">
          <div className="h-8 bg-surface-2 rounded w-48 mb-2" />
          <div className="h-4 bg-surface-2 rounded w-32" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* KPI Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4">
              <div className="h-3 bg-surface-2 rounded w-20 mb-2" />
              <div className="h-6 bg-surface-2 rounded w-24" />
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="h-5 bg-surface-2 rounded w-32 mb-4" />
            <div className="h-64 bg-surface-2 rounded" />
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="h-5 bg-surface-2 rounded w-32 mb-4" />
            <div className="h-64 bg-surface-2 rounded" />
          </div>
        </div>

        {/* Listings skeleton */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="h-5 bg-surface-2 rounded w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="aspect-video bg-surface-2 rounded mb-2" />
                <div className="h-4 bg-surface-2 rounded w-3/4 mb-2" />
                <div className="h-4 bg-surface-2 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
