// physicsEngine.js - 物理演算とシミュレーションロジック

// 原子のキャッシュ変数
let atomsCache = [];

// アトムキャッシュ更新関数
export const updateAtomsCache = (atoms) => {
  atomsCache = [...atoms];
};

// 物理定数 - 接触モデル用に調整
const GRAVITY = 0.05;  // 重力加速度
const FRICTION = 0.98; // 摩擦係数
const MIN_DISTANCE = 5; // 原子間の最小許容距離
const BOND_FORCE = 0.4; // 結合力の強さ
const REPULSION_FORCE = 0.5; // 原子間の反発力
const ATTRACTION_FORCE = 0.02; // 引力の強さ - 非金属同士や適合する原子間
const ABSOLUTE_MIN_DISTANCE_FACTOR = 1.05; // 原子中心間の最小距離係数
const BOND_FORMATION_DISTANCE = 1.5; // 結合を形成する距離係数（原子半径の合計の倍率）

// 2点間の距離を計算
export const distance = (x1, y1, x2, y2) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

// 2点間の角度を計算（ラジアン）
export const angle = (x1, y1, x2, y2) => {
  return Math.atan2(y2 - y1, x2 - x1);
};

// 原子の動きを更新 - 回転は元素記号表示のみに使用
export const updateAtomPosition = (atom, canvasWidth, canvasHeight, atoms) => {
  const newAtom = { ...atom };
  
  // 回転更新 - 元素記号の向きのみに影響（電子は固定）
  if (newAtom.rotationSpeed === undefined) {
    // ランダムな回転速度を設定 (±0.01 rad/フレーム程度)
    newAtom.rotationSpeed = (Math.random() - 0.5) * 0.02;
  }
  
  // 回転角度を更新
  if (newAtom.rotation === undefined) {
    newAtom.rotation = 0;
  }
  newAtom.rotation = (newAtom.rotation + newAtom.rotationSpeed) % (Math.PI * 2);
  
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
  if (currentSpeed > 1.2) { // MAX_VELOCITY = 1.2
    const ratio = 1.2 / currentSpeed;
    newAtom.vx *= ratio;
    newAtom.vy *= ratio;
  }
  
  // 壁との衝突判定と反射
  const radius = atom.element.atomicRadius * 1.5;
  
  // 左右の壁
  if (newAtom.x - radius < 0) {
    newAtom.x = radius;
    newAtom.vx = Math.abs(newAtom.vx) * 0.8;
  } else if (newAtom.x + radius > canvasWidth) {
    newAtom.x = canvasWidth - radius;
    newAtom.vx = -Math.abs(newAtom.vx) * 0.8;
  }
  
  // 上下の壁
  if (newAtom.y - radius < 0) {
    newAtom.y = radius;
    newAtom.vy = Math.abs(newAtom.vy) * 0.8;
  } else if (newAtom.y + radius > canvasHeight) {
    newAtom.y = canvasHeight - radius;
    newAtom.vy = -Math.abs(newAtom.vy) * 0.8;
  }
  
  return newAtom;
};

