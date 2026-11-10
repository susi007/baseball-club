import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import './index.css'
import App from './App.jsx'

export function Root() {
  const [mode, setMode] = useState(
    () =>
      window.localStorage.getItem('baseball-club-theme') === 'dark'
        ? 'dark'
        : 'light'
  )

  useEffect(() => {
    window.localStorage.setItem('baseball-club-theme', mode)
    document.documentElement.dataset.theme = mode
  }, [mode])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#1976d2', dark: '#115293', contrastText: '#fff' },
          secondary: { main: '#1976d2' },
          error: { main: mode === 'dark' ? '#f28b82' : '#d32f2f' },
          background:
            mode === 'dark'
              ? { default: '#101820', paper: '#1e2935' }
              : { default: '#f5f7fb', paper: '#fff' },
          text:
            mode === 'dark'
              ? { primary: '#edf2f7', secondary: '#b0becb' }
              : { primary: '#1b2533', secondary: '#5e6b7a' },
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily:
            '"Noto Sans JP", "Yu Gothic UI", "Yu Gothic", Meiryo, sans-serif',
          button: { fontWeight: 700, textTransform: 'none' },
        },
        components: {
          MuiButton: { defaultProps: { disableElevation: true } },
          MuiCard: { styleOverrides: { root: { backgroundImage: 'none' } } },
        },
      }),
    [mode]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App
        darkMode={mode === 'dark'}
        onDarkModeChange={(enabled) => setMode(enabled ? 'dark' : 'light')}
      />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
