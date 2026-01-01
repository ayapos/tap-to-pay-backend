const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../config/auth.middleware');
const { createPaymentRequest, createReversalRequest } = require('../config/adyen.config');

// ✅ DB (on suppose que ../config/database exporte { query }
const { query } = require('../config/database');

// Toutes les routes de paiement sont protégées
router.use(authenticateToken);

// POST /payments/intents - Créer une intention de paiement
router.post('/intents', (req, res) => {
  const { amount, currency, storeId } = req.body;
  const employeeId = req.user.id;

  // Validation
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }

  if (!currency) {
    return res.status(400).json({ error: 'Devise requise' });
  }

  // Générer un ID de transaction unique
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Utiliser la vraie fonction Adyen
  const paymentRequest = createPaymentRequest(amount, currency, transactionId);

  console.log(`💳 Intent créé: ${transactionId}, montant: ${amount / 100} ${currency}`);

  res.json({
    transactionId,
    paymentRequest,
    metadata: {
      employeeId,
      storeId,
      createdAt: new Date().toISOString()
    }
  });
});

// POST /payments/confirm - Confirmer un paiement (✅ enregistrement DB)
router.post('/confirm', async (req, res) => {
  const { transactionId, paymentResponse, deviceId, amount, currency } = req.body;
  const employeeId = req.user.id;
  const merchantId = req.user.merchantId;

  // Validation
  if (!transactionId || !paymentResponse) {
    return res.status(400).json({
      error: 'Transaction ID et réponse de paiement requis'
    });
  }

  if (!amount || amount <= 0 || !currency) {
    return res.status(400).json({
      error: 'amount et currency requis'
    });
  }

  // Pour l’instant on simule le statut (plus tard: lire paymentResponse)
  const status = 'success';
  const pspReference = 'MOCK_PSP_REF_123456';

  try {
    // ✅ Insérer dans la DB
    const result = await query(
      `INSERT INTO payments (
        merchant_id, employee_id, device_id,
        transaction_id, amount, currency,
        psp_reference, status,
        created_at, completed_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
      RETURNING
        id, transaction_id, amount, currency, status,
        psp_reference, employee_id, device_id, created_at, completed_at`,
      [
        merchantId,
        employeeId,
        null,
        transactionId,
        amount,
        currency,
        pspReference,
        status
      ]
    );

    const row = result.rows[0];

    // ✅ Réponse propre pour l’app
    const payment = {
      id: row.id,
      transactionId: row.transaction_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      pspReference: row.psp_reference,
      employeeId: row.employee_id,
      deviceId: row.device_id,
      createdAt: row.created_at,
      completedAt: row.completed_at
    };

    res.json({
      message: 'Paiement confirmé',
      payment
    });

  } catch (err) {
    console.error('❌ DB insert error:', err);
    return res.status(500).json({
      error: 'Erreur serveur lors de l’enregistrement du paiement'
    });
  }
});

// POST /payments/reversal - Annuler un paiement
router.post('/reversal', (req, res) => {
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID requis' });
  }

  // Utiliser la vraie fonction Adyen
  const reversalRequest = createReversalRequest(transactionId);

  console.log(`🔄 Reversal créé pour: ${transactionId}`);

  const reversal = {
    transactionId,
    reversalRequest,
    status: 'reversed',
    reversalReference: `REV_${Date.now()}`,
    reversedAt: new Date().toISOString()
  };

  res.json({
    message: 'Paiement annulé',
    reversal
  });
});

// GET /payments/history - Historique des paiements (✅ vraie DB)
router.get('/history', async (req, res) => {
  const employeeId = req.user.id;
  const merchantId = req.user.merchantId;

  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);
  const status = req.query.status; // optionnel

  try {
    // Total
    const totalParams = [merchantId, employeeId];
    let totalSql = `SELECT COUNT(*)::int AS total FROM payments WHERE merchant_id=$1 AND employee_id=$2`;
    if (status) {
      totalSql += ` AND status=$3`;
      totalParams.push(status);
    }

    const totalResult = await query(totalSql, totalParams);
    const total = totalResult.rows[0]?.total ?? 0;

    // Liste
    const listParams = [merchantId, employeeId, limit, offset];
    let listSql = `
      SELECT
        id, transaction_id, amount, currency, status,
        psp_reference, payment_method, card_summary,
        error_code, error_message, created_at, completed_at
      FROM payments
      WHERE merchant_id=$1 AND employee_id=$2
    `;

    if (status) {
      listSql += ` AND status=$5`;
      listParams.push(status);
    }

    listSql += `
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const listResult = await query(listSql, listParams);

    res.json({
      payments: listResult.rows,
      total,
      limit,
      offset
    });

  } catch (err) {
    console.error('❌ DB history error:', err);
    return res.status(500).json({
      error: 'Erreur serveur lors de la récupération de l’historique'
    });
  }
});
// GET /payments/report/today - Rapport de la journée (employé connecté)
router.get('/report/today', async (req, res) => {
  const employeeId = req.user.id;
  const merchantId = req.user.merchantId;

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await query(
      `
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0)::int AS total_success,
        COUNT(*) FILTER (WHERE status = 'success')::int AS count_success,
        COUNT(*) FILTER (WHERE status IN ('declined','error','reversed'))::int AS count_failed,
        COALESCE(MAX(currency), 'CHF') AS currency
      FROM payments
      WHERE merchant_id = $1
        AND employee_id = $2
        AND created_at >= $3
      `,
      [merchantId, employeeId, startOfDay.toISOString()]
    );

    const row = result.rows[0];

    return res.json({
      date: startOfDay.toISOString().slice(0, 10),
      totalAmount: row.total_success,      // centimes
      successCount: row.count_success,
      failedCount: row.count_failed,
      currency: row.currency
    });
  } catch (err) {
    console.error("❌ report/today error:", err);
    return res.status(500).json({ error: "Erreur serveur rapport du jour" });
  }
});

module.exports = router;
