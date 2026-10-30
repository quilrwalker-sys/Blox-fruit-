import React from 'react';
import { sound } from '../utils/audio';

export interface Gear5Settings {
  active: boolean;
  godMode: boolean;
  speedMultiplier: number;
  damageMultiplier: number;
  infiniteEnergy: boolean;
  oneHitKill: boolean;
}

interface Gear5HackModalProps {
  settings: Gear5Settings;
  onUpdateSettings: (newSettings: Gear5Settings) => void;
  onTriggerBajrangGun: () => void;
  onClose: () => void;
}

export const Gear5HackModal: React.FC<Gear5HackModalProps> = ({
  settings,
  onUpdateSettings,
  onTriggerBajrangGun,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 border-2 border-yellow-400 rounded-3xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(250,204,21,0.3)] text-white space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-yellow-500/30 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-spin" style={{ animationDuration: '6s' }}>☀️</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-white tracking-wide">
                  GEAR 5: DEUS DO SOL NIKA
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600/90 text-white animate-pulse">
                  HACK SECRETO
                </span>
              </div>
              <p className="text-xs text-yellow-200/80">
                Easter Egg Secreto Desbloqueado: Monkey D. Luffy + Fruta da Borracha!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Transformation Master Toggle */}
        <div className="p-4 rounded-2xl bg-yellow-500/10 border-2 border-yellow-400/50 flex items-center justify-between shadow-inner">
          <div className="space-y-0.5">
            <span className="text-sm font-black text-yellow-300 flex items-center gap-1.5">
              <span>🥁</span>
              <span>Modo Deus Nika (Gear 5)</span>
            </span>
            <p className="text-[11px] text-slate-300">
              Cabelos e nuvens brancas, riso dos guerreiros e poderes de desenho animado.
            </p>
          </div>
          <button
            onClick={() => {
              sound.legendaryWin();
              onUpdateSettings({ ...settings, active: !settings.active });
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg ${
              settings.active
                ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-yellow-400/50 animate-bounce'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
          >
            {settings.active ? 'ATIVADO ☀️' : 'DESATIVADO'}
          </button>
        </div>

        {/* Hack Settings Controls */}
        <div className="space-y-3.5">
          {/* 1. Invincibility (God Mode) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Invencibilidade Total (God Mode)</span>
              </span>
              <p className="text-[10px] text-slate-400">
                Dano tomado é anulado a zero. Você é imortal e nada pode te ferir.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.godMode}
              onChange={(e) => {
                sound.click();
                onUpdateSettings({ ...settings, godMode: e.target.checked });
              }}
              className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
            />
          </div>

          {/* 2. Speed Hack Slider */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                <span>⚡</span>
                <span>Velocidade Hack do Nika</span>
              </span>
              <span className="text-xs font-mono font-bold text-yellow-300 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30">
                {settings.speedMultiplier.toFixed(1)}x Normal
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.5"
              value={settings.speedMultiplier}
              onChange={(e) => {
                onUpdateSettings({ ...settings, speedMultiplier: parseFloat(e.target.value) });
              }}
              className="w-full accent-yellow-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>1.0x (Padrão)</span>
              <span>2.5x (Super Veloz)</span>
              <span>5.0x (Teletransporte)</span>
            </div>
          </div>

          {/* 3. Damage Multiplier */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-red-400 flex items-center gap-1.5">
                <span>💥</span>
                <span>Multiplicador de Dano Divino</span>
              </span>
              <span className="text-xs font-mono font-bold text-red-300 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/30">
                {settings.damageMultiplier}x Dano
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 25, 50].map((mult) => (
                <button
                  key={mult}
                  onClick={() => {
                    sound.click();
                    onUpdateSettings({ ...settings, damageMultiplier: mult });
                  }}
                  className={`py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    settings.damageMultiplier === mult
                      ? 'bg-red-500 text-white border-red-400 shadow-md shadow-red-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>
          </div>

          {/* 4. Infinite Energy */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <span>♾️</span>
                <span>Energia Infinita & Sem Cooldown</span>
              </span>
              <p className="text-[10px] text-slate-400">
                Dispare habilidades livremente sem gastar mana ou energia.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.infiniteEnergy}
              onChange={(e) => {
                sound.click();
                onUpdateSettings({ ...settings, infiniteEnergy: e.target.checked });
              }}
              className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
            />
          </div>

          {/* 5. Bajrang Gun Instant Screen Wipe */}
          <button
            onClick={() => {
              sound.legendaryWin();
              onTriggerBajrangGun();
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-yellow-500/30 border border-yellow-200 cursor-pointer flex items-center justify-center gap-2 transform active:scale-95 transition-all"
          >
            <span>👊</span>
            <span>INVOCAR BAJRANG GUN (GIGANTIFICAÇÃO INSTANTÂNEA)</span>
            <span>💥</span>
          </button>
        </div>
      </div>
    </div>
  );
};
