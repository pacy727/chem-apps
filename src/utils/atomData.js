// 原子データモジュールの状態管理
let atomsCache = []; // 原子のキャッシュ（結合判定で使用）

// キャッシュを更新する関数
export const updateAtomsCache = (atoms) => {
  atomsCache = [...atoms];
};// atomData.js - 元素データと性質を定義

// 元素データ - 元素記号、名前、最外殻電子数、電気陰性度、金属/非金属区分、色、原子価電子配置
export const elements = {
  // 非金属
  H: { 
    symbol: 'H', 
    name: '水素', 
    outerElectrons: 1, 
    electronegativity: 2.2, 
    type: 'nonmetal', 
    color: '#FFFFFF', 
    valenceElectrons: [{ position: 0, paired: false }], // 1s¹
    atomicRadius: 12,
    mass: 1,
    maxCharge: -1, // 最大電荷（負）
    desiredElectrons: 2  // 水素は2電子で安定（ヘリウムと同じ）
  },
  C: { 
    symbol: 'C', 
    name: '炭素', 
    outerElectrons: 4, 
    electronegativity: 2.6, 
    type: 'nonmetal', 
    color: '#909090', 
    valenceElectrons: [
      { position: 0, paired: false }, // 2p²の4つの不対電子（sp³混成軌道）
      { position: 2, paired: false },
      { position: 4, paired: false },
      { position: 6, paired: false }
    ],
    atomicRadius: 16,
    mass: 12,
    maxCharge: -4,
    desiredElectrons: 8  // オクテット則
  },
  N: { 
    symbol: 'N', 
    name: '窒素', 
    outerElectrons: 5, 
    electronegativity: 3.0, 
    type: 'nonmetal', 
    color: '#3050F8', 
    valenceElectrons: [
      { position: 0, paired: false }, // 2p³の3つの不対電子
      { position: 2, paired: false },
      { position: 4, paired: false },
      { position: 6, paired: true },  // 1対の対電子
      { position: 6, paired: true }
    ],
    atomicRadius: 14,
    mass: 14,
    maxCharge: -3,
    desiredElectrons: 8
  },
  O: { 
    symbol: 'O', 
    name: '酸素', 
    outerElectrons: 6, 
    electronegativity: 3.5, 
    type: 'nonmetal', 
    color: '#FF0D0D', 
    valenceElectrons: [
      { position: 0, paired: false }, // 2p⁴の2つの不対電子
      { position: 2, paired: false },
      { position: 4, paired: true },  // 2対の対電子
      { position: 4, paired: true },
      { position: 6, paired: true },
      { position: 6, paired: true }
    ],
    atomicRadius: 14,
    mass: 16,
    maxCharge: -2,
    desiredElectrons: 8
  },
  F: { 
    symbol: 'F', 
    name: 'フッ素', 
    outerElectrons: 7, 
    electronegativity: 4.0, 
    type: 'nonmetal', 
    color: '#90E050', 
    valenceElectrons: [
      { position: 0, paired: false }, // 2p⁵の1つの不対電子
      { position: 2, paired: true },  // 3対の対電子
      { position: 2, paired: true },
      { position: 4, paired: true },
      { position: 4, paired: true },
      { position: 6, paired: true },
      { position: 6, paired: true }
    ],
    atomicRadius: 12,
    mass: 19,
    maxCharge: -1,
    desiredElectrons: 8
  },
  Cl: { 
    symbol: 'Cl', 
    name: '塩素', 
    outerElectrons: 7, 
    electronegativity: 3.2, 
    type: 'nonmetal', 
    color: '#1FF01F', 
    valenceElectrons: [
      { position: 0, paired: false }, // 3p⁵の1つの不対電子
      { position: 2, paired: true },  // 3対の対電子
      { position: 2, paired: true },
      { position: 4, paired: true },
      { position: 4, paired: true },
      { position: 6, paired: true },
      { position: 6, paired: true }
    ],
    atomicRadius: 18,
    mass: 35.5,
    maxCharge: -1,
    desiredElectrons: 8
  },
  
  // 金属
  Li: { 
    symbol: 'Li', 
    name: 'リチウム', 
    outerElectrons: 1, 
    electronegativity: 1.0, 
    type: 'metal', 
    color: '#CC80FF', 
    valenceElectrons: [{ position: 0, paired: false }], // 2s¹
    atomicRadius: 18,
    mass: 7,
    maxCharge: 1,
    desiredElectrons: 0  // 金属は電子を失うと安定
  },
  Na: { 
    symbol: 'Na', 
    name: 'ナトリウム', 
    outerElectrons: 1, 
    electronegativity: 0.9, 
    type: 'metal', 
    color: '#AB5CF2', 
    valenceElectrons: [{ position: 0, paired: false }], // 3s¹
    atomicRadius: 22,
    mass: 23,
    maxCharge: 1,
    desiredElectrons: 0
  },
  K: { 
    symbol: 'K', 
    name: 'カリウム', 
    outerElectrons: 1, 
    electronegativity: 0.8, 
    type: 'metal', 
    color: '#8F40D4', 
    valenceElectrons: [{ position: 0, paired: false }], // 4s¹
    atomicRadius: 26,
    mass: 39,
    maxCharge: 1,
    desiredElectrons: 0
  },
  Mg: { 
    symbol: 'Mg', 
    name: 'マグネシウム', 
    outerElectrons: 2, 
    electronegativity: 1.3, 
    type: 'metal', 
    color: '#8AFF00', 
    valenceElectrons: [
      { position: 0, paired: false }, // 3s²
      { position: 4, paired: false }
    ],
    atomicRadius: 20,
    mass: 24,
    maxCharge: 2,
    desiredElectrons: 0
  },
  Ca: { 
    symbol: 'Ca', 
    name: 'カルシウム', 
    outerElectrons: 2, 
    electronegativity: 1.0, 
    type: 'metal', 
    color: '#3DFF00', 
    valenceElectrons: [
      { position: 0, paired: false }, // 4s²
      { position: 4, paired: false }
    ],
    atomicRadius: 24,
    mass: 40,
    maxCharge: 2,
    desiredElectrons: 0
  },
  Al: { 
    symbol: 'Al', 
    name: 'アルミニウム', 
    outerElectrons: 3, 
    electronegativity: 1.6, 
    type: 'metal', 
    color: '#BFA6A6', 
    valenceElectrons: [
      { position: 0, paired: false }, // 3s²3p¹
      { position: 2, paired: false },
      { position: 4, paired: false }
    ],
    atomicRadius: 18,
    mass: 27,
    maxCharge: 3,
    desiredElectrons: 0
  }
};

