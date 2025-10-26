/**
 * Loading skeleton for Discover page
 */

export default function DiscoverLoading() {
  return (
    <div className="container mx-auto px-4 py-6 animate-pulse">
      {/* Filters bar skeleton */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="h-10 w-32 bg-surface-2 rounded-lg" />
          <div className="h-10 w-32 bg-surface-2 rounded-lg" />
          <div className="h-10 w-32 bg-surface-2 rounded-lg" />
          <div className="h-10 w-32 bg-surface-2 rounded-lg" />
        </div>
      </div>

      {/* Results grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <div className="aspect-video bg-surface-2 rounded-lg mb-3" />
            <div className="h-4 bg-surface-2 rounded w-3/4 mb-2" />
            <div className="h-4 bg-surface-2 rounded w-1/2 mb-3" />
            <div className="flex gap-2">
              <div className="h-6 bg-surface-2 rounded w-16" />
              <div className="h-6 bg-surface-2 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
