function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-container-high rounded-lg ${className}`} />
}

/** Single text-line placeholder */
export function SkeletonLine({ className = '' }: { className?: string }) {
  return <Bone className={`h-3 ${className}`} />
}

/** Rectangular block — use for cards, images, avatars */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <Bone className={className} />
}

/** A card-shaped skeleton: title + 2-3 lines */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-container-lowest rounded-2xl p-6 shadow-card space-y-3 ${className}`}>
      <Bone className="h-4 w-1/3" />
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-5/6" />
    </div>
  )
}

/** A table row skeleton: n cells */
export function SkeletonRow({ cols = 4, className = '' }: { cols?: number; className?: string }) {
  return (
    <tr className={className}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Bone className={`h-3 ${i === 0 ? 'w-24' : i === cols - 1 ? 'w-16' : 'w-full'}`} />
        </td>
      ))}
    </tr>
  )
}

/** Stack of n SkeletonCards */
export function SkeletonCards({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className={className} />
      ))}
    </>
  )
}
