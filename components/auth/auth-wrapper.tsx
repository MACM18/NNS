"use client"

import { useState } from "react"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"

export function AuthWrapper() {
  const [isLogin, setIsLogin] = useState(true)

  const switchToRegister = () => setIsLogin(false)
  const switchToLogin = () => setIsLogin(true)

  return (
    <>
      {isLogin ? <LoginForm onSwitchToRegister={switchToRegister} /> : <RegisterForm onSwitchToLogin={switchToLogin} />}
    </>
  )
}
