"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useNotification } from "@/contexts/notification-context"
import { AdvancedSearchFilters, type SearchFilters } from "@/components/search/advanced-search-filters"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  type: "line" | "task" | "invoice" | "inventory"
  title: string
  subtitle: string
  data: any
  relevanceScore?: number
}

export default function AdvancedSearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { addNotification } = useNotification()
  const supabase = getSupabaseClient()

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("q") || "",
    categories: ["line", "task", "invoice", "inventory"],
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [searchTime, setSearchTime] = useState(0)

  useEffect(() => {
    if (searchParams.get("q")) {
      performAdvancedSearch()
    }
  }, [])

  const performAdvancedSearch = async () => {
    if (!user) return

    setIsSearching(true)
    const startTime = Date.now()

    try {
      const results: SearchResult[] = []

      // Search in line_details
      if (filters.categories.includes("line")) {
        let query = supabase.from("line_details").select("*")

        if (filters.query) {
          query = query.or(
            `telephone_no.ilike.%${filters.query}%,name.ilike.%${filters.query}%,address.ilike.%${filters.query}%`,
          )
        }

        if (filters.dateRange) {
          query = query.gte("date", filters.dateRange.from.toISOString())
          query = query.lte("date", filters.dateRange.to.toISOString())
        }

        if (filters.lineStatus && filters.lineStatus !== "all") {
          const completed = filters.lineStatus === "completed"
          query = query.eq("completed", completed)
        }

        if (filters.lengthRange) {
          if (filters.lengthRange.min > 0) {
            query = query.gte("length", filters.lengthRange.min)
          }
          if (filters.lengthRange.max > 0) {
            query = query.lte("length", filters.lengthRange.max)
          }
        }

        const { data: lines } = await query.limit(50)

        if (lines) {
          lines.forEach((line) => {
            results.push({
              id: line.id,
              type: "line",
              title: `Line: ${line.telephone_no}`,
              subtitle: `${line.name} - ${line.address} (${line.length}m)`,
              data: line,
              relevanceScore: calculateRelevanceScore(filters.query, [line.telephone_no, line.name, line.address]),
            })
          })
        }
      }

      // Search in tasks
      if (filters.categories.includes("task")) {
        let query = supabase.from("tasks").select("*")

        if (filters.query) {
          query = query.or(
            `telephone_no.ilike.%${filters.query}%,address.ilike.%${filters.query}%,description.ilike.%${filters.query}%`,
          )
        }

        if (filters.dateRange) {
          query = query.gte("created_at", filters.dateRange.from.toISOString())
          query = query.lte("created_at", filters.dateRange.to.toISOString())
        }

        if (filters.taskStatus && filters.taskStatus !== "all") {
          query = query.eq("status", filters.taskStatus)
        }

        const { data: tasks } = await query.limit(50)

        if (tasks) {
          tasks.forEach((task) => {
            results.push({
              id: task.id,
              type: "task",
              title: `Task: ${task.telephone_no}`,
              subtitle: `${task.address} - Status: ${task.status}`,
              data: task,
              relevanceScore: calculateRelevanceScore(filters.query, [
                task.telephone_no,
                task.address,
                task.description,
              ]),
            })
          })
        }
      }

      // Search in generated_invoices
      if (filters.categories.includes("invoice")) {
        let query = supabase.from("generated_invoices").select("*")

        if (filters.query) {
          query = query.ilike("invoice_number", `%${filters.query}%`)
        }

        if (filters.dateRange) {
          query = query.gte("created_at", filters.dateRange.from.toISOString())
          query = query.lte("created_at", filters.dateRange.to.toISOString())
        }

        if (filters.invoiceType && filters.invoiceType !== "all") {
          query = query.eq("invoice_type", filters.invoiceType)
        }

        if (filters.amountRange) {
          if (filters.amountRange.min > 0) {
            query = query.gte("total_amount", filters.amountRange.min)
          }
          if (filters.amountRange.max > 0) {
            query = query.lte("total_amount", filters.amountRange.max)
          }
        }

        const { data: invoices } = await query.limit(50)

        if (invoices) {
          invoices.forEach((invoice) => {
            results.push({
              id: invoice.id,
              type: "invoice",
              title: `Invoice: ${invoice.invoice_number}`,
              subtitle: `${invoice.job_month} - LKR ${invoice.total_amount.toLocaleString()}`,
              data: invoice,
              relevanceScore: calculateRelevanceScore(filters.query, [invoice.invoice_number]),
            })
          })
        }
      }

      // Search in inventory_items
      if (filters.categories.includes("inventory")) {
        let query = supabase.from("inventory_items").select("*")

        if (filters.query) {
          query = query.ilike("name", `%${filters.query}%`)
        }

        if (filters.inventoryLowStock) {
          query = query.lt("current_stock", supabase.raw("reorder_level"))
        }

        const { data: inventory } = await query.limit(50)

        if (inventory) {
          inventory.forEach((item) => {
            results.push({
              id: item.id,
              type: "inventory",
              title: `Inventory: ${item.name}`,
              subtitle: `Stock: ${item.current_stock} ${item.unit}`,
              data: item,
              relevanceScore: calculateRelevanceScore(filters.query, [item.name]),
            })
          })
        }
      }

      // Sort by relevance score
      results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

      setResults(results)
      setTotalResults(results.length)
      setSearchTime(Date.now() - startTime)
    } catch (error) {
      console.error("Advanced search error:", error)
      addNotification({
        title: "Search Error",
        message: "Failed to perform search. Please try again.",
        type: "error",
        category: "system",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const calculateRelevanceScore = (query: string, fields: (string | null)[]): number => {
    if (!query) return 0

    let score = 0
    const queryLower = query.toLowerCase()

    fields.forEach((field) => {
      if (field) {
        const fieldLower = field.toLowerCase()
        if (fieldLower.includes(queryLower)) {
          // Exact match gets higher score
          if (fieldLower === queryLower) {
            score += 10
          }
          // Starts with query gets medium score
          else if (fieldLower.startsWith(queryLower)) {
            score += 5
          }
          // Contains query gets lower score
          else {
            score += 1
          }
        }
      }
    })

    return score
  }

  const handleResultClick = (result: SearchResult) => {
    router.push(`/search/details/${result.type}/${result.id}`)
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "line":
        return "📞"
      case "task":
        return "📋"
      case "invoice":
        return "💰"
      case "inventory":
        return "📦"
      default:
        return "🔍"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "line":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "task":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "invoice":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "inventory":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Advanced Search</h1>
          <p className="text-muted-foreground">Search across all system data with advanced filters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1">
          <AdvancedSearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={performAdvancedSearch}
            onClear={() => setResults([])}
            isSearching={isSearching}
          />
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Results Header */}
          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Search Results
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {totalResults} results in {searchTime}ms
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Results List */}
          {isSearching ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Searching...</span>
              </CardContent>
            </Card>
          ) : results.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="p-4 space-y-2">
                    {results.map((result, index) => (
                      <div
                        key={`${result.type}-${result.id}-${index}`}
                        className="flex items-center gap-4 p-4 hover:bg-muted rounded-lg cursor-pointer transition-colors border"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="text-2xl">{getResultIcon(result.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{result.title}</h3>
                            <Badge className={cn("text-xs", getTypeColor(result.type))}>{result.type}</Badge>
                            {result.relevanceScore && result.relevanceScore > 5 && (
                              <Badge variant="outline" className="text-xs">
                                High Match
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : !isSearching && filters.query ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters to find what you're looking for.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Start your search</h3>
                <p className="text-muted-foreground">
                  Enter search terms and apply filters to find records across the system.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  )
}
