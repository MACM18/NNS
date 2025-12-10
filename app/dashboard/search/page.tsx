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
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("q") || "",
    categories: ["line", "task", "invoice", "inventory"],
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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
      // Transform filters for API
      const apiFilters = {
        query: searchFilters.query,
        categories: searchFilters.categories,
        lineStatus: searchFilters.lineStatus,
        taskStatus: searchFilters.taskStatus,
        taskPriority: searchFilters.taskPriority,
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
      };

      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiFilters),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const result = await response.json();
      setResults(result.data || []);
      setSearchTime(Date.now() - startTime);
    } catch (error) {
      console.error("Advanced search error:", error);
      setResults([]);
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
