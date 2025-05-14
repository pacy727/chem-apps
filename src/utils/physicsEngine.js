// physicsEngine.js - 物理演算とシミュレーションロジック
import { updateAtomsCache } from './atomData';

// 物理定数
const GRAVITY = 0.05;  // 重力加速度
const FRICTION = 0.98; // 摩擦係数
const MIN_DISTANCE = 10; // 原子間の最小許容距離 - 増加
const BOND_FORCE = 0.4; // 結合力の強さ
const REPULSION_FORCE = 2.0; // 反発力の強さ - 大幅に強化
const MOLECULE_REPULSION_FORCE = 3.0; // 分子間の反発力 - 大幅に強化
const ATTRACTION_FORCE = 0.01; // 引力の強さ - さらに弱く
const IONIC_ATTRACTION_FORCE = 0.06; // イオン間の引力 - 弱める
const IONIC_REPULSION_FORCE = 0.12; // 同符号イオン間の斥力
const WALL_ELASTICITY = 0.8; // 壁との衝突の弾性
const MAX_VELOCITY = 1.2; // 最大速度 - 制限強化
const CRYSTAL_STRUCTURE_FORCE = 0.15; // 結晶構造を維持する力
const ABSOLUTE_MIN_DISTANCE_FACTOR = 1.5; // 絶対に許容しない最小距離係数

// 2点間の距離を計算
export const distance = (x1, y1, x2, y2) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

// 2点間の角度を計算（ラジアン）
export const angle = (x1, y1, x2, y2) => {
  return Math.atan2(y2 - y1, x2 - x1);
};

// 原子の動きを更新
export const updateAtomPosition = (atom, canvasWidth, canvasHeight, atoms, bonds) => {
  const newAtom = { ...atom };
  
  // 状態に応じた物理挙動
  if (atom.state === 'solid') {
    // 固体は重力の影響を受け下に溜まる
    newAtom.vy += GRAVITY;
    // 摩擦もある
    newAtom.vx *= FRICTION;
    newAtom.vy *= FRICTION;
  } else {
    // 気体・液体は等速運動（摩擦なし）
    // でも速度の上限は設定
  }
  
  // 位置の更新
  newAtom.x += newAtom.vx;
  newAtom.y += newAtom.vy;
  
  // 最大速度を制限
  const currentSpeed = Math.sqrt(newAtom.vx * newAtom.vx + newAtom.vy * newAtom.vy);
  if (currentSpeed > MAX_VELOCITY) {
    const ratio = MAX_VELOCITY / currentSpeed;
    newAtom.vx *= ratio;
    newAtom.vy *= ratio;
  }
  
  // 壁との衝突判定と反射
  const radius = atom.element.atomicRadius * 1.5; // 余裕を持たせる
  
  // 左右の壁
  if (newAtom.x - radius < 0) {
    newAtom.x = radius; // 確実に画面内に収める
    newAtom.vx = -newAtom.vx * WALL_ELASTICITY;
    // 完全停止防止
    if (Math.abs(newAtom.vx) < 0.1) newAtom.vx = 0.1 * Math.sign(newAtom.vx);
  } else if (newAtom.x + radius > canvasWidth) {
    newAtom.x = canvasWidth - radius; // 確実に画面内に収める
    newAtom.vx = -newAtom.vx * WALL_ELASTICITY;
    // 完全停止防止
    if (Math.abs(newAtom.vx) < 0.1) newAtom.vx = -0.1;
  }
  
  // 上下の壁
  if (newAtom.y - radius < 0) {
    newAtom.y = radius; // 確実に画面内に収める
    newAtom.vy = -newAtom.vy * WALL_ELASTICITY;
    // 完全停止防止
    if (Math.abs(newAtom.vy) < 0.1) newAtom.vy = 0.1;
  } else if (newAtom.y + radius > canvasHeight) {
    newAtom.y = canvasHeight - radius; // 確実に画面内に収める
    newAtom.vy = -newAtom.vy * WALL_ELASTICITY;
    // 完全停止防止
    if (Math.abs(newAtom.vy) < 0.1) newAtom.vy = -0.1;
  }
  
  // 他の原子との衝突チェック - 即座に重なりを解消
  for (const otherAtom of atoms) {
    // 自分自身はスキップ
    if (otherAtom.id === atom.id) continue;
    
    // 距離を計算
    const dist = distance(newAtom.x, newAtom.y, otherAtom.x, otherAtom.y);
    const minDist = (atom.element.atomicRadius + otherAtom.element.atomicRadius) * ABSOLUTE_MIN_DISTANCE_FACTOR;
    
    // 重なりが検出された場合、即座に位置を調整
    if (dist < minDist) {
      // 重なりの大きさを計算
      const overlap = minDist - dist;
      
      // 反発方向のベクトル
      const angle = Math.atan2(newAtom.y - otherAtom.y, newAtom.x - otherAtom.x);
      
      // 重なりを解消するために位置を調整
      newAtom.x += Math.cos(angle) * overlap;
      newAtom.y += Math.sin(angle) * overlap;
      
      // 速度も反発方向に変更
      newAtom.vx += Math.cos(angle) * 0.1;
      newAtom.vy += Math.sin(angle) * 0.1;
    }
  }
  
  return newAtom;
};

