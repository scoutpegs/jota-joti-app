const CONFIG = {
  USERS_SHEET: 'Users',
  CATEGORIES_SHEET: 'Categories',
  LINKS_SHEET: 'Links',
  LOGOS_SHEET: 'Logos',
  BLOCKED_URLS_SHEET: 'BlockedURLs',
  BLOCKED_CATEGORIES_SHEET: 'BlockedCategories',
  SETTINGS_SHEET: 'Settings',

  BACKUP_FOLDER_NAME: 'JOTA-JOTI Backups',
  BACKUPS_TO_KEEP: 14,

  WEBSITE_URL: 'https://scoutpegs.github.io/jota-joti-app/',
  SCOUT_GROUP: 'Boulder Scout Group',

  // Admin security. The first setup creates a random admin password and
  // stores it in Script Properties. The GitHub /admin page exchanges that
  // password for a short-lived session token before any private action.
  ADMIN_PASSWORD_PROPERTY: 'JOTA_JOTI_ADMIN_PASSWORD',
  ADMIN_SESSION_PREFIX: 'JOTA_JOTI_ADMIN_SESSION_',
  ADMIN_SESSION_TTL_SECONDS: 21600,
  EMAIL_LOG_SHEET: 'EmailLog',
  EMAIL_GROUPS_SHEET: 'EmailGroups'
};

const CACHE_TTL_SECONDS = 45;
const CACHEABLE_SHEETS = [
  CONFIG.CATEGORIES_SHEET,
  CONFIG.LINKS_SHEET,
  CONFIG.LOGOS_SHEET,
  CONFIG.BLOCKED_URLS_SHEET,
  CONFIG.BLOCKED_CATEGORIES_SHEET,
  CONFIG.USERS_SHEET,
];

/* ============================================================
   API ROUTER
   ============================================================ */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const action = e && e.parameter ? String(e.parameter.action || '').trim() : '';
    const pin = e && e.parameter ? e.parameter.pin || '' : '';
    const callback = e && e.parameter ? String(e.parameter.callback || '').trim() : '';

    // Standalone browser Email Admin API.
    // These endpoints use JSONP so a normal local .html file opened from
    // disk can read the response without google.script.run or CORS.
    if (action === 'adminLogin') {
      return apiResponse(e, adminLogin(e));
    }

    if (action === 'adminUsers') {
      requireAdminToken(e);
      return apiResponse(e, adminListUsers());
    }

    if (action === 'adminSections') {
      requireAdminToken(e);
      return apiResponse(e, adminListAgeGroups());
    }

    if (action === 'adminCategories') {
      requireAdminToken(e);
      return apiResponse(e, adminListCategories());
    }

    if (action === 'adminGroups') {
      requireAdminToken(e);
      return apiResponse(e, adminListGroups());
    }

    if (action === 'adminSender') {
      requireAdminToken(e);
      return apiResponse(e, {
        success: true,
        sender: String(Session.getEffectiveUser().getEmail() || '').trim(),
        quota: MailApp.getRemainingDailyQuota(),
        organiser: CONFIG.SCOUT_GROUP
      });
    }

    if (action === 'adminPreview') {
      requireAdminToken(e);
      const payload = decodeStandaloneEmailPayload(e);
      return apiResponse(e, Object.assign({ success: true }, adminPreviewBulkEmail(payload)));
    }

    if (action === 'adminSend') {
      requireAdminToken(e);
      const payload = decodeStandaloneEmailPayload(e);
      return apiResponse(e, Object.assign({ success: true }, adminSendBulkEmail(payload)));
    }

    if (action === 'health') {
      return jsonResponse({
        success: true,
        message: 'JOTA-JOTI API is running',
        organiser: CONFIG.SCOUT_GROUP,
        unofficial: true,
        serverTime: new Date().toISOString()
      });
    }

    if (action === 'diagnostics') {
      return jsonResponse(runDiagnostics());
    }

    if (action === 'login' || action === 'user') {
      if (String(pin).trim().toLowerCase() === 'guest') {
        return getUserDashboard('guest');
      }

      const result = loginUser(pin);
      if (!result.success) {
        return jsonResponse(result);
      }

      return getUserDashboard(pin);
    }

    if (action === 'categories') {
      return jsonResponse({ success: true, categories: getCachedSheetData(CONFIG.CATEGORIES_SHEET) });
    }

    if (action === 'links') {
      return jsonResponse({ success: true, links: getCachedSheetData(CONFIG.LINKS_SHEET) });
    }

    if (action === 'logos') {
      return jsonResponse({ success: true, logos: getCachedSheetData(CONFIG.LOGOS_SHEET) });
    }

    if (action === 'blocks') {
      return jsonResponse({
        success: true,
        blockedURLs: getCachedSheetData(CONFIG.BLOCKED_URLS_SHEET),
        blockedCategories: getCachedSheetData(CONFIG.BLOCKED_CATEGORIES_SHEET)
      });
    }

    if (action === 'all') {
      return getAllPublicData();
    }

    return jsonResponse({
      success: true,
      message: 'JOTA-JOTI API is running',
      organiser: CONFIG.SCOUT_GROUP,
      unofficial: true,
      endpoints: {
        health: '?action=health',
        diagnostics: '?action=diagnostics',
        login: '?action=login&pin=1234',
        user: '?action=user&pin=1234',
        categories: '?action=categories',
        links: '?action=links',
        logos: '?action=logos',
        blocks: '?action=blocks',
        all: '?action=all',
        adminLogin: '?action=adminLogin&payload=...&callback=...',
        adminUsers: '?action=adminUsers&token=...&callback=...',
        adminSections: '?action=adminSections&callback=...',
        adminCategories: '?action=adminCategories&token=...&callback=...',
        adminGroups: '?action=adminGroups&token=...&callback=...',
        adminSender: '?action=adminSender&callback=...',
        adminPreview: '?action=adminPreview&payload=...&callback=...',
        adminSend: '?action=adminSend&payload=...&callback=...'
      }
    });

  } catch (error) {
    return apiResponse(e, { success: false, error: error.message || String(error) });
  }
}

/* ============================================================
   DIAGNOSTICS
   ============================================================ */

function runDiagnostics() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = [
    CONFIG.USERS_SHEET, CONFIG.CATEGORIES_SHEET, CONFIG.LINKS_SHEET,
    CONFIG.LOGOS_SHEET, CONFIG.BLOCKED_URLS_SHEET, CONFIG.BLOCKED_CATEGORIES_SHEET,
    CONFIG.SETTINGS_SHEET, CONFIG.EMAIL_LOG_SHEET, CONFIG.EMAIL_GROUPS_SHEET
  ];

  const sheetReport = sheetNames.map(function(name) {
    const sheet = spreadsheet.getSheetByName(name);
    return { sheet: name, exists: !!sheet, rowCount: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0 };
  });

  const triggers = ScriptApp.getProjectTriggers().map(function(trigger) {
    return { function: trigger.getHandlerFunction(), type: String(trigger.getEventType()) };
  });

  let samplePins = [];
  try {
    samplePins = getSheetData(CONFIG.USERS_SHEET).slice(0, 5).map(function(u) { return String(u.PIN || ''); });
  } catch (err) {
    samplePins = ['(could not read Users sheet: ' + err.message + ')'];
  }

  return {
    success: true,
    spreadsheetName: spreadsheet.getName(),
    spreadsheetId: spreadsheet.getId(),
    scriptTimeZone: Session.getScriptTimeZone(),
    serverTime: new Date().toISOString(),
    sheets: sheetReport,
    triggersInstalled: triggers,
    samplePinsInUsersSheet: samplePins
  };
}

/* ============================================================
   SPREADSHEET ADMIN MENU
   ============================================================ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('JOTA-JOTI Admin')
    .addItem('Run full setup (first time / after big changes)', 'setupEOISystem')
    .addSeparator()
    .addItem('Manage a scout\'s account', 'showAdminPanel')
    .addSeparator()
    .addItem('Create backup now', 'runManualBackup')
    .addItem('Check installed triggers', 'runManualTriggerCheck')
    .addItem('Clear cached data (force refresh)', 'runManualClearCache')
    .addSeparator()
    .addItem('Send me a test welcome email', 'testParentEmail')
    .addItem('Show admin password', 'showAdminPassword')
    .addItem('Reset admin password', 'resetAdminPassword')
    .addToUi();
}

function showAdminPassword() {
  const password = ensureAdminPassword_();
  SpreadsheetApp.getUi().alert('JOTA-JOTI Admin password', password + '\n\nKeep this private.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function resetAdminPassword() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Reset admin password?', 'This will immediately invalidate the old password. Continue?', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;
  const password = Utilities.getUuid().replace(/-/g, '').slice(0, 10) + 'Jj!';
  PropertiesService.getScriptProperties().setProperty(CONFIG.ADMIN_PASSWORD_PROPERTY, password);
  ui.alert('New admin password', password + '\n\nKeep this private.', ui.ButtonSet.OK);
}

function runManualBackup() {
  const name = backupSpreadsheetToDrive();
  SpreadsheetApp.getUi().alert('Backup created: ' + name + '\n\nFind it in your Drive, in a folder called "' + CONFIG.BACKUP_FOLDER_NAME + '".');
}

function runManualTriggerCheck() {
  const triggers = checkEOITrigger();
  if (triggers.length === 0) {
    SpreadsheetApp.getUi().alert('No triggers are installed. Run "Run full setup" from this menu first.');
    return;
  }
  const lines = triggers.map(function(t) { return '• ' + t.function + ' (' + t.type + ')'; });
  SpreadsheetApp.getUi().alert('Installed triggers:\n\n' + lines.join('\n'));
}

function runManualClearCache() {
  clearSheetCache();
  SpreadsheetApp.getUi().alert('Cache cleared. The dashboard and API will read fresh data on the next request.');
}

function showAdminPanel() {
  const html = HtmlService.createHtmlOutput(buildAdminPanelHtml())
    .setWidth(560)
    .setHeight(760);
  SpreadsheetApp.getUi().showModalDialog(html, 'Manage a scout\'s account');
}

/* ============================================================
   CACHING (keeps the dashboard fast for many people at once)
   ============================================================ */

function getCachedSheetData(sheetName) {
  const cache = CacheService.getScriptCache();
  const metaKey = 'sheet_' + sheetName + '_meta';
  const meta = cache.get(metaKey);

  if (meta !== null) {
    const chunkCount = parseInt(meta, 10) || 0;
    const keys = [];
    for (let i = 0; i < chunkCount; i++) keys.push('sheet_' + sheetName + '_' + i);
    const chunks = cache.getAll(keys);
    let json = '';
    let complete = true;
    for (let i = 0; i < chunkCount; i++) {
      const part = chunks['sheet_' + sheetName + '_' + i];
      if (part === undefined) { complete = false; break; }
      json += part;
    }
    if (complete) {
      try { return JSON.parse(json); } catch (e) { /* fall through to a fresh read */ }
    }
  }

  const data = getSheetData(sheetName);
  cacheSheetData(sheetName, data);
  return data;
}

function cacheSheetData(sheetName, data) {
  try {
    const json = JSON.stringify(data);
    const chunkSize = 90000;
    const chunks = [];
    for (let i = 0; i < json.length; i += chunkSize) chunks.push(json.slice(i, i + chunkSize));

    const payload = {};
    payload['sheet_' + sheetName + '_meta'] = String(chunks.length);
    chunks.forEach(function(chunk, i) { payload['sheet_' + sheetName + '_' + i] = chunk; });

    CacheService.getScriptCache().putAll(payload, CACHE_TTL_SECONDS);
  } catch (err) {
    // Caching is best-effort. A failure here should never break the API response.
  }
}

function clearSheetCache() {
  const cache = CacheService.getScriptCache();
  CACHEABLE_SHEETS.forEach(function(name) {
    const meta = cache.get('sheet_' + name + '_meta');
    if (meta === null) return;
    const count = parseInt(meta, 10) || 0;
    const keys = ['sheet_' + name + '_meta'];
    for (let i = 0; i < count; i++) keys.push('sheet_' + name + '_' + i);
    cache.removeAll(keys);
  });
}

/* ============================================================
   USER DASHBOARD & DATA RETRIEVAL
   ============================================================ */

