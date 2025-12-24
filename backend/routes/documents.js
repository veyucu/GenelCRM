const express = require('express');
const router = express.Router();
const { query, sql, getPool } = require('../config/db');
const { verifyToken } = require('./auth');
const { fixArrayStrings, fixObjectStrings } = require('../utils/stringUtils');

// Get all users who have created documents
router.get('/users', verifyToken, async (req, res) => {
    try {
        const pool = await getPool();
        const request = pool.request();
        const result = await request.query(`
      SELECT DISTINCT KAYITYAPANKUL as kullanici
      FROM (
        SELECT KAYITYAPANKUL FROM TBLTEKLIFMAS WHERE FTIRSIP='H' AND KAYITYAPANKUL IS NOT NULL AND KAYITTARIHI >= '2025-01-01'
        UNION
        SELECT KAYITYAPANKUL FROM TBLSIPAMAS WHERE FTIRSIP='6' AND KAYITYAPANKUL IS NOT NULL AND KAYITTARIHI >= '2025-01-01'
      ) AS V
      ORDER BY KAYITYAPANKUL
    `);

        res.json({
            success: true,
            data: result.recordset.map(r => r.kullanici)
        });
    } catch (error) {
        console.error('Users list error:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcılar alınırken hata oluştu',
            error: error.message
        });
    }
});

// Get all documents (orders and quotes) with date range filter
router.get('/', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate, user } = req.query;

        // Default to today if no dates provided
        const today = new Date();
        const defaultStart = startDate || today.toISOString().split('T')[0];
        const defaultEnd = endDate || today.toISOString().split('T')[0];

        const pool = await getPool();
        const request = pool.request();
        request.input('startDate', defaultStart);
        request.input('endDate', defaultEnd);

        // Build user filter condition
        let userFilter = '';
        if (user && user !== 'all') {
            request.input('user', user);
            userFilter = 'AND KAYITYAPANKUL = @user';
        }

        const result = await request.query(`
      SELECT
        V.SUBE_KODU,
        V.FTIRSIP,
        V.TIPI,
        V.FATIRS_NO,
        V.CARI_KODU,
        C.CARI_ISIM,
        C.CARI_ILCE,
        C.CARI_IL,
        V.TARIH,
        V.FATKALEM_ADEDI,
        V.GENELTOPLAM,
        V.KAYITYAPANKUL,
        V.KAYITTARIHI
      FROM
      (
        SELECT 
          SUBE_KODU,
          FTIRSIP,
          TIPI,
          FATIRS_NO,
          CARI_KODU,
          TARIH,
          FATKALEM_ADEDI,
          GENELTOPLAM,
          KAYITYAPANKUL,
          KAYITTARIHI
        FROM TBLTEKLIFMAS 
        WHERE FTIRSIP='H' 
          AND CAST(TARIH AS DATE) >= @startDate 
          AND CAST(TARIH AS DATE) <= @endDate
          ${userFilter}
        UNION ALL
        SELECT
          SUBE_KODU,
          FTIRSIP,
          TIPI,
          FATIRS_NO,
          CARI_KODU,
          TARIH,
          FATKALEM_ADEDI,
          GENELTOPLAM,
          KAYITYAPANKUL,
          KAYITTARIHI
        FROM TBLSIPAMAS 
        WHERE FTIRSIP='6'
          AND CAST(TARIH AS DATE) >= @startDate 
          AND CAST(TARIH AS DATE) <= @endDate
          ${userFilter}
      ) AS V
      INNER JOIN TBLCASABIT C ON (C.CARI_KOD=V.CARI_KODU)
      ORDER BY V.KAYITTARIHI DESC
    `);

        // Transform data to add document type label and fix Turkish chars
        const documents = fixArrayStrings(result.recordset).map(doc => ({
            ...doc,
            BELGE_TURU: doc.FTIRSIP === '6' ? 'Sipariş' : 'Teklif',
            BELGE_TURU_KOD: doc.FTIRSIP === '6' ? 'siparis' : 'teklif'
        }));

        res.json({
            success: true,
            data: documents,
            filters: {
                startDate: defaultStart,
                endDate: defaultEnd
            }
        });
    } catch (error) {
        console.error('Documents list error:', error);
        res.status(500).json({
            success: false,
            message: 'Belgeler alınırken hata oluştu',
            error: error.message
        });
    }
});

