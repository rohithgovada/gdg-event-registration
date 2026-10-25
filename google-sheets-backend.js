// ==============================================================
// GDG Event Registration - Google Sheets Backend (Apps Script)
// ==============================================================
// Follow these 4 simple steps to connect your GitHub Pages site directly to Google Sheets:
//
// 1. Open Google Sheets (https://sheets.new) and name it "GDG Event Registrations 2026"
// 2. Click "Extensions" menu > select "Apps Script"
// 3. Delete any code in the editor, PASTE THIS ENTIRE FILE, and click Save (Ctrl + S)
// 4. Click "Deploy" button (top right) > "New deployment"
//    - Click the gear icon next to "Select type" > choose "Web app"
//    - Description: "GDG Event Registration"
//    - Execute as: "Me"
//    - Who has access: "Anyone" (IMPORTANT!)
//    - Click "Deploy", authorize access with your Google account
//    - Copy the Web App URL (starts with https://script.google.com/macros/s/...)
// 5. Paste that URL into js/app.js in the GOOGLE_SHEET_URL variable!
// ==============================================================

const MAX_CAPACITY = 350;

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Auto-create styled headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Ticket ID", "Full Name", "Roll Number", "Email", "Phone", 
        "Branch", "Year", "Track", "Interest", "Timestamp"
      ]);
      sheet.getRange(1, 1, 1, 10)
        .setFontWeight("bold")
        .setBackground("#4285F4")
        .setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }

    const rows = sheet.getDataRange().getValues();
    const currentCount = Math.max(0, rows.length - 1);

    // 1. Capacity Check (350 limit)
    if (currentCount >= MAX_CAPACITY) {
      return responseJson({ 
        success: false, 
        message: "Registration is full! The 350-seat limit has been reached." 
      });
    }

    // 2. Duplicate Roll Number & Email check
    const cleanRoll = String(data.roll_no || '').trim().toUpperCase();
    const cleanEmail = String(data.email || '').trim().toLowerCase();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][2]).trim().toUpperCase() === cleanRoll) {
        return responseJson({ 
          success: false, 
          message: "Roll Number " + cleanRoll + " is already registered! (Ticket: " + rows[i][0] + ")" 
        });
      }
      if (String(rows[i][3]).trim().toLowerCase() === cleanEmail) {
        return responseJson({ 
          success: false, 
          message: "Email " + cleanEmail + " is already registered!" 
        });
      }
    }

    // 3. Generate unique Ticket ID: e.g. GDG-26-8A4F
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const ticketId = "GDG-26-" + randomPart;
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // 4. Append row to Google Sheet
    sheet.appendRow([
      ticketId,
      data.full_name,
      cleanRoll,
      cleanEmail,
      "'" + data.phone,
      data.branch,
      data.year,
      data.track,
      data.interest || "General",
      timestamp
    ]);

    const newTotal = currentCount + 1;

    return responseJson({
      success: true,
      message: "Registration successful! Welcome to the GDG Event.",
      registration: {
        ticketId: ticketId,
        fullName: data.full_name,
        rollNo: cleanRoll,
        email: cleanEmail,
        phone: data.phone,
        branch: data.branch,
        year: data.year,
        track: data.track,
        interest: data.interest,
        registrationNumber: newTotal,
        seatsRemaining: Math.max(0, MAX_CAPACITY - newTotal)
      }
    });

  } catch (err) {
    return responseJson({ success: false, message: "Error processing registration: " + err.toString() });
  }
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    const total = Math.max(0, rows.length - 1);
    return responseJson({
      success: true,
      totalRegistered: total,
      maxCapacity: MAX_CAPACITY,
      seatsLeft: Math.max(0, MAX_CAPACITY - total),
      isFull: total >= MAX_CAPACITY
    });
  } catch (err) {
    return responseJson({ success: true, totalRegistered: 0, maxCapacity: MAX_CAPACITY, seatsLeft: MAX_CAPACITY });
  }
}

function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
