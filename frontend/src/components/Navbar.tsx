import type { Page, UserInfo } from '../App'

interface NavItem {
  key: Page
  label: string
  enLabel: string
  icon: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: '主页', enLabel: 'Home', icon: '🏛️' },
  { key: 'training', label: '思维训练', enLabel: 'Training', icon: '📖' },
  { key: 'interview', label: '模拟面试', enLabel: 'Interview', icon: '🎙️' },
  { key: 'report', label: '训练报告', enLabel: 'Reports', icon: '📊' },
  { key: 'history', label: '历史记录', enLabel: 'History', icon: '📋' },
  { key: 'accounts', label: '账号管理', enLabel: 'Accounts', icon: '👤', adminOnly: true },
]

interface Props {
  currentPage: Page
  onNavigate: (page: Page) => void
  user: UserInfo
  onLogout: () => void
  darkMode: boolean
  onToggleDark: () => void
  lang: 'zh' | 'en'
  onToggleLang: () => void
}

export default function Navbar({ currentPage, onNavigate, user, onLogout, darkMode, onToggleDark, lang, onToggleLang }: Props) {
  const visibleItems = NAV_ITEMS.filter(i => !i.adminOnly || user.role === 'admin')

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem', height: 56,
      borderBottom: '0.5px solid var(--border-primary)',
      background: 'var(--bg-primary)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          onClick={() => onNavigate('home')}
          style={{ fontSize: 18, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          🏛️ {lang === 'zh' ? '牛剑面试导师' : 'Oxbridge Tutor'}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {visibleItems.map(item => (
            <button
              key={item.key}
              className="btn"
              onClick={() => onNavigate(item.key)}
              style={{
                borderColor: currentPage === item.key ? 'var(--accent)' : 'transparent',
                background: currentPage === item.key ? 'var(--accent-light)' : 'transparent',
                color: currentPage === item.key ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 13,
                padding: '0.375rem 0.75rem',
              }}
            >
              {item.icon} {lang === 'zh' ? item.label : item.enLabel}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {user.display_name}
        </span>
        <button className="btn" onClick={onToggleDark} style={{ fontSize: 13, padding: '0.25rem 0.5rem' }}>
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button className="btn" onClick={onToggleLang} style={{ fontSize: 12, padding: '0.25rem 0.5rem' }}>
          {lang === 'zh' ? 'EN' : '中'}
        </button>
        <button className="btn" onClick={onLogout} style={{ fontSize: 13 }}>
          退出
        </button>
      </div>
    </nav>
  )
}
