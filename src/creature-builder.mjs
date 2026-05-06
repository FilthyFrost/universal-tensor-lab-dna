// =====================================================================
// 🧬 生物体构建器 — 蓝图函数 + buildCreature
// =====================================================================

import * as THREE from 'three';
import { currentDNA, currentExpression, isWireframeMode, scene, currentGroup, floatWrapper, setCurrentGroup, setFloatWrapper, setExportableModel } from './state.mjs';
import { BASES, HEAD_TENSORS, HEAD_CONTRACTS, HEAD_PRIMITIVES, SIDE_PRIMITIVES, SIDE_TENSORS, BACK_TENSORS, DORSAL_PRIMITIVES, CATFISH_BARBEL_FIELDS, BODY_SHAPES, PALETTES, PATTERNS } from './dna-constants.mjs';
import { smoothStep, hashString, seededRandom, dnaSignature, addVec, ellipsoidField } from './math-utils.mjs';
import { getExprTier } from './game-constants.mjs';

// --- 体型蓝图 ---

export function applyBodyBlueprint(x, y, z, code, shp, taper) {
    const radialXZ = Math.hypot(x, z);
    const angle = Math.atan2(x, z);
    let baseX = x * taper * shp.sx;
    let baseY = y * taper * shp.sy;
    let baseZ = z * shp.sz;

    if (code === 'AA') {
        const headBulb = smoothStep(-0.15, 0.9, y);
        const foot = smoothStep(-0.45, -0.92, y);
        baseX *= 1.0 - headBulb * 0.22 + foot * 0.45;
        baseZ *= 1.0 - headBulb * 0.16 + foot * 0.26;
        baseY += headBulb * 0.28;
    } else if (code === 'AT') {
        const rim = smoothStep(0.34, 0.95, radialXZ);
        baseX *= 1.12 + rim * 0.45;
        baseZ *= 1.05 + rim * 0.36;
        baseY *= 0.72 - rim * 0.18;
    } else if (code === 'AC') {
        const beanBend = Math.sin((z + 0.18) * Math.PI) * 0.22 * smoothStep(0.05, 0.88, radialXZ);
        baseX += beanBend;
        baseY += Math.cos(z * Math.PI * 1.2) * 0.08;
        baseZ *= 1.08;
    } else if (code === 'AG') {
        const frontLift = smoothStep(0.15, 0.95, z);
        const tailSink = smoothStep(-0.1, -0.95, z);
        baseZ *= 1.26;
        baseX *= 0.92 + smoothStep(-0.8, 0.8, z) * 0.28;
        baseY += frontLift * 0.16 - tailSink * 0.12;
    } else if (code === 'TA') {
        baseX *= 1.0 + Math.pow(Math.abs(x), 1.6) * 0.34;
        baseZ *= 1.0 + Math.pow(Math.abs(z), 1.6) * 0.22;
        baseY += smoothStep(0.45, 0.94, y) * 0.16 - smoothStep(-0.35, -0.95, y) * 0.08;
    } else if (code === 'TT') {
        const puffy = 1.08 + smoothStep(0.15, 0.95, radialXZ) * 0.12;
        baseX *= puffy;
        baseY *= 1.08;
        baseZ *= puffy;
    } else if (code === 'TC') {
        const arms = Math.pow(Math.max(0, Math.cos(angle * 5)), 1.7) * smoothStep(0.18, 0.98, radialXZ);
        baseX *= 1.0 + arms * 0.78;
        baseZ *= 1.0 + arms * 0.78;
        baseY *= 0.58 - arms * 0.06;
    } else if (code === 'TG') {
        const nose = smoothStep(0.1, 0.95, z);
        const tail = smoothStep(-0.1, -0.95, z);
        baseZ *= 1.32;
        baseX *= 1.0 - nose * 0.38 + tail * 0.24;
        baseY *= 0.9 - nose * 0.22;
    } else if (code === 'CA') {
        const top = smoothStep(0.22, 0.88, y);
        baseX *= 1.0 + top * 0.26;
        baseZ *= 1.0 - top * 0.08;
        baseY += top * 0.18;
    } else if (code === 'CT') {
        const endTaper = smoothStep(0.45, 0.98, Math.abs(z));
        baseZ *= 1.2;
        baseX *= 1.0 - endTaper * 0.5;
        baseY *= 1.0 - endTaper * 0.24;
    } else if (code === 'CC') {
        const frontMass = smoothStep(0.0, 0.95, z);
        baseX *= 1.0 + frontMass * 0.42;
        baseY *= 1.0 + frontMass * 0.32;
        baseZ *= 0.96 + frontMass * 0.12;
    } else if (code === 'CG') {
        const rim = smoothStep(0.32, 0.95, radialXZ);
        baseX *= 1.18 + rim * 0.56;
        baseZ *= 1.18 + rim * 0.56;
        baseY *= 0.58 - rim * 0.16;
    } else if (code === 'GA') {
        const crescent = Math.sin((z + 0.55) * Math.PI) * 0.16;
        baseX *= 1.0 + smoothStep(0.12, 0.82, Math.abs(x)) * 0.18;
        baseY += crescent * smoothStep(-0.8, 0.65, z);
        baseZ *= 0.96;
    } else if (code === 'GT') {
        const waist = smoothStep(0.08, 0.0, Math.abs(z));
        const lobes = smoothStep(0.18, 0.9, Math.abs(z));
        baseX *= 1.0 - waist * 0.36 + lobes * 0.24;
        baseY *= 1.0 - waist * 0.18 + lobes * 0.12;
    } else if (code === 'GC') {
        const sideCaps = smoothStep(0.35, 0.94, Math.abs(x));
        baseX *= 1.0 + sideCaps * 0.46;
        baseY += sideCaps * 0.16 - smoothStep(0.0, 0.92, Math.abs(z)) * 0.08;
        baseZ *= 0.92;
    } else if (code === 'GG') {
        const hulking = smoothStep(0.08, 0.92, radialXZ);
        baseX *= 1.12 + hulking * 0.24;
        baseY *= 1.16 + hulking * 0.18;
        baseZ *= 1.12 + hulking * 0.24;
    }

    return { x: baseX, y: baseY, z: baseZ };
}

// --- 头部合约 ---

export function getHeadContract(code) {
    return HEAD_CONTRACTS[code] || { firstRead: '通用头部突变', protectedZone: 'front-medium', patternPolicy: 'protect-organ', markerPolicy: 'none' };
}

export function needsHeadClearance(code) {
    return getHeadContract(code).protectedZone !== 'none';
}

export function frontClearance(z, code) {
    const zone = getHeadContract(code).protectedZone;
    if (zone === 'front-wide') return smoothStep(-0.08, -0.72, z);
    if (zone === 'front-medium') return smoothStep(0.28, -0.42, z);
    return smoothStep(0.48, 0.12, z);
}

// --- 头部蓝图 ---

