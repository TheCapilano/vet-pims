'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type PhoneEntry = {
  phone_number: string
  type: 'call' | 'whatsapp'
  label: string
}

export default function NewClientPage() {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phones, setPhones] = useState<PhoneEntry[]>([
    { phone_number: '', type: 'whatsapp', label: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  function addPhoneField() {
    setPhones([...phones, { phone_number: '', type: 'whatsapp', label: '' }])
  }

  function updatePhone(index: number, field: keyof PhoneEntry, value: string) {
    const updated = [...phones]
    updated[index] = { ...updated[index], [field]: value }
    setPhones(updated)
  }

  function removePhone(index: number) {
    setPhones(phones.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    setSaving(true)

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ name, address: address || null })
      .select()
      .single()

    if (clientError || !client) {
      setError('Failed to save client.')
      setSaving(false)
      return
    }

    const validPhones = phones.filter((p) => p.phone_number.trim())
    if (validPhones.length > 0) {
      const { error: phoneError } = await supabase
        .from('client_phones')
        .insert(
          validPhones.map((p) => ({
            client_id: client.id,
            phone_number: p.phone_number,
            type: p.type,
            label: p.label || null,
          }))
        )

      if (phoneError) {
        setError('Client saved, but phone numbers failed to save.')
        setSaving(false)
        return
      }
    }

    router.push('/clients')
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="bg-teal-600 px-6 py-4 flex items-center gap-4">
        <Link href="/clients" className="text-sm text-white/80 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-lg">Add New Client</h1>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-zinc-600 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">Address (optional)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-2">Phone Numbers</label>
              <div className="flex flex-col gap-2">
                {phones.map((phone, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Phone number"
                      value={phone.phone_number}
                      onChange={(e) => updatePhone(i, 'phone_number', e.target.value)}
                      className="flex-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <select
                      value={phone.type}
                      onChange={(e) => updatePhone(i, 'type', e.target.value)}
                      className="px-2 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="call">Call</option>
                    </select>
                    {phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhone(i)}
                        className="text-zinc-400 hover:text-red-600 px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addPhoneField}
                className="mt-2 text-sm text-teal-600 hover:text-teal-700"
              >
                + Add another number
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400"
            >
              {saving ? 'Saving...' : 'Save Client'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}