"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/router"

interface AuthContextType {
  isAuthenticated: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
})

export const AuthProvider: React.FC = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Simulate authentication check
    const token = localStorage.getItem("authToken")
    if (token) {
      setIsAuthenticated(true)
    } else {
      router.push("/dashboard") // Updated redirect logic
    }
  }, [router])

  const login = () => {
    localStorage.setItem("authToken", "someToken")
    setIsAuthenticated(true)
    router.push("/dashboard") // Updated redirect logic
  }

  const logout = () => {
    localStorage.removeItem("authToken")
    setIsAuthenticated(false)
    router.push("/dashboard") // Updated redirect logic
  }

  return <AuthContext.Provider value={{ isAuthenticated, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
