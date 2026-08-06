'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

type ClientResult = {
  client_id: string
  name: string
  address: string | null
  phone_numbers: string[] | null
  patient_names: string[] | null
}

function SearchBox({
  label,
  onSelect,
  selected,
}: {
  label: string
  onSelect: (c: ClientResult) => void
  selected: ClientResult | null
}) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<ClientResult[]>([])

  const search = useCallback(async (t: string) => {
    if (!t.trim()) {
      setResults([])
      return
    }
    const { data } = await supabase.rpc('search_clients', { search_term: t })
    setResults(data || [])
  }, [])

  return (
    <div>
      <p className="text-sm font-medium text-zinc-900 mb-2">{label}</p>
      {selected ? (
        <div className="border border-teal-600 bg-teal-50 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">{selected.name}</p>
            <p className="text-xs text-zinc-500">
              {(selected.phone_numbers || []).filter(Boolean).join(', ') || 'No phone'} ·{' '}
              {(selected.patient_names || []).filter(Boolean).join(', ') || 'No pets'}
            </p>
          </div>
          <button onClick={() => onSelect(null as unknown as ClientResult)} className="text-xs text-zinc-400">
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Search by name, phone, or pet..."
            value={term}
            onChange={(e) => {
              setTerm(e.target.value)
              search(e.target.value)
            }}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600 mb-2"
          />
          <div className="flex flex-col gap-1">
            {results.map((r) => (
              <button
                key={r.client_id}
                onClick={() => onSelect(r)}
                className="text-left border border-zinc-200 rounded-lg p-2 hover:bg-zinc-50"
              >
                <p className="text-sm text-zinc-900">{r.name}</p>
                <p className="text-xs text-zinc-500">
                  {(r.phone_numbers || []).filter(Boolean).join(', ') || 'No phone'} ·{' '}
                  {(r.patient_names || []).filter(Boolean).join(', ') || 'No pets'}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function MergeClientsPage() {
  const [keep, setKeep] = useState<ClientResult | null>(null)
  const [remove, setRemove] = useState<ClientResult | null>(null)
  const [merging, setMerging] = useState(false)
  const [status, setStatus] = useState('')

  async function handleMerge() {
    if (!keep || !remove) return
    if (keep.client_id === remove.client_id) {
      setStatus('Pick two different clients.')
      return
    }

    const confirmed = window.confirm(
      `Move all phones and pets from "${remove.name}" into "${keep.name}", then delete "${remove.name}"? This cannot be undone.`
    )
    if (!confirmed) return

    setMerging(true)

    await supabase.from('client_phones').update({ client_id: keep.client_id }).eq('client_id', remove.client_id)
    await supabase.from('patients').update({ client_id: keep.client_id }).eq('client_id', remove.client_id)

    if (!keep.address && remove.address) {
      await supabase.from('clients').update({ address: remove.address }).eq('id', keep.client_id)
    }

    const { error } = await supabase.from('clients').delete().eq('id', remove.client_id)

    if (error) {
      setStatus('Something went wrong — check the console.')
      console.error(error)
    } else {
      setStatus(`Merged successfully. "${remove.name}" is gone; everything now lives under "${keep.name}".`)
      setKeep(null)
      setRemove(null)
    }

    setMerging(false)
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="Merge Duplicate Clients" accentColor="bg-teal-600" backHref="/clients" />

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg flex flex-col gap-4">
          <p className="text-xs text-zinc-500">
            Pick the client to KEEP and the duplicate to MERGE AWAY. All phones and pets move to the kept client, then the duplicate is deleted.
          </p>

          <SearchBox label="Keep this one" onSelect={setKeep} selected={keep} />
          <SearchBox label="Merge away this one" onSelect={setRemove} selected={remove} />

          {status && <p className="text-sm text-teal-700">{status}</p>}

          <button
            onClick={handleMerge}
            disabled={!keep || !remove || merging}
            className="py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
          >
            {merging ? 'Merging...' : 'Merge Clients'}
          </button>
        </div>
      </div>
    </div>
  )
}