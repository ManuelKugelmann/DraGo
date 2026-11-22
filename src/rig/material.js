// Gemalter Look für die Puppen-Teile: Dreifarb-Rampe (Schatten/Grund/Licht), Randlicht, Außenkontur.
import * as THREE from 'three';

// Weiche Stufen wie bei den KayKit-Figuren; die Rampe färbt danach in die Teil-Farben um.
const stufen = (() => {
    const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 165, 160, 170, 255, 235, 230, 225, 255, 255, 252, 245, 255]), 4, 1);
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
})();

const RAMPE = /* glsl */`
    float stufe = dot(outgoingLight, vec3(0.3333)) / max(dot(diffuseColor.rgb, vec3(0.3333)), 0.001);
    float tRampe = clamp((stufe - 0.35) / 1.3, 0.0, 1.0);
    vec3 rampe = tRampe < 0.5 ? mix(uDunkel, uBasis, tRampe * 2.0) : mix(uBasis, uHell, tRampe * 2.0 - 1.0);
    float rand = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
    outgoingLight = rampe + uHell * rand * 0.45;
`;

/** Material für eine Palette {l, b, d}. farbe(pal) tauscht die Töne später (z. B. Haarfarbe). */
export function malMaterial(pal, { doppelt = false } = {}) {
    const m = new THREE.MeshToonMaterial({ gradientMap: stufen, side: doppelt ? THREE.DoubleSide : THREE.FrontSide });
    const u = { uDunkel: { value: new THREE.Color() }, uBasis: { value: new THREE.Color() }, uHell: { value: new THREE.Color() } };
    m.farbe = p => {
        m.color.set(p.b);
        u.uDunkel.value.set(p.d); u.uBasis.value.set(p.b); u.uHell.value.set(p.l);
    };
    m.farbe(pal);
    m.onBeforeCompile = s => {
        Object.assign(s.uniforms, u);
        s.fragmentShader = s.fragmentShader
            .replace('void main() {', 'uniform vec3 uDunkel;\nuniform vec3 uBasis;\nuniform vec3 uHell;\nvoid main() {')
            .replace('#include <opaque_fragment>', RAMPE + '#include <opaque_fragment>');
    };
    return m;
}

/** Umrisslinie: Rückseiten entlang der Normalen nach außen geschoben (dicke in Metern). */
export function konturMaterial(dicke) {
    const m = new THREE.MeshBasicMaterial({ color: 0x2a1a24, side: THREE.BackSide });
    m.onBeforeCompile = s => {
        s.vertexShader = s.vertexShader.replace('#include <begin_vertex>',
            `#include <begin_vertex>\n transformed += normalize(normal) * ${dicke.toFixed(5)};`);
    };
    m.customProgramCacheKey = () => 'kontur' + dicke.toFixed(5);
    return m;
}
