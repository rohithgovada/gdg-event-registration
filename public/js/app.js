/**
 * GDG Event Registration Portal - Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const regForm = document.getElementById('registrationForm');
  const submitBtn = document.getElementById('submitBtn');
  const formAlert = document.getElementById('formAlert');
  const seatsLeftBadge = document.getElementById('seatsLeftBadge');
  const seatsProgress = document.getElementById('seatsProgress');
  const seatsText = document.getElementById('seatsText');
  const navSeatsBadge = document.getElementById('navSeatsBadge');
  
  // Track Selection Cards
  const trackCards = document.querySelectorAll('.track-option-card');
  const trackInput = document.getElementById('selectedTrack');

  // Year Selection Buttons
  const yearPills = document.querySelectorAll('.year-pill');
  const yearInput = document.getElementById('selectedYear');

  // Ticket Modal Elements
  const ticketModal = document.getElementById('ticketModal');
  const closeTicketBtn = document.getElementById('closeTicketBtn');
  const printTicketBtn = document.getElementById('printTicketBtn');
  const copyTicketBtn = document.getElementById('copyTicketBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  let currentTicketData = null;

  // Lookup Elements
  const lookupModal = document.getElementById('lookupModal');
  const openLookupBtn = document.getElementById('openLookupBtn');
  const closeLookupBtn = document.getElementById('closeLookupBtn');
  const lookupForm = document.getElementById('lookupForm');
  const lookupInput = document.getElementById('lookupRollNo');
  const lookupAlert = document.getElementById('lookupAlert');

  // Initialize
  fetchLiveStats();
  initCountdown();

  // ----------------- TRACK SELECTOR ----------------- //
  trackCards.forEach(card => {
    card.addEventListener('click', () => {
      trackCards.forEach(c => {
        c.classList.remove('selected-tech', 'selected-nontech', 'selected-both', 'ring-2');
      });

      const track = card.dataset.track;
      trackInput.value = track;

      if (track === 'Tech Track') {
        card.classList.add('selected-tech', 'ring-2', 'ring-blue-500');
      } else if (track === 'Non-Tech Track') {
        card.classList.add('selected-nontech', 'ring-2', 'ring-emerald-500');
      } else {
        card.classList.add('selected-both', 'ring-2', 'ring-amber-500');
      }
    });
  });

  // ----------------- YEAR SELECTOR ----------------- //
  yearPills.forEach(pill => {
    pill.addEventListener('click', () => {
      yearPills.forEach(p => {
        p.classList.remove('bg-blue-600', 'text-white', 'border-blue-500');
        p.classList.add('bg-slate-800/80', 'text-slate-300', 'border-slate-700');
      });

      pill.classList.remove('bg-slate-800/80', 'text-slate-300', 'border-slate-700');
      pill.classList.add('bg-blue-600', 'text-white', 'border-blue-500');
      yearInput.value = pill.dataset.year;
    });
  });

  // ----------------- STATS FETCHER ----------------- //
  async function fetchLiveStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        const total = data.totalRegistered;
        const max = data.maxCapacity;
        const left = data.seatsLeft;
        const percent = Math.min(100, Math.round((total / max) * 100));

        if (seatsProgress) seatsProgress.style.width = `${percent}%`;
        if (seatsText) seatsText.textContent = `${total} / ${max} Registered (${percent}%)`;
        if (seatsLeftBadge) {
          seatsLeftBadge.textContent = `${left} Seats Left`;
          if (left <= 50) {
            seatsLeftBadge.className = 'pill-badge pill-red animate-pulse';
          }
        }
        if (navSeatsBadge) {
          navSeatsBadge.textContent = `${left} Seats Remaining`;
        }

        // If seats are full
        if (data.isFull) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span>⚠️ Registrations Full (350/350)</span>`;
          showAlert('danger', 'Registration capacity of 350 has been reached! Please reach out to the GDG organizers for waitlist details.');
        }
      }
    } catch (err) {
      console.warn('Could not fetch stats:', err);
    }
  }

  // ----------------- FORM SUBMISSION ----------------- //
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const fullName = document.getElementById('fullName').value.trim();
      const rollNo = document.getElementById('rollNo').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const branch = document.getElementById('branch').value;
      const year = yearInput.value;
      const track = trackInput.value;
      const interest = document.getElementById('interest').value;

      // Validate
      if (!fullName || !rollNo || !email || !phone || !branch || !year || !track) {
        showAlert('warning', 'Please complete all required fields including Branch, Year, and Track.');
        return;
      }

      // Phone check
      if (phone.length < 10) {
        showAlert('warning', 'Please enter a valid 10-digit phone/WhatsApp number.');
        return;
      }

      // Button loading state
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        Confirming Registration...
      `;

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            roll_no: rollNo,
            email,
            phone,
            branch,
            year,
            track,
            interest
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Trigger confetti!
          triggerConfetti();

          // Render Ticket Pass
          renderTicket(result.registration);

          // Reset form
          regForm.reset();
          
          // Reset custom year pill
          yearPills.forEach(p => {
            p.classList.remove('bg-blue-600', 'text-white', 'border-blue-500');
            p.classList.add('bg-slate-800/80', 'text-slate-300', 'border-slate-700');
          });
          yearPills[0].classList.add('bg-blue-600', 'text-white', 'border-blue-500');
          yearInput.value = '1st Year';

          // Reset custom track cards
          trackCards.forEach(c => {
            c.classList.remove('selected-tech', 'selected-nontech', 'selected-both', 'ring-2');
          });
          const defaultBothCard = document.querySelector('.track-option-card[data-track="Both Tracks"]');
          if (defaultBothCard) {
            defaultBothCard.classList.add('selected-both', 'ring-2', 'ring-amber-500');
          }
          trackInput.value = 'Both Tracks';

          // Open Modal
          ticketModal.classList.remove('hidden');

          // Refresh live stats
          fetchLiveStats();
        } else {
          showAlert('danger', result.message || 'Registration failed. Please check your details.');
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        showAlert('danger', 'Unable to connect to the server. Please check your internet connection or try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }

  // ----------------- RENDER TICKET PASS ----------------- //
  function renderTicket(data) {
    document.getElementById('ticketStudentName').textContent = data.fullName;
    document.getElementById('ticketRollNo').textContent = data.rollNo;
    document.getElementById('ticketBranchYear').textContent = `${data.branch} • ${data.year}`;
    document.getElementById('ticketTrack').textContent = data.track;
    document.getElementById('ticketIdDisplay').textContent = data.ticketId;
    document.getElementById('ticketRegNumber').textContent = `#${data.registrationNumber || '001'}`;

    // Color code track pill in ticket
    const trackBadge = document.getElementById('ticketTrackBadge');
    if (trackBadge) {
      if (data.track.includes('Tech') && !data.track.includes('Both') && !data.track.includes('Non')) {
        trackBadge.className = 'pill-badge pill-blue';
      } else if (data.track.includes('Non-Tech')) {
        trackBadge.className = 'pill-badge pill-green';
      } else {
        trackBadge.className = 'pill-badge pill-yellow';
      }
    }

    currentTicketData = data;

    // Generate dynamic QR Code placeholder with fallback
    const qrImg = document.getElementById('ticketQrCode');
    if (qrImg) {
      const qrData = encodeURIComponent(`GDG-PASS:${data.ticketId}|ROLL:${data.rollNo}|NAME:${data.fullName}`);
      qrImg.onerror = () => {
        qrImg.onerror = null;
        qrImg.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230f172a"/><rect x="15" y="15" width="25" height="25" fill="%234285F4"/><rect x="60" y="15" width="25" height="25" fill="%23EA4335"/><rect x="15" y="60" width="25" height="25" fill="%23FBBC05"/><rect x="60" y="60" width="25" height="25" fill="%2334A853"/><text x="50" y="54" fill="white" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">${data.ticketId}</text></svg>`;
      };
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}&color=ffffff&bgcolor=0f172a`;
    }
  }

  // ----------------- CONFETTI BURST ----------------- //
  function triggerConfetti() {
    if (typeof confetti === 'function') {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 }
      };

      function fire(particleRatio, opts) {
        confetti(Object.assign({}, defaults, opts, {
          particleCount: Math.floor(count * particleRatio)
        }));
      }

      // Google Colors: Blue, Red, Yellow, Green
      const googleColors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: googleColors
      });
      fire(0.2, {
        spread: 60,
        colors: googleColors
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: googleColors
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: googleColors
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
        colors: googleColors
      });
    }
  }

  // ----------------- TICKET MODAL ACTIONS ----------------- //
  if (closeTicketBtn) {
    closeTicketBtn.addEventListener('click', () => {
      ticketModal.classList.add('hidden');
    });
  }

  if (printTicketBtn) {
    printTicketBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (copyTicketBtn) {
    copyTicketBtn.addEventListener('click', () => {
      if (!currentTicketData) return;
      const summaryText = `🎟️ GDG CAMPUS TECH FUSION 2026 - EVENT PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticket ID : ${currentTicketData.ticketId}
Student   : ${currentTicketData.fullName}
Roll No   : ${currentTicketData.rollNo}
Branch    : ${currentTicketData.branch}
Year      : ${currentTicketData.year}
Track     : ${currentTicketData.track}
Venue     : College Auditorium & Labs
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Show this pass with your College ID at entry!`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summaryText).then(() => {
          if (copyBtnText) copyBtnText.textContent = 'Copied!';
          setTimeout(() => {
            if (copyBtnText) copyBtnText.textContent = 'Copy';
          }, 2000);
        });
      } else {
        alert(summaryText);
      }
    });
  }

  // Close modals on clicking background backdrop
  [ticketModal, lookupModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (ticketModal) ticketModal.classList.add('hidden');
      if (lookupModal) lookupModal.classList.add('hidden');
    }
  });

  // ----------------- LOOKUP MODAL ----------------- //
  if (openLookupBtn) {
    openLookupBtn.addEventListener('click', () => {
      lookupModal.classList.remove('hidden');
      if (lookupInput) lookupInput.focus();
    });
  }

  if (closeLookupBtn) {
    closeLookupBtn.addEventListener('click', () => {
      lookupModal.classList.add('hidden');
      if (lookupAlert) lookupAlert.classList.add('hidden');
    });
  }

  if (lookupForm) {
    lookupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = lookupInput.value.trim();
      if (!identifier) return;

      try {
        const res = await fetch(`/api/ticket/${encodeURIComponent(identifier)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          lookupModal.classList.add('hidden');
          renderTicket({
            fullName: data.ticket.full_name,
            rollNo: data.ticket.roll_no,
            branch: data.ticket.branch,
            year: data.ticket.year,
            track: data.ticket.track,
            ticketId: data.ticket.ticket_id,
            registrationNumber: data.ticket.id
          });
          ticketModal.classList.remove('hidden');
        } else {
          showLookupAlert('danger', data.message || 'No registration found for this Roll Number or Ticket ID.');
        }
      } catch (err) {
        showLookupAlert('danger', 'Error searching for ticket. Please check connection.');
      }
    });
  }

  // ----------------- COUNTDOWN TIMER ----------------- //
  function initCountdown() {
    // Target event date: 20 days in future or specific event date
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 18);
    eventDate.setHours(9, 30, 0, 0);

    const daysEl = document.getElementById('countDays');
    const hoursEl = document.getElementById('countHours');
    const minsEl = document.getElementById('countMins');
    const secsEl = document.getElementById('countSecs');

    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    function update() {
      const now = new Date().getTime();
      const diff = eventDate.getTime() - now;

      if (diff <= 0) {
        daysEl.textContent = '00';
        hoursEl.textContent = '00';
        minsEl.textContent = '00';
        secsEl.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      daysEl.textContent = String(days).padStart(2, '0');
      hoursEl.textContent = String(hours).padStart(2, '0');
      minsEl.textContent = String(minutes).padStart(2, '0');
      secsEl.textContent = String(seconds).padStart(2, '0');
    }

    update();
    setInterval(update, 1000);
  }

  // ----------------- ALERTS ----------------- //
  function showAlert(type, msg) {
    if (!formAlert) return;
    formAlert.classList.remove('hidden');
    
    let colorClass = 'bg-blue-900/50 border-blue-500 text-blue-200';
    if (type === 'danger') colorClass = 'bg-red-900/50 border-red-500 text-red-200';
    if (type === 'warning') colorClass = 'bg-yellow-900/50 border-yellow-500 text-yellow-200';
    if (type === 'success') colorClass = 'bg-green-900/50 border-green-500 text-green-200';

    formAlert.className = `p-4 rounded-xl border text-sm font-medium ${colorClass} mb-6 flex items-start gap-3 transition-all`;
    formAlert.innerHTML = `
      <span class="text-xl">⚠️</span>
      <div class="flex-1">${msg}</div>
    `;
    formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearAlert() {
    if (formAlert) {
      formAlert.classList.add('hidden');
      formAlert.innerHTML = '';
    }
  }

  function showLookupAlert(type, msg) {
    if (!lookupAlert) return;
    lookupAlert.classList.remove('hidden');
    lookupAlert.className = `p-3 rounded-lg text-xs font-medium bg-red-900/50 border border-red-500 text-red-200 mb-4`;
    lookupAlert.textContent = msg;
  }
});
