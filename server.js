const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'innovatech',
  waitForConnections: true,
  connectionLimit: 10,
});

const JWT_SECRET   = process.env.JWT_SECRET    || 'saborexpress_secret_2025';
const ADMIN_USER   = process.env.ADMIN_USER     || 'admin';
const ADMIN_PASS   = process.env.ADMIN_PASSWORD || 'admin123';

// ── Migración automática al iniciar ─────────────────────────────────────────
async function migrate() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT NULL`);
    await conn.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 100`);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ordenes (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        total      DECIMAL(10,2) NOT NULL,
        estado     VARCHAR(50)   NOT NULL DEFAULT 'confirmado',
        created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orden_items (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        orden_id         INT           NOT NULL,
        producto_id      INT           NOT NULL,
        cantidad         INT           NOT NULL,
        precio_unitario  DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (orden_id)    REFERENCES ordenes(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);
    console.log('✅ Migración completada');
  } catch (err) {
    console.error('⚠️  Migración:', err.message);
  } finally {
    conn.release();
  }
}

// ── Middleware de autenticación admin ────────────────────────────────────────
function authAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SaborExpress Backend funcionando' });
});

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// ── Productos (público) ──────────────────────────────────────────────────────
app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos ORDER BY categoria, nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Productos (admin) ────────────────────────────────────────────────────────
app.post('/api/productos', authAdmin, async (req, res) => {
  const { nombre, precio, descripcion, categoria, stock } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO productos (nombre, precio, descripcion, categoria, stock) VALUES (?, ?, ?, ?, ?)',
      [nombre, precio, descripcion, categoria ?? null, stock ?? 100]
    );
    res.json({ id: result.insertId, nombre, precio, descripcion, categoria, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/productos/:id', authAdmin, async (req, res) => {
  const { nombre, precio, descripcion, categoria, stock } = req.body;
  try {
    await pool.query(
      'UPDATE productos SET nombre=?, precio=?, descripcion=?, categoria=?, stock=? WHERE id=?',
      [nombre, precio, descripcion, categoria, stock, req.params.id]
    );
    res.json({ id: Number(req.params.id), nombre, precio, descripcion, categoria, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/productos/:id', authAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM productos WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Órdenes (público: crear) ─────────────────────────────────────────────────
app.post('/api/ordenes', async (req, res) => {
  const { items, total } = req.body;
  if (!items || items.length === 0)
    return res.status(400).json({ error: 'El carrito está vacío' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ordenResult] = await conn.query(
      'INSERT INTO ordenes (total, estado) VALUES (?, ?)',
      [total, 'confirmado']
    );
    const ordenId = ordenResult.insertId;

    for (const item of items) {
      const [rows] = await conn.query(
        'SELECT stock, nombre FROM productos WHERE id = ? FOR UPDATE',
        [item.id]
      );
      if (rows.length === 0) throw new Error(`Producto no encontrado: ${item.nombre}`);
      if (rows[0].stock < item.qty)
        throw new Error(`Stock insuficiente para "${rows[0].nombre}" (disponible: ${rows[0].stock})`);

      await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.qty, item.id]);
      await conn.query(
        'INSERT INTO orden_items (orden_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ordenId, item.id, item.qty, item.precio]
      );
    }

    await conn.commit();
    res.json({ id: ordenId, estado: 'confirmado' });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── Órdenes (admin: listar) ──────────────────────────────────────────────────
app.get('/api/ordenes', authAdmin, async (req, res) => {
  try {
    const [ordenes] = await pool.query(`
      SELECT o.id, o.total, o.estado, o.created_at,
        JSON_ARRAYAGG(JSON_OBJECT(
          'nombre',   p.nombre,
          'cantidad', oi.cantidad,
          'precio',   oi.precio_unitario
        )) AS items
      FROM ordenes o
      JOIN orden_items oi ON o.id = oi.orden_id
      JOIN productos   p  ON oi.producto_id = p.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    res.json(ordenes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 SaborExpress Backend en puerto ${PORT}`);
  await migrate();
});
