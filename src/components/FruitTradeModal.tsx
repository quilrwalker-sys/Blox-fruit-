import React, { useState, useEffect, useRef } from 'react';
import { BloxFruit } from '../types/game';
import { BLOX_FRUITS } from '../data/gameData';
import { sound } from '../utils/audio';

interface FruitTradeModalProps {
  partnerId: string;
  partnerName: string;
  myStoredFruits: BloxFruit[];
  myActiveFruit: BloxFruit | null;
  partnerOfferedFruit: BloxFruit | null;
  partnerLocked: boolean;
  partnerConfirmed: boolean;
  partnerOwnedFruitIds?: string[];
  onUpdateMyOffer: (fruit: BloxFruit | null, locked: boolean, confirmed: boolean) => void;
  onCompleteTrade: (myOfferedFruit: BloxFruit | null, partnerReceivedFruit: BloxFruit | null) => void;
  onClose: () => void;
  isBot?: boolean;
}

// Weighted Bot Selection: Common fruits appear frequently, higher rarities are rarer, Leviathan is Hyper Mega Ultra Rare
const getRandomBotFruit = (): BloxFruit => {
  const getWeight = (fruit: BloxFruit): number => {
    if (fruit.id === 'fruit_leviathan') return 1; // HIPER MEGA ULTRA RARA (~0.013% chance)
    switch (fruit.rarity) {
      case 'Mítica':
        return 15; // ~0.2%
      case 'Lendária':
        return 80; // ~1.2%
      case 'Épica':
        return 250; // ~3.5%
      case 'Rara':
        return 800; // ~10%
      case 'Incomum':
        return 1800; // ~23%
      case 'Comum':
      default:
        return 4500; // ~62% (Frutas comuns/ruins aparecem na grande maioria das trocas)
    }
  };

  const poolWithWeights = BLOX_FRUITS.map((f) => ({
    fruit: f,
    weight: getWeight(f),
  }));

  const totalWeight = poolWithWeights.reduce((acc, curr) => acc + curr.weight, 0);
  let randomVal = Math.random() * totalWeight;

  for (const item of poolWithWeights) {
    if (randomVal < item.weight) {
      return item.fruit;
    }
    randomVal -= item.weight;
  }

  return BLOX_FRUITS[0];
};

