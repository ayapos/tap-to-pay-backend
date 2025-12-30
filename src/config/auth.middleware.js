const { verifyToken } = require('./jwt.config');

// Middleware pour vérifier le token JWT
function authenticateToken(req, res, next) {
  // Récupérer le token depuis l'en-tête Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  // Si pas de token
  if (!token) {
    return res.status(401).json({
      error: 'Token manquant. Authentification requise.'
    });
  }

  // Vérifier le token
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(403).json({
      error: 'Token invalide ou expiré.'
    });
  }

  // Ajouter les infos de l'utilisateur à la requête
  req.user = decoded;
  
  // Continuer vers la route suivante
  next();
}

module.exports = { authenticateToken };