// Umrechnen: KayKit-Knochen (3D-Figur) -> Gelenke der gemalten Puppe. Rein, ohne DOM, getestet.
//
// Eingang: Knochen-Positionen im Raum der Figur (Meter, y nach oben, Figur schaut nach +z,
// ihre linke Seite liegt bei +x). Ausgang: Gelenke im Körper-Raum der Puppe (Pixel,
// x seitlich, y nach unten, z nach vorne, Ursprung = Boden unter der Figur).
// Übernommen werden nur die Richtungen der Knochen; die Längen sind die der Puppe
// (KayKit ist kurzbeinig, die Puppe nicht). Aus der Position kommen nur Hüft-Höhe und Schwanken.
//
// Seiten: Index 0 = "L" = -x (rechte Hand der Figur, KayKit ".r"), Index 1 = "R" = +x (KayKit ".l").

export const MASS = {
    huefte: 100,      // Hüfte über dem Boden, wenn die Beine gestreckt sind
    rumpf: 62,        // Hüfte -> Halsansatz
    hals: 34,         // Halsansatz -> Kopfmitte
    schulterHoehe: 55,
    schulterBreite: 21,
    schulterVor: 5,
    oberarm: 42, unterarm: 40,
    beinBreite: 11,
    oberschenkel: 50, unterschenkel: 50,
    fussLaenge: 14,
    knoechel: 6,      // Knöchel über dem Boden
    armSenken: [0.8, 0.5]   // KayKit hält die kurzen Arme weit ab: hängende Ober-/Unterarme etwas nach unten ziehen
};

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mal = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const punkt = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const kreuz = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const laenge = a => Math.hypot(a.x, a.y, a.z);
const einheit = (a, ersatz) => { const l = laenge(a); return l > 1e-9 ? mal(a, 1 / l) : ersatz; };
/** KayKit-Punkt (y oben) -> Puppen-Richtung (y unten). */
const kippe = p => ({ x: p.x, y: -p.y, z: p.z });
const richtung = (von, nach, ersatz) => einheit(kippe(sub(nach, von)), ersatz);
/** Seitenachse senkrecht zur Rumpf-Richtung machen. */
const senkrecht = (achse, zu) => einheit(sub(achse, mal(zu, punkt(achse, zu))), { x: 1, y: 0, z: 0 });

const OBEN = { x: 0, y: -1, z: 0 }, UNTEN = { x: 0, y: 1, z: 0 }, VORNE = { x: 0, y: 0, z: 1 };

/**
 * k = Knochen-Positionen: hips, chest, head, upperarm_l/_r, lowerarm_*, wrist_*,
 * upperleg_*, lowerleg_*, foot_*, toes_* (je {x,y,z}).
 * bodenFuss = Höhe der Fuß-Knochen beim Stehen (sonst: tiefster Fuß steht immer am Boden).
 */
export function retarget(k, bodenFuss) {
    // Maßstab: Bein-Länge der Figur entspricht der Hüft-Höhe der Puppe.
    const bein = s => laenge(sub(k['upperleg_' + s], k['lowerleg_' + s])) + laenge(sub(k['lowerleg_' + s], k['foot_' + s]));
    const hueftAbstand = (k.hips.y - (k.upperleg_l.y + k.upperleg_r.y) / 2);
    const skala = MASS.huefte / ((bein('l') + bein('r')) / 2 + hueftAbstand);

    const huefte = mal(kippe(k.hips), skala);
    const rumpfDir = richtung(k.hips, k.head, OBEN);
    const halsDir = richtung(k.chest, k.head, rumpfDir);
    const brust = add(huefte, mal(rumpfDir, MASS.rumpf));
    const kopf = add(brust, mal(halsDir, MASS.hals));

    const schulterAchse = senkrecht(richtung(k.upperarm_r, k.upperarm_l, { x: 1, y: 0, z: 0 }), rumpfDir);
    const vorne = einheit(kreuz(schulterAchse, mal(rumpfDir, -1)), VORNE);
    const schulterMitte = add(add(huefte, mal(rumpfDir, MASS.schulterHoehe)), mal(vorne, MASS.schulterVor));
    const hueftAchse = senkrecht(richtung(k.upperleg_r, k.upperleg_l, { x: 1, y: 0, z: 0 }), rumpfDir);

    const arm = (s, seite) => {
        const schulter = add(schulterMitte, mal(schulterAchse, seite * MASS.schulterBreite));
        // nur hängende Arme senken, gehobene (Jubeln) bleiben oben
        const senke = (d, f) => einheit(add(d, mal(UNTEN, f * Math.max(0, Math.min(1, d.y * 1.5)))), d);
        const ellbogen = add(schulter, mal(senke(richtung(k['upperarm_' + s], k['lowerarm_' + s], UNTEN), MASS.armSenken[0]), MASS.oberarm));
        const hand = add(ellbogen, mal(senke(richtung(k['lowerarm_' + s], k['wrist_' + s], UNTEN), MASS.armSenken[1]), MASS.unterarm));
        return { schulter, ellbogen, hand };
    };
    const beinVon = (s, seite) => {
        const ansatz = add(huefte, mal(hueftAchse, seite * MASS.beinBreite));
        const knie = add(ansatz, mal(richtung(k['upperleg_' + s], k['lowerleg_' + s], UNTEN), MASS.oberschenkel));
        const fuss = add(knie, mal(richtung(k['lowerleg_' + s], k['foot_' + s], UNTEN), MASS.unterschenkel));
        const zehen = add(fuss, mal(richtung(k['foot_' + s], k['toes_' + s] || add(k['foot_' + s], { x: 0, y: 0, z: 1 }), VORNE), MASS.fussLaenge));
        return { ansatz, knie, fuss, zehen };
    };
    const g = {
        huefte, brust, kopf, vorne, seite: schulterAchse, oben: rumpfDir,
        arme: [arm('r', -1), arm('l', 1)],
        beine: [beinVon('r', -1), beinVon('l', 1)]
    };
    // Auf den Boden stellen: der tiefere Knöchel steht auf Knöchel-Höhe,
    // außer die Figur hebt ab (tiefster Fuß höher als beim Stehen = Sprung).
    const kayFuss = Math.min(k.foot_l.y, k.foot_r.y);
    const sprung = Math.max(0, kayFuss - (bodenFuss ?? kayFuss)) * skala;
    const tief = Math.max(g.beine[0].fuss.y, g.beine[1].fuss.y);
    verschiebe(g, { x: 0, y: -MASS.knoechel - sprung - tief, z: 0 });
    return g;
}

function verschiebe(g, d) {
    for (const n of ['huefte', 'brust', 'kopf']) g[n] = add(g[n], d);
    for (const a of g.arme) for (const n in a) a[n] = add(a[n], d);
    for (const b of g.beine) for (const n in b) b[n] = add(b[n], d);
}
