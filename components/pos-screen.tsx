"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import type { User, OrderItem, TableOrder } from "@/app/page"
import { Button } from "@/components/ui/button"
import {
  LogOut,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  GlassWater,
  IceCream,
  Check,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  CreditCard,
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

interface POSScreenProps {
  user: User
  onLogout: () => void
  onSwitchEmployee: () => void
  onGoToPanel?: () => void
}

const MENU_DATA = {
  comida: [
    { id: "gringa", name: "Gringa", price: 21.0, image: "/images/gringa.jpg" },
    { id: "refa", name: "Refa", price: 15.0, image: "/images/refa.jpg" },
    { id: "quesadilla", name: "Quesadilla", price: 10.0, image: "/images/quesadilla.jpg" },
    { id: "alambre", name: "Alambre", price: 31.0, image: "/images/alambre.jpg" },
    { id: "taqueso", name: "Taqueso", price: 20.0, image: "/images/taqueso.jpg" },
    { id: "porcion2tacos", name: "Porción de 2 Tacos", price: 25.0, image: "/images/tacos.jpg" },
    { id: "tacoindividual", name: "Taco Individual", price: 14.0, image: "/images/taco-individual.jpg" },
  ],
  bebidas: [
    { id: "gaseosas", name: "Gaseosas", price: 10.0, image: "/images/gaseosa.jpg" },
    { id: "aguapura", name: "Agua Pura", price: 10.0, image: "/images/agua.jpg" },
    { id: "licuadopeq", name: "Licuado Pequeño", price: 15.0, image: "/images/licuado.jpg" },
    { id: "licuadogde", name: "Licuado Grande", price: 18.0, image: "/images/licuado.jpg" },
    { id: "cimarrona", name: "Cimarrona", price: 25.0, image: "/images/cimarrona.jpg" },
    { id: "mineralprep", name: "Mineral Preparada", price: 30.0, image: "/images/mineral-preparada.jpg" },
    { id: "tefrio", name: "Te Frío", price: 15.0, image: "/images/te-frio.jpg" },
    { id: "mineral", name: "Mineral", price: 10.0, image: "/images/mineral.jpg" },
  ],
  postres: [
    { id: "crepanutella", name: "Crepa de Nutella", price: 25.0, image: "/images/crepa-nutella.jpg" },
    { id: "crepanutellafrut", name: "Crepa Nutella y Frutas", price: 35.0, image: "/images/crepa-nutella-frutas.jpg" },
    { id: "bolahelado", name: "Bola de Helado", price: 6.0, image: "/images/helado.jpg" },
  ],
}

const CATEGORIES = [
  { key: "comida", label: "Comida", icon: UtensilsCrossed },
  { key: "bebidas", label: "Bebidas", icon: GlassWater },
  { key: "postres", label: "Postres", icon: IceCream },
] as const

type Screen = "tables" | "menu" | "checkout"

// Mapa de id_key a product_id en la base de datos
const PRODUCT_ID_MAP: Record<string, number> = {}

export function POSScreen({ user, onLogout, onSwitchEmployee, onGoToPanel }: POSScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("tables")
  const [categoryIndex, setCategoryIndex] = useState(0)
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [tableOrders, setTableOrders] = useState<Record<number, TableOrder>>({})
  const [clickedItem, setClickedItem] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [orderIds, setOrderIds] = useState<Record<number, number>>({}) // tableNumber -> orderId en BD
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeCategory = CATEGORIES[categoryIndex]
  const currentOrder = selectedTable ? tableOrders[selectedTable] : null
  const CategoryIcon = activeCategory.icon
  const totalItems = currentOrder?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
  const totalPrice = currentOrder?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0

  // Cargar productos de la BD para obtener sus IDs reales
  useEffect(() => {
    fetch(`${API}/menu/products?available_only=true`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          data.data.forEach((p: any) => {
            if (p.id_key) PRODUCT_ID_MAP[p.id_key] = p.id
          })
        }
      })
      .catch(() => {})
  }, [])

  const goToNextCategory = () => setCategoryIndex(prev => (prev + 1) % CATEGORIES.length)
  const goToPrevCategory = () => setCategoryIndex(prev => (prev - 1 + CATEGORIES.length) % CATEGORIES.length)

  const selectTable = (tableNum: number) => {
    setSelectedTable(tableNum)
    setCategoryIndex(0)
    setCurrentScreen("menu")
  }

  const addItem = (item: { id: string; name: string; price: number; image: string }) => {
    if (!selectedTable) return
    setClickedItem(item.id)
    setTimeout(() => setClickedItem(null), 200)

    setTableOrders(prev => {
      const existing = prev[selectedTable] || {
        tableNumber: selectedTable,
        items: [],
        status: "activa" as const,
      }
      const existingItemIndex = existing.items.findIndex(i => i.id === item.id)
      if (existingItemIndex >= 0) {
        const newItems = [...existing.items]
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + 1,
        }
        return { ...prev, [selectedTable]: { ...existing, items: newItems } }
      }
      return {
        ...prev,
        [selectedTable]: {
          ...existing,
          items: [...existing.items, { ...item, quantity: 1, category: activeCategory.key }],
        },
      }
    })
  }

  const updateItemQuantity = (itemId: string, delta: number) => {
    if (!selectedTable) return
    setTableOrders(prev => {
      const existing = prev[selectedTable]
      if (!existing) return prev
      const newItems = existing.items
        .map(item => item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
        .filter(item => item.quantity > 0)
      if (newItems.length === 0) {
        const { [selectedTable]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [selectedTable]: { ...existing, items: newItems } }
    })
  }

  const removeItem = (itemId: string) => {
    if (!selectedTable) return
    setTableOrders(prev => {
      const existing = prev[selectedTable]
      if (!existing) return prev
      const newItems = existing.items.filter(item => item.id !== itemId)
      if (newItems.length === 0) {
        const { [selectedTable]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [selectedTable]: { ...existing, items: newItems } }
    })
  }

  // Guardar orden y pago en la base de datos
  const completePayment = async () => {
    if (!selectedTable || !currentOrder || currentOrder.items.length === 0) return
    setProcessing(true)

    try {
      const token = localStorage.getItem("pos_token")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      // Buscar la mesa en la BD por número
      const tablesRes = await fetch(`${API}/orders/tables`, { headers })
      const tablesData = await tablesRes.json()
      const table = tablesData.data?.find((t: any) => t.number === String(selectedTable))
      const tableId = table?.id || null

      // Preparar items con product_id real de la BD
      const items = currentOrder.items.map(item => ({
        product_id: ({ gringa: 1, refa: 2, quesadilla: 3, alambre: 4, taqueso: 5, porcion2tacos: 6, tacoindividual: 7, gaseosas: 8, aguapura: 9, licuadopeq: 10, licuadogde: 11, cimarrona: 12, mineralprep: 13, tefrio: 14, mineral: 15, crepanutella: 16, crepanutellafrut: 17, bolahelado: 18 } as Record<string,number>)[item.id] || 1,
        quantity: item.quantity,
        notes: null,
      }))

      // Crear la orden en la BD
      const orderRes = await fetch(`${API}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          table_id: tableId,
          type: "dine_in",
          items,
          customer_count: 1,
        }),
      })
      const orderData = await orderRes.json()

      if (orderData.success) {
        const orderId = orderData.data.id
        const total = parseFloat(orderData.data.total)

        // Procesar el pago
        await fetch(`${API}/payments`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            order_id: orderId,
            method: "cash",
            amount_paid: total,
          }),
        })
      }
    } catch (err) {
      console.error("Error al guardar orden:", err)
    }

    // Limpiar estado local
    setTableOrders(prev => {
      const { [selectedTable]: _, ...rest } = prev
      return rest
    })
    setSelectedTable(null)
    setCategoryIndex(0)
    setCurrentScreen("tables")
    setProcessing(false)
  }

  const getTableTotal = (tableNum: number) => {
    const order = tableOrders[tableNum]
    return order?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
  }

  const goToTables = () => {
    setCategoryIndex(0)
    setCurrentScreen("tables")
  }

  return (
    <div className="h-screen flex flex-col bg-[#E5A93D] overflow-hidden">
      {/* Header */}
      <header className="bg-[#B5673D] text-white px-3 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20pantalla%202026-03-16%20a%20la%28s%29%204.57.42%E2%80%AFp.%C2%A0m.-GNN97ECZah8oBuwyg4QJsUGeewX9cX.png"
            alt="El Jardín de los Conejos"
            width={36}
            height={36}
            className="rounded-full bg-white"
          />
          <div>
            <h1 className="font-bold text-sm leading-tight">El Jardín de los Conejos</h1>
            <p className="text-xs text-white/80">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {user.role === "supervisor" && onGoToPanel && (
            <Button
              onClick={onGoToPanel}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 px-2 text-xs"
            >
              📊 Panel
            </Button>
          )}
          {user.role === "empleado" && (
            <Button
              onClick={onSwitchEmployee}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 px-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Cambiar</span>
            </Button>
          )}
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-8 px-2 text-xs"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Tables Screen */}
        <div className={`h-full flex flex-col p-3 ${currentScreen === "tables" ? "block" : "hidden"}`}>
          <div className="mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-[#3D2914]">Seleccionar Mesa</h2>
            <p className="text-[#5C3D1E] text-sm">Toca una mesa para comenzar</p>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                const hasOrder = !!tableOrders[num]
                const tableTotal = getTableTotal(num)
                return (
                  <button
                    key={num}
                    onClick={() => selectTable(num)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center active:scale-95 shadow-md ${
                      hasOrder ? "bg-[#B5673D] text-white" : "bg-[#F5C861] text-[#3D2914]"
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl font-bold">{num}</span>
                    {hasOrder && (
                      <span className="text-xs mt-1 bg-white/20 px-2 py-0.5 rounded-full">
                        Q{tableTotal.toFixed(2)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Menu Screen */}
        <div className={`h-full flex flex-col ${currentScreen === "menu" ? "flex" : "hidden"}`}>
          <div className="bg-[#F5C861] px-3 py-2 flex items-center justify-between flex-shrink-0">
            <button onClick={goToTables} className="flex items-center gap-1 text-[#3D2914] font-medium text-sm active:scale-95">
              <ChevronLeft className="w-4 h-4" /> Mesas
            </button>
            <div className="bg-[#B5673D] text-white px-3 py-1.5 rounded-full font-bold text-sm">
              Mesa {selectedTable}
            </div>
            <button onClick={() => setCurrentScreen("checkout")} className="relative flex items-center gap-1 text-[#3D2914] font-medium active:scale-95">
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C73E3E] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px]">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          <div className="bg-[#E5A93D] px-3 py-2 flex-shrink-0">
            <div className="flex items-center justify-between max-w-sm mx-auto">
              <button onClick={goToPrevCategory} className="w-9 h-9 rounded-full bg-[#B5673D] text-white flex items-center justify-center active:scale-95 shadow">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <CategoryIcon className="w-5 h-5 text-[#3D2914]" />
                <span className="text-lg font-bold text-[#3D2914]">{activeCategory.label}</span>
              </div>
              <button onClick={goToNextCategory} className="w-9 h-9 rounded-full bg-[#B5673D] text-white flex items-center justify-center active:scale-95 shadow">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {CATEGORIES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCategoryIndex(index)}
                  className={`w-2 h-2 rounded-full ${index === categoryIndex ? "bg-[#B5673D] scale-125" : "bg-[#B5673D]/40"}`}
                />
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-auto p-3 bg-[#F5C861]/50">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {MENU_DATA[activeCategory.key].map(item => {
                const isClicked = clickedItem === item.id
                const orderItem = currentOrder?.items.find(i => i.id === item.id)
                const quantity = orderItem?.quantity || 0
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className={`bg-white rounded-xl overflow-hidden shadow-md active:scale-95 ${
                      isClicked ? "ring-2 ring-[#C73E3E]" : ""
                    } ${quantity > 0 && !isClicked ? "ring-2 ring-[#B5673D]" : ""}`}
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                      />
                      {quantity > 0 && (
                        <div className="absolute top-1 right-1 bg-[#B5673D] text-white w-6 h-6 rounded-full flex items-center justify-center font-bold shadow text-xs">
                          {quantity}
                        </div>
                      )}
                      {isClicked && (
                        <div className="absolute inset-0 bg-[#C73E3E]/30 flex items-center justify-center">
                          <div className="bg-[#C73E3E] text-white w-10 h-10 rounded-full flex items-center justify-center">
                            <Plus className="w-5 h-5" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-left">
                      <h3 className="font-medium text-[#3D2914] text-xs leading-tight truncate">{item.name}</h3>
                      <span className="inline-block mt-1 bg-[#B5673D] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        Q{item.price.toFixed(2)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {totalItems > 0 && (
            <div className="bg-[#B5673D] px-3 py-3 flex items-center justify-between flex-shrink-0">
              <div className="text-white">
                <span className="text-xs opacity-80">{totalItems} productos</span>
                <p className="text-lg font-bold">Q{totalPrice.toFixed(2)}</p>
              </div>
              <Button
                onClick={() => setCurrentScreen("checkout")}
                className="bg-white text-[#B5673D] hover:bg-white/90 font-bold px-4 py-2 h-auto text-sm rounded-full shadow active:scale-95"
              >
                Ver Cuenta
              </Button>
            </div>
          )}
        </div>

        {/* Checkout Screen */}
        <div className={`h-full flex flex-col ${currentScreen === "checkout" ? "flex" : "hidden"}`}>
          <div className="bg-[#F5C861] px-3 py-2 flex items-center justify-between flex-shrink-0">
            <button onClick={() => setCurrentScreen("menu")} className="flex items-center gap-1 text-[#3D2914] font-medium text-sm active:scale-95">
              <ChevronLeft className="w-4 h-4" /> Menú
            </button>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#3D2914]" />
              <span className="font-bold text-[#3D2914] text-sm">Cuenta Mesa {selectedTable}</span>
            </div>
            <div className="w-14" />
          </div>

          <div className="flex-1 overflow-auto p-3 bg-[#F5C861]/50">
            {!currentOrder || currentOrder.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#5C3D1E]">
                <ShoppingBag className="w-16 h-16 mb-3 opacity-40" />
                <p className="text-lg font-medium mb-1">La cuenta está vacía</p>
                <p className="text-sm opacity-70 mb-4">Agrega productos desde el menú</p>
                <Button
                  onClick={() => setCurrentScreen("menu")}
                  className="bg-[#B5673D] text-white hover:bg-[#8B4D2D] font-medium px-4 py-2 h-auto rounded-full text-sm"
                >
                  Ir al Menú
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {currentOrder.items.map(item => (
                  <div key={item.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    {item.image && (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#3D2914] text-sm truncate">{item.name}</h3>
                      <p className="text-[#B5673D] font-medium text-xs">Q{item.price.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateItemQuantity(item.id, -1)} className="w-7 h-7 rounded-full bg-[#F5C861] text-[#3D2914] flex items-center justify-center active:scale-95">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-[#3D2914] text-sm">{item.quantity}</span>
                      <button onClick={() => updateItemQuantity(item.id, 1)} className="w-7 h-7 rounded-full bg-[#F5C861] text-[#3D2914] flex items-center justify-center active:scale-95">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-full bg-[#C73E3E]/10 text-[#C73E3E] flex items-center justify-center active:scale-95">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="text-right min-w-[60px]">
                      <p className="font-bold text-[#3D2914] text-sm">Q{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentOrder && currentOrder.items.length > 0 && (
            <div className="bg-white border-t-2 border-[#B5673D] p-3 flex-shrink-0">
              <div className="flex justify-between items-center mb-1 text-[#5C3D1E] text-sm">
                <span>Productos</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-bold text-[#3D2914]">Total</span>
                <span className="text-2xl font-bold text-[#B5673D]">Q{totalPrice.toFixed(2)}</span>
              </div>
              <Button
                onClick={completePayment}
                disabled={processing}
                className="w-full bg-[#B5673D] hover:bg-[#8B4D2D] text-white h-11 text-base font-bold rounded-xl shadow active:scale-98"
              >
                <Check className="w-5 h-5 mr-2" />
                {processing ? "Procesando..." : "Confirmar Pago"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}