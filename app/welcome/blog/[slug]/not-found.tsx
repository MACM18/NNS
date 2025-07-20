import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-2xl px-6 lg:px-8 text-center">
        <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
          Blog Post Not Found
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Sorry, we couldn't find the blog post you're looking for. 
          It may have been moved or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/welcome/blog" className="inline-flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/welcome">Go to Homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
