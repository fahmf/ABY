// Skeleton saat memuat daftar unit sebuah jilid.
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 h-8 w-28 animate-pulse rounded-md bg-muted" />
      <div className="mb-8 h-9 w-1/2 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
