import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { useLayout } from '../context/LayoutContext'

function DocumentsPage() {
    const navigate = useNavigate()
    const { setHeaderContent, setHideStandardNav } = useLayout()
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('all')
    const [users, setUsers] = useState([])
    const [selectedUser, setSelectedUser] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [modalDoc, setModalDoc] = useState(null)
    const [detailLines, setDetailLines] = useState([])
    const [detailLoading, setDetailLoading] = useState(false)

    // Date range state
    const today = new Date().toISOString().split('T')[0]
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        fetchDocuments()
    }, [startDate, endDate, selectedUser])

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get('/api/documents/users', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.success) {
                setUsers(response.data.data)
            }
        } catch (err) {
            console.error('Users fetch error:', err)
        }
    }

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            setError('')
            const token = localStorage.getItem('token')
            let url = `/api/documents?startDate=${startDate}&endDate=${endDate}`
            if (selectedUser !== 'all') {
                url += `&user=${encodeURIComponent(selectedUser)}`
            }
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (response.data.success) {
                setDocuments(response.data.data)
            } else {
                setError('Belgeler alınamadı')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Sunucu hatası')
        } finally {
            setLoading(false)
        }
    }

    const fetchDocumentDetail = async (doc) => {
        try {
            setDetailLoading(true)
            const token = localStorage.getItem('token')
            const response = await axios.get(`/api/documents/${doc.BELGE_TURU_KOD}/${doc.SUBE_KODU}/${doc.FATIRS_NO}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.data.success) {
                setDetailLines(response.data.data.lines || [])
            }
        } catch (err) {
            console.error('Detail fetch error:', err)
            setDetailLines([])
        } finally {
            setDetailLoading(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('tr-TR')
    }

    const formatCurrency = useCallback((value) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(value || 0)
    }, [])

    const setDatePreset = useCallback((preset) => {
        const today = new Date()
        let start, end

        switch (preset) {
            case 'today':
                start = end = today.toISOString().split('T')[0]
                break
            case 'yesterday':
                const yesterday = new Date(today)
                yesterday.setDate(yesterday.getDate() - 1)
                start = end = yesterday.toISOString().split('T')[0]
                break
            case 'thisWeek':
                const weekStart = new Date(today)
                weekStart.setDate(today.getDate() - today.getDay() + 1)
                start = weekStart.toISOString().split('T')[0]
                end = today.toISOString().split('T')[0]
                break
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
                end = today.toISOString().split('T')[0]
                break
            case 'lastMonth':
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
                start = lastMonthStart.toISOString().split('T')[0]
                end = lastMonthEnd.toISOString().split('T')[0]
                break
            default:
                return
        }

        setStartDate(start)
        setEndDate(end)
    }, [])

    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            // Type filter
            const typeMatch = filter === 'all' || doc.BELGE_TURU_KOD === filter

            // Search filter
            if (!searchQuery.trim()) return typeMatch

            const query = searchQuery.toLowerCase().trim()
            const customerMatch = doc.CARI_ISIM?.toLowerCase().includes(query)
            const userMatch = doc.KAYITYAPANKUL?.toLowerCase().includes(query)
            const docNoMatch = String(doc.FATIRS_NO).includes(query)

            return typeMatch && (customerMatch || userMatch || docNoMatch)
        })
    }, [documents, filter, searchQuery])

    const totalAmount = useMemo(() => {
        return filteredDocuments.reduce((sum, doc) => sum + (parseFloat(doc.GENELTOPLAM) || 0), 0)
    }, [filteredDocuments])

    const orderCount = useMemo(() => {
        return filteredDocuments.filter(doc => doc.FTIRSIP === '6').length
    }, [filteredDocuments])

    const quoteCount = useMemo(() => {
        return filteredDocuments.filter(doc => doc.FTIRSIP === 'H').length
    }, [filteredDocuments])

    const docCount = filteredDocuments.length

    // Header setup
    useEffect(() => {
        setHideStandardNav(true)
        return () => {
            setHeaderContent(null)
            setHideStandardNav(false)
        }
    }, [setHeaderContent, setHideStandardNav])

    // Header Content - Redesigned
    useEffect(() => {
        setHeaderContent(
            <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
                gap: '1rem'
            }}>
                {/* Left Section - Date Range */}
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
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{
                            width: '125px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '6px',
                            color: '#e2e8f0'
                        }}
                    />
                    <span style={{ color: '#64748b', fontWeight: 500 }}>→</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                            width: '125px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '6px',
                            color: '#e2e8f0'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '0.5rem' }}>
                        {[
                            { key: 'today', label: 'Bugün' },
                            { key: 'yesterday', label: 'Dün' },
                            { key: 'thisWeek', label: 'Hafta' },
                            { key: 'thisMonth', label: 'Ay' }
                        ].map(preset => (
                            <button
                                key={preset.key}
                                onClick={() => setDatePreset(preset.key)}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '5px',
                                    color: '#60a5fa',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Box */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(51, 65, 85, 0.3)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                    <span style={{ fontSize: '1rem' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Müşteri, Kullanıcı, Fiş No..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '180px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '6px',
                            color: '#e2e8f0'
                        }}
                    />
                </div>

                {/* Center Section - Filters */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'rgba(51, 65, 85, 0.3)',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(148, 163, 184, 0.1)'
                }}>
                    <span style={{ fontSize: '1rem' }}>👤</span>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        style={{
                            width: '150px',
                            padding: '6px 10px',
                            fontSize: '0.85rem',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '6px',
                            color: '#e2e8f0'
                        }}
                    >
                        <option value="all">Tüm Kullanıcılar</option>
                        {users.map(user => (
                            <option key={user} value={user}>{user}</option>
                        ))}
                    </select>

                    <div style={{ width: '1px', height: '24px', background: 'rgba(148, 163, 184, 0.2)' }} />

                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                            { key: 'all', label: 'Tümü', icon: '📋' },
                            { key: 'siparis', label: 'Sipariş', icon: '📦' },
                            { key: 'teklif', label: 'Teklif', icon: '📝' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: '5px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    background: filter === f.key
                                        ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                                        : 'rgba(51, 65, 85, 0.5)',
                                    border: filter === f.key
                                        ? 'none'
                                        : '1px solid rgba(148, 163, 184, 0.2)',
                                    borderRadius: '6px',
                                    color: filter === f.key ? 'white' : '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{ fontSize: '0.9rem' }}>{f.icon}</span>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }, [startDate, endDate, selectedUser, filter, searchQuery, users, setHeaderContent, setDatePreset])

    // Column definitions
    const columnDefs = useMemo(() => [
        {
            headerName: 'Tür',
            field: 'BELGE_TURU',
            width: 95,
            sortable: true,
            filter: true,
            headerClass: 'ag-header-center',
            cellStyle: { textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' },
            cellRenderer: (params) => {
                const type = params.data.BELGE_TURU_KOD
                const label = type === 'siparis' ? 'Sipariş' : 'Teklif'
                const gradient = type === 'siparis'
                    ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)'
                return (
                    <span style={{
                        background: gradient,
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        boxShadow: type === 'siparis' ? '0 2px 4px rgba(139, 92, 246, 0.3)' : '0 2px 4px rgba(245, 158, 11, 0.3)'
                    }}>
                        {label}
                    </span>
                )
            }
        },
        {
            headerName: 'Tarih',
            field: 'TARIH',
            width: 100,
            sortable: true,
            cellStyle: { fontWeight: 500 },
            valueFormatter: (params) => formatDate(params.value)
        },
        {
            headerName: 'Saat',
            field: 'KAYITTARIHI',
            width: 65,
            sortable: true,
            cellStyle: { color: '#64748b', fontSize: '0.85rem' },
            valueFormatter: (params) => {
                if (!params.value) return '-'
                const timeStr = String(params.value)
                const match = timeStr.match(/(\d{2}):(\d{2})/)
                if (match) return `${match[1]}:${match[2]}`
                return '-'
            }
        },
        {
            headerName: 'Fiş No',
            field: 'FATIRS_NO',
            width: 85,
            sortable: true,
            filter: true,
            cellStyle: { fontWeight: 700, color: '#60a5fa' }
        },
        {
            headerName: 'Müşteri',
            field: 'CARI_ISIM',
            flex: 1,
            minWidth: 220,
            sortable: true,
            filter: true,
            cellRenderer: (params) => {
                const il = params.data.CARI_IL || ''
                const ilce = params.data.CARI_ILCE || ''
                const location = ilce ? `${il}/${ilce}` : il
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{params.value || '-'}</span>
                        {location && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({location})</span>}
                    </div>
                )
            }
        },
        {
            headerName: 'Kalem',
            field: 'FATKALEM_ADEDI',
            width: 65,
            sortable: true,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (params) => (
                <span style={{
                    background: 'rgba(100, 116, 139, 0.2)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 500
                }}>
                    {params.value}
                </span>
            )
        },
        {
            headerName: 'Tutar',
            field: 'GENELTOPLAM',
            width: 120,
            sortable: true,
            valueFormatter: (params) => formatCurrency(params.value),
            cellStyle: { fontWeight: 700, color: '#34d399', textAlign: 'right' }
        },
        {
            headerName: 'Kullanıcı',
            field: 'KAYITYAPANKUL',
            width: 90,
            sortable: true,
            cellStyle: { color: '#94a3b8', fontSize: '0.85rem' }
        }
    ], [formatCurrency])

    const defaultColDef = useMemo(() => ({
        resizable: true,
        suppressMovable: true
    }), [])

    const detailColumnDefs = useMemo(() => [
        {
            headerName: '#',
            field: 'SIRA',
            width: 50,
            cellStyle: { textAlign: 'center', color: '#64748b' }
        },
        {
            headerName: 'Stok Kodu',
            field: 'STOK_KODU',
            width: 130,
            cellStyle: { fontWeight: 600, color: '#60a5fa' }
        },
        {
            headerName: 'Stok Adı',
            field: 'STOK_ADI',
            flex: 1,
            minWidth: 250,
            cellStyle: { fontWeight: 500 }
        },
        {
            headerName: 'E.Kalan',
            field: 'EKALAN',
            width: 85,
            cellStyle: { textAlign: 'right', color: '#f59e0b' },
            valueFormatter: (params) => params.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'
        },
        {
            headerName: 'Miktar',
            field: 'STHAR_GCMIK',
            width: 85,
            cellStyle: { textAlign: 'right', fontWeight: 600 },
            valueFormatter: (params) => params.value?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'
        },
        {
            headerName: 'B.Fiyat',
            field: 'STHAR_NF',
            width: 100,
            cellStyle: { textAlign: 'right' },
            valueFormatter: (params) => formatCurrency(params.value)
        },
        {
            headerName: 'KDV',
            field: 'STHAR_KDV',
            width: 55,
            cellStyle: { textAlign: 'center', color: '#94a3b8' },
            valueFormatter: (params) => `%${params.value || 0}`
        },
        {
            headerName: 'Tutar',
            field: 'TUTAR',
            width: 115,
            cellStyle: { fontWeight: 700, color: '#34d399', textAlign: 'right' },
            valueGetter: (params) => (params.data.STHAR_GCMIK || 0) * (params.data.STHAR_NF || 0),
            valueFormatter: (params) => formatCurrency(params.value)
        }
    ], [formatCurrency])

    const onRowDoubleClicked = useCallback((event) => {
        setModalDoc(event.data)
        setShowModal(true)
        fetchDocumentDetail(event.data)
    }, [])

    const closeModal = () => {
        setShowModal(false)
        setModalDoc(null)
        setDetailLines([])
    }

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showModal) closeModal()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [showModal])

    const calculateSummary = () => {
        const satirToplam = detailLines.reduce((sum, line) => sum + ((line.STHAR_GCMIK || 0) * (line.STHAR_NF || 0)), 0)
        const genelToplam = parseFloat(modalDoc?.GENELTOPLAM) || 0
        const kdvTutar = genelToplam - satirToplam
        return { satirToplam, kdvTutar, genelToplam }
    }

    return (
        <div style={{
            height: 'calc(100vh - 65px)',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.5), transparent)'
        }}>
            {/* CSS */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .ag-row:hover { background: rgba(59, 130, 246, 0.08) !important; }
                .ag-header-cell { background: rgba(30, 41, 59, 0.8) !important; text-align: center !important; }
                .ag-header-cell-label { justify-content: center !important; }
                .ag-header-center .ag-header-cell-label { justify-content: center !important; }
            `}</style>

            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <div style={{ color: '#64748b' }}>Belgeler yükleniyor...</div>
                    </div>
                </div>
            ) : error ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h3 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Hata Oluştu</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{error}</p>
                        <button
                            onClick={fetchDocuments}
                            style={{
                                padding: '0.75rem 2rem',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Tekrar Dene
                        </button>
                    </div>
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
                        <h3 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Belge Bulunamadı</h3>
                        <p style={{ color: '#64748b' }}>Seçili filtreler için kayıt yok</p>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        flex: 1,
                        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
                        borderRadius: '14px',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
                        overflow: 'hidden'
                    }}>
                        <div className="ag-theme-alpine ag-theme-alpine-dark" style={{ height: '100%', width: '100%' }}>
                            <AgGridReact
                                rowData={filteredDocuments}
                                columnDefs={columnDefs}
                                defaultColDef={defaultColDef}
                                animateRows={true}
                                rowSelection="single"
                                onRowDoubleClicked={onRowDoubleClicked}
                                suppressCellFocus={true}
                                enableCellTextSelection={true}
                                rowHeight={48}
                                headerHeight={46}
                            />
                        </div>
                    </div>

                    {/* Footer Stats */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '1.5rem',
                        marginTop: '1rem',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>📄</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Toplam:</span>
                            <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '1.1rem' }}>{docCount}</span>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(148, 163, 184, 0.2)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>📦</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sipariş:</span>
                            <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: '1.1rem' }}>{orderCount}</span>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(148, 163, 184, 0.2)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>📋</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Teklif:</span>
                            <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '1.1rem' }}>{quoteCount}</span>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(148, 163, 184, 0.2)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>💰</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Tutar:</span>
                            <span style={{ fontWeight: 700, color: '#34d399', fontSize: '1.1rem' }}>{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && modalDoc && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={closeModal}
                >
                    <div
                        style={{
                            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 1))',
                            borderRadius: '20px',
                            border: '1px solid rgba(148, 163, 184, 0.15)',
                            width: '94%',
                            maxWidth: '1300px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
                            animation: 'slideUp 0.3s ease-out',
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '1.5rem 2rem',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                            background: 'linear-gradient(180deg, rgba(51, 65, 85, 0.4), transparent)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{
                                    background: modalDoc.BELGE_TURU_KOD === 'siparis'
                                        ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                }}>
                                    <span style={{ fontSize: '1.25rem' }}>{modalDoc.BELGE_TURU_KOD === 'siparis' ? '📦' : '📋'}</span>
                                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>
                                        {modalDoc.BELGE_TURU_KOD === 'siparis' ? 'SİPARİŞ' : 'TEKLİF'}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9' }}>
                                        #{modalDoc.FATIRS_NO}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '2px' }}>
                                        {formatDate(modalDoc.TARIH)} • {modalDoc.KAYITYAPANKUL}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{
                                    background: 'rgba(51, 65, 85, 0.4)',
                                    padding: '0.75rem 1.25rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(148, 163, 184, 0.1)'
                                }}>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>MÜŞTERİ</div>
                                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.95rem' }}>{modalDoc.CARI_ISIM}</div>
                                </div>
                                <button
                                    onClick={closeModal}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#f87171',
                                        padding: '0.75rem 1.25rem',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    ✕ Kapat
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {detailLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                                        <div style={{ color: '#64748b' }}>Yükleniyor...</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="ag-theme-alpine ag-theme-alpine-dark" style={{ height: 'auto', maxHeight: '55vh', width: '100%' }}>
                                    <AgGridReact
                                        rowData={detailLines}
                                        columnDefs={detailColumnDefs}
                                        defaultColDef={defaultColDef}
                                        animateRows={true}
                                        suppressCellFocus={true}
                                        enableCellTextSelection={true}
                                        domLayout='autoHeight'
                                        rowHeight={44}
                                        headerHeight={44}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '1.25rem 2rem',
                            borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                            background: 'linear-gradient(0deg, rgba(51, 65, 85, 0.4), transparent)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    color: '#60a5fa',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    📊 {detailLines.length} Kalem
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                {(() => {
                                    const { satirToplam, kdvTutar, genelToplam } = calculateSummary()
                                    return (
                                        <>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>SATIR TOPLAMI</div>
                                                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#e2e8f0' }}>{formatCurrency(satirToplam)}</div>
                                            </div>
                                            <div style={{ width: '1px', height: '35px', background: 'rgba(148, 163, 184, 0.15)' }} />
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>KDV</div>
                                                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fbbf24' }}>{formatCurrency(kdvTutar)}</div>
                                            </div>
                                            <div style={{ width: '1px', height: '35px', background: 'rgba(148, 163, 184, 0.15)' }} />
                                            <div style={{
                                                textAlign: 'right',
                                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(34, 197, 94, 0.2)'
                                            }}>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px' }}>GENEL TOPLAM</div>
                                                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#34d399' }}>{formatCurrency(genelToplam)}</div>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DocumentsPage
