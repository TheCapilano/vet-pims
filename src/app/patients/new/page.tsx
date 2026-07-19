'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function NewPatientPage() {
  const params = useParams()
  const clientId = params.id as string
  const router = useRouter()

  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [breed, setBreed] = useState('')
  const [dob, setDob] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Pet name is required.')
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase
      .from('patients')
      .insert({
        client_id: clientId,
        name,
        species: species || null,
        breed: breed || null,
        dob: dob || null,
      })

    if (insertError) {
      setError('Failed to save pet.')
      setSaving(false)
      return
    }

    router.push(`/clients/${clientId}`)
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="bg-teal-600 px-6 py-4 flex items-center gap-4">
        <Link href={`/clients/${clientId}`} className="text-sm text-white/80 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-lg">Add Pet</h1>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-zinc-600 mb-1">Pet Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Species</label>
              <input
                type="text"
                placeholder="e.g. Cat, Dog"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Breed (optional)</label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Date of Birth (optional)</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
            >
              {saving ? 'Saving...' : 'Save Pet'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}