function getUserDashboard(pin) {
  if (!pin) {
    return jsonResponse({ success: false, error: 'PIN is required' });
  }

  const categories = getCachedSheetData(CONFIG.CATEGORIES_SHEET);
  const links = getCachedSheetData(CONFIG.LINKS_SHEET);
  const logos = getCachedSheetData(CONFIG.LOGOS_SHEET);
  const blockedCategories = getCachedSheetData(CONFIG.BLOCKED_CATEGORIES_SHEET);

  let user;
  let allowedCategories = [];

  if (String(pin).trim().toLowerCase() === 'guest') {
    user = {
      PIN: 'guest', Name: 'Guest Scout', Username: 'GuestScout', Email: '',
      ParentEmail: '', AllowedCategories: '*', Status: 'Active', PaperworkStatus: 'Not Required'
    };
    allowedCategories = categories
      .map(function(category) { return String(category.CategoryKey || '').trim().toLowerCase(); })
      .filter(function(key) { return key !== ''; });
  } else {
    const users = getCachedSheetData(CONFIG.USERS_SHEET);

    user = users.find(function(row) {
      return String(row.PIN || '').trim().toLowerCase() === String(pin).trim().toLowerCase();
    });

    if (!user) {
      return jsonResponse({ success: false, error: 'PIN not found' });
    }

    const status = String(user.Status || '').trim().toLowerCase();
    if (status === 'disabled') {
      return jsonResponse({ success: false, error: 'This account has been disabled.' });
    }

    const rawCategories = String(user.AllowedCategories || '');
    if (rawCategories.trim() === '*' || !rawCategories.trim()) {
      allowedCategories = categories.map(function(category) {
        return String(category.CategoryKey || '').trim().toLowerCase();
      });
    } else {
      allowedCategories = rawCategories.split(',').map(function(item) {
        return String(item).trim().toLowerCase();
      }).filter(function(item) { return item !== ''; });
    }
  }

  const blockedCategoryKeys = [];
  blockedCategories.forEach(function(row) {
    if (parseBoolean(row.Active)) {
      const key = String(row.CategoryKey || '').trim().toLowerCase();
      if (key) blockedCategoryKeys.push(key);
    }
  });

  allowedCategories = allowedCategories.filter(function(key) {
    return blockedCategoryKeys.indexOf(key) === -1;
  });

  const logoMap = {};
  logos.forEach(function(logo) {
    const key = String(logo.LogoKey || '').trim();
    if (key) logoMap[key] = String(logo.LogoURL || '').trim();
  });

  const filteredCategories = categories
    .filter(function(category) {
      const key = String(category.CategoryKey || '').trim().toLowerCase();
      return allowedCategories.indexOf(key) !== -1;
    })
    .map(function(category) {
      const logoKey = String(category.LogoKey || '').trim();
      let logoURL = String(category.LogoURL || '').trim();
      if (logoKey && logoMap[logoKey]) logoURL = logoMap[logoKey];
      return {
        CategoryKey: category.CategoryKey || '', Title: category.Title || '',
        LogoKey: logoKey, LogoURL: logoURL, Description: category.Description || ''
      };
    });

  const filteredLinks = links
    .filter(function(link) {
      const categoryKey = String(link.CategoryKey || '').trim().toLowerCase();
      return allowedCategories.indexOf(categoryKey) !== -1;
    })
    .map(function(link) {
      const logoKey = String(link.LogoKey || '').trim();
      let logoURL = String(link.LogoURL || '').trim();
      if (logoKey && logoMap[logoKey]) logoURL = logoMap[logoKey];
      return {
        LinkID: link.LinkID || '', CategoryKey: link.CategoryKey || '', Title: link.Title || '',
        URL: link.URL || '', CanEmbed: parseBoolean(link.CanEmbed),
        RequiresLogin: parseAccessLevel(link.RequiresLogin),
        RequiresEmail: parseAccessLevel(link.RequiresEmail),
        ParentApproval: parseBoolean(link.ParentApproval), LeaderApproved: parseBoolean(link.LeaderApproved),
        Moderated: parseBoolean(link.Moderated), Active: parseBoolean(link.Active),
        LogoKey: logoKey, LogoURL: logoURL, BlockStatus: link.BlockStatus || '', Notes: link.Notes || ''
      };
    });

  const safeUser = {
    ParticipantID: user.ParticipantID || '', PIN: user.PIN || '', Name: user.Name || '',
    Username: user.Username || '', Email: resolveUserEmail(user), Password: String(user.Password || ''),
    AllowedCategories: user.AllowedCategories || '', Status: user.Status || '', PaperworkStatus: user.PaperworkStatus || ''
  };

  return jsonResponse({
    success: true, user: safeUser, categories: filteredCategories, links: filteredLinks,
    logos: logos, unofficial: true, organiser: CONFIG.SCOUT_GROUP
  });
}

/* ============================================================
   LOGIN VERIFICATION
   ============================================================ */

function loginUser(pin) {
  if (!pin) return { success: false, error: 'PIN required' };

  const users = getCachedSheetData(CONFIG.USERS_SHEET);
  const user = users.find(function(row) {
    return String(row.PIN || '').trim().toLowerCase() === String(pin).trim().toLowerCase();
  });

  if (!user) return { success: false, error: 'PIN not found' };

  const status = String(user.Status || '').trim().toLowerCase();
  if (status === 'disabled') return { success: false, error: 'This account has been disabled.' };

  return {
    success: true,
    user: {
      ParticipantID: user.ParticipantID || '', PIN: user.PIN || '', Name: user.Name || '',
      Username: user.Username || '', Email: resolveUserEmail(user),
      AllowedCategories: user.AllowedCategories || '', Status: user.Status || '', PaperworkStatus: user.PaperworkStatus || ''
    }
  };
}

/* ============================================================
   PUBLIC DATA & SHEET HELPERS
   ============================================================ */

function getAllPublicData() {
  return jsonResponse({
    success: true,
    categories: getCachedSheetData(CONFIG.CATEGORIES_SHEET),
    links: getCachedSheetData(CONFIG.LINKS_SHEET),
    logos: getCachedSheetData(CONFIG.LOGOS_SHEET),
    blockedURLs: getCachedSheetData(CONFIG.BLOCKED_URLS_SHEET),
    blockedCategories: getCachedSheetData(CONFIG.BLOCKED_CATEGORIES_SHEET)
  });
}

function getSheetData(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    const sheets = spreadsheet.getSheets();
    sheet = sheets.find(s => s.getName().toLowerCase() === sheetName.toLowerCase());
  }
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(header => String(header).trim());
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const item = {};
    for (let j = 0; j < headers.length; j++) item[headers[j]] = row[j];
    const hasData = row.some(val => String(val).trim() !== '');
    if (hasData) rows.push(item);
  }
  return rows;
}

function parseBoolean(value) {
  if (value === true || value === 1) return true;
  const text = String(value || '').trim().toLowerCase();
  return text === 'true' || text === 'yes' || text === '1' || text === 'active';
}

function parseAccessLevel(value) {
  const parsed = parseInt(value, 10);
  if (parsed === 1 || parsed === 3) return parsed;
  return 0;
}

function resolveUserEmail(user) {
  return String(user.Email || '').trim();
}

function apiResponse(e, data) {
  const callback = e && e.parameter ? String(e.parameter.callback || '').trim() : '';
  if (callback) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
      return jsonResponse({ success: false, error: 'Invalid callback.' });
    }
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(data);
}

function getAdminPassword_() {
  return String(PropertiesService.getScriptProperties().getProperty(CONFIG.ADMIN_PASSWORD_PROPERTY) || '').trim();
}

function hashText_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8);
  return bytes.map(function(b) {
    const n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function ensureAdminPassword_() {
  let password = getAdminPassword_();
  if (!password) {
    password = Utilities.getUuid().replace(/-/g, '').slice(0, 10) + 'Jj!';
    PropertiesService.getScriptProperties().setProperty(CONFIG.ADMIN_PASSWORD_PROPERTY, password);
  }
  return password;
}

function createAdminSession_() {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put(
    CONFIG.ADMIN_SESSION_PREFIX + hashText_(token),
    JSON.stringify({ created: Date.now(), email: String(Session.getEffectiveUser().getEmail() || '') }),
    CONFIG.ADMIN_SESSION_TTL_SECONDS
  );
  return token;
}

function requireAdminToken(e) {
  const token = e && e.parameter ? String(e.parameter.token || '').trim() : '';
  if (!token) throw new Error('Admin sign-in required.');
  const key = CONFIG.ADMIN_SESSION_PREFIX + hashText_(token);
  const session = CacheService.getScriptCache().get(key);
  if (!session) throw new Error('Admin session expired. Please sign in again.');
  try { return JSON.parse(session); } catch (err) { throw new Error('Invalid admin session.'); }
}

function adminLogin(e) {
  const encoded = e && e.parameter ? String(e.parameter.payload || '') : '';
  if (!encoded) throw new Error('Missing admin login data.');
  let payload;
  try {
    payload = decodeStandaloneEmailPayload(e);
  } catch (err) {
    throw new Error('Could not read admin login request.');
  }

  const supplied = String(payload.password || '');
  if (!supplied) throw new Error('Enter the admin password.');

  const cache = CacheService.getScriptCache();
  const failKey = 'JOTA_JOTI_ADMIN_LOGIN_FAILS';
  const failures = parseInt(cache.get(failKey) || '0', 10) || 0;
  if (failures >= 8) throw new Error('Too many failed admin sign-in attempts. Try again in 10 minutes.');

  const expected = ensureAdminPassword_();
  if (supplied !== expected) {
    cache.put(failKey, String(failures + 1), 600);
    throw new Error('Incorrect admin password.');
  }

  cache.remove(failKey);
  const token = createAdminSession_();
  return {
    success: true,
    token: token,
    expiresInSeconds: CONFIG.ADMIN_SESSION_TTL_SECONDS,
    sender: String(Session.getEffectiveUser().getEmail() || '').trim(),
    organiser: CONFIG.SCOUT_GROUP,
    quota: MailApp.getRemainingDailyQuota()
  };
}

function decodeStandaloneEmailPayload(e) {
  const encoded = e && e.parameter ? String(e.parameter.payload || '') : '';
  if (!encoded) throw new Error('Missing email payload.');

  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '==='.slice((normalized.length + 3) % 4);
    const bytes = Utilities.base64Decode(padded);
    const json = Utilities.newBlob(bytes).getDataAsString('UTF-8');
    const payload = JSON.parse(json);

    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid email payload.');
    }

    return payload;
  } catch (err) {
    throw new Error('Could not read the email request: ' + (err.message || String(err)));
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   GOOGLE FORM SUBMISSION & AUTOMATED USER CREATION
   ============================================================ */

function onFormSubmit(e) {
  try {
    if (!e) throw new Error('No form event supplied.');

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET);
    if (!usersSheet) throw new Error('The Users sheet does not exist.');

    const data = {};
    if (e.namedValues) {
      Object.keys(e.namedValues).forEach(function(key) {
        const val = e.namedValues[key];
        data[normaliseHeader(key)] = Array.isArray(val) ? String(val[0] || '').trim() : String(val || '').trim();
      });
    }

    if (e.range) {
      const sheet = e.range.getSheet();
      const rowNumber = e.range.getRow();
      const lastColumn = sheet.getLastColumn();
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const row = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || '').trim();
        if (header) data[normaliseHeader(header)] = String(row[i] || '').trim();
      }
    }

    const parentName = getFlexibleFormValue(data, ['Parent/Guardian Full Name', 'Parent Guardian Full Name', 'Parent Name', 'Guardian Name']);
    const parentEmail = getFlexibleFormValue(data, ['Parent/Guardian Email', 'Parent Guardian Email', 'Parent Email', 'Guardian Email', 'Email Address', 'Email']);
    const childFirstName = getFlexibleFormValue(data, ['Child First Name', 'Child first name', 'First Name', 'Child Name']);
    const childLastName = getFlexibleFormValue(data, ['Child Last Name', 'Child last name', 'Last Name']);
    const ageGroup = getFlexibleFormValue(data, ['AgeGroup', 'Age Group', 'Scout Section', 'Section', 'Youth Section']);
    const ageYear = getFlexibleFormValue(data, ["Child's age/year group", "Child's age/year group", 'Child Age', 'Age', 'Year Group', 'Age/Year Group']);
    const selectedActivities = getFlexibleFormValue(data, ['Which activities would your child like access to?', 'Activities', 'Activity']);
    const childEmail = getFlexibleFormValue(data, ["Child's Email", 'Child Email', 'Scout Email']);

    if (!parentEmail) throw new Error('Parent email address is missing.');
    if (!childFirstName) throw new Error('Child first name is missing.');

    const participantID = generateParticipantID();
    const pin = generateUniquePIN(usersSheet);
    const username = generateUniqueUsername(usersSheet, childFirstName);
    const password = generatePassword();
    const allowedCategories = convertActivitiesToCategories(selectedActivities);
    const now = new Date();

    addUserToSheet(usersSheet, {
      ParticipantID: participantID, PIN: pin, Name: (childFirstName + ' ' + childLastName).trim(),
      Username: username, Email: childEmail || '', AllowedCategories: allowedCategories,
      Password: password, ParentEmail: parentEmail, ParentName: parentName,
      ScoutGroup: CONFIG.SCOUT_GROUP, AgeGroup: ageGroup, AgeYear: ageYear, Status: 'Pending',
      EOIReceived: now, AccountCreated: now, PaperworkStatus: 'Required',
      EmailStatus: 'Pending', Notes: 'Created automatically from Google Form Expression of Interest.'
    });

    SpreadsheetApp.flush();
    clearSheetCache();

    try {
      sendParentWelcomeEmail({
        parentName: parentName, parentEmail: parentEmail, childFirstName: childFirstName,
        childLastName: childLastName, ageYear: ageYear, participantID: participantID,
        username: username, pin: pin, password: password, allowedCategories: allowedCategories
      });
      updateUserEmailStatus(usersSheet, participantID, 'Sent');
    } catch (emailError) {
      updateUserEmailStatus(usersSheet, participantID, 'Failed: ' + emailError.message);
      throw emailError;
    }

    return true;
  } catch (error) {
    console.error('Form submission error:', error);
    notifyAdminOfError('onFormSubmit', error);
    throw error;
  }
}

