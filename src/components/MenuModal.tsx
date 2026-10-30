import React from 'react';
import { sound } from '../utils/audio';

interface MenuModalProps {
  onOpenModal: (modal: 'stats' | 'quests' | 'fruits' | 'fragShop' | 'shop' | 'map' | 'admin' | 'clan' | 'hakiShop') => void;
  onOpenStartScreen?: () => void;
  onOpenTrade?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onClose: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  onOpenModal,
  onOpenStartScreen,
  onOpenTrade,
  soundEnabled,
  onToggleSound,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-950 border-2 border-amber-500 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-white space-y-5 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☰</span>
            <h2 className="text-lg font-black text-amber-400 tracking-wide">MENU PRINCIPAL</h2>
          </div>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Category 1: Personagem & Aventura */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider">👤 Personagem & Aventura</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { sound.click(); onClose(); onOpenModal('stats'); }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">📊</span>
                <div>
                  <div className="text-xs font-bold text-white">Atributos</div>
                  <div className="text-[10px] text-slate-400">Distribuir pontos</div>
                </div>
              </button>
              <button
                onClick={() => { sound.click(); onClose(); onOpenModal('quests'); }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">📜</span>
                <div>
                  <div className="text-xs font-bold text-amber-300">Missões</div>
                  <div className="text-[10px] text-slate-400">Quadro de contratos</div>
                </div>
              </button>
            </div>
          </div>

          {/* Category 2: Lojas & Comércio */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">🛒 Lojas & Comércio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                onClick={() => { sound.click(); onClose(); onOpenModal('fruits'); }}
                className="p-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">🔮</span>
                <div>
                  <div className="text-xs font-bold text-indigo-200">Frutas Blox</div>
                  <div className="text-[10px] text-indigo-300/70">Girar e armazenar</div>
                </div>
              </button>
              <button
                onClick={() => { sound.click(); onClose(); onOpenModal('fragShop'); }}
                className="p-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">🟣</span>
                <div>
                  <div className="text-xs font-bold text-purple-200">Loja de Frags</div>
                  <div className="text-[10px] text-purple-300/70">Fragmentos raros</div>
                </div>
              </button>
              <button
                onClick={() => { sound.click(); onClose(); onOpenModal('shop'); }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">⚔️</span>
                <div>
                  <div className="text-xs font-bold text-white">Loja & Haki</div>
                  <div className="text-[10px] text-slate-400">Espadas e habilidades</div>
                </div>
              </button>
              <button
                onClick={() => { sound.click(); onClose(); onOpenModal('hakiShop'); }}
                className="p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">⚡</span>
                <div>
                  <div className="text-xs font-bold text-amber-300">Cores de Haki</div>
                  <div className="text-[10px] text-amber-200/70">Comprar e gerenciar</div>
                </div>
              </button>
            </div>
          </div>

          {/* Category 3: Mundo & Social */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider">🗺️ Mundo & Social</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => { sound.click(); onClose(); onOpenModal('map'); }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">🗺️</span>
                <div>
                  <div className="text-xs font-bold text-white">Mapa das Ilhas</div>
                  <div className="text-[10px] text-slate-400">Navegar pelo mundo</div>
                </div>
              </button>
              <button
                onClick={() => { sound.click(); onClose(); onOpenModal('clan'); }}
                className="p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">🛡️</span>
                <div>
                  <div className="text-xs font-bold text-amber-300">Clã & Ilhas</div>
                  <div className="text-[10px] text-amber-200/70">Domínio territorial</div>
                </div>
              </button>
              <button
                onClick={() => {
                  sound.click();
                  onClose();
                  onOpenTrade?.();
                }}
                className="p-3 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">🔄</span>
                <div>
                  <div className="text-xs font-bold text-cyan-300">Troca de Fruta</div>
                  <div className="text-[10px] text-cyan-200/70">Com jogador ou bot</div>
                </div>
              </button>
            </div>
          </div>

          {/* Category 4: Sistema & Conta */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">⚙️ Sistema & Conta</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { sound.click(); onClose(); onOpenStartScreen?.(); }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">👤</span>
                <div>
                  <div className="text-xs font-bold text-white">Personagem / Início</div>
                  <div className="text-[10px] text-slate-400">Editar pirata</div>
                </div>
              </button>
              <button
                onClick={() => { sound.click(); onToggleSound(); }}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition-all cursor-pointer group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{soundEnabled ? '🔊' : '🔇'}</span>
                <div>
                  <div className="text-xs font-bold text-white">Áudio do Jogo</div>
                  <div className="text-[10px] text-slate-400">{soundEnabled ? 'Ligado' : 'Desligado'}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
