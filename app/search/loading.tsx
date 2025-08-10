import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Panel Skeleton */}
        <div className="lg:col-span-1">
          <Skeleton className="h-[500px] w-full" />
        </div>

        {/* Results Panel Skeleton */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" /> {/* Header card */}
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
