import React from 'react';

// 原子コンポーネント - 修正版
const Atom = ({ atom, scale = 1 }) => {
  // atom がない場合のデフォルト値を設定
  if (!atom) {
    return null;
  }

  // 分割代入でプロパティを取得し、undefined の場合のデフォルト値を設定
  const {
    x = 0,
    y = 0,
    element,
    charge = 0,
    bonds = [],
    ionicState,
    sharedElectrons = 0,
    rotation = 0 // 原子の回転角度（ラジアン）- 元素記号の向きのみに使用
  } = atom;

  if (!element) {
    return null;
  }

  const { symbol, valenceElectrons, atomicRadius, color } = element;
  
  // 原子の半径
  const radius = atomicRadius * scale;
  
  // 最外殻電子の配置角度（8方向、45度ずつ）
  const electronPositions = [
    { angle: 0, x: radius, y: 0 },         // 右 (0)
    { angle: Math.PI/4, x: radius * 0.7, y: radius * 0.7 },  // 右下 (1)
    { angle: Math.PI/2, x: 0, y: radius },  // 下 (2)
    { angle: 3*Math.PI/4, x: -radius * 0.7, y: radius * 0.7 },  // 左下 (3)
    { angle: Math.PI, x: -radius, y: 0 },   // 左 (4)
    { angle: 5*Math.PI/4, x: -radius * 0.7, y: -radius * 0.7 },  // 左上 (5)
    { angle: 3*Math.PI/2, x: 0, y: -radius },  // 上 (6)
    { angle: 7*Math.PI/4, x: radius * 0.7, y: -radius * 0.7 }   // 右上 (7)
  ];
  
  // 不対電子を電子殻上に均等に配置
  const redistributeElectrons = (electrons) => {
    if (!electrons || electrons.length === 0) return [];
    
    // 不対電子の数を数える
    const unpairedElectrons = electrons.filter(e => !e.paired);
    const unpairedCount = unpairedElectrons.length;
    
    if (unpairedCount <= 1) return electrons; // 1つ以下なら再配置の必要なし
    
    // 新しい配置ポジションを決定（均等配置）
    let newPositions;
    
    switch (unpairedCount) {
      case 2: // 2つの不対電子は180度対向（左右など）
        newPositions = [0, 4]; // 右と左
        break;
      case 3: // 3つの不対電子は120度間隔（三角形）
        newPositions = [0, 2, 4]; // 右、下、左
        break;
      case 4: // 4つの不対電子は90度間隔（十字形）
        newPositions = [0, 2, 4, 6]; // 右、下、左、上
        break;
      default: // それ以外は均等間隔
        newPositions = Array.from({length: unpairedCount}, 
          (_, i) => Math.floor(i * 8 / unpairedCount) % 8);
    }
    
    // 新しい電子配置を作成
    const newElectrons = [...electrons];
    
    // 不対電子に新しい位置を割り当て
    unpairedElectrons.forEach((electron, idx) => {
      const eIdx = newElectrons.indexOf(electron);
      if (eIdx !== -1 && idx < newPositions.length) {
        newElectrons[eIdx].position = newPositions[idx];
      }
    });
    
    return newElectrons;
  };
  
  // 電子を再配置
  const redistributedElectrons = redistributeElectrons(valenceElectrons);
  
  // 結合方向の電子位置を強調表示する関数
  const getBondHighlightStyle = (position) => {
    // ハイライト用スタイル
    const highlightSize = radius * 0.2;
    
    // 電子ハイライトの位置を計算（回転なし）
    const highlightX = position.x;
    const highlightY = position.y;
    
    return {
      position: 'absolute',
      width: highlightSize,
      height: highlightSize,
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 0, 0.7)', // 黄色のハイライト
      transform: `translate(${highlightX}px, ${highlightY}px)`,
      boxShadow: '0 0 5px rgba(255, 255, 0, 0.7)',
      zIndex: 15
    };
  };
  
  // 結合で使用されている電子位置を取得
  const getBondedElectronPositions = () => {
    const positions = [];
    if (!bonds || bonds.length === 0) return positions;
    
    bonds.forEach(bond => {
      if (bond.electronPositionAtom1 !== undefined) {
        positions.push(bond.electronPositionAtom1);
      }
      if (bond.electronPositionAtom2 !== undefined) {
        positions.push(bond.electronPositionAtom2);
      }
    });
    return positions;
  };
  
  // 結合に使われている電子位置
  const bondedPositions = getBondedElectronPositions();
  
  // 電子を表示するかどうかの判定（結合している方向の電子は非表示）
  const shouldShowElectron = (position, idx) => {
    // 結合がない場合は全ての電子を表示
    if (!bonds || bonds.length === 0) return true;
    
    // 結合している方向と一致しないかチェック
    for (const bond of bonds) {
      // イオン結合の場合は外殻電子が移動するため表示しない
      if (bond.type === 'ionic') {
        if (charge > 0) { // 金属ならすべての価電子が移動
          return false;
        }
      }
      
      // 共有結合の場合は、その結合に使われている不対電子位置をチェック
      if (bond.type === 'covalent') {
        // この原子側の結合に使われている電子位置
        const usedElectronPosition = bond.electronPositionAtom1 !== undefined ? 
                                    bond.electronPositionAtom1 : 
                                    bond.electronPositionAtom2;
                                    
        // 表示しようとしている電子が結合に使われているなら非表示
        if (idx === usedElectronPosition) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  // 原子の状態に応じたスタイルを適用
  const getAtomStyle = () => {
    let style = {
      position: 'absolute',
      width: radius * 2,
      height: radius * 2,
      borderRadius: '50%',
      backgroundColor: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `translate(${x - radius}px, ${y - radius}px)`,
      transition: 'transform 0.1s linear',
      color: getBrightness(color) < 128 ? 'white' : 'black',
      fontWeight: 'bold',
      fontSize: `${radius * 0.8}px`,
      zIndex: 10
    };
    
    // イオン化している場合はスタイルを変更
    if (charge !== 0) {
      const glowColor = charge > 0 
        ? 'rgba(255, 107, 107, 0.7)' // 陽イオンは赤いグロー
        : 'rgba(107, 181, 255, 0.7)'; // 陰イオンは青いグロー
      
      const glowSize = Math.min(3, Math.abs(charge)) * radius * 0.3;
      
      style.boxShadow = `0 0 ${glowSize}px ${glowColor}`;
      style.zIndex = 20; // イオンを前面に表示
      
      // イオン状態に応じてborder追加
      if (ionicState === 'cation') {
        style.border = `${radius * 0.1}px solid rgba(255, 100, 100, 0.6)`;
      } else if (ionicState === 'anion') {
        style.border = `${radius * 0.1}px solid rgba(100, 100, 255, 0.6)`;
      }
    }
    
    // 共有結合で電子を共有している場合はスタイルを変更
    if (sharedElectrons && sharedElectrons > 0) {
      // 共有電子数に応じて電子雲を表現
      const electronCloudSize = Math.min(3, sharedElectrons) * radius * 0.2;
      
      if (style.boxShadow) {
        style.boxShadow += `, 0 0 ${electronCloudSize}px rgba(255, 255, 255, 0.5)`;
      } else {
        style.boxShadow = `0 0 ${electronCloudSize}px rgba(255, 255, 255, 0.5)`;
      }
    }
    
    return style;
  };
  
  // 電子のスタイルを計算（回転なし - 電子殻に固定）
  const getElectronStyle = (electron, index) => {
    if (!electron) return null;
    
    const position = electronPositions[electron.position];
    if (!position) return null;
    
    const electronSize = radius * 0.25;
    
    // 電子の位置は固定（回転なし）
    const electronX = position.x;
    const electronY = position.y;
    
    // ペアになっている場合は少しオフセットする
    const offsetX = electron.paired ? electronSize * 0.6 : 0;
    const offsetY = electron.paired ? -electronSize * 0.6 : 0;
    
    return {
      position: 'absolute',
      width: electronSize,
      height: electronSize,
      borderRadius: '50%',
      backgroundColor: 'white',
      transform: `translate(${electronX + offsetX}px, ${electronY + offsetY}px)`,
      transition: 'transform 0.2s linear',
      zIndex: 20,
      // 電子のスタイル
      boxShadow: electron.paired ? 'none' : '0 0 5px rgba(255, 255, 255, 0.7)'
    };
  };
  
  // 元素記号コンテナのスタイル（回転しない）
  const getSymbolContainerStyle = () => {
    return {
      position: 'absolute',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // 回転を打ち消して常に正しい向きに表示
      transform: `rotate(${-rotation}rad)`,
      pointerEvents: 'none' // 電子のクリックイベントを妨げないように
    };
  };
  
  // 荷電表示のスタイル
  const getChargeStyle = () => {
    return {
      position: 'absolute',
      top: -radius * 0.4,
      right: -radius * 0.4,
      backgroundColor: charge > 0 ? 'rgba(255, 107, 107, 0.8)' : 'rgba(107, 181, 255, 0.8)',
      color: 'white',
      borderRadius: '50%',
      width: radius * 0.8,
      height: radius * 0.8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${radius * 0.5}px`,
      fontWeight: 'bold',
      zIndex: 30,
      boxShadow: `0 0 ${radius * 0.2}px ${charge > 0 ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 100, 255, 0.8)'}`,
      border: '1px solid white',
      // 回転を打ち消して常に正しい向きに表示
      transform: `rotate(${-rotation}rad)`
    };
  };
  
  // 色の明るさを計算
  const getBrightness = (hexColor) => {
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000;
    } catch (e) {
      // 16進カラーコードの解析に失敗した場合
      return 128; // 中間の明るさを返す
    }
  };
  
  // 不対電子数の表示 - デバッグ用
  const getUnpairedCountStyle = () => {
    return {
      position: 'absolute',
      bottom: -radius * 0.4,
      left: -radius * 0.4,
      backgroundColor: 'rgba(100, 100, 100, 0.8)',
      color: 'white',
      borderRadius: '50%',
      width: radius * 0.8,
      height: radius * 0.8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${radius * 0.5}px`,
      fontWeight: 'bold',
      zIndex: 25,
      transform: `rotate(${-rotation}rad)`
    };
  };
  
  // 不対電子の数を取得
  const getUnpairedElectronCount = () => {
    if (!valenceElectrons) return 0;
    return valenceElectrons.filter(e => !e.paired).length;
  };
  
  return (
    <div style={getAtomStyle()}>
      {/* 元素記号 (常に正しい向きで表示) */}
      <div style={getSymbolContainerStyle()}>
        {symbol}
      </div>
      
      {/* 電荷表示（イオンの場合） - 常に正しい向きで表示 */}
      {charge !== 0 && (
        <div style={getChargeStyle()}>
          {charge > 0 ? `+${charge}` : charge}
        </div>
      )}
      
      {/* 不対電子数表示 - デバッグ用 */}
      <div style={getUnpairedCountStyle()}>
        {getUnpairedElectronCount()}
      </div>
      
      {/* 最外殻電子の表示（固定位置） */}
      {redistributedElectrons && redistributedElectrons.map((electron, index) => (
        electron && shouldShowElectron(electron, index) && (
          <div 
            key={`electron-${index}`}
            style={getElectronStyle(electron, index)}
            data-electron-index={index}
            data-atom-id={atom.id}
          />
        )
      ))}
      
      {/* 結合に使われている電子位置のハイライト表示 */}
      {bondedPositions.map((position, index) => {
        // この原子の電子位置であれば表示
        const pos = electronPositions[position];
        if (pos) {
          return (
            <div
              key={`bond-${index}`}
              style={getBondHighlightStyle(pos)}
            />
          );
        }
        return null;
      })}
      
      {/* 共有結合時の電子雲を表現 */}
      {bonds && bonds.some(bond => bond.type === 'covalent') && (
        <div
          style={{
            position: 'absolute',
            width: radius * 2.2,
            height: radius * 2.2,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            transform: `translate(${-radius * 0.1}px, ${-radius * 0.1}px)`,
            zIndex: 5
          }}
        />
      )}
    </div>
  );
};

export default Atom;