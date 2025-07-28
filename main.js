// main.js — WhatsApp Electron wrapper (Linux-safe attention handling)

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  shell,
  globalShortcut,
  nativeTheme,
} = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

let tray = null;
let mainWindow = null;
let isQuiting = false;
let alwaysOnTop = false;
let darkCSSKey = null;

// ------------------------
// Single instance
// ------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ------------------------
// Icon detection (PNG first, then SVG)
// ------------------------
const ICON_NAMES = [
  'whatsapp',
  'whatsappfordesktop',
  'whatsapp-desktop',
  'whatsapp-nativefier',
  'whatsapp-web',
  'whatsapp-for-linux',
  'whatsapp-msg',
  'whatsapp-tray',
  'whatsapp-logo',
];
const ICON_SIZES = [
  '16x16',
  '22x22',
  '24x24',
  '32x32',
  '48x48',
  '64x64',
  '128x128',
  '256x256',
  '512x512',
  'scalable',
];
const ICON_SUBFOLDERS = ['apps', 'panel', 'status', 'tray'];

function getAllIconDirs() {
  const dirs = new Set([
    path.join(os.homedir(), '.icons'),
    path.join(os.homedir(), '.local/share/icons'),
    '/usr/share/icons',
    '/usr/share/pixmaps',
    '/usr/local/share/icons',
  ]);

  for (const dir of Array.from(dirs)) {
    if (!fs.existsSync(dir)) {
      dirs.delete(dir);
      continue;
    }
    try {
      for (const entry of fs.readdirSync(dir)) {
        const p = path.join(dir, entry);
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) dirs.add(p);
      }
    } catch {}
  }
  return Array.from(dirs);
}

function findUsableIcon() {
  const patterns = [
    { ext: 'png', size: '32x32', sub: 'apps' },
    { ext: 'png', size: '32x32', sub: 'tray' },
    { ext: 'png', size: '48x48', sub: 'apps' },
    { ext: 'png', size: '24x24', sub: 'panel' },
    { ext: 'svg', size: 'scalable', sub: 'apps' },
  ];
  for (const { ext, size, sub } of patterns) {
    for (const dir of getAllIconDirs()) {
      for (const name of ICON_NAMES) {
        const candidate = path.join(dir, size, sub, `${name}.${ext}`);
        if (fs.existsSync(candidate)) {
          const img = nativeImage.createFromPath(candidate);
          if (!img.isEmpty()) return candidate;
        }
      }
    }
  }
  return path.join(__dirname, 'icon.png'); // fallback
}

// ------------------------
// Demand attention helper
// - macOS: app.requestUserAttention
// - Linux/Windows: flashFrame(true)
// ------------------------
function demandAttention(win) {
  try {
    if (!win) return;
    if (process.platform === 'darwin') {
      if (typeof app.requestUserAttention === 'function') app.requestUserAttention(1);
    } else {
      if (typeof win.flashFrame === 'function') win.flashFrame(true);
    }
  } catch {}
}

// stop flashing when focused
app.on('browser-window-focus', (_e, win) => {
  try {
    if (win && typeof win.flashFrame === 'function') win.flashFrame(false);
  } catch {}
});