// 原子間の相互作用を計算
export const calculateAtomInteractions = (atoms, canvasWidth, canvasHeight) => {
  const newAtoms = [...atoms];
  
  // 分子グループを特定
  const molecules = identifyMolecules(atoms);
  
  // 分子単位での衝突判定（分子同士の重なり防止）
  handleMoleculeCollisions(molecules, newAtoms);
  
  // すべての原子ペアについて相互作用を計算
  for (let i = 0; i < atoms.length; i++) {
    const atom1 = atoms[i];
    
    for (let j = i + 1; j < atoms.length; j++) {
      const atom2 = atoms[j];
      
      // 同じ分子に属する原子同士は既に結合力で処理されるので、別の分子の原子間のみ考慮
      const atom1MoleculeId = atom1.moleculeId || '';
      const atom2MoleculeId = atom2.moleculeId || '';
      const sameGroup = atom1MoleculeId && atom2MoleculeId && atom1MoleculeId === atom2MoleculeId;
      
      // 2原子間の距離を計算
      const dist = distance(atom1.x, atom1.y, atom2.x, atom2.y);
      const minDist = (atom1.element.atomicRadius + atom2.element.atomicRadius + MIN_DISTANCE);
      
      // 結合済みのペアなら結合力を適用
      const bond = atom1.bonds.find(b => b.with === atom2.id) || atom2.bonds.find(b => b.with === atom1.id);
      
      if (bond) {
        // 結合の種類に応じて結合距離と強さを調整
        const bondType = bond.type;
        let idealDist, bondStrength;
        
        if (bondType === 'covalent') {
          // 共有結合は原子が重なるように近接
          idealDist = minDist * 0.6; // より密着（電子雲の重なり）だが絶対最小距離は守る
          bondStrength = BOND_FORCE * 1.2; // 共有結合は強め
        } else {
          // イオン結合はやや距離を保つ
          idealDist = minDist * 0.7;
          bondStrength = BOND_FORCE * 0.9; // イオン結合はやや弱め
        }
        
        // 結合力の計算
        const forceMagnitude = (dist - idealDist) * bondStrength;
        
        // 力の方向（単位ベクトル）
        const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
        const forceX = Math.cos(angle) * forceMagnitude;
        const forceY = Math.sin(angle) * forceMagnitude;
        
        // 力を適用
        newAtoms[i].vx += forceX;
        newAtoms[i].vy += forceY;
        newAtoms[j].vx -= forceX;
        newAtoms[j].vy -= forceY;
        
        // 同じ分子内の原子は強く結合して動きを制限
        if (atom1.moleculeId && atom1.moleculeId === atom2.moleculeId) {
          // 速度の一致（分子内の原子は同じ速度で動く）
          const avgVx = (newAtoms[i].vx + newAtoms[j].vx) / 2;
          const avgVy = (newAtoms[i].vy + newAtoms[j].vy) / 2;
          
          newAtoms[i].vx = avgVx;
          newAtoms[i].vy = avgVy;
          newAtoms[j].vx = avgVx;
          newAtoms[j].vy = avgVy;
          
          // 重なり防止のための位置調整
          if (dist < idealDist * 0.9) {
            const overlap = idealDist - dist;
            const moveX = Math.cos(angle) * overlap * 0.5;
            const moveY = Math.sin(angle) * overlap * 0.5;
            
            newAtoms[i].x -= moveX;
            newAtoms[i].y -= moveY;
            newAtoms[j].x += moveX;
            newAtoms[j].y += moveY;
          }
        }
        
        // 絶対重なり防止 - 常に最小距離を保証
        const absoluteMinDist = (atom1.element.atomicRadius + atom2.element.atomicRadius) * ABSOLUTE_MIN_DISTANCE_FACTOR;
        if (dist < absoluteMinDist) {
          const emergencyOverlap = absoluteMinDist - dist;
          const moveX = Math.cos(angle) * emergencyOverlap * 0.5;
          const moveY = Math.sin(angle) * emergencyOverlap * 0.5;
          
          newAtoms[i].x -= moveX;
          newAtoms[i].y -= moveY;
          newAtoms[j].x += moveX;
          newAtoms[j].y += moveY;
        }
      } 
      // 衝突判定（非結合原子間）- 重なり防止を強化
      else if (dist < minDist) {
        // 重なりの度合いを計算
        const overlap = minDist - dist;
        
        // 同グループ（分子）内の原子間なら衝突処理を調整（結合処理との整合性）
        const repulsionMultiplier = sameGroup ? 0.8 : 1.2;
        
        // 重なりが大きいほど強い反発力
        const repulsionForce = Math.min(3.0, overlap / (minDist * 0.2)) * REPULSION_FORCE * repulsionMultiplier;
        
        // 反発方向の単位ベクトル
        const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
        const moveX = Math.cos(angle) * overlap * repulsionForce;
        const moveY = Math.sin(angle) * overlap * repulsionForce;
        
        // 位置を調整して重ならないようにする（即座に離す）
        newAtoms[i].x -= moveX;
        newAtoms[i].y -= moveY;
        newAtoms[j].x += moveX;
        newAtoms[j].y += moveY;
        
        // 速度も反発する向きに調整（強めの反発）
        const vx1 = newAtoms[i].vx;
        const vy1 = newAtoms[i].vy;
        const vx2 = newAtoms[j].vx;
        const vy2 = newAtoms[j].vy;
        
        const m1 = atom1.element.mass;
        const m2 = atom2.element.mass;
        
        // 完全弾性衝突の計算
        const totalMass = m1 + m2;
        
        // X方向の速度更新
        newAtoms[i].vx = ((m1 - m2) * vx1 + 2 * m2 * vx2) / totalMass;
        newAtoms[j].vx = (2 * m1 * vx1 + (m2 - m1) * vx2) / totalMass;
        
        // Y方向の速度更新
        newAtoms[i].vy = ((m1 - m2) * vy1 + 2 * m2 * vy2) / totalMass;
        newAtoms[j].vy = (2 * m1 * vy1 + (m2 - m1) * vy2) / totalMass;
        
        // 速度の調整（反発後に離れるように）
        const speedBoost = 0.2;
        newAtoms[i].vx -= Math.cos(angle) * speedBoost;
        newAtoms[i].vy -= Math.sin(angle) * speedBoost;
        newAtoms[j].vx += Math.cos(angle) * speedBoost;
        newAtoms[j].vy += Math.sin(angle) * speedBoost;
      }
      // それ以外の場合は引力・斥力を適用（より離れた距離での相互作用）
      else if (dist < 150) { // 一定距離内の場合のみ適用
        // 同じ分子に属する原子間では引力は適用しない（すでに結合処理済み）
        if (sameGroup) continue;
        
        // 分子間の引力は0（分子同士は引きつけない）
        if (atom1.moleculeId && atom2.moleculeId && atom1.moleculeId !== atom2.moleculeId) {
          // ただしイオン間のみ引力・斥力を適用
          if (atom1.charge !== 0 && atom2.charge !== 0) {
            // イオン間の引力・斥力の計算
            const sameSign = Math.sign(atom1.charge) === Math.sign(atom2.charge);
            
            // 同符号なら反発、異符号なら引力
            let forceStrength;
            if (sameSign) {
              // 同符号イオン間の斥力
              forceStrength = -IONIC_REPULSION_FORCE * Math.abs(atom1.charge * atom2.charge);
            } else {
              // 異符号イオン間の引力
              forceStrength = IONIC_ATTRACTION_FORCE * Math.abs(atom1.charge * atom2.charge);
            }
            
            const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
            const forceX = Math.cos(angle) * forceStrength;
            const forceY = Math.sin(angle) * forceStrength;
            
            newAtoms[i].vx += forceX;
            newAtoms[i].vy += forceY;
            newAtoms[j].vx -= forceX;
            newAtoms[j].vy -= forceY;
          }
          continue; // 分子間は引力なし
        }
        
        // まだ分子に属していない原子間のみ引力を適用
        if (!atom1.moleculeId && !atom2.moleculeId) {
          // 水素と非金属 または 非金属同士の引力
          if ((atom1.element.symbol === 'H' && atom2.element.type === 'nonmetal') ||
              (atom2.element.symbol === 'H' && atom1.element.type === 'nonmetal') ||
              (atom1.element.type === 'nonmetal' && atom2.element.type === 'nonmetal')) {
            // 共有結合を形成する元素間の引力
            const attractionFactor = ATTRACTION_FORCE * 1.2 * 
                                 (atom1.element.electronegativity + atom2.element.electronegativity) / 8;
            
            const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
            const forceX = Math.cos(angle) * attractionFactor;
            const forceY = Math.sin(angle) * attractionFactor;
            
            newAtoms[i].vx += forceX;
            newAtoms[i].vy += forceY;
            newAtoms[j].vx -= forceX;
            newAtoms[j].vy -= forceY;
          }
          // 金属と非金属間の引力（イオン結合）
          else if ((atom1.element.type === 'metal' && atom2.element.type === 'nonmetal') ||
                   (atom1.element.type === 'nonmetal' && atom2.element.type === 'metal')) {
            // イオン結合を形成する元素間の引力
            const attractionFactor = ATTRACTION_FORCE * 1.5;
            
            const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
            const forceX = Math.cos(angle) * attractionFactor;
            const forceY = Math.sin(angle) * attractionFactor;
            
            newAtoms[i].vx += forceX;
            newAtoms[i].vy += forceY;
            newAtoms[j].vx -= forceX;
            newAtoms[j].vy -= forceY;
          }
        }
      }
    }
  }
  
  // 重なりチェックの最終パス - すべての原子ペアについて絶対に重ならないようにする
  ensureNoOverlap(newAtoms);
  
  // イオン結晶構造の調整
  adjustIonicCrystalStructure(newAtoms);
  
  return newAtoms;
};