// 分子の固体・液体・気体の状態を決定
export const determineState = (molecule) => {
  // 分子の構成と結合の種類から状態を決定
  // イオン結合はほとんどの場合固体
  if (molecule.bondType === 'ionic') {
    return 'solid';
  }
  
  // 共有結合の場合は分子の種類による
  const symbols = molecule.atoms.map(atom => atom.element.symbol).sort().join('');
  
  // 一般的な気体分子
  const gases = ['H2', 'N2', 'O2', 'F2', 'Cl2', 'CO2', 'CH4', 'NH3'];
  if (gases.some(gas => symbols.includes(gas))) {
    return 'gas';
  }
  
  // その他の単純な分子は液体か固体として扱う
  if (molecule.atoms.length <= 4) {
    return 'liquid';
  }
  
  return 'solid';
};

// 原子間の結合の種類を判定
export const determineBondType = (atom1, atom2) => {
  // 両方とも非金属の場合は共有結合
  if (atom1.element.type === 'nonmetal' && atom2.element.type === 'nonmetal') {
    return 'covalent';
  }
  
  // 一方が金属で一方が非金属の場合はイオン結合
  if (
    (atom1.element.type === 'metal' && atom2.element.type === 'nonmetal') ||
    (atom1.element.type === 'nonmetal' && atom2.element.type === 'metal')
  ) {
    return 'ionic';
  }
  
  // 両方金属の場合は金属結合（ここでは単純化してイオン結合として扱う）
  return 'metallic';
};

// 共有結合の極性を計算
export const calculateBondPolarity = (atom1, atom2) => {
  const electronegDiff = Math.abs(atom1.element.electronegativity - atom2.element.electronegativity);
  
  // 差が0.5未満ならほぼ無極性
  if (electronegDiff < 0.5) {
    return { polarity: 'nonpolar', shift: 0 };
  }
  
  // 差が0.5〜1.7は極性共有結合
  if (electronegDiff < 1.7) {
    const shift = electronegDiff * 5; // 電子対のシフト量を電気陰性度の差に比例させる
    // 電気陰性度が高い方に電子をシフト
    if (atom1.element.electronegativity > atom2.element.electronegativity) {
      return { polarity: 'polar', shift: shift, direction: 'to1' };
    } else {
      return { polarity: 'polar', shift: shift, direction: 'to2' };
    }
  }
  
  // 差が1.7以上ならイオン結合的
  return { polarity: 'ionic', shift: 10 };
};

