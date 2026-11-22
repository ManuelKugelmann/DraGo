// Höhle als 2.5D-Diorama: flache, gemalte Teile (FLUX, freigestellt) an 3D-Positionen,
// immer zur Kamera gedreht. Hinter einem Kristall ist das erste Ei versteckt.
import * as THREE from 'three';
import { HOEHLE_TEILE } from '../daten.js';

const loader = new THREE.TextureLoader();

function tafel(bild, groesse) {
    const tex = loader.load(bild);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);   // Unterkante auf dem Boden
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4 }));
    m.scale.setScalar(groesse);
    return m;
}

export default class Diorama {
    constructor() {
        this.obj = new THREE.Group();
        this.obj.visible = false;
        this.tafeln = [];

        // Hintergrund: gemalte Höhle, weit hinten
        const wand = new THREE.Mesh(new THREE.PlaneGeometry(36, 20.6), new THREE.MeshBasicMaterial({ map: loader.load('img/hoehle.webp') }));
        wand.material.map.colorSpace = THREE.SRGBColorSpace;
        wand.position.set(0, 4.6, -14);   // Unterkante unter dem Sand: kein harter Rand
        this.obj.add(wand);
        // Sandboden davor
        const boden = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshBasicMaterial({ color: 0xd8b98c }));
        boden.rotation.x = -Math.PI / 2;
        boden.position.set(0, -0.01, 0);
        this.obj.add(boden);

        for (const t of HOEHLE_TEILE) {
            const m = tafel(t.bild, t.groesse);
            m.position.set(...t.ort);
            m.userData = { ...t };
            this.obj.add(m);
            this.tafeln.push(m);
            if (t.versteck) this.versteck = m;
            if (t.ei) this.nest = m;
        }

        // Glitzern am Versteck (ein kleiner Hinweis)
        const g = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(30).fill(0), 3));
        this.glitzer = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff2c0, size: 0.09, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        this.obj.add(this.glitzer);
        this.zeit = 0;
        this.gefunden = false;
        this.schieben = 0;
    }

    zuruecksetzen() {
        this.gefunden = false;
        this.schieben = 0;
        if (this.versteck) {
            this.versteck.position.set(...this.versteck.userData.ort);
            this.versteck.rotation.z = 0;
        }
    }

    /** Antippen: trifft man den Versteck-Kristall, rutscht er zur Seite. Gibt true zurück, wenn das Ei gefunden ist. */
    tippe(raycaster) {
        if (this.gefunden || !this.versteck) return false;
        const treffer = raycaster.intersectObjects([this.versteck, this.nest].filter(Boolean), false)[0];
        if (!treffer) return false;
        this.gefunden = true;
        return true;
    }

    update(dt, kamera) {
        this.zeit += dt;
        // Tafeln drehen sich um die Hochachse zur Kamera (wie Pappfiguren)
        for (const m of this.tafeln) m.rotation.y = Math.atan2(kamera.position.x - m.position.x, kamera.position.z - m.position.z);
        // Versteck rutscht zur Seite, wenn gefunden
        if (this.gefunden && this.schieben < 1) {
            this.schieben = Math.min(1, this.schieben + dt * 1.5);
            const e = 1 - (1 - this.schieben) ** 3;
            this.versteck.position.x = this.versteck.userData.ort[0] + e * 1.8;
            this.versteck.rotation.z = -Math.sin(this.schieben * Math.PI) * 0.25;
        }
        // Glitzern kreist um die Kante des Verstecks
        if (this.versteck) {
            const p = this.glitzer.geometry.attributes.position.array, v = this.versteck.position, s = this.versteck.scale.x;
            for (let i = 0; i < 10; i++) {
                const a = this.zeit * 1.5 + i * 0.63;
                p[i * 3] = v.x - s * 0.25 + Math.cos(a) * 0.25;
                p[i * 3 + 1] = s * 0.35 + Math.sin(a * 1.3) * 0.3;
                p[i * 3 + 2] = v.z + 0.3;
            }
            this.glitzer.geometry.attributes.position.needsUpdate = true;
            this.glitzer.material.opacity = this.gefunden ? 0 : 0.4 + Math.sin(this.zeit * 4) * 0.4;
        }
    }
}