export function applyHeadBlueprint(x, y, z, code, params) {
    const out = { dx: 0, dy: 0, dz: 0, disp: 0 };
    const primitive = HEAD_PRIMITIVES[code] || 'tensorFallback';

    if (primitive === 'sweptTubeTrunk') {
        const center = smoothStep(0.5, 0.04, Math.abs(x));
        const front = smoothStep(0.42, 0.98, z);
        const low = smoothStep(0.68, -0.34, y);
        const tube = Math.pow(center * front * low, 0.84);
        const tipPad = tube * smoothStep(0.05, -0.52, y);
        const nasalRidge = smoothStep(0.16, 0.0, Math.abs(x)) * front * smoothStep(0.55, -0.38, y);
        addVec(out, -x * tube * 0.34 + x * tipPad * 0.28, -tube * 0.85 - tipPad * 0.18, tube * 1.05 + tipPad * 0.14, tube);
        addVec(out, 0, nasalRidge * 0.08, nasalRidge * 0.18, nasalRidge);
        return out;
    }

    if (primitive === 'singleFlame') {
        const p = ellipsoidField(x, y, z, 0, 0.68, 0.56, 0.42, 0.44, 0.36);
        const tall = Math.pow(p, 0.85);
        const lick = Math.sin(y * 15 + z * 8 + x * 5) * Math.pow(p, 1.35) * 0.34;
        addVec(out, x * tall * 0.08 + lick, tall * 2.75, -tall * 0.28 + Math.cos(y * 11) * p * 0.12, p);
        return out;
    }

    if (primitive === 'brainFoldCap') {
        const p = ellipsoidField(x, y, z, 0, 0.66, 0.35, 0.82, 0.44, 0.62);
        const foldA = Math.sin(x * 20 + z * 5) * Math.cos(z * 16) * 0.28 * p;
        const foldB = Math.cos(x * 12 - y * 9) * 0.18 * p;
        addVec(out, x * p * 0.72 + foldA, p * 1.18 + Math.abs(foldB) * 0.28, z * p * 0.22 + foldB * 0.2, p);
        return out;
    }

    if (primitive === 'forkedCrown') {
        const prongs = [
            { x: 0, y: 0.78, z: 0.42, h: 2.25, s: 0.16 },
            { x: -0.32, y: 0.62, z: 0.34, h: 1.75, s: 0.18 },
            { x: 0.32, y: 0.62, z: 0.34, h: 1.75, s: 0.18 },
            { x: -0.14, y: 0.68, z: 0.58, h: 1.45, s: 0.14 },
            { x: 0.14, y: 0.68, z: 0.58, h: 1.45, s: 0.14 }
        ];
        for (const prong of prongs) {
            const p = ellipsoidField(x, y, z, prong.x, prong.y, prong.z, prong.s, 0.36, 0.22);
            const spike = Math.pow(p, 1.62);
            addVec(out, (x - prong.x) * spike * 0.2 + prong.x * spike * 0.55, spike * prong.h, -spike * 0.1, p);
        }
        return out;
    }

    if (primitive === 'spiralPetalCrown') {
        const p = ellipsoidField(x, y, z, 0, 0.62, 0.45, 0.78, 0.46, 0.62);
        const angle = Math.atan2(x, z - 0.44);
        const petal = Math.pow(Math.max(0, Math.sin(angle * 5 + p * 4.8)), 0.7);
        const bloom = Math.pow(p, 0.88) * (0.45 + petal * 0.95);
        addVec(out, Math.sin(angle) * bloom * 0.92, bloom * 1.34, Math.cos(angle) * bloom * 0.72 - bloom * 0.12, bloom);
        return out;
    }

    for (let sign of [1, -1]) {
        let p = 0;
        let lx = 0, ly = 0, lz = 0;

        if (primitive === 'roundDiscPair') {
            const cx = sign * 0.42, cy = 0.58, cz = 0.5;
            p = ellipsoidField(x, y, z, cx, cy, cz, 0.42, 0.48, 0.32);
            lx = x - cx; ly = y - cy; lz = z - cz;
            const disk = Math.pow(p, 0.72);
            const roundFace = 0.65 + 0.35 * smoothStep(0.42, 0.04, Math.hypot(lx, ly));
            addVec(out, sign * disk * 0.98 + lx * p * 0.18, ly * p * 0.34 + disk * 0.56, -lz * p * 0.85 - disk * 0.04, p * roundFace);
        } else if (primitive === 'triEarPair') {
            const cx = sign * 0.36, cy = 0.52, cz = 0.58;
            p = ellipsoidField(x, y, z, cx, cy, cz, 0.38, 0.34, 0.28);
            lx = x - cx; lz = z - cz;
            const base = Math.pow(p, 0.52);
            const point = Math.pow(p, 2.15);
            const flare = smoothStep(0.42, 0.02, Math.hypot(lx * 0.8, lz)) * p;
            addVec(out, sign * (0.92 * base + 0.34 * point), base * 0.56 + point * 0.92, -lz * p * 1.05 - flare * 0.16, p);
        } else if (primitive === 'uprightOvalEarPair') {
            const cx = sign * 0.27, cy = 0.58, cz = 0.5;
            p = ellipsoidField(x, y, z, cx, cy, cz, 0.26, 0.62, 0.23);
            lx = x - cx; ly = y - cy; lz = z - cz;
            const shaft = Math.pow(p, 0.52);
            const tipBulb = Math.pow(p, 3.4);
            const lean = smoothStep(0.15, 0.98, y) * p;
            addVec(out, sign * (shaft * 0.42 + lean * 0.62 + lx * p * 0.26), shaft * 2.12 + tipBulb * 0.38, -shaft * 0.16 - lz * p * 0.36, p);
        } else if (primitive === 'shortDevilHornPair' || primitive === 'crystalHornPair') {
            p = ellipsoidField(x, y, z, sign * 0.3, 0.57, 0.66, 0.25, 0.32, 0.24);
            const sharp = Math.pow(p, primitive === 'crystalHornPair' ? 3.1 : 1.9);
            const curve = primitive === 'crystalHornPair' ? 0.58 : 0.36;
            addVec(out, sign * sharp * curve, sharp * (primitive === 'crystalHornPair' ? 2.55 : 1.95), sharp * (primitive === 'crystalHornPair' ? 0.42 : 0.18), p);
        } else if (primitive === 'antennaBulbPair') {
            p = ellipsoidField(x, y, z, sign * 0.2, 0.6, 0.58, 0.16, 0.38, 0.16);
            const stalk = Math.pow(p, 1.05);
            const bulb = Math.pow(p, 5.5);
            addVec(out, sign * (stalk * 0.18 + bulb * 1.05), stalk * 2.8 + bulb * 0.68, stalk * 0.04 + bulb * 0.28, p);
        } else if (primitive === 'catfishBarbelWhiskers') {
            const cheekPad = ellipsoidField(x, y, z, sign * 0.28, -0.03, 0.88, 0.3, 0.2, 0.22);
            if (cheekPad > 0) {
                addVec(out, sign * cheekPad * 0.16, -cheekPad * 0.08, cheekPad * 0.18, cheekPad * 0.45);
            }
            for (const strandSpec of CATFISH_BARBEL_FIELDS) {
                const q = ellipsoidField(x, y, z, sign * strandSpec.cx, strandSpec.oy, strandSpec.oz, strandSpec.rx, strandSpec.ry, strandSpec.rz);
                if (q <= 0) continue;
                const root = Math.pow(q, 1.18);
                const rib = Math.abs(Math.sin((y - strandSpec.oy) * 34 + strandSpec.phase)) * Math.pow(q, 1.65);
                addVec(out, sign * root * 0.08, -root * 0.025 + rib * 0.035, root * 0.08, q * 0.55);
            }
        } else if (primitive === 'houndEarPair') {
            p = ellipsoidField(x, y, z, sign * 0.42, 0.45, 0.48, 0.42, 0.42, 0.27);
            lz = z - 0.48;
            const flap = Math.pow(p, 0.48);
            addVec(out, sign * flap * 1.22, -flap * 1.82, -lz * p * 1.1 - flap * 0.1, p);
        } else if (primitive === 'hammerheadBar') {
            p = ellipsoidField(x, y, z, sign * 0.52, 0.46, 0.66, 0.38, 0.26, 0.26);
            const bar = Math.pow(p, 0.72);
            addVec(out, sign * bar * 2.95, bar * 0.08, -bar * 0.06, p);
        } else if (primitive === 'mothAntennaFan') {
            p = ellipsoidField(x, y, z, sign * 0.3, 0.58, 0.58, 0.4, 0.42, 0.26);
            const fanAngle = Math.atan2(y - 0.58, x - sign * 0.3);
            const feather = Math.abs(Math.sin(fanAngle * 9)) * Math.pow(p, 0.85);
            addVec(out, sign * (p * 1.65 + feather * 0.44), p * 1.52 + feather * 0.38, -p * 0.48, p);
        } else if (primitive === 'sideGillFrill') {
            p = ellipsoidField(x, y, z, sign * 0.46, 0.34, 0.45, 0.42, 0.24, 0.28);
            const frill = Math.abs(Math.sin((y + z) * 24)) * Math.pow(p, 0.72);
            addVec(out, sign * (p * 1.9 + frill * 0.34), p * 0.04 + frill * 0.46, -p * 0.66 - frill * 0.22, p);
        } else {
            const tf = applyTensorField(x, y, z, params, sign);
            addVec(out, tf.dx, tf.dy, tf.dz, tf.disp);
        }
    }

    return out;
}

