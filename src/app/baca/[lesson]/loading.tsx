// Skeleton sederhana saat memuat sebuah teks.
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-4 h-8 w-24 animate-pulse rounded-md bg-muted" />
      <div className="mb-2 h-9 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="mb-8 h-4 w-1/2 animate-pulse rounded-md bg-muted" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-full animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
