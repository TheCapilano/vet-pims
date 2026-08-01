'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'
import { useRequireDoctor } from '@/lib/useRole'

type CashBalance = {
  method: string
  balance: number
}

type ProfitSummary = {
  revenue: number
  cogs: number
  gross_profit: number
  expenses_total: number
  net_profit: number
}

type TopItem = {
  item_name: string
  quantity_sold: number
  revenue: number
}

function firstOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function RevenuePage() {
  const { checking, authorized } = useRequireDoctor()

  const [cashBalances, setCashBalances] = useState<CashBalance[]>([])
  const [profit, setProfit] = useState<ProfitSummary | null>(null)
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [outstandingReceivable, setOutstandingReceivable] = useState(0)
  const [outstandingPayable, setOutstandingPayable] = useState(0)
  const [loading, setLoading] = useState(true)

  const [startDate, setStartDate] = useState(firstOfMonth())
  const [endDate, setEndDate] = useState(todayISO())

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: cashData } = await supabase.rpc('get_cash_balances')
    setCashBalances(cashData || [])

    const { data: profitData } = await supabase
      .rpc('get_profit_summary', { start_date: startDate, end_date: endDate })
    if (profitData && profitData.length > 0) {
      setProfit(profitData[0])
    }

    const { data: topItemsData } = await supabase
      .rpc('get_top_selling_items', { start_date: startDate, end_date: endDate })
    setTopItems(topItemsData || [])

    const { data: balancesData } = await supabase.rpc('get_outstanding_balances')
    const totalReceivable = (balancesData || []).reduce((sum: number, b: { balance: number }) => sum + Number(b.balance), 0)
    setOutstandingReceivable(totalReceivable)

    const { data: payablesData } = await supabase
      .from('supplier_bills')
      .select('amount')
      .eq('status', 'unpaid')
    const totalPayable = (payablesData || []).reduce((sum, b) => sum + Number(b.amount), 0)
    setOutstandingPayable(totalPayable)

    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    if (authorized) {
      loadData()
    }
  }, [authorized, loadData])

  function methodLabel(method: string) {
    if (method === 'vodafone_cash') return 'Vodafone Cash'
    if (method === 'instapay') return 'InstaPay'
    return 'Cash'
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="Revenue & Cash" accentColor="bg-green-600" backHref="/dashboard" />

      <div className="p-6 flex flex-col gap-4 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-sm font-medium text-zinc-900 mb-3">Cash on Hand (all time)</p>
          {loading && <p className="text-sm text-zinc-400">Loading...</p>}
          <div className="grid grid-cols-3 gap-3">
            {cashBalances.map((cb) => (
              <div key={cb.method} className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">{methodLabel(cb.method)}</p>
                <p className="text-lg font-semibold text-zinc-900">${Number(cb.balance).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-900">Revenue &amp; Profit</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border border-zinc-300 rounded text-xs text-zinc-900"
              />
              <span className="text-xs text-zinc-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 border border-zinc-300 rounded text-xs text-zinc-900"
              />
            </div>
          </div>

          {profit && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">Revenue</p>
                <p className="text-lg font-semibold text-zinc-900">${Number(profit.revenue).toFixed(2)}</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">Gross Profit</p>
                <p className="text-lg font-semibold text-zinc-900">${Number(profit.gross_profit).toFixed(2)}</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">Net Profit</p>
                <p className="text-lg font-semibold text-zinc-900">${Number(profit.net_profit).toFixed(2)}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-zinc-400 mt-2">
            Cost of goods: ${profit ? Number(profit.cogs).toFixed(2) : '0.00'} · Expenses: ${profit ? Number(profit.expenses_total).toFixed(2) : '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-sm font-medium text-zinc-900 mb-1">Top Selling Items</p>
          <p className="text-xs text-zinc-400 mb-3">Same date range as above</p>
          {topItems.length === 0 && <p className="text-sm text-zinc-400">No sales in this period.</p>}
          <div className="flex flex-col gap-2">
            {topItems.map((item, i) => (
              <div key={item.item_name} className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 w-4">{i + 1}</span>
                  <span className="text-sm text-zinc-900">{item.item_name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-900">${Number(item.revenue).toFixed(2)}</p>
                  <p className="text-xs text-zinc-400">{item.quantity_sold} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
            <p className="text-xs text-zinc-500 mb-1">Owed to you (clients)</p>
            <p className="text-lg font-semibold text-red-600">${outstandingReceivable.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
            <p className="text-xs text-zinc-500 mb-1">You owe (suppliers)</p>
            <p className="text-lg font-semibold text-amber-600">${outstandingPayable.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}