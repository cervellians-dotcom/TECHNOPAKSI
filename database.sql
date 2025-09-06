-- Create database
CREATE DATABASE IF NOT EXISTS foodflow_db;
USE foodflow_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    type ENUM('points', 'discount') NOT NULL,
    value INT NOT NULL,
    brand VARCHAR(100) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry TIMESTAMP NULL,
    used_at TIMESTAMP NULL,
    used_by_user_id INT NULL,
    FOREIGN KEY (used_by_user_id) REFERENCES users(id)
);

-- Points History table
CREATE TABLE IF NOT EXISTS points_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    points_change INT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert default admin user
INSERT INTO users (username, password, email, fullname, role)
VALUES (
    'admin',
    '$2a$10$XFE/O0v3rqbao1OZjhF.a.GfrxhJIDwEWTrDx.T3bJZuZYhcB42.q', -- password: admin123
    'admin@foodflow.com',
    'Admin',
    'admin'
) ON DUPLICATE KEY UPDATE username=username; 