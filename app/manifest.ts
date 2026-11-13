import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NNS Enterprise",
    short_name: "NNS",
    description:
      "NNS Enterprise operations, installation records, inventory, invoices, and reports.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#f2f9fd",
    theme_color: "#0ea5e9",
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
        icons: [{ src: "/nns-enterprise-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Inventory",
        short_name: "Inventory",
        description: "Check inventory",
        url: "/dashboard/inventory",
        icons: [{ src: "/nns-enterprise-icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Lines",
        short_name: "Lines",
        description: "View line installations",
        url: "/dashboard/lines",
        icons: [{ src: "/nns-enterprise-icon-192.png", sizes: "192x192" }],
      },
    ],
    icons: [
      {
        src: "/nns-enterprise-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/nns-enterprise-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/nns-enterprise-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/nns-enterprise-icon-512.png",
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
