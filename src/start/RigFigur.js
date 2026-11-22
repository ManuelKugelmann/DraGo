// Gemalte Puppe statt KayKit-Modell (nur mit ?rig in der Adresse).
// Das Modell bewegt sich unsichtbar weiter, seine Knochen steuern die Puppe,
// die als Bild-Tafel immer zur Kamera gedreht in der Szene steht.
import * as THREE from 'three';
import Pupil, { BREITE, HOEHE, BODEN } from '../rig/Pupil.js';
import { retarget, blickWinkel } from '../rig/retarget.js';

const PIXEL_PRO_METER = 150;   // Puppe (ca. 227 px hoch) ungefähr so groß wie die 1,5-m-Figuren
const KNOCHEN = ['hips', 'chest', 'head'];
for (const s of ['l', 'r']) for (const n of ['upperarm', 'lowerarm', 'wrist', 'upperleg', 'lowerleg', 'foot', 'toes']) KNOCHEN.push(n + '_' + s);

export default class RigFigur {
    constructor(welt) {
        this.pupil = new Pupil();
        this.leinwand = document.createElement('canvas');
        this.leinwand.width = BREITE * this.pupil.aufloesung;
        this.leinwand.height = HOEHE * this.pupil.aufloesung;
        this.textur = new THREE.CanvasTexture(this.leinwand);
        this.textur.colorSpace = THREE.SRGBColorSpace;

        const b = BREITE / PIXEL_PRO_METER, h = HOEHE / PIXEL_PRO_METER;
        const form = new THREE.PlaneGeometry(b, h).translate(0, h / 2 - (HOEHE - BODEN) / PIXEL_PRO_METER, 0);
        this.tafel = new THREE.Mesh(form, new THREE.MeshBasicMaterial({
            map: this.textur, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide
        }));
        this.tafel.castShadow = true;
        this.tafel.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking, map: this.textur, alphaTest: 0.5
        });
        this.tafel.visible = false;
        welt.add(this.tafel);

        this.figur = null;
        this.zeit = 0;
        this.v = new THREE.Vector3();
    }

    /** Diese KayKit-Figur steuert ab jetzt die Puppe (und wird selbst unsichtbar). schueler = Eintrag aus SCHUELER. */
    nutze(figur, haarFarbe, schueler) {
        this.figur = figur;
        if (schueler.variante !== this.pupil.variante || schueler.jacke !== this.jacke) {
            this.pupil = new Pupil({ variante: schueler.variante, jacke: schueler.jacke });
            this.jacke = schueler.jacke;
        }
        figur.obj.children.forEach(k => { k.visible = false; });
        // three.js entfernt Punkte aus Namen: "upperarm.l" heißt dann "upperarml"
        const finde = n => figur.obj.getObjectByName(n.replace('_', '.')) || figur.obj.getObjectByName(n.replace('_', ''));
        this.knochen = KNOCHEN.map(n => [n, finde(n)]).filter(([, o]) => o);
        this.bodenFuss = null;
        this.pupil.setHaar(haarFarbe);
    }

    setHaar(farbe) { this.pupil.setHaar(farbe); }

    /** Nach der Figur-Bewegung, vor dem Zeichnen aufrufen. */
    update(dt, kamera) {
        const f = this.figur;
        this.tafel.visible = !!f && f.obj.visible;
        if (!this.tafel.visible || this.knochen.length < KNOCHEN.length - 2) return;
        f.obj.updateWorldMatrix(true, true);
        const k = {};
        for (const [n, o] of this.knochen) {
            f.obj.worldToLocal(o.getWorldPosition(this.v));
            k[n] = { x: this.v.x, y: this.v.y, z: this.v.z };
        }
        // Höhe der Füße beim Stehen merken (tiefster Wert bisher), damit Sprünge abheben
        this.bodenFuss = Math.min(this.bodenFuss ?? Infinity, k.foot_l.y, k.foot_r.y);
        const g = retarget(k, this.bodenFuss);

        // Tafel nur um die Hochachse zur Kamera drehen
        const pos = f.obj.position;
        const auge = this.tafel.parent.worldToLocal(kamera.getWorldPosition(this.v));
        this.tafel.position.copy(pos);
        this.tafel.rotation.y = Math.atan2(auge.x - pos.x, auge.z - pos.z);
        const w = blickWinkel(f.obj.rotation.y, pos, auge);

        this.zeit += dt;
        const mund = f.aktiv?.getClip().name === 'Cheer' ? 'jubel' : 'laecheln';
        this.pupil.setPose(g, w, { zeit: this.zeit, mund });
        this.pupil.zeichne(this.leinwand);
        this.textur.needsUpdate = true;
    }
}
