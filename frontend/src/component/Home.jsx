/**
 * Home.jsx ~ IntimaAI Chat Interface
 *
 * Backend integration:
 *  - POST /api/analyze      → full ICD-10 + CPT + payer analysis  (default)
 *  - POST /api/icd10        → ICD-10 codes only
 *  - POST /api/cpt          → CPT codes only
 *  - POST /api/payer-policy → payer coverage check (requires payer name)
 *  - GET  /health           → liveness probe shown in UI status badge
 *
 * The active task mode is controlled by the mode selector in the input bar.
 * All requests go to BACKEND_URL (defaults to http://localhost:5000).
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './Authcontext'

// ─── Config ───────────────────────────────────────────────────────────────────
// Change this to your deployed backend URL when going to production.
// Vite exposes VITE_* env vars; fall back to localhost for local dev.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

// ─── Static seed data ────────────────────────────────────────────────────────
const SEED_CONVERSATIONS = [
  { id: 1, title: 'PCOS differential diagnosis',     group: 'TODAY' },
  { id: 2, title: 'Endometriosis staging criteria',  group: 'TODAY' },
  { id: 3, title: 'HPV vaccination protocols',       group: 'YESTERDAY' },
  { id: 4, title: 'Hormonal contraception side effects', group: 'YESTERDAY' },
  { id: 5, title: 'Ovarian reserve assessment',      group: 'YESTERDAY' },
  { id: 6, title: 'Recurrent pregnancy loss workup', group: 'LAST 7 DAYS' },
  { id: 7, title: 'Menopause hormone therapy',       group: 'LAST 7 DAYS' },
]

const SUGGESTION_CARDS = [
  { icon: '🔬', title: 'PCOS diagnostic criteria',  sub: 'and treatment options',              mode: 'analyze' },
  { icon: '📄', title: 'Endometriosis staging',      sub: '& fertility evidence',               mode: 'icd10'   },
  { icon: '🚀', title: 'Recurrent pregnancy',        sub: 'loss workup protocol',               mode: 'analyze' },
  { icon: '💊', title: 'Contraception options',      sub: 'for PCOS & insulin resistance',      mode: 'cpt'     },
]

// Task mode options shown in the mode selector pill
const TASK_MODES = [
  { value: 'analyze',      label: 'Full Analysis',   color: '#a855f7' },
  { value: 'icd10',        label: 'ICD-10 Codes',    color: '#22d3ee' },
  { value: 'cpt',          label: 'CPT Codes',       color: '#f472b6' },
  { value: 'payer_policy', label: 'Payer Policy',    color: '#f59e0b' },
]

const PAYERS = ['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Humana', 'Medicare', 'Medicaid', 'UnitedHealth', 'Other']
const GROUP_ORDER = ['TODAY', 'YESTERDAY', 'LAST 7 DAYS']

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * callBackend ~ single function that routes to the correct endpoint.
 * Returns the text result string or throws on network/server error.
 */
