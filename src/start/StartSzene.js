// Startbild in 3D: Figur von hinten, davor das Portal. Antippen = Figur dreht sich um.
// "Los!" = Figur läuft durchs Portal.
import * as THREE from 'three';
import Figur3D from './Figur3D.js';
import Portal from './Portal.js';
import RigFigur from './RigFigur.js';
import { FIGUREN, HAARFARBEN, SCHUELER } from '../daten.js';

const PORTAL_Z = -6;
const LAUF_TEMPO = 2.6;      // Meter pro Sekunde beim Losgehen
const DREH_TEMPO = 8;        // wie schnell die Figur sich umdreht
const START_KAMERA = [0, 1.9, 5.2];
const AR_MASSSTAB = 0.35;    // in AR: Figur ca. 50 cm, Tor ca. 2 m entfernt
const MIT_RIG = new URLSearchParams(location.search).has('rig');   // gemalte Puppe statt 3D-Figur

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
        // Alles, was in AR auf den echten Boden gestellt wird
        this.welt = new THREE.Group();
        this.scene.add(this.welt);
        this.welt.add(boden);

        this.portal = new Portal(1.5);
        this.portal.obj.position.set(0, 1.6, PORTAL_Z);
        this.welt.add(this.portal.obj);

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

    async zeige(index, haarIndex) {
        if (!this.figuren[index]) this.figuren[index] = await Figur3D.laden('figuren/' + FIGUREN[index].datei);
        if (this.figur) this.welt.remove(this.figur.obj);
        this.figur = this.figuren[index];
        this.figur.obj.position.set(0, 0, 0);
        this.figur.obj.rotation.y = Math.PI;
        this.figur.obj.visible = true;
        this.figur.setHaar(HAARFARBEN[haarIndex]);
        this.welt.add(this.figur.obj);
        if (MIT_RIG) (this.rig ??= new RigFigur()).nutze(this.figur, HAARFARBEN[haarIndex], SCHUELER[index % SCHUELER.length]);
    }

    setHaar(haarIndex) {
        this.figur?.setHaar(HAARFARBEN[haarIndex]);
        this.rig?.setHaar(HAARFARBEN[haarIndex]);
    }

    /** Figur dreht sich zu dir um, jubelt und dreht sich wieder zum Portal. */
    winken() {
        if (!this.figur || this.laeuft) return;
        this.drehZiel = 0;
        this.figur.spiele('Cheer', { einmal: true });
        clearTimeout(this.zurueck);
        this.zurueck = setTimeout(() => { this.drehZiel = Math.PI; }, 1600);
    }

    los(fertig) {
        if (!this.figur || this.laeuft) return;
        clearTimeout(this.zurueck);
        this.drehZiel = Math.PI;
        this.laeuft = true;
        this.beiPortal = fertig;
        this.figur.spiele('Walking_A', { tempo: 1.3 });
    }

    zuruecksetzen() {
        this.laeuft = false;
        if (!this.figur) return;
        this.figur.obj.position.set(0, 0, 0);
        this.figur.obj.visible = true;
        this.figur.spiele('Idle');
        this.kamera.position.set(...START_KAMERA);
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
        this.rig?.update(dt);
        this.renderer.render(this.scene, this.kamera);
    }
}
