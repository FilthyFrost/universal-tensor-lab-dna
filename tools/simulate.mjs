/**
 * 模拟器 v3：含竞技场系统
 */

const COMMON_GENES = ['AA','AT','AC','AG','TA','TT','TC','TG'];
const FINE_GENES = ['CA','CT','CC'];
const RARE_GENES = ['CG','GA','GT','GC'];
const LEGENDARY_GENES = ['GG'];
const RARITY_ORDER = ['common', 'fine', 'rare', 'legendary'];
const GENE_BASE_SCORE = { common: 2, fine: 7, rare: 22, legendary: 70 };
const COLOR_GENE_BONUS = { common: 0, fine: 4, rare: 12, legendary: 35 };
const EXPR_DISTRIBUTIONS = {
    common:    [0.55, 0.25, 0.13, 0.05, 0.02, 0.00],
    fine:      [0.15, 0.30, 0.30, 0.18, 0.06, 0.01],
    rare:      [0.03, 0.10, 0.25, 0.35, 0.20, 0.07],
    legendary: [0.00, 0.03, 0.12, 0.30, 0.35, 0.20]
};
const EXPR_MULTS = [0.3, 0.5, 0.7, 1.0, 1.4, 2.0];
const STREAK_MULTS = [1, 1, 1, 1.3, 1.5, 2.0];

function getGeneRarity(c) { if(c==='GG')return'legendary'; if(RARE_GENES.includes(c))return'rare'; if(FINE_GENES.includes(c))return'fine'; return'common'; }
function getRarityIndex(r) { return RARITY_ORDER.indexOf(r); }
function getExprMult(v) { return EXPR_MULTS[Math.min(5, Math.max(0, Math.floor(v * 6)))]; }
function rollExpr(rarity) {
    const d = EXPR_DISTRIBUTIONS[rarity]||EXPR_DISTRIBUTIONS.common;
    const r = Math.random(); let c = 0;
    for(let i=0;i<d.length;i++){c+=d[i]; if(r<c) return i/6+Math.random()/6;}
    return 0.5;
}
function calcComboMult(dna) {
    const hc = dna.filter(g=>getGeneRarity(g)!=='common').length;
    if(hc>=6)return 12; if(hc>=5)return 5; if(hc>=4)return 2.5; if(hc>=3)return 1.5; return 1;
}
function calcBaseValue(dna, expr) {
    let t = 0;
    for(let i=0;i<dna.length;i++){
        const r=getGeneRarity(dna[i]);
        if(i===0||i===5){t+=COLOR_GENE_BONUS[r];}
        else{t+=Math.round(GENE_BASE_SCORE[r]*getExprMult(expr[i]));}
    }
    return Math.round(t*calcComboMult(dna));
}
function getAgeCo(bc){return[1,0.7,0.4][Math.min(bc,2)];}
function calcValue(c){return Math.max(2,Math.round(c.baseValue*getAgeCo(c.breedCount)));}
function calcBreedCost(a,b){return Math.max(5,Math.round((calcValue(a)+calcValue(b))*0.20));}
function getBreedParams(a,b){
    const s=calcValue(a)+calcValue(b);
    const t=s<20?0:s<60?1:s<150?2:3;
    return{upgradeChance:[0.05,0.07,0.09,0.12][t],exprBonus:[0,0.04,0.08,0.14][t]};
}
function randomGeneOfRarity(r){const p={common:COMMON_GENES,fine:FINE_GENES,rare:RARE_GENES,legendary:LEGENDARY_GENES}[r];return p[Math.floor(Math.random()*p.length)];}
function stepMutate(g,d){const i=getRarityIndex(getGeneRarity(g));return randomGeneOfRarity(RARITY_ORDER[Math.max(0,Math.min(3,i+d))]);}
function inheritGene(gA,gB,uc){
    const rA=getRarityIndex(getGeneRarity(gA)),rB=getRarityIndex(getGeneRarity(gB));
    const better=rA>=rB?gA:gB,weaker=rA>=rB?gB:gA;
    const roll=Math.random();
    if(roll<0.42)return better; if(roll<0.60)return weaker;
    if(roll<0.72)return randomGeneOfRarity(getGeneRarity(Math.random()<0.5?better:weaker));
    if(roll<0.72+uc)return stepMutate(better,+1);
    if(roll<0.72+uc+0.06)return stepMutate(weaker,-1);
    return better;
}
function inheritExpr(a,b,bonus){return Math.max(0,Math.min(0.999,(a+b)/2*0.6+Math.random()*0.4+bonus));}
function genWildDNA(){
    const d=Array.from({length:6},()=>COMMON_GENES[Math.floor(Math.random()*COMMON_GENES.length)]);
    if(Math.random()<0.1)d[Math.floor(Math.random()*6)]=FINE_GENES[Math.floor(Math.random()*FINE_GENES.length)];
    return d;
}
let nextId=1;
function create(dna,expr){
    const e=expr||dna.map(g=>rollExpr(getGeneRarity(g)));
    return{id:nextId++,dna,expression:e,breedCount:0,baseValue:calcBaseValue(dna,e),wins:0,losses:0,streak:0,maxStreak:0,cooldown:false};
}
function calcPower(c,w){
    let p=0; const ww=w||[1,1,1,1];
    for(let i=0;i<4;i++){const gi=i+1;p+=Math.round(GENE_BASE_SCORE[getGeneRarity(c.dna[gi])]*getExprMult(c.expression[gi])*ww[i]);}
    return Math.round(p);
}
function breed(pA,pB,isFirst){
    const p=getBreedParams(pA,pB);
    const dna=[],expr=[];
    for(let i=0;i<6;i++){
        dna.push(inheritGene(pA.dna[i],pB.dna[i],p.upgradeChance));
        expr.push(inheritExpr(pA.expression[i],pB.expression[i],p.exprBonus));
    }
    if(isFirst){
        const improved=dna.some((g,i)=>getRarityIndex(getGeneRarity(g))>Math.max(getRarityIndex(getGeneRarity(pA.dna[i])),getRarityIndex(getGeneRarity(pB.dna[i]))));
        if(!improved){let pos=dna.findIndex(g=>getGeneRarity(g)==='fine');if(pos===-1)pos=Math.floor(Math.random()*4)+1;dna[pos]=stepMutate(dna[pos],+1);expr[pos]=Math.max(expr[pos],0.5+Math.random()*0.5);}
    }
    return create(dna,expr);
}

