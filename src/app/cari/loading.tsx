// Skeleton saat memuat hasil pencarian.
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 h-9 w-40 animate-pulse rounded-md bg-muted" />
      <div className="mb-6 h-10 w-full animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
