const express = require('express');
const router = express.Router();
const { query, getPool } = require('../config/db');
const { verifyToken } = require('./auth');
const { fixArrayStrings } = require('../utils/stringUtils');

// Get available years (only 2025 and later)
router.get('/years', verifyToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT YEAR(KAYITTARIHI) as yil
      FROM (
        SELECT KAYITTARIHI FROM TBLTEKLIFMAS WHERE FTIRSIP='H' AND KAYITTARIHI >= '2025-01-01'
        UNION ALL
        SELECT KAYITTARIHI FROM TBLSIPAMAS WHERE FTIRSIP='6' AND KAYITTARIHI >= '2025-01-01'
      ) AS V
      WHERE KAYITTARIHI IS NOT NULL
      ORDER BY yil DESC
    `);

    res.json({
      success: true,
      data: result.recordset.map(r => r.yil)
    });
  } catch (error) {
    console.error('Years error:', error);
    res.status(500).json({
      success: false,
      message: 'Yıllar alınırken hata oluştu',
      error: error.message
    });
  }
});

// Get dashboard statistics - user-based monthly operations (with year filter)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    const pool = await getPool();
    const request = pool.request();
    request.input('year', selectedYear);

    const result = await request.query(`
      SELECT 
        KAYITYAPANKUL as kullanici,
        MONTH(KAYITTARIHI) as ay,
        YEAR(KAYITTARIHI) as yil,
        COUNT(*) as islem_sayisi,
        SUM(GENELTOPLAM) as toplam_tutar,
        SUM(CASE WHEN FTIRSIP = 'H' THEN 1 ELSE 0 END) as teklif_sayisi,
        SUM(CASE WHEN FTIRSIP = '6' THEN 1 ELSE 0 END) as siparis_sayisi,
        SUM(CASE WHEN FTIRSIP = 'H' THEN GENELTOPLAM ELSE 0 END) as teklif_tutar,
        SUM(CASE WHEN FTIRSIP = '6' THEN GENELTOPLAM ELSE 0 END) as siparis_tutar
      FROM (
        SELECT KAYITYAPANKUL, KAYITTARIHI, GENELTOPLAM, FTIRSIP FROM TBLTEKLIFMAS WHERE FTIRSIP='H' AND KAYITTARIHI >= '2025-01-01'
        UNION ALL
        SELECT KAYITYAPANKUL, KAYITTARIHI, GENELTOPLAM, FTIRSIP FROM TBLSIPAMAS WHERE FTIRSIP='6' AND KAYITTARIHI >= '2025-01-01'
      ) AS V
      WHERE YEAR(KAYITTARIHI) = @year
      GROUP BY KAYITYAPANKUL, MONTH(KAYITTARIHI), YEAR(KAYITTARIHI)
      ORDER BY yil DESC, ay DESC, kullanici
    `);

    // Transform data for charts
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    // Group by month for chart data
    const monthlyData = {};
    const users = new Set();

    result.recordset.forEach(row => {
      const monthKey = `${row.yil}-${String(row.ay).padStart(2, '0')}`;
      const monthLabel = `${monthNames[row.ay - 1]} ${row.yil}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthLabel,
          monthKey,
          toplam_islem: 0,
          toplam_tutar: 0,
          siparis_sayisi: 0,
          teklif_sayisi: 0,
          siparis_tutar: 0,
          teklif_tutar: 0
        };
      }

      users.add(row.kullanici);
      monthlyData[monthKey][`${row.kullanici}_islem`] = row.islem_sayisi;
      monthlyData[monthKey][`${row.kullanici}_tutar`] = parseFloat(row.toplam_tutar) || 0;
      monthlyData[monthKey][`${row.kullanici}_siparis`] = row.siparis_sayisi;
      monthlyData[monthKey][`${row.kullanici}_teklif`] = row.teklif_sayisi;
      monthlyData[monthKey][`${row.kullanici}_siparis_tutar`] = parseFloat(row.siparis_tutar) || 0;
      monthlyData[monthKey][`${row.kullanici}_teklif_tutar`] = parseFloat(row.teklif_tutar) || 0;
      monthlyData[monthKey].toplam_islem += row.islem_sayisi;
      monthlyData[monthKey].toplam_tutar += parseFloat(row.toplam_tutar) || 0;
      monthlyData[monthKey].siparis_sayisi += row.siparis_sayisi;
      monthlyData[monthKey].teklif_sayisi += row.teklif_sayisi;
      monthlyData[monthKey].siparis_tutar += parseFloat(row.siparis_tutar) || 0;
      monthlyData[monthKey].teklif_tutar += parseFloat(row.teklif_tutar) || 0;
    });

    // Convert to array and sort by date
    const chartData = Object.values(monthlyData)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Get summary totals for the selected year
    const summaryRequest = pool.request();
    summaryRequest.input('year', selectedYear);
    const summaryResult = await summaryRequest.query(`
      SELECT 
        COUNT(*) as toplam_islem,
        SUM(GENELTOPLAM) as toplam_tutar,
        SUM(CASE WHEN FTIRSIP = 'H' THEN 1 ELSE 0 END) as teklif_sayisi,
        SUM(CASE WHEN FTIRSIP = '6' THEN 1 ELSE 0 END) as siparis_sayisi,
        SUM(CASE WHEN FTIRSIP = 'H' THEN GENELTOPLAM ELSE 0 END) as teklif_tutar,
        SUM(CASE WHEN FTIRSIP = '6' THEN GENELTOPLAM ELSE 0 END) as siparis_tutar
      FROM (
        SELECT GENELTOPLAM, FTIRSIP, KAYITTARIHI FROM TBLTEKLIFMAS WHERE FTIRSIP='H' AND KAYITTARIHI >= '2025-01-01'
        UNION ALL
        SELECT GENELTOPLAM, FTIRSIP, KAYITTARIHI FROM TBLSIPAMAS WHERE FTIRSIP='6' AND KAYITTARIHI >= '2025-01-01'
      ) AS V
      WHERE YEAR(KAYITTARIHI) = @year
    `);

    res.json({
      success: true,
      data: {
        chartData,
        users: Array.from(users),
        summary: summaryResult.recordset[0],
        selectedYear
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Veriler alınırken hata oluştu',
      error: error.message
    });
  }
});