function notifyAdminOfError(where, error) {
  try {
    const owner = Session.getEffectiveUser().getEmail();
    if (!owner) return;
    MailApp.sendEmail({
      to: owner,
      subject: 'JOTA-JOTI system error in ' + where,
      body: 'The JOTA-JOTI Apps Script hit an error in ' + where + ':\n\n' +
            (error && error.message ? error.message : String(error)) + '\n\n' +
            'Check the Apps Script execution log for the full details (Extensions > Apps Script > Executions).'
    });
  } catch (notifyError) {
    // Nothing more we can do here.
  }
}

/* ============================================================
   FORM PROCESSING UTILITIES
   ============================================================ */

function normaliseHeader(value) {
  return String(value || '')
    .replace(/\u2018/g, "'").replace(/\u2019/g, "'")
    .replace(/\u201C/g, '"').replace(/\u201D/g, '"')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

function getFlexibleFormValue(data, possibleNames) {
  for (let i = 0; i < possibleNames.length; i++) {
    const key = normaliseHeader(possibleNames[i]);
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const val = String(data[key] || '').trim();
      if (val) return val;
    }
  }
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    for (let j = 0; j < possibleNames.length; j++) {
      const wanted = normaliseHeader(possibleNames[j]);
      if (key === wanted || key.indexOf(wanted) !== -1 || wanted.indexOf(key) !== -1) {
        const val = String(data[key] || '').trim();
        if (val) return val;
      }
    }
  }
  return '';
}

function generateParticipantID() {
  const existing = getSheetData(CONFIG.USERS_SHEET);
  const year = new Date().getFullYear();
  let number = existing.length + 1;
  let id = 'JOTI-' + year + '-' + String(number).padStart(6, '0');
  while (existing.some(user => String(user.ParticipantID || '').trim() === id)) {
    number++;
    id = 'JOTI-' + year + '-' + String(number).padStart(6, '0');
  }
  return id;
}

function generateUniquePIN(usersSheet) {
  const users = getSheetData(CONFIG.USERS_SHEET);
  let attempts = 0;
  while (attempts < 1000) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const exists = users.some(user => String(user.PIN || '').trim() === pin);
    if (!exists) return pin;
    attempts++;
  }
  throw new Error('Could not generate a unique PIN.');
}

function generateUniqueUsername(usersSheet, firstName) {
  const users = getSheetData(CONFIG.USERS_SHEET);
  let cleanName = String(firstName || 'Scout').replace(/[^a-zA-Z0-9]/g, '');
  if (!cleanName) cleanName = 'Scout';

  for (let attempts = 0; attempts < 1000; attempts++) {
    const number = Math.floor(10 + Math.random() * 90);
    const username = cleanName + 'JOTA' + number;
    const exists = users.some(user => String(user.Username || '').trim().toLowerCase() === username.toLowerCase());
    if (!exists) return username;
  }
  throw new Error('Could not generate a unique username.');
}

function generatePassword() {
  // Every animal name below is exactly 5 letters, so the result is always
  // 5 (name) + 1 ('@') + 2 (digits) = 8 characters, no more and no less.
  // There's no single published "official JOTA-JOTI password policy" (JOTA-JOTI
  // itself uses scout.org accounts, not this tool) — 8 characters mixing a
  // capitalised word, a symbol and two digits is a reasonable, kid-memorable
  // baseline that matches common Scout-group guidance of "8+ characters,
  // not just letters".
  const animals = ['Koala', 'Zebra', 'Tiger', 'Eagle', 'Otter', 'Camel', 'Horse', 'Mouse', 'Rhino', 'Sheep', 'Snake', 'Whale', 'Moose', 'Panda', 'Skunk', 'Crane', 'Heron', 'Hyena', 'Gecko', 'Quail'];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(10 + Math.random() * 90);
  return animal + '@' + number; // e.g. "Otter@57" — always 8 characters
}

function convertActivitiesToCategories(activities) {
  const text = String(activities || '').toLowerCase();
  const categories = [];

  if (text.includes('chat') || text.includes('online')) categories.push('chat');
  if (text.includes('minecraft')) categories.push('minecraft');
  if (text.includes('game') || text.includes('puzzle')) categories.push('games');
  if (text.includes('geography') || text.includes('map') || text.includes('country')) categories.push('geography');
  if (text.includes('radio') || text.includes('communication') || text.includes('morse')) categories.push('radio');
  if (text.includes('scout')) categories.push('scouting');
  if (text.includes('activit')) categories.push('activities');
  if (text.includes('world') || text.includes('international')) categories.push('international');
  if (text.includes('resource') || text.includes('help')) categories.push('resources');

  return [...new Set(categories)].join(',');
}

function addUserToSheet(sheet, user) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) throw new Error('Users sheet has no columns.');
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const row = [];

  headers.forEach(function(header) {
    const key = String(header || '').trim();
    row.push(Object.prototype.hasOwnProperty.call(user, key) ? user[key] : '');
  });

  sheet.appendRow(row);
}

function updateUserEmailStatus(sheet, participantID, status) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  const headers = data[0].map(header => String(header || '').trim());
  const participantColumn = headers.indexOf('ParticipantID');
  const emailStatusColumn = headers.indexOf('EmailStatus');
  if (participantColumn === -1 || emailStatusColumn === -1) return;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][participantColumn]).trim() === String(participantID).trim()) {
      sheet.getRange(i + 1, emailStatusColumn + 1).setValue(status);
      return;
    }
  }
}

/* ============================================================
   ADMIN PANEL — edit a scout's account, resend emails, certificates
   ============================================================
   Opens from the "JOTA-JOTI Admin" menu in the spreadsheet. Search by
   PIN, Participant ID or name; edit the child's name/email inline;
   resend the parent's account-details email; or send a completion
   certificate once a scout has finished JOTA-JOTI.
   ============================================================ */

