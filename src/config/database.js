const { Pool } = require('pg');

// Créer un pool de connexions PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Tester la connexion
pool.on('connect', () => {
  console.log('🗄️  Connecté à PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err);
});

// Fonction helper pour exécuter des requêtes
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executée', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Erreur query:', error);
    throw error;
  }
}

// Fonction pour obtenir un client (pour les transactions)
async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = {
  query,
  getClient,
  pool
};