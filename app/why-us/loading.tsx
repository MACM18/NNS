import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function WhyUsLoading() {
  return (
    <PublicLayout>
      <main className="container mx-auto py-12 px-4 md:px-6">
        <section className="text-center mb-12">
          <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </section>

        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="flex flex-col items-center text-center p-6">
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-full mb-4" />
                <CardTitle>
                  <Skeleton className="h-6 w-3/4 mx-auto" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-[90%]" />
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-16 text-center">
          <Skeleton className="h-9 w-2/3 mx-auto mb-6" />
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="p-6">
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <Skeleton className="h-4 w-1/2 mt-4 mx-auto" />
            </Card>
            <Card className="p-6">
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <Skeleton className="h-4 w-1/2 mt-4 mx-auto" />
            </Card>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