function buildAdminPanelHtml() {
  return `<!DOCTYPE html><html><head><base target="_top">
<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;margin:0;padding:16px;background:#fff;}
h2{font-size:18px;margin:0 0 8px;color:#123b5d;}
h3{font-size:14px;margin:0 0 8px;color:#123b5d;}
hr{border:none;border-top:1px solid #e0e0e0;margin:18px 0;}
.row{display:flex;gap:8px;margin-bottom:12px;}
input[type=text],input[type=email]{flex:1;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;}
textarea{width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:12px;box-sizing:border-box;font-family:Consolas,Menlo,monospace;resize:vertical;}
button{padding:9px 14px;border:none;border-radius:6px;background:#126a91;color:#fff;font-weight:bold;cursor:pointer;font-size:13px;}
button.secondary{background:#eef2f5;color:#123b5d;}
button.danger{background:#a52a2a;}
button.tag{background:#e4eef4;color:#123b5d;font-weight:normal;font-size:11px;padding:5px 9px;}
button:disabled{opacity:0.5;cursor:default;}
.card,.section{border:1px solid #e0e0e0;border-radius:10px;padding:14px;margin-top:10px;}
.card{display:none;}
label{display:block;font-weight:bold;margin:10px 0 4px;}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px;}
.msg{margin-top:10px;padding:8px 10px;border-radius:6px;font-size:12px;display:none;white-space:pre-wrap;}
.msg.ok{background:#eef7ee;color:#1e5c1e;display:block;}
.msg.err{background:#fdeaea;color:#8a1f1f;display:block;}
.muted{color:#666;font-size:12px;}
.note{background:#f7f9fb;border:1px solid #dbe3ea;border-radius:7px;padding:9px;margin-top:8px;}
.search-field{position:relative;flex:1;}
.combo-field{margin-top:6px;}
.suggestions{position:absolute;left:0;right:0;top:100%;background:#fff;border:1px solid #ccc;border-top:none;border-radius:0 0 6px 6px;max-height:220px;overflow-y:auto;z-index:20;display:none;box-shadow:0 6px 14px rgba(0,0,0,0.08);}
.suggestions div{padding:9px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid #f0f0f0;}
.suggestions div:last-child{border-bottom:none;}
.suggestions div:hover,.suggestions div.active{background:#eef2f5;}
.suggestions .s-name{font-weight:bold;color:#123b5d;}
.suggestions .s-sub{color:#666;}
.mode-row{display:flex;gap:14px;flex-wrap:wrap;margin:4px 0 10px;}
.mode-option{display:inline-flex;align-items:center;gap:5px;font-weight:normal;font-size:12px;margin:0;}
select{width:100%;padding:9px;border:1px solid #ccc;border-radius:6px;font-size:13px;box-sizing:border-box;margin-bottom:10px;background:#fff;}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.chip{background:#eef2f5;color:#123b5d;border-radius:14px;padding:5px 8px 5px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;}
.chip.warn{background:#fff8e5;color:#795900;}
.chip button{background:none;border:none;color:inherit;cursor:pointer;font-size:14px;line-height:1;font-weight:bold;padding:0;}
.stat{display:inline-block;padding:4px 7px;border-radius:12px;background:#eef2f5;margin-right:5px;font-size:11px;}
.hidden{display:none!important;}
</style></head><body>
<h2>JOTA-JOTI Admin Centre</h2>
<div class="muted">Everything below is read live from the spreadsheet. Names and IDs are matched against the actual <b>Users</b> sheet.</div>

<div class="section">
  <h3>Find a scout</h3>
  <div class="row">
    <div class="search-field">
      <input id="q" type="text" placeholder="Type any part of a name, PIN, username, ID, parent or email…" autocomplete="off"
        oninput="onQueryInput()" onfocus="onQueryInput()" onblur="hideSuggestionsDelayed()" onkeydown="onQueryKeydown(event)">
      <div id="suggestions" class="suggestions"></div>
    </div>
    <button onclick="doSearch()">Search</button>
  </div>
  <div id="msg" class="msg"></div>

  <div id="card" class="card">
    <div class="muted" id="meta"></div>
    <label>Scout's name</label><input id="name" type="text">
    <label>Scout's email</label><input id="email" type="email">
    <label>Parent/guardian's name</label><input id="parentName" type="text">
    <label>Parent/guardian's email</label><input id="parentEmail" type="email">
    <div class="actions">
      <button onclick="doSave()">Save changes</button>
      <button class="secondary" onclick="quickEmail('parent')">Email this parent</button>
      <button class="secondary" onclick="quickEmail('youth')">Email this scout</button>
      <button class="secondary" onclick="quickEmail('both')">Email both</button>
      <button class="secondary" onclick="doResend()">Resend account email to parent</button>
      <button class="secondary" onclick="doCertificate()">Send completion certificate</button>
    </div>
  </div>
</div>

<div class="section">
  <h3>Email centre</h3>
  <div class="muted">Choose <b>who</b> receives the message, then choose <b>which people</b>. The system re-checks the live Users sheet before sending.</div>

  <label>Recipient type</label>
  <div class="mode-row">
    <label class="mode-option"><input type="radio" name="targetType" value="parent" checked onchange="refreshTargetType()"> Parents</label>
    <label class="mode-option"><input type="radio" name="targetType" value="youth" onchange="refreshTargetType()"> Youth</label>
    <label class="mode-option"><input type="radio" name="targetType" value="both" onchange="refreshTargetType()"> Parents + Youth</label>
  </div>

  <label>Recipient selection</label>
  <div class="mode-row">
    <label class="mode-option"><input type="radio" name="scopeMode" value="selected" checked onchange="onScopeChange()"> Pick by name</label>
    <label class="mode-option"><input type="radio" name="scopeMode" value="section" onchange="onScopeChange()"> Youth section</label>
    <label class="mode-option"><input type="radio" name="scopeMode" value="activity" onchange="onScopeChange()"> Activity category</label>
    <label class="mode-option"><input type="radio" name="scopeMode" value="all" onchange="onScopeChange()"> Everyone in Users</label>
  </div>

  <div id="pickWrap">
    <div class="search-field">
      <input id="recipQuery" type="text" placeholder="Click to choose a name, or type to filter…" autocomplete="off"
        oninput="onRecipientQueryInput()" onfocus="openRecipientOptions()" onclick="openRecipientOptions()" onblur="hideRecipientSuggestionsDelayed2()"
        onkeydown="onRecipientKeydown(event)">
      <div id="recipSuggestions" class="suggestions"></div>
    </div>
    <div id="recipChips" class="chips"></div>
    <div class="muted">Click the box to see all names currently in Users, or type to filter. Click × beside a selected person to remove them.</div>
  </div>

  <div id="sectionWrap" class="hidden">
    <div class="search-field combo-field">
      <input id="sectionSearch" type="text" placeholder="Type to filter youth sections…" autocomplete="off"
        oninput="filterSectionOptions()" onfocus="openSectionOptions()" onkeydown="sectionKeydown(event)">
      <div id="sectionOptions" class="suggestions"></div>
    </div>
    <div id="sectionStats" class="muted"></div>
  </div>

  <div id="activityWrap" class="hidden">
    <div class="search-field combo-field">
      <input id="activitySearch" type="text" placeholder="Type to filter activity categories…" autocomplete="off"
        oninput="filterActivityOptions()" onfocus="openActivityOptions()" onkeydown="activityKeydown(event)">
      <div id="activityOptions" class="suggestions"></div>
    </div>
  </div>

  <div id="allWrap" class="hidden">
    <div class="search-field combo-field">
      <input id="allUsersSearch" type="text" value="All active users" placeholder="Choose audience…" autocomplete="off"
        oninput="filterAllOptions()" onfocus="openAllOptions()" onkeydown="allKeydown(event)">
      <div id="allOptions" class="suggestions"></div>
    </div>
    <div id="allChips" class="chips"></div>
    <div class="muted">This starts with every active person in <b>Users</b>. Click × beside a name to remove that person before sending.</div>
  </div>


  <div id="preview" class="note">Recipient count will appear here before sending.</div>

  <label>Subject</label>
  <input id="emailSubject" type="text" placeholder="e.g. JOTA-JOTI update for {{childFirstName}}" onfocus="setFocusField('emailSubject')">

  <label>Message (HTML)</label>
  <div class="tags">
    <button type="button" class="tag" onclick="insertTag('{{childFirstName}}')">Child first name</button>
    <button type="button" class="tag" onclick="insertTag('{{childLastName}}')">Child last name</button>
    <button type="button" class="tag" onclick="insertTag('{{childFullName}}')">Child full name</button>
    <button type="button" class="tag" onclick="insertTag('{{parentName}}')">Parent name</button>
    <button type="button" class="tag" onclick="insertTag('{{username}}')">Username</button>
    <button type="button" class="tag" onclick="insertTag('{{pin}}')">PIN</button>
    <button type="button" class="tag" onclick="insertTag('{{participantID}}')">Participant ID</button>
    <button type="button" class="tag" onclick="insertTag('{{ageYear}}')">Youth section</button><button type="button" class="tag" onclick="insertTag('{{youthSection}}')">Youth section code</button>
    <button type="button" class="tag" onclick="insertTag('{{email}}')">Youth email</button>
    <button type="button" class="tag" onclick="insertTag('{{parentEmail}}')">Parent email</button>
  </div>
  <textarea id="emailBody" rows="10" placeholder="<p>Hi {{parentName}},</p><p>Here is a JOTA-JOTI update for {{childFirstName}}.</p>" onfocus="setFocusField('emailBody')"></textarea>

  <label>Attachments (optional)</label>
  <input id="emailAttachments" type="file" multiple>

  <div class="actions">
    <button onclick="doPreview()">Check recipients</button>
    <button onclick="doSendEmail()">Send email</button>
    <button class="secondary" onclick="clearComposer()">Clear composer</button>
  </div>
  <div id="emailMsg" class="msg"></div>
</div>

<div class="section">
  <h3>Account list</h3>
  <div class="muted" style="margin-bottom:10px;">Creates a private PDF account list from the Users sheet.</div>
  <button class="secondary" onclick="doExportList()">Download account list (PDF)</button>
  <div id="exportMsg" class="msg"></div>
</div>

<script>
let currentId=null, focusField='emailBody', allUsers=[], activeSuggestion=-1, selectedRecipients=[], recipActiveSuggestion=-1;
let ageGroups=[], activities=[];

function esc(v){const d=document.createElement('div');d.textContent=v==null?'':String(v);return d.innerHTML;}
function msg(id,text,ok){const m=document.getElementById(id);m.textContent=text;m.className='msg '+(ok?'ok':'err');}
function hideSuggestionsDelayed(){setTimeout(()=>document.getElementById('suggestions').style.display='none',150);}
function hideRecipientSuggestionsDelayed2(){setTimeout(()=>document.getElementById('recipSuggestions').style.display='none',150);}
function loadDirectory(){google.script.run.withSuccessHandler(function(list){allUsers=list||[];refreshPreview();}).withFailureHandler(e=>msg('msg',e.message||String(e),false)).adminListUsers();}
function loadSelectors(){
  google.script.run.withSuccessHandler(x=>{ageGroups=x||[];renderAgeGroups();}).withFailureHandler(e=>{ageGroups=[];renderSectionOptions([]);}).adminListAgeGroups();
  google.script.run.withSuccessHandler(x=>{activities=x||[];renderActivityOptions(activities);}).withFailureHandler(e=>{activities=[];renderActivityOptions([]);}).adminListCategories();
}
function renderAgeGroups(){
  document.getElementById('sectionSearch').value='';
  renderSectionOptions(ageGroups);
}
function renderSectionOptions(list){
  const box=document.getElementById('sectionOptions');
  box._matches=list||[];
  box.innerHTML=(list&&list.length)?list.map((x,i)=>'<div data-i="'+i+'" onmousedown="chooseSection('+i+')"><div class="s-name">'+esc(x.label||x.value)+'</div><div class="s-sub">'+x.count+' active/total user'+(x.count===1?'':'s')+' in Users</div></div>').join(''):'<div class="s-sub">No matching sections</div>';
}
function renderActivityOptions(list){
  const box=document.getElementById('activityOptions');
  box._matches=list||[];
  box.innerHTML=(list&&list.length)?list.map((x,i)=>'<div data-i="'+i+'" onmousedown="chooseActivity('+i+')"><div class="s-name">'+esc(x.Title||x.CategoryKey)+'</div><div class="s-sub">'+esc(x.CategoryKey||'')+'</div></div>').join(''):'<div class="s-sub">No matching categories</div>';
}
function renderAllOptions(){
  const list=[{value:'active',label:'All active users'}];
  const box=document.getElementById('allOptions');
  box._matches=list;
  box.innerHTML=list.map((x,i)=>'<div data-i="'+i+'" onmousedown="chooseAllOption('+i+')"><div class="s-name">'+esc(x.label)+'</div><div class="s-sub">Every active row in Users with the selected recipient email</div></div>').join('');
}
function refreshTargetType(){refreshPreview();}
function onScopeChange(){
  const mode=document.querySelector('input[name="scopeMode"]:checked').value;
  ['pickWrap','sectionWrap','activityWrap','allWrap'].forEach(id=>document.getElementById(id).classList.add('hidden'));

  if(mode==='selected'){
    document.getElementById('pickWrap').classList.remove('hidden');
  }
  if(mode==='section'){
    document.getElementById('sectionWrap').classList.remove('hidden');
    // Section choices are always refreshed from the Users sheet.
    google.script.run
      .withSuccessHandler(function(x){
        ageGroups=x||[];
        renderAgeGroups();
      })
      .withFailureHandler(function(e){
        ageGroups=[];
        renderSectionOptions([]);
        msg('emailMsg',e.message||String(e),false);
      })
      .adminListAgeGroups();
  }
  if(mode==='activity'){
    document.getElementById('activityWrap').classList.remove('hidden');
  }
  if(mode==='all'){
    document.getElementById('allWrap').classList.remove('hidden');
    // "Everyone in Users" means select every active person, then allow individual removal.
    selectedRecipients=allUsers.filter(u=>String(u.Status||'').toLowerCase()!=='disabled');
    renderRecipientChips();
    document.getElementById('allUsersSearch').value='All active users';
  }

  refreshPreview();
}
function openSectionOptions(){renderSectionOptions(filterList(ageGroups,document.getElementById('sectionSearch').value));document.getElementById('sectionOptions').style.display='block';}
function filterSectionOptions(){renderSectionOptions(filterList(ageGroups,document.getElementById('sectionSearch').value));document.getElementById('sectionOptions').style.display='block';}
function chooseSection(i){const x=document.getElementById('sectionOptions')._matches[i];if(!x)return;document.getElementById('sectionSearch').value=x.label||x.value;document.getElementById('sectionSearch').dataset.value=x.value;document.getElementById('sectionOptions').style.display='none';refreshPreview();}
function sectionKeydown(e){const box=document.getElementById('sectionOptions');const items=box.querySelectorAll(':scope>div');if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();return;}if(e.key==='Enter'&&box._matches&&box._matches[0]){e.preventDefault();chooseSection(0);}}
function openActivityOptions(){renderActivityOptions(filterList(activities,(document.getElementById('activitySearch').value||'')));document.getElementById('activityOptions').style.display='block';}
function filterActivityOptions(){renderActivityOptions(filterList(activities,document.getElementById('activitySearch').value));document.getElementById('activityOptions').style.display='block';}
function chooseActivity(i){const x=document.getElementById('activityOptions')._matches[i];if(!x)return;document.getElementById('activitySearch').value=x.Title||x.CategoryKey;document.getElementById('activitySearch').dataset.value=x.CategoryKey;document.getElementById('activityOptions').style.display='none';refreshPreview();}
function activityKeydown(e){const box=document.getElementById('activityOptions');if(e.key==='Enter'&&box._matches&&box._matches[0]){e.preventDefault();chooseActivity(0);}}
function openAllOptions(){renderAllOptions();document.getElementById('allOptions').style.display='block';}
function filterAllOptions(){renderAllOptions();document.getElementById('allOptions').style.display='block';}
function chooseAllOption(i){const x=document.getElementById('allOptions')._matches[i];if(!x)return;document.getElementById('allUsersSearch').value=x.label;document.getElementById('allUsersSearch').dataset.value=x.value;document.getElementById('allOptions').style.display='none';refreshPreview();}
function allKeydown(e){const box=document.getElementById('allOptions');if(e.key==='Enter'&&box._matches&&box._matches[0]){e.preventDefault();chooseAllOption(0);}}
function filterList(list,q){const nq=normaliseText(q);if(!nq)return (list||[]).slice();return (list||[]).filter(x=>{const fields=[x.value,x.label,x.Title,x.CategoryKey].map(normaliseText);return fields.some(v=>v.indexOf(nq)!==-1);});}
function onQueryInput(){
  const q=document.getElementById('q').value.trim().toLowerCase(), box=document.getElementById('suggestions'); activeSuggestion=-1;
  if(!q){box.style.display='none';box.innerHTML='';return;}
  const matches=rankMatches(q).slice(0,10); box._matches=matches;
  if(!matches.length){box.style.display='none';return;}
  box.innerHTML=matches.map((u,i)=>'<div onmousedown="selectSuggestionByIndex('+i+')"><div class="s-name">'+esc(u.Name||'(no name)')+'</div><div class="s-sub">PIN '+esc(u.PIN||'—')+' · '+esc(u.AgeYear||'section not set')+(u.ParentEmail?' · parent '+esc(u.ParentEmail):'')+(u.Email?' · youth '+esc(u.Email):'')+'</div></div>').join('');
  box.style.display='block';
}
function rankMatches(q){
  const nq=normaliseText(q);
  return allUsers.map(u=>{const fields=[u.Name,u.Username,u.PIN,u.ParticipantID,u.ParentName,u.ParentEmail,u.Email,u.AgeGroup,u.AgeYear].map(normaliseText);let score=0;
    if(fields[0]===nq)score+=100; if(fields.some(x=>x===nq))score+=60; if(fields.some(x=>x.indexOf(nq)===0))score+=30; if(fields.some(x=>x.indexOf(nq)!==-1))score+=10;
    return {u,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).map(x=>x.u);
}
function normaliseText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9@._-]+/g,' ').trim();}
function onQueryKeydown(e){const box=document.getElementById('suggestions'),items=box.querySelectorAll(':scope>div');if(!items.length||box.style.display==='none')return;
  if(e.key==='ArrowDown'){e.preventDefault();activeSuggestion=Math.min(activeSuggestion+1,items.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();activeSuggestion=Math.max(activeSuggestion-1,0);}
  else if(e.key==='Enter'){e.preventDefault();if(activeSuggestion>=0&&box._matches[activeSuggestion])selectSuggestionByIndex(activeSuggestion);else doSearch();return;}
  items.forEach((x,i)=>x.classList.toggle('active',i===activeSuggestion));
}
function selectSuggestionByIndex(i){const box=document.getElementById('suggestions'),u=box._matches&&box._matches[i];if(!u)return;document.getElementById('q').value=u.Name||'';box.style.display='none';google.script.run.withSuccessHandler(onFound).withFailureHandler(onError).adminSearchUser(u.ParticipantID);}
function doSearch(){const q=document.getElementById('q').value.trim();if(!q)return;document.getElementById('suggestions').style.display='none';google.script.run.withSuccessHandler(onFound).withFailureHandler(onError).adminSearchUser(q);}
function onFound(user){if(!user){msg('msg','No matching scout found. Try the full name, PIN, username or choose the suggestion.',false);return;}currentId=user.ParticipantID;
  document.getElementById('meta').textContent='PIN '+(user.PIN||'—')+' · '+(user.ParticipantID||'—')+' · '+(user.AgeYear||'section not set')+' · '+(user.Status||'—');
  document.getElementById('name').value=user.Name||'';document.getElementById('email').value=user.Email||'';document.getElementById('parentName').value=user.ParentName||'';document.getElementById('parentEmail').value=user.ParentEmail||'';
  document.getElementById('card').style.display='block';msg('msg','Loaded '+(user.Name||'scout')+'. All email buttons below use this exact spreadsheet record.',true);
}
function doSave(){if(!currentId)return;const payload=[currentId,document.getElementById('name').value.trim(),document.getElementById('email').value.trim(),document.getElementById('parentName').value.trim(),document.getElementById('parentEmail').value.trim()];
  google.script.run.withSuccessHandler(()=>{msg('msg','Saved. The recipient list has been refreshed from Users.',true);loadDirectory();}).withFailureHandler(onError).adminUpdateUser.apply(null,payload);
}
function quickEmail(target){
  if(!currentId){msg('msg','Load a scout first.',false);return;}
  const u=allUsers.find(x=>String(x.ParticipantID)===String(currentId)); if(!u)return;
  selectedRecipients=[u]; document.querySelector('input[name="scopeMode"][value="selected"]').checked=true;
  document.querySelector('input[name="targetType"][value="'+target+'"]').checked=true; onScopeChange();
  document.getElementById('recipQuery').value=''; renderRecipientChips(); document.getElementById('emailSubject').focus();
  msg('msg','Email target selected: '+target+'. Write the message below and send it when ready.',true);
}
function doResend(){if(!currentId)return;msg('msg','Sending account email…',true);google.script.run.withSuccessHandler(()=>msg('msg','Account email sent to the parent.',true)).withFailureHandler(onError).adminResendWelcomeEmail(currentId);}
function doCertificate(){if(!currentId)return;msg('msg','Sending certificate…',true);google.script.run.withSuccessHandler(()=>msg('msg','Completion certificate sent to the parent.',true)).withFailureHandler(onError).adminSendCertificate(currentId);}

function openRecipientOptions(){
  // Refresh from the live Users sheet every time the recipient picker is opened.
  google.script.run
    .withSuccessHandler(function(list){
      allUsers=list||[];
      renderRecipientOptions();
      refreshPreview();
    })
    .withFailureHandler(function(e){ msg('emailMsg',e.message||String(e),false); })
    .adminListUsers();
}

function renderRecipientOptions(){
  const input=document.getElementById('recipQuery');
  const box=document.getElementById('recipSuggestions');
  const chosen=selectedRecipients.map(r=>String(r.ParticipantID));
  const q=input.value.trim();

  const matches=(q
    ? rankMatches(q)
    : allUsers.slice().sort((a,b)=>String(a.Name||'').localeCompare(String(b.Name||'')))
  ).filter(u=>chosen.indexOf(String(u.ParticipantID))===-1).slice(0,100);

  recipActiveSuggestion=-1;
  box._matches=matches;
  box.innerHTML=matches.length
    ? matches.map((u,i)=>
        '<div onmousedown="addRecipientByIndex('+i+')">' +
          '<div class="s-name">'+esc(u.Name||'(no name)')+'</div>' +
          '<div class="s-sub">'+
            esc(u.YouthSection||u.AgeYear||'section not set')+
            ' · parent '+esc(u.ParentEmail||'none')+
            ' · youth '+esc(u.Email||'none')+
          '</div>' +
        '</div>'
      ).join('')
    : '<div class="s-sub">No matching names</div>';

  box.style.display='block';
}

function onRecipientQueryInput(){ renderRecipientOptions(); }
function onRecipientKeydown(e){const box=document.getElementById('recipSuggestions'),items=box.querySelectorAll(':scope>div');if(!items.length||box.style.display==='none')return;
  if(e.key==='ArrowDown'){e.preventDefault();recipActiveSuggestion=Math.min(recipActiveSuggestion+1,items.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();recipActiveSuggestion=Math.max(recipActiveSuggestion-1,0);}
  else if(e.key==='Enter'){e.preventDefault();if(recipActiveSuggestion>=0&&box._matches[recipActiveSuggestion])addRecipientByIndex(recipActiveSuggestion);}
  items.forEach((x,i)=>x.classList.toggle('active',i===recipActiveSuggestion));
}
function addRecipientByIndex(i){const box=document.getElementById('recipSuggestions'),u=box._matches&&box._matches[i];if(!u)return;selectedRecipients.push(u);document.getElementById('recipQuery').value='';box.style.display='none';renderRecipientChips();refreshPreview();}
function removeRecipient(id){selectedRecipients=selectedRecipients.filter(r=>String(r.ParticipantID)!==String(id));renderRecipientChips();refreshPreview();}
function renderRecipientChips(){
  const html=selectedRecipients.map(r=>
    '<span class="chip">'+
      esc(r.Name||r.PIN||'Scout')+
      '<button type="button" title="Remove" onclick="removeRecipient(\''+
      String(r.ParticipantID).replace(/'/g,"\\'")+
      '\')">×</button>'+
    '</span>'
  ).join('');

  const recip=document.getElementById('recipChips');
  const all=document.getElementById('allChips');
  if(recip) recip.innerHTML=html;
  if(all) all.innerHTML=html;
}
function selectedModeRecipients(){
  const mode=document.querySelector('input[name="targetType"]:checked').value;
  return selectedRecipients.flatMap(u=>recipientEmailsForUser(u,mode).map(email=>({email:email,user:u})));
}
function recipientEmailsForUser(u,mode){
  const out=[];
  if(mode==='parent'||mode==='both'){if(validEmail(u.ParentEmail))out.push(String(u.ParentEmail).trim().toLowerCase());}
  if(mode==='youth'||mode==='both'){if(validEmail(u.Email))out.push(String(u.Email).trim().toLowerCase());}
  return [...new Set(out)];
}
function validEmail(v){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v||'').trim());}
function refreshPreview(){
  const box=document.getElementById('preview'),scope=document.querySelector('input[name="scopeMode"]:checked').value,target=document.querySelector('input[name="targetType"]:checked').value;
  if(scope==='selected'){const emails=selectedModeRecipients();box.textContent='Selected scouts: '+selectedRecipients.length+' · individual emails with the requested target: '+emails.length;return;}
  if(scope==='section'){const v=document.getElementById('sectionSearch').dataset.value||'';if(!v){box.textContent='Choose a youth section.';return;}const users=allUsers.filter(u=>sameSection(u,v)&&String(u.Status||'').toLowerCase()!=='disabled');const emails=[...new Set(users.flatMap(u=>recipientEmailsForUser(u,target)))];document.getElementById('sectionStats').textContent=users.length+' active user(s) in this section.';box.textContent='Section: '+v+' · active users: '+users.length+' · unique emails: '+emails.length;return;}
  if(scope==='activity'){const v=document.getElementById('activitySearch').dataset.value||'';box.textContent=v?'Activity category selected. The server will re-check access from AllowedCategories before sending.':'Choose an activity category.';return;}
  if(scope==='all'){const users=selectedRecipients.filter(u=>String(u.Status||'').toLowerCase()!=='disabled');const emails=users.flatMap(u=>recipientEmailsForUser(u,target));box.textContent='Selected from Users: '+users.length+' person(s) · individual emails: '+emails.length;return;}
}
function sameSection(u,v){return normaliseText(u.AgeYear)===normaliseText(v);}
document.getElementById('sectionSearch').addEventListener('input',function(){delete this.dataset.value;refreshPreview();});
document.getElementById('activitySearch').addEventListener('input',function(){delete this.dataset.value;refreshPreview();});

function setFocusField(id){focusField=id;}
function insertTag(tag){const el=document.getElementById(focusField||'emailBody'),start=el.selectionStart||el.value.length,end=el.selectionEnd||el.value.length;el.value=el.value.slice(0,start)+tag+el.value.slice(end);el.focus();el.selectionStart=el.selectionEnd=start+tag.length;}
function readAttachments(){const files=Array.prototype.slice.call(document.getElementById('emailAttachments').files||[]);if(!files.length)return Promise.resolve([]);return Promise.all(files.map(f=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({filename:f.name,mimeType:f.type||'application/octet-stream',base64:r.result.split(',')[1]});r.onerror=()=>reject(new Error('Could not read '+f.name));r.readAsDataURL(f);})));}

function buildPayload(){
  const subject=document.getElementById('emailSubject').value.trim(),body=document.getElementById('emailBody').value.trim(),scope=document.querySelector('input[name="scopeMode"]:checked').value,target=document.querySelector('input[name="targetType"]:checked').value;
  if(!subject)throw new Error('Enter a subject.');if(!body)throw new Error('Write a message.');
  const p={subject:subject,htmlBody:body,scope:scope,targetType:target};
  if(scope==='selected'){if(!selectedRecipients.length)throw new Error('Pick at least one scout.');p.participantIds=selectedRecipients.map(x=>x.ParticipantID);}
  if(scope==='section'){if(!document.getElementById('sectionSearch').dataset.value)throw new Error('Choose a youth section from the dropdown.');p.ageGroup=document.getElementById('sectionSearch').dataset.value;}
  if(scope==='activity'){if(!document.getElementById('activitySearch').dataset.value)throw new Error('Choose an activity category from the dropdown.');p.categoryKey=document.getElementById('activitySearch').dataset.value;}
  if(scope==='all'){if(!selectedRecipients.length)throw new Error('Select at least one person.');p.participantIds=selectedRecipients.map(x=>x.ParticipantID);}
  return p;
}
function doPreview(){
  let p;
  try {
    p=buildPayload();
  } catch(e) {
    msg('emailMsg',e.message||String(e),false);
    return;
  }

  msg('emailMsg','Checking the live Users sheet…',true);

  google.script.run
    .withSuccessHandler(function(r){
      let lines=[
        'Ready: '+r.totalRecipients+' individual email(s).',
        'Users matched: '+r.matchedUsers+'.',
        'Missing requested emails: '+r.missingEmails+'.'
      ];
      if(r.warnings&&r.warnings.length){
        lines.push('Warnings: '+r.warnings.join(' | '));
      }
      document.getElementById('preview').textContent=lines.join('\n');
      msg('emailMsg','Recipient check complete. Nothing has been sent.',true);
    })
    .withFailureHandler(function(e){
      msg('emailMsg',e.message||String(e),false);
    })
    .adminPreviewBulkEmail(p);
}
function doSendEmail(){
  let p;
  try {
    p=buildPayload();
  } catch(e) {
    msg('emailMsg',e.message||String(e),false);
    return;
  }

  google.script.run
    .withSuccessHandler(function(pre){
      document.getElementById('preview').textContent=
        'Ready to send: '+pre.totalRecipients+' individual email(s). '+
        'Users matched: '+pre.matchedUsers+'. '+
        'Missing emails: '+pre.missingEmails+'.';

      if(!pre.totalRecipients){
        msg('emailMsg','Nothing can be sent because no valid recipient email was found.',false);
        return;
      }

      const confirmText=
        'SEND EMAIL\n\n'+
        'Individual emails: '+pre.totalRecipients+'\n'+
        'Users matched: '+pre.matchedUsers+'\n'+
        'Missing emails: '+pre.missingEmails+'\n\n'+
        'Each selected person will receive their own personalised email.\n\nContinue?';

      if(!window.confirm(confirmText)) return;

      msg('emailMsg','Preparing attachments…',true);

      readAttachments()
        .then(function(att){
          p.attachments=att;
          msg('emailMsg','Sending individual emails…',true);

          google.script.run
            .withSuccessHandler(function(r){
              let t='Sent '+r.sent+' of '+r.total+' individual email(s).';
              if(r.failed&&r.failed.length){
                t+='\nFailures: '+r.failed.join(' | ');
              }
              msg('emailMsg',t,!r.failed||r.failed.length===0);
            })
            .withFailureHandler(function(e){
              msg('emailMsg',e.message||String(e),false);
            })
            .adminSendBulkEmail(p);
        })
        .catch(function(e){
          msg('emailMsg',e.message||String(e),false);
        });
    })
    .withFailureHandler(function(e){
      msg('emailMsg',e.message||String(e),false);
    })
    .adminPreviewBulkEmail(p);
}
function clearComposer(){document.getElementById('emailSubject').value='';document.getElementById('emailBody').value='';document.getElementById('emailAttachments').value='';msg('emailMsg','Composer cleared.',true);}
function doExportList(){msg('exportMsg','Building PDF…',true);google.script.run.withSuccessHandler(url=>{msg('exportMsg','PDF ready.',true);window.open(url,'_blank');}).withFailureHandler(e=>msg('exportMsg',e.message||String(e),false)).adminGenerateAccountListPdf();}
function onError(e){msg('msg',e.message||String(e),false);}

loadDirectory();loadSelectors();onScopeChange();renderRecipientChips();
</script></body></html>`;
}

function normaliseLookupValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@._-]+/g, ' ')
    .trim();
}

function findUserRowIndex(sheet, query) {
  const values = sheet.getDataRange().getValues();
  if (!values.length) return null;
  const headers = values[0].map(h => String(h || '').trim());
  const q = normaliseLookupValue(query);
  if (!q) return null;

  function get(row, name) {
    const i = headers.indexOf(name);
    return i === -1 ? '' : row[i];
  }

  let best = null;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const fields = [
      get(row, 'ParticipantID'), get(row, 'PIN'), get(row, 'Name'),
      get(row, 'Username'), get(row, 'ParentName'), get(row, 'ParentEmail'),
      get(row, 'Email')
    ].map(normaliseLookupValue);

    let score = 0;
    if (fields.indexOf(q) !== -1) score += 100;
    if (fields[2] === q) score += 80;
    fields.forEach(function(v) {
      if (!v) return;
      if (v.indexOf(q) === 0) score += 25;
      else if (v.indexOf(q) !== -1) score += 10;
    });

    // Strongly support "First Last" searches where the sheet contains the full name.
    const nameTokens = normaliseLookupValue(get(row, 'Name')).split(' ').filter(Boolean);
    const queryTokens = q.split(' ').filter(Boolean);
    if (queryTokens.length > 1 && queryTokens.every(t => nameTokens.indexOf(t) !== -1)) score += 45;

    if (score > 0 && (!best || score > best.score)) {
      best = { rowIndex: i + 1, headers: headers, score: score };
    }
  }
  return best ? { rowIndex: best.rowIndex, headers: best.headers } : null;
}

