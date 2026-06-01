// Skeleton saat memuat daftar teks sebuah unit.
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 h-8 w-28 animate-pulse rounded-md bg-muted" />
      <div className="mb-8 h-9 w-1/2 animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
