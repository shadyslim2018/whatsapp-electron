const { app, BrowserWindow, Menu, Tray, nativeImage, shell, globalShortcut, nativeTheme } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
// const AutoLaunch = require('electron-auto-launch'); // Uncomment to enable auto-launch

let tray = null;
let mainWindow = null;
let isQuiting = false;
let alwaysOnTop = false;
let darkCSSKey = null;

// ======= ICON DETECTION =======
const iconNames = [
  'whatsapp', 'whatsappfordesktop', 'whatsapp-desktop', 
  'whatsapp-nativefier', 'whatsapp-web', 'whatsapp-for-linux',
  'whatsapp-msg', 'whatsapp-tray', 'whatsapp-logo'
];
const exts = ['png', 'svg'];
const sizes = ['16x16', '22x22', '24x24', '32x32', '48x48', 'scalable'];
const subfolders = ['apps', 'panel', 'status', 'tray'];

function getAllIconDirectories() {
  const dirs = new Set();
  const baseDirs = [
    path.join(os.homedir(), '.icons'),
    path.join(os.homedir(), '.local/share/icons'),
    '/usr/share/icons',
    '/usr/share/pixmaps',
    '/usr/local/share/icons'
  ];
  baseDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      dirs.add(dir);
      try {
        fs.readdirSync(dir).forEach(theme => {
          const themePath = path.join(dir, theme);
          if (fs.statSync(themePath).isDirectory()) {
            dirs.add(themePath);
          }
        });
      } catch (e) {}
    }
  });
  return Array.from(dirs);
}

function findUsableIcon() {
  const searchPatterns = [
    { ext: 'png', size: '32x32', sub: 'apps' },
    { ext: 'png', size: '32x32', sub: 'tray' },
    { ext: 'png', size: '48x48', sub: 'apps' },
    { ext: 'svg', size: 'scalable', sub: 'apps' },
    { ext: 'png', size: '16x16', sub: 'panel' }
  ];
  for (const pattern of searchPatterns) {
    for (const themeDir of getAllIconDirectories()) {
      for (const name of iconNames) {
        const candidate = path.join(
          themeDir, 
          pattern.size, 
          pattern.sub, 
          `${name}.${pattern.ext}`
        );
        if (fs.existsSync(candidate)) {
          try {
            const img = nativeImage.createFromPath(candidate);
            if (!img.isEmpty()) {
              return candidate;
            }
          } catch (e) {}
        }
      }
    }
  }
  const fallback = path.join(__dirname, 'icon.png');
  return fallback;
}

// ======= TRAY MENU =======
function setupTray() {
  const iconPath = findUsableIcon();
  try {
    let image = nativeImage.createFromPath(iconPath);
    if (image.getSize().width > 24 || image.getSize().height > 24) {
      image = image.resize({ width: 24, height: 24 });
    }
    tray = new Tray(image);
    tray.setToolTip('WhatsApp');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); }} },
      { label: 'Reload', click: () => { if (mainWindow) mainWindow.reload(); } },
      { label: 'Dark Mode', click: () => setDarkMode(true) },
      { label: 'Always On Top', type: 'checkbox', checked: alwaysOnTop, 
        click: (menuItem) => { alwaysOnTop = menuItem.checked; if (mainWindow) mainWindow.setAlwaysOnTop(alwaysOnTop); } },
      { type: 'separator' },
      { label: 'Quit', click: () => { isQuiting = true; app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (!mainWindow) createWindow();
      else { mainWindow.show(); mainWindow.focus(); }
    });
  } catch (err) {
    tray = new Tray(nativeImage.createEmpty());
    tray.setToolTip('WhatsApp');
  }
}

// ======= WINDOW MANAGEMENT =======
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
    alwaysOnTop: alwaysOnTop,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
      partition: 'persist:main'
    }
  });

  mainWindow.webContents.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.78 Safari/537.36'
  );
  mainWindow.loadURL('https://web.whatsapp.com/');

  // Handle notifications
  mainWindow.webContents.session.setPermissionRequestHandler((_, permission, callback) => {
    callback(permission === 'notifications');
  });

  // Spellcheck context menu
  mainWindow.webContents.on('context-menu', (_, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Spellcheck Language',
        submenu: [
          { label: 'English (UK)', type: 'radio', checked: true, click: () => mainWindow.webContents.session.setSpellCheckerLanguages(['en-GB']) },
          { label: 'English (US)', type: 'radio', click: () => mainWindow.webContents.session.setSpellCheckerLanguages(['en-US']) },
          { label: 'French', type: 'radio', click: () => mainWindow.webContents.session.setSpellCheckerLanguages(['fr-FR']) }
        ]
      },
      ...(params.misspelledWord ? 
        params.dictionarySuggestions.map(s => ({
          label: s,
          click: () => mainWindow.webContents.replaceMisspelling(s)
        })) : []),
      { type: 'separator' },
      { role: 'copy' },
      { role: 'paste' }
    ]);
    menu.popup();
  });

  // External links open in system browser
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

  // Minimize to tray instead of close
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Unread badge count (taskbar/dock)
  mainWindow.webContents.on('page-title-updated', (event, title) => {
    const matches = title.match(/\((\d+)\)/);
    if (matches) {
      app.setBadgeCount(parseInt(matches[1], 10));
      // Flash/demand attention for unread if not focused
      if (!mainWindow.isFocused() || mainWindow.isMinimized()) {
        mainWindow.requestUserAttention(2);
      }
    } else {
      app.setBadgeCount(0);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// ======= DARK MODE TOGGLE =======
function setDarkMode(enable) {
  if (mainWindow) {
    // Remove existing dark mode CSS if present
    if (darkCSSKey) {
      mainWindow.webContents.removeInsertedCSS(darkCSSKey);
      darkCSSKey = null;
    }
    if (enable) {
      mainWindow.webContents.insertCSS(`
        html, body { filter: invert(1) hue-rotate(180deg) !important; background: #222 !important; color: #fff !important; }
        img, video { filter: invert(1) hue-rotate(180deg) !important; }
      `).then(key => { darkCSSKey = key; });
    }
  }
}

// ======= APPLICATION MENU =======
function createAppMenu() {
  const template = [
    {
      label: 'View',
      submenu: [
        { 
          label: 'Dark Mode', 
          click: () => setDarkMode(true)
        },
        { 
          label: 'Light Mode', 
          click: () => setDarkMode(false)
        },
        { type: 'separator' },
        { label: 'Always On Top', type: 'checkbox', checked: alwaysOnTop,
          click: menuItem => { alwaysOnTop = menuItem.checked; if (mainWindow) mainWindow.setAlwaysOnTop(alwaysOnTop); }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' }
      ]
    },
    { role: 'quit' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ======= GLOBAL SHORTCUT =======
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

// ======= AUTO-START (Plasma recommends GUI) =======
// // Enable this block if you want automatic startup (Plasma's Autostart GUI is preferred).
// const autoLauncher = new AutoLaunch({ name: 'WhatsApp' });
// autoLauncher.isEnabled().then((isEnabled) => { if (!isEnabled) autoLauncher.enable(); });

// ======= SYSTEM THEME REACTION =======
nativeTheme.on('updated', () => {
  if (mainWindow) {
    if (nativeTheme.shouldUseDarkColors) setDarkMode(true);
    else setDarkMode(false);
  }
});

// ======= APP LIFECYCLE =======
app.whenReady().then(() => {
  createWindow();
  createAppMenu();
  setupTray();
  setupShortcuts();

  app.on('activate', () => {
    if (!mainWindow) {
      createWindow();
    }
  });
});

app.on('before-quit', () => isQuiting = true);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
