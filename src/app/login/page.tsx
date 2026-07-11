'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Step 1: look up the hidden email for this username
    const { data: email, error: lookupError } = await supabase
      .rpc('get_email_for_username', { input_username: username })

    if (lookupError) {
      setError('Something went wrong. Check your connection and try again.')
      setLoading(false)
      return
    }

    if (!email) {
      setError('Username not found.')
      setLoading(false)
      return
    }

    // Step 2: log in using that email + the password they typed
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError('Incorrect password.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-zinc-200 p-8">
        <h1 className="text-xl font-semibold text-zinc-900 mb-6">Clinic Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-zinc-600 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-clinic-red disabled:bg-zinc-100 disabled:text-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-clinic-red disabled:bg-zinc-100 disabled:text-zinc-400"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-2 rounded-lg bg-clinic-red text-white text-sm font-medium hover:bg-clinic-red-dark disabled:bg-zinc-400 transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  )
}