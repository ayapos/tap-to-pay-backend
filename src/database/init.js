const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    console.log('🗄️  Initialisation de la base de données...');

    // Vérifier si un employé existe déjà
    const checkEmployee = await pool.query(
      'SELECT id FROM employees WHERE email = $1',
      ['john@example.com']
    );

    if (checkEmployee.rows.length === 0) {
      // Récupérer le merchant_id
      const merchantResult = await pool.query(
        'SELECT id FROM merchants WHERE merchant_account = $1',
        ['Ayapos']
      );

      if (merchantResult.rows.length === 0) {
        console.error('❌ Aucun marchand trouvé. Vérifiez le schema.sql');
        process.exit(1);
      }

      const merchantId = merchantResult.rows[0].id;

      // Hasher le mot de passe
      const passwordHash = await bcrypt.hash('password123', 10);

      // Créer un employé de test
      await pool.query(
        `INSERT INTO employees (merchant_id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [merchantId, 'john@example.com', passwordHash, 'John Doe', 'cashier']
      );

      console.log('✅ Employé de test créé : john@example.com / password123');
    } else {
      console.log('ℹ️  Employé de test existe déjà');
    }

    console.log('✅ Base de données initialisée avec succès');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    process.exit(1);
  }
}

initDatabase();