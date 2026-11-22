// Kamerabild als Hintergrund. Braucht HTTPS und die Erlaubnis.
// richtung: 'environment' = Rückkamera, 'user' = Frontkamera (wird gespiegelt).
let strom = null;

async function oeffne(video) {
    try { return await navigator.mediaDevices.getUserMedia(video); }
    catch (e) { console.warn('Kamera:', e.name, e.message); return null; }
}

export async function kameraAn(richtung = 'environment') {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    kameraAus();
    // Erst die gewünschte Seite, sonst irgendeine Kamera (z. B. Tablet mit nur einer Kamera).
    strom = await oeffne({ video: { facingMode: { ideal: richtung } }, audio: false })
        || await oeffne({ video: true, audio: false });
    if (!strom) return false;
    const v = document.getElementById('kamera');
    v.srcObject = strom;
    const einstellung = strom.getVideoTracks()[0]?.getSettings?.() || {};
    v.classList.toggle('gespiegelt', (einstellung.facingMode || richtung) === 'user');
    try { await v.play(); } catch (e) { console.warn('Kamera-Video:', e); }
    return true;
}

export function kameraAus() {
    strom?.getTracks().forEach(t => t.stop());
    strom = null;
    const v = document.getElementById('kamera');
    if (v) v.srcObject = null;
}
