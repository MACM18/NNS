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
import Link from "next/link";

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
  const router = require("next/navigation").useRouter();

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("q") || "",
    categories: ["line", "task", "invoice", "inventory"],
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setFilters((prev) => ({ ...prev, query }));
      performSearch({ ...filters, query, page: 1 }, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performSearch = async (
    searchFilters: any = filters,
    append: boolean = false,
    pageOverride?: number
  ) => {
    setError(null);

    const effectiveQuery = (searchFilters.query || "").trim();
    if (!effectiveQuery && searchFilters.categories.length === 0) {
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
      const apiFilters = {
        query: effectiveQuery,
        categories: searchFilters.categories,
        lineStatus: searchFilters.lineStatus,
        taskStatus: searchFilters.taskStatus,
        invoiceType: searchFilters.invoiceType,
        inventoryLowStock: searchFilters.inventoryLowStock,
        lengthRange: searchFilters.lengthRange,
        amountRange: searchFilters.amountRange,
        dateRange: searchFilters.dateRange
          ? {
              from: searchFilters.dateRange.from?.toISOString(),
              to: searchFilters.dateRange.to?.toISOString(),
            }
          : undefined,
        page: pageOverride ?? page,
        limit,
      };

      // Update URL with query and page
      const params = new URLSearchParams();
      if (apiFilters.query) params.set("q", apiFilters.query);
      if (apiFilters.page && Number(apiFilters.page) > 1)
        params.set("page", String(apiFilters.page));
      router.push(`/dashboard/search?${params.toString()}`, { shallow: true });

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiFilters),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Search failed");
      }

      const result = await response.json();
      const data = result.data || [];
      const meta = result.meta || {
        total: null,
        page: pageOverride ?? page,
        limit,
      };

      setTotal(meta.total ?? null);
      setPage(meta.page ?? page);

      if (append) setResults((prev) => [...prev, ...data]);
      else setResults(data);

      setSearchTime(Date.now() - startTime);
    } catch (err: any) {
      console.error("Advanced search error:", err);
      setError(String(err?.message ?? "Search failed"));
      if (!append) setResults([]);
    } finally {
      setIsSearching(false);
    }
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
    <div className='space-y-6'>
      {/* Page Header with Back Button */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <Search className='h-6 w-6' />
          <h1 className='text-2xl sm:text-3xl font-bold'>Advanced Search</h1>
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
            onSearch={() => {
              setPage(1);
              performSearch({ ...filters }, false, 1);
            }}
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
                  Found {typeof total === "number" ? total : results.length}{" "}
                  result
                  {(typeof total === "number" ? total : results.length) !== 1
                    ? "s"
                    : ""}
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
                  {error && (
                    <div className='bg-red-50 border border-red-100 text-red-800 p-3 rounded'>
                      <strong className='font-semibold'>Error: </strong>
                      <span>{error}</span>
                    </div>
                  )}

                  {results.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      href={`/dashboard/search/details/${result.type}/${result.id}`}
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

                  {/* Pagination Controls */}
                  <div className='flex items-center justify-between mt-4'>
                    <div className='text-sm text-muted-foreground'>
                      {typeof total === "number" ? (
                        <span>
                          Showing {results.length} of {total} result
                          {total !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span>
                          Showing {results.length} result
                          {results.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {typeof total === "number" && results.length < total && (
                      <div>
                        <Button
                          onClick={() => performSearch(filters, true, page + 1)}
                          disabled={isSearching}
                        >
                          {isSearching ? "Loading..." : "Load more"}
                        </Button>
                      </div>
                    )}
                  </div>
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
                        categories: ["line", "task", "invoice", "inventory"],
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
  );
}
