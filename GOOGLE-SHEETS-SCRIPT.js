// ============================================================
// SILKFUTURES PATHWAYS — GOOGLE SHEETS BACKUP
// ============================================================
// 
// SETUP:
// 1. Create a NEW Google Sheet
// 2. Go to Extensions → Apps Script
// 3. Delete any existing code and paste this entire file
// 4. Click Save (disk icon)
// 5. Select "setupSheet" from the function dropdown, click Run
//    - Grant permissions when prompted
//    - This creates all tabs with formatting
// 6. Click Deploy → New deployment → Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 7. Copy the Web app URL
// 8. In Vercel, set GOOGLE_SHEETS_WEBHOOK = that URL
// 9. Redeploy your app (or it picks up on next session log)
//
// TABS CREATED:
// - Sessions (all SilkFutures music sessions)
// - Safeguarding Log (dedicated — every flagged concern)
// - YP Feedback (young person's own voice after sessions)
// - Check-Ins (AI-generated check-in questionnaire responses)
// - Onboarding (initial assessments)
// - Young People (directory with session counts)
// - Set Pace (sports/run club sessions — separate)
// ============================================================

var COLOURS = {
  headerBg: "#1A1A1A",
  headerText: "#FFFFFF",
  altRow: "#FAFAF8",
  safeguardingAccent: "#C62828",
  feedbackAccent: "#7B1FA2",
  checkinAccent: "#7B1FA2",
  onboardAccent: "#2E7D32",
  ypAccent: "#1A1A1A",
  setPaceAccent: "#00695C",
  sessionsAccent: "#1565C0",
};

var TABS = {
  sessions: {
    name: "Sessions",
    headers: [
      "Date", "Start Time", "Logged At", "Mentor", "Young Person", "Programme", "Focus Step",
      "Session Length", "Group?",
      "Regulation", "Engagement", "Overall", "Confidence",
      "Connection", "Adapted Agenda",
      "Reset", "Reframe", "Rebuild", "Release", "Rise",
      "Arrival Energy", "Arrival Mood", "Arrival Ready",
      "Notes", "Mentor Reflection", "Safeguarding",
      "Song Title", "Song URL"
    ],
    colWidths: [90, 75, 75, 80, 110, 90, 80, 90, 60, 75, 80, 65, 80, 80, 100, 55, 65, 60, 60, 45, 100, 90, 90, 300, 250, 200, 120, 200],
    tabColour: COLOURS.sessionsAccent,
  },
  safeguarding: {
    name: "Safeguarding Log",
    headers: [
      "Date", "Mentor", "Young Person", "Focus Step",
      "Safeguarding Notes", "Session Notes Context", "Sensitive Notes"
    ],
    colWidths: [90, 80, 110, 80, 400, 300, 300],
    tabColour: COLOURS.safeguardingAccent,
  },
  feedback: {
    name: "YP Feedback",
    headers: [
      "Date", "Mentor", "Young Person",
      "Session Feel (1-5)", "Felt Heard (1-4)", "Creative Feel (1-4)",
      "Felt Safe (1-4)", "Takeaway", "Next Time"
    ],
    colWidths: [90, 80, 110, 110, 100, 110, 100, 300, 300],
    tabColour: COLOURS.feedbackAccent,
  },
  checkins: {
    name: "Check-Ins",
    headers: [
      "Date", "Mentor", "Young Person", "Stage",
      "Q1", "A1", "Q2", "A2", "Q3", "A3",
      "Q4", "A4", "Q5", "A5", "Q6", "A6"
    ],
    colWidths: [90, 80, 110, 70, 200, 120, 200, 120, 200, 120, 200, 120, 200, 120, 200, 120],
    tabColour: COLOURS.checkinAccent,
  },
  onboarding: {
    name: "Onboarding",
    headers: [
      "Date", "Mentor", "Young Person", "Suggested Stage",
      "DOB", "Phone", "Email", "Postcode",
      "Q1", "A1", "Q2", "A2", "Q3", "A3",
      "Q4", "A4", "Q5", "A5", "Q6", "A6",
      "Q7", "A7", "Q8", "A8", "Q9", "A9", "Q10", "A10"
    ],
    colWidths: [90, 80, 110, 100, 90, 100, 160, 80,
      200, 150, 200, 150, 200, 150, 200, 150, 200, 150,
      200, 150, 200, 150, 200, 150, 200, 150, 200, 150],
    tabColour: COLOURS.onboardAccent,
  },
  youngPeople: {
    name: "Young People",
    headers: [
      "Name", "DOB", "Phone", "Email", "Postcode",
      "Suggested Stage", "Date Added", "Total Sessions"
    ],
    colWidths: [120, 90, 100, 160, 80, 100, 90, 90],
    tabColour: COLOURS.ypAccent,
  },
  setPace: {
    name: "Set Pace",
    headers: [
      "Date", "Start Time", "Logged At", "Mentor", "Young Person", "Focus Step",
      "Session Length", "Group?",
      "Regulation", "Engagement", "Overall", "Confidence",
      "Notes", "Mentor Reflection"
    ],
    colWidths: [90, 75, 75, 80, 110, 80, 90, 60, 75, 80, 65, 80, 300, 250],
    tabColour: COLOURS.setPaceAccent,
  },
};

