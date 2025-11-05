"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Clock,
  Hash,
  Phone,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Package,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdvancedSearchFilters,
  type SearchFilters,
} from "@/components/search/advanced-search-filters";
import { getSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface SearchResult {
  id: string;
  type: "line" | "task" | "invoice" | "inventory";
  title: string;
  subtitle: string;
  description: string;
  relevanceScore: number;
  metadata: Record<string, any>;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("q") || "",
    categories: ["line", "task", "invoice", "inventory"],
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const supabase = getSupabaseClient();

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setFilters((prev) => ({ ...prev, query }));
      performSearch({ ...filters, query });
    }
  }, []);

  const performSearch = async (searchFilters = filters) => {
    if (!searchFilters.query.trim() && searchFilters.categories.length === 0) {
      setResults([]);
      setHasSearched(false);
      setSearchTime(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    const startTime = Date.now();

    try {
      const searchResults: SearchResult[] = [];

      // Search Lines
      if (searchFilters.categories.includes("line")) {
        let lineQuery = supabase.from("line_details").select("*");

        if (searchFilters.query.trim()) {
          lineQuery = lineQuery.or(
            `telephone_no.ilike.%${searchFilters.query}%,name.ilike.%${searchFilters.query}%,address.ilike.%${searchFilters.query}%`
          );
        }

        if (searchFilters.lineStatus && searchFilters.lineStatus !== "all") {
          lineQuery = lineQuery.eq(
            "completed",
            searchFilters.lineStatus === "completed"
          );
        }

        if (searchFilters.lengthRange?.min) {
          lineQuery = lineQuery.gte("length", searchFilters.lengthRange.min);
        }

        if (searchFilters.lengthRange?.max) {
          lineQuery = lineQuery.lte("length", searchFilters.lengthRange.max);
        }

        if (searchFilters.dateRange?.from) {
          lineQuery = lineQuery.gte(
            "date",
            searchFilters.dateRange.from.toISOString()
          );
        }

        if (searchFilters.dateRange?.to) {
          lineQuery = lineQuery.lte(
            "date",
            searchFilters.dateRange.to.toISOString()
          );
        }

        const { data: lines } = await lineQuery;

        (lines as any[] | null)?.forEach((line) => {
          const l = line as any;
          const telephone = String(l.telephone_no ?? "");
          const customerName = String(l.customer_name ?? l.name ?? "");
          const addr = String(l.address ?? "");
          const lengthValue = l.length != null ? Number(l.length) : undefined;
          const relevanceScore = calculateRelevance(searchFilters.query, [
            telephone,
            customerName,
            addr,
          ]);

          searchResults.push({
            id: String(l.id ?? ""),
            type: "line",
            title: telephone || customerName || "Line",
            subtitle:
              [telephone, customerName].filter(Boolean).join(" • ") || "Line",
            description:
              [
                addr ? `Address: ${addr}` : null,
                lengthValue != null && Number.isFinite(lengthValue)
                  ? `Length: ${lengthValue}m`
                  : null,
              ]
                .filter(Boolean)
                .join(" • ") || "No additional details",
            relevanceScore,
            metadata: l,
          });
        });
      }

      // Search Tasks
      if (searchFilters.categories.includes("task")) {
        let taskQuery = supabase.from("tasks").select("*");

        if (searchFilters.query.trim()) {
          taskQuery = taskQuery.or(
            `customer_name.ilike.%${searchFilters.query}%,telephone_no.ilike.%${searchFilters.query}%,address.ilike.%${searchFilters.query}%,dp.ilike.%${searchFilters.query}%,notes.ilike.%${searchFilters.query}%`
          );
        }

        if (searchFilters.taskStatus && searchFilters.taskStatus !== "all") {
          taskQuery = taskQuery.eq("status", searchFilters.taskStatus);
        }

        if (searchFilters.dateRange?.from) {
          taskQuery = taskQuery.gte(
            "created_at",
            searchFilters.dateRange.from.toISOString()
          );
        }

        if (searchFilters.dateRange?.to) {
          taskQuery = taskQuery.lte(
            "created_at",
            searchFilters.dateRange.to.toISOString()
          );
        }

        const { data: tasks } = await taskQuery;

        (tasks as any[] | null)?.forEach((task) => {
          const t = task as any;
          const customer = String(t.customer_name ?? "");
          const tel = String(t.telephone_no ?? "");
          const address = String(t.address ?? "");
          const status = String(t.status ?? "");
          const dp = String(t.dp ?? "");
          const notes = String(t.notes ?? "");
          const taskDate = String(t.task_date ?? "");
          const connectionType = String(t.connection_type_new ?? "");
          const title = customer || tel || dp || `Task ${String(t.id ?? "")}`;
          const descriptionParts = [
            address ? `Address: ${address}` : null,
            dp ? `DP: ${dp}` : null,
            status ? `Status: ${status}` : null,
            connectionType ? `Connection: ${connectionType}` : null,
            notes ? `Notes: ${notes}` : null,
          ].filter(Boolean);
          const relevanceScore = calculateRelevance(searchFilters.query, [
            customer,
            tel,
            address,
            status,
            dp,
            notes,
          ]);

          searchResults.push({
            id: String(t.id ?? ""),
            type: "task",
            title,
            subtitle:
              [tel, address, taskDate ? `Task Date: ${taskDate}` : null]
                .filter(Boolean)
                .join(" • ") || "Task",
            description:
              descriptionParts.join(" • ") || "No additional details",
            relevanceScore,
            metadata: t,
          });
        });
      }

      // Search Invoices
      if (searchFilters.categories.includes("invoice")) {
        let invoiceQuery = supabase
          .from("generated_invoices")
          .select("*")
          .in("invoice_type", ["A", "B"]); // Only fetch A and B type invoices

        if (searchFilters.query.trim()) {
          invoiceQuery = invoiceQuery.or(
            `invoice_number.ilike.%${searchFilters.query}%,customer_name.ilike.%${searchFilters.query}%,telephone_no.ilike.%${searchFilters.query}%`
          );
        }

        if (searchFilters.invoiceType && searchFilters.invoiceType !== "all") {
          invoiceQuery = invoiceQuery.eq(
            "invoice_type",
            searchFilters.invoiceType
          );
        }

        if (searchFilters.amountRange?.min) {
          invoiceQuery = invoiceQuery.gte(
            "total_amount",
            searchFilters.amountRange.min
          );
        }

        if (searchFilters.amountRange?.max) {
          invoiceQuery = invoiceQuery.lte(
            "total_amount",
            searchFilters.amountRange.max
          );
        }

        if (searchFilters.dateRange?.from) {
          invoiceQuery = invoiceQuery.gte(
            "created_at",
            searchFilters.dateRange.from.toISOString()
          );
        }

        if (searchFilters.dateRange?.to) {
          invoiceQuery = invoiceQuery.lte(
            "created_at",
            searchFilters.dateRange.to.toISOString()
          );
        }

        const { data: invoices } = await invoiceQuery;

        (invoices as any[] | null)?.forEach((invoice) => {
          const inv = invoice as any;
          const invNo = String(inv.invoice_number ?? "");
          const cust = String(inv.customer_name ?? "");
          const tel = String(inv.telephone_no ?? "");
          const total = Number(inv.total_amount ?? 0);
          const type = String(inv.invoice_type ?? "");
          const relevanceScore = calculateRelevance(searchFilters.query, [
            invNo,
            cust,
            tel,
          ]);

          searchResults.push({
            id: String(inv.id ?? ""),
            type: "invoice",
            title: invNo,
            subtitle: cust,
            description: `LKR ${total.toLocaleString()}${
              type ? ` • ${type}` : ""
            }`,
            relevanceScore,
            metadata: inv,
          });
        });
      }

      // Search Inventory
      if (searchFilters.categories.includes("inventory")) {
        let inventoryQuery = supabase.from("inventory_items").select("*");

        if (searchFilters.query.trim()) {
          inventoryQuery = inventoryQuery.or(
            `name.ilike.%${searchFilters.query}%,description.ilike.%${searchFilters.query}%,category.ilike.%${searchFilters.query}%`
          );
        }

        // Note: Supabase client cannot compare a column to another column directly in filters.
        // We'll filter low-stock items client-side after fetching.

        if (searchFilters.dateRange?.from) {
          inventoryQuery = inventoryQuery.gte(
            "created_at",
            searchFilters.dateRange.from.toISOString()
          );
        }

        if (searchFilters.dateRange?.to) {
          inventoryQuery = inventoryQuery.lte(
            "created_at",
            searchFilters.dateRange.to.toISOString()
          );
        }

        const { data: inventory } = await inventoryQuery;

        let items = (inventory as any[] | null) ?? [];
        if (searchFilters.inventoryLowStock) {
          items = items.filter((it) => {
            const i = it as any;
            return Number(i.current_stock ?? 0) < Number(i.reorder_level ?? 0);
          });
        }

        items.forEach((item) => {
          const i = item as any;
          const name = String(i.name ?? "");
          const desc = String(i.description ?? "");
          const cat = String(i.category ?? "");
          const stock = Number(i.current_stock ?? 0);
          const relevanceScore = calculateRelevance(searchFilters.query, [
            name,
            desc,
            cat,
          ]);

          searchResults.push({
            id: String(i.id ?? ""),
            type: "inventory",
            title: name,
            subtitle: cat,
            description: `Stock: ${stock}${desc ? ` • ${desc}` : ""}`,
            relevanceScore,
            metadata: i,
          });
        });
      }

      // Sort by relevance score
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      setResults(searchResults);
      setSearchTime(Date.now() - startTime);
    } catch (error) {
      console.error("Advanced search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const calculateRelevance = (
    query: string,
    fields: (string | null)[]
  ): number => {
    if (!query.trim()) return 0;

    const queryLower = query.toLowerCase();
    let score = 0;

    fields.forEach((field) => {
      if (!field) return;

      const fieldLower = field.toLowerCase();

      // Exact match gets highest score
      if (fieldLower === queryLower) {
        score += 100;
      }
      // Starts with query gets high score
      else if (fieldLower.startsWith(queryLower)) {
        score += 80;
      }
      // Contains query gets medium score
      else if (fieldLower.includes(queryLower)) {
        score += 50;
      }
      // Partial word match gets low score
      else if (
        queryLower.split(" ").some((word) => fieldLower.includes(word))
      ) {
        score += 20;
      }
    });

    return score;
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "line":
        return <Phone className='h-4 w-4' />;
      case "task":
        return <CheckCircle className='h-4 w-4' />;
      case "invoice":
        return <DollarSign className='h-4 w-4' />;
      case "inventory":
        return <Package className='h-4 w-4' />;
      default:
        return <Hash className='h-4 w-4' />;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case "line":
        return "bg-blue-100 text-blue-800";
      case "task":
        return "bg-green-100 text-green-800";
      case "invoice":
        return "bg-yellow-100 text-yellow-800";
      case "inventory":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className='flex-1 flex flex-col min-h-screen w-full'>
        <Header />
        <main className='flex-1 w-full max-w-full p-4 md:p-6 lg:p-8 pb-20 lg:pb-6 space-y-6 overflow-x-hidden'>
          <div className='w-full max-w-7xl mx-auto space-y-6'>
            {/* Page Header with Back Button */}
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
              <div className='flex items-center gap-2'>
                <Search className='h-6 w-6' />
                <h1 className='text-2xl font-bold'>Advanced Search</h1>
              </div>
              <Link href='/dashboard' aria-label='Back to Dashboard'>
                <Button variant='ghost' size='sm'>
                  <ArrowLeft className='mr-2 h-4 w-4' /> Back to Dashboard
                </Button>
              </Link>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              {/* Filters Panel */}
              <div className='lg:col-span-1 lg:sticky lg:top-24 self-start'>
                <AdvancedSearchFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onSearch={() => performSearch()}
                  onClear={() => {
                    setFilters({
                      query: "",
                      categories: ["line", "task", "invoice", "inventory"],
                    });
                    setResults([]);
                    setHasSearched(false);
                    setSearchTime(null);
                  }}
                  isSearching={isSearching}
                />
              </div>

              {/* Results Panel */}
              <div className='lg:col-span-2'>
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center justify-between'>
                      <span>Search Results</span>
                      {searchTime !== null && (
                        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                          <Clock className='h-4 w-4' />
                          {searchTime}ms
                        </div>
                      )}
                    </CardTitle>
                    {hasSearched && (
                      <p className='text-sm text-muted-foreground'>
                        Found {results.length} result
                        {results.length !== 1 ? "s" : ""}
                        {filters.query && ` for "${filters.query}"`}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isSearching ? (
                      <div className='space-y-4'>
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className='space-y-2'>
                            <Skeleton className='h-4 w-3/4' />
                            <Skeleton className='h-3 w-1/2' />
                            <Skeleton className='h-3 w-full' />
                          </div>
                        ))}
                      </div>
                    ) : results.length > 0 ? (
                      <div className='space-y-4'>
                        {results.map((result) => (
                          <Link
                            key={`${result.type}-${result.id}`}
                            href={`/search/details/${result.type}/${result.id}`}
                            className='block'
                          >
                            <Card className='hover:shadow-md transition-shadow cursor-pointer'>
                              <CardContent className='p-4'>
                                <div className='flex items-start justify-between'>
                                  <div className='flex items-start gap-3 flex-1'>
                                    <div className='mt-1'>
                                      {getResultIcon(result.type)}
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                      <div className='flex items-center gap-2 mb-1'>
                                        <h3 className='font-semibold text-sm truncate'>
                                          {result.title}
                                        </h3>
                                        <Badge
                                          variant='secondary'
                                          className={`text-xs ${getResultBadgeColor(
                                            result.type
                                          )}`}
                                        >
                                          {result.type}
                                        </Badge>
                                        {result.relevanceScore > 80 && (
                                          <Badge
                                            variant='default'
                                            className='text-xs bg-green-100 text-green-800'
                                          >
                                            High Match
                                          </Badge>
                                        )}
                                      </div>
                                      <p className='text-sm text-muted-foreground mb-1'>
                                        {result.subtitle}
                                      </p>
                                      <p className='text-xs text-muted-foreground line-clamp-2'>
                                        {result.description}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : hasSearched ? (
                      <div className='text-center py-8'>
                        <AlertCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                        <h3 className='text-lg font-semibold mb-2'>
                          No results found
                        </h3>
                        <p className='text-muted-foreground mb-4'>
                          Try adjusting your search criteria or filters
                        </p>
                        <Button
                          variant='outline'
                          onClick={() => {
                            setFilters({
                              query: "",
                              categories: [
                                "line",
                                "task",
                                "invoice",
                                "inventory",
                              ],
                            });
                            setResults([]);
                            setHasSearched(false);
                          }}
                        >
                          Clear Search
                        </Button>
                      </div>
                    ) : (
                      <div className='text-center py-8'>
                        <Search className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                        <h3 className='text-lg font-semibold mb-2'>
                          Start your search
                        </h3>
                        <p className='text-muted-foreground'>
                          Enter search terms and apply filters to find what
                          you&apos;re looking for
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
