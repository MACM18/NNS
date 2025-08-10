"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Menu, Search, X, Phone, Package, FileText, CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Navigation } from "@/components/navigation"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/contexts/auth-context"
import { useNotification } from "@/contexts/notification-context"
import { getSupabaseClient } from "@/lib/supabase"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface SearchResult {
  id: string
  type: "line" | "task" | "invoice" | "inventory"
  title: string
  subtitle: string
  data: any
}

export function Header() {
  const { user, profile, signOut } = useAuth()
  const { notifications, markAsRead } = useNotification()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = getSupabaseClient()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2) {
        performQuickSearch()
      } else {
        setSearchResults([])
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const performQuickSearch = async () => {
    setIsSearching(true)
    setShowSearchResults(true)
    try {
      const results: SearchResult[] = []

      // Search in line_details
      const { data: lines } = await supabase
        .from("line_details")
        .select("id, telephone_no, name, address")
        .or(`telephone_no.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(5)
      if (lines) {
        lines.forEach((line) =>
          results.push({
            id: line.id,
            type: "line",
            title: line.telephone_no,
            subtitle: `${line.name} - ${line.address}`,
            data: line,
          }),
        )
      }

      // Search in tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, telephone_no, address, status")
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,telephone_no.ilike.%${searchQuery}%`)
        .limit(5)
      if (tasks) {
        tasks.forEach((task) =>
          results.push({
            id: task.id,
            type: "task",
            title: task.title,
            subtitle: `${task.telephone_no || "N/A"} - ${task.address}`,
            data: task,
          }),
        )
      }

      // Search in generated_invoices
      const { data: invoices } = await supabase
        .from("generated_invoices")
        .select("id, invoice_number, customer_name, total_amount")
        .ilike("invoice_number", `%${searchQuery}%`)
        .limit(5)
      if (invoices) {
        invoices.forEach((invoice) =>
          results.push({
            id: invoice.id,
            type: "invoice",
            title: invoice.invoice_number,
            subtitle: `${invoice.customer_name} - LKR ${invoice.total_amount}`,
            data: invoice,
          }),
        )
      }

      // Search in inventory_items
      const { data: inventory } = await supabase
        .from("inventory_items")
        .select("id, name, current_stock, unit")
        .ilike("name", `%${searchQuery}%`)
        .limit(5)
      if (inventory) {
        inventory.forEach((item) =>
          results.push({
            id: item.id,
            type: "inventory",
            title: item.name,
            subtitle: `Stock: ${item.current_stock} ${item.unit}`,
            data: item,
          }),
        )
      }

      setSearchResults(results)
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    router.push(`/search/details/${result.type}/${result.id}`)
    setShowSearchResults(false)
    setSearchQuery("")
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "line":
        return <Phone className="h-4 w-4" />
      case "task":
        return <CheckCircle className="h-4 w-4" />
      case "invoice":
        return <FileText className="h-4 w-4" />
      case "inventory":
        return <Package className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
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
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="lg:hidden bg-transparent">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <Navigation />
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <img src="/placeholder-logo.svg" alt="NNS Logo" className="h-6 w-6" />
            <span className="text-lg">NNS Enterprise</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md mx-4" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search lines, tasks, invoices, inventory..."
              className="w-full rounded-lg bg-background pl-9 pr-10 text-sm focus:border-primary focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 2 && setShowSearchResults(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.length > 2) {
                  router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
                  setShowSearchResults(false)
                  setSearchQuery("")
                }
              }}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => {
                  setSearchQuery("")
                  setSearchResults([])
                  setShowSearchResults(false)
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>

          {showSearchResults && (isSearching || searchResults.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-md border bg-popover text-popover-foreground shadow-md z-50">
              <ScrollArea className="max-h-[300px]">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <div className="p-2">
                    {searchResults.map((result) => (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex-shrink-0">{getResultIcon(result.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{result.title}</span>
                            <Badge className={cn("text-xs", getResultBadgeColor(result.type))}>{result.type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                      </div>
                    ))}
                    <DropdownMenuItem className="flex items-center justify-center gap-2 p-2 cursor-pointer" asChild>
                      <Link
                        href={`/search?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setShowSearchResults(false)}
                      >
                        View all results <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </DropdownMenuItem>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No results found.</div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-6 w-6" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {notifications.length}
              </span>
            )}
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || "/placeholder-user.jpg"} alt="User Avatar" />
                  <AvatarFallback>{profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.full_name || user?.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
