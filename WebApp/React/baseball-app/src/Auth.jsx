import { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendOtp() {
    setMessage('')
    setLoading(true)

    try {
      const trimmedEmail = email.trim()
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: isSignUp },
      })
      if (error) throw error

      setEmail(trimmedEmail)
      setOtp('')
      setOtpSent(true)
      setMessage('メールに届いた確認コードを入力してください。')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!otpSent) {
      await sendOtp()
      return
    }

    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      })
      if (error) throw error
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  function resetOtpStep() {
    setOtpSent(false)
    setOtp('')
    setMessage('')
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-brand">BASEBALL CLUB</p>
        <h1 className="auth-title" id="auth-title">
          {otpSent ? '確認コードを入力' : isSignUp ? '新規登録' : 'ログイン'}
        </h1>
        <p className="auth-description">
          {otpSent
            ? `${email} に確認コードを送信しました。`
            : '野球クラブの収支・支出管理'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {otpSent ? (
            <>
              <label htmlFor="auth-otp">確認コード</label>
              <input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,12}"
                maxLength={12}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 12))
                }
                required
              />
            </>
          ) : (
            <>
              <label htmlFor="auth-email">メールアドレス</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? '処理中...'
              : otpSent
                ? '確認してログイン'
                : isSignUp
                  ? '確認コードを送信して登録'
                  : '確認コードを送信'}
          </button>
        </form>

        {message && (
          <p className="auth-message" role="status" aria-live="polite">
            {message}
          </p>
        )}

        {otpSent ? (
          <>
            <button
              type="button"
              className="auth-toggle"
              onClick={sendOtp}
              disabled={loading}
            >
              確認コードを再送する
            </button>
            <button
              type="button"
              className="auth-toggle"
              onClick={resetOtpStep}
              disabled={loading}
            >
              メールアドレスを変更する
            </button>
          </>
        ) : (
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
        )}
      </section>
    </main>
  )
}