// Get customer analysis - top customers by orders and quotes
router.get('/customer-analysis', verifyToken, async (req, res) => {
  try {
    const { year, limit = 10 } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    const topLimit = Math.min(parseInt(limit) || 10, 50);

    const pool = await getPool();

    // Top customers by orders (sipariş)
    const orderRequest = pool.request();
    orderRequest.input('year', selectedYear);
    const topOrderCustomers = await orderRequest.query(`
      SELECT TOP ${topLimit}
        V.CARI_KODU,
        C.CARI_ISIM,
        C.CARI_IL,
        COUNT(*) as siparis_sayisi,
        SUM(V.GENELTOPLAM) as toplam_tutar
      FROM TBLSIPAMAS V
      INNER JOIN TBLCASABIT C ON C.CARI_KOD = V.CARI_KODU
      WHERE V.FTIRSIP = '6' AND V.KAYITTARIHI >= '2025-01-01' AND YEAR(V.KAYITTARIHI) = @year
      GROUP BY V.CARI_KODU, C.CARI_ISIM, C.CARI_IL
      ORDER BY siparis_sayisi DESC, toplam_tutar DESC
    `);

    // Top customers by quotes (teklif)
    const quoteRequest = pool.request();
    quoteRequest.input('year', selectedYear);
    const topQuoteCustomers = await quoteRequest.query(`
      SELECT TOP ${topLimit}
        V.CARI_KODU,
        C.CARI_ISIM,
        C.CARI_IL,
        COUNT(*) as teklif_sayisi,
        SUM(V.GENELTOPLAM) as toplam_tutar
      FROM TBLTEKLIFMAS V
      INNER JOIN TBLCASABIT C ON C.CARI_KOD = V.CARI_KODU
      WHERE V.FTIRSIP = 'H' AND V.KAYITTARIHI >= '2025-01-01' AND YEAR(V.KAYITTARIHI) = @year
      GROUP BY V.CARI_KODU, C.CARI_ISIM, C.CARI_IL
      ORDER BY teklif_sayisi DESC, toplam_tutar DESC
    `);

    // Top customers by total amount (combined)
    const totalRequest = pool.request();
    totalRequest.input('year', selectedYear);
    const topTotalCustomers = await totalRequest.query(`
      SELECT TOP ${topLimit}
        V.CARI_KODU,
        C.CARI_ISIM,
        C.CARI_IL,
        COUNT(*) as islem_sayisi,
        SUM(V.GENELTOPLAM) as toplam_tutar,
        SUM(CASE WHEN V.FTIRSIP = '6' THEN 1 ELSE 0 END) as siparis_sayisi,
        SUM(CASE WHEN V.FTIRSIP = 'H' THEN 1 ELSE 0 END) as teklif_sayisi
      FROM (
        SELECT CARI_KODU, GENELTOPLAM, FTIRSIP, KAYITTARIHI FROM TBLSIPAMAS WHERE FTIRSIP = '6' AND KAYITTARIHI >= '2025-01-01'
        UNION ALL
        SELECT CARI_KODU, GENELTOPLAM, FTIRSIP, KAYITTARIHI FROM TBLTEKLIFMAS WHERE FTIRSIP = 'H' AND KAYITTARIHI >= '2025-01-01'
      ) V
      INNER JOIN TBLCASABIT C ON C.CARI_KOD = V.CARI_KODU
      WHERE YEAR(V.KAYITTARIHI) = @year
      GROUP BY V.CARI_KODU, C.CARI_ISIM, C.CARI_IL
      ORDER BY toplam_tutar DESC
    `);

    res.json({
      success: true,
      data: {
        topOrderCustomers: fixArrayStrings(topOrderCustomers.recordset),
        topQuoteCustomers: fixArrayStrings(topQuoteCustomers.recordset),
        topTotalCustomers: fixArrayStrings(topTotalCustomers.recordset),
        selectedYear
      }
    });
  } catch (error) {
    console.error('Customer analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Cari analizi alınırken hata oluştu',
      error: error.message
    });
  }
});

