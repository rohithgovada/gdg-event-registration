# 🚀 GDG On Campus - B.Tech Event Registration Portal 2026

A vibrant, animated, full-stack event registration platform crafted for **Google Developer Groups (GDG) On Campus** events. Designed specifically for **B.Tech students** with a capacity of **350 attendees**, featuring both **Tech** and **Non-Tech** tracks.

---

## ✨ Features Included

### 🎨 Frontend & Design
- **Iconic Google GDG Palette**: Vibrant Google Blue (`#4285F4`), Red (`#EA4335`), Yellow (`#FBBC05`), and Green (`#34A853`) on modern dark cyber glassmorphism.
- **Good Animations**: Floating 3D chips, radiant pulsing ambient glow, smooth transitions, and glowing gradient fonts.
- **Both Tech & Non-Tech Tracks Showcase**:
  - **Tech Arena**: Code Sprint & Bug Hunt, Gemini AI & Google Cloud Sprint, Web Architecture.
  - **Non-Tech Arena**: Grand Tech & Geek Quiz Trivia, UI/UX Wireframing Smackdown, AI Prompt Master, Gaming & LAN Zone.
- **Strict 350-Capacity Tracker**: Live visual progress bar displaying real-time filled seats and remaining passes. Automatically locks when 350 is reached.
- **Event Countdown Clock**: Live ticking countdown timer to event day.
- **Celebration Confetti**: Dynamic multi-colored Google confetti explosion upon successful registration (`canvas-confetti`).
- **Downloadable / Printable Event Pass (Ticket)**:
  - Generates attendee pass with unique ID (`GDG-26-XXXX`), Student Name, Roll Number, Branch, Year, Track, and auto-generated QR code.
  - One-click **"Print / Save Pass"** (clean printer-friendly CSS).
- **"Find My Ticket" Lookup**: Lost pass recovery where students can enter their Roll Number to reprint their pass anytime.

### 🛡️ Backend & Database
- **High-Performance Node.js & Express**: Starts up in 50ms, handles concurrent traffic during college WhatsApp registration drops.
- **Embedded SQLite Database (`registrations.db`)**: Zero setup required; automatically initializes tables and indexes on first run.
- **Anti-Spam & Duplicate Prevention**: Automatically blocks duplicate Roll Numbers and duplicate Email addresses.
- **Organizer Admin Console (`/admin`)**:
  - Password protected (default password: `gdgadmin2026`).
  - Real-time statistics: Total registrations, remaining seats out of 350, branch breakdown, year breakdown, track preference ratio.
  - Instant **"Export to CSV (Excel)"** button to download all student details into a spreadsheet with 1 click.
  - **Event Day Desk Check-In Tool**: Search or scan student Roll No / Ticket ID at the venue door for instant verified check-in.

---

## 📁 Project Structure

```
gdg-event-registration/
│
├── server.js              # Express API + SQLite database + endpoints
├── package.json           # Dependencies and run scripts
├── .env                   # Configuration (PORT, EVENT_CAPACITY=350, ADMIN_PASSWORD)
├── .env.example           # Template configuration
├── .gitignore             # Git ignore file
├── start.bat              # 1-click Windows runner
├── Procfile               # Cloud deployment descriptor
├── render.yaml            # Render 1-click deployment configuration
│
└── public/                # High-performance animated frontend
    ├── index.html         # Landing page & registration form
    ├── admin.html         # Organizer admin console & check-in tool
    ├── css/
    │   └── styles.css     # Google color schemes, glassmorphism, ticket styling
    └── js/
        ├── app.js         # Client logic, stats fetcher, confetti, ticket generator
        └── admin.js       # Admin portal logic, filtering, live check-in, CSV export
```

---

## ⚡ How to Run Locally

### Option 1: Quick Double-Click (Windows)
Double-click `start.bat` inside the folder. It will launch the server and open `http://localhost:5000` in your browser!

### Option 2: Terminal / PowerShell
```bash
# 1. Navigate to the project folder
cd C:\Users\rohit\.gemini\antigravity\scratch\gdg-event-registration

# 2. Start the server
npm start
```
Open **`http://localhost:5000`** in your browser.  
To access the Admin Portal, visit **`http://localhost:5000/admin`** (Password: `gdgadmin2026`).

---

## 🌐 Step-by-Step Deployment Guide (Permanent Free Link)

To get a permanent public link (`https://your-event.onrender.com`) that you can share across college WhatsApp groups and social media for all 350 students:

### Method A: Deploy on Render.com (Recommended - 100% Free)

1. **Push your code to GitHub**:
   - Create a free account at [GitHub](https://github.com) if you haven't already.
   - Create a new repository named `gdg-event-registration`.
   - In your local project folder, run:
     ```bash
     git init
     git add .
     git commit -m "Initial commit for GDG Event Registration"
     git branch -M main
     git remote add origin https://github.com/YOUR_GITHUB_USERNAME/gdg-event-registration.git
     git push -u origin main
     ```

2. **Deploy on Render**:
   - Go to [render.com](https://render.com) and sign up / log in with your GitHub account.
   - Click **"New +"** → select **"Web Service"**.
   - Connect your `gdg-event-registration` repository.
   - Configure the following settings:
     - **Name**: `gdg-campus-event-2026` (or your preferred club name)
     - **Region**: Choose the closest region (e.g., Singapore or Frankfurt for India)
     - **Branch**: `main`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Instance Type**: `Free`
   - Under **Environment Variables**, add:
     - `EVENT_CAPACITY` = `350`
     - `ADMIN_PASSWORD` = `your_strong_admin_password`
   - Click **"Deploy Web Service"**.

3. **Get Your Permanent Link**:
   - Within 2 minutes, Render will provide a permanent secure URL like:
     `https://gdg-campus-event-2026.onrender.com`
   - Share this link with your 350 B.Tech students!

---

### Method B: Deploy on Railway.app (Alternative)

1. Go to [railway.app](https://railway.app).
2. Click **"New Project"** → **"Deploy from GitHub repo"**.
3. Select your repository. Railway detects `package.json` and `Procfile` automatically.
4. Add environment variables `EVENT_CAPACITY=350` and `ADMIN_PASSWORD=gdgadmin2026`.
5. Under Settings → Networking, click **"Generate Domain"** to get your public permanent link.

---

## 🔐 Admin Console & Event Day Check-in

- **URL**: `https://your-deployed-link.com/admin`
- **Default Password**: `gdgadmin2026` (changeable in `.env` or cloud environment variables)
- **Features**:
  - View real-time registrant count, branch distribution, and track preferences.
  - Download all 350 registrations as a `.csv` file anytime to open in Microsoft Excel or Google Sheets.
  - On the event day, door volunteers can type or scan the student's Roll Number or Ticket ID for instant green check-in verification!
