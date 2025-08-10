"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Search, Bell, User, Settings, LogOut, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface SearchResult {
  id: string
  type: "line" | "task" | "invoice" | "inventory"
  title: string
  subtitle: string
  description: string
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { user, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const performQuickSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    setShowResults(true)

    try {
      const results: SearchResult[] = []

      // Search lines
      const { data: lines } = await supabase
        .from("line_details")
        .select("id, telephone_no, customer_name, address")
        .or(`telephone_no.ilike.%${query}%,customer_name.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(3)

      lines?.forEach((line) => {
        results.push({
          id: line.id,
          type: "line",
          title: line.telephone_no,
          subtitle: line.customer_name,
          description: line.address,
        })
      })

      // Search tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, description, telephone_no")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,telephone_no.ilike.%${query}%`)
        .limit(3)

      tasks?.forEach((task) => {
        results.push({
          id: task.id,
          type: "task",
          title: task.title,
          subtitle: task.telephone_no || "No phone number",
          description: task.description,
        })
      })

      // Search invoices
      const { data: invoices } = await supabase
        .from("generated_invoices")
        .select("id, invoice_number, customer_name, total_amount")
        .or(`invoice_number.ilike.%${query}%,customer_name.ilike.%${query}%`)
        .limit(3)

      invoices?.forEach((invoice) => {
        results.push({
          id: invoice.id,
          type: "invoice",
          title: invoice.invoice_number,
          subtitle: invoice.customer_name,
          description: `LKR ${invoice.total_amount?.toLocaleString()}`,
        })
      })

      // Search inventory
      const { data: inventory } = await supabase
        .from("inventory_items")
        .select("id, name, category, current_stock")
        .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(3)

      inventory?.forEach((item) => {
        results.push({
          id: item.id,
          type: "inventory",
          title: item.name,
          subtitle: item.category,
          description: `Stock: ${item.current_stock}`,
        })
      })

      setSearchResults(results)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setShowResults(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setShowResults(false)
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
        return "📄"
    }
  }

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case "line":
        return "bg-blue-100 text-blue-800"
      case "task":
        return "bg-green-100 text-green-800"
      case "invoice":
        return "bg-yellow-100 text-yellow-800"
      case "inventory":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        <div className="flex flex-1 items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search lines, tasks, invoices..."
                  className="pl-8 pr-8"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    performQuickSearch(e.target.value)
                  }}
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-6 w-6 p-0"
                    onClick={clearSearch}
                  >
                    ×
                  </Button>
                )}
              </div>
              <Button type="submit" size="sm" className="px-3">
                <Search className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-3 bg-transparent"
                onClick={() => router.push("/search")}
                title="Advanced Search"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </form>

            {/* Quick Search Results */}
            {showResults && (
              <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
                <CardContent className="p-2">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-1">
                      {searchResults.map((result) => (
                        <Link
                          key={`${result.type}-${result.id}`}
                          href={`/search/details/${result.type}/${result.id}`}
                          className="block p-2 rounded hover:bg-accent transition-colors"
                          onClick={() => setShowResults(false)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{getResultIcon(result.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{result.title}</span>
                                <Badge variant="secondary" className={`text-xs ${getResultBadgeColor(result.type)}`}>
                                  {result.type}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {result.subtitle} • {result.description}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <Link
                          href={`/search?q=${encodeURIComponent(searchQuery)}`}
                          className="block p-2 text-center text-sm text-primary hover:bg-accent rounded transition-colors"
                          onClick={() => setShowResults(false)}
                        >
                          View all results & advanced search →
                        </Link>
                      </div>
                    </div>
                  ) : searchQuery.trim() ? (
                    <div className="p-4 text-center">
                      <div className="text-sm text-muted-foreground mb-2">No quick results found</div>
                      <Link
                        href={`/search?q=${encodeURIComponent(searchQuery)}`}
                        className="text-sm text-primary hover:underline"
                        onClick={() => setShowResults(false)}
                      >
                        Try advanced search →
                      </Link>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">3</Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
