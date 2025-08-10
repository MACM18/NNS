import { LayoutDashboard, Building2 } from "icons"
import { useLocation } from "react-router-dom"

const AppSidebar = () => {
  const location = useLocation()
  const pathname = location.pathname
  const user = null // Placeholder for user data

  const data = {
    user: {
      name: user?.email || "User",
      email: user?.email || "",
      avatar: "/placeholder-user.jpg",
    },
    teams: [
      {
        name: "NNS Enterprise",
        logo: Building2,
        plan: "Enterprise",
      },
    ],
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard", // Changed from "/"
        icon: LayoutDashboard,
        isActive: pathname === "/dashboard", // Changed from "/"
      },
      // ... rest of the navigation items remain the same
    ],
  }

  return <div>{/* Sidebar content here */}</div>
}

export default AppSidebar
