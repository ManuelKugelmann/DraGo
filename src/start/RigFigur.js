// Gemalte 3D-Puppe statt KayKit-Modell (nur mit ?rig in der Adresse).
// Das KayKit-Modell bewegt sich unsichtbar weiter; seine Knochen steuern die Puppe,
// die als Kind der Figur mitläuft (Drehen, Laufen, AR-Maßstab, Schatten).
import * as THREE from 'three';
import Pupil from '../rig/Pupil.js';
import { retarget } from '../rig/retarget.js';

const KNOCHEN = ['hips', 'chest', 'head'];
for (const s of ['l', 'r']) for (const n of ['upperarm', 'lowerarm', 'wrist', 'upperleg', 'lowerleg', 'foot', 'toes']) KNOCHEN.push(n + '_' + s);
const PFLICHT = KNOCHEN.filter(n => !n.startsWith('toes'));
const ZUG = 0.05;         // wie stark Laufen die Haare nach hinten weht
const ZUG_MAX = 0.4;

export default class RigFigur {
    constructor() {
        this.pupil = null;
        this.zeit = 0;
        this.v = new THREE.Vector3();
    }

    /** Diese KayKit-Figur steuert ab jetzt die Puppe. schueler = Eintrag aus SCHUELER. */
    nutze(figur, haarFarbe, schueler) {
        if (!this.pupil || this.pupil.variante !== schueler.variante || this.jacke !== schueler.jacke) {
            this.pupil?.entsorge();
            this.pupil = new Pupil({ variante: schueler.variante, jacke: schueler.jacke });
            this.jacke = schueler.jacke;
        }
        this.pupil.obj.removeFromParent();
        figur.obj.children.forEach(k => { k.visible = false; });   // KayKit-Modell verstecken
        figur.obj.add(this.pupil.obj);
        this.pupil.setHaar(haarFarbe);
        this.figur = figur;
        // three.js entfernt Punkte aus Namen: "upperarm.l" heißt dann "upperarml"
        const finde = n => figur.obj.getObjectByName(n.replace('_', '.')) || figur.obj.getObjectByName(n.replace('_', ''));
        this.knochen = KNOCHEN.map(n => [n, finde(n)]).filter(([, o]) => o);
        this.fehlt = PFLICHT.some(n => !this.knochen.some(([m]) => m === n));
        this.bodenFuss = null;
        this.letzte = null;
    }

    setHaar(farbe) { this.pupil?.setHaar(farbe); }

    /** Nach der Figur-Bewegung aufrufen. */
    update(dt) {
        const f = this.figur;
        if (!f || this.fehlt || !f.obj.visible) return;
        f.obj.updateWorldMatrix(true, true);
        const k = {};
        for (const [n, o] of this.knochen) {
            f.obj.worldToLocal(o.getWorldPosition(this.v));
            k[n] = { x: this.v.x, y: this.v.y, z: this.v.z };
        }
        // Höhe der Füße beim Stehen merken (tiefster Wert bisher), damit Sprünge abheben
        this.bodenFuss = Math.min(this.bodenFuss ?? Infinity, k.foot_l.y, k.foot_r.y);

        this.zeit += dt;
        const mund = f.aktiv?.getClip().name === 'Cheer' ? 'jubel' : 'laecheln';
        this.pupil.setPose(retarget(k, this.bodenFuss), { zeit: this.zeit, mund, zug: this.fahrtwind(f.obj, dt) });
    }

    /** Bewegung der Figur als Gegenwind im Körper-Raum (Sprünge beim Zurücksetzen zählen nicht). */
    fahrtwind(obj, dt) {
        const p = obj.position, alt = this.letzte;
        this.letzte = p.clone();
        if (!alt || dt <= 0 || alt.distanceTo(p) > 0.5) return null;
        const vx = (p.x - alt.x) / dt, vz = (p.z - alt.z) / dt, r = obj.rotation.y;
        const c = Math.cos(r), s = Math.sin(r);
        const klemme = v => Math.max(-ZUG_MAX, Math.min(ZUG_MAX, v));
        return { x: klemme(-(vx * c - vz * s) * ZUG), z: klemme(-(vx * s + vz * c) * ZUG) };
    }
}
