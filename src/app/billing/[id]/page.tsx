'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

type InvoiceDetail = {
  id: string
  total_due: number
  patient_name: string
  owner_name: string
  visit_date: string
}

type Payment = {
  id: string
  amount: number
  method: string
  paid_at: string
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const invoiceId = params.id as string
  const router = useRouter()

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vodafone_cash' | 'instapay'>('cash')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadInvoice = useCallback(async () => {
    setLoading(true)

    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('id, total_due, visit_id')
      .eq('id', invoiceId)
      .single()

    if (invoiceData) {
      const { data: visitData } = await supabase
        .from('visits')
        .select('visit_date, patient_id')
        .eq('id', invoiceData.visit_id)
        .single()

      if (visitData) {
        const { data: patientData } = await supabase
          .from('patients')
          .select('name, client_id')
          .eq('id', visitData.patient_id)
          .single()

        if (patientData) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('name')
            .eq('id', patientData.client_id)
            .single()

          setInvoice({
            id: invoiceData.id,
            total_due: invoiceData.total_due,
            visit_date: visitData.visit_date,
            patient_name: patientData.name,
            owner_name: clientData?.name || '—',
          })
        }
      }
    }

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('id, amount, method, paid_at')
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: false })

    setPayments(paymentsData || [])
    setLoading(false)
  }, [invoiceId])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = (invoice?.total_due || 0) - totalPaid

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) {
      setError('Enter a valid payment amount.')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount,
      method: paymentMethod,
      created_by: user?.id,
    })

    if (insertError) {
      setError('Failed to record payment.')
      setSaving(false)
      return
    }

    setPaymentAmount('')
    setSaving(false)
    await loadInvoice()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Invoice not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title={invoice.patient_name} accentColor="bg-green-600" backHref="/billing" />

      <div className="p-6 flex flex-col gap-4 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-xs text-zinc-500 mb-1">Owner</p>
          <p className="text-sm text-zinc-900 mb-4">{invoice.owner_name} · {invoice.visit_date}</p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Total Due</p>
              <p className="text-sm font-medium text-zinc-900">${Number(invoice.total_due).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Paid</p>
              <p className="text-sm font-medium text-zinc-900">${totalPaid.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Balance</p>
              <p className={`text-sm font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${balance.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="text-xs text-zinc-500 mb-2">Payment History</p>
          {payments.length === 0 && <p className="text-sm text-zinc-400 mb-2">No payments recorded yet.</p>}
          <div className="flex flex-col gap-1 mb-2">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm text-zinc-900">
                <span>{new Date(p.paid_at).toLocaleDateString()} · {p.method.replace('_', ' ')}</span>
                <span>${Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {balance > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
            <p className="text-sm font-medium text-zinc-900 mb-3">Record Payment</p>
            <form onSubmit={handleAddPayment} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder={`Up to $${balance.toFixed(2)}`}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="px-2 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="cash">Cash</option>
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="instapay">InstaPay</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setPaymentAmount(balance.toFixed(2))}
                className="text-xs text-green-600 hover:text-green-700 text-left"
              >
                Pay remaining balance in full
              </button>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
              >
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}