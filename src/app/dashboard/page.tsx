'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', user.id)
        .single()

      setProfile(data)
    }

    loadProfile()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="bg-clinic-red px-6 py-4 flex items-center justify-between">
        <h1 className="text-white font-semibold text-lg">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-white text-sm">{profile.name} · {profile.role}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
          <Link
            href="/clients"
            className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-teal-600 transition-colors"
          >
            <p className="text-teal-600 text-sm font-medium">Clients & Patients</p>
            <p className="text-zinc-400 text-xs mt-1">Search or add clients</p>
          </Link>



          <Link
            href="/visits"
            className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-blue-600 transition-colors"
          >
            <p className="text-blue-600 text-sm font-medium">Visits</p>
            <p className="text-zinc-400 text-xs mt-1">Today's visit log</p>
          </Link>

          <Link
            href="/reminders"
            className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-emerald-600 transition-colors"
          >
            <p className="text-emerald-600 text-sm font-medium">Reminders</p>
            <p className="text-zinc-400 text-xs mt-1">Treatments due soon</p>
          </Link>

          <Link
            href="/billing"
            className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-green-600 transition-colors"
          >
            <p className="text-green-600 text-sm font-medium">Billing</p>
            <p className="text-zinc-400 text-xs mt-1">Outstanding balances</p>
          </Link>

          {profile.role === 'doctor' && (
            <>

              <Link
                href="/inventory"
                className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-amber-600 transition-colors"
              >
                <p className="text-amber-600 text-sm font-medium">Inventory</p>
                <p className="text-zinc-400 text-xs mt-1">Stock & low-stock alerts</p>
              </Link>
              
              <Link
                href="/expenses"
                className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-green-600 transition-colors"
              >
                <p className="text-green-600 text-sm font-medium">Expenses</p>
                <p className="text-zinc-400 text-xs mt-1">Rent, utilities & more</p>
              </Link>

              <Link
                href="/suppliers"
                className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-green-600 transition-colors"
              >
                <p className="text-green-600 text-sm font-medium">Suppliers</p>
                <p className="text-zinc-400 text-xs mt-1">Bills you owe</p>
              </Link>

              <Link
                href="/revenue"
                className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-green-600 transition-colors"
              >
                <p className="text-green-600 text-sm font-medium">Revenue & Cash</p>
                <p className="text-zinc-400 text-xs mt-1">Profit, balances & payables</p>
              </Link>

              <Link
                href="/backup"
                className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:border-green-600 transition-colors"
              >
                <p className="text-green-600 text-sm font-medium">Backup</p>
                <p className="text-zinc-400 text-xs mt-1">Export your data</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}