"use client"

import { CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, FileText, Users, Phone, Package, BookOpen } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AppSidebar from "@/components/layout/app-sidebar" // Corrected import
import { Header } from "@/components/layout/header"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { supabase } from "@/lib/supabase"
import { useDataCache } from "@/contexts/data-cache-context"
import { getSupabaseClient } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { Plus, RefreshCw } from "lucide-react"
import { AddTelephoneLineModal } from "@/components/modals/add-telephone-line-modal"
import { MonthYearPicker } from "@/components/ui/month-year-picker"

interface DashboardStats {
  totalLines: number
  activeTasks: number
  pendingReviews: number
  monthlyRevenue: number
  lineChange: number
  taskChange: number
  reviewChange: number
  revenueChange: number
}

interface RecentActivity {
  id: string
  action: string
  location: string
  time: string
  status: string
  created_at: string
}

export default async function DashboardPage() {
  const supabaseClient = getSupabaseClient()
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [openTelephoneLineModal, setOpenTelephoneLineModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { cache, updateCache } = useDataCache()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch counts for dashboard cards
  const { count: usersCount, error: usersError } = await supabase.from("profiles").select("*", { count: "exact" })
  const { count: jobVacanciesCount, error: jobsError } = await supabase
    .from("job_vacancies")
    .select("*", { count: "exact" })
  const { count: postsCount, error: postsError } = await supabase.from("posts").select("*", { count: "exact" })
  const { count: blogsCount, error: blogsError } = await supabase.from("blogs").select("*", { count: "exact" })

  if (usersError || jobsError || postsError || blogsError) {
    console.error("Error fetching dashboard counts:", usersError || jobsError || postsError || blogsError)
    // Handle error gracefully, maybe show a message or default counts
  }

  const stats = cache.dashboard?.stats || {
    totalLines: 0,
    activeTasks: 0,
    pendingReviews: 0,
    monthlyRevenue: 0,
    lineChange: 0,
    taskChange: 0,
    reviewChange: 0,
    revenueChange: 0,
  }

  const recentActivities = cache.dashboard?.activities || []
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    if (user && selectedDate) {
      const lastUpdated = cache.dashboard?.lastUpdated
      const cachedMonth = lastUpdated
        ? `${lastUpdated.getFullYear()}-${(lastUpdated.getMonth() + 1).toString().padStart(2, "0")}`
        : null
      const selectedMonth = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, "0")}`
      console.log(`Checking cache: selectedMonth=${selectedMonth}, cachedMonth=${cachedMonth}`)
      if (cachedMonth !== selectedMonth) {
        fetchDashboardData()
      }
    }
  }, [user, selectedDate])

  const fetchDashboardData = async () => {
    setIsRefreshing(true)
    try {
      const currentMonth = selectedDate.getMonth() + 1
      const currentYear = selectedDate.getFullYear()
      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear
      const currentMonthStartDate = `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`
      const currentMonthLastDay = new Date(currentYear, currentMonth, 0).getDate()
      const currentMonthEndDate = `${currentYear}-${currentMonth
        .toString()
        .padStart(2, "0")}-${currentMonthLastDay.toString().padStart(2, "0")}`
      const previousMonthStartDate = `${previousYear}-${previousMonth.toString().padStart(2, "0")}-01`
      const previousMonthLastDay = new Date(previousYear, previousMonth, 0).getDate()
      const previousMonthEndDate = `${previousYear}-${previousMonth
        .toString()
        .padStart(2, "0")}-${previousMonthLastDay.toString().padStart(2, "0")}`

      // Fetch total lines for selected month
      const { data: currentLines } = await supabase
        .from("line_details")
        .select("*")
        .gte("created_at", currentMonthStartDate)
        .lte("created_at", currentMonthEndDate)

      const { data: previousLines } = await supabase
        .from("line_details")
        .select("*")
        .gte("created_at", previousMonthStartDate)
        .lte("created_at", previousMonthEndDate)

      // Fetch active tasks for selected month
      const { data: currentTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "in_progress")
        .gte("created_at", currentMonthStartDate)
        .lte("created_at", currentMonthEndDate)

      const { data: previousTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "in_progress")
        .gte("created_at", previousMonthStartDate)
        .lte("created_at", previousMonthEndDate)

      // Fetch pending reviews for selected month
      const { data: currentReviews } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "pending")
        .gte("created_at", currentMonthStartDate)
        .lte("created_at", currentMonthEndDate)

      const { data: previousReviews } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "pending")
        .gte("created_at", previousMonthStartDate)
        .lte("created_at", currentMonthEndDate)
      // Fetch monthly revenue for selected month
      const { data: currentInvoices } = await supabase
        .from("generated_invoices")
        .select("total_amount")
        .gte("job_month", currentMonthStartDate)
        .lte("job_month", currentMonthEndDate)

      const { data: previousInvoices } = await supabase
        .from("generated_invoices")
        .select("total_amount")
        .gte("job_month", previousMonthStartDate)
        .lte("job_month", previousMonthEndDate)

      // Fetch recent activities
      const { data: activities } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      // Format recent activities
      const formattedActivities: RecentActivity[] =
        activities?.map((task) => ({
          id: task.id,
          action: `Task: ${task.telephone_no}`,
          location: task.address || "Unknown Location",
          time: formatTimeAgo(task.created_at),
          status: task.status,
          created_at: task.created_at,
        })) || []

      // Calculate stats and changes
      const totalLines = currentLines?.length || 0
      const activeTasks = currentTasks?.length || 0
      const pendingReviews = currentReviews?.length || 0
      const monthlyRevenue = currentInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

      const prevLines = previousLines?.length || 0
      const prevTasks = previousTasks?.length || 0
      const prevReviews = previousReviews?.length || 0
      const prevRevenue = previousInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

      const lineChange = prevLines > 0 ? ((totalLines - prevLines) / prevLines) * 100 : 0
      const taskChange = prevTasks > 0 ? ((activeTasks - prevTasks) / prevTasks) * 100 : 0
      const reviewChange = prevReviews > 0 ? ((pendingReviews - prevReviews) / prevReviews) * 100 : 0
      const revenueChange = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : 0

      updateCache("dashboard", {
        stats: {
          totalLines,
          activeTasks,
          pendingReviews,
          monthlyRevenue,
          lineChange,
          taskChange,
          reviewChange,
          revenueChange,
        },
        activities: formattedActivities,
        lastUpdated: new Date(),
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Less than an hour ago"
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(1)}%`
  }

  const dashboardStats = [
    {
      title: "Total Users",
      value: usersCount?.toLocaleString() || "N/A",
      icon: <Users className="h-5 w-5 text-blue-500" />,
      description: "Active users in the system",
    },
    {
      title: "Active Lines",
      value: stats.totalLines.toLocaleString(),
      change: formatChange(stats.lineChange),
      icon: <Phone className="h-5 w-5 text-green-500" />,
      description: "Currently active telephone lines",
    },
    {
      title: "Inventory Items",
      value: "5,120", // Mock data
      icon: <Package className="h-5 w-5 text-yellow-500" />,
      description: "Items in stock across all warehouses",
    },
    {
      title: "Invoices Generated",
      value: stats.monthlyRevenue.toLocaleString(),
      change: formatChange(stats.revenueChange),
      icon: <FileText className="h-5 w-5 text-purple-500" />,
      description: "Invoices processed this month",
    },
    {
      title: "Open Job Vacancies",
      value: jobVacanciesCount?.toLocaleString() || "N/A",
      icon: <Briefcase className="h-5 w-5 text-red-500" />,
      description: "Current job openings",
    },
    {
      title: "Published Blog Posts",
      value: blogsCount?.toLocaleString() || "N/A",
      icon: <BookOpen className="h-5 w-5 text-indigo-500" />,
      description: "Total blog articles published",
    },
  ]

  return (
    <DashboardLayout>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1">
          <Header />
          <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
              <div className="flex items-center space-x-2">
                <MonthYearPicker date={selectedDate} onDateChange={setSelectedDate} />
                <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button onClick={() => setOpenTelephoneLineModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dashboardStats.map((stat, index) => (
                <Card key={index} className="shadow-md hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    {stat.icon}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isRefreshing ? <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div> : stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Recent Activities */}
              <Card className="col-span-1 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>Latest updates from your telecom operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isRefreshing ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2"></div>
                          </div>
                          <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
                        </div>
                      ))
                    ) : recentActivities.length > 0 ? (
                      recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-4">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">{activity.action}</p>
                            <p className="text-sm text-muted-foreground">{activity.location}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={
                                activity.status === "completed"
                                  ? "bg-green-100 text-green-800 px-2 py-1 rounded"
                                  : activity.status === "in_progress"
                                    ? "bg-blue-100 text-blue-800 px-2 py-1 rounded"
                                    : activity.status === "pending"
                                      ? "bg-red-100 text-red-800 px-2 py-1 rounded"
                                      : "bg-gray-100 text-gray-800 px-2 py-1 rounded"
                              }
                            >
                              {activity.status}
                            </span>
                            <span className="text-xs text-muted-foreground">{activity.time}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No recent activities found</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="col-span-1 shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Perform common tasks quickly.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Link href="/lines">
                    <Button variant="outline" className="w-full bg-transparent">
                      Add New Line Details
                    </Button>
                  </Link>
                  <Link href="/reports">
                    <Button variant="outline" className="w-full bg-transparent">
                      Generate Monthly Report
                    </Button>
                  </Link>
                  <Link href="/inventory">
                    <Button variant="outline" className="w-full bg-transparent">
                      Update Inventory
                    </Button>
                  </Link>
                  <Link href="/tasks">
                    <Button variant="outline" className="w-full bg-transparent">
                      Review Pending Tasks
                    </Button>
                  </Link>
                  <Link href="/users/new">
                    <Button variant="outline" className="w-full bg-transparent">
                      Add New User
                    </Button>
                  </Link>
                  <Link href="/careers/new">
                    <Button variant="outline" className="w-full bg-transparent">
                      Post New Job
                    </Button>
                  </Link>
                  <Link href="/content/new-post">
                    <Button variant="outline" className="w-full bg-transparent">
                      Create New Post
                    </Button>
                  </Link>
                  <Link href="/inventory/add-item">
                    <Button variant="outline" className="w-full bg-transparent">
                      Add Inventory Item
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
      <AddTelephoneLineModal
        open={openTelephoneLineModal}
        onOpenChange={setOpenTelephoneLineModal}
        onSuccess={() => {
          setOpenTelephoneLineModal(false)
          fetchDashboardData() // Refresh data after adding new line
        }}
      />
    </DashboardLayout>
  )
}