// ── RUN THIS ONCE to set up all tabs ──
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Remove default Sheet1
  var sheet1 = ss.getSheetByName("Sheet1");
  
  // Create each tab
  var tabKeys = ["sessions", "safeguarding", "feedback", "checkins", "onboarding", "youngPeople", "setPace"];
  
  tabKeys.forEach(function(key) {
    var tab = TABS[key];
    var sheet = ss.getSheetByName(tab.name);
    if (!sheet) {
      sheet = ss.insertSheet(tab.name);
    }
    
    // Headers
    var headerRange = sheet.getRange(1, 1, 1, tab.headers.length);
    headerRange.setValues([tab.headers]);
    headerRange.setBackground(COLOURS.headerBg);
    headerRange.setFontColor(COLOURS.headerText);
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(10);
    headerRange.setFontFamily("Arial");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrap(true);
    sheet.setRowHeight(1, 36);
    sheet.setFrozenRows(1);
    
    // Column widths
    for (var i = 0; i < tab.colWidths.length; i++) {
      sheet.setColumnWidth(i + 1, tab.colWidths[i]);
    }
    
    // Tab colour
    sheet.setTabColor(tab.tabColour);
    
    // Data area defaults
    var dataRange = sheet.getRange(2, 1, 998, tab.headers.length);
    dataRange.setFontSize(10);
    dataRange.setFontFamily("Arial");
    dataRange.setVerticalAlignment("top");
    dataRange.setWrap(true);
    
    // Alternating row colours
    var rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=ISEVEN(ROW())")
      .setBackground(COLOURS.altRow)
      .setRanges([dataRange])
      .build();
    var rules = sheet.getConditionalFormatRules();
    rules.push(rule);
    sheet.setConditionalFormatRules(rules);
  });
  
  // Delete Sheet1 now that we have other sheets
  if (sheet1) {
    try { ss.deleteSheet(sheet1); } catch(ex) {}
  }
  
  // Set tab order
  tabKeys.forEach(function(key, i) {
    var s = ss.getSheetByName(TABS[key].name);
    if (s) {
      ss.setActiveSheet(s);
      ss.moveActiveSheet(i + 1);
    }
  });
  
  ss.setActiveSheet(ss.getSheetByName("Sessions"));
}

// ── HELPER ──
function getSheet(ss, tabKey) {
  var tab = TABS[tabKey];
  var sheet = ss.getSheetByName(tab.name);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(tab.name);
  }
  return sheet;
}

