'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/PageHeader'

type ReminderRow = {
  treatment_id: string
  treatment_type: string
  next_due_date: string
  patient_name: string
  owner_name: string
  whatsapp_number: string | null
}

type SentRow = {
  treatment_id: string
  treatment_type: string
  next_due_date: string
  patient_name: string
  owner_name: string
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderRow[]>([])
  const [sentReminders, setSentReminders] = useState<SentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [daysAhead, setDaysAhead] = useState(2)

  const loadReminders = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_reminders_due', { days_ahead: daysAhead })
    setReminders(data || [])

    const { data: sentData } = await supabase.rpc('get_recently_sent_reminders')
    setSentReminders(sentData || [])

    setLoading(false)
  }, [daysAhead])

  useEffect(() => {
    loadReminders()
  }, [loadReminders])

  async function markSent(treatmentId: string) {
    await supabase.from('treatments').update({ reminder_sent: true }).eq('id', treatmentId)
    await loadReminders()
  }

  function buildWhatsAppLink(reminder: ReminderRow) {
    if (!reminder.whatsapp_number) return null
    const message = 'Hi! This is a reminder that ' + reminder.patient_name + ' is due for a ' + reminder.treatment_type + ' on ' + reminder.next_due_date + '. Reply to book a time!'
    let cleanPhone = reminder.whatsapp_number.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '20' + cleanPhone.slice(1)
    }
    return 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(message)
  }
  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="Reminders" accentColor="bg-emerald-600" backHref="/dashboard" />

      <div className="p-6 flex flex-col gap-4 max-w-lg">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-zinc-900">Due within</p>
            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="px-2 py-1 border border-zinc-300 rounded text-sm text-zinc-900"
            >
              <option value={2}>2 days</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          {loading && <p className="text-sm text-zinc-400">Loading...</p>}
          {!loading && reminders.length === 0 && (
            <p className="text-sm text-zinc-400">No reminders due in this window.</p>
          )}

          <div className="flex flex-col gap-2">
            {reminders.map((reminder) => {
              const link = buildWhatsAppLink(reminder)
              return (
                <div key={reminder.treatment_id} className="border border-zinc-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{reminder.patient_name}</p>
                      <p className="text-xs text-zinc-500">
                        {reminder.treatment_type} due {reminder.next_due_date} · Owner: {reminder.owner_name}
                      </p>
                    </div>
                    <button
                      onClick={() => markSent(reminder.treatment_id)}
                      className="text-xs text-zinc-400 hover:text-emerald-600"
                    >
                      Mark sent
                    </button>
                  </div>
                  {link !== null ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Send on WhatsApp
                    </a>
                  ) : (
                    <p className="text-xs text-zinc-400">No WhatsApp number on file — add one from the client's profile page</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <p className="text-sm font-medium text-zinc-900 mb-3">Recently Sent</p>
          {sentReminders.length === 0 && <p className="text-sm text-zinc-400">No reminders sent yet.</p>}
          <div className="flex flex-col gap-2">
            {sentReminders.map((r) => (
              <div key={r.treatment_id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-900">{r.patient_name} — {r.treatment_type}</span>
                <span className="text-zinc-500">{r.next_due_date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}