// --- 侧翼蓝图 ---

export function applySideBlueprint(x, y, z, code, params, headCode) {
    const out = { dx: 0, dy: 0, dz: 0, disp: 0 };
    const primitive = SIDE_PRIMITIVES[code] || 'tensorFallback';
    if (primitive === 'none') return out;

    for (let sign of [1, -1]) {
        const clear = frontClearance(z, headCode);
        const cx = sign * (params.ox || 0.82);
        let p = ellipsoidField(x, y, z, cx, params.oy, params.oz, Math.max(0.3, params.rad * 1.04), 0.66, 0.68);
        if (primitive === 'gliderWing' || primitive === 'batMembrane' || primitive === 'butterflyDoubleLobe' || primitive === 'wideRibbonBand' || primitive === 'angelFeatherFan') p *= clear;
        if (p <= 0) continue;
        const ease = Math.pow(p, params.pow);
        const localZ = z - params.oz;
        const localY = y - params.oy;
        const localX = x - cx;

        if (primitive === 'batMembrane') {
            const rib = Math.abs(Math.sin((localZ + 1) * 13)) * Math.pow(ease, 1.55);
            const scallop = Math.abs(Math.sin(localZ * 9)) * Math.pow(ease, 2.0);
            addVec(out, sign * (ease * 3.05 - scallop * 0.8), -Math.abs(localY) * ease * 1.05 - rib * 0.28, localZ * ease * 0.42 - scallop * 0.16, p);
        } else if (primitive === 'leafBlade') {
            const leaf = Math.sin(ease * Math.PI);
            const vein = smoothStep(0.08, 0.0, Math.abs(localZ)) * ease;
            addVec(out, sign * ease * 2.85, -ease * 0.18 + vein * 0.3, localZ * leaf * 2.35 - ease * 0.2, p);
        } else if (primitive === 'enginePod') {
            const nozzle = Math.pow(ease, 2.0);
            const intake = Math.sin(localZ * 10) * Math.pow(ease, 1.5) * 0.18;
            addVec(out, sign * (ease * 2.0 + nozzle * 0.55), intake, localZ * ease * 0.98 + nozzle * 0.32, p);
        } else if (primitive === 'angelFeatherFan') {
            const feather = Math.abs(Math.sin((localZ + 0.2) * 15)) * Math.pow(ease, 1.18);
            addVec(out, sign * (ease * 2.35 + feather * 0.32), ease * 1.32 - feather * 0.2, -ease * 0.35 + feather * 0.62, p);
        } else if (primitive === 'lowFlipper') {
            const paddle = Math.sin(ease * Math.PI);
            addVec(out, sign * ease * 2.45, -ease * 1.12 - Math.abs(localY) * ease * 0.34, localZ * paddle * 1.42 + ease * 0.08, p);
        } else if (primitive === 'gliderWing') {
            const thin = smoothStep(0.55, 0.0, Math.abs(localY));
            addVec(out, sign * ease * 3.55, -ease * 0.62 * thin, localZ * ease * 0.22 - ease * 0.06, p);
        } else if (primitive === 'ruffleSkirt') {
            const skirt = ellipsoidField(x, y, z, sign * 0.82, -0.25, -0.03, 0.84, 0.28, 0.88) * clear;
            const wave = Math.sin((z + sign * x) * 18) * skirt * 0.32;
            addVec(out, sign * skirt * 2.05, -skirt * 0.62 + wave, localZ * skirt * 0.35, skirt);
        } else if (primitive === 'sideBoneSpike') {
            const spike = Math.pow(ease, 2.15);
            addVec(out, sign * spike * 3.0, -spike * 0.08, localZ * spike * 0.2, p);
        } else if (primitive === 'bubblePod') {
            const bubble = Math.pow(ease, 0.66);
            addVec(out, sign * bubble * 1.42, bubble * 1.22, bubble * 0.58 + localZ * bubble * 0.38, p);
        } else if (primitive === 'butterflyDoubleLobe') {
            const upper = ellipsoidField(x, y, z, sign * 0.82, 0.28, -0.12, 0.76, 0.56, 0.54) * clear;
            const lower = ellipsoidField(x, y, z, sign * 0.82, -0.12, 0.18, 0.7, 0.38, 0.48) * clear;
            const wing = Math.max(upper, lower);
            addVec(out, sign * wing * 2.8, upper * 1.48 - lower * 0.5, -localZ * wing * 0.8, wing);
        } else if (primitive === 'spiralSideHorn') {
            const twistAngle = ease * params.twist;
            const rotX = Math.cos(twistAngle) * localX - Math.sin(twistAngle) * localZ;
            const rotZ = Math.sin(twistAngle) * localX + Math.cos(twistAngle) * localZ;
            addVec(out, sign * (ease * 2.45 + (rotX - localX) * 1.2), ease * 0.18, (rotZ - localZ) * 1.25, p);
        } else if (primitive === 'gillComb') {
            const gills = Math.abs(Math.sin((localZ + 0.1) * 22)) * ease;
            addVec(out, sign * (ease * 1.55 + gills * 0.34), gills * 0.98 - ease * 0.1, -gills * 0.64, p);
        } else if (primitive === 'cloudFloatSac') {
            const puff = Math.max(
                ellipsoidField(x, y, z, sign * 0.86, 0.16, -0.28, 0.46, 0.36, 0.38),
                ellipsoidField(x, y, z, sign * 0.92, 0.0, 0.18, 0.44, 0.34, 0.36)
            ) * clear;
            addVec(out, sign * puff * 1.86, puff * 1.15, localZ * puff * 0.9, puff);
        } else if (primitive === 'foldedPanelWing') {
            const hinge = Math.max(0, Math.sin((Math.abs(localZ) + 0.15) * 7)) * ease;
            addVec(out, sign * ease * 2.6, -ease * 0.58 + hinge * 0.22, -Math.abs(localZ) * ease * 1.1, p);
        } else if (primitive === 'wideRibbonBand') {
            const ribbonWave = Math.sin(localZ * 10) * ease * 0.22;
            addVec(out, sign * ease * 3.65, -ease * 0.34 + ribbonWave, localZ * ease * 0.72, p);
        } else {
            addVec(out, sign * ease * params.sx * 1.35, ease * params.sy * 1.35, localZ * Math.sin(ease * Math.PI) * params.sz * 1.35, p);
            if (params.web !== 0) {
                const web = Math.abs(Math.sin(localZ * 8.0)) * params.web;
                out.dx -= sign * web * Math.pow(ease, 2.0) * 1.35;
            }
        }
    }

    return out;
}

// --- 背部蓝图 ---

