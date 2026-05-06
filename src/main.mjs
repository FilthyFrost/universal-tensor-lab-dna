// =====================================================================
// 🎯 主入口 — 场景初始化、UI、游戏动作、竞技场 UI、动画循环
// =====================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import {
    currentDNA, currentExpression, setCurrentDNA, setCurrentExpression,
    scene, camera, renderer, controls, setSceneGlobals,
    currentGroup, floatWrapper, setCurrentGroup, setFloatWrapper,
    game, arenaState, setArenaState, bScene, setBScene
} from './state.mjs';
import { PALETTES, HEAD_PRIMITIVES, SIDE_PRIMITIVES, DORSAL_PRIMITIVES, HEAD_CONTRACTS } from './dna-constants.mjs';
import {
    RARITY_COLORS, RARITY_LABELS, GENE_LABELS, getExprTier, getGeneRarity,
    GENE_BASE_SCORE, COLOR_GENE_BONUS,
    STAT_NAMES_7, STAT_LABELS_7, STAT_ICONS_7, CHASSIS_ROLE,
    MUTATIONS, INJURIES, BIRTH_DEFECTS, SCAR_GENES,
    ARENA_DIFFICULTY, INJURY_TIERS,
    HEALER_COST_PER_INJURY, FAILSAFE_CLEAN_REWARD,
    SMUGGLER_VISIT_CHANCE, SMUGGLER_MIN_INTERVAL,
    RESEARCH_TREE, WAVE_TIERS, getAgeStage
} from './game-constants.mjs';
import { buildCreature } from './creature-builder.mjs';
import {
    getTraitName, normalizeDNACodes, calcCreatureValue, calcBreedCost, getHighestRarity,
    createCreature, generateWildDNA, breedCreatures, calcComboMultiplier, calcBaseValue,
    generateNPC, generateArenaOpponents, calcArenaReward,
    calcCreatureStats, getCreatureSkills, checkGeneCompatibility,
    applySkillEffect, tickBuffs, npcChooseSkill,
    rollInjury, rollInjuryTier, detectSynergies,
    cloneCreature, getCloneCost, healInjury,
    skipDay, generateSmugglerStock,
    STAT_NAMES
} from './game-logic.mjs';

// --- 渲染器初始化 ---

const container = document.getElementById('canvas-container');
const _scene = new THREE.Scene();
const cW = container.clientWidth || 800, cH = container.clientHeight || 600;
const _camera = new THREE.PerspectiveCamera(45, cW / cH, 0.1, 100);
_camera.position.set(0, 3, 7.5);
const _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
_renderer.setSize(cW, cH);
_renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
_renderer.toneMapping = THREE.ACESFilmicToneMapping;
_renderer.shadowMap.enabled = true;
_renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(_renderer.domElement);

const _controls = new OrbitControls(_camera, _renderer.domElement);
_controls.enableDamping = true;

const pmremGenerator = new THREE.PMREMGenerator(_renderer);
_scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

const mainLight = new THREE.DirectionalLight(0xffffff, 1.3); mainLight.position.set(5, 10, 5); mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 1024; mainLight.shadow.mapSize.height = 1024;
_scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
fillLight.position.set(-5, 4, -5);
_scene.add(fillLight);
_scene.add(new THREE.AmbientLight(0xffffff, 0.6));

setSceneGlobals(_scene, _camera, _renderer, _controls);

// --- 实验室平台 ---
const PLATFORM_RADIUS = 5;
const platformGeo = new THREE.CylinderGeometry(PLATFORM_RADIUS, PLATFORM_RADIUS + 0.3, 0.15, 48);
const platformMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
const platform = new THREE.Mesh(platformGeo, platformMat);
platform.position.y = -0.08; platform.receiveShadow = true;
_scene.add(platform);
// 发光边缘环
const ringGeo = new THREE.TorusGeometry(PLATFORM_RADIUS + 0.15, 0.04, 8, 64);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6 });
const ringMesh = new THREE.Mesh(ringGeo, ringMat);
ringMesh.rotation.x = -Math.PI / 2; ringMesh.position.y = 0.01;
_scene.add(ringMesh);

// --- 基因搅拌机 3D ---
const blender = {
    state: 'empty', // empty | one | ready | mixing
    slots: [null, null],
    group: new THREE.Group(),
    jar: null, glowRing: null, safetyDays: 0
};
(function buildBlender() {
    const g = blender.group;
    g.position.set(0, 0, 0);
    // 底座
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.65, 0.25, 16),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.9 })
    );
    base.position.y = 0.12; base.castShadow = true;
    g.add(base);
    // 玻璃罐
    const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.5, 0.9, 16, 1, true),
        new THREE.MeshPhysicalMaterial({ color: 0x88ccff, transparent: true, opacity: 0.15, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide })
    );
    jar.position.y = 0.7; blender.jar = jar;
    g.add(jar);
    // 顶盖
    const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.45, 0.08, 16),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.8 })
    );
    lid.position.y = 1.18;
    g.add(lid);
    // 排气管
    const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 })
    );
    pipe.position.set(0.2, 1.35, 0);
    g.add(pipe);
    // 发光底环
    const gRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.03, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.3 })
    );
    gRing.rotation.x = -Math.PI / 2; gRing.position.y = 0.02;
    blender.glowRing = gRing;
    g.add(gRing);
    _scene.add(g);
})();

// 搅拌机内的迷你生物球
const blenderBalls = [];
function addBlenderBall(palColor) {
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(palColor) })
    );
    ball.position.set((Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3);
    blender.group.add(ball);
    blenderBalls.push(ball);
}
function clearBlenderBalls() {
    blenderBalls.forEach(b => { blender.group.remove(b); b.geometry.dispose(); b.material.dispose(); });
    blenderBalls.length = 0;
}
function updateBlenderVisuals() {
    const col = blender.state === 'empty' ? 0x334155 : blender.state === 'one' ? 0xfbbf24 : blender.state === 'ready' ? 0x22c55e : 0xef4444;
    blender.glowRing.material.color.setHex(col);
    blender.glowRing.material.opacity = blender.state === 'empty' ? 0.3 : 0.7;
    blender.jar.material.opacity = blender.state === 'mixing' ? 0.35 : 0.15;
    // 搅拌中: 罐子内球体旋转
    if (blender.state === 'mixing') {
        const t = Date.now() * 0.005;
        blenderBalls.forEach((b, i) => {
            b.position.x = Math.cos(t + i * 2) * 0.25;
            b.position.z = Math.sin(t + i * 2) * 0.25;
            b.position.y = 0.5 + Math.sin(t * 2 + i) * 0.15;
        });
    }
}

// 搅拌机UI标签 (费用/状态)
function updateBlenderLabel() {
    let existing = document.getElementById('blender-label');
    if (!existing) {
        existing = document.createElement('div');
        existing.id = 'blender-label';
        existing.style.cssText = 'position:absolute;z-index:20;pointer-events:none;text-align:center;font-weight:900;font-size:11px;color:#fbbf24;text-shadow:0 2px 8px rgba(0,0,0,0.8);transform:translate(-50%,-100%);white-space:nowrap;';
        document.getElementById('game-container').appendChild(existing);
    }
    const pos = blender.group.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    const v = pos.clone().project(_camera);
    const container = document.getElementById('game-container');
    existing.style.left = ((v.x * 0.5 + 0.5) * container.clientWidth) + 'px';
    existing.style.top = ((-v.y * 0.5 + 0.5) * container.clientHeight) + 'px';

    if (blender.state === 'empty') {
        existing.textContent = `安全生产 ${blender.safetyDays} 天`;
        existing.style.color = '#64748b';
    } else if (blender.state === 'one') {
        existing.textContent = '等待第二只...';
        existing.style.color = '#fbbf24';
    } else if (blender.state === 'ready') {
        const a = game.inventory.find(c => c.id === blender.slots[0]);
        const b = game.inventory.find(c => c.id === blender.slots[1]);
        const cost = (a && b) ? calcBreedCost(a, b) : '?';
        const compat = (a && b) ? checkGeneCompatibility(a, b) : { type: 'neutral' };
        let txt = `搅拌! -${cost}g`;
        if (compat.type === 'synergy') txt += ` ✨${compat.n}`;
        if (compat.type === 'conflict') txt += ` ⚠${compat.n}`;
        existing.textContent = txt;
        existing.style.color = compat.type === 'conflict' ? '#ef4444' : '#22c55e';
        existing.style.pointerEvents = 'auto';
        existing.style.cursor = 'pointer';
        existing.onclick = doBlenderBreed;
    } else if (blender.state === 'mixing') {
        existing.textContent = '搅拌中...';
        existing.style.color = '#ef4444';
        existing.style.pointerEvents = 'none';
    }
    if (blender.state !== 'ready') { existing.style.pointerEvents = 'none'; existing.onclick = null; }
}

function addToBlender(creatureId) {
    const creature = game.inventory.find(c => c.id === creatureId);
    if (!creature) return;
    const age = getAgeStage(creature.age ?? 0);
    if (age.name === '幼崽' || age.name === '少年') {
        showToast(age.name === '幼崽' ? '幼崽太小了，不能繁殖!' : '少年还没长大!');
        return;
    }
    if (blender.slots[0] === creatureId || blender.slots[1] === creatureId) {
        showToast('已经在搅拌机里了!');
        return;
    }
    if (blender.slots[0] !== null && blender.slots[1] !== null) {
        showToast('搅拌机已满!');
        return;
    }
    // 吞入动画: 生物缩小消失
    const entity = displayEntities.get(creatureId);
    if (entity && entity.group) {
        const grp = entity.group;
        const startScale = grp.scale.x;
        const startPos = grp.position.clone();
        const targetPos = blender.group.position.clone().add(new THREE.Vector3(0, 0.7, 0));
        const startTime = Date.now();
        function suckIn() {
            const t = Math.min(1, (Date.now() - startTime) / 400);
            grp.position.lerpVectors(startPos, targetPos, t * t);
            grp.scale.setScalar(startScale * (1 - t));
            grp.rotation.y += 0.2;
            if (t < 1) requestAnimationFrame(suckIn);
            else { _scene.remove(grp); }
        }
        requestAnimationFrame(suckIn);
    }

    const pal = PALETTES[creature.dna[0]];
    addBlenderBall(pal.border);

    if (blender.slots[0] === null) {
        blender.slots[0] = creatureId;
        blender.state = 'one';
    } else {
        blender.slots[1] = creatureId;
        blender.state = 'ready';
    }
    if (selectedCreatureId === creatureId) deselectCreature();
}

