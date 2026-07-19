'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
  address: string | null
}

type Phone = {
  id: string
  phone_number: string
  type: string
  label: string | null
}

type Patient = {
  id: string
  name: string
  species: string | null
  breed: string | null
}

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [phones, setPhones] = useState<Phone[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadClient() {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, address')
        .eq('id', clientId)
        .single()

      const { data: phoneData } = await supabase
        .from('client_phones')
        .select('id, phone_number, type, label')
        .eq('client_id', clientId)

      const { data: patientData } = await supabase
        .from('patients')
        .select('id, name, species, breed')
        .eq('client_id', clientId)

      setClient(clientData)
      setPhones(phoneData || [])
      setPatients(patientData || [])
      setLoading(false)
    }

    loadClient()
  }, [clientId])

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
      <div className="bg-teal-600 px-6 py-4 flex items-center gap-4">
        <Link href="/clients" className="text-sm text-white/80 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-lg">{client.name}</h1>
      </div>

      <div className="p-6 flex flex-col gap-4 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-xs text-zinc-500 mb-1">Address</p>
          <p className="text-sm text-zinc-900 mb-4">{client.address || '—'}</p>

          <p className="text-xs text-zinc-500 mb-1">Phone Numbers</p>
          {phones.length === 0 && <p className="text-sm text-zinc-400">None on file</p>}
          {phones.map((phone) => (
            <p key={phone.id} className="text-sm text-zinc-900">
              {phone.phone_number} <span className="text-xs text-zinc-400">({phone.type}{phone.label ? `, ${phone.label}` : ''})</span>
            </p>
          ))}
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