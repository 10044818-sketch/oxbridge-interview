import { useState } from 'react'
import { createSession } from '../utils/api'
import type { UserInfo, SessionInfo } from '../App'

interface Props {
  user: UserInfo
  onStart: (session: SessionInfo) => void
}

const MODES = [
  { subject: 'math', mode: 'training', title: '数学思维训练', enTitle: 'Math Training', icon: '📐', desc: '在Canvas白板上手写解题，AI实时观察' },
  { subject: 'physics', mode: 'training', title: '物理思维训练', enTitle: 'Physics Training', icon: '⚛️', desc: '物理推导与计算，AI实时评估思路' },
  { subject: 'math', mode: 'interview', title: '数学模拟面试', enTitle: 'Math Interview', icon: '🎙️', desc: '30分钟牛剑数学面试实战模拟' },
  { subject: 'physics', mode: 'interview', title: '物理模拟面试', enTitle: 'Physics Interview', icon: '🔬', desc: '30分钟牛剑物理面试实战模拟' },
]

export default function SubjectSelect({ user, onStart }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelect = async (subject: string, mode: string) => {
    const key = `${subject}-${mode}`
    setLoading(key)
    try {
      const session = await createSession(subject, mode)
      onStart({ id: session.id, subject, mode, question: session.question })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>
          选择训练模式
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          选择学科和训练类型，开始你的牛剑面试准备之旅
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {MODES.map(({ subject, mode, title, enTitle, icon, desc }) => {
          const key = `${subject}-${mode}`
          const isLoading = loading === key
          return (
            <button
              key={key}
              className="card"
              onClick={() => handleSelect(subject, mode)}
              disabled={isLoading}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: `0.5px solid var(--border-primary)`,
                background: 'var(--bg-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
              <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{title}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{enTitle}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{desc}</p>
              {isLoading && (
                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--accent)' }}>创建会话中...</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