// === 竞技场 ===
const ARENAS=[
    {id:'street',entry:5,npcMin:4,npcMax:18,winBias:0.60,death:false,w:[1,1.5,1,0.5]},
    {id:'underground',entry:15,npcMin:18,npcMax:55,winBias:0.50,death:true,w:[1.2,0.8,1.5,1]},
    {id:'colosseum',entry:0,npcMin:55,npcMax:150,winBias:0.45,death:true,w:[1.5,0.5,1,1.5]}
];

function fight(playerPower,npcPower,winBias){
    const pEff=playerPower*(0.85+Math.random()*0.3)*winBias/0.5;
    const nEff=npcPower*(0.85+Math.random()*0.3);
    return pEff>nEff;
}

// === 模拟 ===
function simulate(rounds){
    let coins=120,permits=2,totalBreeds=0,usedBailout=false;
    let inv=[
        create(['TA','TT','CT','AA','AA','AA']),
        create(['AC','CA','AA','AT','AA','AT']),
        create(['TG','TT','AA','AA','CC','AA'])
    ];
    const log=[];

    for(let r=0;r<rounds;r++){
        const invVal=inv.reduce((s,c)=>s+calcValue(c),0);
        const best=inv.reduce((b,c)=>calcValue(c)>calcValue(b)?c:b,inv[0]);
        log.push({round:r,coins,invCount:inv.length,invValue:invVal,totalWealth:coins+invVal,bestValue:calcValue(best),permits,bestPower:calcPower(best)});

        inv.sort((a,b)=>calcPower(b)-calcPower(a));

        // 如果库存满，卖最差的
        while(inv.length>=8){coins+=calcValue(inv.pop());}

        // AI策略：每轮做1-2个动作

        // 1. 竞技：所有可用生物都打一场
        const fighters=inv.filter(c=>!c.cooldown);
        for(const fighter of fighters){
            const power=calcPower(fighter);
            let arena;
            if(power>=55&&coins>=calcValue(fighter)&&Math.random()<0.1){arena=ARENAS[2];}
            else if(power>=18&&coins>=15&&Math.random()<0.35){arena=ARENAS[1];}
            else if(coins>=5){arena=ARENAS[0];}
            if(!arena)continue;

            const entry=arena.id==='colosseum'?calcValue(fighter):arena.entry;
            if(coins<entry)continue;
            coins-=entry;
            const npcPower=arena.npcMin+Math.random()*(arena.npcMax-arena.npcMin);
            const win=fight(power,npcPower,arena.winBias);
            if(win){
                fighter.wins++;fighter.streak++;
                fighter.maxStreak=Math.max(fighter.maxStreak,fighter.streak);
                fighter.cooldown=true;
                const sm=STREAK_MULTS[Math.min(fighter.streak,STREAK_MULTS.length-1)];
                let prize=Math.round((entry+npcPower*0.3)*sm);
                if(arena.id==='colosseum')prize=Math.min(500,Math.round(entry*2*sm));
                coins+=entry+prize;
                permits++;
            }else{
                fighter.losses++;fighter.streak=0;
                if(arena.death){
                    inv=inv.filter(c=>c.id!==fighter.id);
                    coins+=Math.min(5,Math.round(calcValue(fighter)*0.1));
                }else{fighter.cooldown=true;}
            }
            if(!inv.find(c=>c.id===fighter.id))continue; // died
        }

        // 2. 繁殖（如果有许可）
        if(permits>0&&inv.length>=2&&inv.length<8){
            const breedable=inv.filter(c=>c.breedCount<3);
            if(breedable.length>=2){
                const pA=breedable[0],pB=breedable[breedable.length>1?1:0];
                const cost=calcBreedCost(pA,pB);
                if(coins>=cost){
                    coins-=cost;
                    permits--;
                    inv.forEach(c=>c.cooldown=false);
                    const child=breed(pA,pB,totalBreeds===0);
                    totalBreeds++;
                    pA.breedCount++;pB.breedCount++;
                    inv=inv.filter(c=>c.breedCount<3);
                    inv.push(child);
                }
            }
        }

        // 3. 买野生（如果库存<3）
        if(inv.length<3&&coins>=8){
            coins-=8;
            inv.push(create(genWildDNA()));
        }

        // 偶尔卖中等
        if(Math.random()<0.1&&inv.length>3){
            inv.sort((a,b)=>calcValue(b)-calcValue(a));
            coins+=calcValue(inv.splice(Math.floor(inv.length/2),1)[0]);
        }

        // 破产保底
        if(inv.length<=1&&coins<15&&!usedBailout){
            coins+=30;inv.push(create(genWildDNA()));usedBailout=true;
        }
    }
    return log;
}