function rowToUserObject(sheet, rowIndex, headers) {
  const row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });
  return obj;
}

function adminListUsers() {
  // Always read the current Users sheet. Do not rely on the dashboard cache here:
  // this list is the source for the admin email composer and must reflect updates.
  return getSheetData(CONFIG.USERS_SHEET).map(function(user) {
    var names = splitName(user.Name || '');
    return {
      ParticipantID: user.ParticipantID || '',
      PIN: user.PIN || '',
      Name: user.Name || '',
      ChildFirstName: names.first || '',
      ChildLastName: names.last || '',
      ChildFullName: user.Name || '',
      Username: user.Username || '',
      Email: user.Email || '',
      ParentName: user.ParentName || '',
      ParentEmail: user.ParentEmail || '',
      Status: user.Status || '',
      AgeYear: user.AgeYear || '',
      YouthSection: getCanonicalYouthSection(user.AgeYear || user.AgeGroup || ''),
      AgeGroup: user.AgeGroup || '',
      AllowedCategories: user.AllowedCategories || ''
    };
  });
}

function getCanonicalYouthSection(value) {
  var raw = String(value || '').trim();
  var key = normaliseLookupValue(raw);

  if (!key) return '';
  if (/^joey(s)?$/.test(key)) return 'Joeys';
  if (/^cub(s)?$/.test(key)) return 'Cubs';
  if (/^scout(s)?$/.test(key)) return 'Scouts';
  if (/^(vent|vents|venture|venturer|venturers)$/.test(key)) return 'Venturers';
  if (/^leader(s)?$/.test(key)) return 'Leaders';

  return raw;
}

function adminListAgeGroups() {
  // These are the selectable sections. Counts are calculated from the live Users sheet.
  var users = getSheetData(CONFIG.USERS_SHEET);
  var order = ['Joeys', 'Cubs', 'Scouts', 'Venturers', 'Leaders'];
  var counts = {};
  order.forEach(function(section) { counts[section] = 0; });

  users.forEach(function(user) {
    if (String(user.Status || '').trim().toLowerCase() === 'disabled') return;
    var section = getCanonicalYouthSection(user.AgeYear || user.AgeGroup || '');
    if (counts.hasOwnProperty(section)) counts[section]++;
  });

  return order.map(function(section) {
    return {
      value: section,
      label: section,
      count: counts[section]
    };
  });
}

function validEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function adminSearchUser(query) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) throw new Error('Users sheet not found.');
  const match = findUserRowIndex(sheet, query);
  if (!match) return null;
  return rowToUserObject(sheet, match.rowIndex, match.headers);
}

function adminUpdateUser(participantId, newName, newEmail, newParentName, newParentEmail) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) throw new Error('Users sheet not found.');
  const match = findUserRowIndex(sheet, participantId);
  if (!match) throw new Error('Could not find that scout anymore.');

  newName = String(newName || '').trim();
  newEmail = String(newEmail || '').trim();
  newParentName = String(newParentName || '').trim();
  newParentEmail = String(newParentEmail || '').trim();

  if (!newName) throw new Error('Scout name cannot be blank.');
  if (newEmail && !validEmailAddress(newEmail)) throw new Error('The scout email address is not valid.');
  if (newParentEmail && !validEmailAddress(newParentEmail)) throw new Error('The parent email address is not valid.');

  const nameCol = match.headers.indexOf('Name');
  const emailCol = match.headers.indexOf('Email');
  const parentNameCol = match.headers.indexOf('ParentName');
  const parentEmailCol = match.headers.indexOf('ParentEmail');
  if (nameCol > -1) sheet.getRange(match.rowIndex, nameCol + 1).setValue(newName);
  if (emailCol > -1) sheet.getRange(match.rowIndex, emailCol + 1).setValue(newEmail);
  if (parentNameCol > -1) sheet.getRange(match.rowIndex, parentNameCol + 1).setValue(newParentName);
  if (parentEmailCol > -1) sheet.getRange(match.rowIndex, parentEmailCol + 1).setValue(newParentEmail);

  SpreadsheetApp.flush();
  clearSheetCache();
  return true;
}

function adminResendWelcomeEmail(participantId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) throw new Error('Users sheet not found.');
  const match = findUserRowIndex(sheet, participantId);
  if (!match) throw new Error('Could not find that scout anymore.');

  const user = rowToUserObject(sheet, match.rowIndex, match.headers);
  if (!user.ParentEmail) throw new Error('This scout has no parent email on file.');

  const [childFirstName, ...rest] = String(user.Name || '').split(' ');
  sendParentWelcomeEmail({
    parentName: user.ParentName || 'Parent/Guardian',
    parentEmail: user.ParentEmail,
    childFirstName: childFirstName || user.Name || 'Scout',
    childLastName: rest.join(' '),
    ageYear: user.AgeYear || '',
    participantID: user.ParticipantID || '',
    username: user.Username || '',
    pin: user.PIN || '',
    password: user.Password || '',
    allowedCategories: user.AllowedCategories || ''
  });

  updateUserEmailStatus(sheet, participantId, 'Resent ' + new Date().toISOString());
  return true;
}

function adminSendCertificate(participantId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) throw new Error('Users sheet not found.');
  const match = findUserRowIndex(sheet, participantId);
  if (!match) throw new Error('Could not find that scout anymore.');

  const user = rowToUserObject(sheet, match.rowIndex, match.headers);
  if (!user.ParentEmail) throw new Error('This scout has no parent email on file.');

  const pdfBlob = buildCertificatePdf(user, normaliseCertificateOptions_({certificate: {placement: 'attachment'}}));
  sendCertificateEmail(user, pdfBlob);
  return true;
}

/* ============================================================
   ACCOUNT LIST PDF EXPORT
   ============================================================
   Builds a printable PDF of every account (first name, last name,
   username, password, email) and saves it to a private Drive folder
   that only this account can see, then hands back the file's URL.
   ============================================================ */

function getOrCreateExportsFolder() {
  const folders = DriveApp.getFoldersByName('JOTA-JOTI Account Lists');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('JOTA-JOTI Account Lists');
}

function splitName(fullName) {
  const name = String(fullName || '').trim();
  const spaceIndex = name.indexOf(' ');
  if (spaceIndex === -1) return { first: name, last: '' };
  return { first: name.slice(0, spaceIndex), last: name.slice(spaceIndex + 1) };
}

function adminGenerateAccountListPdf() {
  const users = getSheetData(CONFIG.USERS_SHEET);
  if (!users.length) throw new Error('No accounts found in the Users sheet.');

  const doc = DocumentApp.create('JOTA-JOTI Account List — temp');
  const body = doc.getBody();
  body.setPageWidth(842).setPageHeight(595); // landscape, room for 5 columns
  body.setMarginTop(28).setMarginBottom(28).setMarginLeft(28).setMarginRight(28);

  body.appendParagraph('JOTA-JOTI Account List')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph(CONFIG.SCOUT_GROUP + ' · Generated ' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Etc/UTC', 'd MMMM yyyy, h:mm a'));
  body.appendParagraph(' ');

  const headerRow = ['First name', 'Last name', 'Username', 'Password', 'Email'];
  const tableRows = [headerRow];

  users.forEach(function(user) {
    const nameParts = splitName(user.Name);
    tableRows.push([
      nameParts.first || '',
      nameParts.last || '',
      String(user.Username || ''),
      String(user.Password || ''),
      String(user.Email || '')
    ]);
  });

  const table = body.appendTable(tableRows);
  const header = table.getRow(0);
  for (let c = 0; c < headerRow.length; c++) {
    header.getCell(c).editAsText().setBold(true);
  }

  body.appendParagraph(' ');
  body.appendParagraph('Contains account passwords — keep this list private and delete it once accounts are set up.')
    .setItalic(true);

  doc.saveAndClose();

  const tempFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = tempFile.getAs(MimeType.PDF)
    .setName('JOTA-JOTI Account List - ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Etc/UTC', 'yyyy-MM-dd_HH-mm') + '.pdf');

  const folder = getOrCreateExportsFolder();
  const pdfFile = folder.createFile(pdfBlob);
  tempFile.setTrashed(true);

  // Deliberately left at Drive's default (private) sharing — this file has
  // plaintext passwords in it, so it should never be set to "anyone with
  // the link".
  return pdfFile.getUrl();
}

/* ============================================================
   BULK / MERGE EMAIL TO USERS
   ============================================================
   Lets an admin write one HTML email with {{tokens}} that get
   swapped per-recipient, optionally attach files, and send it to
   selected people, a Youth section from AgeYear, an activity category, or everyone.
   ============================================================ */

function getUserAgeGroup(user) {
  return String(
    user.AgeYear || ''
  ).trim();
}

function fillEmailTemplate(template, user) {
  var names = splitName(user.Name || '');
  var childFirstName = String(user.ChildFirstName || names.first || '');
  var childLastName = String(user.ChildLastName || names.last || '');
  var childFullName = String(user.ChildFullName || user.Name || '');

  var tokens = {
    '{{childFirstName}}': childFirstName,
    '{{childLastName}}': childLastName,
    '{{childFullName}}': childFullName,
    '{{parentName}}': String(user.ParentName || 'Parent/Guardian'),
    '{{username}}': String(user.Username || ''),
    '{{pin}}': String(user.PIN || ''),
    '{{participantID}}': String(user.ParticipantID || ''),
    '{{ageYear}}': String(user.YouthSection || getCanonicalYouthSection(user.AgeYear || user.AgeGroup || '')),
    '{{ageGroup}}': String(user.YouthSection || getCanonicalYouthSection(user.AgeYear || user.AgeGroup || '')),
    '{{youthSection}}': String(user.YouthSection || getCanonicalYouthSection(user.AgeYear || user.AgeGroup || '')),
    '{{email}}': String(user.Email || ''),
    '{{youthEmail}}': String(user.Email || ''),
    '{{parentEmail}}': String(user.ParentEmail || '')
  };

  var result = String(template || '');
  Object.keys(tokens).forEach(function(key) {
    result = result.split(key).join(tokens[key]);
  });
  return result;
}

function userAllowedCategoryKeys(user, allCategoryKeys) {
  const raw = String(user.AllowedCategories || '').trim();
  if (!raw || raw === '*') return allCategoryKeys.slice();
  return raw.split(',').map(function(item) {
    return String(item).trim().toLowerCase();
  }).filter(function(item) { return item !== ''; });
}

function adminListCategories() {
  return getSheetData(CONFIG.CATEGORIES_SHEET).map(function(category) {
    return {
      CategoryKey: category.CategoryKey || '',
      Title: category.Title || ''
    };
  });
}

function adminListGroups() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.EMAIL_GROUPS_SHEET);
  if (!sheet) return [];
  return getSheetData(CONFIG.EMAIL_GROUPS_SHEET).filter(function(row) {
    return String(row.Active || 'true').trim().toLowerCase() !== 'false';
  }).map(function(row) {
    return {
      GroupKey: String(row.GroupKey || '').trim(),
      GroupName: String(row.GroupName || row.Title || row.GroupKey || '').trim(),
      ParticipantIDs: String(row.ParticipantIDs || row.ParticipantIds || '').split(',').map(function(x){return String(x).trim();}).filter(Boolean)
    };
  }).filter(function(g){ return g.GroupKey || g.GroupName; });
}

function emailAddressesForUser(user, targetType) {
  var emails = [];
  var mode = String(targetType || 'parent').toLowerCase();

  if ((mode === 'parent' || mode === 'both') && validEmailAddress(user.ParentEmail)) {
    emails.push(String(user.ParentEmail).trim().toLowerCase());
  }

  if ((mode === 'youth' || mode === 'both') && validEmailAddress(user.Email)) {
    emails.push(String(user.Email).trim().toLowerCase());
  }

  return [...new Set(emails)];
}

