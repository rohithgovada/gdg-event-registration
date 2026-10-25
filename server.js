const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MAX_CAPACITY = parseInt(process.env.EVENT_CAPACITY, 10) || 350;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'gdgadmin2026';
const REGISTRATION_HOURS = parseInt(process.env.REGISTRATION_HOURS, 10) || 24; // 1-Day (24-Hour) Registration Window

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup (Supports local, Render, and Vercel environments)
const isVercel = process.env.VERCEL === '1';
const dbPath = isVercel ? path.join('/tmp', 'registrations.db') : path.join(__dirname, 'registrations.db');
const db = new Database(dbPath);

// Enable WAL Mode & busy timeout to prevent "database is locked" glitches under concurrent load
if (!isVercel) {
  try { db.pragma('journal_mode = WAL'); } catch (e) { /* ignore in non-WAL envs */ }
}
db.pragma('busy_timeout = 5000');

// Initialize DB Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    roll_no TEXT UNIQUE NOT NULL COLLATE NOCASE,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    phone TEXT NOT NULL,
    branch TEXT NOT NULL,
    year TEXT NOT NULL,
    track TEXT NOT NULL,
    interest TEXT,
    status TEXT DEFAULT 'confirmed',
    checked_in_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_roll_no ON registrations(roll_no);
  CREATE INDEX IF NOT EXISTS idx_ticket_id ON registrations(ticket_id);

  CREATE TABLE IF NOT EXISTS event_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Initialize 1-Day (24-Hour) Registration Window
let deadlineRow = db.prepare('SELECT value FROM event_settings WHERE key = ?').get('registration_deadline');
let registrationDeadline;
if (!deadlineRow) {
  const d = new Date();
  d.setHours(d.getHours() + REGISTRATION_HOURS);
  registrationDeadline = d.toISOString();
  db.prepare('INSERT INTO event_settings (key, value) VALUES (?, ?)').run('registration_deadline', registrationDeadline);
} else {
  registrationDeadline = deadlineRow.value;
}

function isRegistrationOpen() {
  const now = new Date().getTime();
  const deadline = new Date(registrationDeadline).getTime();
  return now < deadline;
}

console.log('Database initialized successfully at:', dbPath);
console.log('1-Day Registration Deadline set to:', registrationDeadline);

// Helper to generate unique Ticket ID: e.g. GDG-26-8742
function generateTicketId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GDG-26-${randomPart}`;
}

// ---------------------- PUBLIC API ROUTES ---------------------- //

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    event: 'GDG On Campus B.Tech Event 2026',
    maxCapacity: MAX_CAPACITY,
    timestamp: new Date().toISOString()
  });
});

// Event Stats (Total registered, seats left, branch distribution, etc.)
app.get('/api/stats', (req, res) => {
  try {
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM registrations').get();
    const totalRegistered = totalRow ? totalRow.count : 0;
    const seatsLeft = Math.max(0, MAX_CAPACITY - totalRegistered);

    // Track distribution
    const trackRows = db.prepare(`
      SELECT track, COUNT(*) as count 
      FROM registrations 
      GROUP BY track
    `).all();

    // Branch distribution
    const branchRows = db.prepare(`
      SELECT branch, COUNT(*) as count 
      FROM registrations 
      GROUP BY branch 
      ORDER BY count DESC 
      LIMIT 6
    `).all();

    // Year distribution
    const yearRows = db.prepare(`
      SELECT year, COUNT(*) as count 
      FROM registrations 
      GROUP BY year 
      ORDER BY year ASC
    `).all();

    res.json({
      success: true,
      maxCapacity: MAX_CAPACITY,
      totalRegistered,
      seatsLeft,
      isFull: seatsLeft <= 0,
      registrationDeadline,
      isWindowClosed: !isRegistrationOpen(),
      windowDurationHours: REGISTRATION_HOURS,
      tracks: trackRows,
      branches: branchRows,
      years: yearRows
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve event stats' });
  }
});

// Register a student
app.post('/api/register', (req, res) => {
  try {
    const { full_name, roll_no, email, phone, branch, year, track, interest } = req.body;

    // Validation
    if (!full_name || !roll_no || !email || !phone || !branch || !year || !track) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (Name, Roll No, Email, Phone, Branch, Year, Track).'
      });
    }

    // Clean up inputs
    const cleanName = full_name.trim();
    const cleanRollNo = roll_no.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanBranch = branch.trim();
    const cleanYear = year.trim();
    const cleanTrack = track.trim();
    const cleanInterest = (interest || '').trim();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Check 1-Day Registration Window
    if (!isRegistrationOpen()) {
      return res.status(400).json({
        success: false,
        message: 'Sorry, the 1-day (24-hour) registration window has officially closed! Please contact the GDG organizing team.'
      });
    }

    // Capacity Check
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM registrations').get();
    if (totalRow.count >= MAX_CAPACITY) {
      return res.status(400).json({
        success: false,
        message: `Sorry, registration is currently full! The 350-seat capacity has been reached. Please contact the GDG organizing team.`
      });
    }

    // Check for duplicate Roll Number
    const existingRoll = db.prepare('SELECT ticket_id, full_name FROM registrations WHERE roll_no = ?').get(cleanRollNo);
    if (existingRoll) {
      return res.status(409).json({
        success: false,
        message: `Roll Number "${cleanRollNo}" is already registered (Ticket: ${existingRoll.ticket_id})! If this is an error, please reach out to the GDG club team.`
      });
    }

    // Check for duplicate Email
    const existingEmail = db.prepare('SELECT ticket_id FROM registrations WHERE email = ?').get(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: `Email "${cleanEmail}" is already registered! Each student can register only once.`
      });
    }

    // Generate unique Ticket ID
    let ticketId;
    let isUnique = false;
    while (!isUnique) {
      ticketId = generateTicketId();
      const check = db.prepare('SELECT id FROM registrations WHERE ticket_id = ?').get(ticketId);
      if (!check) isUnique = true;
    }

    // Insert registration
    const stmt = db.prepare(`
      INSERT INTO registrations (ticket_id, full_name, roll_no, email, phone, branch, year, track, interest)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(ticketId, cleanName, cleanRollNo, cleanEmail, cleanPhone, cleanBranch, cleanYear, cleanTrack, cleanInterest);

    const newTotal = totalRow.count + 1;
    const seatsRemaining = Math.max(0, MAX_CAPACITY - newTotal);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to the GDG Event.',
      registration: {
        ticketId,
        fullName: cleanName,
        rollNo: cleanRollNo,
        email: cleanEmail,
        phone: cleanPhone,
        branch: cleanBranch,
        year: cleanYear,
        track: cleanTrack,
        interest: cleanInterest,
        registrationNumber: newTotal,
        seatsRemaining
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while processing your registration. Please try again.'
    });
  }
});