// 重なりを完全に防止する関数 - 最終チェック
const ensureNoOverlap = (atoms) => {
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const atom1 = atoms[i];
      const atom2 = atoms[j];
      
      // 最小許容距離を計算
      const absoluteMinDist = (atom1.element.atomicRadius + atom2.element.atomicRadius) * ABSOLUTE_MIN_DISTANCE_FACTOR;
      
      // 実際の距離を計算
      const dist = distance(atom1.x, atom1.y, atom2.x, atom2.y);
      
      // 重なりがあれば強制的に修正
      if (dist < absoluteMinDist) {
        const overlap = absoluteMinDist - dist;
        const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
        
        // 正確に必要な移動量を計算
        const moveX = Math.cos(angle) * overlap;
        const moveY = Math.sin(angle) * overlap;
        
        // 等しく両方の原子を移動
        atoms[i].x -= moveX * 0.5;
        atoms[i].y -= moveY * 0.5;
        atoms[j].x += moveX * 0.5;
        atoms[j].y += moveY * 0.5;
      }
    }
  }
};

// 分子同士の衝突を処理
const handleMoleculeCollisions = (molecules, atoms) => {
  // 分子が2つ未満なら衝突処理不要
  if (molecules.length < 2) return;
  
  // 各分子のバウンディングボックスを計算
  const moleculeBounds = molecules.map(molecule => {
    // 分子内のすべての原子の座標から境界を計算
    const atomsInMolecule = molecule.atoms.map(atom => {
      // 実際のatoms配列から最新の座標を取得
      const updatedAtom = atoms.find(a => a.id === atom.id);
      return updatedAtom || atom;
    });
    
    // 分子の境界を計算
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    atomsInMolecule.forEach(atom => {
      const radius = atom.element.atomicRadius * 1.5; // 安全マージンを追加
      minX = Math.min(minX, atom.x - radius);
      minY = Math.min(minY, atom.y - radius);
      maxX = Math.max(maxX, atom.x + radius);
      maxY = Math.max(maxY, atom.y + radius);
    });
    
    // センターポイントと半径も計算
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    // 最大の半径を計算（中心からどの原子までの最大距離）
    let maxDistance = 0;
    atomsInMolecule.forEach(atom => {
      const dist = distance(centerX, centerY, atom.x, atom.y) + atom.element.atomicRadius * 1.5;
      maxDistance = Math.max(maxDistance, dist);
    });
    
    return {
      minX, minY, maxX, maxY,
      centerX, centerY, 
      radius: maxDistance + MIN_DISTANCE, // 最小許容距離も追加
      moleculeId: molecule.moleculeId || `molecule-${molecules.indexOf(molecule)}`,
      atoms: atomsInMolecule
    };
  });
  
  // 分子同士の衝突を検出して処理
  for (let i = 0; i < moleculeBounds.length; i++) {
    for (let j = i + 1; j < moleculeBounds.length; j++) {
      const mol1 = moleculeBounds[i];
      const mol2 = moleculeBounds[j];
      
      // 分子間の距離をチェック（円と円の衝突）
      const dist = distance(mol1.centerX, mol1.centerY, mol2.centerX, mol2.centerY);
      const minDist = mol1.radius + mol2.radius;
      
      // 衝突している場合 - バウンディングボックスが重なっているかをチェック
      if (dist < minDist ||
         (mol1.maxX > mol2.minX && mol1.minX < mol2.maxX && mol1.maxY > mol2.minY && mol1.minY < mol2.maxY)) {
        
        // 各原子ペア間の距離をチェック（より正確な衝突判定）
        let collisionDetected = false;
        let closestDist = Infinity;
        let closestAtom1 = null;
        let closestAtom2 = null;
        
        for (const atom1 of mol1.atoms) {
          for (const atom2 of mol2.atoms) {
            const atomDist = distance(atom1.x, atom1.y, atom2.x, atom2.y);
            const minAtomDist = (atom1.element.atomicRadius + atom2.element.atomicRadius) * ABSOLUTE_MIN_DISTANCE_FACTOR;
            
            // 原子が重なっている（または近すぎる）
            if (atomDist < minAtomDist) {
              collisionDetected = true;
              if (atomDist < closestDist) {
                closestDist = atomDist;
                closestAtom1 = atom1;
                closestAtom2 = atom2;
              }
            }
          }
        }
        
        // 実際に原子レベルで衝突が検出された場合のみ処理
        if (collisionDetected && closestAtom1 && closestAtom2) {
          // 重なりの度合い
          const overlap = (closestAtom1.element.atomicRadius + closestAtom2.element.atomicRadius) * 
                         ABSOLUTE_MIN_DISTANCE_FACTOR - closestDist;
          
          // 分子全体を移動させる反発ベクトルを計算
          const angle = Math.atan2(mol2.centerY - mol1.centerY, mol2.centerX - mol1.centerX);
          
          // 反発力（重なりが大きいほど強い反発）
          const repulsionFactor = Math.min(2.0, overlap / MIN_DISTANCE) * MOLECULE_REPULSION_FORCE;
          const moveX = Math.cos(angle) * overlap * repulsionFactor;
          const moveY = Math.sin(angle) * overlap * repulsionFactor;
          
          // 分子1に含まれるすべての原子を移動
          mol1.atoms.forEach(atom => {
            const atomIndex = atoms.findIndex(a => a.id === atom.id);
            if (atomIndex !== -1) {
              atoms[atomIndex].x -= moveX;
              atoms[atomIndex].y -= moveY;
              
              // 速度も反発方向に変更
              atoms[atomIndex].vx -= moveX * 0.1;
              atoms[atomIndex].vy -= moveY * 0.1;
            }
          });
          
          // 分子2に含まれるすべての原子を移動
          mol2.atoms.forEach(atom => {
            const atomIndex = atoms.findIndex(a => a.id === atom.id);
            if (atomIndex !== -1) {
              atoms[atomIndex].x += moveX;
              atoms[atomIndex].y += moveY;
              
              // 速度も反発方向に変更
              atoms[atomIndex].vx += moveX * 0.1;
              atoms[atomIndex].vy += moveY * 0.1;
            }
          });
          
          // 分子の速度を反発させる
          // 各分子の平均速度を計算
          let mol1AvgVx = 0, mol1AvgVy = 0;
          let mol2AvgVx = 0, mol2AvgVy = 0;
          
          mol1.atoms.forEach(atom => {
            const atomObj = atoms.find(a => a.id === atom.id);
            if (atomObj) {
              mol1AvgVx += atomObj.vx;
              mol1AvgVy += atomObj.vy;
            }
          });
          mol1AvgVx /= mol1.atoms.length;
          mol1AvgVy /= mol1.atoms.length;
          
          mol2.atoms.forEach(atom => {
            const atomObj = atoms.find(a => a.id === atom.id);
            if (atomObj) {
              mol2AvgVx += atomObj.vx;
              mol2AvgVy += atomObj.vy;
            }
          });
          mol2AvgVx /= mol2.atoms.length;
          mol2AvgVy /= mol2.atoms.length;
          
          // 弾性衝突のような速度交換
          const temp1Vx = mol1AvgVx;
          const temp1Vy = mol1AvgVy;
          mol1AvgVx = mol2AvgVx;
          mol1AvgVy = mol2AvgVy;
          mol2AvgVx = temp1Vx;
          mol2AvgVy = temp1Vy;
          
          // 各分子内の原子に新しい速度を適用
          mol1.atoms.forEach(atom => {
            const atomIndex = atoms.findIndex(a => a.id === atom.id);
            if (atomIndex !== -1) {
              atoms[atomIndex].vx = mol1AvgVx;
              atoms[atomIndex].vy = mol1AvgVy;
            }
          });
          
          mol2.atoms.forEach(atom => {
            const atomIndex = atoms.findIndex(a => a.id === atom.id);
            if (atomIndex !== -1) {
              atoms[atomIndex].vx = mol2AvgVx;
              atoms[atomIndex].vy = mol2AvgVy;
            }
          });
        }
      }
    }
  }
};

