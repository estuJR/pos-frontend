"use client"

import { useState, useEffect } from "react"
import type { User, UserRole } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users, Plus, Trash2, LogOut, RefreshCw,
  Shield, User as UserIcon, Package, TrendingUp, Eye, EyeOff
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

interface SupervisorPanelProps {
  user: User
  onLogout: () => void
  onGoToPOS: () => void
}

interface Employee {
  id: number
  name: string
  role: UserRole
  pin_plain: string | null
  created_at: string
}

interface TableStat {
  id: number
  number: string
  name: string
  total_orders: number
  total_revenue: number
}

interface TopProduct {
  product_name: string
  total_sold: number
  total_revenue: number
}

interface InventoryProduct {
  id: number
  name: string
  stock: number | null
  min_stock: number
  is_available: boolean
  category: { name: string; color: string }
}

interface DayHistory {
  date: string
  total_revenue: number
  transaction_count: number
  avg_ticket: number
  table_stats: { table_name: string; revenue: number; order_count: number }[]
  top_products: { product_name: string; total_sold: number; revenue: number }[]
}

type Tab = "usuarios" | "estadisticas" | "inventario" | "historial"

export function SupervisorPanel({ user, onLogout, onGoToPOS }: SupervisorPanelProps) {
  const [tab, setTab] = useState<Tab>("usuarios")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [tableStats, setTableStats] = useState<TableStat[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [inventory, setInventory] = useState<InventoryProduct[]>([])
  const [history, setHistory] = useState<DayHistory[]>([])
  const [loading, setLoading] = useState(false)

  // Formulario nuevo usuario
  const [newName, setNewName] = useState("")
  const [newPin, setNewPin] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("empleado")
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")
  const [showPins, setShowPins] = useState(false)

  // Edición de stock
  const [editingStock, setEditingStock] = useState<number | null>(null)
  const [stockValue, setStockValue] = useState("")
  const [minStockValue, setMinStockValue] = useState("")

  // Historial: día expandido
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("pos_token") : ""
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users`, { headers })
      const data = await res.json()
      if (data.success) setEmployees(data.data)
    } catch {}
    setLoading(false)
  }

  const loadStats = async () => {
    setLoading(true)
    try {
      const [summaryRes, tablesRes, productsRes] = await Promise.all([
        fetch(`${API}/reports/summary?period=today`, { headers }),
        fetch(`${API}/reports/table-performance?period=today`, { headers }),
        fetch(`${API}/reports/top-products?period=today&limit=5`, { headers }),
      ])
      const s = await summaryRes.json()
      const t = await tablesRes.json()
      const p = await productsRes.json()
      if (s.success) setSummary(s.data)
      if (t.success) setTableStats(t.data)
      if (p.success) setTopProducts(p.data)
    } catch {}
    setLoading(false)
  }

  const loadInventory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/inventory`, { headers })
      const data = await res.json()
      if (data.success) setInventory(data.data)
    } catch {}
    setLoading(false)
  }

  const loadHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/reports/daily-history?months=2`, { headers })
      const data = await res.json()
      if (data.success) setHistory(data.data.reverse()) // más reciente primero
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (tab === "usuarios") loadEmployees()
    if (tab === "estadisticas") loadStats()
    if (tab === "inventario") loadInventory()
    if (tab === "historial") loadHistory()
  }, [tab])

  const handleCreateUser = async () => {
    setFormError("")
    setFormSuccess("")
    if (!newName.trim()) return setFormError("El nombre es requerido")
    if (!/^\d{4}$/.test(newPin)) return setFormError("El PIN debe ser exactamente 4 dígitos")
    try {
      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: newName.trim(), role: newRole, pin: newPin }),
      })
      const data = await res.json()
      if (data.success) {
        setFormSuccess(`✅ ${data.message}`)
        setNewName("")
        setNewPin("")
        setNewRole("empleado")
        loadEmployees()
      } else {
        setFormError(data.message)
      }
    } catch {
      setFormError("Error al conectar con el servidor")
    }
  }

  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar a ${name}?`)) return
    try {
      const res = await fetch(`${API}/users/${id}`, { method: "DELETE", headers })
      const data = await res.json()
      if (data.success) loadEmployees()
    } catch {}
  }

  const handleSaveStock = async (productId: number) => {
    try {
      await fetch(`${API}/inventory/${productId}/stock`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          stock: stockValue === "" ? null : parseInt(stockValue),
          min_stock: minStockValue === "" ? 5 : parseInt(minStockValue),
        }),
      })
      setEditingStock(null)
      loadInventory()
    } catch {}
  }

  const totalMes = history.reduce((sum, d) => sum + Number(d.total_revenue), 0)
  const promedioDia = history.length > 0 ? totalMes / history.length : 0

  const tabs = [
    { key: "usuarios",    label: "👥 Usuarios" },
    { key: "estadisticas", label: "📊 Hoy" },
    { key: "inventario",  label: "📦 Inventario" },
    { key: "historial",   label: "📅 Historial" },
  ]

  return (
    <div className="h-screen flex flex-col bg-[#E5A93D] overflow-hidden">
      {/* Header */}
      <header className="bg-[#B5673D] text-white px-3 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <div>
            <h1 className="font-bold text-sm">Panel Supervisor</h1>
            <p className="text-xs text-white/80">{user.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onGoToPOS} variant="ghost" size="sm"
            className="text-white hover:bg-white/20 h-8 px-2 text-xs">
            🍽️ Ir al POS
          </Button>
          <Button onClick={onLogout} variant="ghost" size="sm"
            className="text-white hover:bg-white/20 h-8 px-2 text-xs">
            <LogOut className="h-3.5 w-3.5 mr-1" /> Salir
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#F5C861] flex border-b border-[#B5673D]/30 flex-shrink-0">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t.key ? "bg-[#B5673D] text-white" : "text-[#3D2914] hover:bg-[#B5673D]/20"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">

        {/* ── USUARIOS ── */}
        {tab === "usuarios" && (
          <div className="space-y-4">
            <Card className="border-[#B5673D]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#3D2914] text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Nuevo Usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#5C3D1E]">Nombre</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ej: María García"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[#B5673D] bg-white text-[#3D2914] text-sm focus:outline-none focus:ring-2 focus:ring-[#B5673D]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#5C3D1E]">PIN (4 dígitos)</label>
                  <input value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234" type="password" maxLength={4}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[#B5673D] bg-white text-[#3D2914] text-sm focus:outline-none focus:ring-2 focus:ring-[#B5673D]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#5C3D1E]">Rol</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[#B5673D] bg-white text-[#3D2914] text-sm focus:outline-none">
                    <option value="empleado">Empleado</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>
                {formError && <p className="text-red-600 text-xs">{formError}</p>}
                {formSuccess && <p className="text-green-600 text-xs">{formSuccess}</p>}
                <Button onClick={handleCreateUser}
                  className="w-full bg-[#B5673D] hover:bg-[#8B4D2D] text-white">
                  <Plus className="h-4 w-4 mr-2" /> Crear Usuario
                </Button>
              </CardContent>
            </Card>

            <Card className="border-[#B5673D]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#3D2914] text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Usuarios Activos
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowPins(!showPins)}
                      className="text-[#B5673D] flex items-center gap-1 text-xs">
                      {showPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showPins ? "Ocultar PINs" : "Ver PINs"}
                    </button>
                    <button onClick={loadEmployees} className="text-[#B5673D]">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-[#5C3D1E] text-sm py-4">Cargando...</p>
                ) : (
                  <div className="space-y-2">
                    {employees.map((emp) => (
                      <div key={emp.id}
                        className="flex items-center justify-between bg-[#F5C861]/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          {emp.role === "supervisor"
                            ? <Shield className="h-4 w-4 text-[#C73E3E]" />
                            : <UserIcon className="h-4 w-4 text-[#B5673D]" />}
                          <div>
                            <p className="text-sm font-medium text-[#3D2914]">{emp.name}</p>
                            <p className="text-xs text-[#5C3D1E] capitalize">
                              {emp.role}
                              {showPins && emp.pin_plain && (
                                <span className="ml-2 font-mono bg-[#B5673D]/20 px-1 rounded">
                                  PIN: {emp.pin_plain}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {emp.role !== "supervisor" && (
                          <button onClick={() => handleDeleteUser(emp.id, emp.name)}
                            className="text-[#C73E3E] hover:bg-[#C73E3E]/10 p-1 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── ESTADÍSTICAS HOY ── */}
        {tab === "estadisticas" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[#3D2914] font-bold text-lg">Resumen del Día</h2>
              <button onClick={loadStats} className="text-[#B5673D]">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {summary && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-[#B5673D]">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-[#5C3D1E]">Ventas del día</p>
                    <p className="text-xl font-bold text-[#B5673D]">
                      Q{Number(summary.sales?.total_revenue || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-[#B5673D]">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-[#5C3D1E]">Transacciones</p>
                    <p className="text-xl font-bold text-[#B5673D]">
                      {summary.sales?.total_transactions || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {topProducts.length > 0 && (
              <Card className="border-[#B5673D]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#3D2914] text-sm">🏆 Más Vendidos Hoy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#B5673D] w-5">#{i + 1}</span>
                          <span className="text-sm text-[#3D2914]">{p.product_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-[#5C3D1E]">{p.total_sold} uds</span>
                          <p className="text-xs font-medium text-[#B5673D]">
                            Q{Number(p.total_revenue).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-[#B5673D]">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#3D2914] text-sm">🪑 Consumo por Mesa Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                {tableStats.filter(t => t.total_orders > 0).length === 0 ? (
                  <p className="text-center text-[#5C3D1E] text-sm py-2">Sin ventas hoy todavía</p>
                ) : (
                  <div className="space-y-2">
                    {tableStats
                      .filter(t => t.total_orders > 0)
                      .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
                      .map(t => (
                        <div key={t.id}
                          className="flex justify-between items-center bg-[#F5C861]/40 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-[#3D2914]">{t.name || `Mesa ${t.number}`}</p>
                            <p className="text-xs text-[#5C3D1E]">{t.total_orders} órdenes</p>
                          </div>
                          <p className="text-sm font-bold text-[#B5673D]">
                            Q{Number(t.total_revenue).toFixed(2)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── INVENTARIO ── */}
        {tab === "inventario" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-[#3D2914] font-bold text-lg">📦 Inventario</h2>
              <button onClick={loadInventory} className="text-[#B5673D]">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[#5C3D1E]">
              Toca un producto para ingresar su stock. El sistema lo irá restando con cada venta.
            </p>

            {loading ? (
              <p className="text-center text-[#5C3D1E] text-sm py-8">Cargando...</p>
            ) : (
              <div className="space-y-2">
                {inventory.map(product => {
                  const isLow = product.stock !== null && product.stock <= product.min_stock
                  const isEditing = editingStock === product.id
                  return (
                    <Card key={product.id}
                      className={`border ${isLow ? "border-red-400 bg-red-50" : "border-[#B5673D]"}`}>
                      <CardContent className="p-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-[#3D2914]">{product.name}</p>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-[#5C3D1E]">Stock actual</label>
                                <input
                                  type="number" min="0" value={stockValue}
                                  onChange={e => setStockValue(e.target.value)}
                                  placeholder="Ej: 50"
                                  className="w-full mt-1 px-2 py-1 rounded border border-[#B5673D] text-sm focus:outline-none focus:ring-1 focus:ring-[#B5673D]"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-[#5C3D1E]">Alerta mínima</label>
                                <input
                                  type="number" min="0" value={minStockValue}
                                  onChange={e => setMinStockValue(e.target.value)}
                                  placeholder="Ej: 5"
                                  className="w-full mt-1 px-2 py-1 rounded border border-[#B5673D] text-sm focus:outline-none focus:ring-1 focus:ring-[#B5673D]"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={() => handleSaveStock(product.id)}
                                size="sm" className="flex-1 bg-[#B5673D] hover:bg-[#8B4D2D] text-white text-xs h-7">
                                Guardar
                              </Button>
                              <Button onClick={() => setEditingStock(null)}
                                variant="outline" size="sm"
                                className="flex-1 border-[#B5673D] text-[#B5673D] text-xs h-7">
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between"
                            onClick={() => {
                              setEditingStock(product.id)
                              setStockValue(product.stock !== null ? String(product.stock) : "")
                              setMinStockValue(String(product.min_stock || 5))
                            }}>
                            <div>
                              <p className="text-sm font-medium text-[#3D2914]">{product.name}</p>
                              <p className="text-xs" style={{ color: product.category?.color || "#888" }}>
                                {product.category?.name}
                              </p>
                            </div>
                            <div className="text-right">
                              {product.stock === null ? (
                                <span className="text-xs text-[#5C3D1E] bg-[#F5C861]/50 px-2 py-0.5 rounded">
                                  Sin control
                                </span>
                              ) : isLow ? (
                                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                                  ⚠️ {product.stock} uds
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                  ✅ {product.stock} uds
                                </span>
                              )}
                              <p className="text-xs text-[#5C3D1E] mt-0.5">toca para editar</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab === "historial" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-[#3D2914] font-bold text-lg">📅 Historial de Ganancias</h2>
              <button onClick={loadHistory} className="text-[#B5673D]">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {history.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-[#B5673D]">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-[#5C3D1E]">Total período</p>
                    <p className="text-lg font-bold text-[#B5673D]">Q{totalMes.toFixed(2)}</p>
                    <p className="text-xs text-[#5C3D1E]">{history.length} días</p>
                  </CardContent>
                </Card>
                <Card className="border-[#B5673D]">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-[#5C3D1E]">Promedio/día</p>
                    <p className="text-lg font-bold text-[#B5673D]">Q{promedioDia.toFixed(2)}</p>
                    <p className="text-xs text-[#5C3D1E]">estimado mensual: Q{(promedioDia * 30).toFixed(0)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {loading ? (
              <p className="text-center text-[#5C3D1E] text-sm py-8">Cargando...</p>
            ) : history.length === 0 ? (
              <p className="text-center text-[#5C3D1E] text-sm py-8">No hay historial todavía</p>
            ) : (
              <div className="space-y-2">
                {history.map(day => (
                  <Card key={day.date}
                    className="border-[#B5673D] cursor-pointer"
                    onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-[#3D2914]">
                            {new Date(day.date + "T12:00:00").toLocaleDateString("es-GT", {
                              weekday: "short", day: "2-digit", month: "short", year: "numeric"
                            })}
                          </p>
                          <p className="text-xs text-[#5C3D1E]">
                            {day.transaction_count} transacciones · ticket prom. Q{Number(day.avg_ticket).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-[#B5673D]">
                            Q{Number(day.total_revenue).toFixed(2)}
                          </p>
                          <p className="text-xs text-[#5C3D1E]">{expandedDay === day.date ? "▲ cerrar" : "▼ detalle"}</p>
                        </div>
                      </div>

                      {expandedDay === day.date && (
                        <div className="mt-3 space-y-3 border-t border-[#B5673D]/20 pt-3">
                          {day.top_products?.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-[#5C3D1E] mb-1">Más vendidos:</p>
                              {day.top_products.slice(0, 3).map((p, i) => (
                                <div key={i} className="flex justify-between text-xs text-[#3D2914]">
                                  <span>{p.product_name}</span>
                                  <span>{p.total_sold} uds — Q{Number(p.revenue).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {day.table_stats?.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-[#5C3D1E] mb-1">Por mesa:</p>
                              {day.table_stats.map((t, i) => (
                                <div key={i} className="flex justify-between text-xs text-[#3D2914]">
                                  <span>{t.table_name}</span>
                                  <span>{t.order_count} órd. — Q{Number(t.revenue).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}