export function applyBackBlueprint(x, y, z, baseY, code, params, nx, ny, nz, zNorm, headCode) {
    const out = { dx: 0, dy: 0, dz: 0, disp: 0 };
    if (baseY <= 0 || code === 'AA') return out;

    const primitive = DORSAL_PRIMITIVES[code] || params.type;
    const headClear = frontClearance(z, headCode);
    const clear = needsHeadClearance(headCode) ? headClear : 1;
    const dC = Math.hypot(x * 0.92, y - 0.5, z + 0.22);
    const pC = smoothStep(0.98, 0.0, dC) * clear;
    const center = smoothStep(0.46, 0.0, Math.abs(x));
    const narrow = smoothStep(0.24, 0.0, Math.abs(x));
    const spineBand = smoothStep(-0.95, -0.18, z) * smoothStep(0.62, -0.08, z) * clear;
    const fullBand = smoothStep(-1.0, -0.25, z) * smoothStep(0.72, -0.04, z) * clear;

    if (primitive === 'anemoneBulbCrown' && pC > 0) {
        const buds = [
            { cx: 0.0, cy: 0.82, cz: -0.46, rx: 0.32, ry: 0.28, rz: 0.24, lift: 1.0 },
            { cx: 0.36, cy: 0.76, cz: -0.48, rx: 0.26, ry: 0.28, rz: 0.24, lift: 0.78 },
            { cx: -0.36, cy: 0.76, cz: -0.48, rx: 0.26, ry: 0.28, rz: 0.24, lift: 0.78 },
            { cx: 0.3, cy: 0.84, cz: -0.02, rx: 0.23, ry: 0.3, rz: 0.22, lift: 0.9 },
            { cx: -0.3, cy: 0.84, cz: -0.02, rx: 0.23, ry: 0.3, rz: 0.22, lift: 0.9 },
            { cx: 0.0, cy: 0.9, cz: 0.22, rx: 0.2, ry: 0.27, rz: 0.2, lift: 0.72 }
        ];
        let pMax = 0;
        for (const bud of buds) {
            const p = ellipsoidField(x, y, z, bud.cx, bud.cy, bud.cz, bud.rx, bud.ry, bud.rz) * clear;
            if (p <= 0) continue;
            const bulb = Math.pow(p, 0.58);
            pMax = Math.max(pMax, p);
            addVec(out, (x - bud.cx) * bulb * 1.44 + bud.cx * p * 0.54, p * (0.42 + bud.lift * 0.28), (z - bud.cz) * bulb * 1.16, p);
        }
        const skirt = pC * smoothStep(0.78, 0.12, Math.hypot(x, z + 0.2));
        addVec(out, x * skirt * 0.62, skirt * 0.24, (z + 0.18) * skirt * 0.46, Math.max(pMax, skirt));
    } else if (primitive === 'craterMound' && pC > 0) {
        const craterDist = Math.hypot(x * 1.35, z + 0.18);
        const mound = pC;
        const rim = smoothStep(0.56, 0.34, craterDist) * smoothStep(0.09, 0.28, craterDist) * clear;
        const vent = smoothStep(0.24, 0.0, craterDist) * pC;
        const sideVent = Math.abs(Math.sin(Math.atan2(x, z + 0.18) * 5)) * rim;
        addVec(out, nx * mound * 0.82 + x * rim * 0.55, mound * 0.9 + rim * 3.15 - vent * 1.95, nz * mound * 0.68 + (z + 0.18) * rim * 0.52, Math.max(mound, rim, sideVent));
    } else if (primitive === 'branchingCoral') {
        const trunk = narrow * fullBand;
        const branchA = smoothStep(0.14, 0.0, Math.abs(Math.abs(x) - (0.22 + 0.18 * Math.sin((z + 0.72) * 5)))) * fullBand;
        const branchB = smoothStep(0.11, 0.0, Math.abs(Math.abs(x) - (0.42 + 0.1 * Math.cos((z + 0.4) * 8)))) * fullBand * smoothStep(-0.88, -0.2, z);
        const fork = Math.max(0, Math.sin((z + 0.95) * 15) + Math.cos(Math.abs(x) * 19) - 0.42);
        const p = Math.max(trunk * 0.78, branchA * 0.95, branchB * 0.78) * (0.86 + fork * 0.26);
        const branchReach = Math.max(branchA, branchB);
        const sidePush = Math.sign(x || 1) * branchReach * (1.38 + fork * 0.32);
        const antlerSplit = Math.sign(x || 1) * Math.pow(branchReach, 1.5) * Math.sin((z + 0.9) * 10) * 0.42;
        addVec(out, nx * p * 0.36 + sidePush + antlerSplit, trunk * 2.0 + branchReach * 1.58 + fork * branchReach * 0.42, nz * p * 0.42 - p * 0.12, p);
    } else if (primitive === 'oarfishRibbonSail') {
        const p = smoothStep(0.42, 0.0, Math.abs(x - Math.sin((z + 0.78) * 4.5) * 0.08)) * fullBand;
        const length = smoothStep(-1.04, -0.55, z) * smoothStep(0.68, 0.12, z);
        const comb = 0.68 + 0.32 * Math.abs(Math.sin((z + 1.0) * 19));
        const crest = smoothStep(0.18, 0.0, Math.abs(x - Math.sin((z + 0.78) * 4.5) * 0.08));
        addVec(out, Math.sin((z + 0.2) * 6) * p * 0.24, crest * length * (1.35 + comb * 0.5), -p * 0.42, p * length);
    } else if (primitive === 'jellyUmbrella') {
        const cap = ellipsoidField(x, y, z, 0, 0.82, -0.18, 0.78, 0.5, 0.66) * clear;
        const umbrella = Math.pow(cap, 0.54);
        const radial = Math.hypot(x * 0.9, z + 0.18);
        const scallop = 0.74 + Math.abs(Math.sin(Math.atan2(x, z + 0.18) * 10)) * 0.45;
        const brim = smoothStep(0.2, 0.76, radial) * cap;
        const underside = smoothStep(0.22, -0.14, y - 0.58) * brim;
        addVec(out, x * umbrella * 2.58 * scallop, umbrella * 1.35 - brim * 0.82 - underside * 0.36, (z + 0.18) * umbrella * 2.12 * scallop, cap);
    } else if (primitive === 'glowingFaultVein') {
        const topSkin = smoothStep(0.02, 0.82, y) * clear;
        const veinA = smoothStep(0.22, 0.0, Math.abs(x - Math.sin((z + 0.5) * 5.6) * 0.25)) * fullBand * topSkin;
        const veinB = smoothStep(0.16, 0.0, Math.abs(x + 0.32 + Math.sin((z + 0.2) * 7.2) * 0.14)) * fullBand * topSkin * smoothStep(-0.9, -0.16, z);
        const veinC = smoothStep(0.15, 0.0, Math.abs(x - 0.34 + Math.cos((z + 0.15) * 6.2) * 0.13)) * fullBand * topSkin * smoothStep(-0.66, 0.28, z);
        const node = Math.max(0, Math.sin((z + 0.92) * 20) + Math.cos(x * 13) - 0.42);
        const crack = Math.max(veinA, veinB, veinC) * (0.78 + node * 0.72);
        const split = Math.max(0, crack - 0.38);
        addVec(out, Math.sin(z * 8) * crack * 0.18, crack * 0.48 - split * 0.42, -crack * 0.22, crack);
    } else if (primitive === 'cerataFingerGarden') {
        const fingers = Math.max(
            ellipsoidField(x, y, z, 0.24, 0.82, -0.6, 0.18, 0.38, 0.2),
            ellipsoidField(x, y, z, -0.24, 0.82, -0.6, 0.18, 0.38, 0.2),
            ellipsoidField(x, y, z, 0.38, 0.86, -0.2, 0.19, 0.4, 0.22),
            ellipsoidField(x, y, z, -0.38, 0.86, -0.2, 0.19, 0.4, 0.22),
            ellipsoidField(x, y, z, 0.2, 0.84, 0.22, 0.16, 0.34, 0.19),
            ellipsoidField(x, y, z, -0.2, 0.84, 0.22, 0.16, 0.34, 0.19),
            ellipsoidField(x, y, z, 0.0, 0.9, -0.02, 0.15, 0.36, 0.18)
        ) * clear;
        const tip = Math.pow(fingers, 1.52);
        addVec(out, nx * fingers * 1.18 + x * tip * 1.08, fingers * 0.88 + tip * 0.22, nz * fingers * 1.08, fingers);
    } else if (primitive === 'pittedArmor') {
        const topSkin = smoothStep(0.04, 0.84, y) * clear;
        const cap = smoothStep(0.88, 0.0, Math.hypot(x * 0.82, z + 0.18)) * topSkin;
        const pitA = Math.max(
            smoothStep(0.26, 0.0, Math.hypot(x - 0.0, z + 0.48)),
            smoothStep(0.23, 0.0, Math.hypot(x - 0.34, z + 0.12)),
            smoothStep(0.23, 0.0, Math.hypot(x + 0.34, z + 0.12)),
            smoothStep(0.22, 0.0, Math.hypot(x - 0.18, z - 0.24)),
            smoothStep(0.22, 0.0, Math.hypot(x + 0.18, z - 0.24))
        ) * topSkin;
        const ring = Math.max(0, cap - pitA * 0.42);
        const craterLip = Math.max(0, ring - pitA * 0.16);
        addVec(out, nx * (cap * 1.15 + craterLip * 1.7) - nx * pitA * 0.42, cap * 0.34 + craterLip * 0.36 - pitA * 1.16, nz * (cap * 0.92 + craterLip * 1.35), Math.max(cap * 0.72, pitA));
    } else if (primitive === 'molaClavusPlate') {
        const rear = smoothStep(-0.36, -0.98, z) * smoothStep(0.98, 0.08, Math.abs(x)) * clear;
        const edge = smoothStep(0.36, 0.92, Math.abs(x)) * rear;
        const rudder = Math.pow(rear, 0.58);
        addVec(out, x * rudder * 2.45, rudder * 0.34 - edge * 0.16, -rudder * 1.35 + Math.abs(x) * edge * 0.34, rear);
    } else if (primitive === 'spiralParasiteShell') {
        const dome = ellipsoidField(x, y, z, 0, 0.78, -0.18, 0.56, 0.48, 0.54) * clear;
        const radial = Math.hypot(x, z + 0.18);
        const angle = Math.atan2(x, z + 0.18);
        const spiral = Math.pow(Math.max(0, Math.sin(angle * 2.4 + radial * 13.5 + 0.65)), 1.15) * dome;
        const twist = dome * 0.46 + spiral * 0.9;
        addVec(out, Math.sin(angle + radial * 4) * twist * 0.72, dome * 0.74 + spiral * 1.82, Math.cos(angle + radial * 4) * twist * 0.58, Math.max(dome, spiral));
    } else if (primitive === 'shellCap') {
        const topSkin = smoothStep(0.0, 0.86, y) * clear;
        const plateCenters = [-0.72, -0.46, -0.2, 0.06, 0.32];
        let plate = 0;
        let seam = 0;
        for (let pi = 0; pi < plateCenters.length; pi++) {
            const cz = plateCenters[pi];
            const width = 0.72 - Math.abs(pi - 2) * 0.08;
            const p = ellipsoidField(x, y, z, 0, 0.76 + pi * 0.025, cz, width, 0.34, 0.19) * topSkin;
            plate = Math.max(plate, p);
            seam = Math.max(seam, smoothStep(0.03, 0.0, Math.abs(z - (cz + 0.13))) * smoothStep(0.78, 0.0, Math.abs(x)) * topSkin);
        }
        const edge = smoothStep(0.52, 0.82, Math.abs(x)) * plate;
        const rib = Math.abs(Math.sin(x * 11)) * plate;
        addVec(out, nx * plate * 2.2 + x * edge * 0.7, plate * 0.56 + edge * 0.22 + rib * 0.1 - seam * 0.58, nz * plate * 1.12 - seam * 0.28, Math.max(plate, seam));
    } else if (primitive === 'sailfishBackSpear') {
        const topSkin = smoothStep(0.0, 0.88, y) * clear;
        const p = smoothStep(0.36, 0.0, Math.abs(x)) * fullBand * topSkin;
        const membrane = smoothStep(0.52, 0.0, Math.abs(x)) * fullBand * topSkin * smoothStep(-0.96, -0.18, z);
        const sharp = Math.pow(p, 1.42);
        const swept = smoothStep(-0.18, -0.88, z);
        addVec(out, Math.sin(z * 5) * sharp * 0.14, sharp * (3.1 + swept * 1.1) + membrane * 0.92, -sharp * (0.86 + swept * 0.88), Math.max(p, membrane));
    } else if (primitive === 'lionfishVenomRows') {
        const row = Math.max(
            ellipsoidField(x, y, z, 0.3, 0.84, -0.15, 0.12, 0.54, 0.76),
            ellipsoidField(x, y, z, -0.3, 0.84, -0.15, 0.12, 0.54, 0.76)
        ) * fullBand;
        const tooth = Math.pow(0.18 + 0.82 * Math.abs(Math.sin((z + 0.76) * 18)), 1.9);
        const p = row * tooth;
        addVec(out, nx * p * 0.64 + Math.sin(z * 13) * p * 0.1, p * 4.15, nz * p * 0.52 - p * 0.34, p);
    } else if (primitive === 'mantaSoftCrest') {
        const p = center * fullBand * (0.44 + 0.56 * Math.abs(Math.sin(z * 6.8)));
        const sway = Math.sin((z + 0.2) * 9) * p;
        const wing = smoothStep(0.12, 0.58, Math.abs(x)) * fullBand * smoothStep(0.92, 0.2, Math.abs(x));
        addVec(out, sway * 0.38 + x * wing * 0.62, p * 1.86 + wing * 0.52, sway * 0.28, Math.max(p, wing));
    } else if (primitive === 'urchinSpineField') {
        let b = Math.max(0, Math.cos(x * Math.PI * 5.2) * Math.sin((zNorm + 0.08) * Math.PI * 4.2) - 0.1);
        b = Math.pow(b, 1.18) * fullBand * smoothStep(0.68, 0.02, Math.abs(x));
        const needle = b * (0.72 + Math.abs(Math.sin((x - z) * 21)) * 0.46);
        addVec(out, nx * needle * 1.9, needle * 2.75, nz * needle * 1.9, needle);
    } else {
        let b = Math.max(0, Math.cos(x * Math.PI * 2.5) * Math.sin(zNorm * Math.PI * 3.0) - 0.2);
        b = Math.pow(b, 1.5);
        addVec(out, nx * b, ny * b, nz * b, b);
    }

    return out;
}