// イオン結晶構造を調整
const adjustIonicCrystalStructure = (atoms) => {
  // 分子グループを特定
  const molecules = identifyMolecules(atoms);
  
  // イオン結晶を特定（イオン結合を含むグループ）
  molecules.forEach(molecule => {
    if (molecule.atoms.some(atom => atom.bonds.some(bond => bond.type === 'ionic'))) {
      // 正と負のイオンを分類
      const positiveIons = molecule.atoms.filter(atom => atom.charge > 0);
      const negativeIons = molecule.atoms.filter(atom => atom.charge < 0);
      
      if (positiveIons.length === 0 || negativeIons.length === 0) return;
      
      // イオン結晶構造を維持するための力を適用
      positiveIons.forEach(posIon => {
        const posIdx = atoms.findIndex(a => a.id === posIon.id);
        if (posIdx === -1) return;
        
        // 陽イオン同士の反発力
        positiveIons.forEach(otherPosIon => {
          if (posIon.id === otherPosIon.id) return;
          
          const otherPosIdx = atoms.findIndex(a => a.id === otherPosIon.id);
          if (otherPosIdx === -1) return;
          
          // 同符号イオン間距離
          const dist = distance(atoms[posIdx].x, atoms[posIdx].y, atoms[otherPosIdx].x, atoms[otherPosIdx].y);
          const minDist = (posIon.element.atomicRadius + otherPosIon.element.atomicRadius) * 2.0;
          
          // 近すぎる場合は斥力を適用
          if (dist < minDist) {
            const repulsionForce = (minDist - dist) * IONIC_REPULSION_FORCE * 1.2;
            
            const angle = Math.atan2(atoms[otherPosIdx].y - atoms[posIdx].y, atoms[otherPosIdx].x - atoms[posIdx].x);
            const forceX = Math.cos(angle) * repulsionForce;
            const forceY = Math.sin(angle) * repulsionForce;
            
            atoms[posIdx].vx -= forceX;
            atoms[posIdx].vy -= forceY;
            atoms[otherPosIdx].vx += forceX;
            atoms[otherPosIdx].vy += forceY;
          }
        });
        
        // 陽イオンと陰イオン間の引力
        negativeIons.forEach(negIon => {
          const negIdx = atoms.findIndex(a => a.id === negIon.id);
          if (negIdx === -1) return;
          
          // 異符号イオン間の距離
          const dist = distance(atoms[posIdx].x, atoms[posIdx].y, atoms[negIdx].x, atoms[negIdx].y);
          const idealDist = (posIon.element.atomicRadius + negIon.element.atomicRadius) * 1.2;
          
          // 理想距離との差に基づく力
          if (Math.abs(dist - idealDist) > 5) {
            const forceMagnitude = (dist - idealDist) * CRYSTAL_STRUCTURE_FORCE;
            
            const angle = Math.atan2(atoms[negIdx].y - atoms[posIdx].y, atoms[negIdx].x - atoms[posIdx].x);
            const forceX = Math.cos(angle) * forceMagnitude;
            const forceY = Math.sin(angle) * forceMagnitude;
            
            atoms[posIdx].vx += forceX;
            atoms[posIdx].vy += forceY;
            atoms[negIdx].vx -= forceX;
            atoms[negIdx].vy -= forceY;
          }
        });
      });
      
      // 陰イオン同士の反発力を適用
      negativeIons.forEach(negIon => {
        const negIdx = atoms.findIndex(a => a.id === negIon.id);
        if (negIdx === -1) return;
        
        negativeIons.forEach(otherNegIon => {
          if (negIon.id === otherNegIon.id) return;
          
          const otherNegIdx = atoms.findIndex(a => a.id === otherNegIon.id);
          if (otherNegIdx === -1) return;
          
          // 同符号イオン間距離
          const dist = distance(atoms[negIdx].x, atoms[negIdx].y, atoms[otherNegIdx].x, atoms[otherNegIdx].y);
          const minDist = (negIon.element.atomicRadius + otherNegIon.element.atomicRadius) * 2.0;
          
          // 近すぎる場合は斥力を適用
          if (dist < minDist) {
            const repulsionForce = (minDist - dist) * IONIC_REPULSION_FORCE * 1.2;
            
            const angle = Math.atan2(atoms[otherNegIdx].y - atoms[negIdx].y, atoms[otherNegIdx].x - atoms[negIdx].x);
            const forceX = Math.cos(angle) * repulsionForce;
            const forceY = Math.sin(angle) * repulsionForce;
            
            atoms[negIdx].vx -= forceX;
            atoms[negIdx].vy -= forceY;
            atoms[otherNegIdx].vx += forceX;
            atoms[otherNegIdx].vy += forceY;
          }
        });
      });
      
      // イオン結晶の速度を同期させる
      // 分子全体の平均速度を計算
      let totalVx = 0, totalVy = 0;
      molecule.atoms.forEach(atom => {
        const atomObj = atoms.find(a => a.id === atom.id);
        if (atomObj) {
          totalVx += atomObj.vx;
          totalVy += atomObj.vy;
        }
      });
      
      const avgVx = totalVx / molecule.atoms.length;
      const avgVy = totalVy / molecule.atoms.length;
      
      // 結晶全体で速度を同期
      molecule.atoms.forEach(atom => {
        const atomIdx = atoms.findIndex(a => a.id === atom.id);
        if (atomIdx !== -1) {
          // 速度を徐々に平均に近づける
          atoms[atomIdx].vx = atoms[atomIdx].vx * 0.3 + avgVx * 0.7;
          atoms[atomIdx].vy = atoms[atomIdx].vy * 0.3 + avgVy * 0.7;
        }
      });
    }
  });
};

