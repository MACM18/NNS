"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Cable, CheckCircle, AlertCircle, TrendingUp, Calendar, Plus, ArrowRight } from "lucide-react"

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to auth
  }

  const stats = [
    {
      title: "Total Lines",
      value: "1,234",
      change: "+12%",
      icon: Cable,
      color: "text-blue-600",
    },
    {
      title: "Active Tasks",
      value: "89",
      change: "+5%",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Pending Reviews",
      value: "23",
      change: "-8%",
      icon: AlertCircle,
      color: "text-orange-600",
    },
    {
      title: "Monthly Revenue",
      value: "₨2.4M",
      change: "+18%",
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ]

  const recentActivities = [
    {
      id: 1,
      action: "New line installation completed",
      location: "Karachi - Block A",
      time: "2 hours ago",
      status: "completed",
    },
    {
      id: 2,
      action: "Material inventory updated",
      location: "Warehouse - Main",
      time: "4 hours ago",
      status: "updated",
    },
    {
      id: 3,
      action: "Monthly invoice generated",
      location: "Lahore Region",
      time: "6 hours ago",
      status: "generated",
    },
    {
      id: 4,
      action: "Task assigned for review",
      location: "Islamabad - Sector G",
      time: "8 hours ago",
      status: "pending",
    },
  ]

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1">
          <Header />
          <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
              <div className="flex items-center space-x-2">
                <Button>
                  <Calendar className="mr-2 h-4 w-4" />
                  This Month
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className={stat.change.startsWith("+") ? "text-green-600" : "text-red-600"}>
                        {stat.change}
                      </span>{" "}
                      from last month
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              {/* Recent Activities */}
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>Latest updates from your telecom operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{activity.action}</p>
                          <p className="text-sm text-muted-foreground">{activity.location}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              activity.status === "completed"
                                ? "default"
                                : activity.status === "updated"
                                  ? "secondary"
                                  : activity.status === "generated"
                                    ? "outline"
                                    : "destructive"
                            }
                          >
                            {activity.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-between" variant="outline">
                    Add New Line Details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button className="w-full justify-between" variant="outline">
                    Generate Monthly Report
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button className="w-full justify-between" variant="outline">
                    Update Inventory
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button className="w-full justify-between" variant="outline">
                    Review Pending Tasks
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