// 原子が結合可能かどうかを判定
export const canBond = (atom1, atom2) => {
  // 既に結合済みの場合は結合不可
  if (atom1.bonds.some(b => b.with === atom2.id) || 
      atom2.bonds.some(b => b.with === atom1.id)) {
    return false;
  }
  
  // 既に分子となっている場合は、異なる分子同士の結合を制限
  if (atom1.moleculeId && atom2.moleculeId && atom1.moleculeId !== atom2.moleculeId) {
    // イオン結合の場合のみ、異なる分子同士でも結合可能
    if ((atom1.element.type === 'metal' && atom2.element.type === 'nonmetal') ||
        (atom1.element.type === 'nonmetal' && atom2.element.type === 'metal')) {
      // イオン結合の条件をチェック
    } else {
      // 共有結合の場合は異なる分子の結合を制限
      return false;
    }
  }
  
  // 同一元素の結合を制限
  if (atom1.element.symbol === atom2.element.symbol) {
    // 二原子分子を形成できる特別な元素
    const diatomicElements = ['H', 'O', 'N', 'F', 'Cl'];
    
    // 例外的な元素でも、既に同種の元素と結合している場合は結合不可
    if (!diatomicElements.includes(atom1.element.symbol)) {
      return false; // 二原子分子を形成できない元素は常に結合不可
    }
    
    // 二原子分子を形成できる元素でも、既に同種と結合していれば結合不可
    const atom1HasSameElementBond = atom1.bonds.some(bond => {
      const partner = atomsCache.find(a => a.id === bond.with);
      return partner && partner.element.symbol === atom1.element.symbol;
    });
    
    const atom2HasSameElementBond = atom2.bonds.some(bond => {
      const partner = atomsCache.find(a => a.id === bond.with);
      return partner && partner.element.symbol === atom2.element.symbol;
    });
    
    if (atom1HasSameElementBond || atom2HasSameElementBond) {
      return false; // 既に同種元素と結合している場合は結合不可
    }
  }
  
  // 両方とも非金属で、それぞれに不対電子がある場合（共有結合）
  if (atom1.element.type === 'nonmetal' && atom2.element.type === 'nonmetal') {
    // 各原子の現在の不対電子数を計算（最初の不対電子数から結合数を引く）
    const atom1UnpairedElectrons = atom1.element.valenceElectrons.filter(e => !e.paired).length - atom1.bonds.length;
    const atom2UnpairedElectrons = atom2.element.valenceElectrons.filter(e => !e.paired).length - atom2.bonds.length;
    
    // オクテット則の確認（既に満たしている場合は結合しない）
    const atom1CurrentElectrons = atom1.element.outerElectrons + (-atom1.charge || 0);
    const atom2CurrentElectrons = atom2.element.outerElectrons + (-atom2.charge || 0);
    
    const atom1Satisfied = atom1CurrentElectrons >= atom1.element.desiredElectrons;
    const atom2Satisfied = atom2CurrentElectrons >= atom2.element.desiredElectrons;
    
    // どちらかがすでにオクテット則を満たしていれば結合しない
    if (atom1Satisfied || atom2Satisfied) {
      return false;
    }
    
    // 両方の原子にまだ不対電子が残っているか確認
    return atom1UnpairedElectrons > 0 && atom2UnpairedElectrons > 0;
  }
  
  // 金属と非金属の場合（イオン結合）
  if ((atom1.element.type === 'metal' && atom2.element.type === 'nonmetal') ||
      (atom1.element.type === 'nonmetal' && atom2.element.type === 'metal')) {
    const metal = atom1.element.type === 'metal' ? atom1 : atom2;
    const nonmetal = atom1.element.type === 'nonmetal' ? atom1 : atom2;
    
    // 金属の電荷が最大値に達していないか確認
    if (metal.charge >= metal.element.maxCharge) {
      return false;
    }
    
    // 非金属の電荷が最大値に達していないか確認（負の電荷なので比較の向きに注意）
    if (nonmetal.charge <= -nonmetal.element.maxCharge) {
      return false;
    }
    
    // オクテット則の確認（既に電子配置が安定している場合は結合しない）
    const metalCurrentElectrons = metal.element.outerElectrons - (metal.charge || 0);
    const nonmetalCurrentElectrons = nonmetal.element.outerElectrons + (-nonmetal.charge || 0);
    
    const metalSatisfied = metalCurrentElectrons <= metal.element.desiredElectrons;
    const nonmetalSatisfied = nonmetalCurrentElectrons >= nonmetal.element.desiredElectrons;
    
    // 両方がすでに安定している場合は結合しない
    if (metalSatisfied && nonmetalSatisfied) {
      return false;
    }
    
    return true;
  }
  
  return false;
};

// 分子量を計算
export const calculateMolecularMass = (atoms) => {
  return atoms.reduce((sum, atom) => sum + atom.element.mass, 0);
};

// 結合した分子が安定かどうかを判定
export const isMoleculeStable = (atoms) => {
  // シンプルな実装：すべての原子が八隅子規則（または水素の場合は2電子）を満たすかチェック
  return atoms.every(atom => {
    const valenceElectronCount = atom.element.outerElectrons;
    const bondCount = atom.bonds.length;
    
    // 水素は2電子（1結合）で安定
    if (atom.element.symbol === 'H') {
      return bondCount === 1;
    }
    
    // それ以外は8電子（共有結合なら4結合まで）で安定
    return (valenceElectronCount + bondCount) >= 8;
  });
};