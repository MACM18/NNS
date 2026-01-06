import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NNS Telecom Management System",
    short_name: "NNS Telecom",
    description:
      "AI-powered telecom management platform for fiber optic installations, inventory, and operations. Manage tasks, track inventory, generate invoices, and monitor work assignments.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0f172a",
    theme_color: "#2563eb",
    lang: "en",
    dir: "ltr",
    orientation: "any",
    categories: ["productivity", "business", "utilities"],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "View main dashboard",
        url: "/dashboard",
        icons: [{ src: "/placeholder-logo.png", sizes: "192x192" }],
      },
      {
        name: "Tasks",
        short_name: "Tasks",
        description: "Manage tasks",
        url: "/dashboard/tasks",
        icons: [{ src: "/placeholder-logo.png", sizes: "192x192" }],
      },
      {
        name: "Inventory",
        short_name: "Inventory",
        description: "Check inventory",
        url: "/dashboard/inventory",
        icons: [{ src: "/placeholder-logo.png", sizes: "192x192" }],
      },
      {
        name: "Lines",
        short_name: "Lines",
        description: "View line installations",
        url: "/dashboard/lines",
        icons: [{ src: "/placeholder-logo.png", sizes: "192x192" }],
      },
    ],
    icons: [
      {
        src: "/placeholder-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/placeholder-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/placeholder-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/placeholder-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    related_applications: [],
    prefer_related_applications: false,
  };
}
