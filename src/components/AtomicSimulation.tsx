// src/components/atomic-simulation/AtomicSimulation.tsx
"use client"; // クライアントコンポーネントを示す

import React, { useState } from 'react';
import AtomSelector from './AtomSelector';
import SimulationArea from './SimulationArea';
import { elements } from '../utils/atomData';

const AtomicSimulation: React.FC = () => {
  const [selectedAtoms, setSelectedAtoms] = useState<string[]>([]);
  const [info, setInfo] = useState({
    moleculeCount: 0,
    ionicBonds: 0,
    covalentBonds: 0
  });

  // 原子が選択されたときのハンドラ
  const handleAddAtoms = (atomSymbols: string[]) => {
    setSelectedAtoms(atomSymbols);
  };

  // リセットボタン
  const handleReset = () => {
    setSelectedAtoms([]);
    setInfo({
      moleculeCount: 0,
      ionicBonds: 0,
      covalentBonds: 0
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* 左側のパネル */}
        <div className="w-full md:w-1/3 p-4 bg-gray-800 overflow-auto">
          <AtomSelector onAddAtom={handleAddAtoms} />
          
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <h2 className="text-xl font-bold mb-2">シミュレーション情報</h2>
            <div className="space-y-1">
              <p>分子の数: {info.moleculeCount}</p>
              <p>イオン結合の数: {info.ionicBonds}</p>
              <p>共有結合の数: {info.covalentBonds}</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <h2 className="text-xl font-bold mb-2">学習ポイント</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>非金属元素同士は<span className="text-green-400">共有結合</span>で分子を形成</li>
              <li>金属と非金属は<span className="text-blue-400">イオン結合</span>でイオン結晶を形成</li>
              <li>電気陰性度の差が大きいほど、共有電子対は電気陰性度の高い原子側に引き寄せられる</li>
              <li>最外殻電子数は原子が形成できる結合数に影響する</li>
              <li>イオン結晶は固体として下に沈み、小さな分子は気体として浮遊する</li>
            </ul>
          </div>
          
          <button
            onClick={handleReset}
            className="mt-4 w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            シミュレーションをリセット
          </button>
        </div>
        
        {/* 右側のシミュレーションエリア */}
        <div className="flex-1 bg-gray-900">
          <SimulationArea 
            atoms={selectedAtoms}
            elements={elements}
          />
        </div>
      </div>
    </div>
  );
};

export default AtomicSimulation;