import { PublicLayout } from "@/components/layout/public-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function ContactLoading() {
  return (
    <PublicLayout>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-2/3 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0 mt-1" />
                    <div className="flex flex-col gap-2 w-full">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-6 w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
              <Card className="p-6">
                <Skeleton className="h-8 w-2/3 mb-4" />
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="grid gap-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-[120px] w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
