import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import DocumentsPage from './pages/DocumentsPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import { LayoutProvider, useLayout } from './context/LayoutContext'

// Auth Context
const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        if (token && userData) {
            setUser(JSON.parse(userData))
        }
        setLoading(false)
    }, [])

    const login = (token, userData) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

function PrivateRoute({ children }) {
    const { user } = useAuth()
    return user ? children : <Navigate to="/login" />
}

function Navbar() {
    const { user, logout } = useAuth()
    const { headerContent, hideStandardNav } = useLayout()
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link'

    return (
        <nav className="navbar">
            <div className="navbar-brand" style={{ marginRight: '1rem' }}>
                {hideStandardNav ? (
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(location.pathname === '/' ? '/documents' : '/')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem' }}
                    >
                        <span>{location.pathname === '/' ? '📋' : '📊'}</span>
                        <span>{location.pathname === '/' ? 'Belgeler' : 'Kokpit'}</span>
                    </button>
                ) : (
                    <span className="navbar-logo">📊 GenelCRM</span>
                )}
            </div>

            {!hideStandardNav && (
                <div className="navbar-nav">
                    <Link to="/" className={isActive('/')}>Dashboard</Link>
                    <Link to="/documents" className={isActive('/documents')}>Belgeler</Link>
                </div>
            )}

            {/* Dynamic Header Content Area */}
            {headerContent && (
                <div className="navbar-dynamic-content" style={{ flex: 1, display: 'flex', justifyContent: 'center', marginLeft: '1rem', marginRight: '1rem' }}>
                    {headerContent}
                </div>
            )}

            {!headerContent && <div style={{ flex: 1 }}></div>}

            {!hideStandardNav && (
                <div className="navbar-user">
                    <div className="user-info">
                        <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
                        <span>{user?.name || 'Kullanıcı'}</span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                        Çıkış
                    </button>
                </div>
            )}
        </nav>
    )
}

function Layout({ children }) {
    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <LayoutProvider>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={
                            <PrivateRoute>
                                <Layout><Dashboard /></Layout>
                            </PrivateRoute>
                        } />
                        <Route path="/documents" element={
                            <PrivateRoute>
                                <Layout><DocumentsPage /></Layout>
                            </PrivateRoute>
                        } />
                        <Route path="/documents/:type/:subeKodu/:fisNo" element={
                            <PrivateRoute>
                                <Layout><DocumentDetailPage /></Layout>
                            </PrivateRoute>
                        } />
                    </Routes>
                </LayoutProvider>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
