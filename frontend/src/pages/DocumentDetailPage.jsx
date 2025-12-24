import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

function DocumentDetailPage() {
    const { type, subeKodu, fisNo } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchDocumentDetail()
    }, [type, subeKodu, fisNo])

    const fetchDocumentDetail = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`/api/documents/${type}/${subeKodu}/${fisNo}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (response.data.success) {
                setData(response.data.data)
            } else {
                setError('Belge bulunamadı')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Sunucu hatası')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('tr-TR')
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(value || 0)
    }

    const formatNumber = (value, decimals = 2) => {
        return new Intl.NumberFormat('tr-TR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value || 0)
    }

    // AG Grid Column Definitions for line items
    const columnDefs = useMemo(() => [
        {
            headerName: 'Sıra',
            field: 'SIRA',
            width: 80,
            sortable: true
        },
        {
            headerName: 'Stok Kodu',
            field: 'STOK_KODU',
            width: 140,
            sortable: true,
            filter: true,
            cellStyle: { fontFamily: 'monospace', fontWeight: 600 }
        },
        {
            headerName: 'Stok Adı',
            field: 'STOK_ADI',
            flex: 1,
            minWidth: 200,
            sortable: true,
            filter: true
        },
        {
            headerName: 'Miktar',
            field: 'STHAR_GCMIK',
            width: 110,
            sortable: true,
            valueFormatter: (params) => formatNumber(params.value),
            cellStyle: { textAlign: 'right' }
        },
        {
            headerName: 'Birim Fiyat',
            field: 'STHAR_NF',
            width: 130,
            sortable: true,
            valueFormatter: (params) => formatCurrency(params.value),
            cellStyle: { textAlign: 'right' }
        },
        {
            headerName: 'KDV %',
            field: 'STHAR_KDV',
            width: 90,
            sortable: true,
            valueFormatter: (params) => `%${params.value || 0}`,
            cellStyle: { textAlign: 'center' }
        },
        {
            headerName: 'Tutar',
            width: 140,
            sortable: true,
            valueGetter: (params) => (params.data.STHAR_GCMIK || 0) * (params.data.STHAR_NF || 0),
            valueFormatter: (params) => formatCurrency(params.value),
            cellStyle: { textAlign: 'right', fontWeight: 600, color: 'var(--success-400)' }
        },
        {
            headerName: 'Açıklama',
            field: 'STHAR_ACIKLAMA',
            width: 180,
            sortable: true,
            filter: true
        }
    ], [])

    const defaultColDef = useMemo(() => ({
        resizable: true
    }), [])

    // Calculate totals
    const linesTotal = data?.lines?.reduce((sum, line) =>
        sum + ((line.STHAR_GCMIK || 0) * (line.STHAR_NF || 0)), 0) || 0

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <h3>Hata</h3>
                <p>{error}</p>
                <button className="btn btn-secondary" onClick={() => navigate('/documents')}>
                    Belgelere Dön
                </button>
            </div>
        )
    }

    const { header, lines } = data || {}

    return (
        <div>
            <div className="detail-header">
                <div className="detail-title">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/documents')}
                    >
                        ← Geri
                    </button>
                    <h1>{header?.BELGE_TURU} Detayı</h1>
                    <span className={`badge badge-${header?.BELGE_TURU_KOD}`}>
                        {header?.BELGE_TURU}
                    </span>
                </div>
            </div>

            {/* Header Info */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="detail-info">
                    <div className="detail-info-item">
                        <span className="detail-info-label">Fiş No</span>
                        <span className="detail-info-value">{header?.FATIRS_NO}</span>
                    </div>
                    <div className="detail-info-item">
                        <span className="detail-info-label">Şube Kodu</span>
                        <span className="detail-info-value">{header?.SUBE_KODU}</span>
                    </div>
                    <div className="detail-info-item">
                        <span className="detail-info-label">Tarih</span>
                        <span className="detail-info-value">{formatDate(header?.TARIH)}</span>
                    </div>
                    <div className="detail-info-item">
                        <span className="detail-info-label">Kayıt Tarihi</span>
                        <span className="detail-info-value">{formatDate(header?.KAYITTARIHI)}</span>
                    </div>
                    <div className="detail-info-item">
                        <span className="detail-info-label">Kullanıcı</span>
                        <span className="detail-info-value">{header?.KAYITYAPANKUL}</span>
                    </div>
                    <div className="detail-info-item">
                        <span className="detail-info-label">Kalem Adedi</span>
                        <span className="detail-info-value">{header?.FATKALEM_ADEDI}</span>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1rem',
                    marginTop: '1rem'
                }}>
                    <div className="detail-info" style={{ marginBottom: 0 }}>
                        <div className="detail-info-item">
                            <span className="detail-info-label">Cari Kodu</span>
                            <span className="detail-info-value">{header?.CARI_KODU}</span>
                        </div>
                        <div className="detail-info-item">
                            <span className="detail-info-label">Cari İsim</span>
                            <span className="detail-info-value">{header?.CARI_ISIM}</span>
                        </div>
                        <div className="detail-info-item">
                            <span className="detail-info-label">İl / İlçe</span>
                            <span className="detail-info-value">
                                {header?.CARI_IL}{header?.CARI_ILCE ? ` / ${header?.CARI_ILCE}` : ''}
                            </span>
                        </div>
                        <div className="detail-info-item">
                            <span className="detail-info-label">Genel Toplam</span>
                            <span className="detail-info-value" style={{ color: 'var(--success-400)', fontSize: '1.25rem' }}>
                                {formatCurrency(header?.GENELTOPLAM)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lines Table with AG Grid */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Kalemler ({lines?.length || 0})</h3>
                    <div style={{ color: 'var(--success-400)', fontWeight: 600, fontSize: '1.1rem' }}>
                        Toplam: {formatCurrency(linesTotal)}
                    </div>
                </div>

                {lines?.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <p>Kalem bulunamadı</p>
                    </div>
                ) : (
                    <div className="ag-theme-alpine-dark" style={{ height: 400, width: '100%' }}>
                        <AgGridReact
                            rowData={lines}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            animateRows={true}
                            suppressCellFocus={true}
                            enableCellTextSelection={true}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

export default DocumentDetailPage
