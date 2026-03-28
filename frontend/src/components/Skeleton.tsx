export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-border-light animate-pulse rounded-2xl ${className}`}
    />
  )
}
