import React, { useState, useEffect } from 'react';
import { PlayerStats } from '../types/game';
import { sound } from '../utils/audio';

interface LoadingScreenModalProps {
  stats: PlayerStats;
  activeFruitName?: string;
  mode: 'resume' | 'new';
  durationSeconds?: number;
  onComplete: () => void;
}

interface GameTip {
  category: string;
  icon: string;
  title: string;
  text: string;
  accentColor: string;
}

const GAME_TIPS: GameTip[] = [
  {
    category: 'COMBATE & HAKI',
    icon: '⚡',
    title: 'Busoshoku & Kenbunshoku Haki',
    text: 'Ative o Buso Haki [J] para revestir seu corpo e armas com energia espiritual, aumentando seu ataque e redução de dano. Use o Ken Haki [E] para desviar automaticamente de golpes!',
    accentColor: '#a855f7',
  },
  {
    category: 'SEGREDO DOS MARES',
    icon: '🍷',
    title: 'O Ritual do Cálice Sagrado & Mihawk',
    text: 'Tente a sorte no Altar do Cálice Sagrado (2% de chance a cada 15 min). Com ele, ative os 3 altares usando as cores Vermelho Sangue, Verde Dark Blade e Azul Kitsune para invocar o Mihawk Lv. 2300!',
    accentColor: '#10b981',
  },
  {
    category: 'DROP MÍTICO (0.5%)',
    icon: '✝️',
    title: 'Adaga do Mihawk (Cruz Kogatana)',
    text: 'Ao invocar o Mihawk, você terá exatamente 5 minutos para derrotá-lo. Se vencer dentro do tempo, há 0.5% de chance de dropar sua lendária espada em forma de cruz permanentemente!',
    accentColor: '#facc15',
  },
  {
    category: 'VIAJANTE DAS ILHAS',
    icon: '🧙‍♂️',
    title: 'Mestre das Cores de Haki',
    text: 'A cada 15 minutos, o Mestre das Cores de Haki aparece em uma ilha aleatória trazendo uma única cor de aura em estoque. Colecione Fragmentos Raros para garantir cores Lendárias e Míticas!',
    accentColor: '#38bdf8',
  },
  {
    category: 'EVENTO GLOBAL',
    icon: '🚨',
    title: 'Invasão do Imperador do Abismo',
    text: 'Fique atento ao cronômetro de Invasão! Quando o Imperador do Abismo surgir na ilha, derrote-o para receber uma grande quantidade de Fragmentos Raros 🟣, EXP e Beli.',
    accentColor: '#f43f5e',
  },
  {
    category: 'SOBREVIVÊNCIA & RECOMPENSA',
    icon: '💀',
    title: 'Cuidado ao Morrer em Combate',
    text: 'Se a sua vida chegar a zero, você perderá parte da sua Recompensa (Bounty) de pirata e renascerá imediatamente na área segura do Mestre de Missões.',
    accentColor: '#fb923c',
  },
  {
    category: 'PROGRESSÃO RÁPIDA',
    icon: '🤖',
    title: 'Auto-Farm & Maestria de Armas',
    text: 'Ative o botão Auto-Farm e aceite uma missão para caçar inimigos sem parar! Além disso, a cada 100 usos de Soco, Espada ou Fruta, você ganha +1% de dano permanente naquela categoria.',
    accentColor: '#34d399',
  },
];

const LOADING_STAGES = [
  'Carregando mapa oceânico e ilhas do Grande Mar...',
  'Sincronizando poderes elementais das Frutas Blox...',
  'Forjando lâminas negras e preparando arsenal...',
  'Despertando reservas de Busoshoku e Kenbunshoku Haki...',
  'Posicionando chefes, missões e mercadores nas ilhas...',
  'Tudo pronto! Içando velas para zarpar!',
];

