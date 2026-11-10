import { useState } from 'react'
import { Alert, Button, Card, CardContent, TextField, Typography } from '@mui/material'
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
      <Card className="auth-card" aria-labelledby="auth-title" elevation={4}>
        <CardContent>
        <Typography className="auth-brand" component="p" variant="overline">BASEBALL CLUB</Typography>
        <Typography className="auth-title" component="h1" id="auth-title" variant="h5">
          {otpSent ? '確認コードを入力' : isSignUp ? '新規登録' : 'ログイン'}
        </Typography>
        <Typography className="auth-description">
          {otpSent
            ? `${email} に確認コードを送信しました。`
            : '野球クラブの収支・支出管理'}
        </Typography>

        <form className="auth-form" onSubmit={handleSubmit}>
          {otpSent ? (
            <TextField
              id="auth-otp"
              label="確認コード"
              fullWidth
              variant="outlined"
              inputProps={{
                inputMode: 'numeric',
                autoComplete: 'one-time-code',
                pattern: '[0-9]{6,12}',
                maxLength: 12,
              }}
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 12))
              }
              required
            />
          ) : (
            <TextField
              id="auth-email"
              label="メールアドレス"
              type="email"
              autoComplete="email"
              fullWidth
              variant="outlined"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          )}

          <Button type="submit" className="auth-submit" variant="contained" disabled={loading}>
            {loading
              ? '処理中...'
              : otpSent
                ? '確認してログイン'
                : isSignUp
                  ? '確認コードを送信して登録'
                  : '確認コードを送信'}
          </Button>
        </form>

        {message && (
          <Alert className="auth-message" severity="info" role="status" aria-live="polite">
            {message}
          </Alert>
        )}

        {otpSent ? (
          <>
            <Button
              className="auth-toggle"
              variant="text"
              type="button"
              onClick={sendOtp}
              disabled={loading}
            >
              確認コードを再送する
            </Button>
            <Button
              className="auth-toggle"
              variant="text"
              type="button"
              onClick={resetOtpStep}
              disabled={loading}
            >
              メールアドレスを変更する
            </Button>
          </>
        ) : (
          <Button
            className="auth-toggle"
            variant="text"
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage('')
            }}
          >
            {isSignUp ? 'ログイン画面に戻る' : '新規アカウントを登録する'}
          </Button>
        )}
        </CardContent>
      </Card>
    </main>
  )
}
