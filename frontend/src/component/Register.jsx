import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './Authcontext'

const ROLES = ['Gynecologist', 'Obstetrician', 'Clinical Researcher', 'Medical Student', 'Nurse / Midwife', 'Other']

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', role: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (f = form) => {
    const e = {}
    if (!f.fullName.trim()) e.fullName = 'Full name is required'
    else if (f.fullName.trim().length < 2) e.fullName = 'Name must be at least 2 characters'
    if (!f.email) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Please enter a valid email'
    if (!f.password) e.password = 'Password is required'
    else if (f.password.length < 8) e.password = 'Password must be at least 8 characters'
    else if (!/(?=.*[A-Z])/.test(f.password)) e.password = 'Must contain at least one uppercase letter'
    if (!f.confirm) e.confirm = 'Please confirm your password'
    else if (f.confirm !== f.password) e.confirm = 'Passwords do not match'
    if (!f.role) e.role = 'Please select your role'
    return e
  }

  const set = (field) => (e) => {
    const val = e.target.value
    setForm(prev => ({ ...prev, [field]: val }))
    if (touched[field]) {
      const errs = validate({ ...form, [field]: val })
      setErrors(prev => ({ ...prev, [field]: errs[field] }))
    }
  }

  const blur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    setErrors(prev => ({ ...prev, [field]: validate()[field] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const allTouched = { fullName: true, email: true, password: true, confirm: true, role: true }
    setTouched(allTouched)
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    setServerError('')
    await new Promise(r => setTimeout(r, 900))
    const result = register(form)
    setLoading(false)

    if (!result.success) { setServerError(result.error); return }
    navigate('/home')
  }

  const pwStrength = () => {
    const p = form.password
    if (!p) return null
    if (p.length < 6) return { label: 'Weak', color: '#ef4444', width: '25%' }
    if (p.length < 8 || !/[A-Z]/.test(p)) return { label: 'Fair', color: '#f59e0b', width: '50%' }
    if (!/[0-9]/.test(p) || !/[^A-Za-z0-9]/.test(p)) return { label: 'Good', color: '#22d3ee', width: '75%' }
    return { label: 'Strong', color: '#22c55e', width: '100%' }
  }
  const strength = pwStrength()

  const inputStyle = (field) => ({
    width: '100%', backgroundColor: '#1c1c1c',
    border: `1px solid ${errors[field] && touched[field] ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '12px', padding: '12px 14px', color: 'white',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s', fontFamily: 'inherit',
  })

  const EyeIcon = ({ open }) => open
    ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
    : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '24px 16px',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* Blobs */}
      <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle at center, #5a0a2a 0%, #2d0515 45%, transparent 72%)', opacity: 0.9, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle at center, #0d4a45 0%, #061e1c 45%, transparent 72%)', opacity: 0.9, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-130px', right: '-80px', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle at center, #1e0a4a 0%, #0e051f 45%, transparent 72%)', opacity: 0.9, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle at center, #0a2a1a 0%, #051510 45%, transparent 72%)', opacity: 0.7, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '460px' }}>
        <div style={{
          backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '36px 40px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
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

          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Create your account</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Join thousands of clinicians using IntimaAI</p>
          </div>

          {serverError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: '#f87171', fontSize: '13px' }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Full Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '8px' }}>Full Name</label>
              <input type="text" value={form.fullName} onChange={set('fullName')} onBlur={blur('fullName')} placeholder="Dr. Jane Smith" style={inputStyle('fullName')} />
              {touched.fullName && errors.fullName && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '8px' }}>Email</label>
              <input type="email" value={form.email} onChange={set('email')} onBlur={blur('email')} placeholder="your@institution.edu" style={inputStyle('email')} />
              {touched.email && errors.email && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>{errors.email}</p>}
            </div>

            {/* Role */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '8px' }}>Clinical Role</label>
              <select value={form.role} onChange={set('role')} onBlur={blur('role')} style={{
                ...inputStyle('role'),
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                paddingRight: '36px', color: form.role ? 'white' : '#4b5563',
              }}>
                <option value="" disabled>Select your role</option>
                {ROLES.map(r => <option key={r} value={r} style={{ background: '#1c1c1c' }}>{r}</option>)}
              </select>
              {touched.role && errors.role && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>{errors.role}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '8px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} onBlur={blur('password')} placeholder="Min. 8 characters" style={{ ...inputStyle('password'), paddingRight: '42px' }} />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {strength && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ height: '3px', borderRadius: '2px', background: '#1e1e1e', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s', borderRadius: '2px' }} />
                  </div>
                  <p style={{ color: strength.color, fontSize: '11px', marginTop: '4px', marginBottom: 0 }}>{strength.label} password</p>
                </div>
              )}
              {touched.password && errors.password && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#9ca3af', fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '8px' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} onBlur={blur('confirm')} placeholder="Re-enter password" style={{ ...inputStyle('confirm'), paddingRight: '42px' }} />
                <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex' }}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {touched.confirm && errors.confirm && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>{errors.confirm}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(90deg, #ec4899 0%, #a855f7 50%, #06b6d4 100%)',
              color: 'white', fontWeight: 600, fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s', boxShadow: '0 6px 20px rgba(168,85,247,0.35)',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account...
                </>
              ) : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#4b5563', fontSize: '12px' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* ✅ Back to login */}
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#d1d5db', fontSize: '14px',
                textDecoration: 'underline', textUnderlineOffset: '3px',
                fontFamily: 'inherit', padding: 0,
              }}
            >
              Sign in
            </button>
          </p>

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '6px', color: '#4b5563', fontSize: '11px' }}>
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
        select option { background: #1c1c1c; color: white; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}