// 原子間の結合を検出し形成
export const detectAndFormBonds = (atoms, canBondFn, determineBondTypeFn, calculateBondPolarityFn) => {
  const newAtoms = [...atoms];
  const formedBonds = [];
  
  // 原子のキャッシュを更新（同一元素結合の制限用）
  if (typeof updateAtomsCache === 'function') {
    updateAtomsCache(atoms);
  }
  
  // すべての原子ペアについて結合可能性を確認
  for (let i = 0; i < atoms.length; i++) {
    const atom1 = atoms[i];
    
    for (let j = i + 1; j < atoms.length; j++) {
      const atom2 = atoms[j];
      
      // すでに結合済みなら飛ばす
      if (atom1.bonds.some(b => b.with === atom2.id) || 
          atom2.bonds.some(b => b.with === atom1.id)) {
        continue;
      }
      
      // 2原子間の距離を計算
      const dist = distance(atom1.x, atom1.y, atom2.x, atom2.y);
      const bondThreshold = (atom1.element.atomicRadius + atom2.element.atomicRadius) * 1.3; // 結合閾値
      
      // 十分近くて結合可能なら結合を形成
      if (dist < bondThreshold && canBondFn(atom1, atom2)) {
        // 結合の種類を決定
        const bondType = determineBondTypeFn(atom1, atom2);
        
        // 極性を計算（共有結合の場合）
        const polarity = calculateBondPolarityFn(atom1, atom2);
        
        // 使用する不対電子の位置を特定
        const atom1UnpairedElectronPosition = findUnusedUnpairedElectronPosition(atom1);
        const atom2UnpairedElectronPosition = findUnusedUnpairedElectronPosition(atom2);
        
        // 結合オブジェクトを作成
        const bond = {
          type: bondType,
          polarity: polarity,
          strength: bondType === 'covalent' ? 1.2 : 0.9, // 共有結合は強く、イオン結合はやや弱め
          electronPositionAtom1: atom1UnpairedElectronPosition,
          electronPositionAtom2: atom2UnpairedElectronPosition
        };
        
        // 両方の原子に結合情報を追加
        newAtoms[i].bonds.push({ with: atom2.id, ...bond });
        newAtoms[j].bonds.push({ with: atom1.id, ...bond });
        
        formedBonds.push({ atom1: atom1.id, atom2: atom2.id, ...bond });
        
        // 結合タイプに応じた処理
        if (bondType === 'covalent') {
          // 共有結合の場合は電子を共有（不対電子を結合に使用）
          // 既に不対電子の位置情報は記録済み
          
          // オクテット則に基づく電子状態の更新（実際の電子移動はない）
          // 共有結合では実質的に電子を1つずつ獲得したことになる
          const atom1Idx = newAtoms.findIndex(a => a.id === atom1.id);
          const atom2Idx = newAtoms.findIndex(a => a.id === atom2.id);
          
          if (atom1Idx !== -1 && atom2Idx !== -1) {
            // 共有電子情報の更新（visualのみ、電荷は変化なし）
            newAtoms[atom1Idx].sharedElectrons = (newAtoms[atom1Idx].sharedElectrons || 0) + 1;
            newAtoms[atom2Idx].sharedElectrons = (newAtoms[atom2Idx].sharedElectrons || 0) + 1;
          }
        } else if (bondType === 'ionic') {
          // イオン結合の場合は電子の移動を表現
          const metal = atom1.element.type === 'metal' ? atom1 : atom2;
          const nonmetal = atom1.element.type === 'nonmetal' ? atom1 : atom2;
          
          const metalIndex = atoms.findIndex(a => a.id === metal.id);
          const nonmetalIndex = atoms.findIndex(a => a.id === nonmetal.id);
          
          if (metalIndex !== -1 && nonmetalIndex !== -1) {
            // イオン化（電荷上限を考慮）
            const currentMetalCharge = newAtoms[metalIndex].charge || 0;
            const currentNonmetalCharge = newAtoms[nonmetalIndex].charge || 0;
            
            // 電荷が上限に達していない場合のみ増減
            if (currentMetalCharge < metal.element.maxCharge && 
                currentNonmetalCharge > -nonmetal.element.maxCharge) {
              // 金属イオンは電子を失い陽イオンに
              newAtoms[metalIndex].charge = (currentMetalCharge || 0) + 1;
              
              // 非金属イオンは電子を得て陰イオンに
              newAtoms[nonmetalIndex].charge = (currentNonmetalCharge || 0) - 1;
              
              // イオン状態の更新
              newAtoms[metalIndex].ionicState = 'cation'; // 陽イオン
              newAtoms[nonmetalIndex].ionicState = 'anion'; // 陰イオン
            }
          }
        }
      }
    }
  }
  
  // 結合形成後のモジュール状態を更新
  const atomsWithUpdatedStates = updateMolecularStates(newAtoms);
  
  // 結合角度に基づいて適切な位置に原子を配置
  const atomsWithProperBondAngles = adjustBondAngles(atomsWithUpdatedStates);
  
  // イオン結晶構造を整える（イオン結合を持つグループがある場合）
  const finalAtoms = arrangeIonicCrystalStructure(atomsWithProperBondAngles);
  
  return { atoms: finalAtoms, newBonds: formedBonds };
};

