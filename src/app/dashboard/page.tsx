'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
      {/* Top bar — red accent, this page's assigned color */}
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

      {/* Content area — white cards on dark background */}
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 max-w-md">
          <p className="text-zinc-900 text-sm">More dashboard content coming in later phases.</p>
        </div>
      </div>
    </div>
  )
}