// Get top 50 customers by orders and quotes (cumulative summaries)
router.get('/top-documents', verifyToken, async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    const pool = await getPool();

    // Top 50 customers by order amount
    const orderRequest = pool.request();
    orderRequest.input('year', selectedYear);
    const topOrderCustomers = await orderRequest.query(`
      SELECT TOP 100
        V.CARI_KODU, C.CARI_ISIM, C.CARI_ILCE, C.CARI_IL,
        COUNT(*) as belge_sayisi,
        SUM(V.GENELTOPLAM) as toplam_tutar
      FROM TBLSIPAMAS V
      INNER JOIN TBLCASABIT C ON C.CARI_KOD = V.CARI_KODU
      WHERE V.FTIRSIP = '6' AND V.KAYITTARIHI >= '2025-01-01' AND YEAR(V.KAYITTARIHI) = @year
      GROUP BY V.CARI_KODU, C.CARI_ISIM, C.CARI_ILCE, C.CARI_IL
      ORDER BY toplam_tutar DESC
    `);

    // Top 50 customers by quote amount
    const quoteRequest = pool.request();
    quoteRequest.input('year', selectedYear);
    const topQuoteCustomers = await quoteRequest.query(`
      SELECT TOP 100
        V.CARI_KODU, C.CARI_ISIM, C.CARI_ILCE, C.CARI_IL,
        COUNT(*) as belge_sayisi,
        SUM(V.GENELTOPLAM) as toplam_tutar
      FROM TBLTEKLIFMAS V
      INNER JOIN TBLCASABIT C ON C.CARI_KOD = V.CARI_KODU
      WHERE V.FTIRSIP = 'H' AND V.KAYITTARIHI >= '2025-01-01' AND YEAR(V.KAYITTARIHI) = @year
      GROUP BY V.CARI_KODU, C.CARI_ISIM, C.CARI_ILCE, C.CARI_IL
      ORDER BY toplam_tutar DESC
    `);

    res.json({
      success: true,
      data: {
        topOrderCustomers: fixArrayStrings(topOrderCustomers.recordset),
        topQuoteCustomers: fixArrayStrings(topQuoteCustomers.recordset),
        selectedYear
      }
    });
  } catch (error) {
    console.error('Top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Top cariler alınırken hata oluştu',
      error: error.message
    });
  }
});

