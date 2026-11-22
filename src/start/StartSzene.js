// Startbild in 3D: Figur von hinten, davor das Portal. Antippen = Figur dreht sich um.
// "Los!" = Figur läuft durchs Portal.
import * as THREE from 'three';
import Figur3D from './Figur3D.js';
import Portal from './Portal.js';
import Diorama from '../hoehle/Diorama.js';
import { FIGUREN, HAARFARBEN } from '../daten.js';

const PORTAL_Z = -6;
const LAUF_TEMPO = 2.6;      // Meter pro Sekunde beim Losgehen
const DREH_TEMPO = 8;        // wie schnell die Figur sich umdreht
const START_KAMERA = [0, 1.9, 5.2];
const AR_MASSSTAB = 0.35;    // in AR: Figur ca. 50 cm, Tor ca. 2 m entfernt

export default class StartSzene {
    constructor(leinwand) {
        this.renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
        this.renderer.shadowMap.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.kamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.kamera.position.set(...START_KAMERA);
        this.blick = new THREE.Vector3(0, 1.2, PORTAL_Z * 0.5);

        this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b4a8a, 1.6));
        const sonne = new THREE.DirectionalLight(0xffffff, 1.8);
        sonne.position.set(3, 6, 4);
        sonne.castShadow = true;
        sonne.shadow.mapSize.set(1024, 1024);
        this.scene.add(sonne);

        // Boden nur als Schatten (passt auf Kamerabild und Hintergrund)
        const boden = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.3 }));
        boden.rotation.x = -Math.PI / 2;
        boden.receiveShadow = true;
        this.boden = boden;
        // Alles, was in AR auf den echten Boden gestellt wird
        this.welt = new THREE.Group();
        this.scene.add(this.welt);
        this.welt.add(boden);

        this.portal = new Portal(1.5);
        this.portal.obj.position.set(0, 1.6, PORTAL_Z);
        this.welt.add(this.portal.obj);

        // Höhle hinter dem Tor (2.5D-Diorama), erst nach dem Durchgehen sichtbar
        this.hoehle = new Diorama();
        this.welt.add(this.hoehle.obj);
        this.strahl = new THREE.Raycaster();

        // AR: Ring auf dem erkannten Boden, dort wird das Tor hingestellt
        this.marke = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.16, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0xffd27a }));
        this.marke.matrixAutoUpdate = false;
        this.marke.visible = false;
        this.scene.add(this.marke);
        this.hitQuelle = null;
        this.platziert = true;

        this.figuren = [];          // geladene Figuren, Index = FIGUREN-Index
        this.figur = null;
        this.drehZiel = Math.PI;    // Math.PI = von hinten (schaut zum Portal)
        this.laeuft = false;
        this.uhr = new THREE.Timer();
        this.beiPortal = null;      // Rückruf, wenn die Figur im Portal ist

        addEventListener('resize', () => this.groesse());
        this.groesse();
        this.renderer.setAnimationLoop((t, frame) => this.schritt(t, frame));
    }

    groesse() {
        const w = innerWidth, h = innerHeight;
        this.renderer.setSize(w, h, false);
        this.kamera.aspect = w / h;
        // Hochformat: weiter weg, damit Figur und Portal passen
        this.kamera.fov = w < h ? 62 : 45;
        this.kamera.updateProjectionMatrix();
    }

    zeige(index, haarIndex) {
        this.ladend = this.zeigeJetzt(index, haarIndex);
        return this.ladend;
    }

    async zeigeJetzt(index, haarIndex) {
        if (!this.figuren[index]) this.figuren[index] = await Figur3D.laden('figuren/' + FIGUREN[index].datei);
        if (this.figur) this.welt.remove(this.figur.obj);
        this.figur = this.figuren[index];
        this.figur.obj.position.set(0, 0, 0);
        this.figur.obj.rotation.y = Math.PI;
        this.figur.obj.visible = true;
        this.figur.setHaar(HAARFARBEN[haarIndex]);
        this.welt.add(this.figur.obj);
    }

    setHaar(haarIndex) { this.figur?.setHaar(HAARFARBEN[haarIndex]); }

    /** Figur dreht sich zu dir um, jubelt und dreht sich wieder zum Portal. */
    winken() {
        if (!this.figur || this.laeuft) return;
        this.drehZiel = 0;
        this.figur.spiele('Cheer', { einmal: true });
        clearTimeout(this.zurueck);
        this.zurueck = setTimeout(() => { this.drehZiel = Math.PI; }, 1600);
    }

    los(fertig) {
        if (!this.figur) { this.ladend?.then(() => this.los(fertig)); return; }   // Figur lädt noch
        if (this.laeuft) return;
        clearTimeout(this.zurueck);
        this.drehZiel = Math.PI;
        this.laeuft = true;
        this.beiPortal = fertig;
        this.figur.spiele('Walking_A', { tempo: 1.3 });
    }

    /** Nach dem Tor: Höhle zeigen, Figur steht vorne links, Kamera schaut in die Höhle. */
    betreteHoehle() {
        this.inHoehle = true;
        this.portal.obj.visible = false;
        this.hoehle.zuruecksetzen();
        this.hoehle.obj.visible = true;
        this.laeuft = false;
        if (this.figur) {
            this.figur.obj.visible = true;
            this.figur.obj.position.set(-0.6, 0, 1.4);
            this.drehZiel = Math.PI;
            this.figur.spiele('Idle');
        }
        if (!this.renderer.xr.isPresenting) { this.kamera.position.set(0, 2.2, 6.5); this.blick.set(0, 1, -2.5); }
    }

    /** Antippen in der Höhle (Bildschirm-Koordinaten). true = Ei gefunden. */
    tippe(x, y) {
        if (!this.inHoehle) return false;
        const r = this.renderer.domElement.getBoundingClientRect();
        this.strahl.setFromCamera({ x: (x - r.left) / r.width * 2 - 1, y: -(y - r.top) / r.height * 2 + 1 }, this.kamera);
        const ja = this.hoehle.tippe(this.strahl);
        if (ja) this.figur?.spiele('Cheer', { einmal: true });
        return ja;
    }

    zuruecksetzen() {
        this.inHoehle = false;
        this.hoehle.obj.visible = false;
        this.portal.obj.visible = true;
        this.blick.set(0, 1.2, PORTAL_Z * 0.5);
        this.laeuft = false;
        if (!this.figur) return;
        this.figur.obj.position.set(0, 0, 0);
        this.figur.obj.visible = true;
        this.figur.spiele('Idle');
        this.kamera.position.set(...START_KAMERA);
    }

    /** Bild der eigenen Figur (von schräg vorne, durchsichtiger Hintergrund), z. B. fürs Ausbrüten. */
    async figurBild(breite = 300, hoehe = 480) {
        if (!this.figur) return null;
        const f = this.figur.obj, alt = { dreh: f.rotation.y, pos: f.position.clone(), sicht: f.visible };
        const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        r.setSize(breite, hoehe);
        r.outputColorSpace = THREE.SRGBColorSpace;
        const cam = new THREE.PerspectiveCamera(30, breite / hoehe, 0.1, 20);
        cam.position.set(0, 0.85, 3.6);
        cam.lookAt(0, 0.78, 0);
        f.rotation.y = 0.4; f.position.set(0, 0, 0); f.visible = true;
        const hoehleSichtbar = this.hoehle.obj.visible;
        this.portal.obj.visible = false; this.boden.visible = false; this.hoehle.obj.visible = false;
        r.render(this.scene, cam);
        this.hoehle.obj.visible = hoehleSichtbar;
        const url = r.domElement.toDataURL('image/png');
        f.rotation.y = alt.dreh; f.position.copy(alt.pos); f.visible = alt.sicht;
        this.portal.obj.visible = !this.inHoehle; this.boden.visible = true;
        r.dispose();
        const bild = new Image();
        bild.src = url;
        await bild.decode().catch(() => {});
        return bild;
    }

    // ---------- AR (WebXR, Android Chrome) ----------

    /** AR-Sitzung übernehmen: Boden suchen, beim Antippen das Tor dort hinstellen. */
    async arStart(session, beiEnde) {
        const r = this.renderer;
        r.xr.enabled = true;
        r.xr.setReferenceSpaceType('local');
        await r.xr.setSession(session);
        const viewer = await session.requestReferenceSpace('viewer');
        this.hitQuelle = await session.requestHitTestSource({ space: viewer });
        this.platziert = false;
        this.welt.visible = false;
        session.addEventListener('select', () => (this.platziert ? this.winken() : this.arPlatziere()));
        session.addEventListener('end', () => {
            r.xr.enabled = false;
            this.hitQuelle = null;
            this.platziert = true;
            this.marke.visible = false;
            this.welt.position.set(0, 0, 0);
            this.welt.rotation.set(0, 0, 0);
            this.welt.scale.setScalar(1);
            this.welt.visible = true;
            this.zuruecksetzen();
            this.groesse();
            beiEnde?.();
        });
    }

    arPlatziere() {
        if (!this.marke.visible) return;
        const ziel = new THREE.Vector3().setFromMatrixPosition(this.marke.matrix);
        const auge = new THREE.Vector3().setFromMatrixPosition(this.renderer.xr.getCamera().matrixWorld);
        const dx = ziel.x - auge.x, dz = ziel.z - auge.z;
        this.welt.position.copy(ziel);
        this.welt.rotation.set(0, Math.atan2(-dx, -dz), 0);   // Tor zeigt vom Betrachter weg
        this.welt.scale.setScalar(AR_MASSSTAB);
        this.welt.visible = true;
        this.marke.visible = false;
        this.platziert = true;
        this.beiPlatziert?.();
    }

    arSuche(frame) {
        const hits = frame.getHitTestResults(this.hitQuelle);
        const pose = hits[0]?.getPose(this.renderer.xr.getReferenceSpace());
        this.marke.visible = !!pose;
        if (pose) this.marke.matrix.fromArray(pose.transform.matrix);
    }

    schritt(zeit, frame) {
        if (frame && this.hitQuelle && !this.platziert) this.arSuche(frame);
        const ar = this.renderer.xr.isPresenting;
        this.uhr.update(zeit);
        const dt = Math.min(this.uhr.getDelta(), 0.05);
        this.portal.update(dt);
        if (this.inHoehle) this.hoehle.update(dt, this.kamera);
        const f = this.figur;
        if (f) {
            f.update(dt);
            const r = f.obj.rotation;
            r.y += (this.drehZiel - r.y) * Math.min(1, dt * DREH_TEMPO);
            if (this.laeuft) {
                f.obj.position.z -= LAUF_TEMPO * dt;
                if (!ar) this.kamera.position.z = Math.max(PORTAL_Z + 3, this.kamera.position.z - LAUF_TEMPO * dt * 0.8);
                if (f.obj.position.z < PORTAL_Z + 0.2 && f.obj.visible) {
                    f.obj.visible = false;
                    this.portal.stoss();
                    this.beiPortal?.();
                    this.beiPortal = null;
                }
            }
        }
        if (!ar) this.kamera.lookAt(this.blick);
        this.renderer.render(this.scene, this.kamera);
    }
}
