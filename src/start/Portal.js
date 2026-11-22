// Ring-Tor: Steinring mit Leucht-Winkeln und drehendem Runen-Ring,
// innen eine schimmernde Wasser-Oberfläche, durch die man die Höhle sieht (das Ei ist versteckt).
import * as THREE from 'three';

const WINKEL = 7;              // Leucht-Winkel am Ring
const RUNEN = 28;              // Zeichen auf dem inneren Ring
const LEUCHT = 0xffa640;       // Farbe der Winkel
const WASSER = new THREE.Color(0x4fb6ff);

const wasserShader = {
    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
        uniform float zeit, stoss;
        uniform sampler2D bild;
        uniform vec2 bildWdh, bildVers;
        uniform vec3 wasser;
        varying vec2 vUv;
        void main() {
            vec2 p = vUv - 0.5;
            float d = length(p);
            float welle = sin(d * 38.0 - zeit * 3.0) * 0.5 + sin(p.x * 22.0 + zeit * 1.7) * 0.25 + sin(p.y * 18.0 - zeit * 2.3) * 0.25;
            welle *= 1.0 + stoss * 3.0;
            vec2 uv = vUv + normalize(p + 1e-4) * welle * 0.012;
            vec3 hinten = texture2D(bild, uv * bildWdh + bildVers).rgb;
            float rand = smoothstep(0.32, 0.5, d);
            float glanz = pow(max(0.0, welle), 3.0) * 0.35;
            vec3 farbe = mix(hinten, wasser, 0.45 + rand * 0.4) + glanz + stoss * 0.5;
            gl_FragColor = vec4(farbe, 1.0);
            #include <colorspace_fragment>
        }`
};

export default class Portal {
    constructor(radius = 1.4) {
        this.obj = new THREE.Group();
        this.zeit = 0;
        this.stossWert = 0;

        // Wasser-Oberfläche
        const leer = new THREE.DataTexture(new Uint8Array([90, 70, 140, 255]), 1, 1);
        leer.needsUpdate = true;
        this.wasser = new THREE.ShaderMaterial({
            ...wasserShader,
            uniforms: {
                zeit: { value: 0 }, stoss: { value: 0 }, bild: { value: leer },
                bildWdh: { value: new THREE.Vector2(1, 1) }, bildVers: { value: new THREE.Vector2(0, 0) },
                wasser: { value: WASSER }
            }
        });
        new THREE.TextureLoader().load('img/hoehle.webp', t => {
            t.colorSpace = THREE.SRGBColorSpace;
            // Quadratischer Ausschnitt: Höhlengang in der Bildmitte
            const wdh = new THREE.Vector2(0.8 * 768 / 1344, 0.8);
            this.wasser.uniforms.bild.value = t;
            this.wasser.uniforms.bildWdh.value = wdh;
            this.wasser.uniforms.bildVers.value = new THREE.Vector2(0.5 - wdh.x / 2, 0.15);
        });
        this.obj.add(new THREE.Mesh(new THREE.CircleGeometry(radius, 64), this.wasser));

        // Steinring
        const stein = new THREE.MeshStandardMaterial({ color: 0x8c8a94, roughness: 0.9, metalness: 0.1, flatShading: true });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.16, 0.24, 10, 72), stein);
        ring.scale.z = 0.6;
        ring.castShadow = true;
        this.obj.add(ring);

        // Innerer Ring mit leuchtenden Runen (dreht sich)
        this.runenRing = new THREE.Group();
        const innen = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.03, 0.08, 8, 72),
            new THREE.MeshStandardMaterial({ color: 0x5e5a6e, roughness: 0.8, flatShading: true }));
        this.runenRing.add(innen);
        const runeMat = new THREE.MeshBasicMaterial({ color: 0x9fe3ff });
        for (let i = 0; i < RUNEN; i++) {
            const a = i / RUNEN * Math.PI * 2;
            const form = i % 3 === 0 ? new THREE.BoxGeometry(0.06, 0.12, 0.02)
                : i % 3 === 1 ? new THREE.ConeGeometry(0.05, 0.1, 3) : new THREE.TorusGeometry(0.035, 0.012, 4, 8);
            const r = new THREE.Mesh(form, runeMat);
            r.position.set(Math.cos(a) * (radius + 0.03), Math.sin(a) * (radius + 0.03), 0.09);
            r.rotation.z = a - Math.PI / 2;
            this.runenRing.add(r);
        }
        this.obj.add(this.runenRing);

        // Leucht-Winkel außen
        this.winkel = [];
        for (let i = 0; i < WINKEL; i++) {
            const a = Math.PI / 2 + i / WINKEL * Math.PI * 2;
            const w = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 3),
                new THREE.MeshStandardMaterial({ color: 0x6b4a2a, emissive: LEUCHT, emissiveIntensity: 0.6, flatShading: true }));
            w.position.set(Math.cos(a) * (radius + 0.36), Math.sin(a) * (radius + 0.36), 0.12);
            w.rotation.z = a + Math.PI / 2;
            this.obj.add(w);
            this.winkel.push(w);
        }

        // Licht vom Wasser auf Boden und Figur
        this.licht = new THREE.PointLight(0x6cc4ff, 6, 8);
        this.licht.position.set(0, 0, 0.6);
        this.obj.add(this.licht);
    }

    /** Wellen-Stoß, z. B. wenn jemand hindurchgeht. */
    stoss() { this.stossWert = 1; }

    update(dt) {
        this.zeit += dt;
        this.stossWert = Math.max(0, this.stossWert - dt * 0.8);
        this.wasser.uniforms.zeit.value = this.zeit;
        this.wasser.uniforms.stoss.value = this.stossWert;
        this.runenRing.rotation.z += dt * 0.25;
        this.winkel.forEach((w, i) => {
            w.material.emissiveIntensity = 0.6 + 0.6 * Math.max(0, Math.sin(this.zeit * 2 - i * 0.9));
        });
        this.licht.intensity = 5 + Math.sin(this.zeit * 3) + this.stossWert * 10;
    }
}