// Get customer list for dropdown
router.get('/customers', verifyToken, async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    const pool = await getPool();
    const request = pool.request();
    request.input('year', selectedYear);

    const result = await request.query(`
      SELECT DISTINCT V.CARI_KODU, C.CARI_ISIM
      FROM (
        SELECT CARI_KODU, KAYITTARIHI FROM TBLSIPAMAS WHERE FTIRSIP = '6' AND KAYITTARIHI >= '2025-01-01'
        UNION
        SELECT CARI_KODU, KAYITTARIHI FROM TBLTEKLIFMAS WHERE FTIRSIP = 'H' AND KAYITTARIHI >= '2025-01-01'
      ) V
      INNER JOIN TBLCASABIT C ON C.CARI_KOD = V.CARI_KODU
      WHERE YEAR(V.KAYITTARIHI) = @year
      ORDER BY C.CARI_ISIM
    `);

    res.json({
      success: true,
      data: fixArrayStrings(result.recordset)
    });
  } catch (error) {
    console.error('Customers list error:', error);
    res.status(500).json({
      success: false,
      message: 'Cari listesi alınırken hata oluştu',
      error: error.message
    });
  }
});

// Get monthly stats for specific user
router.get('/user-stats', verifyToken, async (req, res) => {
  try {
    const { year, user } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    if (!user) {
      return res.json({ success: true, data: { chartData: [] } });
    }

    const pool = await getPool();
    const request = pool.request();
    request.input('year', selectedYear);
    request.input('user', user);

    const result = await request.query(`
      SELECT 
        MONTH(KAYITTARIHI) as ay,
        YEAR(KAYITTARIHI) as yil,
        SUM(CASE WHEN FTIRSIP = 'H' THEN 1 ELSE 0 END) as teklif_sayisi,
        SUM(CASE WHEN FTIRSIP = '6' THEN 1 ELSE 0 END) as siparis_sayisi,
        SUM(CASE WHEN FTIRSIP = 'H' THEN GENELTOPLAM ELSE 0 END) as teklif_tutar,
        SUM(CASE WHEN FTIRSIP = '6' THEN GENELTOPLAM ELSE 0 END) as siparis_tutar
      FROM (
        SELECT KAYITYAPANKUL, KAYITTARIHI, GENELTOPLAM, FTIRSIP FROM TBLTEKLIFMAS WHERE FTIRSIP='H' AND KAYITTARIHI >= '2025-01-01'
        UNION ALL
        SELECT KAYITYAPANKUL, KAYITTARIHI, GENELTOPLAM, FTIRSIP FROM TBLSIPAMAS WHERE FTIRSIP='6' AND KAYITTARIHI >= '2025-01-01'
      ) AS V
      WHERE YEAR(KAYITTARIHI) = @year AND KAYITYAPANKUL = @user
      GROUP BY MONTH(KAYITTARIHI), YEAR(KAYITTARIHI)
      ORDER BY yil, ay
    `);

    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    const chartData = result.recordset.map(row => ({
      month: `${monthNames[row.ay - 1]}`,
      monthKey: `${row.yil}-${String(row.ay).padStart(2, '0')}`,
      teklif_sayisi: row.teklif_sayisi,
      siparis_sayisi: row.siparis_sayisi,
      teklif_tutar: parseFloat(row.teklif_tutar) || 0,
      siparis_tutar: parseFloat(row.siparis_tutar) || 0
    }));

    res.json({
      success: true,
      data: { chartData, user, selectedYear }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı istatistikleri alınırken hata oluştu',
      error: error.message
    });
  }
});