// ── INCOMING DATA ──
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var dataType = data.dataType || "session";
  var ts = data.timestamp || new Date().toISOString();
  var dateStr = data.date || ts.split("T")[0];
  
  // Extract time logged (HH:MM) from timestamp — this is when the entry was submitted
  var timeLogged = "";
  try {
    var d = new Date(ts);
    if (!isNaN(d.getTime())) {
      var hh = String(d.getHours()).length < 2 ? "0" + d.getHours() : String(d.getHours());
      var mm = String(d.getMinutes()).length < 2 ? "0" + d.getMinutes() : String(d.getMinutes());
      timeLogged = hh + ":" + mm;
    }
  } catch(ex) {}
  
  // Session start time — when the session actually happened
  var startTime = data.startTime || "";

  // ── CLEAR ALL (wipe data rows, keep headers) ──
  if (dataType === "clear_all") {
    var tabKeys = ["sessions", "safeguarding", "feedback", "checkins", "onboarding", "youngPeople", "setPace"];
    tabKeys.forEach(function(key) {
      var sheet = ss.getSheetByName(TABS[key].name);
      if (sheet && sheet.getLastRow() > 1) {
        sheet.deleteRows(2, sheet.getLastRow() - 1);
      }
    });
    return ContentService.createTextOutput(JSON.stringify({ status: "cleared" })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── ONBOARDING ──
  if (dataType === "onboard") {
    var contact = {};
    try { contact = JSON.parse(data.onboardingResponses || "{}"); } catch(ex) {}
    var c = contact._contact || {};
    
    // Expand responses into Q/A columns
    // Known onboarding question IDs in order
    var qIds = ["show_up", "trust", "influences", "self_awareness", "identity", "goals", "commitment", "feedback", "expression", "others"];
    var qLabels = {
      "show_up": "How do you feel about being here today?",
      "trust": "When things get difficult, what do you usually do?",
      "influences": "Who do you spend most of your time with?",
      "self_awareness": "Do you know what sets you off?",
      "identity": "Do you feel like you're the same person you were a year ago?",
      "goals": "What do you want to be doing in a year?",
      "commitment": "When you start something, do you usually finish it?",
      "feedback": "How do you feel when someone gives you feedback?",
      "expression": "If you made a song or wrote something, what would it be about?",
      "others": "Do you look out for other people?"
    };
    
    var row = [
      dateStr, data.mentor || "", data.youngPerson || "", data.suggestedStage || "",
      c.dob || "", c.phone || "", c.email || "", c.postcode || ""
    ];
    
    for (var qi = 0; qi < 10; qi++) {
      var qId = qIds[qi];
      var qText = qLabels[qId] || "";
      var aText = "";
      if (contact[qId] !== undefined && contact[qId] !== null) {
        var ans = contact[qId];
        if (typeof ans === "object" && ans.label) {
          aText = ans.label;
        } else if (typeof ans === "string") {
          aText = ans;
        } else {
          aText = String(ans);
        }
      }
      row.push(qText);
      row.push(aText);
    }
    
    getSheet(ss, "onboarding").appendRow(row);
    
    upsertYP(ss, data.youngPerson, c.dob, c.phone, c.email, c.postcode, data.suggestedStage, dateStr, 0);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── CHECK-IN ──
  if (dataType === "checkin") {
    var questions = data.questions || [];
    var responses = data.responses || {};
    var row = [dateStr, data.mentor || "", data.youngPerson || "", data.stage || ""];
    for (var qi = 0; qi < 6; qi++) {
      if (qi < questions.length) {
        var q = questions[qi];
        var a = responses[q.id];
        var displayA = "";
        if (a !== undefined && a !== null) {
          if (typeof a === "number") displayA = String(a);
          else if (typeof a === "object" && a.label) displayA = a.label;
          else displayA = String(a);
        }
        row.push(q.question || "");
        row.push(displayA);
      } else {
        row.push("");
        row.push("");
      }
    }
    getSheet(ss, "checkins").appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── FEEDBACK ONLY (from backfill — no session row) ──
  if (dataType === "feedback") {
    getSheet(ss, "feedback").appendRow([
      dateStr, data.mentor || "", data.youngPerson || "",
      data.feedbackFeel || "", data.feedbackHeard || "",
      data.feedbackCreative || "", data.feedbackSafe || "",
      data.feedbackTakeaway || "", data.feedbackNext || ""
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── SESSION ──
  var isSetPace = (data.partnerOrg === "Set Pace") || (dataType === "setpace");
  
  if (isSetPace) {
    getSheet(ss, "setPace").appendRow([
      dateStr, startTime, timeLogged, data.mentor || "", data.youngPerson || "", data.focusStep || "",
      data.sessionLength || "", data.isGroup || "No",
      data.regulation || "", data.engagement || "",
      data.confidence || "", data.relationalConnection || "", data.reflection || "",
      (data.notes || "").substring(0, 5000),
      (data.mentorReflection || "").substring(0, 2000)
    ]);
  } else {
    getSheet(ss, "sessions").appendRow([
      dateStr, startTime, timeLogged, data.mentor || "", data.youngPerson || "",
      data.partnerOrg || "SilkFutures", data.focusStep || "",
      data.sessionLength || "", data.isGroup || "No",
      data.regulation || "", data.engagement || "",
      data.confidence || "", data.relationalConnection || "", data.reflection || "",
      data.resetAvg || "", data.reframeAvg || "", data.rebuildAvg || "",
      data.releaseAvg || "", data.riseAvg || "",
      data.arrivalEnergy || "", data.arrivalMood || "", data.arrivalReady || "",
      (data.notes || "").substring(0, 5000),
      (data.mentorReflection || "").substring(0, 2000),
      data.safeguarding || "",
      data.songTitle || "", data.songUrl || ""
    ]);
  }
  
  // ── SAFEGUARDING LOG ──
  if (data.safeguarding && data.safeguarding.trim()) {
    getSheet(ss, "safeguarding").appendRow([
      dateStr, data.mentor || "", data.youngPerson || "", data.focusStep || "",
      data.safeguarding,
      (data.notes || "").substring(0, 500),
      data.sensitiveNotes || ""
    ]);
  }
  
  // ── YP FEEDBACK ──
  if (data.feedbackFeel || data.feedbackTakeaway) {
    getSheet(ss, "feedback").appendRow([
      dateStr, data.mentor || "", data.youngPerson || "",
      data.feedbackFeel || "", data.feedbackHeard || "",
      data.feedbackCreative || "", data.feedbackSafe || "",
      data.feedbackTakeaway || "", data.feedbackNext || ""
    ]);
  }
  
  // ── UPDATE YP SESSION COUNT ──
  try {
    var ypNames = (data.youngPerson || "").split(", ");
    ypNames.forEach(function(name) {
      name = name.trim();
      if (name) incrementYPSessionCount(ss, name, dateStr);
    });
  } catch(ex) {}
  
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
}

// ── YP DATABASE HELPERS ──

function upsertYP(ss, name, dob, phone, email, postcode, stage, dateStr, count) {
  if (!name) return;
  var sheet = getSheet(ss, "youngPeople");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.getRange(i + 1, 2, 1, 6).setValues([[
        dob || data[i][1], phone || data[i][2],
        email || data[i][3], postcode || data[i][4],
        stage || data[i][5], data[i][6]
      ]]);
      return;
    }
  }
  sheet.appendRow([name, dob || "", phone || "", email || "", postcode || "", stage || "", dateStr, count]);
}

function incrementYPSessionCount(ss, name, dateStr) {
  if (!name) return;
  var sheet = getSheet(ss, "youngPeople");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      var current = parseInt(data[i][7]) || 0;
      sheet.getRange(i + 1, 8).setValue(current + 1);
      return;
    }
  }
  sheet.appendRow([name, "", "", "", "", "", dateStr, 1]);
}
