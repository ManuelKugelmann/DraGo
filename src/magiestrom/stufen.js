// Schwierigkeit nach Alter (reine Logik, getestet).
// Klasse ≈ Alter - 5 (6 Jahre = 1. Klasse). Englisch ab der 3. Klasse.
export const ALTER = [6, 7, 8, 9, 10, 11, 12];

export function klasseAus(alter) {
    return Math.max(1, Math.min(8, Math.round((Number(alter) || 9) - 5)));
}

/** Was in welcher Klasse drankommt. */
export function stufe(alter) {
    const k = klasseAus(alter);
    if (k === 1) return { klasse: k, plusBis: 20, malReihen: [2, 5, 10], malBis: 5, vokabeln: false };
    if (k === 2) return { klasse: k, plusBis: 100, malReihen: [2, 5, 10], malBis: 10, vokabeln: false };
    if (k === 3) return { klasse: k, plusBis: 100, malReihen: [2, 3, 4, 5, 6, 7, 8, 9, 10], malBis: 10, vokabeln: true };
    if (k === 4) return { klasse: k, plusBis: 1000, malReihen: [2, 3, 4, 5, 6, 7, 8, 9, 10], malBis: 10, vokabeln: true };
    return { klasse: k, plusBis: 1000, malReihen: [3, 4, 6, 7, 8, 9, 11, 12], malBis: 12, vokabeln: true };
}