function doBlenderBreed() {
    if (blender.state !== 'ready') return;
    const parentA = game.inventory.find(c => c.id === blender.slots[0]);
    const parentB = game.inventory.find(c => c.id === blender.slots[1]);
    if (!parentA || !parentB) { resetBlender(); return; }
    if (parentA.id === parentB.id) { showToast('不能自交! 上次有人试过，我们失去了一个实验室。'); resetBlender(); return; }
    const cost = calcBreedCost(parentA, parentB);
    if (game.coins < cost) { showToast('金币不足!'); return; }
    if (game.inventory.length >= 8) { showToast('库存已满!'); return; }

    game.coins -= cost;
    if (game.useCatalyst === 'expr' && game.catalysts.expr > 0) game.catalysts.expr--;
    else if (game.useCatalyst === 'mutate' && game.catalysts.mutate > 0) game.catalysts.mutate--;
    const activeCatalyst = game.useCatalyst;
    game.useCatalyst = null;

    blender.state = 'mixing';

    // 搅拌动画
    const startTime = Date.now();
    const mixDuration = 1500;
    const origPos = blender.group.position.clone();
    function mixAnim() {
        const t = (Date.now() - startTime) / mixDuration;
        // 震动
        blender.group.position.x = origPos.x + (Math.random() - 0.5) * 0.06 * Math.min(1, t * 3);
        blender.group.position.z = origPos.z + (Math.random() - 0.5) * 0.06 * Math.min(1, t * 3);
        // 罐子颜色变化
        const hue = t * 2 % 1;
        blender.jar.material.color.setHSL(hue, 0.6, 0.7);
        blender.jar.material.opacity = 0.15 + t * 0.25;
        if (t < 1) requestAnimationFrame(mixAnim);
        else {
            blender.group.position.copy(origPos);
            blender.jar.material.color.setHex(0x88ccff);
            blender.jar.material.opacity = 0.15;
            finishBlenderBreed(parentA, parentB, activeCatalyst);
        }
    }
    requestAnimationFrame(mixAnim);
    renderHUD();
}

function finishBlenderBreed(parentA, parentB, catalyst) {
    const child = breedCreatures(parentA, parentB, catalyst);
    const compat = checkGeneCompatibility(parentA, parentB);

    // 亲本老化
    // parents consumed by blender — no aging needed
    // (parents are consumed by blender)

    // 缺陷检查 → 安全天数
    if (child.defects.length > 0) {
        blender.safetyDays = 0;
    } else {
        blender.safetyDays++;
    }

    resetBlender();
    // 刷新亲本回到场景
    refreshDisplayCreatures();
    renderHUD();

    // 开始reveal
    startRevealSequence(child.dna, child.expression, child);

    // reveal后的缺陷/突变toast
    if (child.defects.length > 0) {
        const defNames = child.defects.map(id => {
            const d = BIRTH_DEFECTS.find(x => x.id === id);
            return d ? d.n : id;
        }).join(', ');
        setTimeout(() => showToast(`出产品检验...不合格...算了，发货吧: ${defNames}`), 4500);
    }
    const mutNames = Object.values(child.mutations).filter(Boolean).map(m => m.n);
    if (mutNames.length > 0) {
        setTimeout(() => showToast(`突变检出: ${mutNames.join(', ')}`), 5500);
    }
    if (compat.type === 'synergy') {
        setTimeout(() => showToast(`✨ ${compat.n}: ${compat.desc}`), 3500);
    } else if (compat.type === 'conflict') {
        setTimeout(() => showToast(`⚠ ${compat.n}: ${compat.desc}`), 3500);
    }
}

function resetBlender() {
    blender.slots = [null, null];
    blender.state = 'empty';
    clearBlenderBalls();
    refreshDisplayCreatures();
}

// 相机初始位置 — 俯视全景
_camera.position.set(0, 6, 8);
_camera.lookAt(0, 0, 0);
_controls.target.set(0, 0, 0);

// --- 多生物显示 + 漫步系统 ---
const displayEntities = new Map(); // creatureId → { group, targetPos, velocity, creature }
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedCreatureId = null;

// --- 拖拽系统 ---
let dragState = null; // null or { creatureId, group, startTime }
let isDragging = false;
const cameraHome = { pos: new THREE.Vector3(0, 6, 8), target: new THREE.Vector3(0, 0, 0) };

function buildCreatureForDisplay(creature) {
    const savedDNA = currentDNA.map(g => [...g]);
    const savedExpr = [...currentExpression];
    const savedGroup = currentGroup;
    const savedWrapper = floatWrapper;
    setCurrentGroup(null); setFloatWrapper(null);
    setCurrentExpression(creature.expression || [1,1,1,1,1,1]);
    setCurrentDNA(normalizeDNACodes(creature.dna));
    buildCreature();
    const group = currentGroup;
    if (group) _scene.remove(group);
    setCurrentGroup(savedGroup); setFloatWrapper(savedWrapper);
    setCurrentDNA(savedDNA); setCurrentExpression(savedExpr);
    if (group) {
        const age = getAgeStage(creature.age ?? 0);
        const baseScale = age.name === '幼崽' ? 0.2 : age.name === '少年' ? 0.28 : 0.35;
        group.scale.setScalar(baseScale);
        group.userData.creatureId = creature.id;
        group.userData.baseScale = baseScale;
    }
    return group;
}

function randomPlatformPos() {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (PLATFORM_RADIUS - 1);
    return new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
}

function refreshDisplayCreatures() {
    // Remove groups for creatures no longer in inventory
    for (const [id, entity] of displayEntities) {
        if (!game.inventory.find(c => c.id === id)) {
            _scene.remove(entity.group);
            entity.group.traverse(c => { if (c.isMesh) { c.geometry?.dispose(); c.material?.dispose(); } });
            displayEntities.delete(id);
        }
    }
    // Add groups for new creatures
    for (const creature of game.inventory) {
        if (!displayEntities.has(creature.id)) {
            const group = buildCreatureForDisplay(creature);
            if (group) {
                const pos = randomPlatformPos();
                group.position.copy(pos);
                _scene.add(group);
                displayEntities.set(creature.id, {
                    group, creature,
                    targetPos: randomPlatformPos(),
                    speed: 0.003 + Math.random() * 0.004
                });
            }
        }
    }
}

function updateWandering(dt) {
    for (const [id, entity] of displayEntities) {
        if (id === selectedCreatureId) {
            // Selected: idle breathing, no wandering
            const t = Date.now() * 0.001;
            entity.group.scale.setScalar(0.38 + Math.sin(t * 3) * 0.01);
            continue;
        }
        const { group, targetPos, speed } = entity;
        const dx = targetPos.x - group.position.x;
        const dz = targetPos.z - group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.2) {
            entity.targetPos = randomPlatformPos();
        } else {
            group.position.x += (dx / dist) * speed;
            group.position.z += (dz / dist) * speed;
            // Face movement direction
            const targetAngle = Math.atan2(dx, dz);
            group.rotation.y += (targetAngle - group.rotation.y) * 0.05;
        }
        // Idle breathing
        const t = Date.now() * 0.001 + id;
        const bs = group.userData.baseScale || 0.35;
        group.scale.setScalar(bs + Math.sin(t * 2.5) * 0.008);
    }
}

// --- 鼠标交互: 点击选择 + 长按拖拽到搅拌机 ---
let mouseDownTime = 0;
let mouseDownId = null;
let mouseMoved = false;

function getHitCreatureId(event) {
    const rect = _renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, _camera);
    for (const [id, entity] of displayEntities) {
        if (!entity.group.parent) continue; // not in scene (in blender)
        const intersects = raycaster.intersectObject(entity.group, true);
        if (intersects.length > 0) return id;
    }
    return null;
}

_renderer.domElement.addEventListener('mousedown', (e) => {
    if (game.phase !== 'idle') return;
    mouseDownTime = Date.now();
    mouseDownId = getHitCreatureId(e);
    mouseMoved = false;
    isDragging = false;
});

_renderer.domElement.addEventListener('mousemove', (e) => {
    if (!mouseDownId || game.phase !== 'idle') return;
    mouseMoved = true;
    const held = Date.now() - mouseDownTime;
    if (held > 300 && !isDragging) {
        // Start drag
        isDragging = true;
        dragState = { creatureId: mouseDownId };
        _controls.enabled = false; // disable orbit during drag
        const entity = displayEntities.get(mouseDownId);
        if (entity && entity.group) entity.group.scale.setScalar(0.42); // enlarge feedback
    }
    if (isDragging) {
        // Move creature toward mouse position on platform plane
        const rect = _renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, _camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const pt = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, pt);
        const entity = displayEntities.get(mouseDownId);
        if (entity && entity.group && pt) {
            entity.group.position.x = pt.x;
            entity.group.position.z = pt.z;
        }
        // Blender proximity glow
        const dist = pt ? pt.distanceTo(blender.group.position) : 99;
        blender.glowRing.material.opacity = dist < 1.5 ? 0.9 : (blender.state === 'empty' ? 0.3 : 0.7);
    }
});

