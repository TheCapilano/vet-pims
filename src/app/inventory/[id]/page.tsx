'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

export default function EditInventoryItemPage() {
  const params = useParams()
  const itemId = params.id as string
  const router = useRouter()

  const [itemName, setItemName] = useState('')
  const [stockQty, setStockQty] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [reorderThreshold, setReorderThreshold] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadItem() {
      const { data } = await supabase
        .from('inventory')
        .select('item_name, stock_qty, cost_price, sale_price, reorder_threshold')
        .eq('id', itemId)
        .single()

      if (data) {
        setItemName(data.item_name)
        setStockQty(String(data.stock_qty))
        setCostPrice(String(data.cost_price))
        setSalePrice(String(data.sale_price))
        setReorderThreshold(String(data.reorder_threshold))
      }
      setLoading(false)
    }

    loadItem()
  }, [itemId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        item_name: itemName,
        stock_qty: Number(stockQty) || 0,
        cost_price: Number(costPrice) || 0,
        sale_price: Number(salePrice) || 0,
        reorder_threshold: Number(reorderThreshold) || 0,
      })
      .eq('id', itemId)

    if (updateError) {
      setError('Failed to save changes.')
      setSaving(false)
      return
    }

    router.push('/inventory')
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${itemName}"? This cannot be undone.`)
    if (!confirmed) return

    const { error: deleteError } = await supabase.from('inventory').delete().eq('id', itemId)

    if (deleteError) {
      setError('Failed to delete item.')
      return
    }

    router.push('/inventory')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="Edit Item" accentColor="bg-amber-600" backHref="/inventory" />

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          <form onSubmit={handleSave} className="flex flex-col gap-4">
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
              className="py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="py-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
            >
              Delete Item
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}