// ------------------------
// Tray
// ------------------------
function setupTray() {
  const iconPath = findUsableIcon();
  let image = nativeImage.createFromPath(iconPath);
  const { width, height } = image.getSize();
  if (width > 24 || height > 24) image = image.resize({ width: 24, height: 24 });

  try {
    tray = new Tray(image);
  } catch {
    tray = new Tray(nativeImage.createEmpty());
  }
  tray.setToolTip('WhatsApp');

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show', click: () => mainWindow && (mainWindow.show(), mainWindow.focus()) },
      { label: 'Reload', click: () => mainWindow && mainWindow.reload() },
      { label: 'Dark Mode', click: () => setDarkMode(true) },
      {
        label: 'Always On Top',
        type: 'checkbox',
        checked: alwaysOnTop,
        click: (mi) => {
          alwaysOnTop = mi.checked;
          if (mainWindow) mainWindow.setAlwaysOnTop(alwaysOnTop);
        },
      },
      { type: 'separator' },
      { label: 'Quit', click: () => ((isQuiting = true), app.quit()) },
    ]),
  );

  tray.on('click', () => {
    if (!mainWindow) createWindow();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ------------------------
// Window
// ------------------------
function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  const iconPath = findUsableIcon();
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    icon: iconPath,
    show: true,
    alwaysOnTop,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
      partition: 'persist:main',
    },
  });

  // WhatsApp UA compatibility
  mainWindow.webContents.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.78 Safari/537.36',
  );
  mainWindow.loadURL('https://web.whatsapp.com/');

  // Notifications: allow
  mainWindow.webContents.session.setPermissionRequestHandler((_, permission, cb) => {
    cb(permission === 'notifications');
  });

  // Context menu (spellcheck + suggestions)
  mainWindow.webContents.on('context-menu', (_e, params) => {
    const langs = mainWindow.webContents.session.getSpellCheckerLanguages();
    const langMenu = [
      {
        label: 'English (UK)',
        type: 'radio',
        checked: langs.includes('en-GB'),
        click: () => mainWindow.webContents.session.setSpellCheckerLanguages(['en-GB']),
      },
      {
        label: 'English (US)',
        type: 'radio',
        checked: langs.includes('en-US'),
        click: () => mainWindow.webContents.session.setSpellCheckerLanguages(['en-US']),
      },
      {
        label: 'French',
        type: 'radio',
        checked: langs.includes('fr-FR'),
        click: () => mainWindow.webContents.session.setSpellCheckerLanguages(['fr-FR']),
      },
    ];

    const suggestions = params.misspelledWord
      ? params.dictionarySuggestions.map((s) => ({
          label: s,
          click: () => mainWindow.webContents.replaceMisspelling(s),
        }))
      : [];

    Menu.buildFromTemplate([
      { label: 'Spellcheck Language', submenu: langMenu },
      ...suggestions,
      { type: 'separator' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ]).popup();
  });

  // External links -> default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Minimize to tray on close
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Unread badge + attention
  mainWindow.webContents.on('page-title-updated', (_event, title) => {
    const m = title && title.match(/\((\d+)\)/); // WhatsApp: "WhatsApp (3)"
    if (m) {
      app.setBadgeCount(parseInt(m[1], 10));
      if (!mainWindow.isFocused() || mainWindow.isMinimized()) {
        demandAttention(mainWindow); // uses flashFrame(true) on Linux/Windows
      }
    } else {
      app.setBadgeCount(0);
      if (typeof mainWindow.flashFrame === 'function') mainWindow.flashFrame(false);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// ------------------------
// Dark mode toggle
// ------------------------
function setDarkMode(enable) {
  if (!mainWindow) return;
  if (darkCSSKey) {
    mainWindow.webContents.removeInsertedCSS(darkCSSKey);
    darkCSSKey = null;
  }
  if (enable) {
    mainWindow.webContents
      .insertCSS(`
        html, body { filter: invert(1) hue-rotate(180deg) !important; background: #222 !important; color: #fff !important; }
        img, video { filter: invert(1) hue-rotate(180deg) !important; }
      `)
      .then((key) => {
        darkCSSKey = key;
      });
  }
}

// Follow system theme
nativeTheme.on('updated', () => {
  if (!mainWindow) return;
  if (nativeTheme.shouldUseDarkColors) setDarkMode(true);
  else setDarkMode(false);
});

// ------------------------
// App menu
// ------------------------
function createAppMenu() {
  const template = [
    {
      label: 'View',
      submenu: [
        { label: 'Dark Mode', click: () => setDarkMode(true) },
        { label: 'Light Mode', click: () => setDarkMode(false) },
        { type: 'separator' },
        {
          label: 'Always On Top',
          type: 'checkbox',
          checked: alwaysOnTop,
          click: (mi) => {
            alwaysOnTop = mi.checked;
            if (mainWindow) mainWindow.setAlwaysOnTop(alwaysOnTop);
          },
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
      ],
    },
    { role: 'quit' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ------------------------
// Global shortcuts
// ------------------------
function setupShortcuts() {
  globalShortcut.register('Control+Alt+W', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// ------------------------
// Lifecycle
// ------------------------
app.whenReady().then(() => {
  createWindow();
  createAppMenu();
  setupTray();
  setupShortcuts();

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });
});

app.on('before-quit', () => {
  isQuiting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
