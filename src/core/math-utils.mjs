// =====================================================================
// 数学工具函数 — 纯函数，无副作用
// =====================================================================

import { currentDNA } from './state.mjs'; // same directory

export function smoothStep(e0, e1, x) {
    let t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
}

export function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function seededRandom(seed) {
    let s = seed >>> 0;
    return () => {
        s += 0x6D2B79F5;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function dnaSignature() {
    return currentDNA.map(g => g.join('')).join('-');
}

export function addVec(out, dx, dy, dz, disp) {
    out.dx += dx;
    out.dy += dy;
    out.dz += dz;
    out.disp = Math.max(out.disp, disp);
}

export function ellipsoidField(x, y, z, cx, cy, cz, rx, ry, rz) {
    const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2);
    if (d >= 1) return 0;
    return smoothStep(1, 0, d);
}
