import { PublicLayout } from "@/components/layout/public-layout"
import { Skeleton } from "@/components/ui/skeleton"

export default function AboutUsLoading() {
  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <Skeleton className="h-10 w-[400px] mx-auto" />
              <Skeleton className="h-6 w-[800px] mx-auto mt-2" />
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center space-y-4">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-8 w-[200px] mt-4" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="grid gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[100px] w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
