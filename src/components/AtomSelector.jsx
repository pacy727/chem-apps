import React, { useState } from 'react';
import { elements } from '../utils/atomData';

// 原子選択コンポーネント
const AtomSelector = ({ onAddAtom }) => {
  const [selectedAtoms, setSelectedAtoms] = useState(
    Object.keys(elements).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
  );

  // 原子の数を変更するハンドラ
  const handleChange = (element, value) => {
    setSelectedAtoms(prev => ({
      ...prev,
      [element]: parseInt(value) || 0
    }));
  };

  // OKボタンクリック時に親コンポーネントにデータを渡す
  const handleSubmit = () => {
    const atomsToAdd = [];
    
    // 選択された原子を配列に変換
    Object.entries(selectedAtoms).forEach(([symbol, count]) => {
      for (let i = 0; i < count; i++) {
        atomsToAdd.push(symbol);
      }
    });
    
    onAddAtom(atomsToAdd);
  };

  // 金属・非金属でグループ化
  const metals = Object.values(elements).filter(el => el.type === 'metal');
  const nonmetals = Object.values(elements).filter(el => el.type === 'nonmetal');

  return (
    <div className="p-4 bg-gray-700 rounded-lg shadow-md text-white">
      <h2 className="text-xl font-bold mb-4">原子選択</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* 非金属元素 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">非金属元素</h3>
          <div className="space-y-2">
            {nonmetals.map(element => (
              <div key={element.symbol} className="flex items-center">
                <div 
                  className="w-8 h-8 flex items-center justify-center rounded-full mr-2" 
                  style={{ backgroundColor: element.color, color: getBrightness(element.color) < 128 ? 'white' : 'black' }}
                >
                  {element.symbol}
                </div>
                <span className="w-20 text-white">{element.name}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={selectedAtoms[element.symbol]}
                  onChange={(e) => handleChange(element.symbol, e.target.value)}
                  className="w-16 p-1 border rounded"
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* 金属元素 */}
        <div>
          <h3 className="text-lg font-semibold mb-2">金属元素</h3>
          <div className="space-y-2">
            {metals.map(element => (
              <div key={element.symbol} className="flex items-center">
                <div 
                  className="w-8 h-8 flex items-center justify-center rounded-full mr-2" 
                  style={{ backgroundColor: element.color, color: getBrightness(element.color) < 128 ? 'white' : 'black' }}
                >
                  {element.symbol}
                </div>
                <span className="w-20">{element.name}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={selectedAtoms[element.symbol]}
                  onChange={(e) => handleChange(element.symbol, e.target.value)}
                  className="w-16 p-1 border rounded"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          OK
        </button>
      </div>
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold">電子配置情報：</h3>
        <ul className="text-sm">
          <li>• 最外殻電子は原子の周りに表示されます</li>
          <li>• 非金属同士 → 共有結合（不対電子を共有）</li>
          <li>• 金属＋非金属 → イオン結合（電子を授受）</li>
          <li>• 気体は画面上を動き回り、固体は下に沈みます</li>
          <li>• 電気陰性度に応じて電子の引き付け方が変わります</li>
        </ul>
      </div>
    </div>
  );
};

// 色の明るさを計算（テキスト色を決めるのに使用）
const getBrightness = (hexColor) => {
  // #FFFFFFのような形式から、RGBの値を抽出
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // 明るさを計算（一般的な加重平均）
  return (r * 299 + g * 587 + b * 114) / 1000;
};

export default AtomSelector;