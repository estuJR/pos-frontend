"use client"

import { useState, useEffect } from "react"
import { LoginScreen } from "@/components/login-screen"
import { POSScreen } from "@/components/pos-screen"
import { SupervisorPanel } from "@/components/supervisor-panel"
import { SwitchEmployeeModal } from "@/components/switch-employee-modal"

export type UserRole = "supervisor" | "empleado"

export interface User {
  id?: number
  name: string
  role: UserRole
  pin?: string
}

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  image?: string
}

export interface TableOrder {
  tableNumber: number
  items: OrderItem[]
  status: "activa" | "para_pagar" | "pagada"
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  // supervisorMode: cuando el supervisor quiere ver el panel en lugar del POS
  const [supervisorMode, setSupervisorMode] = useState(true)

  useEffect(() => {
    fetch(`${API}/auth/users`)
      .then(res => res.json())
      .then(data => { if (data.success) setUsers(data.data) })
      .catch(() => {
        setUsers([
          { name: "Carlos Supervisor", role: "supervisor", pin: "1234" },
          { name: "María Empleada",    role: "empleado",   pin: "1111" },
          { name: "Juan Empleado",     role: "empleado",   pin: "2222" },
          { name: "Ana Empleada",      role: "empleado",   pin: "3333" },
        ])
      })
  }, [])

  const handleLogin = async (role: UserRole, pin: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, pin }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem("pos_token", data.token)
        setCurrentUser(data.user)
        // Supervisor entra al panel por defecto
        setSupervisorMode(data.user.role === "supervisor")
        return true
      }
      return false
    } catch {
      const user = users.find(u => u.role === role && u.pin === pin)
      if (user) {
        setCurrentUser(user)
        setSupervisorMode(user.role === "supervisor")
        return true
      }
      return false
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("pos_token")
    setCurrentUser(null)
  }

  const handleSwitchEmployee = (user: User) => {
    setCurrentUser(user)
    setSupervisorMode(user.role === "supervisor")
    setShowSwitchModal(false)
  }

  const employeesOnly = users.filter(u => u.role === "empleado")

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />
  }

  // Supervisor en modo panel
  if (currentUser.role === "supervisor" && supervisorMode) {
    return (
      <SupervisorPanel
        user={currentUser}
        onLogout={handleLogout}
        onGoToPOS={() => setSupervisorMode(false)}
      />
    )
  }

  // POS normal (empleados y supervisor que quiere usar el POS)
  return (
    <>
      <POSScreen
        user={currentUser}
        onLogout={handleLogout}
        onSwitchEmployee={() => setShowSwitchModal(true)}
        onGoToPanel={currentUser.role === "supervisor" ? () => setSupervisorMode(true) : undefined}
      />
      {showSwitchModal && (
        <SwitchEmployeeModal
          employees={employeesOnly}
          currentUser={currentUser}
          onSwitch={handleSwitchEmployee}
          onClose={() => setShowSwitchModal(false)}
        />
      )}
    </>
  )
}