// --- 鲶鱼须几何 ---

export function appendCatfishBarbelsToGeometry(geo, anchorCandidates, baseColor, accentColor) {
    const posAttr = geo.attributes.position;
    const colorAttr = geo.attributes.color;
    const indices = Array.from(geo.index.array);
    const positions = Array.from(posAttr.array);
    const colors = Array.from(colorAttr.array);
    const box = new THREE.Box3().setFromBufferAttribute(posAttr);
    const size = new THREE.Vector3();
    box.getSize(size);
    const unit = Math.max(0.42, Math.min(0.68, Math.min(size.x, size.z) * 0.28));
    const barbelColor = new THREE.Color(0x8a6f3a).lerp(accentColor, 0.28);
    const rootColor = baseColor.clone().lerp(accentColor, 0.34);
    const tubularSegments = 5;
    const radialSegments = 4;
    const rootRadius = 0.03;
    const tipRadius = 0.007;

    const chooseAnchorIndex = (sign) => {
        const candidates = anchorCandidates.get(sign) || [];
        if (!candidates.length) return -1;
        candidates.sort((a, b) => a.score - b.score);
        return candidates[0].idx;
    };

    const pushColor = (color) => {
        colors.push(color.r, color.g, color.b);
    };

    for (let sign of [1, -1]) {
        const anchorIndex = chooseAnchorIndex(sign);
        if (anchorIndex < 0) continue;
        const anchor = new THREE.Vector3(
            posAttr.getX(anchorIndex),
            posAttr.getY(anchorIndex),
            posAttr.getZ(anchorIndex)
        );
        const specs = [
            { side: 1.18, down: -0.1, forward: 0.58, curl: 0.12, lift: 0.04 },
            { side: 1.0, down: -0.24, forward: 0.48, curl: -0.08, lift: -0.02 },
            { side: 0.68, down: -0.38, forward: 0.3, curl: 0.06, lift: -0.08 }
        ];

        for (const spec of specs) {
            const root = anchor.clone().add(new THREE.Vector3(sign * unit * 0.02, -unit * 0.01, unit * 0.02));
            const mid = anchor.clone().add(new THREE.Vector3(sign * unit * spec.side * 0.48, unit * (spec.down * 0.52 + spec.lift), unit * spec.forward * 0.68));
            const tip = anchor.clone().add(new THREE.Vector3(sign * unit * spec.side, unit * spec.down, unit * spec.forward + spec.curl * unit));
            const curve = new THREE.CatmullRomCurve3([root, mid, tip]);
            const tube = new THREE.TubeGeometry(curve, tubularSegments, rootRadius, radialSegments, false);
            const tubePos = tube.attributes.position;
            const ringSize = radialSegments + 1;
            const offset = positions.length / 3;

            for (let ring = 0; ring <= tubularSegments; ring++) {
                const t = ring / tubularSegments;
                const center = curve.getPointAt(t);
                const taper = THREE.MathUtils.lerp(1, tipRadius / rootRadius, Math.pow(t, 0.72));
                const color = rootColor.clone().lerp(barbelColor, smoothStep(0.0, 0.82, t));
                for (let j = 0; j < ringSize; j++) {
                    const idx = ring * ringSize + j;
                    positions.push(
                        center.x + (tubePos.getX(idx) - center.x) * taper,
                        center.y + (tubePos.getY(idx) - center.y) * taper,
                        center.z + (tubePos.getZ(idx) - center.z) * taper
                    );
                    pushColor(color);
                }
            }

            for (let i = 0; i < tube.index.count; i += 3) {
                indices.push(offset + tube.index.getX(i), offset + tube.index.getX(i + 1), offset + tube.index.getX(i + 2));
            }

            for (let j = 0; j < radialSegments; j++) {
                indices.push(anchorIndex, offset + j, offset + j + 1);
            }

            const tipCenterIndex = positions.length / 3;
            positions.push(tip.x, tip.y, tip.z);
            pushColor(barbelColor);
            const tipRing = offset + tubularSegments * ringSize;
            for (let j = 0; j < radialSegments; j++) {
                indices.push(tipCenterIndex, tipRing + j + 1, tipRing + j);
            }

            tube.dispose();
        }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
}

// --- 特征标记 ---

export function addFeatureMarkers(group, cHd, cSd, accentColor) {
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.5, metalness: 0, wireframe: isWireframeMode });

    if (cHd === 'GC') {
        const geo = new THREE.SphereGeometry(0.055, 8, 8);
        for (let sign of [1, -1]) {
            const n = new THREE.Mesh(geo, darkMat);
            n.position.set(sign * 0.1, -0.52, 1.55);
            n.scale.set(1.1, 0.76, 0.5);
            group.add(n);
        }
    }
}