_renderer.domElement.addEventListener('mouseup', (e) => {
    if (isDragging && dragState) {
        _controls.enabled = true;
        const entity = displayEntities.get(dragState.creatureId);
        // Check if dropped near blender
        if (entity && entity.group) {
            const dist = entity.group.position.distanceTo(blender.group.position);
            if (dist < 1.5) {
                addToBlender(dragState.creatureId);
            } else {
                entity.group.scale.setScalar(0.35); // reset scale
            }
        }
        dragState = null;
        isDragging = false;
        mouseDownId = null;
        return;
    }

    // Normal click (short press, no drag)
    if (!mouseMoved || (Date.now() - mouseDownTime) < 300) {
        if (game.phase !== 'idle') { mouseDownId = null; return; }
        const hitId = getHitCreatureId(e);
        if (hitId) {
            selectCreature(hitId);
        } else {
            // Check if clicked blender
            raycaster.setFromCamera(mouse, _camera);
            const blenderHit = raycaster.intersectObject(blender.group, true);
            if (blenderHit.length > 0 && blender.state === 'ready') {
                doBlenderBreed();
            } else {
                deselectCreature();
            }
        }
    }
    mouseDownId = null;
    isDragging = false;
});

function selectCreature(id) {
    selectedCreatureId = id;
    game.viewingId = id;
    const entity = displayEntities.get(id);
    if (entity) {
        // Camera focus on selected creature (45° side view)
        const pos = entity.group.position;
        const targetCamPos = new THREE.Vector3(pos.x + 3, 3, pos.z + 4);
        animateCamera(targetCamPos, new THREE.Vector3(pos.x, 0.3, pos.z));
    }
    renderCreaturePanel();
    renderHUD();
}

function deselectCreature() {
    selectedCreatureId = null;
    game.viewingId = null;
    hideCreaturePanel();
    animateCamera(cameraHome.pos.clone(), cameraHome.target.clone());
    renderHUD();
}

let cameraAnim = null;
function animateCamera(toPos, toTarget) {
    const fromPos = _camera.position.clone();
    const fromTarget = _controls.target.clone();
    const start = Date.now();
    const dur = 500;
    cameraAnim = { fromPos, toPos, fromTarget, toTarget, start, dur };
}

function updateCameraAnim() {
    if (!cameraAnim) return;
    const t = Math.min(1, (Date.now() - cameraAnim.start) / cameraAnim.dur);
    const ease = t * t * (3 - 2 * t); // smoothstep
    _camera.position.lerpVectors(cameraAnim.fromPos, cameraAnim.toPos, ease);
    _controls.target.lerpVectors(cameraAnim.fromTarget, cameraAnim.toTarget, ease);
    if (t >= 1) cameraAnim = null;
}

// Breed mode removed — replaced by blender drag-drop system

// --- 纸质属性面板 ---
function renderCreaturePanel() {
    const panel = document.getElementById('creature-panel');
    const content = document.getElementById('paper-card-content');
    const creature = game.inventory.find(c => c.id === selectedCreatureId);
    if (!creature) { hideCreaturePanel(); return; }

    panel.classList.remove('hidden');
    const pal = PALETTES[creature.dna[0]];
    const stats = calcCreatureStats(creature);
    const age = getAgeStage(creature.age ?? 0);
    const role = CHASSIS_ROLE[creature.dna[1]];
    const value = calcCreatureValue(creature);

    const maxStat = Math.max(...STAT_NAMES_7.map(s => stats[s] || 0), 1);
    const statsHtml = STAT_NAMES_7.map((s, i) => {
        const val = stats[s] || 0;
        const pct = Math.round((val / Math.max(maxStat, 10)) * 100);
        const cls = val >= 8 ? 'high' : val >= 4 ? 'mid' : 'low';
        return `<div class="stat-row"><span class="stat-label">${STAT_LABELS_7[i]}</span><div class="stat-bar"><div class="stat-fill ${cls}" style="width:${pct}%"></div></div><span class="stat-val">${val}</span></div>`;
    }).join('');

    const statIcon = { STR: '⚔', DEX: '🎯', CON: '🛡', INT: '🧠', SPD: '💨', CHA: '✨', LCK: '🍀' };
    const statFullName = { STR: '力量', DEX: '灵巧', CON: '体质', INT: '智力', SPD: '速度', CHA: '魅力', LCK: '运气' };
    const muts = Object.entries(creature.mutations || {}).filter(([,v]) => v);
    const mutsHtml = muts.length > 0 ? `<div class="paper-section"><div class="section-title">🦠 突变</div>${muts.map(([,m]) => {
        const fx = Object.entries(m.fx).map(([k,v]) => `${statIcon[k]||''}${statFullName[k]||k}${v>0?'+':''}${v}`).join(' ');
        return `<div class="section-item">${m.n}: ${fx}</div>`;
    }).join('')}</div>` : '';

    const injuries = creature.injuries || [];
    const injHtml = injuries.length > 0 ? `<div class="paper-section"><div class="section-title">🩹 受伤</div>${injuries.map(id => {
        const inj = INJURIES.find(i => i.id === id);
        return `<div class="section-item bad">${inj?.n || id}</div>`;
    }).join('')}</div>` : '';

    const defects = creature.defects || [];
    const defHtml = defects.length > 0 ? `<div class="paper-section"><div class="section-title">⚠ 缺陷</div>${defects.map(id => {
        const d = BIRTH_DEFECTS.find(x => x.id === id);
        return `<div class="section-item bad">${d?.n || id}</div>`;
    }).join('')}</div>` : '';

    const genesHtml = creature.dna.map((gene, i) => {
        const r = getGeneRarity(gene);
        const isColor = (i === 0 || i === 5);
        const et = getExprTier(creature.expression[i]);
        return `<span class="gene-chip ${r}">${GENE_LABELS[i]} ${gene}${!isColor ? '-'+et.name : ''}</span>`;
    }).join('');

    const canFight = age.name !== '幼崽' && !creature.cooldown;
    const canBreed = age.name !== '幼崽' && age.name !== '少年';
    const isInBlender = blender.slots.includes(creature.id);

    // 年龄进度条
    const bc = creature.age ?? 0;
    const ageProgress = bc <= 0 ? '幼崽 🍼' : bc <= 2 ? `少年 ${'█'.repeat(bc)}${'░'.repeat(2-bc)}` : bc <= 8 ? `成年 ${'█'.repeat(Math.min(6, bc-2))}${'░'.repeat(Math.max(0, 8-bc))}` : bc <= 14 ? `老年 ⚠` : '暮年 💀';

    content.innerHTML = `
        <div class="paper-name" style="color:${pal.border}">${pal.name}</div>
        <div class="paper-role">${role?.role || '通用'} · ${ageProgress} · ${value}g</div>
        <div class="paper-divider"></div>
        <div class="paper-stats">${statsHtml}</div>
        <div class="paper-divider"></div>
        <div class="paper-derived">HP ${stats.maxHP} | MP ${stats.maxMana} | 暴击 ${Math.round(stats.critRate*100)}% | 闪避 ${Math.round(stats.dodgeRate*100)}%</div>
        ${mutsHtml}${injHtml}${defHtml}
        <div class="paper-genes">${genesHtml}</div>
        <div class="paper-divider"></div>
        <div style="font-size:10px; color:#78716c; margin-bottom:4px;">战斗${bc}次 ${creature.wins}W ${creature.losses}L</div>
        ${canBreed && !isInBlender ? '<div style="font-size:10px; color:#78716c; margin:4px 0; font-style:italic;">长按拖入搅拌机可繁殖</div>' : ''}
        ${isInBlender ? '<div style="font-size:10px; color:#fbbf24; margin:4px 0;">已在搅拌机中</div>' : ''}
        ${!canBreed ? '<div style="font-size:10px; color:#ef4444; margin:4px 0;">太小了，不能繁殖</div>' : ''}
        <div class="paper-actions">
            <button class="paper-btn paper-btn-fight" onclick="openArena(${creature.id})" ${canFight ? '' : 'disabled'}>${canFight ? '⚔️ 竞技' : age.name === '幼崽' ? '🍼 幼崽' : '冷却'}</button>
            <button class="paper-btn paper-btn-sell" onclick="confirmSell(${creature.id})">💰 ${value}g</button>
        </div>
    `;
}

function hideCreaturePanel() {
    document.getElementById('creature-panel').classList.add('hidden');
}

// --- 旧showCreature3D兼容(reveal序列用) ---
function showCreature3D(dna, expression) {
    // Just refresh display; the reveal sequence needs this
    setCurrentDNA(normalizeDNACodes(dna));
    setCurrentExpression(expression || [1, 1, 1, 1, 1, 1]);
}

// --- 游戏动作 ---

function doBuyWild() {
    if (game.coins < 8 || game.inventory.length >= 8 || game.phase !== 'idle') return;
    game.coins -= 8;
    const creature = createCreature(generateWildDNA());
    creature.age = 3; // wild-caught adult
    game.inventory.push(creature);
    refreshDisplayCreatures();
    selectCreature(creature.id);
    renderHUD();
}
window.doBuyWild = doBuyWild;

function confirmSell(id) {
    const creature = game.inventory.find(c => c.id === id);
    if (!creature) return;
    const value = calcCreatureValue(creature);
    if (value >= 20) {
        if (!confirm(`确定要卖出这只${PALETTES[creature.dna[0]].name}吗?\n价值 ${value}g，此操作不可撤回。`)) return;
    }
    doSell(id);
}
window.confirmSell = confirmSell;

function doSell(id) {
    const idx = game.inventory.findIndex(c => c.id === id);
    if (idx === -1) return;
    const creature = game.inventory[idx];
    const value = calcCreatureValue(creature);
    game.coins += value;
    game.inventory.splice(idx, 1);
    // 清理搅拌机
    if (blender.slots[0] === id || blender.slots[1] === id) resetBlender();
    if (selectedCreatureId === id) deselectCreature();
    showToast(`卖出! +${value} 金币`);
    refreshDisplayCreatures();
    renderHUD();
}
window.doSell = doSell;

// selectCreature is defined above in the wandering/raycaster section
window.selectCreature = selectCreature;

// setBreedSlot/clearBreedSlot removed — breeding now uses blender drag-drop

// doBreed removed — breeding now uses the gene blender (drag-drop)

// --- 揭示动画 ---

