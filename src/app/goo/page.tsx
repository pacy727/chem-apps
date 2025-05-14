'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Circle {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  personality: string;
  age: number;
  maxAge: number;
  trail?: { x: number; y: number }[];
}

interface MousePosition {
  x: number;
  y: number;
}

interface ClickEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  power: number;
  time: number;
}

// パフォーマンス設定
interface PerformanceSettings {
  trailMaxLength: number;      // 軌跡の最大長
  trailRecordInterval: number; // 軌跡の記録間隔（フレーム数）
  trailSamplingRate: number;   // 軌跡のサンプリング率
  trailOpacity: number;        // 軌跡の透明度
  useTrailOptimization: boolean; // 軌跡の最適化を使用するか
}

const CircleSimulation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [circleCount, setCircleCount] = useState<number>(200);
  const [clickEffect, setClickEffect] = useState<ClickEffect | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const trailsRef = useRef<{ x: number; y: number }[][]>([]);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number[]>([]);
  const lastFpsUpdateRef = useRef<number>(0);
  
  // パフォーマンス設定
  const [performanceMode, setPerformanceMode] = useState<'high' | 'medium' | 'low'>('medium');
  const performanceSettings = useRef<PerformanceSettings>({
    trailMaxLength: 10,         // 中品質の初期値
    trailRecordInterval: 3,     // 3フレームに1回記録
    trailSamplingRate: 0.5,     // 50%の確率で記録
    trailOpacity: 0.3,          // 軌跡の透明度
    useTrailOptimization: true  // 軌跡最適化を使用
  });
  
  // トレイルの最適化レベルを更新
  const updatePerformanceSettings = useCallback((mode: 'high' | 'medium' | 'low') => {
    const settings = performanceSettings.current;
    
    switch (mode) {
      case 'high':
        settings.trailMaxLength = 20;
        settings.trailRecordInterval = 2;
        settings.trailSamplingRate = 0.1;
        settings.trailOpacity = 0.3;
        settings.useTrailOptimization = false;
        break;
      case 'medium':
        settings.trailMaxLength = 10; 
        settings.trailRecordInterval = 3;
        settings.trailSamplingRate = 0.5;
        settings.trailOpacity = 0.3;
        settings.useTrailOptimization = true;
        break;
      case 'low':
        settings.trailMaxLength = 5;
        settings.trailRecordInterval = 5;
        settings.trailSamplingRate = 0.8;
        settings.trailOpacity = 0.2;
        settings.useTrailOptimization = true;
        break;
    }
    
    // 既存の軌跡を新しい最大長に調整
    if (trailsRef.current) {
      trailsRef.current = trailsRef.current.map(trail => {
        if (trail.length > settings.trailMaxLength) {
          return trail.slice(trail.length - settings.trailMaxLength);
        }
        return trail;
      });
    }
  }, []);

  const personalities = [
    { type: '臆病', chance: 0.25 },
    { type: '好奇心', chance: 0.25 },
    { type: '無関心', chance: 0.25 },
    { type: '社交的', chance: 0.15 },
    { type: '一匹狼', chance: 0.1 },
  ];

  const getRandomColor = (): string => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);
    const lightness = 50 + Math.floor(Math.random() * 30);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getRandomPersonality = (): string => {
    const rand = Math.random();
    let sum = 0;
    for (const p of personalities) {
      sum += p.chance;
      if (rand < sum) return p.type;
    }
    return personalities[0].type;
  };

  // FPSの計測と自動パフォーマンス調整
  const measureFPS = useCallback((deltaTime: number) => {
    if (!deltaTime) return;
    
    const fps = 1000 / deltaTime;
    fpsRef.current.push(fps);
    
    // 最大10サンプルまで保持
    if (fpsRef.current.length > 10) {
      fpsRef.current.shift();
    }
    
    // 1秒ごとにFPSをチェックして、必要ならパフォーマンスモードを調整
    const now = performance.now();
    if (now - lastFpsUpdateRef.current > 1000) {
      const avgFps = fpsRef.current.reduce((sum, fps) => sum + fps, 0) / fpsRef.current.length;
      
      // 低FPSなら品質を下げる
      if (avgFps < 30 && performanceMode !== 'low') {
        setPerformanceMode('low');
        updatePerformanceSettings('low');
      } 
      // 十分なFPSなら品質を上げる
      else if (avgFps > 55 && performanceMode === 'low') {
        setPerformanceMode('medium');
        updatePerformanceSettings('medium');
      }
      else if (avgFps > 58 && performanceMode === 'medium') {
        setPerformanceMode('high');
        updatePerformanceSettings('high');
      }
      
      lastFpsUpdateRef.current = now;
    }
  }, [performanceMode, updatePerformanceSettings]);

  // 丸を初期化する関数
  const initCircles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newCircles: Circle[] = [];

    for (let i = 0; i < circleCount; i++) {
      let newCircle: Circle;
      let overlapping: boolean;
      let attempts = 0;

      do {
        overlapping = false;
        const minRadius = 3;
        const maxRadius = 12;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);

        newCircle = {
          id: i,
          x: radius + Math.random() * (canvas.width - radius * 2),
          y: radius + Math.random() * (canvas.height - radius * 2),
          radius,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          color: getRandomColor(),
          personality: getRandomPersonality(),
          age: 0,
          maxAge: 300 + Math.random() * 600,
          trail: []
        };

        if (circleCount > 150 && Math.random() < 0.7) {
          // 多くの丸がある場合は確率的にスキップして処理を軽くする
        } else {
          for (const circle of newCircles) {
            const dx = newCircle.x - circle.x;
            const dy = newCircle.y - circle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < newCircle.radius + circle.radius) {
              overlapping = true;
              break;
            }
          }
        }

        attempts++;
        if (attempts > 20) {
          newCircle.radius = minRadius;
          overlapping = false;
        }
      } while (overlapping);

      newCircles.push(newCircle);
    }

    setCircles(newCircles);
    trailsRef.current = Array(circleCount).fill(null).map(() => []);
    frameCountRef.current = 0;
  }, [circleCount]);

  // 衝突を処理する関数
  const handleCollision = useCallback((circle1: Circle, circle2: Circle): boolean => {
    const dx = circle2.x - circle1.x;
    const dy = circle2.y - circle1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = circle1.radius + circle2.radius;
    
    if (distance < minDistance) {
      // 衝突方向の単位ベクトル
      const nx = dx / distance;
      const ny = dy / distance;
      
      // めり込みの深さ
      const penetrationDepth = minDistance - distance;
      
      // お互いを押し出す
      const push = penetrationDepth / 2;
      circle1.x -= nx * push;
      circle1.y -= ny * push;
      circle2.x += nx * push;
      circle2.y += ny * push;
      
      // 速度を反転させる
      const v1 = { x: circle1.vx, y: circle1.vy };
      const v2 = { x: circle2.vx, y: circle2.vy };
      
      // 反発係数
      const restitution = 0.8;
      
      // 衝突後の速度を計算
      circle1.vx = v1.x - restitution * nx * (v1.x * nx + v1.y * ny);
      circle1.vy = v1.y - restitution * ny * (v1.x * nx + v1.y * ny);
      circle2.vx = v2.x - restitution * nx * (v2.x * (-nx) + v2.y * (-ny));
      circle2.vy = v2.y - restitution * ny * (v2.x * (-nx) + v2.y * (-ny));
      
      // 速度の大きさを制限
      const maxSpeed = 3;
      const speed1 = Math.sqrt(circle1.vx * circle1.vx + circle1.vy * circle1.vy);
      const speed2 = Math.sqrt(circle2.vx * circle2.vx + circle2.vy * circle2.vy);
      
      if (speed1 > maxSpeed) {
        circle1.vx = (circle1.vx / speed1) * maxSpeed;
        circle1.vy = (circle1.vy / speed1) * maxSpeed;
      }
      
      if (speed2 > maxSpeed) {
        circle2.vx = (circle2.vx / speed2) * maxSpeed;
        circle2.vy = (circle2.vy / speed2) * maxSpeed;
      }
      
      return true;
    }
    return false;
  }, []);

  // 丸の更新
  const updateCircles = useCallback((deltaTime: number): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // フレームカウンタを更新
    frameCountRef.current++;
    
    setCircles(prevCircles => {
      // 配列をコピー
      const newCircles: Circle[] = [...prevCircles];
      
      // クリック効果による影響
      if (clickEffect) {
        for (let i = 0; i < newCircles.length; i++) {
          const circle = newCircles[i];
          const dx = circle.x - clickEffect.x;
          const dy = circle.y - clickEffect.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 効果範囲内の丸に影響
          if (distance < clickEffect.radius) {
            // 中心からの距離に基づいて力を計算
            const force = (1 - distance / clickEffect.radius) * clickEffect.power;
            const angle = Math.atan2(dy, dx);
            
            // 爆発的な力を加える
            circle.vx += Math.cos(angle) * force;
            circle.vy += Math.sin(angle) * force;
          }
        }
      }
      
      // 各丸を移動
      for (let i = 0; i < newCircles.length; i++) {
        const circle = newCircles[i];
        
        // 加齢
        circle.age += deltaTime / 1000;
        
        // 寿命が尽きたら置き換え
        if (circle.age >= circle.maxAge) {
          // 新しい丸を生成
          const newCircle: Circle = {
            id: circle.id,
            x: circle.radius + Math.random() * (canvas.width - circle.radius * 2),
            y: circle.radius + Math.random() * (canvas.height - circle.radius * 2),
            radius: 3 + Math.random() * 9,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: getRandomColor(),
            personality: getRandomPersonality(),
            age: 0,
            maxAge: 300 + Math.random() * 600,
            trail: []
          };
          
          newCircles[i] = newCircle;
          trailsRef.current[i] = []; // 軌跡をリセット
          continue;
        }
        
        // 軌跡を追加 - 最適化版
        if (showTrails) {
          const settings = performanceSettings.current;
          // フレーム間隔と確率に基づいて記録
          if (frameCountRef.current % settings.trailRecordInterval === 0 && 
              Math.random() > settings.trailSamplingRate) {
            if (!trailsRef.current[i]) trailsRef.current[i] = [];
            trailsRef.current[i].push({ x: circle.x, y: circle.y });
            
            // 軌跡の長さを制限
            if (trailsRef.current[i].length > settings.trailMaxLength) {
              trailsRef.current[i].shift();
            }
          }
        }
        
        // マウスとの距離を計算
        const dx = mousePos.x - circle.x;
        const dy = mousePos.y - circle.y;
        const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
        const mouseInfluenceRadius = 100;
        
        // 性格に基づいた行動
        if (distanceToMouse < mouseInfluenceRadius) {
          const influence = (mouseInfluenceRadius - distanceToMouse) / mouseInfluenceRadius;
          
          if (circle.personality === '臆病') {
            // マウスから逃げる
            circle.vx -= (dx / distanceToMouse) * influence * 1;
            circle.vy -= (dy / distanceToMouse) * influence * 1;
          } else if (circle.personality === '好奇心') {
            // マウスに近づく
            circle.vx += (dx / distanceToMouse) * influence * 1;
            circle.vy += (dy / distanceToMouse) * influence * 1;
          }
          // 無関心は何もしない
        }
        
        // 他の丸との関係を計算（社交的/一匹狼）
        if (circle.personality === '社交的' || circle.personality === '一匹狼') {
          for (let j = 0; j < newCircles.length; j++) {
            if (i === j) continue;
            
            const otherCircle = newCircles[j];
            const dx = otherCircle.x - circle.x;
            const dy = otherCircle.y - circle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 80 && distance > 0) {
              const influence = (80 - distance) / 80;
              
              if (circle.personality === '社交的') {
                // 他の丸に近づく
                circle.vx += (dx / distance) * influence * 0.1;
                circle.vy += (dy / distance) * influence * 0.1;
              } else if (circle.personality === '一匹狼') {
                // 他の丸から離れる
                circle.vx -= (dx / distance) * influence * 0.5;
                circle.vy -= (dy / distance) * influence * 0.5;
              }
            }
          }
        }
        
        // ランダムな動き
        if (Math.random() < 0.05) {
          circle.vx += (Math.random() - 0.5) * 0.5;
          circle.vy += (Math.random() - 0.5) * 0.5;
        }
        
        // 速度の上限設定
        const maxSpeed = 3;
        const speed = Math.sqrt(circle.vx * circle.vx + circle.vy * circle.vy);
        if (speed > maxSpeed) {
          circle.vx = (circle.vx / speed) * maxSpeed;
          circle.vy = (circle.vy / speed) * maxSpeed;
        }
        
        // 位置の更新
        circle.x += circle.vx;
        circle.y += circle.vy;
        
        // 画面端での跳ね返り
        if (circle.x - circle.radius < 0) {
          circle.x = circle.radius;
          circle.vx = Math.abs(circle.vx);
        } else if (circle.x + circle.radius > canvas.width) {
          circle.x = canvas.width - circle.radius;
          circle.vx = -Math.abs(circle.vx);
        }
        
        if (circle.y - circle.radius < 0) {
          circle.y = circle.radius;
          circle.vy = Math.abs(circle.vy);
        } else if (circle.y + circle.radius > canvas.height) {
          circle.y = canvas.height - circle.radius;
          circle.vy = -Math.abs(circle.vy);
        }
      }
      
      // 衝突判定と応答
      // 最適化: パフォーマンスモードが低い場合、衝突判定を間引く
      if (performanceMode !== 'low' || frameCountRef.current % 2 === 0) {
        for (let i = 0; i < newCircles.length; i++) {
          // 最適化: 丸が多い場合は衝突検出の範囲を制限
          const checkLimit = performanceMode === 'high' ? newCircles.length : 
                            (performanceMode === 'medium' ? Math.min(i + 50, newCircles.length) : 
                            Math.min(i + 20, newCircles.length));
                            
          for (let j = i + 1; j < checkLimit; j++) {
            handleCollision(newCircles[i], newCircles[j]);
          }
        }
      }
      
      return newCircles;
    });
  }, [clickEffect, handleCollision, mousePos, performanceMode, showTrails]);

  // 描画関数
  const renderCircles = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // クリック効果の描画
    if (clickEffect) {
      context.beginPath();
      context.arc(clickEffect.x, clickEffect.y, clickEffect.radius, 0, Math.PI * 2);
      
      // グラデーションエフェクト
      const gradient = context.createRadialGradient(
        clickEffect.x, clickEffect.y, 0,
        clickEffect.x, clickEffect.y, clickEffect.radius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      gradient.addColorStop(0.7, 'rgba(255, 220, 150, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
      
      context.fillStyle = gradient;
      context.fill();
    }
    
    // 軌跡を描画 - 最適化版
    if (showTrails) {
      const settings = performanceSettings.current;
      
      // 最適化: 軌跡を一度に描画
      context.globalAlpha = settings.trailOpacity;
      
      for (let i = 0; i < circles.length; i++) {
        const trail = trailsRef.current[i];
        if (!trail || trail.length < 2) continue;
        
        // 画面内に軌跡があるかをチェック（簡易バウンディングボックス）
        if (settings.useTrailOptimization) {
          let isVisible = false;
          for (const point of trail) {
            if (point.x > -10 && point.x < canvas.width + 10 && 
                point.y > -10 && point.y < canvas.height + 10) {
              isVisible = true;
              break;
            }
          }
          if (!isVisible) continue;
        }
        
        context.beginPath();
        context.moveTo(trail[0].x, trail[0].y);
        
        // パフォーマンスモードに応じて間引く
        const step = performanceMode === 'high' ? 1 : (performanceMode === 'medium' ? 2 : 3);
        
        for (let j = step; j < trail.length; j += step) {
          context.lineTo(trail[j].x, trail[j].y);
        }
        
        context.strokeStyle = circles[i].color;
        context.lineWidth = 2;
        context.stroke();
      }
      
      context.globalAlpha = 1;
    }
    
    // 丸を描画
    for (const circle of circles) {
      context.beginPath();
      context.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      context.fillStyle = circle.color;
      
      // 寿命による透明度
      const ageRatio = circle.age / circle.maxAge;
      if (ageRatio > 0.8) {
        // 寿命が近いと徐々に透明に
        context.globalAlpha = 1 - (ageRatio - 0.8) * 5;
      }
      
      context.fill();
      context.globalAlpha = 1;
      
      // 性格による特徴表現（目や表情）- 最適化: パフォーマンスモードが低い場合は簡略化
      if (circle.radius > 8 && (performanceMode !== 'low' || Math.random() > 0.5)) {
        // 共通の目の下地
        context.fillStyle = 'white';
        const eyeSize = circle.radius * 0.4;
        const eyeOffsetX = circle.radius * 0.3;
        
        // 最適化: 低パフォーマンスモードでは目を簡略化
        if (performanceMode === 'low') {
          if (circle.personality === '臆病' || circle.personality === '好奇心' || 
              circle.personality === '社交的' || circle.personality === '一匹狼') {
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize, 0, Math.PI * 2);
            context.fill();
            
            context.fillStyle = 'black';
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 0.5, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 0.5, 0, Math.PI * 2);
            context.fill();
          } else if (circle.personality === '無関心') {
            context.fillStyle = 'black';
            context.fillRect(circle.x - eyeOffsetX - eyeSize, circle.y - eyeOffsetX, eyeSize * 2, eyeSize * 0.5);
            context.fillRect(circle.x + eyeOffsetX - eyeSize, circle.y - eyeOffsetX, eyeSize * 2, eyeSize * 0.5);
          }
        } else {
          // 通常の目の描画（高/中パフォーマンスモード）
          if (circle.personality === '臆病') {
            // 臆病な丸は下向きの目
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize, 0, Math.PI * 2);
            context.fill();
            
            // 黒目
            context.fillStyle = 'black';
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX + eyeSize * 0.3, eyeSize * 0.5, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX + eyeSize * 0.3, eyeSize * 0.5, 0, Math.PI * 2);
            context.fill();
            
          } else if (circle.personality === '好奇心') {
            // 好奇心旺盛な丸は大きな目
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 1.2, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 1.2, 0, Math.PI * 2);
            context.fill();
            
            // 黒目
            context.fillStyle = 'black';
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 0.7, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 0.7, 0, Math.PI * 2);
            context.fill();
            
          } else if (circle.personality === '無関心') {
            // 無関心な丸は棒線の目
            context.fillStyle = 'black';
            context.fillRect(circle.x - eyeOffsetX - eyeSize, circle.y - eyeOffsetX, eyeSize * 2, eyeSize * 0.5);
            context.fillRect(circle.x + eyeOffsetX - eyeSize, circle.y - eyeOffsetX, eyeSize * 2, eyeSize * 0.5);
            
          } else if (circle.personality === '社交的') {
            // 社交的な丸は笑顔
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize, 0, Math.PI * 2);
            context.fill();
            
            // 黒目
            context.fillStyle = 'black';
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 0.5, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 0.5, 0, Math.PI * 2);
            context.fill();
            
            // 笑顔 (高パフォーマンスモードのみ)
            if (performanceMode === 'high') {
              context.beginPath();
              context.arc(circle.x, circle.y + eyeOffsetX, circle.radius * 0.5, 0, Math.PI);
              context.strokeStyle = 'black';
              context.lineWidth = circle.radius * 0.1;
              context.stroke();
            }
            
          } else if (circle.personality === '一匹狼') {
            // 一匹狼は細い目
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize, 0, Math.PI * 2);
            context.fill();
            
            // 黒目
            context.fillStyle = 'black';
            context.beginPath();
            context.arc(circle.x - eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 0.3, 0, Math.PI * 2);
            context.arc(circle.x + eyeOffsetX, circle.y - eyeOffsetX, eyeSize * 0.3, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
    }
    
    // 情報表示
    if (showInfo) {
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(10, 10, 220, 150);
      context.fillStyle = 'white';
      context.font = '14px Arial';
      context.fillText('◆ 丸の性格タイプ:', 20, 30);
      context.fillText('・臆病: マウスから逃げる', 30, 50);
      context.fillText('・好奇心: マウスに近づく', 30, 70);
      context.fillText('・無関心: マウスに反応しない', 30, 90);
      context.fillText('・社交的: 他の丸に近づく', 30, 110);
      context.fillText('・一匹狼: 他の丸から離れる', 30, 130);
      context.fillText(`◆ パフォーマンス: ${performanceMode}`, 20, 150);
    }
  }, [circles, clickEffect, performanceMode, showInfo, showTrails]);

  // アニメーションループ
  const animate = useCallback((time: number): void => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }
    
    const deltaTime = time - previousTimeRef.current;
    previousTimeRef.current = time;
    
    // FPS測定とパフォーマンス調整
    measureFPS(deltaTime);
    
    if (!isPaused) {
      updateCircles(deltaTime);
      
      // クリック効果の更新
      if (clickEffect) {
        setClickEffect(prev => {
          if (!prev) return null;
          
          const newEffect: ClickEffect = { ...prev };
          newEffect.time += deltaTime / 1000;
          newEffect.radius = Math.min(newEffect.maxRadius, newEffect.radius + deltaTime * 0.5);
          
          // クリック効果の寿命
          if (newEffect.time > 0.5) {
            return null;
          }
          return newEffect;
        });
      }
    }
    
    renderCircles();
    requestRef.current = window.requestAnimationFrame(animate);
  }, [clickEffect, isPaused, measureFPS, renderCircles, updateCircles]);

  // キャンバスの設定と初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth > 800 ? 800 : window.innerWidth - 20;
      canvas.height = window.innerHeight > 600 ? 600 : window.innerHeight - 100;

      if (circles.length === 0) {
        initCircles();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      setClickEffect({ x: clickX, y: clickY, radius: 0, maxRadius: 150, power: 10, time: 0 });
    };

    canvas.addEventListener('click', handleClick);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => {
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [circles.length, initCircles]);

  // マウスの位置を追跡
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // アニメーションの開始/停止
  useEffect(() => {
    if (circles.length === 0) {
      initCircles();
    }
    
    // パフォーマンス設定を初期化
    updatePerformanceSettings(performanceMode);
    
    requestRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        window.cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, circles.length, initCircles, performanceMode, updatePerformanceSettings]);

  const changeCircleCount = useCallback((newCount: number) => {
    setCircleCount(newCount);
    setTimeout(initCircles, 0);
  }, [initCircles]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-2 text-gray-800">癒しのグー</h2>
      <div className="relative mb-2">
        <canvas ref={canvasRef} className="bg-white rounded-lg shadow-md cursor-pointer" />
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        <button onClick={() => setIsPaused(!isPaused)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
          {isPaused ? '再開' : '一時停止'}
        </button>
        <button onClick={() => setShowTrails(!showTrails)} className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition">
          {showTrails ? '軌跡を隠す' : '軌跡を表示'}
        </button>
        <button onClick={() => setShowInfo(!showInfo)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
          {showInfo ? '情報を隠す' : '情報を表示'}
        </button>
        <button onClick={initCircles} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">
          リセット
        </button>
      </div>
      <div className="mt-2 w-full max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">丸の数: {circleCount}</label>
        <div className="flex items-center gap-2">
          {[100, 200, 300, 500].map(num => (
            <button key={num} onClick={() => changeCircleCount(num)} className="px-2 py-1 bg-gray-200 text-xs rounded">{num}</button>
          ))}
        </div>
      </div>
      
      <div className="mt-2 w-full max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">パフォーマンス設定:</label>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setPerformanceMode('high')} 
            className={`px-3 py-1 text-xs rounded ${performanceMode === 'high' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          >
            高品質
          </button>
          <button 
            onClick={() => setPerformanceMode('medium')} 
            className={`px-3 py-1 text-xs rounded ${performanceMode === 'medium' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
          >
            中品質
          </button>
          <button 
            onClick={() => setPerformanceMode('low')} 
            className={`px-3 py-1 text-xs rounded ${performanceMode === 'low' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
          >
            省電力
          </button>
        </div>
      </div>
      
      <p className="mt-4 text-sm text-gray-600">
        マウスを動かして丸たちの反応を見てみましょう！キャンバスをクリックすると爆発します！
      </p>
    </div>
  );
};

export default CircleSimulation;