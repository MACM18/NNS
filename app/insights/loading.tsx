import { PublicLayout } from "@/components/layout/public-layout"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { BookOpen } from "lucide-react"

export default function Loading() {
  return (
    <PublicLayout>
      <section className="py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="h-10 bg-gray-200 rounded w-3/4 mx-auto mb-4 dark:bg-gray-700"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto dark:bg-gray-700"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center dark:bg-gray-700">
                  <BookOpen className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                </div>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 dark:bg-gray-700"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 dark:bg-gray-700"></div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 dark:bg-gray-700"></div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <div className="h-8 bg-gray-200 rounded w-1/4 dark:bg-gray-700"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
