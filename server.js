require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
// Increase JSON limit and add error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch(e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next();
});

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Maximum 1 file per request
  },
  fileFilter: function (req, file, cb) {
    // Validate file type
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

// Error handling middleware for file uploads
const uploadMiddleware = (req, res, next) => {
  upload.single('image')(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File terlalu besar. Maksimal ukuran file adalah 5MB.' 
        });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({ error: err.message });
    }
    // Everything went fine
    next();
  });
};

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'foodflow_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, email, username, password } = req.body;
    
    // Validate required fields
    if (!fullname || !email || !username || !password) {
      return res.status(400).json({ 
        error: 'Semua field harus diisi' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Format email tidak valid' 
      });
    }

    // Check if user exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        error: 'Username atau email sudah digunakan' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    await pool.query(
      'INSERT INTO users (fullname, email, username, password, role, points) VALUES (?, ?, ?, ?, ?, ?)',
      [fullname, email, username, hashedPassword, 'user', 0]
    );

    res.status(201).json({ 
      message: 'Registrasi berhasil' 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      error: 'Terjadi kesalahan saat registrasi' 
    });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = users[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        points: user.points
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected Routes

// Get User Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, fullname, email, role, points FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Locations
app.get('/api/locations', async (req, res) => {
  try {
    const [locations] = await pool.query('SELECT * FROM locations');
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/locations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, address, lat, lng } = req.body;
    await pool.query(
      'INSERT INTO locations (name, address, lat, lng) VALUES (?, ?, ?, ?)',
      [name, address, lat, lng]
    );

    res.status(201).json({ message: 'Location added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate vouchers
app.post('/api/vouchers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type, value, quantity, expiry, brand } = req.body;
    
    if (!brand) {
      return res.status(400).json({ error: 'Brand is required' });
    }

    const vouchers = [];
    const codes = [];

    for (let i = 0; i < quantity; i++) {
      const code = 'FF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      vouchers.push([code, type, value, brand, false, expiry]);
      codes.push(code);
    }

    await pool.query(
      'INSERT INTO vouchers (code, type, value, brand, used, expiry) VALUES ?',
      [vouchers]
    );

    res.status(201).json({ 
      message: 'Vouchers generated successfully',
      codes: codes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vouchers/redeem', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    
    // Start transaction
    await pool.query('START TRANSACTION');

    // Get voucher
    const [vouchers] = await pool.query(
      'SELECT * FROM vouchers WHERE code = ? AND used = false FOR UPDATE',
      [code]
    );

    if (vouchers.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or used voucher' });
    }

    const voucher = vouchers[0];

    // Mark voucher as used
    await pool.query(
      'UPDATE vouchers SET used = true WHERE id = ?',
      [voucher.id]
    );

    // Add points if it's a points voucher
    if (voucher.type === 'points') {
      await pool.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [voucher.value, req.user.id]
      );
    }

    await pool.query('COMMIT');

    res.json({
      message: 'Voucher redeemed successfully',
      type: voucher.type,
      value: voucher.value
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalLocations }]] = await pool.query('SELECT COUNT(*) as totalLocations FROM locations');
    const [[{ activeVouchers }]] = await pool.query('SELECT COUNT(*) as activeVouchers FROM vouchers WHERE used = false AND (expiry IS NULL OR expiry > NOW())');
    const [[{ totalTransactions }]] = await pool.query('SELECT COUNT(*) as totalTransactions FROM vouchers WHERE used = true');

    res.json({
      totalUsers,
      totalLocations,
      activeVouchers,
      totalTransactions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete location
app.delete('/api/locations/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await pool.query('DELETE FROM locations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all vouchers (admin only)
app.get('/api/vouchers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [vouchers] = await pool.query(`
      SELECT v.*, u.username as used_by 
      FROM vouchers v 
      LEFT JOIN users u ON v.used_by_user_id = u.id 
      ORDER BY v.created_at DESC
    `);

    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Image Uploads
app.post('/api/uploads', authenticateToken, (req, res) => {
  upload.single('image')(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File terlalu besar. Maksimal ukuran file adalah 5MB.' 
        });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({ error: err.message });
    }

    // No file uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    try {
      const { description } = req.body;
      const imageUrl = `/uploads/${req.file.filename}`;

      // Start transaction
      await pool.query('START TRANSACTION');

      // Save upload
      const [result] = await pool.query(
        'INSERT INTO uploads (user_id, image_url, description) VALUES (?, ?, ?)',
        [req.user.id, imageUrl, description]
      );

      // Add points to user
      await pool.query(
        'UPDATE users SET points = points + 10 WHERE id = ?',
        [req.user.id]
      );

      // Add points history
      await pool.query(
        'INSERT INTO points_history (user_id, points_change, description) VALUES (?, ?, ?)',
        [req.user.id, 10, 'Image upload reward']
      );

      // Get updated user points
      const [users] = await pool.query(
        'SELECT points FROM users WHERE id = ?',
        [req.user.id]
      );

      await pool.query('COMMIT');

      res.status(201).json({
        message: 'Upload successful',
        upload_id: result.insertId,
        points_earned: 10,
        total_points: users[0].points,
        image_url: imageUrl
      });
    } catch (err) {
      await pool.query('ROLLBACK');
      // Delete uploaded file if database operation fails
      if (req.file) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
      }
      res.status(500).json({ error: err.message });
    }
  });
});

app.get('/api/uploads', authenticateToken, async (req, res) => {
  try {
    const [uploads] = await pool.query(`
      SELECT u.*, users.username 
      FROM uploads u 
      JOIN users ON u.user_id = users.id 
      ORDER BY u.created_at DESC
    `);
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/uploads/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await pool.query(
      'UPDATE uploads SET approved = true WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Upload approved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/uploads/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get upload info
    const [uploads] = await pool.query(
      'SELECT * FROM uploads WHERE id = ?',
      [req.params.id]
    );

    if (uploads.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Delete file
    const filePath = path.join(__dirname, 'public', uploads[0].image_url);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error deleting file:', err);
      }
    });

    // Delete from database
    await pool.query('DELETE FROM uploads WHERE id = ?', [req.params.id]);

    res.json({ message: 'Upload deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 