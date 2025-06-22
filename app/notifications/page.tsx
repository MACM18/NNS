"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Phone,
  CheckCircle,
  DollarSign,
  FileText,
  AlertTriangle,
  SettingsIcon,
} from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useNotification } from "@/contexts/notification-context"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

function NotificationsPageContent() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotification()

  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [selectedTab, setSelectedTab] = useState("all")
  const router = useRouter()

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === "all" || notification.category === filterCategory
    const matchesType = filterType === "all" || notification.type === filterType

    const matchesTab =
      selectedTab === "all" ||
      (selectedTab === "unread" && !notification.is_read) ||
      (selectedTab === "read" && notification.is_read)

    return matchesSearch && matchesCategory && matchesType && matchesTab
  })

  const getNotificationIcon = (category: string, type: string) => {
    switch (category) {
      case "line_added":
        return <Phone className="h-5 w-5 text-blue-500" />
      case "task_completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "invoice_generated":
        return <DollarSign className="h-5 w-5 text-purple-500" />
      case "report_ready":
        return <FileText className="h-5 w-5 text-indigo-500" />
      case "inventory_low":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "system":
        return <SettingsIcon className="h-5 w-5 text-gray-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
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

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case "line_added":
        return "Line Added"
      case "task_completed":
        return "Task Completed"
      case "invoice_generated":
        return "Invoice Generated"
      case "report_ready":
        return "Report Ready"
      case "inventory_low":
        return "Inventory Alert"
      case "system":
        return "System"
      default:
        return category
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with your latest activities and system alerts</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-blue-600">{unreadCount}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">
                  {
                    notifications.filter((n) => new Date(n.created_at).toDateString() === new Date().toDateString())
                      .length
                  }
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {
                    notifications.filter((n) => {
                      const notificationDate = new Date(n.created_at)
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      return notificationDate >= weekAgo
                    }).length
                  }
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="line_added">Line Added</SelectItem>
                <SelectItem value="task_completed">Task Completed</SelectItem>
                <SelectItem value="invoice_generated">Invoice Generated</SelectItem>
                <SelectItem value="report_ready">Report Ready</SelectItem>
                <SelectItem value="inventory_low">Inventory Alert</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Read ({notifications.length - unreadCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterCategory !== "all" || filterType !== "all"
                  ? "Try adjusting your filters"
                  : "You're all caught up!"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                      !notification.is_read && "bg-muted/30 border-primary/20",
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.category, notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn("font-medium text-sm", !notification.is_read && "font-semibold")}>
                              {notification.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", getNotificationBadgeColor(notification.type))}
                            >
                              {getCategoryDisplayName(notification.category)}
                            </Badge>
                            {!notification.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                          </div>

                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{notification.message}</p>

                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <NotificationsPageContent />
    </DashboardLayout>
  )
}
