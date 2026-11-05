
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
    <div className="container mt-5" style={{ maxWidth: '420px' }}>
      <h2 className="mb-4 text-center">
        {isSignUp ? '新規登録' : 'ログイン'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">メールアドレス</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">パスワード</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={loading}
        >
          {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
        </button>
      </form>

      {message && <p className="mt-3">{message}</p>}

      <button
        type="button"
        className="btn btn-link w-100 mt-2"
        onClick={() => {
          setIsSignUp(!isSignUp)
          setMessage('')
        }}
      >
        {isSignUp
          ? 'ログイン画面に戻る'
          : '新規アカウントを登録する'}
      </button>
    </div>
  )
}