export const FruitTradeModal: React.FC<FruitTradeModalProps> = ({
  partnerId: _partnerId,
  partnerName,
  myStoredFruits,
  myActiveFruit,
  partnerOfferedFruit: externalPartnerFruit,
  partnerLocked: externalPartnerLocked,
  partnerConfirmed: externalPartnerConfirmed,
  partnerOwnedFruitIds = [],
  onUpdateMyOffer,
  onCompleteTrade,
  onClose,
  isBot = false,
}) => {
  const [mySelectedFruit, setMySelectedFruit] = useState<BloxFruit | null>(null);
  const [myLocked, setMyLocked] = useState<boolean>(false);
  const [myConfirmed, setMyConfirmed] = useState<boolean>(false);
  const [tradeErrorNotice, setTradeErrorNotice] = useState<string | null>(null);

  // Bot simulation state if partner is an NPC / bot player
  const [botFruit, setBotFruit] = useState<BloxFruit | null>(null);
  const [botLocked, setBotLocked] = useState<boolean>(false);
  const [botConfirmed, setBotConfirmed] = useState<boolean>(false);

  // Countdown timer when both lock in
  const [countdown, setCountdown] = useState<number | null>(null);

  // Available fruits to offer: stored fruits + active fruit (if any)
  const availableFruits = React.useMemo(() => {
    const list: BloxFruit[] = [...myStoredFruits];
    if (myActiveFruit && !list.some((f) => f.id === myActiveFruit.id)) {
      list.push(myActiveFruit);
    }
    return list;
  }, [myStoredFruits, myActiveFruit]);

  // Initial Bot fruit selection
  useEffect(() => {
    if (isBot) {
      const initialFruit = getRandomBotFruit();
      setBotFruit(initialFruit);
      setBotLocked(false);
      setBotConfirmed(false);
    }
  }, [isBot]);

  const effectivePartnerFruit = isBot ? botFruit : externalPartnerFruit;
  const effectivePartnerLocked = isBot ? botLocked : externalPartnerLocked;
  const effectivePartnerConfirmed = isBot ? botConfirmed : externalPartnerConfirmed;

  // Duplicate Fruit Conflict Checks (Max 1 of each fruit & cannot trade identical/already-owned fruits)
  const isSameFruitOnTable = Boolean(
    mySelectedFruit && effectivePartnerFruit && mySelectedFruit.id === effectivePartnerFruit.id
  );
  const iAlreadyOwnPartnerFruit = Boolean(
    effectivePartnerFruit &&
      myStoredFruits.some((f) => f.id === effectivePartnerFruit.id)
  );
  const partnerAlreadyOwnsMyFruit = Boolean(
    mySelectedFruit &&
      (partnerOwnedFruitIds.includes(mySelectedFruit.id) ||
        effectivePartnerFruit?.id === mySelectedFruit.id)
  );
  const hasDuplicateConflict =
    isSameFruitOnTable || iAlreadyOwnPartnerFruit || partnerAlreadyOwnsMyFruit;

  // Auto-unlock if a duplicate conflict arises while locked
  useEffect(() => {
    if (hasDuplicateConflict && (myLocked || myConfirmed)) {
      setMyLocked(false);
      setMyConfirmed(false);
      onUpdateMyOffer(mySelectedFruit, false, false);
    }
  }, [hasDuplicateConflict, myLocked, myConfirmed, mySelectedFruit, onUpdateMyOffer]);

  // Trade Value Equivalency Calculation
  const myValue = mySelectedFruit ? mySelectedFruit.priceBeli : 0;
  const partnerValue = effectivePartnerFruit ? effectivePartnerFruit.priceBeli : 0;
  const valueRatio = partnerValue > 0 ? myValue / partnerValue : 0;

  // Fair trade condition: Player offer must be at least 60% of bot fruit value AND no duplicate fruit conflict
  const isTradeFairForBot =
    partnerValue > 0 && myValue > 0 && valueRatio >= 0.60 && !hasDuplicateConflict;

  // Bot Auto-Lock logic when trade is fair and has no duplicate conflict
  useEffect(() => {
    if (!isBot) return;

    if (!mySelectedFruit || !isTradeFairForBot || hasDuplicateConflict) {
      setBotLocked(false);
      setBotConfirmed(false);
      return;
    }

    const timer = setTimeout(() => {
      setBotLocked(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isBot, mySelectedFruit, isTradeFairForBot, hasDuplicateConflict, botFruit]);

  // Handle Lock in
  const handleToggleLock = () => {
    if (!mySelectedFruit) return;

    if (hasDuplicateConflict && !myLocked) {
      sound.punch();
      if (isSameFruitOnTable) {
        setTradeErrorNotice(
          `🚫 Troca Bloqueada: Vocês dois colocaram a mesma fruta (${mySelectedFruit.portugueseName}) na mesa! Não é permitido trocar frutas iguais.`
        );
      } else if (iAlreadyOwnPartnerFruit && effectivePartnerFruit) {
        setTradeErrorNotice(
          `🚫 Troca Bloqueada: Você já possui 1x ${effectivePartnerFruit.portugueseName} guardada no seu Baú (Limite máximo: 1 por fruta)!`
        );
      } else if (partnerAlreadyOwnsMyFruit) {
        setTradeErrorNotice(
          `🚫 Troca Bloqueada: ${partnerName} já possui a fruta ${mySelectedFruit.portugueseName}! Não é possível trocar uma fruta repetida.`
        );
      }
      return;
    }

    if (isBot && effectivePartnerFruit && !isTradeFairForBot && !myLocked) {
      sound.punch();
      setTradeErrorNotice(
        `❌ Proposta Recusada pelo Bot! A fruta "${mySelectedFruit.portugueseName}" (฿ ${myValue.toLocaleString()}) é muito barata para trocar por "${effectivePartnerFruit.portugueseName}" (฿ ${partnerValue.toLocaleString()}). Mínimo de 60%: ฿ ${Math.round(partnerValue * 0.6).toLocaleString()}.`
      );
      return;
    }

    setTradeErrorNotice(null);
    sound.click();
    const nextLocked = !myLocked;
    setMyLocked(nextLocked);
    setMyConfirmed(false);
    onUpdateMyOffer(mySelectedFruit, nextLocked, false);
  };

  // Bot confirms after player confirms, provided trade is fair and no duplicate conflict
  useEffect(() => {
    if (isBot && myLocked && botLocked && !botConfirmed && isTradeFairForBot && !hasDuplicateConflict) {
      const timer = setTimeout(() => {
        setBotConfirmed(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isBot, myLocked, botLocked, botConfirmed, isTradeFairForBot, hasDuplicateConflict]);

  const onCompleteTradeRef = useRef(onCompleteTrade);
  onCompleteTradeRef.current = onCompleteTrade;

  const mySelectedFruitRef = useRef(mySelectedFruit);
  mySelectedFruitRef.current = mySelectedFruit;

  const effectivePartnerFruitRef = useRef(effectivePartnerFruit);
  effectivePartnerFruitRef.current = effectivePartnerFruit;

  // Handle Countdown when both confirmed
  useEffect(() => {
    if (myConfirmed && effectivePartnerConfirmed && !hasDuplicateConflict) {
      sound.legendaryWin();
      setCountdown(3);
      let remaining = 3;

      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(interval);
          setCountdown(0);
          onCompleteTradeRef.current(mySelectedFruitRef.current, effectivePartnerFruitRef.current);
        } else {
          setCountdown(remaining);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [myConfirmed, effectivePartnerConfirmed, hasDuplicateConflict]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-950 border-2 border-amber-500 rounded-3xl p-6 max-w-3xl w-full shadow-2xl text-white space-y-5 relative border-t-amber-400 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔄</span>
            <div>
              <h2 className="text-lg font-black text-amber-400 tracking-wide">MESA DE TROCA DE FRUTAS</h2>
              <p className="text-xs text-slate-400">
                Negociando com <strong className="text-sky-300 font-bold">{partnerName}</strong> • Limite de 1 por fruta no Baú
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Countdown Overlay if trade finishing */}
        {countdown !== null && (
          <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 p-3 rounded-2xl text-center font-black animate-pulse shadow-lg shadow-amber-500/30">
            🎉 TROCA SENDO FINALIZADA EM {countdown}s... SEGUREM AS FRUTAS!
          </div>
        )}

        {/* Duplicate Fruit Conflict Alert Banner */}
        {hasDuplicateConflict && (
          <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-3.5 flex items-center gap-3 text-rose-100 shadow-lg shadow-rose-950/50 animate-fadeIn">
            <span className="text-2xl shrink-0">🚫</span>
            <div className="text-xs leading-relaxed">
              <div className="font-black text-rose-300 uppercase tracking-wide">
                Troca Bloqueada — Fruta Repetida Detectada!
              </div>
              {isSameFruitOnTable ? (
                <p>
                  Você e <strong>{partnerName}</strong> colocaram a mesma fruta (
                  <strong>{mySelectedFruit?.portugueseName}</strong>) na mesa! Não é possível trocar frutas iguais.
                </p>
              ) : iAlreadyOwnPartnerFruit ? (
                <p>
                  Você já tem <strong>1x {effectivePartnerFruit?.portugueseName}</strong> guardada no seu Baú! O limite é de apenas <strong>1 unidade de cada fruta</strong>, então você não pode receber outra igual.
                </p>
              ) : (
                <p>
                  <strong>{partnerName}</strong> já possui a fruta <strong>{mySelectedFruit?.portugueseName}</strong>! Escolha outra fruta diferente para continuar a troca.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Custom In-Modal Error Notice */}
        {tradeErrorNotice && !hasDuplicateConflict && (
          <div className="bg-rose-950/80 border border-rose-500/60 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-rose-200 font-semibold">
            <span>{tradeErrorNotice}</span>
            <button
              onClick={() => setTradeErrorNotice(null)}
              className="px-2 py-1 rounded bg-rose-900/70 hover:bg-rose-800 text-rose-100 font-bold cursor-pointer shrink-0"
            >
              OK
            </button>
          </div>
        )}

        {/* Trade Equivalency & Bot Feedback Bar */}
        {effectivePartnerFruit && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span>⚖️</span>
                <span>Equivalência da Oferta:</span>
              </span>
              <span
                className={
                  hasDuplicateConflict
                    ? 'text-rose-400 font-black'
                    : isTradeFairForBot
                    ? 'text-emerald-400 font-black'
                    : 'text-rose-400 font-black'
                }
              >
                {hasDuplicateConflict
                  ? '🚫 BLOQUEADA (Fruta Repetida)'
                  : mySelectedFruit
                  ? `${Math.round(valueRatio * 100)}% ${isTradeFairForBot ? '✅ (Oferta Válida / Justa)' : '❌ (Desproporcional / Recusada)'}`
                  : '0% (Selecione uma fruta para analisar)'}
              </span>
            </div>

            {/* Equivalency Meter Bar */}
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  hasDuplicateConflict
                    ? 'bg-gradient-to-r from-rose-600 to-red-500'
                    : isTradeFairForBot
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : mySelectedFruit
                    ? 'bg-gradient-to-r from-rose-600 to-red-500'
                    : 'bg-slate-800'
                }`}
                style={{ width: `${Math.min(100, Math.round(valueRatio * 100))}%` }}
              />
            </div>

            {/* Bot Response Message */}
            {isBot && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border transition-all ${
                  hasDuplicateConflict
                    ? 'bg-rose-950/50 border-rose-500/50 text-rose-200 shadow-md'
                    : !mySelectedFruit
                    ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                    : isTradeFairForBot
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200 shadow-md'
                }`}
              >
                <span className="text-xl shrink-0">
                  {hasDuplicateConflict ? '🚫' : !mySelectedFruit ? '🤖' : isTradeFairForBot ? '🤝' : '🚫'}
                </span>
                <div className="flex-1 text-[11px] leading-relaxed">
                  {hasDuplicateConflict ? (
                    <span>
                      <strong className="text-rose-300 font-bold">Troca Impossível por Fruta Igual!</strong>{' '}
                      {isSameFruitOnTable
                        ? `Ambos estão oferecendo a mesma fruta (${mySelectedFruit?.portugueseName}).`
                        : iAlreadyOwnPartnerFruit
                        ? `Você já guarda 1x ${effectivePartnerFruit.portugueseName} no seu Baú (Máx: 1). Peça outra fruta ao Bot ou troque depois de usar a sua!`
                        : `O parceiro já possui essa fruta.`}
                    </span>
                  ) : !mySelectedFruit ? (
                    <span>
                      O Bot está aguardando você escolher uma fruta do seu inventário para analisar o valor de mercado.
                    </span>
                  ) : isTradeFairForBot ? (
                    <span>
                      <strong className="text-emerald-300 font-bold">Proposta Aceita!</strong> A fruta <strong>{mySelectedFruit.portugueseName}</strong> possui valor justo equivalente a <strong>{effectivePartnerFruit.portugueseName}</strong>.
                    </span>
                  ) : (
                    <span>
                      <strong className="text-rose-300 font-bold">Proposta Recusada!</strong> A fruta <strong>{mySelectedFruit.portugueseName}</strong> (฿ {myValue.toLocaleString()}) é fraca/barata demais para trocar por <strong>{effectivePartnerFruit.portugueseName}</strong> (฿ {partnerValue.toLocaleString()}). Valor mínimo exigido da sua fruta: <u className="text-amber-300 font-mono font-bold">฿ {Math.round(partnerValue * 0.6).toLocaleString()}</u> (60%).
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Dual Trade Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. MY OFFER (LEFT) */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <span>👤</span>
                <span>Sua Oferta</span>
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                myConfirmed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : myLocked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {myConfirmed ? 'CONFIRMADO ✅' : myLocked ? 'TRAVADO 🔒' : 'SELECIONANDO ⏳'}
              </span>
            </div>

            {/* Offered Fruit Slot */}
            <div className="min-h-[140px] flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
              {mySelectedFruit ? (
                <div className="space-y-1.5 animate-fadeIn">
                  <div
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2"
                    style={{
                      backgroundColor: `${mySelectedFruit.iconColor}25`,
                      borderColor: mySelectedFruit.iconColor,
                      boxShadow: `0 0 20px ${mySelectedFruit.iconColor}40`,
                    }}
                  >
                    🔮
                  </div>
                  <div className="text-sm font-black text-white">{mySelectedFruit.portugueseName}</div>
                  <div className="text-xs text-amber-300 font-mono font-bold">
                    ฿ {mySelectedFruit.priceBeli.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Raridade: {mySelectedFruit.rarity}
                  </span>
                </div>
              ) : (
                <div className="text-slate-500 text-xs text-center space-y-1">
                  <span className="text-2xl block opacity-40">🍎</span>
                  <span>Nenhuma fruta selecionada</span>
                  <p className="text-[10px] text-slate-600">Escolha uma fruta do seu inventário abaixo</p>
                </div>
              )}
            </div>

            {/* Fruit Inventory Picker */}
            {!myLocked && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">Seu Inventário de Frutas:</span>
                {availableFruits.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-2">
                    Você não tem frutas sobressalentes para trocar.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {availableFruits.map((f, i) => {
                      const matchesPartnerTable = effectivePartnerFruit?.id === f.id;
                      const partnerHasThis = partnerOwnedFruitIds.includes(f.id) || matchesPartnerTable;
                      return (
                        <button
                          key={`${f.id}_${i}`}
                          onClick={() => {
                            sound.click();
                            setTradeErrorNotice(null);
                            setMySelectedFruit(f);
                            onUpdateMyOffer(f, false, false);
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                            mySelectedFruit?.id === f.id
                              ? partnerHasThis
                                ? 'bg-rose-500/20 border-rose-500 text-white shadow-md'
                                : 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                              : partnerHasThis
                              ? 'bg-rose-950/30 border-rose-800/50 text-slate-400'
                              : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                          }`}
                        >
                          <span className="text-base">{partnerHasThis ? '🚫' : '🔮'}</span>
                          <div className="truncate flex-1">
                            <div className="text-[11px] font-bold truncate">{f.portugueseName || f.name}</div>
                            <div className="text-[9px] text-amber-300/80 font-mono">
                              ฿ {f.priceBeli.toLocaleString()} {partnerHasThis ? '• Repetida' : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Lock / Confirm Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={handleToggleLock}
                disabled={!mySelectedFruit || countdown !== null || (hasDuplicateConflict && !myLocked)}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                  !mySelectedFruit || (hasDuplicateConflict && !myLocked)
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : myLocked
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer'
                    : 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer'
                }`}
              >
                {hasDuplicateConflict && !myLocked
                  ? '🚫 Fruta Igual (Bloqueado)'
                  : myLocked
                  ? '🔓 Destravar Oferta'
                  : '🔒 Travar Oferta'}
              </button>

              {myLocked && !hasDuplicateConflict && (
                <button
                  onClick={() => {
                    sound.click();
                    setMyConfirmed(true);
                    onUpdateMyOffer(mySelectedFruit, true, true);
                  }}
                  disabled={myConfirmed || countdown !== null || hasDuplicateConflict}
                  className={`flex-1 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    myConfirmed
                      ? 'bg-emerald-600/50 text-white cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 animate-bounce'
                  }`}
                >
                  {myConfirmed ? 'Aguardando Parceiro...' : '✅ Aceitar Troca'}
                </button>
              )}
            </div>
          </div>

          {/* 2. PARTNER OFFER (RIGHT) */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black uppercase text-sky-400 flex items-center gap-1.5">
                <span>🤝</span>
                <span>Oferta de {partnerName}</span>
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                effectivePartnerConfirmed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : effectivePartnerLocked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {effectivePartnerConfirmed ? 'CONFIRMADO ✅' : effectivePartnerLocked ? 'TRAVADO 🔒' : 'PENSANDO ⏳'}
              </span>
            </div>

            {/* Partner Offered Fruit Slot */}
            <div className="min-h-[140px] flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
              {effectivePartnerFruit ? (
                <div className="space-y-1.5 animate-fadeIn">
                  <div
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-lg border-2"
                    style={{
                      backgroundColor: `${effectivePartnerFruit.iconColor}25`,
                      borderColor: effectivePartnerFruit.iconColor,
                      boxShadow: `0 0 20px ${effectivePartnerFruit.iconColor}40`,
                    }}
                  >
                    🔮
                  </div>
                  <div className="text-sm font-black text-white">{effectivePartnerFruit.portugueseName}</div>
                  <div className="text-xs text-amber-300 font-mono font-bold">
                    ฿ {effectivePartnerFruit.priceBeli.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Raridade: {effectivePartnerFruit.rarity}
                    </span>
                    {iAlreadyOwnPartnerFruit && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/50">
                        🚫 Você já tem (1/1)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs text-center space-y-1">
                  <span className="text-2xl block opacity-40">⏳</span>
                  <span>Aguardando {partnerName} colocar uma fruta...</span>
                </div>
              )}
            </div>

            {/* Re-roll Bot Fruit Button */}
            {isBot && (
              <button
                onClick={() => {
                  sound.click();
                  setTradeErrorNotice(null);
                  const newFruit = getRandomBotFruit();
                  setBotFruit(newFruit);
                  setBotLocked(false);
                  setBotConfirmed(false);
                  setMyLocked(false);
                  setMyConfirmed(false);
                }}
                disabled={countdown !== null}
                className="w-full py-2 px-2.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-xl text-xs font-bold text-indigo-200 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow"
              >
                <span>🎲</span>
                <span>Pedir Outra Fruta ao Bot</span>
              </button>
            )}

            {/* Status explanation */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300">Regras da Troca:</div>
              <p>• <strong>Proibido frutas iguais:</strong> Se alguém já tiver a mesma fruta na troca ou no Baú (máx. 1), a troca é bloqueada.</p>
              <p>• A sua fruta precisa valer no mínimo <strong>60% do valor da fruta do parceiro</strong>.</p>
            </div>

            {/* Cancel Button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  sound.click();
                  onClose();
                }}
                className="w-full py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancelar Negociação ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