// --- 万向张量核心方程 ---

export function applyTensorField(x, y, z, params, sign) {
    let cOx = sign * params.ox;
    let d = Math.hypot(x - cOx, y - params.oy, z - params.oz);
    if (d > params.rad) return { dx: 0, dy: 0, dz: 0, disp: 0 };

    let p = Math.max(0, 1.0 - d / params.rad);
    p = p * p * (3 - 2 * p);

    let ease = Math.pow(p, params.pow);
    let dx = 0, dy = 0, dz = 0;

    let localX = x - cOx;
    let localZ = z - params.oz;
    let twistAngle = ease * params.tw;

    let rotX = Math.cos(twistAngle)*localX - Math.sin(twistAngle)*localZ;
    let rotZ = Math.sin(twistAngle)*localX + Math.cos(twistAngle)*localZ;

    if (params.wv !== 0) {
        let waveDisp = Math.sin(Math.atan2(rotX, rotZ) * params.wv) * 0.2 * ease;
        dx += sign * rotX * waveDisp * 3.0;
        dz += rotZ * waveDisp * 3.0;
    } else {
        dx += sign * (rotX - localX);
        dz += (rotZ - localZ);
    }

    dx += sign * ease * params.sx;
    dy += ease * params.sy;
    dz += ease * params.sz;

    if (params.sz < 0) {
        dz += localZ * ease * params.sz;
    }

    if (params.dr !== 0) {
        dz -= Math.pow(ease, 1.8) * params.dr;
    }

    if (params.cav !== 0) {
        let frontMask = Math.max(0, 1.0 - Math.abs(localZ) / (params.rad * 0.6));
        frontMask = frontMask * frontMask * (3 - 2 * frontMask);
        dz -= Math.sin(ease * Math.PI) * params.cav * frontMask;
    }

    if (params.blb !== 0) {
        let tip = Math.pow(p, 6.0);
        dx += sign * tip * params.blb;
        dy += tip * params.blb;
        dz += tip * params.blb;
    }

    return { dx, dy, dz, disp: p };
}

// --- 主构建函数 ---