function startRevealSequence(childDNA, childExpr, childCreature) {
    game.phase = 'revealing';
    const overlay = document.getElementById('reveal-overlay');
    const genesDiv = document.getElementById('reveal-genes');
    const valueDiv = document.getElementById('reveal-value-display');
    const subDiv = document.getElementById('reveal-sub');
    const titleDiv = document.getElementById('reveal-title');
    const collectBtn = document.getElementById('btn-collect');
    overlay.classList.add('active');
    collectBtn.style.display = 'none';
    valueDiv.textContent = '';
    subDiv.textContent = '';
    titleDiv.textContent = '基因序列解析中...';
    genesDiv.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        genesDiv.innerHTML += `<div class="reveal-gene" id="rg-${i}"><div class="rg-label">${GENE_LABELS[i]}</div><div class="rg-code">?</div><div class="rg-mult"></div></div>`;
    }
    let runningTotal = 0;
    let revealIdx = 0;
    const revealedGenes = [];

    function revealNext() {
        if (revealIdx >= 6) {
            const combo = calcComboMultiplier(childDNA);
            const baseVal = Math.round(runningTotal * combo.mult);
            if (combo.mult > 1) {
                titleDiv.textContent = combo.label;
                titleDiv.style.color = combo.mult >= 5 ? '#f59e0b' : '#a855f7';
                titleDiv.style.fontSize = combo.mult >= 5 ? '28px' : '24px';
                valueDiv.textContent = `${runningTotal} × ${combo.mult} = 💰${baseVal}`;
            } else {
                titleDiv.textContent = '新生命诞生!';
                titleDiv.style.color = '#f8fafc';
                titleDiv.style.fontSize = '20px';
                valueDiv.textContent = `💰 ${baseVal}`;
            }
            subDiv.textContent = `基础价值 ${baseVal} 金币`;
            collectBtn.style.display = 'block';
            showCreature3D(childDNA, childExpr);
            collectBtn.onclick = () => {
                if (game.inventory.length >= 8) { showToast('库存已满! 请先卖出生物。'); return; }
                const creature = childCreature || createCreature(childDNA, childExpr);
                if (!game.inventory.find(c => c.id === creature.id)) game.inventory.push(creature);
                game.viewingId = creature.id;
                game.phase = 'idle';
                overlay.classList.remove('active');
                titleDiv.style.color = '#f8fafc';
                titleDiv.style.fontSize = '20px';
                refreshDisplayCreatures();
                renderHUD();
            };
            return;
        }
        const gene = childDNA[revealIdx];
        const rarity = getGeneRarity(gene);
        const isColorGene = (revealIdx === 0 || revealIdx === 5);
        const expr = childExpr ? childExpr[revealIdx] : 0.75;
        const exprTier = getExprTier(expr);
        let geneScore, scoreDisplay;
        if (isColorGene) {
            geneScore = COLOR_GENE_BONUS[rarity];
            scoreDisplay = geneScore > 0 ? `+${geneScore}` : '+0';
        } else {
            geneScore = Math.round(GENE_BASE_SCORE[rarity] * exprTier.mult);
            scoreDisplay = `${exprTier.name} +${geneScore}`;
        }
        const codeDisplay = isColorGene ? gene : `${gene}-${exprTier.name}`;
        runningTotal += geneScore;
        revealedGenes.push(gene);
        const el = document.getElementById(`rg-${revealIdx}`);
        el.classList.add('revealed');
        el.style.borderColor = RARITY_COLORS[rarity];
        el.style.background = rarity === 'legendary' ? '#451a03' : rarity === 'rare' ? '#2e1065' : rarity === 'fine' ? '#052e16' : '#1e293b';
        el.querySelector('.rg-code').textContent = codeDisplay;
        el.querySelector('.rg-code').style.color = RARITY_COLORS[rarity];
        el.querySelector('.rg-mult').textContent = scoreDisplay;
        el.querySelector('.rg-mult').style.color = !isColorGene && exprTier.idx >= 4 ? exprTier.color : RARITY_COLORS[rarity];
        el.querySelector('.rg-label').style.color = RARITY_COLORS[rarity];
        const traitName = getTraitName(revealIdx, gene);
        const highCount = revealedGenes.filter(g => getGeneRarity(g) !== 'common').length;
        if (highCount >= 3) {
            const previewCombo = calcComboMultiplier(revealedGenes.concat(Array(6 - revealedGenes.length).fill('AA')));
            subDiv.textContent = `${traitName} — ${previewCombo.label || '连击在望!'} (${highCount}连)`;
            subDiv.style.color = highCount >= 4 ? '#f59e0b' : '#a855f7';
        } else {
            subDiv.textContent = `${GENE_LABELS[revealIdx]}: ${traitName} (${RARITY_LABELS[rarity]})`;
            subDiv.style.color = '#94a3b8';
        }
        valueDiv.textContent = `累计 ${runningTotal}`;
        revealIdx++;
        setTimeout(revealNext, 650);
    }
    setTimeout(revealNext, 400);
}

// --- Toast ---

function showToast(msg) {
    const toast = document.getElementById('death-toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// --- 升级面板 ---

function showUpgrades() {
    document.getElementById('upgrade-overlay').classList.add('active');
    renderUpgradePanel();
}
window.showUpgrades = showUpgrades;

function closeUpgrades() {
    document.getElementById('upgrade-overlay').classList.remove('active');
}
window.closeUpgrades = closeUpgrades;

function buyUpgrade(key) {
    if (key === 'geneLock' && !game.upgrades.geneLock && game.coins >= 50) {
        game.coins -= 50;
        game.upgrades.geneLock = true;
        showToast('解锁: 基因锁定!');
    }
    renderUpgradePanel();
    renderGame();
}
window.buyUpgrade = buyUpgrade;

function renderUpgradePanel() {
    document.getElementById('upgrade-panel-content').innerHTML = `
        <div class="panel-title" style="font-size:16px; margin-bottom:12px;">培育机升级</div>
        <div class="upgrade-item ${game.upgrades.geneLock ? 'owned' : ''}" onclick="${game.upgrades.geneLock ? '' : "buyUpgrade('geneLock')"}">
            <div class="upgrade-name">🔒 基因锁定</div>
            <div class="upgrade-desc">繁殖时可锁定一个基因位，该位只从父母继承，不发生突变</div>
            <div class="upgrade-cost">${game.upgrades.geneLock ? '已拥有' : '50 金币'}</div>
        </div>
        <div class="upgrade-item owned" style="cursor:default">
            <div class="upgrade-name">🧪 智能定价培育</div>
            <div class="upgrade-desc">繁殖费自动根据亲本价值计算。亲本越贵，费用越高，但升级突变率和完美表达概率也越高</div>
            <div class="upgrade-cost" style="color:#22c55e">已内置</div>
        </div>
        ${game.upgrades.geneLock ? `
        <div style="margin-top:10px; padding:10px; background:#f0f9ff; border-radius:10px; border:2px solid #bae6fd;">
            <div style="font-size:12px; font-weight:900; color:#0369a1; margin-bottom:6px;">锁定基因位</div>
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
                ${GENE_LABELS.map((label, i) => `
                    <div onclick="setGeneLock(${i})" style="padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer; border:2px solid ${game.lockedGeneIndex === i ? '#0284c7' : '#e2e8f0'}; background:${game.lockedGeneIndex === i ? '#dbeafe' : 'white'}; color:${game.lockedGeneIndex === i ? '#1e40af' : '#64748b'};">${label}</div>
                `).join('')}
                <div onclick="setGeneLock(-1)" style="padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer; border:2px solid ${game.lockedGeneIndex === -1 ? '#0284c7' : '#e2e8f0'}; background:${game.lockedGeneIndex === -1 ? '#dbeafe' : 'white'}; color:${game.lockedGeneIndex === -1 ? '#1e40af' : '#64748b'};">不锁定</div>
            </div>
        </div>` : ''}
        <button class="btn-close-upgrade" onclick="closeUpgrades()">关闭</button>
    `;
}

function setGeneLock(idx) {
    game.lockedGeneIndex = idx;
    renderUpgradePanel();
}
window.setGeneLock = setGeneLock;

// --- 竞技场 UI ---

function openArena(creatureId) {
    if (game.phase !== 'idle') return;
    const creature = game.inventory.find(c => c.id === creatureId);
    if (!creature || creature.cooldown) return;
    setArenaState({ step: 'select-mode', fighterId: creatureId });
    game.phase = 'arena';
    renderArenaMenu();
    document.getElementById('arena-overlay').classList.add('active');
}
window.openArena = openArena;

function selectBattleMode(mode) {
    arenaState.mode = mode;
    arenaState.step = 'select-team';
    arenaState.selectedTeam = [arenaState.fighterId];
    renderArenaMenu();
}
window.selectBattleMode = selectBattleMode;

function toggleTeamMember(id) {
    if (arenaState.selectedTeam.includes(id)) {
        if (id === arenaState.fighterId) return;
        arenaState.selectedTeam = arenaState.selectedTeam.filter(x => x !== id);
    } else if (arenaState.selectedTeam.length < arenaState.mode) {
        arenaState.selectedTeam.push(id);
    }
    renderArenaMenu();
}
window.toggleTeamMember = toggleTeamMember;

// --- 自走棋战场 (visual overhaul) ---

let battlePaused = false;
let battleSpeedMult = 1;
let activeRingMesh = null;
let vfxPool = []; // temp 3D objects to animate & dispose

function bDelay(base) { return Math.round(base / battleSpeedMult); }

function toggleBattlePause() {
    battlePaused = !battlePaused;
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = battlePaused ? '▶' : '⏸';
}
window.toggleBattlePause = toggleBattlePause;

function setBattleSpeedUI(s) {
    battleSpeedMult = s;
    document.querySelectorAll('.battle-controls button[id^="btn-speed"]').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btn-speed' + s);
    if (btn) btn.classList.add('active');
}
window.setBattleSpeed = setBattleSpeedUI;

// --- 3D→screen projection helper ---
function worldToScreen(pos3, cam, el) {
    const v = pos3.clone().project(cam);
    return { x: (v.x * 0.5 + 0.5) * el.clientWidth, y: (-v.y * 0.5 + 0.5) * el.clientHeight };
}

// --- Overhead HP bar system ---
function createOverhead(unit) {
    const pal = PALETTES[unit.creature.dna[0]];
    const div = document.createElement('div');
    div.className = 'unit-overhead';
    div.innerHTML = '<div class="oh-name" style="color:' + pal.border + '">' + pal.name + '</div>'
        + '<div class="oh-hp-bar"><div class="oh-hp-fill" style="width:100%"></div><div class="oh-hp-trail" style="width:100%"></div></div>'
        + '<div class="oh-buffs"></div>';
    document.getElementById('battle-arena').appendChild(div);
    unit.overheadEl = div;
}

function updateOverheads() {
    if (!bScene) return;
    const el = document.getElementById('battle-arena');
    [...bScene.playerUnits, ...bScene.npcUnits].forEach(u => {
        if (!u.overheadEl) return;
        if (!u.alive) { u.overheadEl.style.display = 'none'; return; }
        u.overheadEl.style.display = '';
        const pos = u.group ? u.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)) : new THREE.Vector3();
        const sp = worldToScreen(pos, bScene.camera, el);
        u.overheadEl.style.left = sp.x + 'px';
        u.overheadEl.style.top = sp.y + 'px';
        const pct = Math.max(0, Math.round(u.hp / u.maxHP * 100));
        const fill = u.overheadEl.querySelector('.oh-hp-fill');
        const trail = u.overheadEl.querySelector('.oh-hp-trail');
        if (fill) {
            fill.style.width = pct + '%';
            fill.style.background = pct > 50 ? 'linear-gradient(180deg,#4ade80,#16a34a)' : pct > 25 ? 'linear-gradient(180deg,#fbbf24,#d97706)' : 'linear-gradient(180deg,#f87171,#dc2626)';
        }
        if (trail) trail.style.width = pct + '%';
        // buffs
        const bufDiv = u.overheadEl.querySelector('.oh-buffs');
        if (bufDiv) {
            let icons = '';
            const b = u.buffs;
            if (b.defMod > 0) icons += '🛡️';
            if (b.atkMod > 0) icons += '⚔️';
            if (b.atkMod < 0) icons += '⬇️';
            if (b.spdMod < 0) icons += '🐌';
            if (b.spdBuff) icons += '⚡';
            if (b.dot > 0) icons += '💀';
            if (b.stun > 0) icons += '⭐';
            if (b.reflect > 0) icons += '🔄';
            if (b.dodge) icons += '🏃';
            bufDiv.textContent = icons;
        }
    });
}

