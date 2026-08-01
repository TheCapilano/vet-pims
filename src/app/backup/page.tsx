'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { rowsToCSV, downloadCSV } from '@/lib/csvExport'
import PageHeader from '@/components/PageHeader'
import { useRequireDoctor } from '@/lib/useRole'

const TABLES = [
  { name: 'clients', label: 'Clients' },
  { name: 'client_phones', label: 'Client Phone Numbers' },
  { name: 'patients', label: 'Patients' },
  { name: 'patient_history', label: 'Patient History' },
  { name: 'inventory', label: 'Inventory' },
  { name: 'visits', label: 'Visits' },
  { name: 'visit_items', label: 'Visit Items' },
  { name: 'invoices', label: 'Invoices' },
  { name: 'payments', label: 'Payments' },
  { name: 'expenses', label: 'Expenses' },
  { name: 'suppliers', label: 'Suppliers' },
  { name: 'supplier_bills', label: 'Supplier Bills' },
  { name: 'treatments', label: 'Treatments' },
]

export default function BackupPage() {
  const { checking, authorized } = useRequireDoctor()
  const [downloading, setDownloading] = useState(false)
  const [status, setStatus] = useState('')

  async function downloadTable(tableName: string, label: string) {
    const { data, error } = await supabase.from(tableName).select('*')
    if (error || !data || data.length === 0) {
      setStatus(`${label}: no data to export`)
      return
    }
    const csv = rowsToCSV(data)
    downloadCSV(`${tableName}_${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  async function downloadAll() {
    setDownloading(true)
    for (const table of TABLES) {
      setStatus(`Exporting ${table.label}...`)
      await downloadTable(table.name, table.label)
      // Small delay so the browser doesn't block rapid sequential downloads
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    setStatus('All exports complete. Check your Downloads folder.')
    setDownloading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <PageHeader title="Backup" accentColor="bg-green-600" backHref="/dashboard" />

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-lg">
          <p className="text-sm text-zinc-600 mb-4">
            Supabase's free tier doesn't back up your data automatically. Download a full CSV export
            regularly (weekly is a good habit) and save the files somewhere safe — a USB drive or
            your own Google Drive.
          </p>

          <button
            onClick={downloadAll}
            disabled={downloading}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-zinc-400 mb-4"
          >
            {downloading ? 'Exporting...' : 'Download Full Backup (All Tables)'}
          </button>

          {status && <p className="text-xs text-zinc-500 mb-4">{status}</p>}

          <p className="text-xs text-zinc-500 mb-2">Or export individual tables:</p>
          <div className="grid grid-cols-2 gap-2">
            {TABLES.map((table) => (
              <button
                key={table.name}
                onClick={() => downloadTable(table.name, table.label)}
                className="text-left text-xs px-3 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-700"
              >
                {table.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}