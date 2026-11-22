// 3D-Teile der Puppe: Röhren (Glieder, Haare, Bänder), Ellipsoide, Stoff, Gesicht.
// Eingang immer in Puppen-Pixeln (y unten), hier in Meter (y oben) umgerechnet.
import * as THREE from 'three';
import { glaette, geglaettet } from './geometrie.js';
import { zeichneGesicht } from './gesicht.js';
import { PAL } from './farben.js';

export const PIXEL_PRO_METER = 150;
const M = 1 / PIXEL_PRO_METER;
const meter = (p, v) => v.set(p.x * M, -p.y * M, p.z * M);
const richtung = (p, v) => v.set(p.x, -p.y, p.z).normalize();

function netz(geo, material, kontur) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    if (kontur) {
        const linie = new THREE.Mesh(geo, kontur);
        linie.frustumCulled = false;
        mesh.add(linie);
    }
    return mesh;
}

const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), R = new THREE.Vector3();

/** Röhre durch n Punkte {x,y,z,w} mit runden Enden; flach < 1 = Band (dünn entlang "quer"). */
export class Roehre {
    constructor(n, material, kontur, { seiten = 10, flach = 1, kappe = 3 } = {}) {
        this.n = geglaettet(n); this.S = seiten; this.flach = flach; this.kappe = kappe;
        const ringe = this.n + 2 * kappe, S = seiten, nv = ringe * S + 2;
        this.ringe = ringe;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
        const idx = [];
        for (let r = 0; r < ringe - 1; r++) for (let s = 0; s < S; s++) {
            const a = r * S + s, b = r * S + (s + 1) % S, c = a + S, d = b + S;
            idx.push(a, b, c, b, d, c);
        }
        const t0 = ringe * S, t1 = t0 + 1, letzt = (ringe - 1) * S;
        for (let s = 0; s < S; s++) {
            idx.push(t0, (s + 1) % S, s);
            idx.push(t1, letzt + s, letzt + (s + 1) % S);
        }
        geo.setIndex(idx);
        this.geo = geo;
        this.mesh = netz(geo, material, kontur);
        this.pts = Array.from({ length: this.n }, () => new THREE.Vector3());
        this.tan = Array.from({ length: this.n }, () => new THREE.Vector3());
    }

    /** punkte in Pixeln, quer = Richtung, in der ein flaches Band dünn ist (Pixel-Raum). */
    setze(punkte, quer = { x: 0, y: 0, z: 1 }) {
        const g = glaette(punkte), n = this.n, S = this.S, P = this.pts, Tn = this.tan;
        const r = g.map(q => q.w * M / 2);
        for (let i = 0; i < n; i++) meter(g[i], P[i]);
        for (let i = 0; i < n; i++) {
            Tn[i].subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]);
            if (Tn[i].lengthSq() < 1e-12) Tn[i].set(0, 1, 0); else Tn[i].normalize();
        }
        richtung(quer, N);
        N.addScaledVector(Tn[0], -N.dot(Tn[0]));
        if (N.lengthSq() < 1e-8) N.set(Tn[0].y, -Tn[0].x, 0.3).addScaledVector(Tn[0], -0.3 * Tn[0].z);
        N.normalize();
        const pos = this.geo.attributes.position.array, nor = this.geo.attributes.normal.array;
        const schreibe = (k, p, nn) => { pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; nor[k * 3] = nn.x; nor[k * 3 + 1] = nn.y; nor[k * 3 + 2] = nn.z; };
        const ring = (ri, mitte, rad, t, achse, neig) => {
            B.crossVectors(t, N);
            for (let s = 0; s < S; s++) {
                const a = s / S * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
                C.copy(mitte).addScaledVector(N, ca * rad * this.flach).addScaledVector(B, sa * rad);
                R.copy(N).multiplyScalar(ca / this.flach).addScaledVector(B, sa).normalize()
                    .multiplyScalar(Math.cos(neig)).addScaledVector(achse, Math.sin(neig)).normalize();
                schreibe(ri * S + s, C, R);
            }
        };
        const K = this.kappe, mitte = new THREE.Vector3(), rueck = new THREE.Vector3();
        // Anfangs-Kappe (Spitze zuerst)
        rueck.copy(Tn[0]).negate();
        for (let k = K; k >= 1; k--) {
            const f = k / (K + 1) * Math.PI / 2;
            mitte.copy(P[0]).addScaledVector(rueck, r[0] * Math.sin(f));
            ring(K - k, mitte, r[0] * Math.cos(f), Tn[0], rueck, f);
        }
        // Körper (Rahmen wird entlang der Linie mitgeführt)
        for (let i = 0; i < n; i++) {
            if (i > 0) { N.addScaledVector(Tn[i], -N.dot(Tn[i])); if (N.lengthSq() < 1e-10) N.set(1, 0, 0); N.normalize(); }
            ring(K + i, P[i], r[i], Tn[i], Tn[i], 0);
        }
        // End-Kappe
        const e = n - 1;
        for (let k = 1; k <= K; k++) {
            const f = k / (K + 1) * Math.PI / 2;
            mitte.copy(P[e]).addScaledVector(Tn[e], r[e] * Math.sin(f));
            ring(K + n - 1 + k, mitte, r[e] * Math.cos(f), Tn[e], Tn[e], f);
        }
        schreibe(this.ringe * S, mitte.copy(P[0]).addScaledVector(rueck, r[0]), rueck);
        schreibe(this.ringe * S + 1, mitte.copy(P[e]).addScaledVector(Tn[e], r[e]), Tn[e]);
        this.geo.attributes.position.needsUpdate = true;
        this.geo.attributes.normal.needsUpdate = true;
    }
}

