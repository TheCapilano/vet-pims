'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

type PatientResult = {
  patient_id: string
  patient_name: string
  species: string | null
  client_id: string
  owner_name: string
}

type InventoryItem = {
  id: string
  item_name: string
  sale_price: number
}

type LineItem = {
  inventory_id: string
  item_name: string
  quantity: number
  price: number
}

export default function NewVisitPage() {
  const router = useRouter()

  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<PatientResult[]>([])
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)

  const [inventorySearch, setInventorySearch] = useState('')
  const [inventoryResults, setInventoryResults] = useState<InventoryItem[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  const [complaint, setComplaint] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')

  const [logTreatment, setLogTreatment] = useState(false)
  const [treatmentType, setTreatmentType] = useState('')
  const [intervalDays, setIntervalDays] = useState('')

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vodafone_cash' | 'instapay'>('cash')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  const searchPatients = useCallback(async (term: string) => {
    if (!term.trim()) {
      setPatientResults([])
      return
    }
    const { data, error } = await supabase
      .rpc('search_patients_for_visit', { search_term: term })
    if (!error && data) {
      setPatientResults(data)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => searchPatients(patientSearch), 300)
    return () => clearTimeout(timeoutId)
  }, [patientSearch, searchPatients])

  useEffect(() => {
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole(data?.role || null)
    }
    loadRole()
  }, [])

  const searchInventory = useCallback(async (term: string) => {
    if (!term.trim()) {
      setInventoryResults([])
      return
    }
    const { data } = await supabase
      .from('inventory')
      .select('id, item_name, sale_price')
      .ilike('item_name', `%${term}%`)
      .limit(10)
    setInventoryResults(data || [])
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => searchInventory(inventorySearch), 300)
    return () => clearTimeout(timeoutId)
  }, [inventorySearch, searchInventory])

  function addLineItem(item: InventoryItem) {
    setLineItems([
      ...lineItems,
      { inventory_id: item.id, item_name: item.item_name, quantity: 1, price: item.sale_price },
    ])
    setInventorySearch('')
    setInventoryResults([])
  }

  function updateLineItem(index: number, field: 'quantity' | 'price', value: number) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.price, 0)

  async function handleCheckout() {
    if (!selectedPatient) {
      setError('Select a patient first.')
      return
    }
    if (lineItems.length === 0) {
      setError('Add at least one item.')
      return
    }

    setError('')
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert({
        patient_id: selectedPatient.patient_id,
        doctor_id: user?.id,
        notes: notes || null,
      })
      .select()
      .single()

    if (visitError || !visit) {
      setError('Failed to create visit.')
      setSaving(false)
      return
    }

    const { error: itemsError } = await supabase.from('visit_items').insert(
      lineItems.map((item) => ({
        visit_id: visit.id,
        inventory_id: item.inventory_id,
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
      }))
    )

    if (itemsError) {
      setError('Visit created, but items failed to save.')
      setSaving(false)
      return
    }

    // Create the invoice, auto-calculated from the line items total
    const { data: invoice, error: invoiceError } = await supabase
      .rpc('create_invoice',{p_visit_id: visit.id, p_total_due: total})

    if (invoiceError) {
      console.error('Failed to create invoice:', invoiceError.message)
    }

    // Record the payment taken at checkout, if any was entered
    const paidNow = Number(paymentAmount) || 0
    if (invoice && paidNow > 0) {
      const { error: paymentError } = await supabase.from('payments').insert({
        invoice_id: invoice.Id,
        amount: paidNow,
        method: paymentMethod,
        created_by: user?.id,
      })
      if (paymentError) {
        console.error('Failed to record payment:', paymentError.message)
      }
    }

    // Auto-log this visit into the patient's history
    const medicationsSummary = lineItems
      .map((item) => `${item.item_name} x${item.quantity}`)
      .join(', ')

    const { error: historyError } = await supabase.from('patient_history').insert({
      patient_id: selectedPatient.patient_id,
      complaint: complaint || null,
      diagnosis: diagnosis || null,
      medications: medicationsSummary || null,
      notes: notes || null,
    })

    if (historyError) {
      console.error('Failed to log history:', historyError.message)
    }

    // Log a treatment with a follow-up due date, if specified
    if (logTreatment && treatmentType.trim() && intervalDays !== '' && Number(intervalDays) >= 0) {
      const { error: treatmentError } = await supabase.from('treatments').insert({
        patient_id: selectedPatient.patient_id,
        treatment_type: treatmentType,
        interval_days: Number(intervalDays),
      })
      if (treatmentError) {
        console.error('Failed to log treatment:', treatmentError.message)
      }
    }

    router.push(`/clients/${selectedPatient.client_id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="New Visit" accentColor="bg-blue-600" backHref="/dashboard" />

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          {!selectedPatient ? (
            <>
              <label className="block text-sm text-zinc-600 mb-1">Search Patient or Owner</label>
              <input
                type="text"
                placeholder="Pet name or owner name..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-3"
              />
              <div className="flex flex-col gap-2">
                {patientResults.map((patient) => (
                  <button
                    key={patient.patient_id}
                    onClick={() => setSelectedPatient(patient)}
                    className="text-left border border-zinc-200 rounded-lg p-3 hover:bg-zinc-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-zinc-900">{patient.patient_name}</p>
                    <p className="text-xs text-zinc-500">{patient.species || '—'} · Owner: {patient.owner_name}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{selectedPatient.patient_name}</p>
                  <p className="text-xs text-zinc-500">{selectedPatient.species || '—'} · Owner: {selectedPatient.owner_name}</p>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs text-zinc-400 hover:text-red-600"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">Complaint</label>
                  <input
                    type="text"
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-600 mb-1">Diagnosis</label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="mb-3 p-3 bg-zinc-50 rounded-lg">
                <label className="flex items-center gap-2 text-sm text-zinc-700 mb-2">
                  <input
                    type="checkbox"
                    checked={logTreatment}
                    onChange={(e) => setLogTreatment(e.target.checked)}
                  />
                  This visit includes a treatment with a follow-up due date
                </label>
                {logTreatment && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Dewormer, Rabies booster"
                      value={treatmentType}
                      onChange={(e) => setTreatmentType(e.target.value)}
                      className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <input
                      type="number"
                      placeholder="Days until due"
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(e.target.value)}
                      className="w-32 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}
              </div>

              <label className="block text-sm text-zinc-600 mb-1">Add Item</label>
              <input
                type="text"
                placeholder="Search inventory..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-2"
              />
              {inventoryResults.length > 0 && (
                <div className="flex flex-col gap-1 mb-3">
                  {inventoryResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addLineItem(item)}
                      className="text-left text-sm text-zinc-900 px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      {item.item_name} — ${item.sale_price}
                    </button>
                  ))}
                </div>
              )}

              {lineItems.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2">
                      <span className="flex-1 text-sm text-zinc-900">{item.item_name}</span>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(i, 'quantity', Number(e.target.value))}
                        className="w-14 px-2 py-1 border border-zinc-300 rounded text-sm text-zinc-900"
                      />
                      <span className="text-xs text-zinc-400">×</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateLineItem(i, 'price', Number(e.target.value))}
                        disabled={userRole !== 'doctor'}
                        className="w-20 px-2 py-1 border border-zinc-300 rounded text-sm text-zinc-900"
                      />
                      <button
                        onClick={() => removeLineItem(i)}
                        className="text-zinc-400 hover:text-red-600 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-baseline mb-4 pt-2 border-t border-zinc-200">
                <span className="text-sm text-zinc-600">Total</span>
                <span className="text-xl font-semibold text-zinc-900">${total.toFixed(2)}</span>
              </div>

              <div className="mb-4 p-3 bg-zinc-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-zinc-600">Payment Received</label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(total.toFixed(2))}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    Pay in full
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                    className="px-2 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="cash">Cash</option>
                    <option value="vodafone_cash">Vodafone Cash</option>
                    <option value="instapay">InstaPay</option>
                  </select>
                </div>
                {Number(paymentAmount) < total && Number(paymentAmount) > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Remaining balance: ${(total - Number(paymentAmount)).toFixed(2)} — can be collected later via Billing
                  </p>
                )}
              </div>

              <textarea
                placeholder="Visit notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-3"
              />

              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

              <button
                onClick={handleCheckout}
                disabled={saving}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
              >
                {saving ? 'Saving...' : 'Check Out Patient'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}