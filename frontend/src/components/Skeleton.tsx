export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-border animate-pulse ${className}`} />
}
