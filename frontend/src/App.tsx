import { useState, useEffect } from 'react'
import Login from './components/Login'
import Navbar from './components/Navbar'
import SubjectSelect from './components/SubjectSelect'
import TrainingBoard from './components/TrainingBoard'
import InterviewRoom from './components/InterviewRoom'
import Report from './components/Report'
import History from './components/History'
import AccountMgmt from './components/AccountMgmt'

export type Page = 'home' | 'training' | 'interview' | 'report' | 'history' | 'accounts'

export interface UserInfo {
  token: string
  username: string
  role: string
  display_name: string
}

export interface SessionInfo {
  id: number
  subject: string
  mode: string
  question: string
}

function App() {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('role')
    const display_name = localStorage.getItem('display_name')
    if (token && username) {
      return { token, username, role: role || 'student', display_name: display_name || username }
    }
    return null
  })
  const [page, setPage] = useState<Page>('home')
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [lang, setLang] = useState<'zh' | 'en'>('zh')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleLogin = (info: UserInfo) => {
    localStorage.setItem('token', info.token)
    localStorage.setItem('username', info.username)
    localStorage.setItem('role', info.role)
    localStorage.setItem('display_name', info.display_name)
    setUser(info)
    setPage('home')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    localStorage.removeItem('display_name')
    setUser(null)
    setPage('home')
    setSession(null)
  }

  const handleStartSession = (s: SessionInfo) => {
    setSession(s)
    setPage(s.mode === 'interview' ? 'interview' : 'training')
  }

  const navigateTo = (p: Page, s?: SessionInfo) => {
    setPage(p)
    if (s) setSession(s)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <SubjectSelect user={user} onStart={handleStartSession} />
      case 'training':
        if (!session) return <SubjectSelect user={user} onStart={handleStartSession} />
        return <TrainingBoard session={session} user={user} onViewReport={(s) => navigateTo('report', s)} />
      case 'interview':
        if (!session) return <SubjectSelect user={user} onStart={handleStartSession} />
        return <InterviewRoom session={session} user={user} onViewReport={(s) => navigateTo('report', s)} />
      case 'report':
        return <Report user={user} preselectedSession={session} />
      case 'history':
        return <History user={user} onViewSession={(s) => {
          setSession(s)
          setPage(s.mode === 'interview' ? 'interview' : 'training')
        }} onViewReport={(s) => navigateTo('report', s)} />
      case 'accounts':
        return <AccountMgmt user={user} />
      default:
        return <SubjectSelect user={user} onStart={handleStartSession} />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        currentPage={page}
        onNavigate={setPage}
        user={user}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderPage()}
      </main>
    </div>
  )
}

export default App
