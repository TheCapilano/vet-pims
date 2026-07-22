'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NewInventoryItemPage() {
  const [itemName, setItemName] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [reorderThreshold, setReorderThreshold] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!itemName.trim()) {
      setError('Item name is required.')
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase.from('inventory').insert({
      item_name: itemName,
      stock_qty: Number(stockQty) || 0,
      cost_price: Number(costPrice) || 0,
      sale_price: Number(salePrice) || 0,
      reorder_threshold: Number(reorderThreshold) || 0,
    })

    if (insertError) {
      setError('Failed to save item.')
      setSaving(false)
      return
    }

    router.push('/inventory')
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="bg-amber-600 px-6 py-4 flex items-center gap-4">
        <Link href="/inventory" className="text-sm text-white/80 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-lg">Add Inventory Item</h1>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-zinc-600 mb-1">Item Name</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Reorder Threshold</label>
                <input
                  type="number"
                  value={reorderThreshold}
                  onChange={(e) => setReorderThreshold(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Cost Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 mb-1">Sale Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
            >
              {saving ? 'Saving...' : 'Save Item'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
