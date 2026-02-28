import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card as CardType, Suit, GameState, GameStatus } from './types';
import { createDeck, shuffle, getSuitSymbol, getSuitColor, SUITS } from './utils';
import { Trophy, RotateCcw, Info, ChevronUp, ChevronDown } from 'lucide-react';

const CARD_WIDTH = 80;
const CARD_HEIGHT = 120;

interface CardProps {
  card: CardType;
  isFaceUp: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  index?: number;
  total?: number;
  key?: React.Key;
}

const Card = ({ card, isFaceUp, onClick, isPlayable, index, total }: CardProps) => {
  const rotation = total && index !== undefined ? (index - (total - 1) / 2) * 5 : 0;
  const xOffset = total && index !== undefined ? (index - (total - 1) / 2) * 20 : 0;

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0, y: 100 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: 0,
        rotate: rotation,
        x: xOffset,
        zIndex: index
      }}
      whileHover={isPlayable ? { y: -20, scale: 1.05, transition: { duration: 0.2 } } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`relative ${CARD_WIDTH}px h-[${CARD_HEIGHT}px] w-20 h-32 rounded-lg border-2 ${
        isPlayable ? 'border-yellow-400 cursor-pointer shadow-lg shadow-yellow-400/20' : 'border-slate-300'
      } bg-white flex flex-col items-center justify-center select-none card-shadow overflow-hidden transition-shadow`}
      style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }}
    >
      {isFaceUp ? (
        <div className={`w-full h-full p-2 flex flex-col justify-between ${getSuitColor(card.suit)}`}>
          <div className="flex flex-col items-start leading-none">
            <span className="text-lg font-bold">{card.rank}</span>
            <span className="text-sm">{getSuitSymbol(card.suit)}</span>
          </div>
          <div className="text-4xl self-center">{getSuitSymbol(card.suit)}</div>
          <div className="flex flex-col items-end leading-none rotate-180">
            <span className="text-lg font-bold">{card.rank}</span>
            <span className="text-sm">{getSuitSymbol(card.suit)}</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-blue-800 flex items-center justify-center p-1">
          <div className="w-full h-full border-2 border-blue-600 rounded-md flex items-center justify-center">
            <div className="w-4 h-4 bg-blue-700 rotate-45 opacity-50"></div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [state, setState] = useState<GameState>({
    deck: [],
    discardPile: [],
    playerHand: [],
    aiHand: [],
    currentSuit: null,
    turn: 'player',
    status: 'waiting',
    winner: null,
  });

  const [message, setMessage] = useState("欢迎来到疯狂 8 点！");

  const initGame = useCallback(() => {
    const fullDeck = shuffle(createDeck());
    const playerHand = fullDeck.splice(0, 8);
    const aiHand = fullDeck.splice(0, 8);
    
    // Find a non-8 card for the start of discard pile
    let firstCardIndex = fullDeck.findIndex(c => c.rank !== '8');
    if (firstCardIndex === -1) firstCardIndex = 0;
    const discardPile = fullDeck.splice(firstCardIndex, 1);
    
    setState({
      deck: fullDeck,
      discardPile,
      playerHand,
      aiHand,
      currentSuit: discardPile[0].suit,
      turn: 'player',
      status: 'playing',
      winner: null,
    });
    setMessage("轮到你了！匹配花色或点数。");
  }, []);

  const isPlayable = (card: CardType) => {
    if (state.status !== 'playing' || state.turn !== 'player') return false;
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (card.rank === '8') return true;
    return card.suit === state.currentSuit || card.rank === topCard.rank;
  };

  const playCard = (card: CardType, isPlayer: boolean) => {
    const newHand = (isPlayer ? state.playerHand : state.aiHand).filter(c => c.id !== card.id);
    const newDiscardPile = [...state.discardPile, card];
    
    const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };

    if (card.rank === '8') {
      if (isPlayer) {
        setState(prev => ({
          ...prev,
          discardPile: newDiscardPile,
          playerHand: newHand,
          status: 'choosing_suit',
        }));
        setMessage("请选择一个新的花色！");
      } else {
        // AI chooses suit (most common in hand)
        const suitCounts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
        newHand.forEach(c => suitCounts[c.suit]++);
        const bestSuit = (Object.keys(suitCounts) as Suit[]).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b);
        
        setState(prev => ({
          ...prev,
          discardPile: newDiscardPile,
          aiHand: newHand,
          currentSuit: bestSuit,
          turn: 'player',
        }));
        setMessage(`AI 出了 8 并选择了 ${suitNames[bestSuit]}！轮到你了。`);
      }
    } else {
      const winner = newHand.length === 0 ? (isPlayer ? 'player' : 'ai') : null;
      setState(prev => ({
        ...prev,
        discardPile: newDiscardPile,
        [isPlayer ? 'playerHand' : 'aiHand']: newHand,
        currentSuit: card.suit,
        turn: isPlayer ? 'ai' : 'player',
        status: winner ? 'game_over' : 'playing',
        winner,
      }));
      
      if (!winner) {
        setMessage(isPlayer ? "AI 正在思考..." : "轮到你了！");
      }
    }
  };

  const drawCard = (isPlayer: boolean) => {
    if (state.deck.length === 0) {
      // If deck is empty, skip turn
      setMessage(`${isPlayer ? '你' : 'AI'} 跳过了回合（牌堆已空）。`);
      setState(prev => ({ ...prev, turn: isPlayer ? 'ai' : 'player' }));
      return;
    }

    const newDeck = [...state.deck];
    const drawnCard = newDeck.pop()!;
    const newHand = [...(isPlayer ? state.playerHand : state.aiHand), drawnCard];

    setState(prev => ({
      ...prev,
      deck: newDeck,
      [isPlayer ? 'playerHand' : 'aiHand']: newHand,
      turn: isPlayer ? 'ai' : 'player',
    }));
    
    setMessage(`${isPlayer ? '你' : 'AI'} 摸了一张牌。`);
  };

  // AI Logic
  useEffect(() => {
    if (state.status === 'playing' && state.turn === 'ai' && !state.winner) {
      const timer = setTimeout(() => {
        const topCard = state.discardPile[state.discardPile.length - 1];
        const playableCards = state.aiHand.filter(c => 
          c.rank === '8' || c.suit === state.currentSuit || c.rank === topCard.rank
        );

        if (playableCards.length > 0) {
          // AI strategy: play non-8 cards first, then 8s
          const nonEight = playableCards.find(c => c.rank !== '8');
          playCard(nonEight || playableCards[0], false);
        } else {
          drawCard(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.turn, state.status, state.winner]);

  const handleSuitChoice = (suit: Suit) => {
    const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
    setState(prev => ({
      ...prev,
      currentSuit: suit,
      status: 'playing',
      turn: 'ai',
    }));
    setMessage(`你选择了 ${suitNames[suit]}。AI 正在思考...`);
  };

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const suitNames: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-between p-4 felt-texture relative overflow-hidden">
      {/* AI Hand */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-white/50 text-sm uppercase tracking-widest font-bold">
          <ChevronDown size={16} /> AI 手牌 ({state.aiHand.length})
        </div>
        <div className="flex justify-center -space-x-12 h-32">
          {state.aiHand.map((card, i) => (
            <Card key={card.id} card={card} isFaceUp={false} index={i} total={state.aiHand.length} />
          ))}
        </div>
      </div>

      {/* Center Table */}
      <div className="flex-1 w-full flex items-center justify-center gap-12">
        {/* Draw Pile */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative cursor-pointer" onClick={() => state.turn === 'player' && state.status === 'playing' && drawCard(true)}>
            {state.deck.length > 0 ? (
              <>
                <div className="absolute top-1 left-1 w-20 h-32 bg-blue-900 rounded-lg border-2 border-blue-700 translate-x-1 translate-y-1"></div>
                <Card card={state.deck[0]} isFaceUp={false} />
              </>
            ) : (
              <div className="w-20 h-32 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-white/20">
                已空
              </div>
            )}
          </div>
          <span className="text-white/40 text-xs font-mono">牌堆 ({state.deck.length})</span>
        </div>

        {/* Discard Pile */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {state.discardPile.length > 0 ? (
              <AnimatePresence mode="popLayout">
                <Card 
                  key={topDiscard.id} 
                  card={topDiscard} 
                  isFaceUp={true} 
                />
              </AnimatePresence>
            ) : (
              <div className="w-20 h-32 rounded-lg border-2 border-dashed border-white/20" />
            )}
            {state.currentSuit && topDiscard?.rank === '8' && (
              <div className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-400 animate-bounce">
                <span className={`text-xl ${getSuitColor(state.currentSuit)}`}>
                  {getSuitSymbol(state.currentSuit)}
                </span>
              </div>
            )}
          </div>
          <span className="text-white/40 text-xs font-mono uppercase">
            {state.currentSuit ? `当前花色: ${suitNames[state.currentSuit]}` : '弃牌堆'}
          </span>
        </div>
      </div>

      {/* Player Hand */}
      <div className="w-full flex flex-col items-center gap-4 pb-8">
        <div className="flex items-center gap-2 text-white/50 text-sm uppercase tracking-widest font-bold">
          <ChevronUp size={16} /> 你的手牌 ({state.playerHand.length})
        </div>
        <div className="flex justify-center -space-x-12 h-32">
          {state.playerHand.map((card, i) => (
            <Card 
              key={card.id} 
              card={card} 
              isFaceUp={true} 
              isPlayable={isPlayable(card)}
              onClick={() => playCard(card, true)}
              index={i}
              total={state.playerHand.length}
            />
          ))}
        </div>
      </div>

      {/* Message Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center pointer-events-none">
        <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-white font-medium shadow-xl pointer-events-auto">
          {message}
        </div>
        <button 
          onClick={initGame}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/10 text-white transition-all shadow-xl pointer-events-auto"
          title="重新开始"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {state.status === 'waiting' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center">
              <h1 className="text-4xl font-display font-bold text-slate-900">疯狂 8 点</h1>
              <p className="text-slate-600">匹配花色或点数。8是万能牌！最先清空手牌的人获胜。</p>
              <button 
                onClick={initGame}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg shadow-emerald-900/20"
              >
                开始游戏
              </button>
            </div>
          </motion.div>
        )}

        {state.status === 'choosing_suit' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6">
              <h2 className="text-2xl font-bold text-slate-900">选择花色</h2>
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleSuitChoice(suit)}
                    className={`w-24 h-24 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 flex flex-col items-center justify-center gap-1 transition-all ${getSuitColor(suit)}`}
                  >
                    <span className="text-4xl">{getSuitSymbol(suit)}</span>
                    <span className="text-xs font-bold uppercase">{suitNames[suit]}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {state.status === 'game_over' && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${state.winner === 'player' ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-600'}`}>
                <Trophy size={40} />
              </div>
              <h2 className="text-4xl font-display font-bold text-slate-900">
                {state.winner === 'player' ? '你赢了！' : 'AI 赢了！'}
              </h2>
              <p className="text-slate-600">
                {state.winner === 'player' ? '太棒了！你清空了所有手牌。' : '下次好运！AI 的速度更快。'}
              </p>
              <button 
                onClick={initGame}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg"
              >
                再玩一次
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Button */}
      <div className="absolute top-4 right-4">
        <button className="text-white/30 hover:text-white/60 transition-colors">
          <Info size={24} />
        </button>
      </div>
    </div>
  );
}
