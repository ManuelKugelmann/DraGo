// KayKit-Figuren (CC0) fürs Spiel vorbereiten:
//  - Waffen, Schilde usw. entfernen (nur Teile "<Klasse>_..." bleiben)
//  - nur die Bewegungen behalten, die das Spiel nutzt
//  - in public/figuren/<name>.glb schreiben
// Aufruf: node scripts/prep-figuren.mjs <ordner mit Barbarian.glb, Knight.glb, ...>
// Quelle: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, resample } from '@gltf-transform/functions';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUELLE = process.argv[2];
const ZIEL = resolve(dirname(fileURLToPath(import.meta.url)), '../public/figuren');
const FIGUREN = ['Knight', 'Barbarian', 'Mage', 'Rogue'];
const BEWEGUNGEN = new Set(['Idle', 'Walking_A', 'Running_A', 'Cheer', 'Jump_Full_Short']);

if (!QUELLE) { console.error('Ordner fehlt.'); process.exit(1); }
mkdirSync(ZIEL, { recursive: true });
const io = new NodeIO();

for (const name of FIGUREN) {
    const doc = await io.read(`${QUELLE}/${name}.glb`);
    const root = doc.getRoot();
    for (const node of root.listNodes()) {
        if (node.getMesh() && !node.getName().startsWith(name + '_')) node.dispose();
    }
    for (const anim of root.listAnimations()) {
        if (BEWEGUNGEN.has(anim.getName())) continue;
        anim.listChannels().forEach(c => c.dispose());
        anim.listSamplers().forEach(s => s.dispose());
        anim.dispose();
    }
    await doc.transform(resample());
    // Spuren, die sich nie bewegen und der Ruhe-Pose gleichen, weglassen (macht die Datei klein).
    for (const anim of root.listAnimations()) {
        for (const ch of anim.listChannels()) {
            const out = ch.getSampler().getOutput().getArray();
            const n = ch.getSampler().getOutput().getElementSize();
            const ruhe = { translation: 'getTranslation', rotation: 'getRotation', scale: 'getScale' }[ch.getTargetPath()];
            if (!ruhe) continue;
            const r = ch.getTargetNode()[ruhe]();
            let gleich = true;
            for (let i = 0; i < out.length && gleich; i++) gleich = Math.abs(out[i] - r[i % n]) < 1e-4;
            if (gleich) { const s = ch.getSampler(); ch.dispose(); s.dispose(); }
        }
    }
    await doc.transform(prune(), dedup());

    // Welche Farbfelder (8 x 4 Raster) benutzt der Kopf? Hilft, das Haar-Feld zu finden.
    const kopf = root.listNodes().find(n => n.getName() === `${name}_Head`);
    const zaehler = {};
    for (const prim of kopf?.getMesh()?.listPrimitives() ?? []) {
        const uv = prim.getAttribute('TEXCOORD_0');
        for (let i = 0; i < uv.getCount(); i++) {
            const [u, v] = uv.getElement(i, []);
            const feld = `${Math.min(7, Math.floor(u * 8))},${Math.min(3, Math.floor(v * 4))}`;
            zaehler[feld] = (zaehler[feld] || 0) + 1;
        }
    }
    await io.write(`${ZIEL}/${name.toLowerCase()}.glb`, doc);
    console.log(name, 'Kopf-Felder (spalte,zeile: punkte):', JSON.stringify(zaehler));
}
