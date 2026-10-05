import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-accent/5" />
      <section className="relative px-4 pb-10 pt-20 text-center md:pt-24">
        <Badge variant="outline" className="mb-6 rounded-full border-primary/20 bg-primary/5 px-4 py-2 text-primary">Site policies</Badge>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">{intro}</p>
        <p className="mt-3 text-xs text-muted-foreground">Last updated 27 September 2026</p>
      </section>
      <div className="container relative z-10 mx-auto max-w-4xl px-4 pb-24">
        <div className="glass-card rounded-3xl p-7 md:p-12">
          <div className="prose max-w-none space-y-6 text-foreground dark:prose-invert prose-a:text-primary prose-a:underline-offset-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
