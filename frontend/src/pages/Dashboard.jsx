import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, ComposedChart
} from 'recharts'
import { useLayout } from '../context/LayoutContext'

// Color palette
const COLORS = {
    siparis: '#8b5cf6',
    teklif: '#f59e0b',
    success: '#22c55e',
    primary: '#3b82f6'
}

// User colors for charts
const USER_COLORS = [
    '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#f472b6',
    '#22d3ee', '#fb923c', '#a3e635', '#818cf8', '#2dd4bf'
]

function Dashboard() {
    const { setHeaderContent, setHideStandardNav } = useLayout()
    const [data, setData] = useState(null)
    const [topDocuments, setTopDocuments] = useState(null)
    const [years, setYears] = useState([])
    const [users, setUsers] = useState([])
    const [customers, setCustomers] = useState([])
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedUser, setSelectedUser] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [userStats, setUserStats] = useState(null)
    const [customerStats, setCustomerStats] = useState(null)
    const [regionStats, setRegionStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchYears()
    }, [])

    useEffect(() => {
        if (selectedYear) {
            fetchDashboardData()
            fetchTopDocuments()
            fetchCustomers()
            fetchRegionStats()
        }
    }, [selectedYear])

    useEffect(() => {
        if (selectedUser) {
            fetchUserStats()
        } else {
            setUserStats(null)
        }
    }, [selectedUser, selectedYear])

    useEffect(() => {
        if (selectedCustomer) {
            fetchCustomerStats()
        } else {
            setCustomerStats(null)
        }
    }, [selectedCustomer, selectedYear])

    const fetchYears = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get('/api/dashboard/years', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.success) {
                setYears(response.data.data)
                if (response.data.data.length > 0 && !response.data.data.includes(selectedYear)) {
                    setSelectedYear(response.data.data[0])
                }
            }
        } catch (err) {
            console.error('Years fetch error:', err)
        }
    }

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const response = await axios.get(`/api/dashboard/stats?year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (response.data.success) {
                setData(response.data.data)
                setUsers(response.data.data.users || [])
            } else {
                setError('Veriler alınamadı')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Sunucu hatası')
        } finally {
            setLoading(false)
        }
    }

    const fetchTopDocuments = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`/api/dashboard/top-documents?year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.success) {
                setTopDocuments(response.data.data)
            }
        } catch (err) {
            console.error('Top documents error:', err)
        }
    }

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`/api/dashboard/customers?year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.success) {
                setCustomers(response.data.data)
            }
        } catch (err) {
            console.error('Customers error:', err)
        }
    }

    const fetchUserStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`/api/dashboard/user-stats?year=${selectedYear}&user=${encodeURIComponent(selectedUser)}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.success) {
                setUserStats(response.data.data)
            }
        } catch (err) {
            console.error('User stats error:', err)
        }
    }

    const fetchCustomerStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`/api/dashboard/customer-stats?year=${selectedYear}&customer=${encodeURIComponent(selectedCustomer)}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.success) {
                setCustomerStats(response.data.data)
            }
        } catch (err) {
            console.error('Customer stats error:', err)
        }
    }

    const fetchRegionStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`/api/dashboard/region-stats?year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.success) {
                setRegionStats(response.data.data)
            }
        } catch (err) {
            console.error('Region stats error:', err)
        }
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0)
    }

    const formatNumber = (value) => {
        return new Intl.NumberFormat('tr-TR').format(value || 0)
    }

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers
        const searchLower = customerSearch.toLowerCase()
        return customers.filter(c =>
            c.CARI_ISIM?.toLowerCase().includes(searchLower) ||
            c.CARI_KODU?.toLowerCase().includes(searchLower)
        )
    }, [customers, customerSearch])

    // AG Grid Column Definitions
    const orderCustomerColumnDefs = useMemo(() => [
        { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 50, cellStyle: { textAlign: 'center', color: '#64748b' } },
        { headerName: 'Cari İsmi', field: 'CARI_ISIM', flex: 1, minWidth: 180, cellStyle: { fontWeight: 600 } },
        { headerName: 'İlçe', field: 'CARI_ILCE', width: 110, cellStyle: { color: '#94a3b8' } },
        { headerName: 'İl', field: 'CARI_IL', width: 90, cellStyle: { color: '#94a3b8' } },
        { headerName: 'Belge', field: 'belge_sayisi', width: 80, cellStyle: { fontWeight: 600, color: '#a78bfa', textAlign: 'center' } },
        { headerName: 'Toplam Tutar', field: 'toplam_tutar', width: 140, valueFormatter: (p) => formatCurrency(p.value), cellStyle: { fontWeight: 700, color: '#34d399', textAlign: 'right' } }
    ], [])

    const quoteCustomerColumnDefs = useMemo(() => [
        { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 50, cellStyle: { textAlign: 'center', color: '#64748b' } },
        { headerName: 'Cari İsmi', field: 'CARI_ISIM', flex: 1, minWidth: 180, cellStyle: { fontWeight: 600 } },
        { headerName: 'İlçe', field: 'CARI_ILCE', width: 110, cellStyle: { color: '#94a3b8' } },
        { headerName: 'İl', field: 'CARI_IL', width: 90, cellStyle: { color: '#94a3b8' } },
        { headerName: 'Belge', field: 'belge_sayisi', width: 80, cellStyle: { fontWeight: 600, color: '#fbbf24', textAlign: 'center' } },
        { headerName: 'Toplam Tutar', field: 'toplam_tutar', width: 140, valueFormatter: (p) => formatCurrency(p.value), cellStyle: { fontWeight: 700, color: '#34d399', textAlign: 'right' } }
    ], [])

    // Region column definitions
    const regionOrderColumnDefs = useMemo(() => [
        { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 50, cellStyle: { textAlign: 'center', color: '#64748b' } },
        { headerName: 'Bölge', field: 'BOLGE_ISIM', flex: 1, minWidth: 150, cellStyle: { fontWeight: 600 } },
        { headerName: 'Belge', field: 'belge_sayisi', width: 80, cellStyle: { fontWeight: 600, color: '#a78bfa', textAlign: 'center' } },
        { headerName: 'Toplam Tutar', field: 'toplam_tutar', width: 140, valueFormatter: (p) => formatCurrency(p.value), cellStyle: { fontWeight: 700, color: '#34d399', textAlign: 'right' } }
    ], [])

    const regionQuoteColumnDefs = useMemo(() => [
        { headerName: '#', valueGetter: 'node.rowIndex + 1', width: 50, cellStyle: { textAlign: 'center', color: '#64748b' } },
        { headerName: 'Bölge', field: 'BOLGE_ISIM', flex: 1, minWidth: 150, cellStyle: { fontWeight: 600 } },
        { headerName: 'Belge', field: 'belge_sayisi', width: 80, cellStyle: { fontWeight: 600, color: '#fbbf24', textAlign: 'center' } },
        { headerName: 'Toplam Tutar', field: 'toplam_tutar', width: 140, valueFormatter: (p) => formatCurrency(p.value), cellStyle: { fontWeight: 700, color: '#34d399', textAlign: 'right' } }
    ], [])

    const defaultColDef = useMemo(() => ({ resizable: true, suppressMovable: true }), [])

    // Extract summary from data
    const { chartData, summary } = data || {}

    const chartTheme = {
        grid: '#334155',
        text: '#94a3b8',
        tooltip: { background: '#1e293b', border: '#334155' }
    }

    // Header setup
    useEffect(() => {
        setHideStandardNav(true)
        return () => {
            setHeaderContent(null)
            setHideStandardNav(false)
        }
    }, [setHeaderContent, setHideStandardNav])

    // Header Content - Compact style like DocumentsPage
    useEffect(() => {
        if (loading) return // Don't set header content while loading
        setHeaderContent(
            <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
                gap: '1rem'
            }}>
                {/* Left Section - Year Selector */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                    <span style={{ fontSize: '1rem' }}>📅</span>
                    <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.85rem' }}>Yıl:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{
                            width: '90px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '6px',
                            color: '#e2e8f0'
                        }}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                {/* Right Section - Stats */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px' }}>Sipariş</div>
                        <div style={{ fontWeight: 700, color: '#a78bfa', fontSize: '1rem' }}>{formatNumber(summary?.siparis_sayisi)}</div>
                    </div>
                    <div style={{ width: '1px', height: '30px', background: 'rgba(148, 163, 184, 0.15)' }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px' }}>Teklif</div>
                        <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '1rem' }}>{formatNumber(summary?.teklif_sayisi)}</div>
                    </div>
                    <div style={{ width: '1px', height: '30px', background: 'rgba(148, 163, 184, 0.15)' }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px' }}>Sipariş Tutarı</div>
                        <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>{formatCurrency(summary?.siparis_tutar)}</div>
                    </div>
                    <div style={{ width: '1px', height: '30px', background: 'rgba(148, 163, 184, 0.15)' }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px' }}>Teklif Tutarı</div>
                        <div style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.95rem' }}>{formatCurrency(summary?.teklif_tutar)}</div>
                    </div>
                </div>
            </div>
        )
    }, [selectedYear, years, summary, loading, setHeaderContent, formatCurrency, formatNumber])

    // Early returns after all hooks
    if (loading) {
        return (
            <div style={{ height: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <div style={{ color: '#64748b' }}>Kokpit yükleniyor...</div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ height: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h3 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Hata Oluştu</h3>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{error}</p>
                    <button onClick={fetchDashboardData} style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        Tekrar Dene
                    </button>
                </div>
            </div>
        )
    }

    // Styles
    const styles = {
        container: {
            padding: '1rem 1.5rem',
            paddingBottom: '2rem',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.5), transparent)'
        },
        statCard: (gradient) => ({
            background: `linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))`,
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden'
        }),
        statIcon: (bg) => ({
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            background: bg,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
        }),
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginTop: '2rem',
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(90deg, rgba(51, 65, 85, 0.5), transparent)',
            borderRadius: '10px',
            borderLeft: '3px solid'
        },
        chartCard: {
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        },
        chartTitle: {
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        analysisCard: {
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            marginBottom: '1.5rem'
        },
        selectInput: {
            padding: '0.6rem 1rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontSize: '0.9rem'
        },
        gridCard: {
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '16px',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        },
        gridHeader: (color) => ({
            padding: '1rem 1.5rem',
            background: `linear-gradient(135deg, ${color}20, ${color}10)`,
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
        })
    }

    return (
        <div style={styles.container}>
            {/* CSS */}
            <style>{`
                .ag-row:hover { background: rgba(59, 130, 246, 0.08) !important; }
                .ag-header-cell { background: rgba(30, 41, 59, 0.8) !important; }
            `}</style>


            {/* Sipariş Charts */}
            <div style={{ ...styles.sectionHeader, borderColor: '#8b5cf6' }}>
                <span style={{ fontSize: '1.25rem' }}>📦</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>Sipariş Grafikleri</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>(Kullanıcı Bazlı)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>📈 Aylık Sipariş Sayısı</div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} />
                            <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} />
                            <Tooltip contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} labelStyle={{ color: '#f1f5f9' }} />
                            <Legend wrapperStyle={{ color: chartTheme.text }} />
                            {users?.map((user, index) => (
                                <Bar key={user} dataKey={`${user}_siparis`} name={user} fill={USER_COLORS[index % USER_COLORS.length]} radius={[3, 3, 0, 0]} stackId="a" />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>💰 Aylık Sipariş Tutarı</div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} />
                            <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} labelStyle={{ color: '#f1f5f9' }} />
                            <Legend wrapperStyle={{ color: chartTheme.text }} />
                            {users?.map((user, index) => (
                                <Area key={user} type="monotone" dataKey={`${user}_siparis_tutar`} name={user} fill={USER_COLORS[index % USER_COLORS.length]} stroke={USER_COLORS[index % USER_COLORS.length]} fillOpacity={0.3} stackId="1" />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Teklif Charts */}
            <div style={{ ...styles.sectionHeader, borderColor: '#f59e0b' }}>
                <span style={{ fontSize: '1.25rem' }}>📋</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>Teklif Grafikleri</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>(Kullanıcı Bazlı)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>📈 Aylık Teklif Sayısı</div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} />
                            <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} />
                            <Tooltip contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} labelStyle={{ color: '#f1f5f9' }} />
                            <Legend wrapperStyle={{ color: chartTheme.text }} />
                            {users?.map((user, index) => (
                                <Bar key={user} dataKey={`${user}_teklif`} name={user} fill={USER_COLORS[index % USER_COLORS.length]} radius={[3, 3, 0, 0]} stackId="a" />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>💰 Aylık Teklif Tutarı</div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} />
                            <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} labelStyle={{ color: '#f1f5f9' }} />
                            <Legend wrapperStyle={{ color: chartTheme.text }} />
                            {users?.map((user, index) => (
                                <Area key={user} type="monotone" dataKey={`${user}_teklif_tutar`} name={user} fill={USER_COLORS[index % USER_COLORS.length]} stroke={USER_COLORS[index % USER_COLORS.length]} fillOpacity={0.3} stackId="1" />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* User Analysis */}
            <div style={{ ...styles.sectionHeader, borderColor: '#3b82f6' }}>
                <span style={{ fontSize: '1.25rem' }}>👤</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>Kullanıcı Analizi</span>
            </div>
            <div style={styles.analysisCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 500 }}>Kullanıcı Seçin:</span>
                    <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={{ ...styles.selectInput, width: '200px' }}>
                        <option value="">-- Kullanıcı Seçin --</option>
                        {users.map(user => (<option key={user} value={user}>{user}</option>))}
                    </select>
                </div>

                {selectedUser && userStats?.chartData?.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                        <div style={styles.chartCard}>
                            <div style={styles.chartTitle}>📊 {selectedUser} - Aylık Sayı</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <ComposedChart data={userStats.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} />
                                    <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} />
                                    <Tooltip contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} />
                                    <Legend />
                                    <Bar dataKey="siparis_sayisi" name="Sipariş" fill={COLORS.siparis} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="teklif_sayisi" name="Teklif" fill={COLORS.teklif} radius={[4, 4, 0, 0]} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={styles.chartCard}>
                            <div style={styles.chartTitle}>💰 {selectedUser} - Aylık Tutar</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={userStats.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} />
                                    <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="siparis_tutar" name="Sipariş" fill={COLORS.siparis} stroke={COLORS.siparis} fillOpacity={0.3} />
                                    <Area type="monotone" dataKey="teklif_tutar" name="Teklif" fill={COLORS.teklif} stroke={COLORS.teklif} fillOpacity={0.3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                {selectedUser && (!userStats?.chartData || userStats.chartData.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.5 }}>📭</span>
                        Bu kullanıcı için veri bulunamadı.
                    </div>
                )}
            </div>

            {/* Customer Analysis */}
            <div style={{ ...styles.sectionHeader, borderColor: '#22c55e' }}>
                <span style={{ fontSize: '1.25rem' }}>🏢</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>Cari Analizi</span>
            </div>
            <div style={styles.analysisCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 500 }}>Cari Ara:</span>
                    <input type="text" placeholder="Cari adı veya kodu..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} style={{ ...styles.selectInput, width: '200px' }} />
                    <span style={{ color: '#94a3b8', fontWeight: 500, marginLeft: '1rem' }}>Cari Seçin:</span>
                    <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} style={{ ...styles.selectInput, width: '280px' }}>
                        <option value="">-- Cari Seçin ({filteredCustomers.length}) --</option>
                        {filteredCustomers.map(c => (<option key={c.CARI_KODU} value={c.CARI_KODU}>{c.CARI_ISIM}</option>))}
                    </select>
                </div>

                {selectedCustomer && customerStats?.chartData?.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                        <div style={styles.chartCard}>
                            <div style={styles.chartTitle}>📊 Aylık Sipariş/Teklif Sayısı</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <ComposedChart data={customerStats.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} />
                                    <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} />
                                    <Tooltip contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} />
                                    <Legend />
                                    <Bar dataKey="siparis_sayisi" name="Sipariş" fill={COLORS.siparis} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="teklif_sayisi" name="Teklif" fill={COLORS.teklif} radius={[4, 4, 0, 0]} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={styles.chartCard}>
                            <div style={styles.chartTitle}>💰 Aylık Sipariş/Teklif Tutarı</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={customerStats.chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTheme.text }} />
                                    <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="siparis_tutar" name="Sipariş" fill={COLORS.siparis} stroke={COLORS.siparis} fillOpacity={0.3} />
                                    <Area type="monotone" dataKey="teklif_tutar" name="Teklif" fill={COLORS.teklif} stroke={COLORS.teklif} fillOpacity={0.3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                {selectedCustomer && (!customerStats?.chartData || customerStats.chartData.length === 0) && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.5 }}>📭</span>
                        Bu cari için veri bulunamadı.
                    </div>
                )}
            </div>

            {/* Top 50 Customers */}
            <div style={{ ...styles.sectionHeader, borderColor: '#fbbf24' }}>
                <span style={{ fontSize: '1.25rem' }}>🏆</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>En Yüksek Tutarlı Cariler</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>(Top 100 - {selectedYear})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                {/* Orders */}
                <div style={styles.gridCard}>
                    <div style={styles.gridHeader('#8b5cf6')}>
                        <span style={{ fontSize: '1.25rem' }}>📦</span>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Siparişler</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(Tutara Göre)</span>
                    </div>
                    <div className="ag-theme-alpine ag-theme-alpine-dark" style={{ height: 600, width: '100%' }}>
                        <AgGridReact
                            rowData={topDocuments?.topOrderCustomers || []}
                            columnDefs={orderCustomerColumnDefs}
                            defaultColDef={defaultColDef}
                            animateRows={true}
                            suppressCellFocus={true}
                            enableCellTextSelection={true}
                            rowHeight={40}
                            headerHeight={42}
                        />
                    </div>
                </div>

                {/* Quotes */}
                <div style={styles.gridCard}>
                    <div style={styles.gridHeader('#f59e0b')}>
                        <span style={{ fontSize: '1.25rem' }}>📋</span>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Teklifler</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(Tutara Göre)</span>
                    </div>
                    <div className="ag-theme-alpine ag-theme-alpine-dark" style={{ height: 600, width: '100%' }}>
                        <AgGridReact
                            rowData={topDocuments?.topQuoteCustomers || []}
                            columnDefs={quoteCustomerColumnDefs}
                            defaultColDef={defaultColDef}
                            animateRows={true}
                            suppressCellFocus={true}
                            enableCellTextSelection={true}
                            rowHeight={40}
                            headerHeight={42}
                        />
                    </div>
                </div>
            </div>

            {/* Region Based Stats */}
            <div style={{ ...styles.sectionHeader, borderColor: '#22c55e' }}>
                <span style={{ fontSize: '1.25rem' }}>🗺️</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>Bölge Bazlı Dağılım</span>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>({selectedYear})</span>
            </div>

            {/* Region Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Order by Region Chart */}
                <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>📦 Bölge Bazlı Siparişler</div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={regionStats?.orderByRegion || []} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis
                                dataKey="BOLGE_ISIM"
                                tick={{ fontSize: 10, fill: chartTheme.text }}
                                axisLine={{ stroke: chartTheme.grid }}
                                angle={-45}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} labelStyle={{ color: '#f1f5f9' }} />
                            <Bar dataKey="toplam_tutar" name="Sipariş Tutarı" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Quote by Region Chart */}
                <div style={styles.chartCard}>
                    <div style={styles.chartTitle}>📋 Bölge Bazlı Teklifler</div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={regionStats?.quoteByRegion || []} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                            <XAxis
                                dataKey="BOLGE_ISIM"
                                tick={{ fontSize: 10, fill: chartTheme.text }}
                                axisLine={{ stroke: chartTheme.grid }}
                                angle={-45}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 11, fill: chartTheme.text }} axisLine={{ stroke: chartTheme.grid }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: '8px' }} labelStyle={{ color: '#f1f5f9' }} />
                            <Bar dataKey="toplam_tutar" name="Teklif Tutarı" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Region Grids */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                {/* Order by Region Grid */}
                <div style={styles.gridCard}>
                    <div style={styles.gridHeader('#8b5cf6')}>
                        <span style={{ fontSize: '1.25rem' }}>📦</span>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Siparişler (Bölge)</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(Tutara Göre)</span>
                    </div>
                    <div className="ag-theme-alpine ag-theme-alpine-dark" style={{ height: 400, width: '100%' }}>
                        <AgGridReact
                            rowData={regionStats?.orderByRegion || []}
                            columnDefs={regionOrderColumnDefs}
                            defaultColDef={defaultColDef}
                            animateRows={true}
                            suppressCellFocus={true}
                            enableCellTextSelection={true}
                            rowHeight={40}
                            headerHeight={42}
                        />
                    </div>
                </div>

                {/* Quote by Region Grid */}
                <div style={styles.gridCard}>
                    <div style={styles.gridHeader('#f59e0b')}>
                        <span style={{ fontSize: '1.25rem' }}>📋</span>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Teklifler (Bölge)</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>(Tutara Göre)</span>
                    </div>
                    <div className="ag-theme-alpine ag-theme-alpine-dark" style={{ height: 400, width: '100%' }}>
                        <AgGridReact
                            rowData={regionStats?.quoteByRegion || []}
                            columnDefs={regionQuoteColumnDefs}
                            defaultColDef={defaultColDef}
                            animateRows={true}
                            suppressCellFocus={true}
                            enableCellTextSelection={true}
                            rowHeight={40}
                            headerHeight={42}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
