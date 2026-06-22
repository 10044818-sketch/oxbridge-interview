import { useState, useEffect, FormEvent } from 'react'
import { getUsers, createUser, deleteUser } from '../utils/api'
import type { UserInfo } from '../App'

interface UserRecord {
  id: number
  username: string
  role: string
  display_name: string
  session_count: number
  created_at: string
}

interface Props {
  user: UserInfo
}

export default function AccountMgmt({ user }: Props) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  const loadUsers = () => {
    getUsers().then(setUsers).catch(console.error)
  }

  useEffect(() => loadUsers(), [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim() || !newPassword || !newDisplayName.trim()) {
      setError('请填写所有字段')
      return
    }
    setAdding(true)
    setError('')
    try {
      await createUser(newUsername.trim(), newPassword, newDisplayName.trim())
      setShowModal(false)
      setNewUsername('')
      setNewPassword('')
      setNewDisplayName('')
      loadUsers()
    } catch (err: any) {
      setError(err.message || '添加失败')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`确定删除学生 "${username}" 吗？此操作不可撤销。`)) return
    try {
      await deleteUser(id)
      loadUsers()
    } catch (err: any) {
      alert(err.message || '删除失败')
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>👤 账号管理</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>管理学生账号</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + 添加学生
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>训练次数</th>
              <th>创建日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.username}</td>
                <td>{u.display_name || '-'}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                    {u.role === 'admin' ? '管理员' : '学生'}
                  </span>
                </td>
                <td>{u.session_count}</td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}</td>
                <td>
                  {u.role !== 'admin' && (
                    <button className="btn btn-danger" onClick={() => handleDelete(u.id, u.username)} style={{ fontSize: 12, padding: '0.25rem 0.5rem' }}>
                      删除
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  暂无学生账号
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>添加学生账号</h2>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>用户名</label>
                <input className="input" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="登录用户名" autoFocus />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>密码</label>
                <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="登录密码" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>姓名</label>
                <input className="input" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="显示名称" />
              </div>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, padding: '0.5rem', background: '#fef2f2', borderRadius: 8 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? '添加中...' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