function resolveBulkEmailUsers(payload) {
  var allUsers = getSheetData(CONFIG.USERS_SHEET);
  var activeUsers = allUsers.filter(function(user) {
    return String(user.Status || '').trim().toLowerCase() !== 'disabled';
  });
  var scope = String(payload.scope || '').toLowerCase();

  function idsFromPayload() {
    return (payload.participantIds || []).map(function(id) { return String(id); });
  }

  function byIds(ids) {
    return activeUsers.filter(function(user) {
      return ids.indexOf(String(user.ParticipantID || '')) !== -1;
    });
  }

  if (scope === 'selected') {
    var selectedIds = idsFromPayload();
    if (!selectedIds.length) throw new Error('Pick at least one person.');
    return byIds(selectedIds);
  }

  if (scope === 'section') {
    var wanted = getCanonicalYouthSection(payload.ageGroup || '');
    if (!wanted) throw new Error('Choose a youth section.');

    return activeUsers.filter(function(user) {
      return getCanonicalYouthSection(user.AgeYear || user.AgeGroup || '') === wanted;
    });
  }

  if (scope === 'activity') {
    var categoryKey = String(payload.categoryKey || '').trim().toLowerCase();
    if (!categoryKey) throw new Error('Choose an activity category.');

    var allCategoryKeys = getSheetData(CONFIG.CATEGORIES_SHEET)
      .map(function(category) { return String(category.CategoryKey || '').trim().toLowerCase(); })
      .filter(function(key) { return key !== ''; });

    return activeUsers.filter(function(user) {
      return userAllowedCategoryKeys(user, allCategoryKeys).indexOf(categoryKey) !== -1;
    });
  }

  if (scope === 'group') {
    var groupKey = String(payload.groupKey || '').trim();
    if (!groupKey) throw new Error('Choose a saved group.');
    var groups = adminListGroups();
    var group = groups.find(function(g) { return String(g.GroupKey).toLowerCase() === groupKey.toLowerCase(); });
    if (!group) throw new Error('Saved group not found.');
    return byIds(group.ParticipantIDs);
  }

  if (scope === 'all') {
    // The UI sends the selected ParticipantIDs even in "Everyone in Users" mode.
    // This lets the admin remove individual people before sending.
    var allIds = idsFromPayload();
    return allIds.length ? byIds(allIds) : activeUsers;
  }

  throw new Error('Choose a valid recipient selection.');
}

function resolveBulkRecipientPlan(payload) {
  if (!payload) throw new Error('No email data supplied.');

  var targetType = String(payload.targetType || 'parent').toLowerCase();
  if (['parent', 'youth', 'both'].indexOf(targetType) === -1) {
    throw new Error('Recipient type must be parent, youth or both.');
  }

  var users = resolveBulkEmailUsers(payload);
  var recipients = [];
  var missingEmails = 0;

  users.forEach(function(user) {
    var emails = emailAddressesForUser(user, targetType);
    if (!emails.length) missingEmails++;

    emails.forEach(function(email) {
      // Deliberately DO NOT de-duplicate by email address.
      // Every selected Users row gets its own personalized email.
      recipients.push({
        email: email,
        user: user
      });
    });
  });

  var warnings = [];
  if (missingEmails) {
    warnings.push(
      missingEmails +
      ' matched user(s) have no valid email for the selected recipient type.'
    );
  }

  return {
    users: users,
    recipients: recipients,
    missingEmails: missingEmails,
    warnings: warnings
  };
}

function normaliseCertificateOptions_(payload) {
  const c = (payload && payload.certificate) || {};
  const allowed = ['none','attachment','before','after','before-attachment','after-attachment'];
  const placement = String(c.placement || 'none').trim().toLowerCase();
  if (allowed.indexOf(placement) === -1) throw new Error('Invalid certificate placement.');

  const options = {
    placement: placement,
    title: String(c.title || 'CERTIFICATE OF COMPLETION').trim().slice(0, 120),
    subtitle: String(c.subtitle || 'JOTA-JOTI 2026').trim().slice(0, 120),
    message: String(c.message || 'This certifies that {{childFullName}} has successfully taken part in JOTA-JOTI 2026 with ' + CONFIG.SCOUT_GROUP + '.').trim().slice(0, 3000),
    footer: String(c.footer || ('Issued by ' + CONFIG.SCOUT_GROUP)).trim().slice(0, 160)
  };
  return options;
}

function certificateUsesAttachment_(placement) {
  return placement === 'attachment' || placement === 'before-attachment' || placement === 'after-attachment';
}

function certificateUsesBlock_(placement) {
  return placement === 'before' || placement === 'after' || placement === 'before-attachment' || placement === 'after-attachment';
}

function certificateBlockHtml_(user, options) {
  const title = escapeHtml(fillEmailTemplate(options.title, user));
  const subtitle = escapeHtml(fillEmailTemplate(options.subtitle, user));
  const message = escapeHtml(fillEmailTemplate(options.message, user));
  const footer = escapeHtml(fillEmailTemplate(options.footer, user));
  const issued = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Etc/UTC', 'd MMMM yyyy');
  return '<div style="margin:22px 0;padding:28px 24px;border:2px solid #d7b24a;border-radius:14px;background:#fffdf5;text-align:center;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="font-size:24px;font-weight:700;letter-spacing:1px;color:#123b5d;">' + title + '</div>' +
    '<div style="margin-top:8px;font-size:14px;font-weight:700;color:#126a91;letter-spacing:1px;text-transform:uppercase;">' + subtitle + '</div>' +
    '<div style="width:55px;height:3px;background:#d7b24a;margin:18px auto;border-radius:4px;"></div>' +
    '<div style="font-size:16px;line-height:1.7;color:#263238;">' + message + '</div>' +
    '<div style="margin-top:18px;font-size:13px;color:#6b757b;">' + footer + '<br>Issued ' + issued + '</div>' +
    '</div>';
}

function adminPreviewBulkEmail(payload) {
  const plan = resolveBulkRecipientPlan(payload);
  const certificate = normaliseCertificateOptions_(payload);
  return {
    totalRecipients: plan.recipients.length,
    matchedUsers: plan.users.length,
    missingEmails: plan.missingEmails,
    certificatePlacement: certificate.placement,
    warnings: (plan.warnings || []).concat(certificate.placement === 'none' ? [] : ['Personalised certificate mode: ' + certificate.placement + '.'])
  };
}

function getEmailSenderSettings() {
  const sender = String(Session.getEffectiveUser().getEmail() || '').trim();
  const replyTo = sender;
  return {
    name: CONFIG.SCOUT_GROUP + ' — JOTA-JOTI',
    replyTo: replyTo,
    noReply: false
  };
}

function pauseBetweenBulkSends() {
  // Small pause for legitimate mailing-list style sends. This is not a spam-filter bypass;
  // it simply avoids hammering the mail service with a tight loop.
  Utilities.sleep(150);
}

function ensureEmailLogHeaders(sheet) {
  const required = ['Timestamp','AdminEmail','RecipientEmail','ParticipantID','RecipientType','Subject','Status','Error'];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]).setFontWeight('bold');
    return;
  }
  ensureUsersHeaders(sheet, required);
}

function ensureEmailGroupsHeaders(sheet) {
  const required = ['GroupKey','GroupName','ParticipantIDs','Active','Notes'];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]).setFontWeight('bold');
    return;
  }
  ensureUsersHeaders(sheet, required);
}

function logBulkEmail_(adminEmail, recipientEmail, user, targetType, subject, status, errorText) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.EMAIL_LOG_SHEET);
    if (!sheet) return;
    sheet.appendRow([new Date(), adminEmail || '', recipientEmail || '', user.ParticipantID || '', targetType || '', subject || '', status || '', errorText || '']);
  } catch (err) {
    console.error('Could not write EmailLog: ' + err.message);
  }
}

function extractDriveFileId_(value) {
  const text = String(value || '').trim();
  if (/^[A-Za-z0-9_-]{20,}$/.test(text)) return text;
  const m = text.match(/[-\w]{20,}/);
  return m ? m[0] : '';
}

function adminSendBulkEmail(payload) {
  if (!payload) throw new Error('No email data supplied.');
  const subjectTemplate = String(payload.subject || '').trim();
  const bodyTemplate = String(payload.htmlBody || '');
  if (!subjectTemplate) throw new Error('Please enter a subject.');
  if (!bodyTemplate) throw new Error('Please write a message.');
  if (subjectTemplate.length > 180) throw new Error('Keep the subject under 180 characters.');
  if (bodyTemplate.length > 60000) throw new Error('The email body is too large for the GitHub Pages browser email composer. Keep it under 60,000 characters.');

  const certificate = normaliseCertificateOptions_(payload);
  const senderSettings = getEmailSenderSettings();
  if (!senderSettings.replyTo || !validEmailAddress(senderSettings.replyTo)) {
    throw new Error('Could not determine the sending Google account email. Check the Apps Script account/permissions.');
  }

  const plan = resolveBulkRecipientPlan(payload);
  if (!plan.recipients.length) {
    throw new Error('No valid recipient email addresses were found in the live Users sheet.');
  }

  // Common attachments are loaded once. A personalised certificate, when enabled,
  // is generated separately for each scout because it contains that scout's name.
  const commonAttachments = [];
  (payload.attachments || []).forEach(function(a) {
    if (!a) return;
    if (a.base64) {
      const bytes = Utilities.base64Decode(a.base64);
      commonAttachments.push(Utilities.newBlob(bytes, a.mimeType || 'application/octet-stream', a.filename || 'attachment'));
      return;
    }
    if (a.driveId || a.driveUrl) {
      const id = String(a.driveId || '').trim() || extractDriveFileId_(String(a.driveUrl || ''));
      if (!id) throw new Error('Could not find a Google Drive file ID for the attachment.');
      commonAttachments.push(DriveApp.getFileById(id).getBlob());
      return;
    }
    throw new Error('One attachment is invalid.');
  });

  const commonAttachmentBytes = commonAttachments.reduce(function(total, blob) {
    return total + blob.getBytes().length;
  }, 0);
  if (commonAttachmentBytes > 20 * 1024 * 1024) throw new Error('Attachments are too large. Keep the total below 20 MB.');

  const quotaRemaining = MailApp.getRemainingDailyQuota();
  if (plan.recipients.length > quotaRemaining) {
    throw new Error(
      'This would send ' + plan.recipients.length + ' email(s), but only ' +
      quotaRemaining + ' remain in today\'s Google sending quota.'
    );
  }

  let sentCount = 0;
  const failed = [];
  const adminEmail = String(Session.getEffectiveUser().getEmail() || '').trim();

  plan.recipients.forEach(function(item) {
    const user = item.user || {};
    const recipientEmail = String(item.email || '').trim();
    let subject = subjectTemplate;

    try {
      const personalisedMessage = fillEmailTemplate(bodyTemplate, user);
      subject = fillEmailTemplate(subjectTemplate, user);
      const certificateBlock = certificateUsesBlock_(certificate.placement) ? certificateBlockHtml_(user, certificate) : '';
      let htmlBody = personalisedMessage;

      if (certificate.placement === 'before' || certificate.placement === 'before-attachment') {
        htmlBody = certificateBlock + htmlBody;
      } else if (certificate.placement === 'after' || certificate.placement === 'after-attachment') {
        htmlBody = htmlBody + certificateBlock;
      }

      const messageAttachments = commonAttachments.slice();
      if (certificateUsesAttachment_(certificate.placement)) {
        messageAttachments.push(buildCertificatePdf(user, certificate));
      }

      const messageAttachmentBytes = messageAttachments.reduce(function(total, blob) {
        return total + blob.getBytes().length;
      }, 0);
      if (messageAttachmentBytes > 20 * 1024 * 1024) {
        throw new Error('This email has more than 20 MB of attachments.');
      }

      const plainBody = htmlBody
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim() || subject;

      MailApp.sendEmail({
        to: recipientEmail,
        subject: subject,
        htmlBody: htmlBody,
        body: plainBody,
        attachments: messageAttachments,
        name: senderSettings.name,
        replyTo: senderSettings.replyTo,
        noReply: senderSettings.noReply
      });
      sentCount++;
      logBulkEmail_(adminEmail, recipientEmail, user, payload.targetType || 'parent', subject, 'Sent', certificate.placement === 'none' ? '' : 'Certificate: ' + certificate.placement);
      pauseBetweenBulkSends();
    } catch (err) {
      const errorText = err.message || String(err);
      failed.push((user.Name || recipientEmail) + ': ' + errorText);
      logBulkEmail_(adminEmail, recipientEmail, user, payload.targetType || 'parent', subject, 'Failed', errorText);
    }
  });

  if (failed.length) Logger.log('adminSendBulkEmail failures:\n' + failed.join('\n'));

  return {
    sent: sentCount,
    total: plan.recipients.length,
    failed: failed,
    missingEmails: plan.missingEmails,
    matchedUsers: plan.users.length,
    certificatePlacement: certificate.placement
  };
}

