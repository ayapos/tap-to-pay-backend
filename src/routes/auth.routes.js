const { authenticateToken } = require('../config/auth.middleware');
const express = require('express');
const router = express.Router();
const { generateAccessToken, generateRefreshToken } = require('../config/jwt.config');

// Route POST /auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Validation des champs
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email et mot de passe requis'
    });
  }

  // Pour l'instant, on simule un utilisateur (plus tard on utilisera une vraie base de données)
  const mockUser = {
    id: 'emp_123',
    email: 'john@example.com',
    password: 'password123', // En vrai, ce sera hashé !
    name: 'John Doe',
    role: 'cashier'
  };

  // Vérification des identifiants
  if (email === mockUser.email && password === mockUser.password) {
    
    // Données à mettre dans le token
    const payload = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role
    };

    // Génération des tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Réponse avec les tokens
    res.json({
      accessToken,
      refreshToken,
      employee: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role
      }
    });
  } else {
    res.status(401).json({
      error: 'Email ou mot de passe incorrect'
    });
  }
});
// Route GET /auth/me (protégée)
router.get('/me', authenticateToken, (req, res) => {
  // req.user contient les infos du token (ajoutées par le middleware)
  res.json({
    message: 'Vous êtes authentifié !',
    user: req.user
  });
});

module.exports = router;