// Get document detail (line items)
router.get('/:type/:subeKodu/:fisNo', verifyToken, async (req, res) => {
    try {
        const { type, subeKodu, fisNo } = req.params;
        const ftirsip = type === 'siparis' ? '6' : 'H';

        // Get header info
        let headerQuery;
        if (ftirsip === '6') {
            headerQuery = `
        SELECT 
          M.SUBE_KODU, M.FTIRSIP, M.TIPI, M.FATIRS_NO, M.CARI_KODU,
          C.CARI_ISIM, C.CARI_ILCE, C.CARI_IL,
          M.TARIH, M.FATKALEM_ADEDI, M.GENELTOPLAM, M.KAYITYAPANKUL, M.KAYITTARIHI
        FROM TBLSIPAMAS M
        INNER JOIN TBLCASABIT C ON C.CARI_KOD = M.CARI_KODU
        WHERE M.FTIRSIP = '6' AND M.SUBE_KODU = @param0 AND M.FATIRS_NO = @param1
      `;
        } else {
            headerQuery = `
        SELECT 
          M.SUBE_KODU, M.FTIRSIP, M.TIPI, M.FATIRS_NO, M.CARI_KODU,
          C.CARI_ISIM, C.CARI_ILCE, C.CARI_IL,
          M.TARIH, M.FATKALEM_ADEDI, M.GENELTOPLAM, M.KAYITYAPANKUL, M.KAYITTARIHI
        FROM TBLTEKLIFMAS M
        INNER JOIN TBLCASABIT C ON C.CARI_KOD = M.CARI_KODU
        WHERE M.FTIRSIP = 'H' AND M.SUBE_KODU = @param0 AND M.FATIRS_NO = @param1
      `;
        }

        const pool = await require('../config/db').getPool();
        const headerRequest = pool.request();
        headerRequest.input('param0', subeKodu);
        headerRequest.input('param1', fisNo);
        const headerResult = await headerRequest.query(headerQuery);

        if (headerResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Belge bulunamadı'
            });
        }

        // Get line items
        let linesQuery;
        if (ftirsip === '6') {
            linesQuery = `
        SELECT
          V.SUBE_KODU,
          V.STOK_KODU,
          S.STOK_ADI,
          V.FISNO,
          V.STHAR_TARIH,
          V.STHAR_GCMIK,
          V.STHAR_KDV,
          V.STHAR_NF,
          V.STHAR_ACIKLAMA,
          V.STHAR_HTUR,
          V.EKALAN,
          V.INCKEYNO,
          V.SIRA
        FROM TBLSIPATRA V
        INNER JOIN TBLSTSABIT S ON V.STOK_KODU = S.STOK_KODU
        WHERE V.STHAR_FTIRSIP = '6' AND V.SUBE_KODU = @param0 AND V.FISNO = @param1
        ORDER BY V.SIRA
      `;
        } else {
            linesQuery = `
        SELECT
          V.SUBE_KODU,
          V.STOK_KODU,
          S.STOK_ADI,
          V.FISNO,
          V.STHAR_TARIH,
          V.STHAR_GCMIK,
          V.STHAR_KDV,
          V.STHAR_NF,
          V.STHAR_ACIKLAMA,
          V.STHAR_HTUR,
          V.EKALAN,
          V.INCKEYNO,
          V.SIRA
        FROM TBLTEKLIFTRA V
        INNER JOIN TBLSTSABIT S ON V.STOK_KODU = S.STOK_KODU
        WHERE V.STHAR_FTIRSIP = 'H' AND V.SUBE_KODU = @param0 AND V.FISNO = @param1
        ORDER BY V.SIRA
      `;
        }

        const linesRequest = pool.request();
        linesRequest.input('param0', subeKodu);
        linesRequest.input('param1', fisNo);
        const linesResult = await linesRequest.query(linesQuery);

        const header = fixObjectStrings(headerResult.recordset[0]);
        header.BELGE_TURU = ftirsip === '6' ? 'Sipariş' : 'Teklif';
        header.BELGE_TURU_KOD = ftirsip === '6' ? 'siparis' : 'teklif';

        res.json({
            success: true,
            data: {
                header,
                lines: fixArrayStrings(linesResult.recordset)
            }
        });
    } catch (error) {
        console.error('Document detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Belge detayı alınırken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;
