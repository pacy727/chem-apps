import React, { useRef, useEffect, useState } from 'react';
import Atom from './Atom';
import { 
  updateAtomPosition, 
  calculateAtomInteractions,
  detectAndFormBonds, 
  distance, 
  angle,
  identifyMolecules
} from '../utils/physicsEngine';
import { 
  canBond, 
  determineBondType, 
  calculateBondPolarity,
  updateAtomsCache
} from '../utils/atomData';

// シミュレーションエリアコンポーネント
const SimulationArea = ({ atoms, elements }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [simulationAtoms, setSimulationAtoms] = useState([]);
  const [bonds, setBonds] = useState([]);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedAtom, setSelectedAtom] = useState(null);
  const animationRef = useRef(null);

  // コンポーネントマウント時に初期化
  useEffect(() => {
    // コンテナのサイズを取得
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
      
      // キャンバスのサイズも設定
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    }
    
    // リサイズ時にも更新
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
        
        // キャンバスのサイズも更新
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 原子が追加されたときの処理
  useEffect(() => {
    if (atoms.length > 0 && dimensions.width > 0) {
      // 新しい原子を初期化
      const newAtoms = atoms.map((symbol, index) => {
        // 原子のプロパティを設定
        return {
          id: `atom-${Date.now()}-${index}`,
          element: elements[symbol],
          x: Math.random() * dimensions.width * 0.8 + dimensions.width * 0.1,
          y: Math.random() * dimensions.height * 0.5 + 50,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          rotation: Math.random() * Math.PI * 2, // ランダムな初期回転
          rotationSpeed: (Math.random() - 0.5) * 0.02, // ランダムな回転速度
          bonds: [],
          charge: 0,
          state: 'gas' // 初期状態は気体
        };
      });
      
      // 既存の原子と合わせて更新
      setSimulationAtoms(prev => [...prev, ...newAtoms]);
    }
  }, [atoms, dimensions, elements]);

  // アニメーションループ
  useEffect(() => {
    if (simulationAtoms.length === 0 || !dimensions.width) return;
    
    // 原子のキャッシュを更新（同一元素結合の制限に使用）
    updateAtomsCache(simulationAtoms);
    
    const simulationStep = () => {
      // 原子間の相互作用を計算
      const atomsAfterInteractions = calculateAtomInteractions(
        simulationAtoms
      );
      
      // 結合検出と形成
      const { atoms: atomsAfterBonds, newBonds } = detectAndFormBonds(
        atomsAfterInteractions,
        canBond,
        determineBondType,
        calculateBondPolarity
      );
      
      // 新しい結合があればbonds状態を更新
      if (newBonds.length > 0) {
        setBonds(prev => [...prev, ...newBonds]);
      }
      
      // 位置の更新
      const updatedAtoms = atomsAfterBonds.map(atom => 
        updateAtomPosition(atom, dimensions.width, dimensions.height, atomsAfterBonds)
      );
      
      setSimulationAtoms(updatedAtoms);
    };
    
    // アニメーションフレームを設定
    animationRef.current = requestAnimationFrame(function animate() {
      simulationStep();
      animationRef.current = requestAnimationFrame(animate);
    });
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [simulationAtoms, dimensions, bonds]);

  // キャンバスに結合を描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || simulationAtoms.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 電子位置の計算用定数
    const electronPositions = [
      { angle: 0, x: 1, y: 0 },         // 右 (0)
      { angle: Math.PI/4, x: 0.7, y: 0.7 },  // 右下 (1)
      { angle: Math.PI/2, x: 0, y: 1 },  // 下 (2)
      { angle: 3*Math.PI/4, x: -0.7, y: 0.7 },  // 左下 (3)
      { angle: Math.PI, x: -1, y: 0 },   // 左 (4)
      { angle: 5*Math.PI/4, x: -0.7, y: -0.7 },  // 左上 (5)
      { angle: 3*Math.PI/2, x: 0, y: -1 },  // 上 (6)
      { angle: 7*Math.PI/4, x: 0.7, y: -0.7 }   // 右上 (7)
    ];
    
    // 原子間の結合を描画
    simulationAtoms.forEach(atom => {
      atom.bonds.forEach(bond => {
        const partnerAtom = simulationAtoms.find(a => a.id === bond.with);
        if (!partnerAtom) return;
        
        // 結合タイプに応じた描画
        if (bond.type === 'covalent') {
          // 共有結合
          drawCovalentBond(ctx, atom, partnerAtom, bond, electronPositions);
        } else if (bond.type === 'ionic') {
          // イオン結合
          drawIonicBond(ctx, atom, partnerAtom, bond);
        }
      });
    });
  }, [simulationAtoms]);

  // 共有結合の描画 - 修正版（回転を考慮）
  const drawCovalentBond = (ctx, atom1, atom2, bond, electronPositions) => {
    // 電子位置を取得
    const electronPos1 = bond.electronPositionAtom1;
    const electronPos2 = bond.electronPositionAtom2;
    
    if (electronPos1 === undefined || electronPos2 === undefined) return;
    
    // 原子の回転を考慮して電子の位置を計算
    const rotation1 = atom1.rotation || 0;
    const rotation2 = atom2.rotation || 0;
    
    // 電子1の位置を計算
    const basePos1 = electronPositions[electronPos1];
    const rotatedAngle1 = basePos1.angle + rotation1;
    const e1Radius = atom1.element.atomicRadius * 0.9;
    const e1x = atom1.x + Math.cos(rotatedAngle1) * e1Radius;
    const e1y = atom1.y + Math.sin(rotatedAngle1) * e1Radius;
    
    // 電子2の位置を計算
    const basePos2 = electronPositions[electronPos2];
    const rotatedAngle2 = basePos2.angle + rotation2;
    const e2Radius = atom2.element.atomicRadius * 0.9;
    const e2x = atom2.x + Math.cos(rotatedAngle2) * e2Radius;
    const e2y = atom2.y + Math.sin(rotatedAngle2) * e2Radius;
    
    // 共有電子対の位置を計算（電気陰性度による位置調整）
    let sharedElectronX, sharedElectronY;
    
    if (bond.polarity.polarity === 'nonpolar') {
      // 無極性結合なら中間に配置
      sharedElectronX = (e1x + e2x) / 2;
      sharedElectronY = (e1y + e2y) / 2;
    } else {
      // 極性結合なら電気陰性度が高い方に寄せる
      const shiftAmount = bond.polarity.shift * 0.2;
      
      if (bond.polarity.direction === 'to1') {
        // atom1の方が電気陰性度が高い
        sharedElectronX = e1x * (0.5 + shiftAmount) + e2x * (0.5 - shiftAmount);
        sharedElectronY = e1y * (0.5 + shiftAmount) + e2y * (0.5 - shiftAmount);
      } else {
        // atom2の方が電気陰性度が高い
        sharedElectronX = e1x * (0.5 - shiftAmount) + e2x * (0.5 + shiftAmount);
        sharedElectronY = e1y * (0.5 - shiftAmount) + e2y * (0.5 + shiftAmount);
      }
    }
    
    // 原子の重なりを強調表示（電子雲の重なり）
    const centerX = (e1x + e2x) / 2;
    const centerY = (e1y + e2y) / 2;
    const radius = Math.min(distance(e1x, e1y, e2x, e2y) / 2, 
                           (atom1.element.atomicRadius + atom2.element.atomicRadius) / 2);
    
    // グラデーションで電子雲の重なりを表現
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 共有電子対を描画
    drawSharedElectrons(ctx, sharedElectronX, sharedElectronY, bond.polarity.shift);
    
    // 結合線は原子核と共有電子対をつなぐ - 薄くして電子雲を強調
    ctx.beginPath();
    ctx.moveTo(atom1.x, atom1.y);
    ctx.lineTo(sharedElectronX, sharedElectronY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(sharedElectronX, sharedElectronY);
    ctx.lineTo(atom2.x, atom2.y);
    ctx.stroke();
  };

  // イオン結合の描画
  const drawIonicBond = (ctx, atom1, atom2, bond) => {
    const x1 = atom1.x;
    const y1 = atom1.y;
    const x2 = atom2.x;
    const y2 = atom2.y;
    
    // 金属と非金属を特定
    const metal = atom1.element.type === 'metal' ? atom1 : atom2;
    const nonmetal = atom1.element.type === 'nonmetal' ? atom1 : atom2;
    
    const metalX = metal.x;
    const metalY = metal.y;
    const nonmetalX = nonmetal.x;
    const nonmetalY = nonmetal.y;
    
    // イオン結合の描画（点線）
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]); // 線のスタイルをリセット
    
    // 電子の移動を表現（金属から非金属へ）
    const electronSize = 4;
    
    // 電子移動のアニメーションタイムスタンプ
    const now = Date.now();
    const animPhase = (now % 3000) / 3000; // 3秒周期
    
    // 電子の位置を計算
    const startX = metalX;
    const startY = metalY;
    const endX = nonmetalX;
    const endY = nonmetalY;
    
    // 電子の軌道を円弧で描く
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 20; // 少し上に弧を描く
    
    // 線形補間で電子位置を計算
    let electronX, electronY;
    
    if (animPhase < 0.5) {
      // 前半は金属から非金属へ移動
      const t = animPhase * 2; // 0〜1に正規化
      // 二次ベジェ曲線で弧を描く
      electronX = (1-t)*(1-t)*startX + 2*(1-t)*t*midX + t*t*endX;
      electronY = (1-t)*(1-t)*startY + 2*(1-t)*t*midY + t*t*endY;
      
      // 電子を描画
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(electronX, electronY, electronSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // イオン結合を強調表示
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const radius = distance(x1, y1, x2, y2) / 2;
    
    // グラデーションでイオン結合の電荷の影響を表現
    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    
    // 陽イオンは赤、陰イオンは青のグラデーション
    gradient.addColorStop(0, 'rgba(255, 100, 100, 0.1)');
    gradient.addColorStop(0.5, 'rgba(100, 100, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  // 共有電子対の描画
  const drawSharedElectrons = (ctx, x, y, shiftAmount) => {
    const electronSize = 4;
    const spacing = 3;
    
    // 共有電子対の背景を描画（結合がよく見えるように）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, electronSize * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 電子対の描画
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(x - spacing, y, electronSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x + spacing, y, electronSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 極性が大きい場合は色を変える
    if (shiftAmount > 2) {
      const strength = Math.min(1.0, shiftAmount / 5);
      ctx.fillStyle = `rgba(100, 200, 255, ${0.5 * strength})`;
      ctx.beginPath();
      ctx.arc(x, y, electronSize * 1.8, 0, Math.PI * 2);
      ctx.fill();
      
      // 極性の高い結合は周囲にグローを追加
      ctx.shadowColor = 'rgba(100, 200, 255, 0.5)';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(x, y, electronSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  // 原子のクリック処理
  const handleAtomClick = (atom) => {
    setSelectedAtom(atom);
    setShowInfo(true);
  };

  // 電子のクリックイベントハンドラ
  const handleElectronClick = (e) => {
    // data属性から電子と原子の情報を取得
    const electronIndex = e.target.dataset.electronIndex;
    const atomId = e.target.dataset.atomId;
    
    if (!electronIndex || !atomId) return;
    
    // 原子を取得
    const atom = simulationAtoms.find(a => a.id === atomId);
    if (!atom) return;
    
    console.log(`電子 ${electronIndex} がクリックされました (原子 ${atom.element.symbol})`);
    
    // ここに電子クリック時の処理を追加
    // 例: 特定の電子を選択状態にしたり、結合処理を手動で行うなど
  };

  // リセットボタン処理
  const handleReset = () => {
    setSimulationAtoms([]);
    setBonds([]);
    setShowInfo(false);
    setSelectedAtom(null);
  };

  // 原子情報表示
  const renderAtomInfo = (atom) => {
    if (!atom) return null;
    
    // 結合数を計算
    const bondCount = atom.bonds.length;
    
    // 原子の状態の分類
    let stateText = atom.state === 'gas' ? '気体' : 
                  atom.state === 'liquid' ? '液体' : '固体';
    
    // 電子状態の説明
    let electronState = '';
    if (atom.charge > 0) {
      electronState = `価電子 ${atom.charge} 個を失って陽イオン化`;
    } else if (atom.charge < 0) {
      electronState = `電子 ${Math.abs(atom.charge)} 個を得て陰イオン化`;
    } else if (atom.sharedElectrons) {
      electronState = `不対電子 ${atom.sharedElectrons} 個を共有`;
    } else {
      electronState = '安定状態';
    }
    
    // 結合タイプを集計
    const covalentBonds = atom.bonds.filter(b => b.type === 'covalent').length;
    const ionicBonds = atom.bonds.filter(b => b.type === 'ionic').length;
    
    return (
      <div className="absolute bottom-4 left-4 p-4 bg-gray-800 bg-opacity-90 text-white rounded-lg shadow-lg z-50 max-w-md">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold">{atom.element.name} ({atom.element.symbol})</h3>
          <button
            onClick={() => setShowInfo(false)}
            className="ml-4 text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
        
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p><span className="font-semibold">電気陰性度:</span> {atom.element.electronegativity}</p>
            <p><span className="font-semibold">タイプ:</span> {atom.element.type === 'metal' ? '金属' : '非金属'}</p>
            <p><span className="font-semibold">不対電子数:</span> {atom.element.valenceElectrons.filter(e => !e.paired).length}</p>
          </div>
          <div>
            <p><span className="font-semibold">電荷:</span> {atom.charge || 0}</p>
            <p><span className="font-semibold">結合数:</span> {bondCount} (共有: {covalentBonds}, イオン: {ionicBonds})</p>
            <p><span className="font-semibold">状態:</span> {stateText}</p>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-700">
          <p><span className="font-semibold">電子状態:</span> {electronState}</p>
          {atom.bonds.length > 0 && (
            <p className="mt-1"><span className="font-semibold">結合中:</span> {atom.bonds.map((bond, idx) => {
              const partner = simulationAtoms.find(a => a.id === bond.with);
              return partner ? (idx > 0 ? ', ' : '') + partner.element.symbol : '';
            })}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden"
      style={{ height: '100%', minHeight: '500px', maxHeight: 'calc(100vh - 180px)' }}
    >
      {/* キャンバス（結合線を描画） */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      
      {/* 各原子を表示 */}
      {simulationAtoms.map(atom => (
        <div 
          key={atom.id} 
          onClick={() => handleAtomClick(atom)}
          onMouseDown={(e) => {
            // 電子クリックイベントの伝搬
            if (e.target.dataset.electronIndex) {
              handleElectronClick(e);
              e.stopPropagation(); // 原子のクリックイベントを防止
            }
          }}
        >
          <Atom atom={atom} />
        </div>
      ))}
      
      {/* リセットボタン */}
      <button
        onClick={handleReset}
        className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 z-50"
      >
        リセット
      </button>
      
      {/* 原子情報表示 */}
      {showInfo && selectedAtom && renderAtomInfo(selectedAtom)}
      
      {/* 説明テキスト */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-80 text-white p-3 rounded">
        <p className="text-sm">
          <span className="text-yellow-300">•</span> 原子をクリックすると詳細情報が表示されます
        </p>
        <p className="text-sm mt-1">
          <span className="text-green-300">•</span> 水素や非金属同士は<span className="text-green-300">共有結合</span>を形成
        </p>
        <p className="text-sm mt-1">
          <span className="text-blue-300">•</span> 金属と非金属は<span className="text-blue-300">イオン結合</span>を形成
        </p>
      </div>
    </div>
  );
};

export default SimulationArea;