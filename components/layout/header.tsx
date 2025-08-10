"use client"

import type React from "react"

import { Bell, Plus, Search, Settings, Check, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useNotification } from "@/contexts/notification-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect, useRef } from "react"
import { AddTelephoneLineModal } from "../modals/add-telephone-line-modal"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

interface SearchResult {
  id: string
  type: "line" | "task" | "invoice" | "inventory"
  title: string
  subtitle: string
  data: any
}

export function Header() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotification()
  const [openAddTelephoneLineModal, setOpenAddTelephoneLineModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()
  const { user } = useAuth()

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const performSearch = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    setShowSearchResults(true)

    try {
      const results: SearchResult[] = []

      // Search in line_details
      const { data: lines } = await supabase
        .from("line_details")
        .select("*")
        .or(`telephone_no.ilike.%${query}%,name.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(5)

      if (lines) {
        lines.forEach((line) => {
          results.push({
            id: line.id,
            type: "line",
            title: `Line: ${line.telephone_no}`,
            subtitle: `${line.name} - ${line.address}`,
            data: line,
          })
        })
      }

      // Search in tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .or(`telephone_no.ilike.%${query}%,address.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5)

      if (tasks) {
        tasks.forEach((task) => {
          results.push({
            id: task.id,
            type: "task",
            title: `Task: ${task.telephone_no}`,
            subtitle: `${task.address} - Status: ${task.status}`,
            data: task,
          })
        })
      }

      // Search in generated_invoices
      const { data: invoices } = await supabase
        .from("generated_invoices")
        .select("*")
        .or(`invoice_number.ilike.%${query}%`)
        .limit(5)

      if (invoices) {
        invoices.forEach((invoice) => {
          results.push({
            id: invoice.id,
            type: "invoice",
            title: `Invoice: ${invoice.invoice_number}`,
            subtitle: `${invoice.job_month} - LKR ${invoice.total_amount.toLocaleString()}`,
            data: invoice,
          })
        })
      }

      // Search in inventory_items
      const { data: inventory } = await supabase
        .from("inventory_items")
        .select("*")
        .or(`name.ilike.%${query}%`)
        .limit(5)

      if (inventory) {
        inventory.forEach((item) => {
          results.push({
            id: item.id,
            type: "inventory",
            title: `Inventory: ${item.name}`,
            subtitle: `Stock: ${item.current_stock} ${item.unit}`,
            data: item,
          })
        })
      }

      setSearchResults(results)
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchQuery)
  }

  const handleSearchResultClick = (result: SearchResult) => {
    setShowSearchResults(false)
    setSearchQuery("")

    // Navigate to detailed view page
    router.push(`/search/details/${result.type}/${result.id}`)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setShowSearchResults(false)
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

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const getNotificationIcon = (category: string) => {
    switch (category) {
      case "line_added":
        return "📞"
      case "task_completed":
        return "✅"
      case "invoice_generated":
        return "💰"
      case "report_ready":
        return "📊"
      case "inventory_low":
        return "⚠️"
      case "system":
        return "🔧"
      default:
        return "📢"
    }
  }

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return "text-muted-foreground"

    switch (type) {
      case "success":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      default:
        return "text-blue-600"
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Search */}
      <div className="flex-1 max-w-md relative" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lines, tasks, invoices..."
            className="pl-8 pr-20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          <div className="absolute right-1 top-1 flex gap-1">
            {searchQuery && (
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={clearSearch}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" size="sm" className="h-8">
              Search
            </Button>
          </div>
        </form>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-hidden">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : searchResults.length > 0 ? (
              <ScrollArea className="max-h-96">
                <div className="p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                    Search Results ({searchResults.length})
                  </div>
                  {searchResults.map((result) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <div className="text-lg">{getResultIcon(result.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{result.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {result.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : searchQuery ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No results found for "{searchQuery}"</div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Add Line Details Button */}
        <Button onClick={() => setOpenAddTelephoneLineModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Line
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <div className="flex gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 px-2">
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet</div>
            ) : (
              <ScrollArea className="h-96">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0",
                      !notification.is_read && "bg-muted/30",
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="text-lg mt-0.5">{getNotificationIcon(notification.category)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p
                            className={cn(
                              "font-medium text-sm leading-tight",
                              getNotificationColor(notification.type, notification.is_read),
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {notifications.length > 10 && (
                  <div className="p-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/notifications")}>
                      View all notifications
                    </Button>
                  </div>
                )}
              </ScrollArea>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button variant="ghost" size="sm" onClick={() => router.push("/settings")}>
          <Settings className="h-4 w-4" />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {openAddTelephoneLineModal && (
          <AddTelephoneLineModal
            open={openAddTelephoneLineModal}
            onOpenChange={() => setOpenAddTelephoneLineModal(false)}
            onSuccess={() => setOpenAddTelephoneLineModal(false)}
          />
        )}
      </div>
    </header>
  )
}