function clearOverheads() {
    document.querySelectorAll('.unit-overhead').forEach(el => el.remove());
}

// --- Damage floater system ---
function spawnDmgText(unit, text, type) {
    if (!bScene || !unit.group) return;
    const el = document.getElementById('battle-arena');
    const pos = unit.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 1.6, 0));
    const sp = worldToScreen(pos, bScene.camera, el);
    const div = document.createElement('div');
    div.className = 'dmg-float dmg-' + type;
    div.textContent = text;
    div.style.left = sp.x + 'px';
    div.style.top = sp.y + 'px';
    el.appendChild(div);
    setTimeout(() => div.remove(), 1200);
}

// --- Camera shake ---
function cameraShake() {
    if (!bScene) return;
    const el = document.getElementById('battle-canvas');
    if (el) { el.classList.add('screen-shake'); setTimeout(() => el.classList.remove('screen-shake'), 200); }
}

// --- Active unit ring ---
function showActiveRing(unit) {
    removeActiveRing();
    if (!unit.group || !bScene) return;
    const geo = new THREE.RingGeometry(0.4, 0.55, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    activeRingMesh = new THREE.Mesh(geo, mat);
    activeRingMesh.rotation.x = -Math.PI / 2;
    activeRingMesh.position.copy(unit.group.position).add(new THREE.Vector3(0, 0.02, 0));
    bScene.scene.add(activeRingMesh);
}
function removeActiveRing() {
    if (activeRingMesh && bScene) { bScene.scene.remove(activeRingMesh); activeRingMesh.geometry.dispose(); activeRingMesh.material.dispose(); }
    activeRingMesh = null;
}

// --- Skill VFX system ---
function spawnSkillVFX(skillType, source, target, result) {
    if (!bScene) return;
    const s = bScene.scene;
    const tPos = target.group ? target.group.position.clone() : new THREE.Vector3();
    const sPos = source.group ? source.group.position.clone() : new THREE.Vector3();

    if (skillType === 'heal') {
        // green rising pillar
        const geo = new THREE.CylinderGeometry(0.3, 0.3, 2, 8, 1, true);
        const mat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(sPos).add(new THREE.Vector3(0, 0.5, 0));
        s.add(m);
        animateVFX(m, 600, (t) => { m.position.y = sPos.y + 0.5 + t * 1.5; m.material.opacity = 0.4 * (1 - t); m.scale.set(1 + t * 0.3, 1, 1 + t * 0.3); });
    } else if (skillType === 'drain') {
        // red sphere flying from target to source
        const geo = new THREE.SphereGeometry(0.12, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.7 });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(tPos.clone().add(new THREE.Vector3(0, 0.5, 0)));
        s.add(m);
        animateVFX(m, 500, (t) => { m.position.lerpVectors(tPos.clone().add(new THREE.Vector3(0, 0.5, 0)), sPos.clone().add(new THREE.Vector3(0, 0.5, 0)), t); m.material.opacity = 0.7 * (1 - t * 0.5); });
    } else if (skillType === 'dot') {
        // purple poison bubbles around target
        for (let i = 0; i < 5; i++) {
            const geo = new THREE.SphereGeometry(0.06, 6, 6);
            const mat = new THREE.MeshBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.6 });
            const m = new THREE.Mesh(geo, mat);
            const angle = (i / 5) * Math.PI * 2;
            const startPos = tPos.clone().add(new THREE.Vector3(Math.cos(angle) * 0.4, 0.3, Math.sin(angle) * 0.4));
            m.position.copy(startPos);
            s.add(m);
            animateVFX(m, 800, (t) => { m.position.y = startPos.y + t * 0.8; m.position.x = startPos.x + Math.sin(t * 6 + i) * 0.15; m.material.opacity = 0.6 * (1 - t); });
        }
    } else if (skillType === 'def_buff') {
        // blue shield sphere
        const geo = new THREE.SphereGeometry(0.6, 16, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(sPos).add(new THREE.Vector3(0, 0.4, 0));
        s.add(m);
        animateVFX(m, 700, (t) => { m.scale.setScalar(0.5 + t * 0.8); m.material.opacity = 0.25 * (1 - t); });
    } else if (skillType === 'atk_buff') {
        // red upward glow
        const geo = new THREE.ConeGeometry(0.3, 1.5, 8, 1, true);
        const mat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(sPos).add(new THREE.Vector3(0, 0.5, 0));
        s.add(m);
        animateVFX(m, 600, (t) => { m.position.y = sPos.y + 0.5 + t; m.material.opacity = 0.35 * (1 - t); });
    } else if (skillType === 'atk_debuff') {
        // purple down arrow at target
        const geo = new THREE.ConeGeometry(0.2, 0.5, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.6 });
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = Math.PI; // point down
        m.position.copy(tPos).add(new THREE.Vector3(0, 2, 0));
        s.add(m);
        animateVFX(m, 500, (t) => { m.position.y = tPos.y + 2 - t * 1.2; m.material.opacity = 0.6 * (1 - t); });
    } else if (skillType === 'stun') {
        // spinning stars above target
        const starGroup = new THREE.Group();
        starGroup.position.copy(tPos).add(new THREE.Vector3(0, 1.3, 0));
        for (let i = 0; i < 3; i++) {
            const geo = new THREE.OctahedronGeometry(0.08, 0);
            const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
            const m = new THREE.Mesh(geo, mat);
            m.position.set(Math.cos(i * 2.1) * 0.25, 0, Math.sin(i * 2.1) * 0.25);
            starGroup.add(m);
        }
        s.add(starGroup);
        animateVFX(starGroup, 900, (t) => { starGroup.rotation.y = t * 8; starGroup.children.forEach(c => { if (c.material) c.material.opacity = 1 - t; c.material.transparent = true; }); });
    } else if (skillType === 'dodge') {
        // blue afterimage
        if (target.group) {
            const geo = new THREE.SphereGeometry(0.3, 8, 8);
            const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });
            const m = new THREE.Mesh(geo, mat);
            m.position.copy(tPos).add(new THREE.Vector3(0, 0.3, 0));
            s.add(m);
            animateVFX(m, 400, (t) => { m.scale.setScalar(1 + t); m.material.opacity = 0.4 * (1 - t); });
        }
    } else if (skillType === 'reflect') {
        // gold flash ring
        const geo = new THREE.RingGeometry(0.3, 0.5, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(sPos).add(new THREE.Vector3(0, 0.5, 0));
        s.add(m);
        animateVFX(m, 500, (t) => { m.scale.setScalar(1 + t * 2); m.material.opacity = 0.5 * (1 - t); });
    } else if (skillType === 'slow') {
        // blue frost ring on ground
        const geo = new THREE.RingGeometry(0.2, 0.6, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.copy(tPos).add(new THREE.Vector3(0, 0.03, 0));
        s.add(m);
        animateVFX(m, 700, (t) => { m.scale.setScalar(1 + t * 0.5); m.material.opacity = 0.5 * (1 - t); });
    } else if (skillType === 'spd_buff') {
        // blue speed lines behind
        for (let i = 0; i < 3; i++) {
            const geo = new THREE.PlaneGeometry(0.05, 0.6);
            const mat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
            const m = new THREE.Mesh(geo, mat);
            m.position.copy(sPos).add(new THREE.Vector3((i - 1) * 0.15, 0.3 + i * 0.15, -0.4));
            s.add(m);
            animateVFX(m, 500, (t) => { m.position.z = sPos.z - 0.4 - t * 0.8; m.material.opacity = 0.5 * (1 - t); });
        }
    } else if (skillType === 'multi') {
        // rapid flash hits
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (!bScene) return;
                const geo = new THREE.SphereGeometry(0.15, 6, 6);
                const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
                const m = new THREE.Mesh(geo, mat);
                m.position.copy(tPos).add(new THREE.Vector3((Math.random()-0.5)*0.3, 0.3 + Math.random()*0.4, (Math.random()-0.5)*0.3));
                s.add(m);
                animateVFX(m, 200, (t) => { m.scale.setScalar(1 + t * 2); m.material.opacity = 0.7 * (1 - t); });
            }, i * 100);
        }
    } else if (skillType === 'attack') {
        // impact flash at target
        const geo = new THREE.SphereGeometry(0.2, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(tPos).add(new THREE.Vector3(0, 0.3, 0));
        s.add(m);
        animateVFX(m, 250, (t) => { m.scale.setScalar(1 + t * 3); m.material.opacity = 0.6 * (1 - t); });
    }
}

