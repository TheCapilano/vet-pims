'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type VisitLogEntry = {
  visit_id: string
  patient_name: string
  owner_name: string
  doctor_name: string | null
  visit_time: string
  total: number
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function VisitsLogPage() {
  const [date, setDate] = useState(todayISO())
  const [visits, setVisits] = useState<VisitLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadVisits = useCallback(async (targetDate: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .rpc('get_visits_for_date', { target_date: targetDate })
    if (!error && data) {
      setVisits(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadVisits(date)
  }, [date, loadVisits])

  const dayTotal = visits.reduce((sum, v) => sum + Number(v.total), 0)

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="bg-blue-600 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-white/80 hover:text-white">
          ← Back
        </Link>
        <h1 className="text-white font-semibold text-lg">Visit Log</h1>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <Link
              href="/visits/new"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + New Visit
            </Link>
          </div>

          {loading && <p className="text-sm text-zinc-400">Loading...</p>}
          {!loading && visits.length === 0 && (
            <p className="text-sm text-zinc-400">No visits logged for this date.</p>
          )}

          <div className="flex flex-col gap-2 mb-4">
            {visits.map((visit) => (
              <div
                key={visit.visit_id}
                className="border border-zinc-200 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{visit.patient_name}</p>
                  <p className="text-xs text-zinc-500">
                    Owner: {visit.owner_name} · Dr. {visit.doctor_name || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-900">${Number(visit.total).toFixed(2)}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(visit.visit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {visits.length > 0 && (
            <div className="flex justify-between items-baseline pt-3 border-t border-zinc-200">
              <span className="text-sm text-zinc-600">Day total</span>
              <span className="text-lg font-semibold text-zinc-900">${dayTotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}