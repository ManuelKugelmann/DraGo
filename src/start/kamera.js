// Kamerabild als Hintergrund (Rückkamera). Braucht HTTPS und die Erlaubnis.
let strom = null;

export async function kameraAn() {
    try {
        strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        const v = document.getElementById('kamera');
        v.srcObject = strom;
        await v.play();
        return true;
    } catch (e) {
        console.warn('Kamera:', e);
        return false;
    }
}

export function kameraAus() {
    strom?.getTracks().forEach(t => t.stop());
    strom = null;
    const v = document.getElementById('kamera');
    if (v) v.srcObject = null;
}
