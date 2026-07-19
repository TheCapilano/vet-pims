'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Patient = {
  id: string
  name: string
  species: string | null
  breed: string | null
  dob: string | null
  client_id: string
}

type Client = {
  id: string
  name: string
}

type HistoryEntry = {
  id: string
  complaint: string | null
  diagnosis: string | null
  medications: string | null
  notes: string | null
  entry_date: string
}

export default function PatientProfilePage() {
  const params = useParams()
  const patientId = params.id as string

  const [patient, setPatient] = useState<Patient | null>(null)
  const [owner, setOwner] = useState<Client | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPatient() {
      const { data: patientData } = await supabase
        .from('patients')
        .select('id, name, species, breed, dob, client_id')
        .eq('id', patientId)
        .single()

      if (patientData) {
        const { data: ownerData } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', patientData.client_id)
          .single()

        setOwner(ownerData)
      }

      const { data: historyData } = await supabase
        .from('patient_history')
        .select('id, complaint, diagnosis, medications, notes, entry_date')
        .eq('patient_id', patientId)
        .order('entry_date', { ascending: false })

      setPatient(patientData)
      setHistory(historyData || [])
      setLoading(false)
    }

    loadPatient()
  }, [patientId])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Patient not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="bg-teal-600 px-6 py-4 flex items-center gap-4">
        <Link href={owner ? `/clients/${owner.id}` : '/clients'} className="text-sm text-white/80 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-lg">{patient.name}</h1>
      </div>

      <div className="p-6 flex flex-col gap-4 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-xs text-zinc-500 mb-1">Owner</p>
          <p className="text-sm text-zinc-900 mb-4">{owner?.name || '—'}</p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Species</p>
              <p className="text-sm text-zinc-900">{patient.species || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Breed</p>
              <p className="text-sm text-zinc-900">{patient.breed || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">DOB</p>
              <p className="text-sm text-zinc-900">{patient.dob || '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-zinc-900">History</p>
            <Link
              href={`/patients/${patientId}/history/new`}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              + Add Entry
            </Link>
          </div>

          {history.length === 0 && (
            <p className="text-sm text-zinc-400">No history entries yet.</p>
          )}

          <div className="flex flex-col gap-3">
            {history.map((entry) => (
              <div key={entry.id} className="border-l-2 border-teal-600 pl-3">
                <p className="text-xs text-zinc-400 mb-1">{entry.entry_date}</p>
                {entry.complaint && <p className="text-sm text-zinc-900"><span className="text-zinc-500">Complaint:</span> {entry.complaint}</p>}
                {entry.diagnosis && <p className="text-sm text-zinc-900"><span className="text-zinc-500">Diagnosis:</span> {entry.diagnosis}</p>}
                {entry.medications && <p className="text-sm text-zinc-900"><span className="text-zinc-500">Medications:</span> {entry.medications}</p>}
                {entry.notes && <p className="text-sm text-zinc-900"><span className="text-zinc-500">Notes:</span> {entry.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}