// Public Ticket Lookup (to view or reprint ticket)
app.get('/api/ticket/:identifier', (req, res) => {
  try {
    const identifier = req.params.identifier.trim();
    const record = db.prepare(`
      SELECT ticket_id, full_name, roll_no, email, branch, year, track, interest, status, created_at
      FROM registrations 
      WHERE ticket_id = ? OR roll_no = ? COLLATE NOCASE
    `).get(identifier, identifier);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Ticket or Roll Number not found.' });
    }

    res.json({ success: true, ticket: record });
  } catch (err) {
    console.error('Ticket lookup error:', err);
    res.status(500).json({ success: false, message: 'Error retrieving ticket.' });
  }
});

// ---------------------- ADMIN ROUTES ---------------------- //

// Middleware to verify admin password / authorization
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['x-admin-key'] || req.query.admin_key;
  if (!authHeader || authHeader !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid Admin Key.' });
  }
  next();
}

// Admin Login Check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, message: 'Authentication successful', adminKey: ADMIN_PASSWORD });
  }
  res.status(401).json({ success: false, message: 'Invalid Admin Password' });
});

// Get all registrations (Admin)
app.get('/api/admin/registrations', verifyAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, ticket_id, full_name, roll_no, email, phone, branch, year, track, interest, status, checked_in_at, created_at
      FROM registrations 
      ORDER BY id DESC
    `).all();

    res.json({
      success: true,
      count: rows.length,
      maxCapacity: MAX_CAPACITY,
      registrations: rows
    });
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
  }
});

// Export to CSV for Excel / Google Sheets
app.get('/api/admin/export-csv', verifyAdmin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT ticket_id, full_name, roll_no, email, phone, branch, year, track, interest, status, created_at
      FROM registrations 
      ORDER BY id ASC
    `).all();

    const headers = ['Ticket ID', 'Full Name', 'Roll Number', 'Email', 'Phone', 'Branch', 'Year', 'Track', 'Interests', 'Status', 'Registered At'];
    
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.join(',')];
    rows.forEach(r => {
      csvLines.push([
        escapeCsv(r.ticket_id),
        escapeCsv(r.full_name),
        escapeCsv(r.roll_no),
        escapeCsv(r.email),
        escapeCsv(r.phone),
        escapeCsv(r.branch),
        escapeCsv(r.year),
        escapeCsv(r.track),
        escapeCsv(r.interest),
        escapeCsv(r.status),
        escapeCsv(r.created_at)
      ].join(','));
    });

    const csvContent = csvLines.join('\r\n');
    const filename = `GDG_Event_Registrations_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send('\uFEFF' + csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).send('Failed to generate CSV export.');
  }
});

// Check-in verification tool for Event Day
app.post('/api/admin/checkin', verifyAdmin, (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Please provide a Ticket ID or Roll Number' });
    }

    const clean = identifier.trim();
    const record = db.prepare(`
      SELECT * FROM registrations WHERE ticket_id = ? OR roll_no = ? COLLATE NOCASE
    `).get(clean, clean);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Student registration not found' });
    }

    if (record.status === 'attended') {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        message: `Student was already checked in at ${record.checked_in_at}!`,
        student: record
      });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE registrations SET status = ?, checked_in_at = ? WHERE id = ?').run('attended', now, record.id);

    record.status = 'attended';
    record.checked_in_at = now;

    res.json({
      success: true,
      message: `Checked in successfully: ${record.full_name} (${record.roll_no})`,
      student: record
    });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ success: false, message: 'Check-in failed' });
  }
});

// Admin page route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all route to serve the single page frontend
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server (Standalone or Vercel export)
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 GDG Event Registration Portal running on http://localhost:${PORT}`);
    console.log(`📊 Max Student Capacity: ${MAX_CAPACITY} members`);
    console.log(`🔐 Admin Dashboard: http://localhost:${PORT}/admin (Password: ${ADMIN_PASSWORD})`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