// 原子間の相互作用を計算 - 接触モデル
export const calculateAtomInteractions = (atoms) => {
  const newAtoms = [...atoms];
  
  // すべての原子ペアについて相互作用を計算
  for (let i = 0; i < atoms.length; i++) {
    const atom1 = atoms[i];
    
    for (let j = i + 1; j < atoms.length; j++) {
      const atom2 = atoms[j];
      
      // 原子間の距離を計算
      const dist = distance(atom1.x, atom1.y, atom2.x, atom2.y);
      const minDist = (atom1.element.atomicRadius + atom2.element.atomicRadius) * ABSOLUTE_MIN_DISTANCE_FACTOR;
      
      // 原子同士の近接時の反発力（めり込み防止）
      if (dist < minDist) {
        // 反発方向のベクトル
        const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
        
        // 反発力の計算（距離が近いほど強い）
        const repulsionForce = REPULSION_FORCE * (minDist - dist) / minDist;
        
        // 力の適用
        newAtoms[i].vx -= Math.cos(angle) * repulsionForce;
        newAtoms[i].vy -= Math.sin(angle) * repulsionForce;
        newAtoms[j].vx += Math.cos(angle) * repulsionForce;
        newAtoms[j].vy += Math.sin(angle) * repulsionForce;
        
        // 接触を記録（結合形成用）
        if (dist < (atom1.element.atomicRadius + atom2.element.atomicRadius) * BOND_FORMATION_DISTANCE) {
          if (!newAtoms[i].contacts) newAtoms[i].contacts = [];
          if (!newAtoms[j].contacts) newAtoms[j].contacts = [];
          
          // すでに接触記録がなければ追加
          if (!newAtoms[i].contacts.includes(atom2.id)) {
            newAtoms[i].contacts.push(atom2.id);
          }
          if (!newAtoms[j].contacts.includes(atom1.id)) {
            newAtoms[j].contacts.push(atom1.id);
          }
        }
      }
      
      // 既存の結合があれば結合力を適用
      const bond = atom1.bonds.find(b => b.with === atom2.id) || atom2.bonds.find(b => b.with === atom1.id);
      if (bond) {
        // 結合タイプに応じた理想距離
        const bondType = bond.type;
        const idealDist = minDist * (bondType === 'covalent' ? 0.8 : 1.1);
        
        // 結合力の計算
        const bondForce = BOND_FORCE * (dist - idealDist) / idealDist;
        
        // 力の方向
        const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
        
        // 力の適用
        newAtoms[i].vx += Math.cos(angle) * bondForce;
        newAtoms[i].vy += Math.sin(angle) * bondForce;
        newAtoms[j].vx -= Math.cos(angle) * bondForce;
        newAtoms[j].vy -= Math.sin(angle) * bondForce;
      }
      // 結合していないが引力が働く場合（例：非金属同士）
      else if (!bond && dist < (atom1.element.atomicRadius + atom2.element.atomicRadius) * 3) {
        // 引力が発生するペアを判定
        let attractionMultiplier = 0;
        
        // 非金属同士は引力が発生
        if (atom1.element.type === 'nonmetal' && atom2.element.type === 'nonmetal') {
          attractionMultiplier = 1.0;
        }
        // 金属と非金属も引力が発生（イオン結合になる）
        else if ((atom1.element.type === 'metal' && atom2.element.type === 'nonmetal') ||
                (atom1.element.type === 'nonmetal' && atom2.element.type === 'metal')) {
          attractionMultiplier = 0.8;
        }
        
        if (attractionMultiplier > 0) {
          // 引力の計算
          const force = ATTRACTION_FORCE * attractionMultiplier * (1 - dist / (3 * (atom1.element.atomicRadius + atom2.element.atomicRadius)));
          
          // 力の方向
          const angle = Math.atan2(atom2.y - atom1.y, atom2.x - atom1.x);
          
          // 力の適用
          newAtoms[i].vx += Math.cos(angle) * force;
          newAtoms[i].vy += Math.sin(angle) * force;
          newAtoms[j].vx -= Math.cos(angle) * force;
          newAtoms[j].vy -= Math.sin(angle) * force;
        }
      }
    }
  }
  
  return newAtoms;
};