function buildCertificatePdf(scoutOrUser, certificateOptions) {
  const user = typeof scoutOrUser === 'object' && scoutOrUser !== null ? scoutOrUser : { Name: String(scoutOrUser || 'Scout') };
  const options = certificateOptions || normaliseCertificateOptions_({});
  const name = String(user.Name || user.ChildFullName || 'Scout');
  const doc = DocumentApp.create('JOTA-JOTI Certificate — ' + name + ' — temp');
  const body = doc.getBody();
  body.setPageWidth(842).setPageHeight(595);
  body.setMarginTop(36).setMarginBottom(36).setMarginLeft(42).setMarginRight(42);

  body.appendParagraph(fillEmailTemplate(options.title, user))
    .setHeading(DocumentApp.ParagraphHeading.TITLE)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(fillEmailTemplate(options.subtitle, user))
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(' ');
  body.appendParagraph('This certificate is presented to').setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  const nameLine = body.appendParagraph(name);
  nameLine.setHeading(DocumentApp.ParagraphHeading.HEADING1).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body.appendParagraph(fillEmailTemplate(options.message, user))
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(' ');
  body.appendParagraph(fillEmailTemplate(options.footer, user))
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph('Issued: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Etc/UTC', 'd MMMM yyyy'))
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  const pdfBlob = file.getAs(MimeType.PDF).setName('JOTA-JOTI Certificate - ' + name + '.pdf');
  file.setTrashed(true);
  return pdfBlob;
}

function sendCertificateEmail(user, pdfBlob) {
  const subject = 'JOTA-JOTI 2026 — Certificate of completion for ' + (user.Name || 'your scout');
  const body =
    'Hello ' + (user.ParentName || 'Parent/Guardian') + ',\n\n' +
    (user.Name || 'Your scout') + ' has completed JOTA-JOTI 2026 with ' + CONFIG.SCOUT_GROUP + '.\n\n' +
    'Their certificate of completion is attached.\n\n' +
    'Thank you for taking part.\n\n' + CONFIG.SCOUT_GROUP;

  MailApp.sendEmail({ to: user.ParentEmail, subject: subject, body: body, attachments: [pdfBlob] });
}

/* ============================================================
   EMAIL NOTIFICATIONS
   ============================================================ */

function sendParentWelcomeEmail(account) {
  const subject = "JOTA-JOTI – " + account.childFirstName + "'s account details";
  const websiteURL = CONFIG.WEBSITE_URL;
  const logoURL = 'https://media.ffycdn.net/eu/world-organization-of-the-scout-movement/oZCw81N2JF9orwf3ff2M.png?mod=v1/resize=2400';

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { margin: 0; padding: 0; background: #eef2f5; font-family: Arial, Helvetica, sans-serif; color: #263238; }
.email { width: 100%; padding: 35px 12px; box-sizing: border-box; }
.container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.10); }
.brand { background: linear-gradient(135deg, #073b5c, #126a91); padding: 32px 25px 28px; text-align: center; }
.brand:after { content: ""; display: block; width: 70px; height: 4px; background: #f5c542; border-radius: 5px; margin: 22px auto 0; }
.logo { display: block; width: 310px; max-width: 90%; height: auto; margin: 0 auto; }
.brand-title { color: #ffffff; font-size: 14px; letter-spacing: 1.5px; margin-top: 18px; font-weight: bold; text-transform: uppercase; }
.content { padding: 35px 42px; }
h2 { margin: 0 0 20px; font-size: 22px; color: #123b5d; }
h3 { margin-top: 28px; margin-bottom: 15px; font-size: 18px; color: #123b5d; }
p { font-size: 15px; line-height: 1.7; }
.warning { margin: 24px 0; padding: 18px 20px; background: #fff8e5; border: 1px solid #f1d58a; border-radius: 9px; font-size: 15px; line-height: 1.7; }
.warning strong:first-child { color: #795900; }
.login-box { margin: 20px 0 25px; padding: 18px 20px; background: #eef7ee; border: 1px solid #c7e3c7; border-radius: 9px; box-sizing: border-box; }
.login-row { padding: 10px 0 13px; border-bottom: 1px solid #d6dfd6; font-size: 15px; line-height: 1.5; }
.login-row:last-child { border-bottom: none; padding-bottom: 2px; }
.label { color: #263238; font-size: 13px; font-weight: bold; }
.value { font-family: monospace; font-size: 17px; }
.button { display: inline-block; padding: 13px 25px; background: #126a91; color: #ffffff !important; text-decoration: none; border-radius: 7px; font-size: 15px; font-weight: bold; }
ol { margin-top: 10px; margin-bottom: 25px; padding-left: 25px; }
ol li { margin-bottom: 9px; padding-left: 3px; font-size: 15px; line-height: 1.55; }
.footer { background: #f0f3f5; padding: 24px; text-align: center; color: #6b757b; font-size: 12px; line-height: 1.7; }
.footer-line { width: 45px; height: 3px; background: #f5c542; margin: 0 auto 15px; border-radius: 5px; }
@media screen and (max-width: 600px) {
  .email { padding: 10px 5px; }
  .container { border-radius: 10px; }
  .content { padding: 28px 22px; }
  .logo { width: 260px; }
  h2 { font-size: 21px; }
}
</style>
</head>
<body>
<div class="email">
<div class="container">
<div class="brand">
<img class="logo" src="${logoURL}" alt="JOTA-JOTI">
<div class="brand-title">Boulder Scout Group</div>
</div>
<div class="content">
<h2>Hello ${escapeHtml(account.parentName)},</h2>
<p>Thank you for submitting an Expression of Interest for <strong>${escapeHtml(account.childFirstName)} ${escapeHtml(account.childLastName)}</strong>.</p>
<div class="warning">
<strong>Important:</strong> This is only an <strong>Expression of Interest</strong>. It is not official registration or confirmation of participation. Further paperwork, permissions and consent may still be required.
</div>
<h3>Your child's account</h3>
<div class="login-box">
<div class="login-row"><span class="label">Child:</span><br>${escapeHtml(account.childFirstName)} ${escapeHtml(account.childLastName)}</div>
<div class="login-row"><span class="label">Username:</span><br><span class="value">${escapeHtml(account.username)}</span></div>
<div class="login-row"><span class="label">PIN:</span><br><span class="value">${escapeHtml(account.pin)}</span></div>
<div class="login-row"><span class="label">Password:</span><br><span class="value">${escapeHtml(account.password)}</span></div>
<div class="login-row"><span class="label">Participant ID:</span><br>${escapeHtml(account.participantID)}</div>
</div>
<p style="text-align:center">
<a class="button" href="${websiteURL}" target="_blank">Open JOTA-JOTI Website</a>
</p>
<h3>What happens next?</h3>
<ol>
<li>Your Expression of Interest has been received.</li>
<li>An account has been created for your child.</li>
<li>Further information will be provided later.</li>
<li>Any required paperwork and permissions must be completed.</li>
<li>Participation is subject to the required approvals and requirements.</li>
</ol>
<p>Please keep the username, PIN and password somewhere safe.</p>
</div>
<div class="footer">
<div class="footer-line"></div>
<strong>Boulder Scout Group</strong><br>JOTA-JOTI 2026<br><br>Unofficial JOTA-JOTI account system
</div>
</div>
</div>
</body>
</html>`;

  const plainTextBody =
    'JOTA-JOTI - Boulder Scout Group\n\n' +
    'Hello ' + account.parentName + ',\n\n' +
    'Thank you for submitting an Expression of Interest for ' + account.childFirstName + ' ' + account.childLastName + '.\n\n' +
    'YOUR CHILD ACCOUNT\n\n' +
    'Username: ' + account.username + '\n' +
    'PIN: ' + account.pin + '\n' +
    'Password: ' + account.password + '\n' +
    'Participant ID: ' + account.participantID + '\n\n' +
    'This is only an Expression of Interest. Further paperwork, permissions and consent may still be required.\n\n' +
    'Website: ' + websiteURL;

  MailApp.sendEmail({ to: account.parentEmail, subject: subject, body: plainTextBody, htmlBody: htmlBody });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function testParentEmail() {
  const email = Session.getEffectiveUser().getEmail();
  if (!email) throw new Error('Could not determine your Google account email.');

  sendParentWelcomeEmail({
    parentName: 'Test Parent', parentEmail: email, childFirstName: 'Test', childLastName: 'Scout',
    ageYear: 'Year 10', participantID: 'JOTI-2026-000001', username: 'TestJOTA42',
    pin: '4827', password: 'Koala@42', allowedCategories: 'minecraft,games'
  });
}

/* ============================================================
   SYSTEM INITIALIZATION & TRIGGER SETUP
   ============================================================ */

function setupEOISystem() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  let usersSheet = spreadsheet.getSheetByName(CONFIG.USERS_SHEET);
  if (!usersSheet) usersSheet = spreadsheet.insertSheet(CONFIG.USERS_SHEET);

  if (usersSheet.getLastRow() === 0) {
    usersSheet.getRange(1, 1, 1, 18).setValues([[
      'ParticipantID', 'PIN', 'Name', 'Username', 'Email',
      'AllowedCategories', 'Password', 'ParentEmail', 'ParentName',
      'ScoutGroup', 'AgeGroup', 'AgeYear', 'Status', 'EOIReceived',
      'AccountCreated', 'PaperworkStatus', 'EmailStatus', 'Notes'
    ]]);
    usersSheet.getRange(1, 1, 1, 18).setFontWeight('bold');
  } else {
    ensureUsersHeaders(usersSheet, [
      'ParticipantID', 'PIN', 'Name', 'Username', 'Email',
      'AllowedCategories', 'Password', 'ParentEmail', 'ParentName',
      'ScoutGroup', 'AgeGroup', 'AgeYear', 'Status', 'EOIReceived',
      'AccountCreated', 'PaperworkStatus', 'EmailStatus', 'Notes'
    ]);
  }

  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(spreadsheet).onFormSubmit().create();

  ensureSheetExists(spreadsheet, CONFIG.CATEGORIES_SHEET);
  ensureSheetExists(spreadsheet, CONFIG.LINKS_SHEET);
  ensureSheetExists(spreadsheet, CONFIG.LOGOS_SHEET);
  ensureSheetExists(spreadsheet, CONFIG.BLOCKED_URLS_SHEET);
  ensureSheetExists(spreadsheet, CONFIG.BLOCKED_CATEGORIES_SHEET);
  ensureSheetExists(spreadsheet, CONFIG.SETTINGS_SHEET);
  const emailLogSheet = ensureSheetExists(spreadsheet, CONFIG.EMAIL_LOG_SHEET);
  ensureEmailLogHeaders(emailLogSheet);
  const emailGroupsSheet = ensureSheetExists(spreadsheet, CONFIG.EMAIL_GROUPS_SHEET);
  ensureEmailGroupsHeaders(emailGroupsSheet);
  const generatedAdminPassword = ensureAdminPassword_();

  createBackupTrigger();

  SpreadsheetApp.flush();
  Logger.log('EOI system setup completed successfully.');
  try { SpreadsheetApp.getUi().alert('Setup complete.\n\nAdmin password: ' + generatedAdminPassword + '\n\nKeep this password private. Use your GitHub Pages /admin/ page to sign in.'); } catch (uiError) {}
  return 'EOI system setup completed successfully. Admin password: ' + generatedAdminPassword;
}

function ensureSheetExists(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
  return sheet;
}

function ensureUsersHeaders(sheet, requiredHeaders) {
  const lastColumn = Math.max(1, sheet.getLastColumn());
  const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(v) {
    return String(v || '').trim();
  });
  const existing = {};
  current.forEach(function(h) {
    if (h) existing[normaliseLookupValue(h)] = true;
  });
  const missing = requiredHeaders.filter(function(h) {
    return !existing[normaliseLookupValue(h)];
  });
  if (missing.length) {
    const startColumn = sheet.getLastColumn() + 1;
    sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
  }
}

function checkEOITrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const result = triggers.map(function(trigger) {
    return { function: trigger.getHandlerFunction(), type: String(trigger.getEventType()), source: String(trigger.getTriggerSource()) };
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/* ============================================================
   SYSTEM BACKUP
   ============================================================ */

function backupSpreadsheetToDrive() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const file = DriveApp.getFileById(spreadsheet.getId());
  const folder = getOrCreateBackupFolder();

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Etc/UTC', 'yyyy-MM-dd_HH-mm');
  const backupName = spreadsheet.getName() + ' — backup ' + timestamp;

  file.makeCopy(backupName, folder);
  pruneOldBackups(folder);

  Logger.log('Backup created: ' + backupName);
  return backupName;
}

function scheduledBackup() {
  try {
    backupSpreadsheetToDrive();
  } catch (error) {
    notifyAdminOfError('scheduledBackup', error);
  }
}

function getOrCreateBackupFolder() {
  const folders = DriveApp.getFoldersByName(CONFIG.BACKUP_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(CONFIG.BACKUP_FOLDER_NAME);
}

function pruneOldBackups(folder) {
  const files = folder.getFiles();
  const list = [];
  while (files.hasNext()) {
    const f = files.next();
    list.push({ file: f, created: f.getDateCreated().getTime() });
  }
  list.sort(function(a, b) { return b.created - a.created; });
  for (let i = CONFIG.BACKUPS_TO_KEEP; i < list.length; i++) list[i].file.setTrashed(true);
}

function createBackupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    const fn = trigger.getHandlerFunction();
    if (fn === 'backupSpreadsheetToDrive' || fn === 'scheduledBackup') ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger('scheduledBackup').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Daily backup trigger created (runs around 3am).');
  return 'Daily backup trigger created (runs around 3am).';
}