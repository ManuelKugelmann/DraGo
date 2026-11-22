// Echtes AR über WebXR (Android Chrome mit ARCore). iPhone/Safari: nicht verfügbar.
export async function arMoeglich() {
    try { return !!navigator.xr && await navigator.xr.isSessionSupported('immersive-ar'); }
    catch { return false; }
}

/** Startet eine AR-Sitzung; die Knöpfe (overlay) bleiben über dem Kamerabild sichtbar. */
export function arSitzung(overlay) {
    return navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: overlay }
    });
}
