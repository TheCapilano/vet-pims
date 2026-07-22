'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type ClientResult = {
  client_id: string
  name: string
  address: string | null
  phone_numbers: string[]
  patient_names: string[]
}

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<ClientResult[]>([])
  const [searching, setSearching] = useState(false)

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([])
      return
    }

    setSearching(true)
    const { data, error } = await supabase
      .rpc('search_clients', { search_term: term })

    if (!error && data) {
      setResults(data)
    }
    setSearching(false)
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      runSearch(searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, runSearch])

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault()
    runSearch(searchTerm)
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="bg-teal-600 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-white/80 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-lg">Clients</h1>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          <form onSubmit={handleManualSearch} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search by name, phone, or pet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
            >
              {searching ? '...' : 'Search'}
            </button>
          </form>

          {searching && (
            <p className="text-sm text-zinc-400 mb-2">Searching...</p>
          )}

          {!searching && results.length === 0 && searchTerm && (
            <p className="text-sm text-zinc-500 mb-2">No matches. You can add this as a new client below.</p>
          )}

          <div className="flex flex-col gap-2">
            {results.map((client) => (
              <Link
                key={client.client_id}
                href={`/clients/${client.client_id}`}
                className="block border border-zinc-200 rounded-lg p-3 hover:bg-zinc-50 transition-colors"
              >
                <p className="text-sm font-medium text-zinc-900">{client.name}</p>
                <p className="text-xs text-zinc-500">
                  {(client.phone_numbers || []).filter(Boolean).join(', ') || 'No phone on file'}
                </p>
                {(client.patient_names || []).filter(Boolean).length > 0 && (
                  <p className="text-xs text-teal-600 mt-0.5">
                    Pets: {(client.patient_names || []).filter(Boolean).join(', ')}
                  </p>
                )}
              </Link>
            ))}
          </div>

          <Link
            href="/clients/new"
            className="mt-4 block text-center py-2 border border-teal-600 text-teal-600 hover:bg-teal-50 text-sm font-medium rounded-lg transition-colors"
          >
            + Add New Client
          </Link>
        </div>
      </div>
    </div>
  )
}