function animateVFX(obj, duration, updateFn) {
    const start = Date.now();
    function tick() {
        const t = Math.min(1, (Date.now() - start) / duration);
        updateFn(t);
        if (t < 1) { requestAnimationFrame(tick); }
        else { if (obj.parent) obj.parent.remove(obj); if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); obj.traverse(c => { if (c !== obj && c.geometry) { c.geometry.dispose(); } if (c !== obj && c.material) { c.material.dispose(); } }); }
    }
    requestAnimationFrame(tick);
}

// --- Death effect ---
function playDeathEffect(unit) {
    if (!unit.group || !bScene) return;
    // flash white
    unit.group.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.setHex(0xffffff); });
    // spawn fragments
    const pos = unit.group.position.clone();
    const pal = PALETTES[unit.creature.dna[0]];
    const color = new THREE.Color(pal.border);
    for (let i = 0; i < 6; i++) {
        const geo = new THREE.SphereGeometry(0.05, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const m = new THREE.Mesh(geo, mat);
        const dir = new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2, (Math.random()-0.5)*2);
        m.position.copy(pos).add(new THREE.Vector3(0, 0.3, 0));
        bScene.scene.add(m);
        animateVFX(m, 600, (t) => { m.position.add(dir.clone().multiplyScalar(0.03)); m.material.opacity = 0.8 * (1 - t); m.scale.setScalar(1 - t * 0.8); });
    }
    // shrink to zero
    const start = Date.now();
    function shrink() {
        const t = Math.min(1, (Date.now() - start) / 400);
        if (unit.group) {
            unit.group.scale.setScalar(0.55 * (1 - t));
            if (t >= 1) { if (bScene) bScene.scene.remove(unit.group); unit.group = null; }
            else requestAnimationFrame(shrink);
        }
    }
    setTimeout(shrink, 100);
}

// --- Init battle scene ---
function initBattleScene() {
    const el = document.getElementById('battle-arena');
    const canvas = document.getElementById('battle-canvas');
    const w = el.clientWidth || 800, h = el.clientHeight || 600;
    const bRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    bRenderer.setSize(w, h);
    bRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    bRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    bRenderer.shadowMap.enabled = true;
    const bScn = new THREE.Scene();
    bScn.background = new THREE.Color(0x1a1f2e);
    const bCam = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    bCam.position.set(0, 8, 10);
    bCam.lookAt(0, 0, 0);
    bScn.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dLight.position.set(5, 10, 5); dLight.castShadow = true;
    bScn.add(dLight);
    const fLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fLight.position.set(-5, 4, -5);
    bScn.add(fLight);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
            const geo = new THREE.PlaneGeometry(1.4, 1.4);
            const mat = new THREE.MeshStandardMaterial({ color: (row + col) % 2 === 0 ? 0x1e293b : 0x334155, roughness: 0.9 });
            const tile = new THREE.Mesh(geo, mat);
            tile.rotation.x = -Math.PI / 2;
            tile.position.set((col - 2.5) * 1.5, 0, (row - 1.5) * 1.5);
            tile.receiveShadow = true;
            bScn.add(tile);
        }
    }
    const lineGeo = new THREE.PlaneGeometry(9, 0.06);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.3 });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2; line.position.y = 0.01;
    bScn.add(line);
    setBScene({ renderer: bRenderer, scene: bScn, camera: bCam, playerUnits: [], npcUnits: [] });
    // show controls
    const ctrl = document.getElementById('battle-controls');
    if (ctrl) ctrl.style.display = 'flex';
    battlePaused = false;
    battleSpeedMult = 1;
    setBattleSpeedUI(1);
    function bAnimate() {
        if (!bScene) return;
        requestAnimationFrame(bAnimate);
        const t = Date.now() * 0.001;
        [...bScene.playerUnits, ...bScene.npcUnits].forEach((u, i) => {
            if (u.group && u.alive) u.group.scale.setScalar(0.55 + Math.sin(t * 3 + i) * 0.015);
        });
        // rotate active ring
        if (activeRingMesh) activeRingMesh.rotation.z = t * 2;
        updateOverheads();
        bScene.renderer.render(bScene.scene, bScene.camera);
    }
    bAnimate();
}

function gridToWorld(col, row) {
    return new THREE.Vector3((col - 2.5) * 1.5, 0, (row - 1.5) * 1.5);
}

function buildCreatureForBattle(creature, position, faceDir) {
    const savedDNA = currentDNA.map(g => [...g]);
    const savedExpr = [...currentExpression];
    const savedGroup = currentGroup;
    const savedWrapper = floatWrapper;
    setCurrentGroup(null); setFloatWrapper(null);
    setCurrentExpression(creature.expression);
    setCurrentDNA(normalizeDNACodes(creature.dna));
    buildCreature();
    const group = currentGroup;
    if (group) scene.remove(group);
    setCurrentGroup(savedGroup); setFloatWrapper(savedWrapper);
    setCurrentDNA(savedDNA); setCurrentExpression(savedExpr);
    if (group) {
        group.scale.setScalar(0.55);
        group.position.copy(position);
        group.rotation.y = faceDir;
        bScene.scene.add(group);
    }
    return group;
}

function startGridBattle() {
    const team = arenaState.selectedTeam.map(id => game.inventory.find(c => c.id === id)).filter(Boolean);
    if (!team.length) return;
    const mode = arenaState.mode;
    const tierIdx = mode === 1 ? 0 : mode === 3 ? 1 : 2;
    const tier = WAVE_TIERS[tierIdx];
    const entry = [5, 15, 40][tierIdx];
    if (game.coins < entry) { showToast('金币不足!'); return; }
    game.coins -= entry;
    arenaState.tierIdx = tierIdx;
    arenaState.currentWave = 1;
    const power = tier.npcPowerMin + (tier.npcPowerMax - tier.npcPowerMin) * (1 / tier.waves);
    const npcTeam = [];
    for (let i = 0; i < mode; i++) npcTeam.push(generateNPC(power));
    document.getElementById('arena-overlay').classList.remove('active');
    document.getElementById('battle-arena').classList.add('active');
    hideCreaturePanel();
    initBattleScene();
    const pUnits = team.map((c, i) => {
        const row = mode <= 1 ? 1 : mode <= 3 ? i : Math.floor(i * 4 / mode);
        const col = mode <= 1 ? 1 : (i < Math.ceil(mode / 2) ? 0 : 1);
        const pos = gridToWorld(col, row);
        const group = buildCreatureForBattle(c, pos, 0);
        const stats = calcCreatureStats(c);
        return { creature: c, group, stats, hp: stats.maxHP, maxHP: stats.maxHP, mana: stats.CHA || 1, col, row, skills: getCreatureSkills(c), buffs: {}, alive: true, team: 'player' };
    });
    const nUnits = npcTeam.map((c, i) => {
        const row = mode <= 1 ? 1 : mode <= 3 ? i : Math.floor(i * 4 / mode);
        const col = mode <= 1 ? 4 : (i < Math.ceil(mode / 2) ? 5 : 4);
        const pos = gridToWorld(col, row);
        const group = buildCreatureForBattle(c, pos, Math.PI);
        const stats = calcCreatureStats(c);
        return { creature: c, group, stats, hp: stats.maxHP, maxHP: stats.maxHP, mana: stats.CHA || 1, col, row, skills: getCreatureSkills(c), buffs: {}, alive: true, team: 'npc' };
    });
    bScene.playerUnits = pUnits;
    bScene.npcUnits = nUnits;
    // create overhead bars
    [...pUnits, ...nUnits].forEach(u => createOverhead(u));
    arenaState.step = 'battle';
    arenaState.round = 1;
    arenaState.entry = entry;
    updateRoundIndicator();
    setTimeout(() => runGridRound(), bDelay(800));
}
window.startGridBattle = startGridBattle;

function updateRoundIndicator() {
    const el = document.getElementById('round-indicator');
    if (el) { el.textContent = '第 ' + arenaState.round + ' 回合'; el.classList.remove('round-flash'); void el.offsetWidth; el.classList.add('round-flash'); }
}

function findTarget(attacker, enemies) {
    const alive = enemies.filter(u => u.alive);
    if (!alive.length) return null;
    alive.sort((a, b) => {
        const aDist = attacker.team === 'player' ? a.col : (5 - a.col);
        const bDist = attacker.team === 'player' ? b.col : (5 - b.col);
        return aDist - bDist;
    });
    return alive[0];
}

