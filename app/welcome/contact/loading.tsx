import { PublicLayout } from "@/components/layout/public-layout"
import { Skeleton } from "@/components/ui/skeleton"

export default function ContactLoading() {
  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </div>

          <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div className="space-y-8">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <div className="grid gap-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
