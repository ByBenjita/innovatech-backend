CREATE DATABASE IF NOT EXISTS innovatech;
USE innovatech;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(50) DEFAULT NULL,
  stock INT NOT NULL DEFAULT 100,
  imagen VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ordenes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'confirmado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orden_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

INSERT INTO productos (nombre, precio, descripcion, categoria, stock) VALUES
('Hamburguesa Clásica', 5990, 'Carne 180g, lechuga, tomate y queso cheddar', 'hamburguesas', 50),
('Hamburguesa BBQ', 7490, 'Carne 200g, cebolla caramelizada y salsa BBQ', 'hamburguesas', 40),
('Hamburguesa Doble', 8990, 'Doble carne 160g, doble queso y jalapeños', 'hamburguesas', 30),
('Pizza Margherita', 8990, 'Salsa de tomate, mozzarella fresca y albahaca', 'pizzas', 30),
('Pizza Pepperoni', 9990, 'Salsa de tomate, pepperoni y mozzarella', 'pizzas', 25),
('Pizza 4 Quesos', 10990, 'Mozzarella, gouda, parmesano y gorgonzola', 'pizzas', 20),
('Ensalada César', 4990, 'Lechuga romana, pollo grillado y crutones', 'ensaladas', 60),
('Ensalada Mediterránea', 5490, 'Mix de hojas, aceitunas, feta y tomates cherry', 'ensaladas', 45),
('Limonada Natural', 1990, 'Limón fresco, agua con gas y menta', 'bebidas', 100),
('Batido de Frutilla', 2990, 'Frutillas frescas, leche y helado de vainilla', 'bebidas', 80),
('Brownie con Helado', 3990, 'Brownie de chocolate caliente con helado de vainilla', 'postres', 35),
('Cheesecake de Maracuyá', 3490, 'Base de galleta, crema de queso y coulis de maracuyá', 'postres', 30);