// Get monthly stats for specific customer
router.get('/customer-stats', verifyToken, async (req, res) => {
  try {
    const { year, customer } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    if (!customer) {
      return res.json({ success: true, data: { chartData: [] } });
    }

    const pool = await getPool();
    const request = pool.request();
    request.input('year', selectedYear);
    request.input('customer', customer);

    const result = await request.query(`
      SELECT 
        MONTH(KAYITTARIHI) as ay,
        YEAR(KAYITTARIHI) as yil,
        SUM(CASE WHEN FTIRSIP = 'H' THEN 1 ELSE 0 END) as teklif_sayisi,
        SUM(CASE WHEN FTIRSIP = '6' THEN 1 ELSE 0 END) as siparis_sayisi,
        SUM(CASE WHEN FTIRSIP = 'H' THEN GENELTOPLAM ELSE 0 END) as teklif_tutar,
        SUM(CASE WHEN FTIRSIP = '6' THEN GENELTOPLAM ELSE 0 END) as siparis_tutar
      FROM (
        SELECT CARI_KODU, KAYITTARIHI, GENELTOPLAM, FTIRSIP FROM TBLTEKLIFMAS WHERE FTIRSIP='H' AND KAYITTARIHI >= '2025-01-01'
        UNION ALL
        SELECT CARI_KODU, KAYITTARIHI, GENELTOPLAM, FTIRSIP FROM TBLSIPAMAS WHERE FTIRSIP='6' AND KAYITTARIHI >= '2025-01-01'
      ) AS V
      WHERE YEAR(KAYITTARIHI) = @year AND CARI_KODU = @customer
      GROUP BY MONTH(KAYITTARIHI), YEAR(KAYITTARIHI)
      ORDER BY yil, ay
    `);

    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    const chartData = result.recordset.map(row => ({
      month: `${monthNames[row.ay - 1]}`,
      monthKey: `${row.yil}-${String(row.ay).padStart(2, '0')}`,
      teklif_sayisi: row.teklif_sayisi,
      siparis_sayisi: row.siparis_sayisi,
      teklif_tutar: parseFloat(row.teklif_tutar) || 0,
      siparis_tutar: parseFloat(row.siparis_tutar) || 0
    }));

    res.json({
      success: true,
      data: { chartData, customer, selectedYear }
    });
  } catch (error) {
    console.error('Customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Cari istatistikleri alınırken hata oluştu',
      error: error.message
    });
  }
});

// Get region-based statistics
router.get('/region-stats', verifyToken, async (req, res) => {
  try {
    const { year } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    const pool = await getPool();

    // Sipariş by region
    const orderRequest = pool.request();
    orderRequest.input('year', selectedYear);
    const orderByRegion = await orderRequest.query(`
      SELECT 
        ISNULL(K.GRUP_ISIM, 'Tanımsız') as BOLGE_ISIM,
        ISNULL(C.RAPOR_KODU1, '') as BOLGE_KODU,
        COUNT(*) as belge_sayisi,
        SUM(V.GENELTOPLAM) as toplam_tutar
      FROM TBLSIPAMAS V
      INNER JOIN TBLCASABIT C ON C.CARI_KOD = V.CARI_KODU
      LEFT JOIN TBLCARIKOD1 K ON K.GRUP_KOD = C.RAPOR_KODU1
      WHERE V.FTIRSIP = '6' AND V.KAYITTARIHI >= '2025-01-01' AND YEAR(V.KAYITTARIHI) = @year
      GROUP BY ISNULL(K.GRUP_ISIM, 'Tanımsız'), ISNULL(C.RAPOR_KODU1, '')
      ORDER BY toplam_tutar DESC
    `);

    // Teklif by region
    const quoteRequest = pool.request();
    quoteRequest.input('year', selectedYear);
    const quoteByRegion = await quoteRequest.query(`
      SELECT 
        ISNULL(K.GRUP_ISIM, 'Tanımsız') as BOLGE_ISIM,
        ISNULL(C.RAPOR_KODU1, '') as BOLGE_KODU,
        COUNT(*) as belge_sayisi,
        SUM(V.GENELTOPLAM) as toplam_tutar
      FROM TBLTEKLIFMAS V
      INNER JOIN TBLCASABIT C ON C.CARI_KOD = V.CARI_KODU
      LEFT JOIN TBLCARIKOD1 K ON K.GRUP_KOD = C.RAPOR_KODU1
      WHERE V.FTIRSIP = 'H' AND V.KAYITTARIHI >= '2025-01-01' AND YEAR(V.KAYITTARIHI) = @year
      GROUP BY ISNULL(K.GRUP_ISIM, 'Tanımsız'), ISNULL(C.RAPOR_KODU1, '')
      ORDER BY toplam_tutar DESC
    `);

    res.json({
      success: true,
      data: {
        orderByRegion: fixArrayStrings(orderByRegion.recordset),
        quoteByRegion: fixArrayStrings(quoteByRegion.recordset),
        selectedYear
      }
    });
  } catch (error) {
    console.error('Region stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Bölge istatistikleri alınırken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;