function runGridRound() {
    if (!bScene) return;
    const allUnits = [...bScene.playerUnits, ...bScene.npcUnits].filter(u => u.alive);
    allUnits.sort((a, b) => b.stats.SPD - a.stats.SPD);
    let actionIdx = 0;

    function nextAction() {
        if (battlePaused) { setTimeout(nextAction, 100); return; }
        if (actionIdx >= allUnits.length) {
            removeActiveRing();
            arenaState.round++;
            const pAlive = bScene.playerUnits.some(u => u.alive);
            const nAlive = bScene.npcUnits.some(u => u.alive);
            if (!pAlive || !nAlive || arenaState.round > 6) {
                setTimeout(() => endGridBattle(pAlive && !nAlive ? true : !pAlive ? false : bScene.playerUnits.filter(u => u.alive).length >= bScene.npcUnits.filter(u => u.alive).length), bDelay(500));
                return;
            }
            updateRoundIndicator();
            setTimeout(runGridRound, bDelay(400));
            return;
        }
        const unit = allUnits[actionIdx++];
        if (!unit.alive) { nextAction(); return; }
        const enemies = unit.team === 'player' ? bScene.npcUnits : bScene.playerUnits;
        const target = findTarget(unit, enemies);
        if (!target) { nextAction(); return; }

        showActiveRing(unit);
        // Mana regen each action (MewGenics: INT → mana regen)
        unit.mana = Math.min(unit.stats.maxMana || 99, (unit.mana || 0) + (unit.stats.manaRegen || 1));
        // Tick DOT damage
        const dotDmg = tickBuffs(unit.buffs);
        if (dotDmg > 0) { unit.hp = Math.max(0, unit.hp - dotDmg); spawnDmgText(unit, '-' + dotDmg, 'dot'); }
        if (unit.hp <= 0) { unit.alive = false; playDeathEffect(unit); nextAction(); return; }

        const skill = npcChooseSkill(unit.skills, unit.hp, unit.maxHP, target.hp, target.buffs, unit.mana || 0);
        const result = applySkillEffect(skill, unit.creature, target.creature, unit.stats, target.stats, unit.hp, target.hp, unit.buffs, target.buffs);
        target.hp = Math.max(0, target.hp - result.dmg);
        unit.hp = Math.min(unit.maxHP, unit.hp + (result.heal || 0) - (result.selfDmg || 0));
        unit.hp = Math.max(0, unit.hp);
        if (skill.maxCd) skill.cd = skill.maxCd + 1;
        unit.mana = Math.max(0, (unit.mana || 0) - (skill.manaCost || 0));

        // center skill name
        const center = document.getElementById('bhud-center');
        if (center) { center.textContent = PALETTES[unit.creature.dna[0]].name + ': ' + skill.n; center.classList.add('show'); setTimeout(() => center.classList.remove('show'), bDelay(600)); }

        // spawn VFX for skill type
        spawnSkillVFX(skill.type, unit, target, result);

        animateGridAttack(unit, target, skill, result, () => {
            // damage floaters
            if (result.dmg > 0) {
                if (result.crit) {
                    spawnDmgText(target, '💥 -' + result.dmg, 'crit');
                    cameraShake();
                } else {
                    spawnDmgText(target, '-' + result.dmg, 'normal');
                }
            }
            if (result.heal > 0) spawnDmgText(unit, '+' + result.heal, 'heal');
            if (result.selfDmg > 0) spawnDmgText(unit, '-' + result.selfDmg, 'normal');
            if (result.text === '闪避!') spawnDmgText(target, 'MISS', 'miss');
            if (result.text && result.text.includes('反弹')) spawnDmgText(unit, '↩ -' + result.selfDmg, 'reflect');
            if (skill.type === 'dot') spawnDmgText(target, '☠ DOT', 'dot');
            if (skill.type === 'drain' && result.dmg > 0) spawnDmgText(unit, '+' + result.heal, 'drain');

            if (target.hp <= 0) {
                target.alive = false;
                playDeathEffect(target);
                if (target.overheadEl) target.overheadEl.style.display = 'none';
            }
            unit.skills.forEach(s => { if (s.cd > 0) s.cd--; });
            setTimeout(nextAction, bDelay(200));
        });
    }
    nextAction();
}

function animateGridAttack(attacker, defender, skill, result, onComplete) {
    if (!attacker.group || !defender.group) { onComplete(); return; }
    const origPos = attacker.group.position.clone();
    const isPhysical = skill.type === 'attack' || skill.type === 'multi' || skill.type === 'drain';
    const dir = defender.group.position.clone().sub(origPos).normalize().multiplyScalar(isPhysical ? 0.8 : 0.2);
    const startTime = Date.now();
    const duration = bDelay(isPhysical ? 500 : 350);
    let hitTriggered = false;

    function step() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);

        if (t < 0.25) {
            attacker.group.scale.setScalar(0.55 + (t / 0.25) * 0.05);
        } else if (t < 0.5) {
            const p = (t - 0.25) / 0.25;
            attacker.group.position.lerpVectors(origPos, origPos.clone().add(dir), p * p);
        } else if (t < 0.65) {
            if (!hitTriggered) {
                hitTriggered = true;
                if (result.dmg > 0 && defender.group) {
                    defender.group.scale.set(0.45, 0.65, 0.45);
                    defender.group.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.setHex(result.crit ? 0xffaa00 : 0xff2222); });
                }
            }
        } else if (t < 1.0) {
            const p = (t - 0.65) / 0.35;
            attacker.group.position.lerpVectors(origPos.clone().add(dir), origPos, p);
            attacker.group.scale.setScalar(0.55);
            if (defender.group && defender.alive) {
                defender.group.scale.setScalar(0.45 + p * 0.1);
                if (p > 0.4) defender.group.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.setHex(0x000000); });
            }
        } else {
            attacker.group.position.copy(origPos);
            attacker.group.scale.setScalar(0.55);
            if (defender.group && defender.alive) { defender.group.scale.setScalar(0.55); defender.group.traverse(c => { if (c.isMesh && c.material && c.material.emissive) c.material.emissive.setHex(0x000000); }); }
            onComplete(); return;
        }
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function endGridBattle(win) {
    removeActiveRing();
    clearOverheads();
    const ctrl = document.getElementById('battle-controls');
    if (ctrl) ctrl.style.display = 'none';
    const mode = arenaState.mode;
    const entry = arenaState.entry;
    const waveNum = arenaState.currentWave || 1;
    const tier = WAVE_TIERS[arenaState.tierIdx || 0];
    const reward = tier.baseReward + tier.waveReward * waveNum;

    // 所有参战生物 age+1
    arenaState.selectedTeam.forEach(id => {
        const c = game.inventory.find(x => x.id === id);
        if (c) c.age = (c.age ?? 0) + 1;
    });

    // 研究点 (Legionbound: 无论胜负都获得)
    const rp = Math.max(1, Math.floor(waveNum * 2));
    game.researchPoints += rp;

    if (win) {
        game.coins += entry + reward;
        arenaState.catalystDrop = null;
        if (Math.random() < 0.35) {
            if (mode >= 5 || Math.random() < 0.5) { game.catalysts.mutate++; arenaState.catalystDrop = '突变催化剂'; }
            else { game.catalysts.expr++; arenaState.catalystDrop = '表达催化剂'; }
        }
        arenaState.selectedTeam.forEach(id => {
            const c = game.inventory.find(x => x.id === id);
            if (c) { c.wins++; c.streak++; c.maxStreak = Math.max(c.maxStreak, c.streak); c.cooldown = true; }
        });
        arenaState.prize = reward;
        arenaState.rp = rp;
        arenaState.step = 'result-win';
    } else {
        // MewGenics式: 被击倒的生物获得永久受伤
        const downedUnits = bScene ? bScene.playerUnits.filter(u => !u.alive) : [];
        const injuryReports = [];
        arenaState.selectedTeam.forEach(id => {
            const c = game.inventory.find(x => x.id === id);
            if (!c) return;
            c.losses++; c.streak = 0; c.cooldown = true;
            // 被击倒的单位获得受伤
            const wasDownd = downedUnits.some(u => u.creature.id === id);
            if (wasDownd) {
                const injury = rollInjury();
                c.injuries = c.injuries || [];
                if (!c.injuries.includes(injury.id)) {
                    c.injuries.push(injury.id);
                    injuryReports.push(`${PALETTES[c.dna[0]].name}: ${injury.n}`);
                }
            }
            c.baseValue = calcBaseValue(c.dna, c.expression);
        });
        arenaState.injuryReports = injuryReports;
        arenaState.rp = rp;
        arenaState.step = 'result-loss';
    }

    if (game.inventory.length <= 1 && game.coins < 15 && !game.usedBailout) {
        game.coins += 30;
        const bail = createCreature(generateWildDNA());
        bail.age = 3;
        game.inventory.push(bail);
        game.usedBailout = true; showToast('紧急援助!');
    }
    setTimeout(() => {
        if (bScene) { bScene.scene.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } }); bScene.renderer.dispose(); setBScene(null); }
        document.getElementById('battle-arena').classList.remove('active');
        document.getElementById('arena-overlay').classList.add('active');
        document.querySelectorAll('.dmg-float').forEach(el => el.remove());
        renderArenaMenu();
    }, 1500);
}

function closeArena() {
    removeActiveRing();
    clearOverheads();
    const ctrl = document.getElementById('battle-controls');
    if (ctrl) ctrl.style.display = 'none';
    setArenaState({ step: 'closed' });
    game.phase = 'idle';
    if (bScene) { bScene.scene.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } }); bScene.renderer.dispose(); setBScene(null); }
    document.getElementById('battle-arena').classList.remove('active');
    document.getElementById('arena-overlay').classList.remove('active');
    document.querySelectorAll('.dmg-float').forEach(el => el.remove());
    renderGame();
}
window.closeArena = closeArena;

