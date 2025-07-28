# WhatsApp Electron (Unofficial)

A lightweight desktop wrapper for **WhatsApp Web** on Linux (Manjaro/Arch‑friendly), featuring:

- System tray + menu (Show, Reload, Dark Mode, Always‑on‑Top, Quit)
- Minimize to tray instead of quitting
- Spellcheck with suggestions + language switcher
- Opens links in your **default browser**
- Unread badge on taskbar + request attention when new messages arrive
- Global shortcut **Ctrl+Alt+W** to bring the window forward
- Optional Dark Mode (CSS overlay)
- KDE/Plasma‑friendly icon detection (uses theme icons, falls back to bundled icon)

> **Unofficial.** Not affiliated with or endorsed by WhatsApp/Meta.

---

## 📥 Download

Grab the latest release from the **Releases** page of this repository:

- `whatsapp-electron-<version>-x86_64.pkg.tar.zst` (recommended for Manjaro/Arch)

Install it with pacman:

```bash
sudo pacman -U whatsapp-electron-<version>-x86_64.pkg.tar.zst
```

Launch from your app menu or run:
```bash
whatsapp-electron
```

> This package uses the **system Electron** runtime (`/usr/bin/electron`). No AppImage or FUSE required.

---

## 🧪 Build & Install from Source (Manjaro/Arch)

```bash
sudo pacman -S --needed base-devel git electron
git clone https://github.com/<yourname>/whatsapp-electron.git
cd whatsapp-electron/packaging/arch
makepkg -si
```

After install, launch with:
```bash
whatsapp-electron
```

---

## ▶️ Run Without Installing (quick test)

```bash
sudo pacman -S electron
git clone https://github.com/<yourname>/whatsapp-electron.git
cd whatsapp-electron
/usr/bin/electron .
```

---

## ✨ Features

- **Tray menu:** Show, Reload, Dark Mode, Always‑on‑Top, Quit
- **Minimize to tray:** Closing hides to tray; quit via tray menu
- **Spellcheck:** Right‑click misspelled words for suggestions; switch language in context menu
- **External links:** Always open in your system default browser
- **Dark mode:** Toggle via menu/tray (CSS inversion overlay)
- **Unread badge:** Shows count on taskbar; window requests attention when unfocused
- **KDE/Plasma icons:** Tries theme icons (PNG/SVG) with fallback to bundled `icon.png`

---

## 🔧 Options & Tips

- **Global shortcut:** `Ctrl+Alt+W` — focus/show the window
- **Always on top:** *View → Always On Top* (or tray menu)
- **Dark mode:** *View → Dark Mode* (or tray menu)
- **Start hidden (optional):** add `--hidden` to the Exec line in the desktop file if preferred

---

## 🧩 Troubleshooting

**No window appears / won’t launch**
```bash
whatsapp-electron   # run from terminal to see logs
pacman -Qi electron # ensure system Electron is installed
```

**Links open inside the app**
- Update to the latest release (external link handling fixed).
- Restart after updating.

**Tray icon missing/wrong**
- Ensure your icon theme includes WhatsApp icons; the app auto-detects theme icons and falls back to `icon.png`.

**Notifications**
- First launch may prompt for permission.
- KDE: *System Settings → Notifications → Applications → WhatsApp*.

**Wayland**
- If attention/focus behavior is odd, try an X11 session as a sanity check.

---

## 📦 Packaging Layout (installed paths)

```
/usr/lib/whatsapp-electron/     # app files (main.js, package.json, icon.png)
/usr/bin/whatsapp-electron      # launcher (runs system electron)
/usr/share/applications/whatsapp-electron.desktop
/usr/share/icons/hicolor/256x256/apps/whatsapp-electron.png
```

---

## 🔐 Privacy

This is a wrapper around **web.whatsapp.com**. Messages are handled by WhatsApp’s servers.  
Local cache/profile data is stored in Electron’s `userData` directory under your home.

---

## ⚖️ License & Trademark

- Code: **MIT License** (see `LICENSE`)
- “WhatsApp” and logos are trademarks of their respective owner.  
  This project is **unofficial** and provided for convenience.

---

## 🙌 Credits

- Built with **Electron** and tested on **KDE/Plasma** (Manjaro).
- Thanks to contributors and the community for ideas and testing.
