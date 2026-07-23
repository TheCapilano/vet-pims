'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

type Balance = {
  invoice_id: string
  patient_name: string
  owner_name: string
  client_id: string
  visit_date: string
  total_due: number
  amount_paid: number
  balance: number
}

export default function BillingPage() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)

  async function loadBalances() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_outstanding_balances')
    if (!error && data) setBalances(data)
    setLoading(false)
  }

  useEffect(() => {
    loadBalances()
  }, [])

  const totalOutstanding = balances.reduce((sum, b) => sum + Number(b.balance), 0)

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="Outstanding Balances" accentColor="bg-green-600" backHref="/dashboard" />

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          {loading && <p className="text-sm text-zinc-400">Loading...</p>}
          {!loading && balances.length === 0 && (
            <p className="text-sm text-zinc-400">No outstanding balances. Everyone's paid up.</p>
          )}

          <div className="flex flex-col gap-2 mb-4">
            {balances.map((b) => (
              <Link
                key={b.invoice_id}
                href={`/billing/${b.invoice_id}`}
                className="block border border-zinc-200 rounded-lg p-3 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{b.patient_name}</p>
                    <p className="text-xs text-zinc-500">Owner: {b.owner_name} · {b.visit_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">${Number(b.balance).toFixed(2)}</p>
                    <p className="text-xs text-zinc-400">of ${Number(b.total_due).toFixed(2)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {balances.length > 0 && (
            <div className="flex justify-between items-baseline pt-3 border-t border-zinc-200">
              <span className="text-sm text-zinc-600">Total outstanding</span>
              <span className="text-lg font-semibold text-red-600">${totalOutstanding.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}