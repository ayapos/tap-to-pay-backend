const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../config/auth.middleware');
const { createPaymentRequest, createReversalRequest } = require('../config/adyen.config');

// Toutes les routes de paiement sont protégées
router.use(authenticateToken);

// POST /payments/intents - Créer une intention de paiement
router.post('/intents', (req, res) => {
  const { amount, currency, storeId } = req.body;
  const employeeId = req.user.id;

  // Validation
  if (!amount || amount <= 0) {
    return res.status(400).json({
      error: 'Montant invalide'
    });
  }

  if (!currency) {
    return res.status(400).json({
      error: 'Devise requise'
    });
  }

  // Générer un ID de transaction unique
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Utiliser la vraie fonction Adyen
  const paymentRequest = createPaymentRequest(amount, currency, transactionId);

  console.log(`💳 Intent créé: ${transactionId}, montant: ${amount/100} ${currency}`);

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

// POST /payments/confirm - Confirmer un paiement
router.post('/confirm', (req, res) => {
  const { transactionId, paymentResponse, deviceId } = req.body;
  const employeeId = req.user.id;

  // Validation
  if (!transactionId || !paymentResponse) {
    return res.status(400).json({
      error: 'Transaction ID et réponse de paiement requis'
    });
  }

  // Simuler l'enregistrement dans la base de données
  const payment = {
    id: `pay_${Date.now()}`,
    transactionId,
    employeeId,
    deviceId,
    status: 'success',
    pspReference: 'MOCK_PSP_REF_123456',
    confirmedAt: new Date().toISOString()
  };

  res.json({
    message: 'Paiement confirmé',
    payment
  });
});

// POST /payments/reversal - Annuler un paiement
router.post('/reversal', (req, res) => {
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({
      error: 'Transaction ID requis'
    });
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

// GET /payments/history - Historique des paiements
router.get('/history', (req, res) => {
  const employeeId = req.user.id;
  const { limit = 20, offset = 0, status } = req.query;

  // Simuler des données d'historique
  const mockPayments = [
    {
      id: 'pay_001',
      amount: 5000,
      currency: 'EUR',
      status: 'success',
      cardSummary: '**** 1234',
      createdAt: new Date().toISOString()
    },
    {
      id: 'pay_002',
      amount: 12050,
      currency: 'EUR',
      status: 'success',
      cardSummary: '**** 5678',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  res.json({
    payments: mockPayments,
    total: mockPayments.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

module.exports = router;