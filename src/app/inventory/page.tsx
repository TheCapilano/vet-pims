'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type InventoryItem = {
  id: string
  item_name: string
  stock_qty: number
  cost_price: number
  sale_price: number
  reorder_threshold: number
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInventory() {
      const { data } = await supabase
        .from('inventory')
        .select('id, item_name, stock_qty, cost_price, sale_price, reorder_threshold')
        .order('item_name')

      setItems(data || [])
      setLoading(false)
    }

    loadInventory()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="bg-amber-600 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-white/80 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-lg">Inventory</h1>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-zinc-900">Current Stock</p>
            <Link
              href="/inventory/new"
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              + Add Item
            </Link>
          </div>

          {loading && <p className="text-sm text-zinc-400">Loading...</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-zinc-400">No inventory items yet.</p>
          )}

          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const isLow = item.stock_qty <= item.reorder_threshold
              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-3 flex items-center justify-between ${
                    isLow ? 'border-amber-400 bg-amber-50' : 'border-zinc-200'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{item.item_name}</p>
                    <p className="text-xs text-zinc-500">
                      Cost ${item.cost_price} · Sale ${item.sale_price}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${isLow ? 'text-amber-700' : 'text-zinc-900'}`}>
                      {item.stock_qty} in stock
                    </p>
                    {isLow && (
                      <p className="text-xs text-amber-600">Low stock</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}