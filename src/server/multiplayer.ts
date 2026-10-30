import { WebSocketServer, WebSocket } from 'ws';

export function setupMultiplayer(wss: WebSocketServer) {
  // In-memory Multiplayer, Clan & Duel Store
  const players = new Map<string, {
    id: string;
    name: string;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    level: number;
    faction: string;
    race: string;
    clanTag?: string;
    hp: number;
    maxHp: number;
    facingAngle: number;
    busoActive: boolean;
    kenActive?: boolean;
    hakiColorId?: string;
    character?: any;
    activeWeaponType?: string;
    activeSwordId?: string | null;
    activeFruitId?: string | null;
    buddhaActive?: boolean;
    gear5Active?: boolean;
    isAttacking?: boolean;
    islandId?: string;
    lastSeen: number;
    socket: WebSocket;
  }>();

  let playersDirty = false;

  const clans = new Map<string, {
    id: string;
    name: string;
    tag: string;
    leaderId: string;
    leaderName: string;
    members: { id: string; name: string; level: number; role: string }[];
    totalXp: number;
    level: number;
    controlledIslandId?: string;
    treasuryBeli: number;
  }>();

  const islandDominance = new Map<string, { clanId?: string; clanName?: string; clanTag?: string; faction?: string }>();

  // Pre-seed default clans
  clans.set('clan_1', {
    id: 'clan_1',
    name: 'Straw Hat Pirates',
    tag: 'SHP',
    leaderId: 'bot_luffy',
    leaderName: 'Monkey D. Luffy',
    members: [{ id: 'bot_luffy', name: 'Monkey D. Luffy', level: 2500, role: 'Leader' }],
    totalXp: 1500000,
    level: 10,
    controlledIslandId: 'island_1',
    treasuryBeli: 5000000,
  });

  islandDominance.set('island_1', { clanId: 'clan_1', clanName: 'Straw Hat Pirates', clanTag: 'SHP', faction: 'Pirates' });

  function broadcast(data: any) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  function serializePlayer(p: any) {
    return {
      id: p.id,
      name: p.name,
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      vx: Math.round((p.vx || 0) * 100) / 100,
      vy: Math.round((p.vy || 0) * 100) / 100,
      level: p.level,
      faction: p.faction,
      race: p.race,
      clanTag: p.clanTag,
      hp: p.hp,
      maxHp: p.maxHp,
      facingAngle: Math.round((p.facingAngle || 0) * 100) / 100,
      busoActive: !!p.busoActive,
      kenActive: !!p.kenActive,
      hakiColorId: p.hakiColorId || 'haki_amethyst_purple',
      character: p.character,
      activeWeaponType: p.activeWeaponType || 'melee',
      activeSwordId: p.activeSwordId || null,
      activeFruitId: p.activeFruitId || null,
      buddhaActive: !!p.buddhaActive,
      gear5Active: !!p.gear5Active,
      isAttacking: !!p.isAttacking,
      islandId: p.islandId || 'island_1',
    };
  }

  function broadcastPlayerList() {
    playersDirty = false;

    // Clean up any closed sockets first
    for (const [id, p] of players.entries()) {
      if (p.socket.readyState !== WebSocket.OPEN) {
        players.delete(id);
      }
    }

    const allSerialized: any[] = [];
    players.forEach((p) => {
      allSerialized.push(serializePlayer(p));
    });

    // Send each connected player ONLY the other players (never send a player their own clone!)
    players.forEach((recipient) => {
      if (recipient.socket.readyState === WebSocket.OPEN) {
        const othersOnly = allSerialized.filter((item) => item.id !== recipient.id);
        recipient.socket.send(
          JSON.stringify({
            type: 'players_update',
            players: othersOnly,
          })
        );
      }
    });
  }

  function broadcastClans() {
    const list = Array.from(clans.values());
    broadcast({ type: 'clans_update', clans: list });
  }

  function broadcastIslands() {
    const mapObj: any = {};
    islandDominance.forEach((v, k) => {
      mapObj[k] = v;
    });
    broadcast({ type: 'islands_dominance_update', dominance: mapObj });
  }

  let globalShopOverrides: Record<string, any> = {};
  let globalCustomFruits: any[] = [];

  function broadcastAdminShop() {
    broadcast({
      type: 'admin_shop_sync',
      overrides: globalShopOverrides,
      customFruits: globalCustomFruits,
    });
  }

  wss.on('connection', (ws) => {
    let playerId = `player_${Math.random().toString(36).substring(2, 9)}`;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'join') {
          // Remove any previous entry tied to this exact socket so re-joining never leaves a ghost ball
          for (const [existingId, existingPlayer] of players.entries()) {
            if (existingPlayer.socket === ws && existingId !== data.player?.id) {
              players.delete(existingId);
            }
          }

          playerId = data.player?.id || playerId;
          const char = data.player?.character;
          players.set(playerId, {
            id: playerId,
            name: char?.name || data.player?.name || 'Pirata',
            x: typeof data.player?.x === 'number' ? data.player.x : 600,
            y: typeof data.player?.y === 'number' ? data.player.y : 950,
            level: data.player?.level || 1,
            faction: char?.faction || data.player?.faction || 'Pirates',
            race: char?.race || data.player?.race || 'Human',
            clanTag: data.player?.clanTag,
            hp: data.player?.hp || 100,
            maxHp: data.player?.maxHp || 100,
            facingAngle: data.player?.facingAngle || 0,
            busoActive: !!data.player?.busoActive,
            kenActive: !!data.player?.kenActive,
            hakiColorId: data.player?.hakiColorId || 'haki_amethyst_purple',
            character: char,
            activeWeaponType: data.player?.activeWeaponType || 'melee',
            activeSwordId: data.player?.activeSwordId || null,
            activeFruitId: data.player?.activeFruitId || null,
            buddhaActive: !!data.player?.buddhaActive,
            gear5Active: !!data.player?.gear5Active,
            isAttacking: !!data.player?.isAttacking,
            islandId: data.player?.islandId || 'island_1',
            lastSeen: Date.now(),
            socket: ws,
          });

          broadcastPlayerList();
          broadcastClans();
          broadcastIslands();
          ws.send(JSON.stringify({
            type: 'admin_shop_sync',
            overrides: globalShopOverrides,
            customFruits: globalCustomFruits,
          }));
        } else if (data.type === 'update_profile') {
          const p = players.get(playerId);
          if (p) {
            if (data.character) {
              p.character = data.character;
              p.name = data.character.name || p.name;
              p.faction = data.character.faction || p.faction;
              p.race = data.character.race || p.race;
            }
            if (typeof data.name === 'string') p.name = data.name;
            if (typeof data.level === 'number') p.level = data.level;
            if (typeof data.busoActive === 'boolean') p.busoActive = data.busoActive;
            if (typeof data.kenActive === 'boolean') p.kenActive = data.kenActive;
            if (typeof data.hakiColorId === 'string') p.hakiColorId = data.hakiColorId;
            if (typeof data.activeWeaponType === 'string') p.activeWeaponType = data.activeWeaponType;
            if (data.activeSwordId !== undefined) p.activeSwordId = data.activeSwordId;
            if (data.activeFruitId !== undefined) p.activeFruitId = data.activeFruitId;
            if (typeof data.buddhaActive === 'boolean') p.buddhaActive = data.buddhaActive;
            if (typeof data.gear5Active === 'boolean') p.gear5Active = data.gear5Active;
            if (typeof data.islandId === 'string') p.islandId = data.islandId;
            if (data.clanTag !== undefined) p.clanTag = data.clanTag;
            p.lastSeen = Date.now();
            playersDirty = true;
          }
        } else if (data.type === 'admin_update_shop') {
          globalShopOverrides = data.overrides || {};
          globalCustomFruits = data.customFruits || [];
          broadcastAdminShop();
        } else if (data.type === 'move') {
          const p = players.get(playerId);
          if (p) {
            p.x = data.x;
            p.y = data.y;
            if (typeof data.vx === 'number') p.vx = data.vx;
            if (typeof data.vy === 'number') p.vy = data.vy;
            p.facingAngle = data.facingAngle;
            p.hp = data.hp;
            p.maxHp = data.maxHp;
            p.level = data.level;
            p.busoActive = !!data.busoActive;
            if (typeof data.kenActive === 'boolean') p.kenActive = data.kenActive;
            if (typeof data.hakiColorId === 'string') p.hakiColorId = data.hakiColorId;
            if (data.character) {
              p.character = data.character;
              p.name = data.character.name || p.name;
              p.faction = data.character.faction || p.faction;
              p.race = data.character.race || p.race;
            }
            if (typeof data.activeWeaponType === 'string') p.activeWeaponType = data.activeWeaponType;
            if (data.activeSwordId !== undefined) p.activeSwordId = data.activeSwordId;
            if (data.activeFruitId !== undefined) p.activeFruitId = data.activeFruitId;
            if (typeof data.buddhaActive === 'boolean') p.buddhaActive = data.buddhaActive;
            if (typeof data.gear5Active === 'boolean') p.gear5Active = data.gear5Active;
            if (typeof data.isAttacking === 'boolean') p.isAttacking = data.isAttacking;
            if (typeof data.islandId === 'string') p.islandId = data.islandId;
            p.clanTag = data.clanTag;
            p.lastSeen = Date.now();
            playersDirty = true;
          }
        } else if (data.type === 'duel_challenge') {
          if (data.targetId === playerId) return;
          const target = players.get(data.targetId);
          if (target && target.socket.readyState === WebSocket.OPEN) {
            target.socket.send(JSON.stringify({
              type: 'duel_challenged',
              challengerId: playerId,
              challengerName: data.challengerName,
            }));
          }
        } else if (data.type === 'duel_accept') {
          const challenger = players.get(data.challengerId);
          const acceptor = players.get(playerId);
          if (challenger && acceptor && challenger.id !== acceptor.id) {
            const duelId = `duel_${Date.now()}`;
            const duelData = {
              type: 'duel_started',
              duelId,
              player1: challenger.id,
              player2: acceptor.id,
            };
            challenger.socket.send(JSON.stringify(duelData));
            acceptor.socket.send(JSON.stringify(duelData));
          }
        } else if (data.type === 'duel_hit') {
          const target = players.get(data.targetId);
          if (target && target.socket.readyState === WebSocket.OPEN) {
            target.socket.send(JSON.stringify({
              type: 'duel_damage',
              damage: data.damage,
              attackerId: playerId,
            }));
          }
        } else if (data.type === 'trade_request') {
          if (data.targetId === playerId) return; // Prevent trading with self
          const target = players.get(data.targetId);
          if (target && target.socket.readyState === WebSocket.OPEN && target.socket !== ws) {
            target.socket.send(JSON.stringify({
              type: 'trade_requested',
              fromId: playerId,
              fromName: data.fromName,
            }));
          }
        } else if (data.type === 'trade_accept') {
          const sender = players.get(data.targetId);
          const receiver = players.get(playerId);
          if (sender && receiver && sender.id !== receiver.id) {
            const tradeId = `trade_${Date.now()}`;
            sender.socket.send(JSON.stringify({
              type: 'trade_started',
              tradeId,
              partnerId: receiver.id,
              partnerName: receiver.name,
            }));
            receiver.socket.send(JSON.stringify({
              type: 'trade_started',
              tradeId,
              partnerId: sender.id,
              partnerName: sender.name,
            }));
          }
        } else if (data.type === 'trade_update_offer') {
          const partner = players.get(data.partnerId);
          if (partner && partner.socket.readyState === WebSocket.OPEN) {
            partner.socket.send(JSON.stringify({
              type: 'trade_partner_updated',
              fruit: data.fruit,
              locked: data.locked,
              confirmed: data.confirmed,
              ownedFruitIds: data.ownedFruitIds || [],
            }));
          }
        } else if (data.type === 'trade_confirm') {
          const partner = players.get(data.partnerId);
          if (partner && partner.socket.readyState === WebSocket.OPEN) {
            partner.socket.send(JSON.stringify({
              type: 'trade_completed',
              receivedFruit: data.myFruit,
            }));
            ws.send(JSON.stringify({
              type: 'trade_completed',
              receivedFruit: data.partnerFruit,
            }));
            broadcast({
              type: 'chat_announcement',
              message: `🔄 Troca de Fruta concluída com sucesso entre ${players.get(playerId)?.name} e ${partner.name}!`,
            });
          }
        } else if (data.type === 'trade_cancel') {
          const partner = players.get(data.partnerId);
          if (partner && partner.socket.readyState === WebSocket.OPEN) {
            partner.socket.send(JSON.stringify({
              type: 'trade_cancelled',
            }));
          }
        } else if (data.type === 'create_clan') {
          const { name, tag } = data;
          const clanId = `clan_${Date.now()}`;
          const newClan = {
            id: clanId,
            name,
            tag: tag.toUpperCase(),
            leaderId: playerId,
            leaderName: data.playerName,
            members: [{ id: playerId, name: data.playerName, level: data.playerLevel, role: 'Leader' }],
            totalXp: 1000,
            level: 1,
            treasuryBeli: 10000,
          };
          clans.set(clanId, newClan);
          broadcastClans();
          ws.send(JSON.stringify({ type: 'clan_created', clan: newClan }));
        } else if (data.type === 'join_clan') {
          const { clanId, playerName, playerLevel } = data;
          const clan = clans.get(clanId);
          if (clan) {
            if (!clan.members.some((m) => m.id === playerId)) {
              clan.members.push({ id: playerId, name: playerName, level: playerLevel, role: 'Member' });
              clan.totalXp += 500;
              broadcastClans();
              ws.send(JSON.stringify({ type: 'clan_joined', clan }));
            }
          }
        } else if (data.type === 'war_island') {
          const { islandId, clanId, clanName, clanTag } = data;
          islandDominance.set(islandId, { clanId, clanName, clanTag });
          const clan = clans.get(clanId);
          if (clan) {
            clan.controlledIslandId = islandId;
            clan.totalXp += 5000;
            if (clan.totalXp >= clan.level * 10000) {
              clan.level += 1;
            }
          }
          broadcastIslands();
          broadcastClans();
          broadcast({ type: 'chat_announcement', message: `⚔️ O clã [${clanTag}] ${clanName} conquistou o domínio da ilha!` });
        } else if (data.type === 'chat') {
          broadcast({
            type: 'chat_message',
            sender: data.sender,
            clanTag: data.clanTag,
            message: data.message,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      players.delete(playerId);
      // Also delete any remaining entries matching this socket
      for (const [id, p] of players.entries()) {
        if (p.socket === ws) {
          players.delete(id);
        }
      }
      broadcastPlayerList();
    });
  });

  // Optimized ~11Hz (90ms) delta-driven broadcast loop for busy multiplayer servers
  const interval = setInterval(() => {
    if (playersDirty && players.size > 0) {
      broadcastPlayerList();
    }
  }, 90);

  return () => {
    clearInterval(interval);
  };
}

