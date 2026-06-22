import { useState, useEffect } from 'react'
import { getSessions, getSession } from '../utils/api'
import type { UserInfo, SessionInfo } from '../App'
import type { SessionDetail, SessionSummary } from '../utils/api'

interface Props {
  user: UserInfo
  preselectedSession?: SessionInfo | null
}

export default function Report({ user, preselectedSession }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selected, setSelected] = useState<number | null>(preselectedSession?.id || null)
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'feedback' | 'canvas'>('feedback')

  useEffect(() => {
    getSessions().then(setSessions).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    getSession(selected).then(d => {
      setDetail(d)
      setActiveTab(d.mode === 'interview' && d.conversation ? 'canvas' : 'feedback')
    }).catch(console.error).finally(() => setLoading(false))
  }, [selected])

  const simulateReport = (s: SessionDetail) => {
    if (s.ai_feedback) return s.ai_feedback
    return `评分: 7/10\n\n思路评估: 解题方向基本正确，步骤较为完整。看得出对基本概念掌握较好。\n\n改进建议: \n- 可以尝试更简洁的解法\n- 注意书写规范\n- 多练习此类题型以提高速度`
  }

  const reportText = detail ? simulateReport(detail) : ''

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>📊 训练报告</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>查看AI评估和训练分析</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ minWidth: 220 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>选择训练记录</label>
          <select className="input" value={selected || ''} onChange={e => setSelected(Number(e.target.value) || null)}>
            <option value="">-- 请选择 --</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.start_time).toLocaleDateString('zh-CN')} — {s.subject === 'math' ? '数学' : '物理'} — {s.mode === 'training' ? '训练' : '面试'} — {s.score ? `${s.score}/10` : '未评分'} {s.user_name ? `(${s.user_name})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>加载中...</div>}

      {detail && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>综合评分</div>
              <div style={{ fontSize: 36, fontWeight: 500, color: 'var(--accent)' }}>{detail.score || 'N/A'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>/10</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>学科</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{detail.subject === 'math' ? '📐 数学' : '⚛️ 物理'}</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>模式</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{detail.mode === 'training' ? '📖 思维训练' : '🎙️ 模拟面试'}</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>日期</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{new Date(detail.start_time).toLocaleDateString('zh-CN')}</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, borderBottom: '0.5px solid var(--border-primary)', marginBottom: 16 }}>
              <button
                onClick={() => setActiveTab('feedback')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                  fontWeight: 500, padding: '0.5rem 0', color: activeTab === 'feedback' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'feedback' ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
                }}
              >
                AI 评估反馈
              </button>
              <button
                onClick={() => setActiveTab('canvas')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                  fontWeight: 500, padding: '0.5rem 0', color: activeTab === 'canvas' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'canvas' ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1,
                }}
              >
                题目与对话
              </button>
            </div>

            {activeTab === 'feedback' && (
              <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{reportText}</div>
            )}
            {activeTab === 'canvas' && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>题目</h3>
                <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16 }}>
                  {detail.question}
                </div>
                {detail.mode === 'interview' && detail.conversation && (
                  <>
                    <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>面试对话</h3>
                    <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                      {detail.conversation}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {!detail && !loading && sessions.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>选择一个训练记录查看报告</p>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>暂无训练记录</p>
        </div>
      )}
    </div>
  )
}
