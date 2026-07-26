'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

type Expense = {
  id: string
  category: string
  amount: number
  method: string
  paid_at: string
  notes: string | null
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'vodafone_cash' | 'instapay'>('cash')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadExpenses() {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('id, category, amount, method, paid_at, notes')
      .order('paid_at', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!category.trim() || !amount || Number(amount) <= 0) {
      setError('Enter a category and a valid amount.')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('expenses').insert({
      category,
      amount: Number(amount),
      method,
      notes: notes || null,
      created_by: user?.id,
    })

    if (insertError) {
      setError('Failed to save expense.')
      setSaving(false)
      return
    }

    setCategory('')
    setAmount('')
    setNotes('')
    setSaving(false)
    await loadExpenses()
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Delete this expense?')
    if (!confirmed) return

    await supabase.from('expenses').delete().eq('id', id)
    await loadExpenses()
  }

  const monthTotal = expenses
    .filter((e) => e.paid_at.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="Expenses" accentColor="bg-green-600" backHref="/dashboard" />

      <div className="p-6 flex flex-col gap-4 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-sm font-medium text-zinc-900 mb-3">Add Expense</p>
          <form onSubmit={handleAddExpense} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Category (e.g. Rent, Utilities)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="px-2 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="cash">Cash</option>
                <option value="vodafone_cash">Vodafone Cash</option>
                <option value="instapay">InstaPay</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
            >
              {saving ? 'Saving...' : 'Add Expense'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-900">Recent Expenses</p>
            <p className="text-sm text-zinc-500">This month: ${monthTotal.toFixed(2)}</p>
          </div>

          {loading && <p className="text-sm text-zinc-400">Loading...</p>}
          {!loading && expenses.length === 0 && <p className="text-sm text-zinc-400">No expenses logged yet.</p>}

          <div className="flex flex-col gap-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="border border-zinc-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{expense.category}</p>
                  <p className="text-xs text-zinc-500">
                    {expense.paid_at} · {expense.method.replace('_', ' ')}
                    {expense.notes ? ` · ${expense.notes}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-zinc-900">${Number(expense.amount).toFixed(2)}</p>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-zinc-400 hover:text-red-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}