export function buildCreature() {
    if (currentGroup) {
        scene.remove(currentGroup);
        currentGroup.traverse((c) => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } });
    }
    const newGroup = new THREE.Group();
    const newFloatWrapper = new THREE.Group();
    newGroup.add(newFloatWrapper);
    setCurrentGroup(newGroup);
    setFloatWrapper(newFloatWrapper);

    const cEl = currentDNA[0].join(''); const pal = PALETTES[cEl];
    const cSh = currentDNA[1].join(''); const shp = BODY_SHAPES[cSh];
    const cHd = currentDNA[2].join(''); const headParams = HEAD_TENSORS[cHd];
    const cSd = currentDNA[3].join(''); const sideParams = SIDE_TENSORS[cSd];
    const cBk = currentDNA[4].join(''); const backParams = BACK_TENSORS[cBk];
    const patId = PATTERNS[BASES.indexOf(currentDNA[5][0])*4 + BASES.indexOf(currentDNA[5][1])];
    const rand = seededRandom(hashString(`tensor-lab-v31:${dnaSignature()}`));

    const baseColor = new THREE.Color(pal.b[Math.floor(rand() * pal.b.length)]);
    const accentColor = new THREE.Color(pal.a[Math.floor(rand() * pal.a.length)]);

    document.body.style.background = `radial-gradient(circle at center, ${cEl==='GG'?'#1e293b':'#ffffff'}, ${pal.bg})`;

    const vinylMat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.75, metalness: 0.0, side: THREE.FrontSide, wireframe: isWireframeMode
    });

    let wSegments = 40, hSegments = 24;
    if (cHd === 'AA' || cHd === 'CC' || cHd === 'GC' || cSd === 'CC' || cSd === 'AT' || cBk !== 'AA') {
        wSegments = 42; hSegments = 24;
    }

    const geo = new THREE.SphereGeometry(1.0, wSegments, hSegments);
    let pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const eyeOrigin = new THREE.Vector3(0.35, 0.15, 0.85);
    const blushOrigin = new THREE.Vector3(0.45, -0.05, 0.75);
    let leftEyeIdx = -1, rightEyeIdx = -1, leftEyeDist = 999, rightEyeDist = 999;
    const catfishAnchorCandidates = new Map([[1, []], [-1, []]]);

    for(let i=0; i<pos.count; i++) {
        let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);

        let dL = Math.hypot(x - eyeOrigin.x, y - eyeOrigin.y, z - eyeOrigin.z);
        if (dL < leftEyeDist) { leftEyeDist = dL; leftEyeIdx = i; }
        let dR = Math.hypot(x + eyeOrigin.x, y - eyeOrigin.y, z - eyeOrigin.z);
        if (dR < rightEyeDist) { rightEyeDist = dR; rightEyeIdx = i; }

        let nx = x, ny = y, nz = z; let zNorm = z;

        let taper = 0.5 + (zNorm + 1.0) / 4.0;
        const bodyExpr = getExprTier(currentExpression[1]).visual;
        const bodyField = applyBodyBlueprint(x, y, z, cSh, shp, taper);
        let baseX = x * taper * shp.sx + (bodyField.x - x * taper * shp.sx) * bodyExpr;
        let baseY = y * taper * shp.sy + (bodyField.y - y * taper * shp.sy) * bodyExpr;
        let baseZ = z * shp.sz + (bodyField.z - z * shp.sz) * bodyExpr;

        let disp = 0;

        const headExpr = getExprTier(currentExpression[2]).visual;
        let headField = applyHeadBlueprint(x, y, z, cHd, headParams);
        baseX += headField.dx * headExpr; baseY += headField.dy * headExpr; baseZ += headField.dz * headExpr; disp = Math.max(disp, headField.disp * headExpr);

        if (cHd === 'CA' && z > 0.52 && y < 0.26 && y > -0.58) {
            for (let sign of [1, -1]) {
                if (sign * x < 0.02) continue;
                const score = ((x - sign * 0.24) / 0.22) ** 2 + ((y + 0.13) / 0.32) ** 2 + ((z - 0.86) / 0.22) ** 2;
                catfishAnchorCandidates.get(sign).push({ idx: i, score });
            }
        }

        const sideExpr = getExprTier(currentExpression[3]).visual;
        let sideField = applySideBlueprint(x, y, z, cSd, sideParams, cHd);
        baseX += sideField.dx * sideExpr; baseY += sideField.dy * sideExpr; baseZ += sideField.dz * sideExpr; disp = Math.max(disp, sideField.disp * sideExpr);

        const backExpr = getExprTier(currentExpression[4]).visual;
        let backField = applyBackBlueprint(x, y, z, baseY, cBk, backParams, nx, ny, nz, zNorm, cHd);
        baseX += backField.dx * backExpr; baseY += backField.dy * backExpr; baseZ += backField.dz * backExpr; disp = Math.max(disp, backField.disp * backExpr);

        let bottomLimit = -0.3;
        if (baseY < bottomLimit) {
            let squash = bottomLimit - baseY;
            baseY = bottomLimit;
            baseX += squash * 0.8 * baseX;
            baseZ += squash * 0.4 * baseZ;
        }

        pos.setXYZ(i, baseX, baseY, baseZ);

        let cMix = smoothStep(0.1, 0.7, disp);
        let r = THREE.MathUtils.lerp(baseColor.r, accentColor.r, cMix);
        let g = THREE.MathUtils.lerp(baseColor.g, accentColor.g, cMix);
        let b = THREE.MathUtils.lerp(baseColor.b, accentColor.b, cMix);

        const patternStrength = smoothStep(0.72, 0.25, disp);
        if (patId === 'polka_dots' && patternStrength > 0.45) {
            if (Math.sin(x*5) * Math.cos(z*5) > 0.6) { r=accentColor.r; g=accentColor.g; b=accentColor.b; }
        } else if (patId === 'stripes' && patternStrength > 0.45) {
            if (Math.sin(x*8 + z*8) > 0.5) { r=accentColor.r; g=accentColor.g; b=accentColor.b; }
        } else if (patId === 'voronoi' && patternStrength > 0.45) {
            if (Math.sin(x*10) * Math.sin(y*10) * Math.sin(z*10) > 0.2) { r=accentColor.r; g=accentColor.g; b=accentColor.b; }
        } else if (patId === 'zebra' && patternStrength > 0.45) {
            if (Math.sin(x*15 + Math.sin(z*5)*5) > 0.5) { r=accentColor.r; g=accentColor.g; b=accentColor.b; }
        } else if (patId === 'gradient') {
            let grad = smoothStep(-1.0, 1.0, z);
            r = THREE.MathUtils.lerp(r, accentColor.r, grad * patternStrength);
            g = THREE.MathUtils.lerp(g, accentColor.g, grad * patternStrength);
            b = THREE.MathUtils.lerp(b, accentColor.b, grad * patternStrength);
        }

        if (cHd === 'CA') {
            let whiskerRoot = 0;
            let whiskerLine = 0;
            for (let sign of [1, -1]) {
                for (const strandSpec of CATFISH_BARBEL_FIELDS) {
                    const q = ellipsoidField(x, y, z, sign * strandSpec.cx, strandSpec.oy, strandSpec.oz, strandSpec.rx * 1.06, strandSpec.ry * 1.08, strandSpec.rz * 1.05);
                    if (q <= 0) continue;
                    const rib = Math.abs(Math.sin((y - strandSpec.oy) * 34 + (z - strandSpec.oz) * 13 + strandSpec.phase)) * Math.pow(q, 1.2);
                    whiskerRoot = Math.max(whiskerRoot, q);
                    whiskerLine = Math.max(whiskerLine, rib);
                }
            }
            if (whiskerRoot > 0) {
                const softTint = Math.min(0.28, Math.pow(whiskerRoot, 1.25) * 0.28);
                const lineTint = Math.min(0.42, whiskerLine * 0.42);
                r = THREE.MathUtils.lerp(r, baseColor.r * 0.72 + accentColor.r * 0.28, softTint);
                g = THREE.MathUtils.lerp(g, baseColor.g * 0.72 + accentColor.g * 0.28, softTint);
                b = THREE.MathUtils.lerp(b, baseColor.b * 0.72 + accentColor.b * 0.28, softTint);
                r = THREE.MathUtils.lerp(r, accentColor.r, lineTint);
                g = THREE.MathUtils.lerp(g, accentColor.g, lineTint);
                b = THREE.MathUtils.lerp(b, accentColor.b, lineTint);
            }
        }

        if (cBk === 'AG' || cBk === 'CT' || cBk === 'GA' || cBk === 'CG' || cBk === 'TC' || cBk === 'GC') {
            const dorsalBand = smoothStep(-1.0, -0.25, z) * smoothStep(0.72, -0.04, z) * smoothStep(0.0, 0.86, y);
            if (cBk === 'AG') {
                const pits = Math.max(
                    smoothStep(0.26, 0.0, Math.hypot(x - 0.0, z + 0.48)),
                    smoothStep(0.23, 0.0, Math.hypot(x - 0.34, z + 0.12)),
                    smoothStep(0.23, 0.0, Math.hypot(x + 0.34, z + 0.12)),
                    smoothStep(0.22, 0.0, Math.hypot(x - 0.18, z - 0.24)),
                    smoothStep(0.22, 0.0, Math.hypot(x + 0.18, z - 0.24))
                ) * smoothStep(0.0, 0.86, y);
                const rimInk = Math.min(0.72, Math.max(0, dorsalBand - pits * 0.22) * 0.72);
                const pitInk = Math.min(0.92, Math.pow(pits, 0.72) * 0.92);
                r = THREE.MathUtils.lerp(r, accentColor.r, rimInk); g = THREE.MathUtils.lerp(g, accentColor.g, rimInk); b = THREE.MathUtils.lerp(b, accentColor.b, rimInk);
                r = THREE.MathUtils.lerp(r, 0.035, pitInk); g = THREE.MathUtils.lerp(g, 0.045, pitInk); b = THREE.MathUtils.lerp(b, 0.06, pitInk);
            } else if (cBk === 'CT') {
                const vein = Math.max(
                    smoothStep(0.22, 0.0, Math.abs(x - Math.sin((z + 0.5) * 5.6) * 0.25)) * dorsalBand,
                    smoothStep(0.16, 0.0, Math.abs(x + 0.32 + Math.sin((z + 0.2) * 7.2) * 0.14)) * dorsalBand,
                    smoothStep(0.15, 0.0, Math.abs(x - 0.34 + Math.cos((z + 0.15) * 6.2) * 0.13)) * dorsalBand
                );
                const glow = Math.min(0.96, Math.pow(vein, 0.56) * 0.96);
                const darkRift = Math.min(0.36, Math.pow(vein, 1.9) * 0.36);
                r = THREE.MathUtils.lerp(r, 0.02, darkRift); g = THREE.MathUtils.lerp(g, 0.025, darkRift); b = THREE.MathUtils.lerp(b, 0.04, darkRift);
                r = THREE.MathUtils.lerp(r, accentColor.r, glow); g = THREE.MathUtils.lerp(g, accentColor.g, glow); b = THREE.MathUtils.lerp(b, accentColor.b, glow);
            } else if (cBk === 'GA') {
                const plateCenters = [-0.72, -0.46, -0.2, 0.06, 0.32];
                let shell = 0; let seam = 0;
                for (let pi = 0; pi < plateCenters.length; pi++) {
                    const cz = plateCenters[pi];
                    const width = 0.72 - Math.abs(pi - 2) * 0.08;
                    shell = Math.max(shell, ellipsoidField(x, y, z, 0, 0.76 + pi * 0.025, cz, width, 0.34, 0.19) * smoothStep(0.0, 0.86, y));
                    seam = Math.max(seam, smoothStep(0.035, 0.0, Math.abs(z - (cz + 0.13))) * smoothStep(0.78, 0.0, Math.abs(x)) * smoothStep(0.0, 0.86, y));
                }
                const shellTint = Math.min(0.5, shell * 0.5);
                const seamTint = Math.min(0.86, seam * 0.86);
                r = THREE.MathUtils.lerp(r, baseColor.r * 0.76 + accentColor.r * 0.24, shellTint); g = THREE.MathUtils.lerp(g, baseColor.g * 0.76 + accentColor.g * 0.24, shellTint); b = THREE.MathUtils.lerp(b, baseColor.b * 0.76 + accentColor.b * 0.24, shellTint);
                r = THREE.MathUtils.lerp(r, 0.08 + accentColor.r * 0.22, seamTint); g = THREE.MathUtils.lerp(g, 0.08 + accentColor.g * 0.22, seamTint); b = THREE.MathUtils.lerp(b, 0.08 + accentColor.b * 0.22, seamTint);
            } else if (cBk === 'CG') {
                const radial = Math.hypot(x, z + 0.18);
                const angle = Math.atan2(x, z + 0.18);
                const spiral = Math.pow(Math.max(0, Math.sin(angle * 2.4 + radial * 13.5 + 0.65)), 1.15) * smoothStep(0.64, 0.0, radial) * smoothStep(0.0, 0.86, y);
                const spiralTint = Math.min(0.68, spiral * 0.68);
                r = THREE.MathUtils.lerp(r, accentColor.r, spiralTint); g = THREE.MathUtils.lerp(g, accentColor.g, spiralTint); b = THREE.MathUtils.lerp(b, accentColor.b, spiralTint);
            } else if (cBk === 'TC') {
                const radial = Math.hypot(x * 0.9, z + 0.18);
                const ribs = Math.abs(Math.sin(Math.atan2(x, z + 0.18) * 10)) * smoothStep(0.9, 0.0, radial) * smoothStep(0.0, 0.86, y);
                const ribTint = Math.min(0.44, ribs * 0.44);
                r = THREE.MathUtils.lerp(r, accentColor.r, ribTint); g = THREE.MathUtils.lerp(g, accentColor.g, ribTint); b = THREE.MathUtils.lerp(b, accentColor.b, ribTint);
            } else if (cBk === 'GC') {
                const rowTint = Math.max(
                    ellipsoidField(x, y, z, 0.3, 0.84, -0.15, 0.14, 0.58, 0.8),
                    ellipsoidField(x, y, z, -0.3, 0.84, -0.15, 0.14, 0.58, 0.8)
                ) * dorsalBand;
                const venom = Math.min(0.62, rowTint * Math.abs(Math.sin((z + 0.76) * 18)) * 0.62);
                r = THREE.MathUtils.lerp(r, accentColor.r, venom); g = THREE.MathUtils.lerp(g, accentColor.g, venom); b = THREE.MathUtils.lerp(b, accentColor.b, venom);
            }
        }

        let dB = Math.min(Math.hypot(x-blushOrigin.x, y-blushOrigin.y, z-blushOrigin.z), Math.hypot(x+blushOrigin.x, y-blushOrigin.y, z-blushOrigin.z));
        let bMix = Math.max(0, 1.0 - dB/0.25);
        if (bMix > 0) { r += (0.95-r)*bMix; g += (0.3-g)*bMix; b += (0.5-b)*bMix; }

        colors[i*3] = r; colors[i*3+1] = g; colors[i*3+2] = b;
    }

    if (cHd === 'CA') {
        appendCatfishBarbelsToGeometry(geo, catfishAnchorCandidates, baseColor, accentColor);
        pos = geo.attributes.position;
    }

    geo.deleteAttribute('normal');
    geo.computeVertexNormals();
    const toyMesh = new THREE.Mesh(geo, vinylMat); toyMesh.castShadow = true; newFloatWrapper.add(toyMesh);

    const eyeMat = new THREE.MeshStandardMaterial({color: 0x050505, roughness: 0.1, metalness: 0.3, wireframe: isWireframeMode});
    const hlMat = new THREE.MeshBasicMaterial({color: 0xffffff});

    const eyeGeo = new THREE.SphereGeometry(0.12, 10, 10); eyeGeo.scale(0.8, 1.25, 0.5);
    const eyeGroup = new THREE.Group();
    eyeGroup.add(new THREE.Mesh(eyeGeo, eyeMat));
    const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), hlMat); hl1.position.set(0.03, 0.06, 0.045); eyeGroup.add(hl1);
    const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), hlMat); hl2.position.set(-0.03, -0.05, 0.045); eyeGroup.add(hl2);

    [leftEyeIdx, rightEyeIdx].forEach((idx) => {
        let p = new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx)), n = new THREE.Vector3(geo.attributes.normal.getX(idx), geo.attributes.normal.getY(idx), geo.attributes.normal.getZ(idx));
        const e = eyeGroup.clone(); e.position.copy(p); e.lookAt(p.clone().add(n)); e.position.addScaledVector(n, -0.01); newFloatWrapper.add(e);
    });

    addFeatureMarkers(newFloatWrapper, cHd, cSd, accentColor);

    scene.add(newGroup);

    setExportableModel(newFloatWrapper);

    let faceCount = 0;
    newFloatWrapper.traverse((c) => { if (c.isMesh && c.geometry) faceCount += (c.geometry.index ? c.geometry.index.count : c.geometry.attributes.position.count) / 3; });
    const polyEl = document.getElementById('poly-count');
    if (polyEl) polyEl.innerText = faceCount.toLocaleString() + " 面";
}
