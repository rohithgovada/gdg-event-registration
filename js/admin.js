/**
 * GDG Organizer Admin Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('loginForm');
  const adminPasswordInput = document.getElementById('adminPassword');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  // Stats Elements
  const totalCountEl = document.getElementById('totalCount');
  const seatsLeftEl = document.getElementById('seatsLeft');
  const techCountEl = document.getElementById('techCount');
  const nonTechCountEl = document.getElementById('nonTechCount');
  const bothCountEl = document.getElementById('bothCount');
  const attendedCountEl = document.getElementById('attendedCount');

  // Table & Filters
  const tableBody = document.getElementById('registrationsTableBody');
  const searchInput = document.getElementById('tableSearch');
  const branchFilter = document.getElementById('branchFilter');
  const yearFilter = document.getElementById('yearFilter');
  const trackFilter = document.getElementById('trackFilter');
  const refreshBtn = document.getElementById('refreshBtn');
  const exportBtn = document.getElementById('exportCsvBtn');

  // Event Check-In Tool
  const checkinForm = document.getElementById('checkinForm');
  const checkinInput = document.getElementById('checkinInput');
  const checkinFeedback = document.getElementById('checkinFeedback');

  let allRegistrations = [];
  let currentAdminKey = sessionStorage.getItem('gdg_admin_key');

  // Check initial authentication
  if (currentAdminKey) {
    showDashboard();
  } else {
    showLogin();
  }

  // ----------------- LOGIN ----------------- //
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = adminPasswordInput.value.trim();
      if (!password) return;

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          sessionStorage.setItem('gdg_admin_key', data.adminKey);
          currentAdminKey = data.adminKey;
          loginError.classList.add('hidden');
          showDashboard();
        } else {
          loginError.classList.remove('hidden');
          loginError.textContent = data.message || 'Incorrect password.';
        }
      } catch (err) {
        loginError.classList.remove('hidden');
        loginError.textContent = 'Server connection error.';
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('gdg_admin_key');
      currentAdminKey = null;
      showLogin();
    });
  }

  function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
  }

  function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    loadRegistrations();
  }

  // ----------------- LOAD REGISTRATIONS ----------------- //
  async function loadRegistrations() {
    try {
      const res = await fetch('/api/admin/registrations', {
        headers: { 'x-admin-key': currentAdminKey }
      });

      if (res.status === 401) {
        sessionStorage.removeItem('gdg_admin_key');
        showLogin();
        return;
      }

      const data = await res.json();
      if (data.success) {
        allRegistrations = data.registrations;
        updateStats(allRegistrations, data.maxCapacity);
        renderTable();
      }
    } catch (err) {
      console.error('Failed to load registrations:', err);
    }
  }

  // ----------------- UPDATE STATS ----------------- //
  function updateStats(list, maxCap = 350) {
    const total = list.length;
    const remaining = Math.max(0, maxCap - total);
    let tech = 0;
    let nonTech = 0;
    let both = 0;
    let attended = 0;

    list.forEach(r => {
      const t = (r.track || '').toLowerCase();
      if (t.includes('both')) both++;
      else if (t.includes('non')) nonTech++;
      else if (t.includes('tech')) tech++;

      if (r.status === 'attended') attended++;
    });

    if (totalCountEl) totalCountEl.textContent = total;
    if (seatsLeftEl) seatsLeftEl.textContent = remaining;
    if (techCountEl) techCountEl.textContent = tech;
    if (nonTechCountEl) nonTechCountEl.textContent = nonTech;
    if (bothCountEl) bothCountEl.textContent = both;
    if (attendedCountEl) attendedCountEl.textContent = attended;
  }

  // ----------------- RENDER TABLE ----------------- //
  function renderTable() {
    const searchVal = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const branchVal = branchFilter ? branchFilter.value : '';
    const yearVal = yearFilter ? yearFilter.value : '';
    const trackVal = trackFilter ? trackFilter.value : '';

    const filtered = allRegistrations.filter(r => {
      const matchSearch = !searchVal || 
        r.full_name.toLowerCase().includes(searchVal) ||
        r.roll_no.toLowerCase().includes(searchVal) ||
        r.email.toLowerCase().includes(searchVal) ||
        r.ticket_id.toLowerCase().includes(searchVal);

      const matchBranch = !branchVal || r.branch === branchVal;
      const matchYear = !yearVal || r.year === yearVal;
      const matchTrack = !trackVal || r.track === trackVal;

      return matchSearch && matchBranch && matchYear && matchTrack;
    });

    if (!tableBody) return;

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-slate-400">
            No registrations found matching the filters.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map((r, index) => {
      let trackBadgeClass = 'pill-blue';
      if (r.track.includes('Non-Tech')) trackBadgeClass = 'pill-green';
      if (r.track.includes('Both')) trackBadgeClass = 'pill-yellow';

      const isAttended = r.status === 'attended';
      const statusBadge = isAttended
        ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-500/50">Checked In</span>`
        : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-500/30">Confirmed</span>`;

      return `
        <tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">
          <td class="py-3 px-4 font-mono text-xs text-slate-400">#${filtered.length - index}</td>
          <td class="py-3 px-4">
            <span class="font-mono font-bold text-blue-400 text-sm">${escapeHtml(r.ticket_id)}</span>
          </td>
          <td class="py-3 px-4">
            <div class="font-medium text-white">${escapeHtml(r.full_name)}</div>
            <div class="text-xs text-slate-400 font-mono">${escapeHtml(r.roll_no)}</div>
          </td>
          <td class="py-3 px-4">
            <div class="text-xs text-slate-300">${escapeHtml(r.email)}</div>
            <div class="text-xs text-slate-400">${escapeHtml(r.phone)}</div>
          </td>
          <td class="py-3 px-4">
            <div class="text-sm text-slate-200">${escapeHtml(r.branch)}</div>
            <div class="text-xs text-slate-400">${escapeHtml(r.year)}</div>
          </td>
          <td class="py-3 px-4">
            <span class="pill-badge ${trackBadgeClass}">${escapeHtml(r.track)}</span>
          </td>
          <td class="py-3 px-4">
            ${statusBadge}
          </td>
        </tr>
      `;
    }).join('');
  }

  // ----------------- FILTER LISTENERS ----------------- //
  if (searchInput) searchInput.addEventListener('input', renderTable);
  if (branchFilter) branchFilter.addEventListener('change', renderTable);
  if (yearFilter) yearFilter.addEventListener('change', renderTable);
  if (trackFilter) trackFilter.addEventListener('change', renderTable);

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadRegistrations();
    });
  }

  // Auto-refresh every 30 seconds to keep live counts synchronized during rush
  setInterval(() => {
    if (currentAdminKey && !dashboardSection.classList.contains('hidden')) {
      loadRegistrations();
    }
  }, 30000);

  // ----------------- CSV EXPORT ----------------- //
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!currentAdminKey) return;
      window.location.href = `/api/admin/export-csv?admin_key=${encodeURIComponent(currentAdminKey)}`;
    });
  }

  // ----------------- EVENT DAY CHECK-IN SCANNER ----------------- //
  if (checkinForm) {
    checkinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = checkinInput.value.trim();
      if (!identifier) return;

      try {
        const res = await fetch('/api/admin/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': currentAdminKey
          },
          body: JSON.stringify({ identifier })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          checkinInput.value = '';
          const s = data.student;
          if (data.alreadyCheckedIn) {
            showCheckinFeedback('warning', `⚠️ Already Checked In: ${s.full_name} (${s.roll_no}) - Ticket: ${s.ticket_id}`);
          } else {
            showCheckinFeedback('success', `✅ Check-in Success! Welcome ${s.full_name} [${s.branch} - ${s.year}]`);
          }
          // Refresh list to update badge
          loadRegistrations();
        } else {
          showCheckinFeedback('danger', `❌ ${data.message || 'Student not found.'}`);
        }
      } catch (err) {
        showCheckinFeedback('danger', 'Check-in request failed.');
      }
    });
  }

  function showCheckinFeedback(type, message) {
    if (!checkinFeedback) return;
    checkinFeedback.classList.remove('hidden');

    let classes = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
    if (type === 'danger') classes = 'bg-red-950/80 border-red-500 text-red-200';
    if (type === 'warning') classes = 'bg-yellow-950/80 border-yellow-500 text-yellow-200';

    checkinFeedback.className = `p-3.5 rounded-xl border text-sm font-medium ${classes} mt-3 flex items-center gap-2`;
    checkinFeedback.innerHTML = message;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