// 原子間の結合を検出し形成（接触モデル）
export const detectAndFormBonds = (atoms, canBondFn, determineBondTypeFn, calculateBondPolarityFn) => {
  const newAtoms = [...atoms];
  const formedBonds = [];
  
  // 接触情報から結合を形成
  for (let i = 0; i < newAtoms.length; i++) {
    const atom = newAtoms[i];
    
    // 接触情報がある場合
    if (atom.contacts && atom.contacts.length > 0) {
      // 接触している原子ごとに処理
      for (const contactId of atom.contacts) {
        // この原子がまだこの相手と結合していないか確認
        if (!atom.bonds.some(b => b.with === contactId)) {
          // 相手の原子を取得
          const partnerIndex = newAtoms.findIndex(a => a.id === contactId);
          if (partnerIndex === -1) continue;
          
          const partner = newAtoms[partnerIndex];
          
          // 両方の原子が結合可能か確認
          if (canBondFn(atom, partner)) {
            // 結合タイプの決定
            const bondType = determineBondTypeFn(atom, partner);
            
            // 極性の計算
            const polarity = calculateBondPolarityFn(atom, partner);
            
            // 結合に使用する電子位置の特定
            const atom1ElectronPos = findAvailableElectronPosition(atom);
            const atom2ElectronPos = findAvailableElectronPosition(partner);
            
            // 電子位置が見つかれば結合を形成
            if (atom1ElectronPos !== -1 && atom2ElectronPos !== -1) {
              // 結合オブジェクトを作成
              const bond = {
                type: bondType,
                polarity: polarity,
                strength: bondType === 'covalent' ? 1.2 : 0.9,
                electronPositionAtom1: atom1ElectronPos,
                electronPositionAtom2: atom2ElectronPos
              };
              
              // 両方の原子に結合情報を追加
              newAtoms[i].bonds.push({ with: partner.id, ...bond });
              newAtoms[partnerIndex].bonds.push({ with: atom.id, ...bond });
              
              formedBonds.push({ atom1: atom.id, atom2: partner.id, ...bond });
              
              // 結合タイプに応じた処理
              if (bondType === 'covalent') {
                // 共有結合の処理
                newAtoms[i].sharedElectrons = (newAtoms[i].sharedElectrons || 0) + 1;
                newAtoms[partnerIndex].sharedElectrons = (newAtoms[partnerIndex].sharedElectrons || 0) + 1;
              } else if (bondType === 'ionic') {
                // イオン結合の処理
                const metal = atom.element.type === 'metal' ? atom : partner;
                const nonmetal = atom.element.type === 'nonmetal' ? atom : partner;
                
                const metalIndex = metal.id === atom.id ? i : partnerIndex;
                const nonmetalIndex = nonmetal.id === atom.id ? i : partnerIndex;
                
                // イオン化
                const currentMetalCharge = newAtoms[metalIndex].charge || 0;
                const currentNonmetalCharge = newAtoms[nonmetalIndex].charge || 0;
                
                if (currentMetalCharge < metal.element.maxCharge && 
                    currentNonmetalCharge > -nonmetal.element.maxCharge) {
                  newAtoms[metalIndex].charge = (currentMetalCharge || 0) + 1;
                  newAtoms[nonmetalIndex].charge = (currentNonmetalCharge || 0) - 1;
                  
                  newAtoms[metalIndex].ionicState = 'cation';
                  newAtoms[nonmetalIndex].ionicState = 'anion';
                }
              }
            }
          }
        }
      }
      
      // 接触情報をクリア
      newAtoms[i].contacts = [];
    }
  }
  
  // 分子状態の更新
  const atomsWithUpdatedStates = updateMolecularStates(newAtoms);
  
  return { atoms: atomsWithUpdatedStates, newBonds: formedBonds };
};

// 結合に使用可能な電子位置を見つける
const findAvailableElectronPosition = (atom) => {
  if (!atom.element.valenceElectrons) return -1;
  
  // 使用可能な電子位置（不対電子の位置）を探す
  const unpairedElectrons = atom.element.valenceElectrons
    .map((e, idx) => ({ electron: e, index: idx }))
    .filter(({ electron }) => electron && !electron.paired);
  
  // 既に結合で使用している電子位置
  const usedPositions = atom.bonds.flatMap(bond => 
    bond.electronPositionAtom1 !== undefined ? [bond.electronPositionAtom1] : []
  );
  
  // 使用可能な電子位置を探す
  for (const { electron, index } of unpairedElectrons) {
    if (!usedPositions.includes(electron.position)) {
      return electron.position;
    }
  }
  
  return -1; // 使用可能な電子位置がない
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