# Maintainer: AK <you@example.com>
pkgname=whatsapp-electron
pkgver=1.0.1
pkgrel=1
pkgdesc="Unofficial WhatsApp Web desktop wrapper (Electron) – runs with system Electron"
arch=('x86_64')
url="https://github.com/shadyslim2018/whatsapp-electron"
license=('MIT')
depends=('electron' 'gtk3' 'nss' 'libxss' 'libnotify' 'xdg-utils')
makedepends=()
# Fetch the source from the tagged release tarball
source=("https://github.com/shadyslim2018/whatsapp-electron/archive/refs/tags/v${pkgver}.tar.gz")
sha256sums=('382eab6a76a0840a4a78a9d3b5d9adf9b43fe17928eb61e8ba2e94996eab3dc7')

# The extracted folder will be: ${pkgname}-${pkgver}
prepare() {
  cd "${srcdir}/${pkgname}-${pkgver}"
  # sanity check (optional)
  [[ -f main.js && -f package.json && -f icon.png && -f desktop/whatsapp-electron.desktop ]] || {
    echo "Required files not found in source tree"; exit 1;
  }
}

build() {
  : # nothing to build (uses system Electron)
}

package() {
  cd "${srcdir}/${pkgname}-${pkgver}"

  # App payload
  install -d "${pkgdir}/usr/lib/${pkgname}"
  install -m644 main.js        "${pkgdir}/usr/lib/${pkgname}/main.js"
  install -m644 package.json   "${pkgdir}/usr/lib/${pkgname}/package.json"
  install -m644 icon.png       "${pkgdir}/usr/lib/${pkgname}/icon.png"

  # Launcher
  install -d "${pkgdir}/usr/bin"
  printf '#!/bin/sh\nexec /usr/bin/electron /usr/lib/%s "$@"\n' "${pkgname}" \
    > "${pkgdir}/usr/bin/${pkgname}"
  chmod 755 "${pkgdir}/usr/bin/${pkgname}"

  # Desktop entry + menu icon
  install -Dm644 desktop/whatsapp-electron.desktop \
    "${pkgdir}/usr/share/applications/whatsapp-electron.desktop"
  install -Dm644 icon.png \
    "${pkgdir}/usr/share/icons/hicolor/256x256/apps/whatsapp-electron.png"
}
