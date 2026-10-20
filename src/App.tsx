import { useEffect, useState } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import AuthButton from './components/AuthButton'
import { useAuth } from './hooks/useAuth'
import AllLinks from './pages/AllLinks'
import EditLink from './pages/EditLink'
import Home from './pages/Home'
import NewLink from './pages/NewLink'
import Resolve from './pages/Resolve'
import Settings from './pages/Settings'

function Shell() {
  const { isOwner } = useAuth()
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="gl-shell">
      <header className="gl-header">
        <div className="gl-header-inner">
          <Link to="/" className="gl-brand" aria-label="go home">go/</Link>
          <nav className="gl-nav" aria-label="Main navigation">
            <NavLink to="/" end>Search</NavLink>
            <NavLink to="/-/all">Links</NavLink>
            <NavLink to="/-/settings">Settings</NavLink>
          </nav>
          <div className="flex-1" />
          {isOwner && <Link to="/-/new" className="gl-btn gl-btn-primary">+ New link</Link>}
          <AuthButton compact />
          <button
            type="button"
            onClick={() => setDark((value) => !value)}
            aria-label={dark ? 'Use light appearance' : 'Use dark appearance'}
            className="gl-btn !min-w-10 !px-2"
          >
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </header>
      <main className="gl-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/-/all" element={<AllLinks />} />
          <Route path="/-/new" element={<NewLink />} />
          <Route path="/-/edit/*" element={<EditLink />} />
          <Route path="/-/settings" element={<Settings />} />
          <Route path="/*" element={<Resolve />} />
        </Routes>
      </main>
      <footer className="gl-footer">go.mhiebl.com · personal golinks</footer>
    </div>
  )
}

export default function App() {
  return <BrowserRouter><Shell /></BrowserRouter>
}
