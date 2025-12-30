const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt.config');
const { authenticateToken } = require('../config/auth.middleware');

// Route POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation des champs
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis'
      });
    }

    // Chercher l'utilisateur dans la base de données
    const result = await query(
      'SELECT * FROM employees WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Données à mettre dans le token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchant_id
    };

    // Génération des tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    console.log(`✅ Login réussi: ${user.email}`);

    // Réponse avec les tokens
    res.json({
      accessToken,
      refreshToken,
      employee: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

// Route GET /auth/me (protégée)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les infos de l'utilisateur depuis la DB
    const result = await query(
      'SELECT id, name, email, role FROM employees WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      message: 'Vous êtes authentifié !',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erreur /me:', error);
    res.status(500).json({
      error: 'Erreur serveur'
    });
  }
});

module.exports = router;