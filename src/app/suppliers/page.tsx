'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

type Supplier = {
  id: string
  name: string
  contact_info: string | null
}

type Bill = {
  id: string
  supplier_id: string
  amount: number
  due_date: string | null
  status: string
  method: string | null
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [paidBills, setPaidBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)

  const [supplierName, setSupplierName] = useState('')
  const [contactInfo, setContactInfo] = useState('')

  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDueDate, setBillDueDate] = useState('')

  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    const { data: supplierData } = await supabase.from('suppliers').select('id, name, contact_info').order('name')
    const { data: billData } = await supabase
      .from('supplier_bills')
      .select('id, supplier_id, amount, due_date, status, method')
      .eq('status', 'unpaid')
      .order('due_date')

    const { data: paidBillData } = await supabase
      .from('supplier_bills')
      .select('id, supplier_id, amount, due_date, status, method')
      .eq('status', 'paid')
      .order('due_date', { ascending: false })
      .limit(10)

    setSuppliers(supplierData || [])
    setBills(billData || [])
    setPaidBills(paidBillData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierName.trim()) {
      setError('Supplier name required.')
      return
    }
    setError('')
    await supabase.from('suppliers').insert({ name: supplierName, contact_info: contactInfo || null })
    setSupplierName('')
    setContactInfo('')
    await loadData()
  }

  async function handleAddBill(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSupplierId || !billAmount || Number(billAmount) <= 0) {
      setError('Select a supplier and enter a valid amount.')
      return
    }
    setError('')
    await supabase.from('supplier_bills').insert({
      supplier_id: selectedSupplierId,
      amount: Number(billAmount),
      due_date: billDueDate || null,
    })
    setBillAmount('')
    setBillDueDate('')
    await loadData()
  }

  async function markPaid(billId: string, method: 'cash' | 'vodafone_cash' | 'instapay') {
    await supabase
      .from('supplier_bills')
      .update({ status: 'paid', method, paid_at: new Date().toISOString().split('T')[0] })
      .eq('id', billId)
    await loadData()
  }

  function supplierNameFor(id: string) {
    return suppliers.find((s) => s.id === id)?.name || '—'
  }

  const totalOwed = bills.reduce((sum, b) => sum + Number(b.amount), 0)

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="Suppliers" accentColor="bg-green-600" backHref="/dashboard" />

      <div className="p-6 flex flex-col gap-4 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-sm font-medium text-zinc-900 mb-3">Add Supplier</p>
          <form onSubmit={handleAddSupplier} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Supplier name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <input
                type="text"
                placeholder="Contact (optional)"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <button
              type="submit"
              className="py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add Supplier
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-sm font-medium text-zinc-900 mb-3">Log a Bill</p>
          <form onSubmit={handleAddBill} className="flex flex-col gap-3">
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <input
                type="date"
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              className="py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Log Bill
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-900">Outstanding Bills</p>
            <p className="text-sm text-red-600 font-medium">${totalOwed.toFixed(2)}</p>
          </div>

          {loading && <p className="text-sm text-zinc-400">Loading...</p>}
          {!loading && bills.length === 0 && <p className="text-sm text-zinc-400">No outstanding bills.</p>}

          <div className="flex flex-col gap-2">
            {bills.map((bill) => (
              <div key={bill.id} className="border border-zinc-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{supplierNameFor(bill.supplier_id)}</p>
                    <p className="text-xs text-zinc-500">
                      Due {bill.due_date || '—'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-red-600">${Number(bill.amount).toFixed(2)}</p>
                </div>
                <div className="flex gap-1">
                  {(['cash', 'vodafone_cash', 'instapay'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => markPaid(bill.id, m)}
                      className="text-xs px-2 py-1 border border-zinc-300 rounded hover:bg-zinc-50 text-zinc-700"
                    >
                      Pay w/ {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-sm font-medium text-zinc-900 mb-3">Recently Paid</p>
          {paidBills.length === 0 && <p className="text-sm text-zinc-400">No paid bills yet.</p>}
          <div className="flex flex-col gap-2">
            {paidBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-900">{supplierNameFor(bill.supplier_id)}</span>
                <span className="text-zinc-500">
                  ${Number(bill.amount).toFixed(2)} · {bill.method?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}