// 使用されていない不対電子の位置を見つける
const findUnusedUnpairedElectronPosition = (atom) => {
  // 不対電子のリストを取得
  const unpairedElectrons = atom.element.valenceElectrons
    .filter(e => !e.paired)
    .map(e => e.position);
  
  // すでに結合に使われている不対電子の位置を取得
  const usedPositions = atom.bonds.map(b => b.electronPositionAtom1 || b.electronPositionAtom2)
    .filter(pos => pos !== undefined);
  
  // 使われていない不対電子の位置を返す
  for (const pos of unpairedElectrons) {
    if (!usedPositions.includes(pos)) {
      return pos;
    }
  }
  
  // 使用可能な不対電子が見つからない場合は最初の位置を返す
  return unpairedElectrons[0];
};

// 結合角度に基づいて原子の位置を調整
const adjustBondAngles = (atoms) => {
  const newAtoms = [...atoms];
  const molecules = identifyMolecules(atoms);
  
  // 各分子について結合角度を調整
  molecules.forEach(molecule => {
    if (molecule.atoms.length <= 1) return; // 単一原子は調整不要
    
    // 分子内の中心原子を特定（最も多くの結合を持つ原子）
    const centralAtomCandidate = molecule.atoms.reduce((max, atom) => 
      atom.bonds.length > max.bonds.length ? atom : max, molecule.atoms[0]);
    
    // 中心原子が複数の結合を持つ場合のみ処理
    if (centralAtomCandidate.bonds.length >= 2) {
      const centralAtom = centralAtomCandidate;
      const centralAtomIndex = newAtoms.findIndex(a => a.id === centralAtom.id);
      
      // 結合角度のパターンを決定
      let bondAnglePattern;
      switch (centralAtom.bonds.length) {
        case 2: // 直線型（例：CO2, HCl）
          bondAnglePattern = [0, Math.PI]; // 180度間隔
          break;
        case 3: // 三角平面（例：BF3, NH3の平面部分）
          bondAnglePattern = [0, (2*Math.PI)/3, (4*Math.PI)/3]; // 120度間隔
          break;
        case 4: // 四面体（例：CH4, NH4+）
          // 実際の四面体の角度は複雑ですが、単純化して90度間隔の2Dモデルで表現
          bondAnglePattern = [0, Math.PI/2, Math.PI, 3*Math.PI/2]; // 90度間隔
          break;
        default:
          // その他のケースは均等配置
          bondAnglePattern = Array.from({length: centralAtom.bonds.length}, 
            (_, i) => i * (2 * Math.PI / centralAtom.bonds.length));
      }
      
      // 結合している原子を調整された角度に配置
      centralAtom.bonds.forEach((bond, idx) => {
        const connectedAtomId = bond.with;
        const connectedAtomIndex = newAtoms.findIndex(a => a.id === connectedAtomId);
        
        if (connectedAtomIndex !== -1) {
          const angle = bondAnglePattern[idx % bondAnglePattern.length];
          // 原子半径の合計の70%程度の距離に配置して密着感を出す
          // ただし、絶対に重ならない最小距離を保証
          const safeDistance = Math.max(
            (centralAtom.element.atomicRadius + newAtoms[connectedAtomIndex].element.atomicRadius) * ABSOLUTE_MIN_DISTANCE_FACTOR,
            (centralAtom.element.atomicRadius + newAtoms[connectedAtomIndex].element.atomicRadius) * 0.7
          );
          
          // 調整された位置
          const newX = centralAtom.x + Math.cos(angle) * safeDistance;
          const newY = centralAtom.y + Math.sin(angle) * safeDistance;
          
          // 新しい位置を設定
          newAtoms[connectedAtomIndex].x = newX;
          newAtoms[connectedAtomIndex].y = newY;
          
          // 速度も中心原子に合わせる
          newAtoms[connectedAtomIndex].vx = centralAtom.vx;
          newAtoms[connectedAtomIndex].vy = centralAtom.vy;
          
          // 結合に使われた電子の位置を更新
          const bondIdx = newAtoms[connectedAtomIndex].bonds.findIndex(b => b.with === centralAtom.id);
          if (bondIdx !== -1) {
            const electronPosition = Math.floor(angle / (Math.PI/4)) % 8;
            newAtoms[connectedAtomIndex].bonds[bondIdx].electronPositionAtom2 = electronPosition;
            
            // 反対方向の角度（180度回転）
            const oppositeAngle = (angle + Math.PI) % (2 * Math.PI);
            const oppositePosition = Math.floor(oppositeAngle / (Math.PI/4)) % 8;
            
            // 中心原子側の電子位置も更新
            const centralBondIdx = newAtoms[centralAtomIndex].bonds.findIndex(b => b.with === connectedAtomId);
            if (centralBondIdx !== -1) {
              newAtoms[centralAtomIndex].bonds[centralBondIdx].electronPositionAtom1 = oppositePosition;
            }
          }
        }
      });
    }
    
    // 分子内のすべての原子ペアについて重なりをチェック
    for (let i = 0; i < molecule.atoms.length; i++) {
      for (let j = i + 1; j < molecule.atoms.length; j++) {
        const atom1 = newAtoms.find(a => a.id === molecule.atoms[i].id);
        const atom2 = newAtoms.find(a => a.id === molecule.atoms[j].id);
        
        if (atom1 && atom2) {
          const minAllowedDist = (atom1.element.atomicRadius + atom2.element.atomicRadius) * ABSOLUTE_MIN_DISTANCE_FACTOR;
          const dist = distance(atom1.x, atom1.y, atom2.x, atom2.y);
          
          // 重なりが検出された場合は強制的に位置を調整
          if (dist < minAllowedDist) {
            const overlap = minAllowedDist - dist;
            const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
            
            // 両方を移動して重なりを解消
            const idx1 = newAtoms.findIndex(a => a.id === atom1.id);
            const idx2 = newAtoms.findIndex(a => a.id === atom2.id);
            
            if (idx1 !== -1 && idx2 !== -1) {
              newAtoms[idx1].x -= Math.cos(angle) * overlap * 0.5;
              newAtoms[idx1].y -= Math.sin(angle) * overlap * 0.5;
              newAtoms[idx2].x += Math.cos(angle) * overlap * 0.5;
              newAtoms[idx2].y += Math.sin(angle) * overlap * 0.5;
            }
          }
        }
      }
    }
  });
  
  return newAtoms;
};

