// Importation des dépendances
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Création de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permet les requêtes depuis l'app mobile
app.use(express.json()); // Permet de lire les données JSON

// Routes
const authRoutes = require('./src/routes/auth.routes');
app.use('/auth', authRoutes);
const paymentRoutes = require('./src/routes/payment.routes');
app.use('/payments', paymentRoutes);
const posmobileRoutes = require('./src/routes/posmobile.routes');
app.use('/posmobile', posmobileRoutes);

// Route de test (pour vérifier que le serveur fonctionne)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Mon Backend Tap to Pay fonctionne !',
    version: '1.0.0',
    status: 'running'
  });
});

// Route de santé (health check)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
console.log(`📱 Environnement: ${process.env.NODE_ENV}`);
  });