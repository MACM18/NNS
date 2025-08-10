"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Bell, User, Settings, LogOut, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

// Mock search data - replace with actual data fetching from Supabase
const mockSearchResults = [
  {
    id: "line-1",
    type: "Line",
    title: "Fiber Line 101",
    description: "Customer: John Doe, Location: Colombo",
    url: "/lines/1",
  },
  {
    id: "task-1",
    type: "Task",
    title: "Install new ONT",
    description: "Assigned to: Technician A, Status: Pending",
    url: "/tasks/1",
  },
  {
    id: "user-1",
    type: "User",
    title: "Jane Smith",
    description: "Role: Admin, Email: jane@example.com",
    url: "/users/1",
  },
  {
    id: "invoice-1",
    type: "Invoice",
    title: "Invoice #2023-001",
    description: "Amount: LKR 15,000, Status: Paid",
    url: "/invoices/1",
  },
  {
    id: "line-2",
    type: "Line",
    title: "Copper Line 205",
    description: "Customer: Alice Brown, Location: Kandy",
    url: "/lines/2",
  },
  {
    id: "blog-1",
    type: "Blog",
    title: "Future of FTTH",
    description: "Author: NNS Insights Team, Date: 2023-10-26",
    url: "/insights/1",
  },
  {
    id: "job-1",
    type: "Job",
    title: "Field Technician",
    description: "Location: Galle, Type: Full-time",
    url: "/job-listings/1",
  },
]

export function Header() {
  const { user, profile, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredResults, setFilteredResults] = useState<typeof mockSearchResults>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchTerm.length > 1) {
      const results = mockSearchResults.filter(
        (item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredResults(results)
      setIsSearchOpen(true)
    } else {
      setFilteredResults([])
      setIsSearchOpen(false)
    }
  }, [searchTerm])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
      router.push("/") // Redirect to landing page after logout
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleResultClick = (url: string) => {
    router.push(url)
    setSearchTerm("")
    setIsSearchOpen(false)
    searchInputRef.current?.blur() // Close keyboard on mobile
  }

  const handleAdvancedSearch = () => {
    router.push("/search")
    setSearchTerm("")
    setIsSearchOpen(false)
    searchInputRef.current?.blur()
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6 dark:bg-gray-950">
      <div className="relative flex-1 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
        <Input
          type="search"
          placeholder="Quick search..."
          className="w-full rounded-lg bg-gray-100 pl-9 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length > 1 && setIsSearchOpen(true)}
          ref={searchInputRef}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
            onClick={() => {
              setSearchTerm("")
              setIsSearchOpen(false)
              searchInputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}

        {isSearchOpen && filteredResults.length > 0 && (
          <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <PopoverTrigger asChild>
              {/* This invisible trigger keeps the popover open when input is focused */}
              <div className="absolute inset-0" />
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100%-2rem)] md:w-[448px] p-0 mt-2 max-h-[400px] overflow-y-auto">
              <ScrollArea className="h-full">
                <div className="p-2">
                  {filteredResults.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleResultClick(item.url)}
                    >
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {item.type}
                      </Badge>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <Button variant="ghost" className="w-full justify-start text-blue-600" onClick={handleAdvancedSearch}>
                    Advanced Search <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            3
          </span>
          <span className="sr-only">Notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || "/placeholder-user.jpg"} alt="User Avatar" />
                <AvatarFallback>
                  {profile?.full_name ? profile.full_name[0] : user?.email ? user.email[0] : "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.full_name || user?.email || "Guest User"}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile?.email || user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} disabled={authLoading}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