// === 运行 ===
const N=30,R=80;
console.log(`\n=== 模拟 ${N} 个玩家，${R} 轮 (含竞技场) ===\n`);
const all=[];
for(let s=0;s<N;s++){nextId=1;all.push(simulate(R));}

const checks=[0,5,10,20,30,50,79];
console.log('轮次 | 平均财富 | 最低 | 最高 | 平均战力 | 中位数 | 许可');
console.log('-----|---------|------|------|--------|------|-----');
for(const r of checks){
    const w=all.map(l=>l[r]?.totalWealth||0);
    const p=all.map(l=>l[r]?.bestPower||0);
    const pm=all.map(l=>l[r]?.permits||0);
    const avg=Math.round(w.reduce((a,b)=>a+b,0)/w.length);
    const min=Math.min(...w),max=Math.max(...w);
    const med=w.sort((a,b)=>a-b)[Math.floor(w.length/2)];
    const avgP=Math.round(p.reduce((a,b)=>a+b,0)/p.length);
    const avgPm=Math.round(pm.reduce((a,b)=>a+b,0)/pm.length);
    console.log(`  ${String(r).padStart(2)} | ${String(avg).padStart(7)} | ${String(min).padStart(4)} | ${String(max).padStart(4)} | ${String(avgP).padStart(6)} | ${String(med).padStart(5)} | ${String(avgPm).padStart(4)}`);
}

const brokeCount=all.filter(l=>l[l.length-1].totalWealth<10).length;
console.log(`\n破产率: ${brokeCount}/${N} (${Math.round(brokeCount/N*100)}%)`);

console.log('\n=== 财富曲线 ===');
for(let r=0;r<R;r+=5){
    const w=all.map(l=>l[r]?.totalWealth||0);
    const avg=Math.round(w.reduce((a,b)=>a+b,0)/w.length);
    const min=Math.min(...w),max=Math.max(...w);
    const bar='█'.repeat(Math.min(50,Math.round(avg/8)));
    console.log(`${String(r).padStart(3)}: ${String(avg).padStart(5)} [${String(min).padStart(4)}-${String(max).padStart(5)}] ${bar}`);
}

console.log('\n=== 3个玩家轨迹 ===');
for(let p=0;p<Math.min(3,N);p++){
    const l=all[p];
    let line='';
    for(let r=0;r<R;r++){
        const w=l[r].totalWealth;
        const h=Math.min(8,Math.round(w/80));
        line+='▁▂▃▄▅▆▇█'[Math.min(h,8)]||'█';
    }
    console.log(`P${p}: ${line}  终:${l[R-1].totalWealth}g 战力:${l[R-1].bestPower}`);
}
