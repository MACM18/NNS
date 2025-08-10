import { PublicLayout } from "@/components/layout/public-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function WhyUsLoading() {
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
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="grid gap-6 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-5 w-2/3" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="grid gap-6 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-5 w-2/3" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
