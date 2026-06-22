import { useState, useEffect } from 'react'
import { getSessions } from '../utils/api'
import type { UserInfo, SessionInfo } from '../App'
import type { SessionSummary } from '../utils/api'

interface Props {
  user: UserInfo
  onViewSession: (session: SessionInfo) => void
  onViewReport: (session: SessionInfo) => void
}

export default function History({ user, onViewSession, onViewReport }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [filterSubject, setFilterSubject] = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [filterUser, setFilterUser] = useState('')

  useEffect(() => {
    getSessions().then(setSessions).catch(console.error)
  }, [])

  const users = [...new Set(sessions.map(s => s.user_name))].filter(Boolean)

  const filtered = sessions.filter(s => {
    if (filterSubject && s.subject !== filterSubject) return false
    if (filterMode && s.mode !== filterMode) return false
    if (filterUser && s.user_name !== filterUser) return false
    return true
  })

  const handleView = (s: SessionSummary) => {
    onViewSession({ id: s.id, subject: s.subject, mode: s.mode, question: '' })
  }

  const handleReport = (s: SessionSummary) => {
    onViewReport({ id: s.id, subject: s.subject, mode: s.mode, question: '' })
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 20 }}>📋 训练历史</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto', minWidth: 120 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">全部学科</option>
          <option value="math">数学</option>
          <option value="physics">物理</option>
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 120 }} value={filterMode} onChange={e => setFilterMode(e.target.value)}>
          <option value="">全部模式</option>
          <option value="training">思维训练</option>
          <option value="interview">模拟面试</option>
        </select>
        {users.length > 1 && (
          <select className="input" style={{ width: 'auto', minWidth: 120 }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="">全部学生</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        )}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          共 {filtered.length} 条记录
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>学科</th>
                <th>模式</th>
                <th>学生</th>
                <th>评分</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>{new Date(s.start_time).toLocaleDateString('zh-CN')}</td>
                  <td>
                    <span className={`badge ${s.subject === 'math' ? 'badge-info' : 'badge-success'}`}>
                      {s.subject === 'math' ? '数学' : '物理'}
                    </span>
                  </td>
                  <td>{s.mode === 'training' ? '📖 训练' : '🎙️ 面试'}</td>
                  <td>{s.user_name}</td>
                  <td>
                    {s.score != null ? (
                      <span className="badge" style={{ background: s.score >= 7 ? '#ecfdf5' : s.score >= 4 ? '#fffbeb' : '#fef2f2', color: s.score >= 7 ? '#059669' : s.score >= 4 ? '#d97706' : '#dc2626' }}>
                        {s.score}/10
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>未评分</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn" onClick={() => handleView(s)} style={{ fontSize: 12, padding: '0.25rem 0.5rem' }}>查看</button>
                      <button className="btn" onClick={() => handleReport(s)} style={{ fontSize: 12, padding: '0.25rem 0.5rem' }}>报告</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>暂无训练记录</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>去主页开始一次训练吧</p>
        </div>
      )}
    </div>
  )
}
