import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './Authcontext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const validateEmail = (value) => {
    if (!value) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address'
    return ''
  }

  const handleEmailBlur = () => {
    setTouched(p => ({ ...p, email: true }))
    setEmailError(validateEmail(email))
  }

  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (touched.email) setEmailError(validateEmail(e.target.value))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const emailErr = validateEmail(email)
    setEmailError(emailErr)
    setTouched({ email: true, password: true })
    if (emailErr || !password) return

    setIsLoading(true)
    setServerError('')
    await new Promise(r => setTimeout(r, 900))
    const result = login({ email, password })
    setIsLoading(false)

    if (!result.success) { setServerError(result.error); return }
    navigate('/home')
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Blobs */}
      <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle at center, #5a0a2a 0%, #2d0515 45%, transparent 72%)', opacity: 0.9, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle at center, #0d4a45 0%, #061e1c 45%, transparent 72%)', opacity: 0.9, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-130px', right: '-80px', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle at center, #1e0a4a 0%, #0e051f 45%, transparent 72%)', opacity: 0.9, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', margin: '0 16px' }}>
        <div style={{
          backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '40px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f472b6 0%, #a855f7 50%, #22d3ee 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(168,85,247,0.45)', flexShrink: 0,
            }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>I</span>
            </div>
            <span style={{ color: 'white', fontWeight: 600, fontSize: '17px', letterSpacing: '-0.3px' }}>IntimaAI</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              Welcome back
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Sign in to your clinical intelligence workspace
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '16px',
              color: '#f87171', fontSize: '13px',
            }}>{serverError}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '8px' }}>Email</label>
              <input
                type="email" value={email}
                onChange={handleEmailChange} onBlur={handleEmailBlur}
                placeholder="your@institution.edu"
                style={{
                  width: '100%', backgroundColor: '#1c1c1c',
                  border: `1px solid ${emailError && touched.email ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '12px', padding: '12px 14px', color: 'white',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s', fontFamily: 'inherit',
                }}
              />
              {emailError && touched.email && (
                <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>{emailError}</p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Password</label>
                <button type="button" style={{ background: 'none', border: 'none', color: '#a855f7', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Forgot password?</button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setTouched(p => ({ ...p, password: true }))}
                  placeholder="••••••••"
                  style={{
                    width: '100%', backgroundColor: '#1c1c1c',
                    border: `1px solid ${touched.password && !password ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px', padding: '12px 42px 12px 14px', color: 'white',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s', fontFamily: 'inherit',
                  }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
                  {showPassword
                    ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              {touched.password && !password && (
                <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>Password is required</p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading} style={{
              width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(90deg, #ec4899 0%, #a855f7 50%, #06b6d4 100%)',
              color: 'white', fontWeight: 600, fontSize: '15px',
              cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.2s', boxShadow: '0 6px 20px rgba(168,85,247,0.35)',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {isLoading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#4b5563', fontSize: '12px' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* ✅ FIX: use navigate() not <Link> */}
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#d1d5db', fontSize: '14px',
                textDecoration: 'underline', textUnderlineOffset: '3px',
                fontFamily: 'inherit', padding: 0,
              }}
            >
              Create one
            </button>
          </p>

          <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '6px', color: '#4b5563', fontSize: '11px' }}>
            <span>Trusted Clinical Intelligence</span><span>·</span>
            <span>Privacy First</span><span>·</span>
            <span>RAG-Powered</span>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        input::placeholder { color: #4b5563; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}