// イオン結晶構造を整える
const arrangeIonicCrystalStructure = (atoms) => {
  const newAtoms = [...atoms];
  const molecules = identifyMolecules(atoms);
  
  // イオン結晶を形成している分子を特定
  const ionicCrystals = molecules.filter(molecule => 
    molecule.atoms.some(atom => 
      atom.bonds.some(bond => bond.type === 'ionic') && 
      (atom.charge !== 0 || atom.element.type === 'metal')
    )
  );
  
  // イオン結晶ごとに構造を整える
  ionicCrystals.forEach(crystal => {
    // 正と負のイオンを分類
    const positiveIons = crystal.atoms.filter(atom => atom.charge > 0 || atom.element.type === 'metal');
    const negativeIons = crystal.atoms.filter(atom => atom.charge < 0 || 
      (atom.element.type === 'nonmetal' && atom.bonds.some(bond => bond.type === 'ionic')));
    
    if (positiveIons.length === 0 || negativeIons.length === 0) return;
    
    // 結晶の中心位置を計算
    const centerX = crystal.atoms.reduce((sum, atom) => sum + atom.x, 0) / crystal.atoms.length;
    const centerY = crystal.atoms.reduce((sum, atom) => sum + atom.y, 0) / crystal.atoms.length;
    
    // 格子の大きさを設定（原子半径の安全な距離）
    const avgRadius = crystal.atoms.reduce((sum, atom) => sum + atom.element.atomicRadius, 0) / crystal.atoms.length;
    // 最小許容距離を確保
    const latticeSize = avgRadius * 2.5 * ABSOLUTE_MIN_DISTANCE_FACTOR;
    
    // 最適な格子サイズを計算
    const totalIons = crystal.atoms.length;
    const gridSize = Math.max(2, Math.ceil(Math.sqrt(totalIons)));
    
    // 格子の開始位置（左上隅）
    const startX = centerX - (gridSize * latticeSize) / 2;
    const startY = centerY - (gridSize * latticeSize) / 2;
    
    // 格子点の位置を計算
    const gridPoints = [];
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        gridPoints.push({
          x: startX + col * latticeSize,
          y: startY + row * latticeSize,
          occupied: false
        });
      }
    }
    
    // 陽イオンと陰イオンを交互に配置
    const placedIons = new Set();
    
    // 交互に陽イオンと陰イオンを配置
    const orderedIons = [];
    const smallerLength = Math.min(positiveIons.length, negativeIons.length);
    
    for (let i = 0; i < smallerLength; i++) {
      orderedIons.push(positiveIons[i]);
      orderedIons.push(negativeIons[i]);
    }
    
    // 余りのイオンを追加
    if (positiveIons.length > smallerLength) {
      orderedIons.push(...positiveIons.slice(smallerLength));
    }
    if (negativeIons.length > smallerLength) {
      orderedIons.push(...negativeIons.slice(smallerLength));
    }
    
    // 格子点にイオンを配置
    orderedIons.forEach((ion, index) => {
      if (index >= gridPoints.length) return; // 格子点が足りない場合は配置しない
      
      const ionIndex = newAtoms.findIndex(a => a.id === ion.id);
      if (ionIndex !== -1 && !placedIons.has(ion.id)) {
        // 格子点の位置にイオンを配置
        const gridPoint = gridPoints[index];
        newAtoms[ionIndex].x = gridPoint.x;
        newAtoms[ionIndex].y = gridPoint.y;
        gridPoint.occupied = true;
        placedIons.add(ion.id);
      }
    });
    
    // 配置後の重なり検出と修正
    for (let i = 0; i < orderedIons.length; i++) {
      if (!placedIons.has(orderedIons[i].id)) continue;
      
      const ion1Index = newAtoms.findIndex(a => a.id === orderedIons[i].id);
      if (ion1Index === -1) continue;
      
      for (let j = i + 1; j < orderedIons.length; j++) {
        if (!placedIons.has(orderedIons[j].id)) continue;
        
        const ion2Index = newAtoms.findIndex(a => a.id === orderedIons[j].id);
        if (ion2Index === -1) continue;
        
        // 距離の計算
        const dist = distance(
          newAtoms[ion1Index].x, newAtoms[ion1Index].y,
          newAtoms[ion2Index].x, newAtoms[ion2Index].y
        );
        
        // 最小許容距離
        const minAllowedDist = (
          newAtoms[ion1Index].element.atomicRadius + 
          newAtoms[ion2Index].element.atomicRadius
        ) * ABSOLUTE_MIN_DISTANCE_FACTOR;
        
        // 重なりがあれば修正
        if (dist < minAllowedDist) {
          const angle = Math.atan2(
            newAtoms[ion2Index].y - newAtoms[ion1Index].y,
            newAtoms[ion2Index].x - newAtoms[ion1Index].x
          );
          
          const moveX = Math.cos(angle) * (minAllowedDist - dist);
          const moveY = Math.sin(angle) * (minAllowedDist - dist);
          
          newAtoms[ion1Index].x -= moveX * 0.5;
          newAtoms[ion1Index].y -= moveY * 0.5;
          newAtoms[ion2Index].x += moveX * 0.5;
          newAtoms[ion2Index].y += moveY * 0.5;
        }
      }
    }
    
    // 結晶の全イオンの速度を平均化
    let avgVx = 0, avgVy = 0;
    let totalPlacedIons = 0;
    
    placedIons.forEach(ionId => {
      const ion = newAtoms.find(a => a.id === ionId);
      if (ion) {
        avgVx += ion.vx;
        avgVy += ion.vy;
        totalPlacedIons++;
      }
    });
    
    if (totalPlacedIons > 0) {
      avgVx /= totalPlacedIons;
      avgVy /= totalPlacedIons;
      
      // すべてのイオンに同じ速度を設定
      placedIons.forEach(ionId => {
        const ionIndex = newAtoms.findIndex(a => a.id === ionId);
        if (ionIndex !== -1) {
          newAtoms[ionIndex].vx = avgVx;
          newAtoms[ionIndex].vy = avgVy;
          
          // イオン状態を設定
          if (newAtoms[ionIndex].charge > 0) {
            newAtoms[ionIndex].ionicState = 'cation';
          } else if (newAtoms[ionIndex].charge < 0) {
            newAtoms[ionIndex].ionicState = 'anion';
          }
        }
      });
    }
    
    // 結晶全体として同じ分子IDを設定
    const crystalId = `crystal-${Date.now()}`;
    placedIons.forEach(ionId => {
      const ionIndex = newAtoms.findIndex(a => a.id === ionId);
      if (ionIndex !== -1) {
        newAtoms[ionIndex].moleculeId = crystalId;
      }
    });
  });
  
  return newAtoms;
};

