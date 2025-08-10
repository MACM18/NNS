import { PublicLayout } from "@/components/layout/public-layout"
import { Skeleton } from "@/components/ui/skeleton"

export default function ContactLoading() {
  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <Skeleton className="h-10 w-[300px] mx-auto" />
              <Skeleton className="h-6 w-[600px] mx-auto mt-2" />
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col space-y-4">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-6 w-[400px]" />
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-[250px]" />
              <div className="grid gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-[120px] w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