async function callBackend(task, clinicalNote, payer = null) {
  const endpoint =
    task === 'analyze'      ? '/api/analyze'      :
    task === 'icd10'        ? '/api/icd10'        :
    task === 'cpt'          ? '/api/cpt'          :
    task === 'payer_policy' ? '/api/payer-policy' : '/api/analyze'

  const body = { clinical_note: clinicalNote }
  if (task === 'payer_policy' && payer) body.payer = payer

  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Server error ${res.status}`)
  }

  const data = await res.json()
  // Both invoke_medical_coder and invoke_full_coding_analysis return { task, result }
  return data.result || 'No response from model.'
}

// ─── Sub-components ──────────────────────────────────────────────────────────
const Avatar = ({ name, size = 34 }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #ec4899, #a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: size * 0.38,
      flexShrink: 0, userSelect: 'none',
    }}>{initials}</div>
  )
}

/**
 * MessageBubble ~ renders a single chat message.
 * Handles:
 *   - user messages (right-aligned, purple tint)
 *   - assistant messages (left-aligned, dark card)
 *   - loading dots animation
 *   - error state (red border)
 */
const MessageBubble = ({ msg }) => {
  const isUser = msg.role === 'user'
  const isError = msg.isError

  return (
    <div style={{
      display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: 10, marginBottom: 18,
      animation: 'fadeUp 0.22s ease',
    }}>
      {/* Assistant avatar */}
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '8px',
          backgroundColor: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>🩺</div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '68%',
        backgroundColor: isUser ? '#1e1040' : isError ? 'rgba(239,68,68,0.08)' : '#161616',
        border: `1px solid ${
          isUser  ? 'rgba(168,85,247,0.25)' :
          isError ? 'rgba(239,68,68,0.35)'  :
          'rgba(255,255,255,0.07)'
        }`,
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '11px 15px', color: isError ? '#f87171' : '#e5e7eb',
        fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap',
      }}>
        {/* Mode badge shown on assistant messages */}
        {!isUser && msg.modeBadge && !msg.loading && !isError && (
          <div style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
            backgroundColor: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)',
            color: '#c084fc', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>{msg.modeBadge}</div>
        )}

        {/* Loading dots */}
        {msg.loading ? (
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', height: 18 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: '50%', backgroundColor: '#a855f7',
                display: 'inline-block',
                animation: `dotBounce 1.1s ease ${i * 0.18}s infinite`,
              }} />
            ))}
          </span>
        ) : msg.content}
      </div>

      {/* User avatar */}
      {isUser && <Avatar name={msg.userName || 'User'} size={30} />}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // ── Auth-derived display values ──
  const displayName = user?.fullName || 'Clinician'
  const displayRole = user?.role     || 'Clinical Researcher'
  const firstName   = displayName.split(' ')[0]

  // ── Conversation state ──
  const [conversations, setConversations] = useState(SEED_CONVERSATIONS)
  const [activeId,      setActiveId]      = useState(1)
  const [messages,      setMessages]      = useState({})          // { [convId]: Message[] }
  const nextId = useRef(SEED_CONVERSATIONS.length + 1)

  // ── Input state ──
  const [input,     setInput]     = useState('')
  const [taskMode,  setTaskMode]  = useState('analyze')           // current task mode
  const [payer,     setPayer]     = useState('')                   // payer for payer_policy mode
  const [collapsed, setCollapsed] = useState(false)               // sidebar collapse

  // ── Backend status ──
  const [backendStatus, setBackendStatus] = useState('checking')  // 'ok' | 'error' | 'checking'

  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  const currentMessages = messages[activeId] || []
  const isWelcome       = currentMessages.length === 0
  const activeConv      = conversations.find(c => c.id === activeId)

  // ── Health check on mount ──
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then(r => r.ok ? setBackendStatus('ok') : setBackendStatus('error'))
      .catch(() => setBackendStatus('error'))
  }, [])

  // ── Auto-scroll to bottom on new messages ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeId])

  // ── Auto-resize textarea ──
  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
  }, [input])

  // ── New conversation ──
  const newConversation = () => {
    const id = nextId.current++
    setConversations(prev => [{ id, title: 'New Conversation', group: 'TODAY' }, ...prev])
    setActiveId(id)
  }

  /**
   * sendMessage ~ core send function.
   *
   * Flow:
   *  1. Append user message immediately (optimistic UI)
   *  2. Append a loading bubble
   *  3. Call callBackend() with the selected task mode
   *  4. Replace loading bubble with the real response (or error message)
   */
  const sendMessage = async (text, overrideMode = null) => {
    const content    = (text || input).trim()
    if (!content) return
    const activeMode = overrideMode || taskMode

    setInput('')

    // Auto-title conversation from first message
    setConversations(prev => prev.map(c =>
      c.id === activeId && c.title === 'New Conversation'
        ? { ...c, title: content.slice(0, 42) }
        : c
    ))

    const modeMeta  = TASK_MODES.find(m => m.value === activeMode)
    const userMsg   = { id: Date.now(),     role: 'user',      content, userName: displayName }
    const loadMsg   = { id: Date.now() + 1, role: 'assistant', content: '', loading: true }

    // Append user + loading bubble
    setMessages(prev => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), userMsg, loadMsg],
    }))

    try {
      // ── Real backend call ──
      const result = await callBackend(activeMode, content, activeMode === 'payer_policy' ? payer : null)

      // Replace loading bubble with real response
      setMessages(prev => ({
        ...prev,
        [activeId]: [
          ...(prev[activeId] || []).filter(m => !m.loading),
          {
            id:        Date.now() + 2,
            role:      'assistant',
            content:   result,
            modeBadge: modeMeta?.label,
          },
        ],
      }))
    } catch (err) {
      // Replace loading bubble with error message
      setMessages(prev => ({
        ...prev,
        [activeId]: [
          ...(prev[activeId] || []).filter(m => !m.loading),
          {
            id:      Date.now() + 2,
            role:    'assistant',
            content: `⚠️ Backend error: ${err.message}\n\nMake sure the Flask server is running at ${BACKEND_URL} and your AWS credentials are configured.`,
            isError: true,
          },
        ],
      }))
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const grouped = GROUP_ORDER
    .map(label => ({ label, items: conversations.filter(c => c.group === label) }))
    .filter(g => g.items.length > 0)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      backgroundColor: '#080808', color: 'white',
      overflow: 'hidden', fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: collapsed ? 0 : 258, minWidth: collapsed ? 0 : 258,
        height: '100vh', overflow: 'hidden',
        backgroundColor: '#0d0d0d', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.22s ease, min-width 0.22s ease',
      }}>

        {/* Logo */}
        <div style={{
          padding: '15px 14px 13px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '8px', flexShrink: 0,
            background: 'linear-gradient(135deg, #f472b6, #a855f7, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: 'white',
          }}>I</div>
          <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
            IntimaAI
          </span>
        </div>

        {/* New Conversation button */}
        <div style={{ padding: '12px 12px 4px', flexShrink: 0 }}>
          <button
            onClick={newConversation}
            style={{
              width: '100%', padding: '9px 14px', borderRadius: '10px',
              background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.28)',
              color: '#d8b4fe', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: 'inherit', transition: 'background 0.15s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,0.15)'}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> New Conversation
          </button>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', scrollbarWidth: 'none' }}>
          {grouped.map(g => (
            <div key={g.label} style={{ marginBottom: 14 }}>
              <div style={{
                color: '#4b5563', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 6px 6px',
              }}>{g.label}</div>
              {g.items.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'block',
                    padding: '8px 10px', borderRadius: '9px', border: 'none',
                    backgroundColor:  c.id === activeId ? 'rgba(168,85,247,0.16)' : 'transparent',
                    borderLeft: `2px solid ${c.id === activeId ? '#a855f7' : 'transparent'}`,
                    color:      c.id === activeId ? '#e9d5ff' : '#9ca3af',
                    fontSize:   13, fontWeight: c.id === activeId ? 500 : 400,
                    cursor: 'pointer', marginBottom: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontFamily: 'inherit', transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (c.id !== activeId) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (c.id !== activeId) e.currentTarget.style.backgroundColor = 'transparent' }}
                >{c.title}</button>
              ))}
            </div>
          ))}
        </div>

        {/* User footer */}
        <div style={{
          padding: '11px 13px', flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Avatar name={displayName} size={33} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ color: '#6b7280', fontSize: 11 }}>{displayRole}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          height: 52, flexShrink: 0,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#080808',
        }}>
          {/* Sidebar toggle */}
          <button
            onClick={() => setCollapsed(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 5, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e5e7eb'}
            onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 500 }}>
            {activeConv?.title || 'New Conversation'}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Backend status indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                backgroundColor:
                  backendStatus === 'ok'       ? '#22c55e' :
                  backendStatus === 'error'    ? '#ef4444' : '#f59e0b',
                boxShadow: backendStatus === 'ok' ? '0 0 6px #22c55e' : 'none',
              }} />
              <span style={{ color: '#4b5563', fontSize: 11 }}>
                {backendStatus === 'ok' ? 'Backend connected' : backendStatus === 'error' ? 'Backend offline' : 'Connecting…'}
              </span>
            </div>

            <span style={{ color: '#6b7280', fontSize: 13 }}>
              {getGreeting()}, <span style={{ color: '#d8b4fe', fontWeight: 500 }}>{firstName}</span> 👋
            </span>
            <div style={{
              padding: '5px 13px', borderRadius: '20px',
              border: '1px solid rgba(168,85,247,0.35)',
              color: '#d8b4fe', fontSize: 12, fontWeight: 500,
              backgroundColor: 'rgba(168,85,247,0.08)',
            }}>Reproductive Health AI</div>
          </div>
        </div>

        {/* ── Messages area / Welcome screen ── */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#222 transparent' }}>
          {isWelcome ? (
            /* Welcome / suggestion cards */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: '100%', padding: '40px 24px',
              animation: 'fadeUp 0.3s ease',
            }}>
              <div style={{
                width: 78, height: 78, borderRadius: '20px',
                backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, marginBottom: 16, boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
              }}>🩺</div>

              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 4 }}>{getGreeting()},</p>

              <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.5px', textAlign: 'center' }}>
                <span style={{
                  background: 'linear-gradient(90deg, #f472b6, #a855f7, #22d3ee)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>{displayName}</span>
              </h1>

              <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', maxWidth: 420, lineHeight: 1.65, margin: '10px 0 34px' }}>
                Ask about reproductive health cases, evidence-based protocols, or attach patient documents.
              </p>

              {/* Suggestion cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, width: '100%', maxWidth: 840 }}>
                {SUGGESTION_CARDS.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTaskMode(card.mode)
                      sendMessage(`${card.title} ${card.sub}`, card.mode)
                    }}
                    style={{
                      backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px', padding: '14px', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                      animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#181818'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.28)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#111111'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 10 }}>{card.icon}</div>
                    <div style={{ color: '#e5e7eb', fontSize: 12.5, fontWeight: 500, marginBottom: 3 }}>{card.title}</div>
                    <div style={{ color: '#6b7280', fontSize: 11.5 }}>{card.sub}</div>
                    {/* Mode badge on card */}
                    <div style={{
                      marginTop: 8, display: 'inline-block', padding: '2px 7px',
                      borderRadius: '10px', fontSize: 10, fontWeight: 600,
                      backgroundColor: 'rgba(168,85,247,0.12)', color: '#c084fc',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {TASK_MODES.find(m => m.value === card.mode)?.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Chat messages */
            <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 24px 8px' }}>
              {currentMessages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div style={{
          flexShrink: 0, padding: '10px 24px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#080808',
        }}>
          <div style={{ maxWidth: 740, margin: '0 auto' }}>

            {/* ── Task mode + payer selector row ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {TASK_MODES.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => setTaskMode(mode.value)}
                  style={{
                    padding: '4px 11px', borderRadius: '20px', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
                    transition: 'all 0.15s',
                    backgroundColor: taskMode === mode.value ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.04)',
                    color:           taskMode === mode.value ? '#e9d5ff' : '#6b7280',
                    border:          `1px solid ${taskMode === mode.value ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >{mode.label}</button>
              ))}

              {/* Payer dropdown ~ only shown in payer_policy mode */}
              {taskMode === 'payer_policy' && (
                <select
                  value={payer}
                  onChange={e => setPayer(e.target.value)}
                  style={{
                    marginLeft: 4, padding: '4px 10px', borderRadius: '20px',
                    backgroundColor: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)',
                    color: payer ? '#e5e7eb' : '#6b7280', fontSize: 11, fontFamily: 'inherit',
                    outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="">Select payer…</option>
                  {PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
            </div>

            {/* ── Text input box ── */}
            <div
              style={{
                backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', display: 'flex', alignItems: 'flex-end',
                gap: 8, padding: '9px 10px', transition: 'border-color 0.2s',
              }}
              onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'}
              onBlurCapture={e  => e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.1)'}
            >
              {/* Attach button (UI placeholder) */}
              <button
                title="Attach file"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: 6, transition: 'color 0.15s', flexShrink: 0, marginBottom: 2 }}
                onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
                onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
              >
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={
                  taskMode === 'icd10'        ? 'Paste clinical note to assign ICD-10-CM codes…' :
                  taskMode === 'cpt'          ? 'Describe the procedure to assign CPT codes…'    :
                  taskMode === 'payer_policy' ? 'Describe the clinical scenario for payer review…' :
                  'Ask about a case, protocol, diagnosis, or request full coding analysis…'
                }
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: '#e5e7eb', fontSize: 13.5, lineHeight: 1.6,
                  resize: 'none', fontFamily: 'inherit', maxHeight: 150,
                  overflowY: 'auto', scrollbarWidth: 'none',
                }}
              />

              {/* Send button */}
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                style={{
                  width: 34, height: 34, borderRadius: '9px', border: 'none', flexShrink: 0,
                  background: input.trim() ? 'linear-gradient(135deg, #ec4899, #a855f7)' : '#1a1a1a',
                  cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  boxShadow: input.trim() ? '0 3px 10px rgba(168,85,247,0.35)' : 'none',
                }}
              >
                <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <p style={{ color: '#2d2d2d', fontSize: 11, textAlign: 'center', marginTop: 7 }}>
              IntimaAI may make mistakes. Always verify clinical decisions with your institution's protocols.
            </p>
          </div>
        </div>
      </div>

      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: #080808; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
        textarea { scrollbar-width: none; }
        textarea::-webkit-scrollbar { display: none; }
        textarea::placeholder { color: #3d3d3d; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0);   opacity: 0.4; }
          40%           { transform: translateY(-5px); opacity: 1;   }
        }
      `}</style>
    </div>
  )
}