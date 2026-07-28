'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

type Client = { id: string; name: string; address: string | null }
type Phone = { id: string; phone_number: string; type: string; label: string | null }
type Patient = { id: string; name: string; species: string | null; breed: string | null }

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [phones, setPhones] = useState<Phone[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null)
  const [editPhoneNumber, setEditPhoneNumber] = useState('')
  const [editPhoneType, setEditPhoneType] = useState<'call' | 'whatsapp'>('call')
  const [newPhoneNumber, setNewPhoneNumber] = useState('')
  const [newPhoneType, setNewPhoneType] = useState<'call' | 'whatsapp'>('whatsapp')

  useEffect(() => {
    async function loadClient() {
      const { data: clientData } = await supabase
        .from('clients').select('id, name, address').eq('id', clientId).single()
      const { data: phoneData } = await supabase
        .from('client_phones').select('id, phone_number, type, label').eq('client_id', clientId)
      const { data: patientData } = await supabase
        .from('patients').select('id, name, species, breed').eq('client_id', clientId)

      setClient(clientData)
      setPhones(phoneData || [])
      setPatients(patientData || [])
      setLoading(false)
    }

    loadClient()
  }, [clientId])

  async function reloadPhones() {
    const { data: phoneData } = await supabase
      .from('client_phones')
      .select('id, phone_number, type, label')
      .eq('client_id', clientId)
    setPhones(phoneData || [])
  }

  function startEditPhone(phone: Phone) {
    setEditingPhoneId(phone.id)
    setEditPhoneNumber(phone.phone_number)
    setEditPhoneType(phone.type as 'call' | 'whatsapp')
  }

  async function saveEditPhone() {
    if (!editingPhoneId) return
    await supabase
      .from('client_phones')
      .update({ phone_number: editPhoneNumber, type: editPhoneType })
      .eq('id', editingPhoneId)
    setEditingPhoneId(null)
    await reloadPhones()
  }

  async function deletePhone(phoneId: string) {
    const confirmed = window.confirm('Delete this phone number?')
    if (!confirmed) return
    await supabase.from('client_phones').delete().eq('id', phoneId)
    await reloadPhones()
  }

  async function addPhone() {
    if (!newPhoneNumber.trim()) return
    await supabase.from('client_phones').insert({
      client_id: clientId,
      phone_number: newPhoneNumber,
      type: newPhoneType,
    })
    setNewPhoneNumber('')
    await reloadPhones()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Client not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title={client.name} accentColor="bg-teal-600" backHref="/clients" />

      <div className="p-6 flex flex-col gap-4 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-xs text-zinc-500 mb-1">Address</p>
          <p className="text-sm text-zinc-900 mb-4">{client.address || '—'}</p>

          <p className="text-xs text-zinc-500 mb-1">Phone Numbers</p>
          {phones.length === 0 && <p className="text-sm text-zinc-400 mb-2">None on file</p>}
          {phones.map((phone) => (
            <div key={phone.id} className="mb-2">
              {editingPhoneId === phone.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="flex-1 px-2 py-1 border border-zinc-300 rounded text-sm text-zinc-900"
                  />
                  <select
                    value={editPhoneType}
                    onChange={(e) => setEditPhoneType(e.target.value as 'call' | 'whatsapp')}
                    className="px-2 py-1 border border-zinc-300 rounded text-sm text-zinc-900"
                  >
                    <option value="call">Call</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                  <button onClick={saveEditPhone} className="text-xs text-teal-600">Save</button>
                  <button onClick={() => setEditingPhoneId(null)} className="text-xs text-zinc-400">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-900">
                    {phone.phone_number} <span className="text-xs text-zinc-400">({phone.type}{phone.label ? `, ${phone.label}` : ''})</span>
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => startEditPhone(phone)} className="text-xs text-teal-600">Edit</button>
                    <button onClick={() => deletePhone(phone.id)} className="text-xs text-red-500">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-100">
            <input
              type="text"
              placeholder="Add phone number"
              value={newPhoneNumber}
              onChange={(e) => setNewPhoneNumber(e.target.value)}
              className="flex-1 px-2 py-1 border border-zinc-300 rounded text-sm text-zinc-900"
            />
            <select
              value={newPhoneType}
              onChange={(e) => setNewPhoneType(e.target.value as 'call' | 'whatsapp')}
              className="px-2 py-1 border border-zinc-300 rounded text-sm text-zinc-900"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="call">Call</option>
            </select>
            <button onClick={addPhone} className="text-xs text-teal-600 whitespace-nowrap">+ Add</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-sm font-medium text-zinc-900 mb-3">Pets</p>
          {patients.length === 0 && <p className="text-sm text-zinc-400 mb-3">No pets on file yet.</p>}
          <div className="flex flex-col gap-2 mb-3">
            {patients.map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="block border border-zinc-200 rounded-lg p-3 hover:bg-zinc-50 transition-colors"
              >
                <p className="text-sm font-medium text-zinc-900">{patient.name}</p>
                <p className="text-xs text-zinc-500">{[patient.species, patient.breed].filter(Boolean).join(' · ') || '—'}</p>
              </Link>
            ))}
          </div>
          <Link
            href={`/clients/${clientId}/patients/new`}
            className="block text-center py-2 border border-teal-600 text-teal-600 hover:bg-teal-50 text-sm font-medium rounded-lg transition-colors"
          >
            + Add Pet
          </Link>
        </div>
      </div>
    </div>
  )
}