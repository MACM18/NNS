import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function JobListingsLoading() {
  return (
    <PublicLayout>
      <main className="container mx-auto py-12 px-4 md:px-6">
        <section className="text-center mb-12">
          <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </section>

        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-3/4" />
                </CardTitle>
                <Skeleton className="h-4 w-1/2 mt-2" />
                <Skeleton className="h-4 w-1/3 mt-1" />
              </CardHeader>
              <CardContent className="flex-1">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-[90%] mb-2" />
                <Skeleton className="h-4 w-[80%]" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-28" />
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </section>
      </main>
    </PublicLayout>
  )
}
