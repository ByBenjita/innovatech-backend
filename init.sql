CREATE DATABASE IF NOT EXISTS innovatech;
USE innovatech;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO productos (nombre, precio, descripcion) VALUES
('Producto A', 9990, 'Descripción del producto A'),
('Producto B', 19990, 'Descripción del producto B'),
('Producto C', 29990, 'Descripción del producto C');