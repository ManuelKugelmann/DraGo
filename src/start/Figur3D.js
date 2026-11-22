// Eine 3D-Spielfigur (KayKit glb) mit Bewegungen und umfärbbaren Haaren.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { faerbeHaar } from './haar.js';

const loader = new GLTFLoader();
const UEBERGANG = 0.25; // Sekunden zum Überblenden zwischen Bewegungen
const HOEHE = 1.5;      // Größe jeder Figur in Metern

export default class Figur3D {
    static async laden(url) {
        const gltf = await loader.loadAsync(url);
        return new Figur3D(gltf);
    }

    constructor(gltf) {
        // Alle Figuren gleich groß: Hülle um das Modell auf HOEHE skalieren.
        this.obj = new THREE.Group();
        this.obj.add(gltf.scene);
        gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
        const h = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).y || 1;
        gltf.scene.scale.setScalar(HOEHE / h);
        this.mixer = new THREE.AnimationMixer(gltf.scene);
        this.clips = Object.fromEntries(gltf.animations.map(c => [c.name, c]));
        this.aktiv = null;

        // Eigene Kopie der Farbtafel, damit nur diese Figur umgefärbt wird.
        const mat = this.findeMaterial();
        this.material = mat;
        const bild = mat?.map?.image;
        if (bild) {
            this.leinwand = document.createElement('canvas');
            this.leinwand.width = bild.width; this.leinwand.height = bild.height;
            this.ctx = this.leinwand.getContext('2d', { willReadFrequently: true });
            this.ctx.drawImage(bild, 0, 0);
            this.original = this.ctx.getImageData(0, 0, bild.width, bild.height);
            const tex = new THREE.CanvasTexture(this.leinwand);
            tex.flipY = false;
            tex.colorSpace = mat.map.colorSpace;
            tex.magFilter = mat.map.magFilter; tex.minFilter = mat.map.minFilter;
            mat.map = tex;
        }
        this.spiele('Idle');
    }

    findeMaterial() {
        let m = null;
        this.obj.traverse(o => { if (!m && o.isMesh) m = o.material; });
        // Alle Teile teilen sich ein Material; als eigene Kopie für diese Figur.
        if (!m) return null;
        const kopie = m.clone();
        this.obj.traverse(o => { if (o.isMesh) o.material = kopie; });
        return kopie;
    }

    setHaar(farbe) {
        if (!this.ctx) return;
        const d = new ImageData(new Uint8ClampedArray(this.original.data), this.original.width, this.original.height);
        faerbeHaar(d.data, d.width, d.height, farbe);
        this.ctx.putImageData(d, 0, 0);
        this.material.map.needsUpdate = true;
    }

    /** Bewegung abspielen. einmal = nicht wiederholen, danach zurück zu "Idle". */
    spiele(name, { einmal = false, tempo = 1 } = {}) {
        const clip = this.clips[name];
        if (!clip) return;
        const neu = this.mixer.clipAction(clip);
        neu.reset().setEffectiveTimeScale(tempo).setLoop(einmal ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
        neu.clampWhenFinished = einmal;
        if (this.aktiv && this.aktiv !== neu) neu.crossFadeFrom(this.aktiv, UEBERGANG, false);
        neu.play();
        this.aktiv = neu;
        if (einmal) {
            const fertig = e => {
                if (e.action !== neu) return;
                this.mixer.removeEventListener('finished', fertig);
                if (this.aktiv === neu) this.spiele('Idle');
            };
            this.mixer.addEventListener('finished', fertig);
        }
    }

    update(dt) { this.mixer.update(dt); }
}
