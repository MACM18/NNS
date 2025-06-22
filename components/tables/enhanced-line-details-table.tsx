"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, Eye, Phone, MapPin, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase"
import { useNotification } from "@/contexts/notification-context"

interface TelephoneLine {
  id: string
  date: string
  phone_number: string
  dp: string
  power_dp_new: number
  power_inbox_new: number
  name: string
  address: string
  cable_start_new: number
  cable_middle_new: number
  cable_end_new: number
  f1_calc: number
  g1_calc: number
  total_calc: number
  wastage_input: number
  created_at: string
}

interface EnhancedLineDetailsTableProps {
  refreshTrigger: number
  dateFilter: "today" | "week" | "month"
}

export function EnhancedLineDetailsTable({ refreshTrigger, dateFilter }: EnhancedLineDetailsTableProps) {
  const [data, setData] = useState<TelephoneLine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const supabase = getSupabaseClient()
  const { addNotification } = useNotification()

  useEffect(() => {
    fetchData()
  }, [refreshTrigger, dateFilter, sortField, sortDirection])

  const fetchData = async () => {
    setLoading(true)
    try {
      let query = supabase.from("line_details").select("*").not("phone_number", "is", null) // Only get records with phone numbers

      // Apply date filter
      const now = new Date()
      let startDate: Date

      switch (dateFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte("created_at", startDate.toISOString())

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === "asc" })

      const { data: telephoneLines, error } = await query

      if (error) throw error

      setData(telephoneLines || [])
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: "Failed to fetch telephone line details",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredData = data.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone_number?.includes(searchTerm) ||
      item.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dp?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const isPowerHigh = (value: number) => value >= 25

  const ExpandedRowContent = ({ item }: { item: TelephoneLine }) => (
    <div className="p-6 bg-muted/30 rounded-lg space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Technical Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">DP:</span>
              <Badge variant="outline">{item.dp}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Power (DP):</span>
              <span className={`font-medium ${isPowerHigh(item.power_dp_new) ? "text-red-600" : "text-green-600"}`}>
                {item.power_dp_new?.toFixed(2) || "N/A"}
                {isPowerHigh(item.power_dp_new) && " ⚠️"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Power (Inbox):</span>
              <span className={`font-medium ${isPowerHigh(item.power_inbox_new) ? "text-red-600" : "text-green-600"}`}>
                {item.power_inbox_new?.toFixed(2) || "N/A"}
                {isPowerHigh(item.power_inbox_new) && " ⚠️"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Phone:</span>
              <p className="font-medium">{item.phone_number}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Name:</span>
              <p className="font-medium">{item.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Address:</span>
              <p className="text-sm">{item.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Cable Measurements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Cable Measurements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Start:</span>
                <p className="font-medium">{item.cable_start_new?.toFixed(2)}m</p>
              </div>
              <div>
                <span className="text-muted-foreground">Middle:</span>
                <p className="font-medium">{item.cable_middle_new?.toFixed(2)}m</p>
              </div>
              <div>
                <span className="text-muted-foreground">End:</span>
                <p className="font-medium">{item.cable_end_new?.toFixed(2)}m</p>
              </div>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">F1:</span>
                <span className="font-medium text-blue-600">{item.f1_calc?.toFixed(2)}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">G1:</span>
                <span className="font-medium text-blue-600">{item.g1_calc?.toFixed(2)}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="font-medium text-green-600">{item.total_calc?.toFixed(2)}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Wastage:</span>
                <span className="font-medium text-orange-600">{item.wastage_input?.toFixed(2) || "0.00"}m</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Installation Date: {new Date(item.date).toLocaleDateString()} | Added:{" "}
        {new Date(item.created_at).toLocaleDateString()}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading telephone line details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, address, or DP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortField} onValueChange={setSortField}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Created</SelectItem>
            <SelectItem value="date">Installation Date</SelectItem>
            <SelectItem value="name">Customer Name</SelectItem>
            <SelectItem value="phone_number">Phone Number</SelectItem>
            <SelectItem value="dp">DP</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}>
          {sortDirection === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredData.length} of {data.length} telephone lines
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("phone_number")}>
                Phone Number
                {sortField === "phone_number" && (
                  <ChevronDown className={`inline ml-1 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                Customer Name
                {sortField === "name" && (
                  <ChevronDown className={`inline ml-1 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("dp")}>
                DP
                {sortField === "dp" && (
                  <ChevronDown className={`inline ml-1 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead>Power Status</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("date")}>
                Installation Date
                {sortField === "date" && (
                  <ChevronDown className={`inline ml-1 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`} />
                )}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.phone_number}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.dp}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant={isPowerHigh(item.power_dp_new) ? "destructive" : "secondary"} className="text-xs">
                      DP: {item.power_dp_new?.toFixed(1)}
                    </Badge>
                    <Badge
                      variant={isPowerHigh(item.power_inbox_new) ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      IB: {item.power_inbox_new?.toFixed(1)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[800px]">
                      <ExpandedRowContent item={item} />
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No telephone line details found matching your search.</p>
        </div>
      )}
    </div>
  )
}
