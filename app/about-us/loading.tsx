import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function AboutUsLoading() {
  return (
    <PublicLayout>
      <main className="container mx-auto py-12 px-4 md:px-6">
        <section className="text-center mb-12">
          <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </section>

        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <Skeleton className="h-9 w-2/3 mb-4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-9 w-2/3 mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="relative h-96 w-full rounded-lg overflow-hidden shadow-lg">
            <Skeleton className="h-full w-full" />
          </div>
        </div>

        <section className="mt-16">
          <Skeleton className="h-9 w-2/3 mx-auto mb-12" />
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="p-6 text-center">
                <CardHeader>
                  <CardTitle>
                    <Skeleton className="h-6 w-3/4 mx-auto" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
