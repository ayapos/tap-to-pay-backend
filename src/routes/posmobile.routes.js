const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../config/auth.middleware');
const { createPOSMobileSession } = require('../config/adyen.config');

// Toutes les routes sont protégées
router.use(authenticateToken);

// POST /posmobile/session - Créer une session SDK
router.post('/session', async (req, res) => {
  try {
    const { deviceId, platform, appVersion } = req.body;
    const userId = req.user.id;

    // Validation
    if (!deviceId) {
      return res.status(400).json({
        error: 'deviceId requis'
      });
    }

    console.log(`📱 Demande session pour device: ${deviceId}, user: ${userId}`);

    // Appel à Adyen pour créer la session
    const session = await createPOSMobileSession(deviceId, userId);

    res.json({
      sessionToken: session.sessionToken,
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      metadata: {
        deviceId,
        platform,
        appVersion,
        userId
      }
    });

  } catch (error) {
    console.error('❌ Erreur création session:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la session',
      details: error.message
    });
  }
});

module.exports = router;