/** Ellipsoid mit Radien in Pixeln (in die Form eingerechnet, damit die Kontur überall gleich dick ist). */
export function ellipsoidForm(rx, ry, rz, breit = 20, hoch = 14, ausschnitt) {
    const geo = ausschnitt ? new THREE.SphereGeometry(1, breit, hoch, ...ausschnitt) : new THREE.SphereGeometry(1, breit, hoch);
    const p = geo.attributes.position, n = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        p.setXYZ(i, x * rx * M, y * ry * M, z * rz * M);
        T.set(x / rx, y / ry, z / rz).normalize();
        n.setXYZ(i, T.x, T.y, T.z);
    }
    return geo;
}

const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), MAT = new THREE.Matrix4();

/** Ein Teil an Position mitte (Pixel) ausrichten: y-Achse = oben, z-Achse ungefähr = vorne (Pixel-Richtungen). */
export function richte(obj, mitte, oben, vorne) {
    richtung(oben, Y);
    richtung(vorne, Z).addScaledVector(Y, -Z.dot(Y));
    if (Z.lengthSq() < 1e-8) Z.set(0, 0, 1);
    Z.normalize();
    X.crossVectors(Y, Z);
    MAT.makeBasis(X, Y, Z);
    obj.quaternion.setFromRotationMatrix(MAT);
    meter(mitte, obj.position);
}

export class Koerper {
    constructor(rx, ry, rz, material, kontur) {
        this.mesh = netz(ellipsoidForm(rx, ry, rz), material, kontur);
    }
    setze(mitte, oben, vorne) { richte(this.mesh, mitte, oben, vorne); }
}

/** Stoff-Gitter aus der Physik (Tuch) als Fläche. */
export class TuchFlaeche {
    constructor(tuch, material) {
        const { R, K } = tuch, idx = [];
        for (let r = 0; r < R - 1; r++) for (let c = 0; c < K - 1; c++) {
            const a = r * K + c, b = a + 1, d = a + K, e = d + 1;
            idx.push(a, d, b, b, d, e);
        }
        this.geo = new THREE.BufferGeometry();
        this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(R * K * 3), 3));
        this.geo.setIndex(idx);
        this.mesh = netz(this.geo, material, null);
        this.tuch = tuch;
    }
    setze() {
        const p = this.geo.attributes.position;
        let i = 0;
        for (const reihe of this.tuch.pts) for (const q of reihe) { p.setXYZ(i++, q.x * M, -q.y * M, q.z * M); }
        p.needsUpdate = true;
        this.geo.computeVertexNormals();
    }
}

/** Gesicht: gemalt auf eine Leinwand, als Haut auf der Vorderseite des Kopfes (rx, ry, rz = Kopf-Radien). */
export class Gesicht {
    constructor(rx, ry, rz) {
        this.leinwand = document.createElement('canvas');
        this.leinwand.width = this.leinwand.height = 256;
        this.textur = new THREE.CanvasTexture(this.leinwand);
        this.textur.colorSpace = THREE.SRGBColorSpace;
        this.breite = 2 * rx + 6; this.hoehe = 2 * ry;
        // Vorderseite des Kopfes, knapp über der Haut; Bild gerade von vorne aufgelegt
        const geo = ellipsoidForm(rx * 1.02, ry * 1.02, rz * 1.02, 24, 16, [Math.PI / 2 - 1.3, 2.6, 0.45, 2.3]);
        const p = geo.attributes.position, uv = geo.attributes.uv;
        for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (this.breite * M), 0.5 + p.getY(i) / (this.hoehe * M));
        this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.textur, transparent: true, depthWrite: false }));
        this.mesh.frustumCulled = false;
        this.alt = '';
    }
    /** daten wie zeichneGesicht() sie braucht, Koordinaten relativ zur Kopf-Mitte (Pixel, y unten). */
    male(daten) {
        const schluessel = JSON.stringify(daten, (k, v) => (typeof v === 'number' ? Math.round(v * 50) / 50 : v));
        if (schluessel === this.alt) return;
        this.alt = schluessel;
        const c = this.leinwand.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, 256, 256);
        c.setTransform(256 / this.breite, 0, 0, 256 / this.hoehe, 128, 128);
        zeichneGesicht(c, daten, PAL.haut);
        this.textur.needsUpdate = true;
    }
}
