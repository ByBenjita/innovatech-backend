const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'innovatech'
});

db.connect((err) => {
  if (err) {
    console.error('Error conectando a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Innovatech Backend funcionando' });
});

app.get('/api/productos', (req, res) => {
  db.query('SELECT * FROM productos', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/productos', (req, res) => {
  const { nombre, precio, descripcion } = req.body;
  db.query(
    'INSERT INTO productos (nombre, precio, descripcion) VALUES (?, ?, ?)',
    [nombre, precio, descripcion],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, nombre, precio, descripcion });
    }
  );
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Backend corriendo en puerto ${PORT}`));