function renderArenaMenu() {
    const panel = document.getElementById('arena-panel-content');
    if (arenaState.step === 'select-mode') {
        const rpDisplay = game.researchPoints > 0 ? `<div style="font-size:11px; color:#a78bfa; margin-bottom:8px;">🔬 研究点: ${game.researchPoints}</div>` : '';
        panel.innerHTML = '<div class="arena-title">竞技场</div>' + rpDisplay + '<div style="font-size:13px; color:#94a3b8; margin-bottom:16px;">选择出战规模</div><div class="arena-select"><div class="arena-card" onclick="selectBattleMode(1)"><div class="arena-card-name" style="color:#22c55e">1v1</div><div class="arena-card-info">训练场 | 5g</div></div><div class="arena-card" onclick="selectBattleMode(3)"' + (game.inventory.filter(c => !c.cooldown && getAgeStage(c.age??0).name !== '幼崽').length < 3 ? ' style="opacity:0.3"' : '') + '><div class="arena-card-name" style="color:#a855f7">3v3</div><div class="arena-card-info">竞技场 | 15g</div></div><div class="arena-card" onclick="selectBattleMode(5)"' + (game.inventory.filter(c => !c.cooldown && getAgeStage(c.age??0).name !== '幼崽').length < 5 ? ' style="opacity:0.3"' : '') + '><div class="arena-card-name" style="color:#ef4444">5v5</div><div class="arena-card-info">深渊 | 40g</div></div></div><button class="btn-arena-back" onclick="closeArena()">返回</button>';
    } else if (arenaState.step === 'select-team') {
        const mode = arenaState.mode;
        const selected = arenaState.selectedTeam;
        const available = game.inventory.filter(c => !c.cooldown && getAgeStage(c.age??0).name !== '幼崽');
        let slotsHtml = available.map(c => {
            const pal = PALETTES[c.dna[0]];
            const isSel = selected.includes(c.id);
            const stats = calcCreatureStats(c);
            const age = getAgeStage(c.age ?? 0);
            const injCount = (c.injuries||[]).length;
            return '<div class="deploy-slot ' + (isSel ? 'selected' : '') + '" onclick="toggleTeamMember(' + c.id + ')"><div style="color:' + pal.border + '; font-size:13px;">' + pal.name + '</div><div style="color:#64748b; font-size:10px;">' + (CHASSIS_ROLE[c.dna[1]]?.role || '') + ' ' + age.name + ' 战力' + stats.total + (injCount > 0 ? ' 🩹×' + injCount : '') + '</div></div>';
        }).join('');

        // 协同预览 (Legionbound式)
        const selectedCreatures = selected.map(id => game.inventory.find(c => c.id === id)).filter(Boolean);
        const synergies = detectSynergies(selectedCreatures);
        const synHtml = synergies.length > 0 ? '<div style="font-size:11px; color:#fbbf24; margin:8px 0;">🤝 协同: ' + synergies.map(s => s.n).join(', ') + '</div>' : '';

        panel.innerHTML = '<div class="arena-title">' + mode + 'v' + mode + ' 选择队伍</div><div style="font-size:12px; color:#94a3b8; margin-bottom:12px;">已选 ' + selected.length + '/' + mode + '</div><div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:8px;">' + slotsHtml + '</div>' + synHtml + '<button class="btn-fight" onclick="startGridBattle()"' + (selected.length === mode ? '' : ' disabled') + '>出战!</button><br><button class="btn-arena-back" onclick="closeArena()">返回</button>';
    } else if (arenaState.step === 'result-win') {
        panel.innerHTML = '<div class="arena-result-title" style="color:#fbbf24">胜利!</div><div style="font-size:22px; font-weight:900; color:#22c55e; margin:8px 0;">+' + arenaState.prize + 'g</div><div style="font-size:12px; color:#a78bfa; margin:4px 0;">+' + (arenaState.rp || 0) + ' 研究点</div>' + (arenaState.catalystDrop ? '<div style="font-size:12px; color:#a78bfa; margin:4px 0;">' + arenaState.catalystDrop + '</div>' : '') + '<button class="btn-fight" style="background:#22c55e; border-color:#86efac; box-shadow:0 5px 0 #166534;" onclick="closeArena()">收下奖励!</button>';
    } else if (arenaState.step === 'result-loss') {
        const injHtml = (arenaState.injuryReports || []).length > 0 ? '<div style="font-size:12px; color:#ef4444; margin:6px 0;">🩹 受伤:<br>' + arenaState.injuryReports.join('<br>') + '</div>' : '';
        panel.innerHTML = '<div class="arena-result-title" style="color:#ef4444">战败</div>' + injHtml + '<div style="font-size:12px; color:#a78bfa; margin:4px 0;">+' + (arenaState.rp || 0) + ' 研究点</div><div style="font-size:13px; color:#94a3b8; margin:8px 0;">被击倒的生物获得永久伤害</div><button class="btn-arena-back" onclick="closeArena()">继续...</button>';
    }
}

function resetCooldowns() {
    game.inventory.forEach(c => c.cooldown = false);
}

// --- UI 渲染 (新: 全屏3D + 纸质面板) ---

function renderGame() {
    renderHUD();
    refreshDisplayCreatures();
    if (selectedCreatureId) renderCreaturePanel();
}

function renderHUD() {
    document.getElementById('coin-amount').textContent = game.coins;
    document.getElementById('catalyst-count').textContent = game.catalysts.expr + game.catalysts.mutate;
    const rpEl = document.getElementById('rp-amount');
    if (rpEl) rpEl.textContent = game.researchPoints;
    document.getElementById('btn-buy-wild').disabled = game.coins < 8 || game.inventory.length >= 8 || game.phase !== 'idle';
    // 保底: 破产时显示打扫按钮
    const isBroke = game.coins < 5 && game.inventory.length === 0;
    let cleanBtn = document.getElementById('btn-clean-job');
    if (isBroke && !cleanBtn) {
        cleanBtn = document.createElement('button');
        cleanBtn.id = 'btn-clean-job';
        cleanBtn.className = 'btn-buy-wild';
        cleanBtn.textContent = '🧹 打扫卫生 +5g';
        cleanBtn.onclick = doCleaningJob;
        document.querySelector('.hud-right').appendChild(cleanBtn);
    } else if (!isBroke && cleanBtn) {
        cleanBtn.remove();
    }
}

function toggleCatalyst() {
    if (game.useCatalyst) { game.useCatalyst = null; }
    else if (game.catalysts.expr > 0) { game.useCatalyst = 'expr'; }
    else if (game.catalysts.mutate > 0) { game.useCatalyst = 'mutate'; }
    renderGame();
}
window.toggleCatalyst = toggleCatalyst;

// --- 跳过今天 ---
function doSkipDay() {
    if (game.phase !== 'idle') return;
    const deaths = skipDay();
    if (deaths.length > 0) {
        const names = deaths.map(d => PALETTES[d.dna[0]].name).join(', ');
        showToast(`寿终正寝: ${names}`);
    }
    // 走私贩出现检查
    if (game.smuggler.daysSinceVisit >= SMUGGLER_MIN_INTERVAL && Math.random() < SMUGGLER_VISIT_CHANCE) {
        game.smuggler.active = true;
        game.smuggler.creatures = generateSmugglerStock();
        game.smuggler.daysSinceVisit = 0;
        showToast('走私贩来了!');
    }
    refreshDisplayCreatures();
    if (selectedCreatureId) renderCreaturePanel();
    renderHUD();
}
window.doSkipDay = doSkipDay;

// --- 打扫卫生 (保底) ---
function doCleaningJob() {
    game.coins += FAILSAFE_CLEAN_REWARD;
    showToast(`打扫卫生赚了 ${FAILSAFE_CLEAN_REWARD}g`);
    renderHUD();
}
window.doCleaningJob = doCleaningJob;

// --- 初始化 ---

function initGame() {
    // Starter creatures: 2 adults (age=3壮年) + 1 young (age=1少年)
    const s1 = createCreature(['TA', 'TT', 'CT', 'AA', 'AA', 'AA'], null, 3);
    const s2 = createCreature(['AC', 'CA', 'AA', 'AT', 'AA', 'AT'], null, 3);
    const s3 = createCreature(['TG', 'TT', 'AA', 'AA', 'CC', 'AA'], null, 1);
    game.inventory.push(s1, s2, s3);
    renderGame();
    document.getElementById('loading').style.opacity = 0;
}

document.getElementById('upgrade-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'upgrade-overlay') closeUpgrades();
});
document.getElementById('arena-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'arena-overlay' && arenaState.step === 'select-tier') closeArena();
});

initGame();

// --- 渲染循环 ---

function resizeRenderer() {
    const box = document.getElementById('canvas-container');
    const w = box.clientWidth || 800;
    const h = box.clientHeight || 600;
    _camera.aspect = w / h;
    _camera.updateProjectionMatrix();
    _renderer.setSize(w, h);
}
window.addEventListener('resize', resizeRenderer);
requestAnimationFrame(resizeRenderer);

const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    updateWandering(dt);
    updateCameraAnim();
    updateBlenderVisuals();
    updateBlenderLabel();
    // 平台发光环旋转
    ringMesh.rotation.z = clock.getElapsedTime() * 0.3;
    _controls.update(); _renderer.render(_scene, _camera);
}
animate();

// --- window.TensorLab API (for qa-atlas.mjs) ---

window.TensorLab = {
    setDNA: (dna) => showCreature3D(dna),
    setCameraView: (view) => {
        if (view === 'front') { _camera.position.set(0, 1, 7); }
        else if (view === 'side') { _camera.position.set(7, 1, 0); }
        else if (view === 'top') { _camera.position.set(0, 8, 0.1); }
        _camera.lookAt(0, 0.5, 0);
        _controls.target.set(0, 0.5, 0);
        _controls.update();
    },
    codes: {
        head: Object.keys(HEAD_PRIMITIVES),
        side: Object.keys(SIDE_PRIMITIVES),
        dorsal: Object.keys(DORSAL_PRIMITIVES)
    },
    contracts: { head: HEAD_CONTRACTS },
    primitives: { head: HEAD_PRIMITIVES, side: SIDE_PRIMITIVES, dorsal: DORSAL_PRIMITIVES },
    getState: () => ({
        traits: currentDNA.map((g, i) => getTraitName(i, g.join(''))),
        polyCount: (() => {
            let count = 0;
            if (floatWrapper) floatWrapper.traverse((c) => { if (c.isMesh && c.geometry) count += (c.geometry.index ? c.geometry.index.count : c.geometry.attributes.position.count) / 3; });
            return count.toLocaleString() + ' faces';
        })()
    })
};
