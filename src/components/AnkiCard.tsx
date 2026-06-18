import React, { useState } from 'react';
import { AnkiCard as AnkiCardType } from '../types';
import { RotateCw, CheckCircle, HelpCircle, Heart, Edit2, Check, X, Trash2 } from 'lucide-react';

interface AnkiCardProps {
  card: AnkiCardType;
  index: number;
  user: { id: string; name: string; avatar: string } | null;
  onLike: () => void;
  onProposeChange: (front: string, back: string) => void;
  onAcceptProposal: () => void;
  onCancelProposal: () => void;
  onDeleteCard: () => void;
  onRequireAuth: () => void;
}

export const AnkiCard: React.FC<AnkiCardProps> = ({ 
  card, 
  index, 
  user,
  onLike,
  onProposeChange,
  onAcceptProposal,
  onCancelProposal,
  onDeleteCard,
  onRequireAuth
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [propFront, setPropFront] = useState(card.front);
  const [propBack, setPropBack] = useState(card.back);

  const hasLiked = user ? (card.likes || []).includes(user.name) : false;
  const likesCount = card.likes?.length || 0;

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }
    onLike();
  };

  const handleOpenEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }
    setPropFront(card.front);
    setPropBack(card.back);
    setShowEditForm(!showEditForm);
  };

  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (propFront.trim() && propBack.trim()) {
      onProposeChange(propFront.trim(), propBack.trim());
      setShowEditForm(false);
    }
  };

  return (
    <div className="space-y-2 font-sans" id={`anki-card-wrapper-${card.id || index}`}>
      {/* 3D Rotating Card Container */}
      <div 
        className="group w-full h-56 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ perspective: '1200px' }}
      >
        <div 
          className="relative w-full h-full transition-transform duration-500 ease-out"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front Side */}
          <div 
            className="absolute inset-0 bg-[#1e1e24] border-2 border-zinc-700 p-6 flex flex-col justify-between rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex justify-between items-center bg-[#25252b] border-b-2 border-zinc-700 px-3 py-1 -mx-6 -mt-6">
              <span className="font-mono text-[10px] font-bold tracking-wider text-zinc-300">
                ANKI DECK • TARJETA #{index + 1}
              </span>
              <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            </div>

            <div className="flex-1 flex items-center justify-center py-4">
              <p className="text-zinc-100 font-sans font-medium text-center text-sm md:text-base leading-relaxed">
                {card.front}
              </p>
            </div>

            <div className="flex justify-between items-center text-zinc-400 text-xs font-mono pt-2 border-t border-dashed border-zinc-700">
              <span className="text-[10px]">Haz clic para voltear</span>
              <div className="flex items-center gap-1 text-indigo-400 font-bold text-[10px]">
                <RotateCw className="w-3 h-3 animate-pulse" />
                <span>VER RESPUESTA</span>
              </div>
            </div>
          </div>

          {/* Back Side (Rotated) */}
          <div 
            className="absolute inset-0 bg-[#121215] border-2 border-zinc-700 p-6 flex flex-col justify-between rounded-none shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="flex justify-between items-center bg-[#18181c] border-b-2 border-zinc-850 px-3 py-1 -mx-6 -mt-6">
              <span className="font-mono text-[10px] font-bold tracking-wider text-amber-400">
                RESPUESTA DE MEMORIZACIÓN
              </span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <div className="flex-1 flex items-center justify-center py-4">
              <p className="text-zinc-150 font-serif italic text-center text-sm md:text-base leading-relaxed">
                {card.back}
              </p>
            </div>

            <div className="flex justify-between items-center text-zinc-400 text-xs font-mono pt-2 border-t border-zinc-800">
              <span className="text-[10px]">¿Lo memorizaste bien?</span>
              <span className="text-amber-400 font-bold flex items-center gap-1 text-[10px]">
                <RotateCw className="w-3 h-3" />
                RE-VOLTEAR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar beneath the card */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-805 p-2 font-mono text-[10px] gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={handleLikeClick}
            className={`flex items-center gap-1.5 px-2.5 py-1 transition-all cursor-pointer border ${
              hasLiked 
                ? 'bg-[#2d1424] border-pink-900 text-pink-400 font-extrabold shadow-sm' 
                : 'bg-zinc-850 border-zinc-750 text-zinc-400 hover:text-pink-400 hover:bg-zinc-800'
            }`}
            title="Me gusta"
          >
            <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
            <span>Me gusta</span>
          </button>

          <button
            onClick={handleOpenEdit}
            className={`flex items-center gap-1 px-2.5 py-1 cursor-pointer border ${
              showEditForm
                ? 'bg-indigo-950 border-indigo-800 text-indigo-300'
                : 'bg-zinc-850 border-zinc-750 text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800'
            }`}
            title="Sugerir una modificación a esta tarjeta"
          >
            <Edit2 className="w-3 h-3" />
            <span>Modificar</span>
          </button>
        </div>

        {user && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteCard();
            }}
            className="text-zinc-550 hover:text-rose-450 p-1 hover:bg-zinc-850 border border-transparent hover:border-zinc-800 shrink-0 cursor-pointer"
            title="Eliminar tarjeta"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Modify Proposal Form */}
      {showEditForm && (
        <form 
          onSubmit={handleSubmitProposal} 
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border border-zinc-750 p-3.5 space-y-2.5 shadow-md animate-fade-in text-xs"
        >
          <div className="bg-zinc-850 border-l-2 border-indigo-505 p-2 text-zinc-400 font-mono text-[9px] uppercase tracking-wide">
            Sugerir cambio para esta tarjeta
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-zinc-400 mb-1">Pregunta (Frente):</label>
            <textarea
              required
              rows={2}
              value={propFront}
              onChange={(e) => setPropFront(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-zinc-700 p-2 text-xs font-mono text-zinc-150 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-zinc-400 mb-1">Respuesta (Dorso):</label>
            <textarea
              required
              rows={2}
              value={propBack}
              onChange={(e) => setPropBack(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-zinc-700 p-2 text-xs font-mono text-zinc-150 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 text-[10px]">
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 px-2.5 py-1 font-bold text-zinc-400 uppercase cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-700 px-2.5 py-1 font-bold text-white uppercase cursor-pointer"
            >
              Proponer Cambio
            </button>
          </div>
        </form>
      )}

      {/* active Proposals display */}
      {card.proposedChange && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="bg-[#241a0c] border border-amber-800/40 p-2.5 text-[10px] text-amber-200 font-mono space-y-1.5 leading-normal"
        >
          <div className="flex items-center justify-between border-b border-amber-900/30 pb-1">
            <span>📋 CAMBIO RECOMENDADO POR @{card.proposedChange.proposedBy}</span>
          </div>
          <div>
            <span className="text-zinc-450 block text-[9px] uppercase font-bold">Frente:</span>
            <p className="text-zinc-200 bg-[#0e0a05] p-1 font-sans">{card.proposedChange.proposedFront}</p>
          </div>
          <div>
            <span className="text-zinc-450 block text-[9px] uppercase font-bold">Respuesta:</span>
            <p className="text-zinc-200 bg-[#0e0a05] p-1 font-sans">{card.proposedChange.proposedBack}</p>
          </div>

          <div className="flex flex-wrap justify-end gap-1.5 pt-1">
            {user?.name === card.proposedChange.proposedBy ? (
              <button
                type="button"
                onClick={onCancelProposal}
                className="bg-rose-955/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 px-2.5 py-1 text-[9px] font-bold uppercase cursor-pointer"
              >
                Cancelar mi modificación
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPropFront(card.proposedChange!.proposedFront);
                    setPropBack(card.proposedChange!.proposedBack);
                    setShowEditForm(true);
                  }}
                  className="bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 px-2.5 py-1 text-[9px] font-bold uppercase cursor-pointer"
                  title="Ajustar y proponer una modificación sobre la modificación de este par"
                >
                  Propuesta sobre Propuesta
                </button>
                <button
                  type="button"
                  onClick={onCancelProposal}
                  className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 px-2.5 py-1 text-[9px] font-bold uppercase cursor-pointer"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={onAcceptProposal}
                  className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-750 text-zinc-950 px-2.5 py-1 text-[9px] font-black uppercase cursor-pointer"
                >
                  Aceptar y Publicar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
