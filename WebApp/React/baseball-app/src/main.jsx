import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import './index.css'
import App from './App.jsx'

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2', dark: '#115293', contrastText: '#fff' },
    secondary: { main: '#1976d2' },
    error: { main: '#d32f2f' },
    background: { default: '#f5f7fb', paper: '#fff' },
    text: { primary: '#1b2533', secondary: '#5e6b7a' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Noto Sans JP", "Yu Gothic UI", "Yu Gothic", Meiryo, sans-serif',
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