export const LoadingScreenModal: React.FC<LoadingScreenModalProps> = ({
  stats,
  activeFruitName,
  mode,
  durationSeconds = 12,
  onComplete,
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * GAME_TIPS.length));

  const onCompleteRef = React.useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const startTimeRef = React.useRef<number>(Date.now());
  const totalMs = durationSeconds * 1000;
  const progressPct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  const secondsLeft = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));

  // Progress timer (12 seconds total, immune to parent re-renders)
  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - startTimeRef.current;
      if (diff >= totalMs) {
        setElapsedMs(totalMs);
        clearInterval(interval);
        sound.legendaryWin();
        onCompleteRef.current();
      } else {
        setElapsedMs(diff);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [totalMs]);

  // Rotate tips automatically every 3 seconds
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GAME_TIPS.length);
    }, 3000);
    return () => clearInterval(tipTimer);
  }, []);

  const currentTip = GAME_TIPS[tipIndex];
  const stageIdx = Math.min(
    LOADING_STAGES.length - 1,
    Math.floor((progressPct / 100) * LOADING_STAGES.length)
  );
  const currentStageText = LOADING_STAGES[stageIdx];

  const factionLabel =
    stats.character?.faction === 'Marines'
      ? '⚓ Marinha Mundial'
      : stats.character?.faction === 'Revolutionaries'
      ? '⚔️ Exército Revolucionário'
      : '🏴‍☠️ Piratas dos Mares';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none">
      {/* Ambient Animated Background Glows */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: currentTip.accentColor }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: '#f59e0b' }}
      />

      {/* Top Bar: Game Title & Player Summary */}
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-3 border-b border-slate-800/80 pb-4 max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20 border border-amber-300/40">
            🏴‍☠️
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-wider text-amber-400 uppercase">
              Blox Fruits: Grand Seas
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'new' ? 'Iniciando Nova Jornada nos Mares...' : 'Carregando Progresso Salvo...'}
            </p>
          </div>
        </div>

        {/* Player Badge */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl">
          <div className="text-right">
            <div className="text-xs font-black text-white">
              {stats.character?.name || 'Pirata'} <span className="text-amber-400">Lv.{stats.level}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {factionLabel} {activeFruitName ? `• 🔮 ${activeFruitName}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Center Section: Animated Emblem & Rotating Game Tips */}
      <div className="relative z-10 my-auto max-w-2xl w-full mx-auto flex flex-col items-center text-center space-y-6 py-4">
        {/* Spinning Compass / Devil Fruit Orb */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border-4 border-dashed animate-spin opacity-60"
            style={{
              borderColor: currentTip.accentColor,
              animationDuration: '8s',
            }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-amber-400/40 animate-ping"
            style={{ animationDuration: '2.5s' }}
          />
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900 border-2 flex items-center justify-center text-3xl sm:text-4xl shadow-2xl transition-all duration-500"
            style={{
              borderColor: currentTip.accentColor,
              boxShadow: `0 0 30px ${currentTip.accentColor}55`,
            }}
          >
            {currentTip.icon}
          </div>
        </div>

        {/* Game Tip Card */}
        <div
          className="w-full bg-slate-900/90 backdrop-blur-md border-2 rounded-2xl p-5 sm:p-6 shadow-2xl transition-all duration-500 space-y-3"
          style={{
            borderColor: `${currentTip.accentColor}88`,
            boxShadow: `0 0 35px ${currentTip.accentColor}22`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
              style={{
                color: currentTip.accentColor,
                borderColor: `${currentTip.accentColor}66`,
                backgroundColor: `${currentTip.accentColor}15`,
              }}
            >
              💡 DICA DO JOGO • {currentTip.category}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Dica {tipIndex + 1} de {GAME_TIPS.length}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-black text-white tracking-tight text-left">
            {currentTip.title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed text-left min-h-[3.2rem]">
            {currentTip.text}
          </p>

          {/* Tip Navigation Dots & Manual Next/Prev */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {GAME_TIPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    sound.click();
                    setTipIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === tipIndex ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={`Ver dica ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                sound.click();
                setTipIndex((prev) => (prev + 1) % GAME_TIPS.length);
              }}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Próxima Dica</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: 12-Second Progress Bar & Status */}
      <div className="relative z-10 max-w-3xl w-full mx-auto space-y-2.5 pb-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{currentStageText}</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-amber-400 font-black">{progressPct}%</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{secondsLeft}s restantes</span>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-100 ease-linear shadow-[0_0_12px_#f59e0b]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