// 分子グループを特定し状態を更新
export const updateMolecularStates = (atoms) => {
  // 結合情報からグループ（分子）を特定
  const molecules = identifyMolecules(atoms);
  const newAtoms = [...atoms];
  
  // 各分子の状態を決定し原子に適用
  molecules.forEach((molecule, index) => {
    // 分子の状態を決定（気体、液体、固体）
    let moleculeState = 'gas'; // デフォルトは気体
    
    // 結合タイプに基づいて状態を決定
    if (molecule.atoms.some(atom => 
        atom.bonds.some(bond => bond.type === 'ionic'))) {
      // イオン結合を含む場合は固体
      moleculeState = 'solid';
    } else if (molecule.atoms.length > 3) {
      // 大きな共有結合分子は液体または固体
      moleculeState = 'liquid';
    } else {
      // 小さな共有結合分子（H2, O2など）は気体
      moleculeState = 'gas';
    }
    
    // 分子内の各原子の状態を更新
    molecule.atomIds.forEach(atomId => {
      const atomIndex = newAtoms.findIndex(a => a.id === atomId);
      if (atomIndex !== -1) {
        newAtoms[atomIndex].state = moleculeState;
        newAtoms[atomIndex].moleculeId = `molecule-${index}`; // 分子IDを追加
      }
    });
  });
  
  return newAtoms;
};

// 結合情報から分子を特定
export const identifyMolecules = (atoms) => {
  const visited = new Set();
  const molecules = [];
  
  // すべての原子についてDFSで結合グループを探索
  atoms.forEach(atom => {
    if (!visited.has(atom.id)) {
      const molecule = { atomIds: [], atoms: [], bonds: [] };
      dfs(atom, atoms, visited, molecule);
      molecules.push(molecule);
    }
  });
  
  return molecules;
};

// 深さ優先探索で結合ネットワークを探索
const dfs = (atom, allAtoms, visited, molecule) => {
  visited.add(atom.id);
  molecule.atomIds.push(atom.id);
  molecule.atoms.push(atom);
  
  // 結合している各原子について再帰的に探索
  atom.bonds.forEach(bond => {
    if (!visited.has(bond.with)) {
      const connectedAtom = allAtoms.find(a => a.id === bond.with);
      molecule.bonds.push({
        from: atom.id,
        to: bond.with,
        type: bond.type,
        polarity: bond.polarity
      });
      
      if (connectedAtom) {
        dfs(connectedAtom, allAtoms, visited, molecule);
      }
    }
  });
};