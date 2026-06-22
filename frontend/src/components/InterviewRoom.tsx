import { useState, useRef, useEffect, useCallback } from 'react'
import { getInterviewResponse } from '../utils/api'
import type { UserInfo, SessionInfo } from '../App'

interface Message {
  role: 'interviewer' | 'student'
  text: string
  timestamp: number
}

interface Props {
  session: SessionInfo
  user: UserInfo
  onViewReport: (session: SessionInfo) => void
}

export default function InterviewRoom({ session, user, onViewReport }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [stage, setStage] = useState('warmup')
  const [elapsed, setElapsed] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    if (timerActive) {
      timer = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1
          if (next >= 300 && next < 330) setStage('challenge')
          else if (next >= 120 && next < 150) setStage('technical')
          return next
        })
      }, 1000)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [timerActive])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const startInterview = async () => {
    setTimerActive(true)
    setLoading(true)
    try {
      const result = await getInterviewResponse(session.id, '开始面试')
      setMessages([{ role: 'interviewer', text: result.content, timestamp: Date.now() }])
    } catch {
      setMessages([{ role: 'interviewer', text: '你好！欢迎参加面试。让我们从自我介绍开始吧。请告诉我你为什么对' + (session.subject === 'math' ? '数学' : '物理') + '感兴趣？', timestamp: Date.now() }])
    }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || !timerActive) return
    const studentMsg: Message = { role: 'student', text: input.trim(), timestamp: Date.now() }
    const newMessages = [...messages, studentMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const history = newMessages.map(m => ({ role: m.role, text: m.text }))
    try {
      const result = await getInterviewResponse(session.id, input)
      setMessages(prev => [...prev, { role: 'interviewer', text: result.content, timestamp: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'interviewer', text: '请继续你的回答。', timestamp: Date.now() }])
    }
    setLoading(false)
  }

  const endInterview = () => {
    setTimerActive(false)
    setMessages(prev => [...prev, { role: 'interviewer', text: `面试结束。总时长 ${formatTime(elapsed)}。感谢你的参与！你可以查看训练报告了解评估详情。`, timestamp: Date.now() }])
  }

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('你的浏览器不支持语音识别，请使用 Chrome 浏览器。')
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (listening) {
      setListening(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.start()
    setListening(true)
  }

  const stageLabel = stage === 'warmup' ? '热身' : stage === 'technical' ? '深入' : '挑战'
  const stageColor = stage === 'warmup' ? '#10b981' : stage === 'technical' ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', maxWidth: 800, margin: '0 auto', width: '100%', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>🎙️ {session.subject === 'math' ? '数学' : '物理'}模拟面试</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span className="badge" style={{ background: stageColor + '1a', color: stageColor }}>{stageLabel}阶段</span>
            <span className="badge badge-info">{session.subject === 'math' ? '数学' : '物理'}</span>
          </div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          ⏱️ {formatTime(elapsed)}
        </div>
      </div>

      <div style={{
        flex: 1, overflow: 'auto', marginBottom: 16,
        background: 'var(--bg-secondary)', borderRadius: 12, padding: '1.25rem',
        minHeight: 300, maxHeight: '50vh',
      }}>
        {messages.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>准备开始模拟面试</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>30分钟牛剑风格面试实战</p>
            <button className="btn btn-primary" onClick={startInterview} style={{ fontSize: 14 }}>
              开始面试
            </button>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, marginBottom: 16,
                justifyContent: msg.role === 'student' ? 'flex-end' : 'flex-start',
              }}>
                {msg.role === 'interviewer' && (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🧑‍🏫</div>
                )}
                <div style={{
                  maxWidth: '70%', padding: '0.75rem 1rem', borderRadius: 12,
                  background: msg.role === 'interviewer' ? 'var(--bg-primary)' : 'var(--accent)',
                  color: msg.role === 'interviewer' ? 'var(--text-primary)' : '#fff',
                  border: msg.role === 'interviewer' ? '0.5px solid var(--border-primary)' : 'none',
                  fontSize: 13, lineHeight: 1.6,
                }}>
                  {msg.text}
                </div>
                {msg.role === 'student' && (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👨‍🎓</div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', padding: 8 }}>
                面试官正在思考...
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {timerActive && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={toggleListening} style={{
            background: listening ? '#fef2f2' : 'transparent',
            borderColor: listening ? 'var(--danger)' : 'var(--border-primary)',
            color: listening ? 'var(--danger)' : 'var(--text-primary)',
            fontSize: 13,
          }}>
            {listening ? '🔴 录音中' : '🎤 语音输入'}
          </button>
          <input
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="输入你的回答..."
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()} style={{ fontSize: 13 }}>
            发送
          </button>
          <button className="btn btn-danger" onClick={endInterview} style={{ fontSize: 13 }}>
            结束面试
          </button>
        </div>
      )}
    </div>
  )
}
