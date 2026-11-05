
import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error

        setMessage('登録を受け付けました。確認メールが届いた場合は、メール内のリンクを開いてください。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-brand">BASEBALL CLUB</p>
        <h1 className="auth-title" id="auth-title">
          {isSignUp ? '新規登録' : 'ログイン'}
        </h1>
        <p className="auth-description">
          野球クラブの収支・備品管理
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email">メールアドレス</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="auth-password">パスワード</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
          </button>
        </form>

        {message && (
          <p className="auth-message" role="status" aria-live="polite">
            {message}
          </p>
        )}

        <button
          type="button"
          className="auth-toggle"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setMessage('')
          }}
        >
          {isSignUp ? 'ログイン画面に戻る' : '新規アカウントを登録する'}
        </button>
      </section>
    </main>
  )
}
