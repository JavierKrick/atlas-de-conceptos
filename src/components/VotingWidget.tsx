import React, { useState, useEffect } from 'react';
import { Github, Info, Vote as VoteIcon, User, Star, StarOff } from 'lucide-react';

interface VotingWidgetProps {
  conceptId: string;
  tagName: string;
}

// Simulated active memory DB for votes in our browser session
interface DbVote {
  concept_id: string;
  tag_id: string;
  user_id: string;
  username: string;
  tier_value: 1 | 2 | 3;
}

export const VotingWidget: React.FC<VotingWidgetProps> = ({ conceptId, tagName }) => {
  // Session authentication state simulator
  const [user, setUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [votesList, setVotesList] = useState<DbVote[]>([]);
  const [myVote, setMyVote] = useState<1 | 2 | 3 | null>(null);

  // Initialize simulated votes list to avoid blank states
  useEffect(() => {
    const defaultVotes: DbVote[] = [
      { concept_id: conceptId, tag_id: tagName, user_id: 'usr1', username: 'lucia_phys', tier_value: 1 },
      { concept_id: conceptId, tag_id: tagName, user_id: 'usr2', username: 'roberto_sc', tier_value: 2 },
      { concept_id: conceptId, tag_id: tagName, user_id: 'usr3', username: 'sophia_l', tier_value: 1 },
      { concept_id: conceptId, tag_id: tagName, user_id: 'usr4', username: 'marcos_d', tier_value: 2 }
    ];

    // Seed some concept-specific variance 
    // All concepts start with clean default votes now
    
    // Try loading from localStorage to survive reloads
    const key = `votes-${conceptId}-${tagName}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setVotesList(JSON.parse(saved));
    } else {
      setVotesList(defaultVotes);
      localStorage.setItem(key, JSON.stringify(defaultVotes));
    }

    // Check if user is logged in simulated
    const savedUser = localStorage.getItem('simulated-github-user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
    }
  }, [conceptId, tagName]);

  // Sync user vote whenever votesList or user state updates
  useEffect(() => {
    if (user) {
      const existing = votesList.find(v => v.user_id === user.id);
      if (existing) {
        setMyVote(existing.tier_value);
      } else {
        setMyVote(null);
      }
    } else {
      setMyVote(null);
    }
  }, [votesList, user]);

  const handleMockLogin = (username: string) => {
    const formattedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || 'invitado_atlantis';
    const mockUser = {
      id: `usr-live-${Date.now()}`,
      name: formattedUsername,
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${formattedUsername}`
    };
    setUser(mockUser);
    localStorage.setItem('simulated-github-user', JSON.stringify(mockUser));
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('simulated-github-user');
  };

  const castVote = (tier: 1 | 2 | 3) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    let updatedList = [...votesList];
    const index = updatedList.findIndex(v => v.user_id === user.id);

    if (index !== -1) {
      // Update existing vote
      updatedList[index].tier_value = tier;
    } else {
      // Add new vote
      updatedList.push({
        concept_id: conceptId,
        tag_id: tagName,
        user_id: user.id,
        username: user.name,
        tier_value: tier
      });
    }

    setVotesList(updatedList);
    localStorage.setItem(`votes-${conceptId}-${tagName}`, JSON.stringify(updatedList));
  };

  const removeVote = () => {
    if (!user) return;
    const updatedList = votesList.filter(v => v.user_id !== user.id);
    setVotesList(updatedList);
    localStorage.setItem(`votes-${conceptId}-${tagName}`, JSON.stringify(updatedList));
    setMyVote(null);
  };

  // Mathematically calculate the Median (Mediana) of Tiers
  const calculateMedian = (votes: DbVote[]): number => {
    if (votes.length === 0) return 0;
    const values = votes.map(v => v.tier_value).sort((a, b) => a - b);
    const half = Math.floor(values.length / 2);
    if (values.length % 2 !== 0) {
      return values[half];
    }
    return (values[half - 1] + values[half]) / 2;
  };

  const currentMedian = calculateMedian(votesList);

  const getTierLabel = (tier: number) => {
    if (tier === 1) return "Tier 1: Fundamental / Central";
    if (tier === 2) return "Tier 2: Derivado / Secundario";
    if (tier === 3) return "Tier 3: Periférico / Avanzado";
    return "N/A";
  };

  return (
    <div className="bg-stone-50 border-3 border-stone-900 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(28,25,23,1)]" id="voting-system-container">
      {/* Header section with real-time median */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-stone-900 pb-5 mb-5">
        <div>
          <span className="font-mono text-xs font-bold text-stone-500 uppercase tracking-wider">MICRO-BACKEND INTEGRADO</span>
          <h3 className="font-sans font-black text-xl text-stone-900 flex items-center gap-2">
            <VoteIcon className="w-5 h-5 text-indigo-600" />
            Nivel de Centralidad (Tiers)
          </h3>
          <p className="text-stone-600 text-xs mt-1">
            Vota qué tan fundamental es este concepto para la disciplina <strong className="text-stone-900 font-mono">"{tagName}"</strong>.
          </p>
        </div>

        {/* Realtime Median Badge */}
        <div className="flex items-center gap-3 bg-indigo-50 border-2 border-stone-900 p-3 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)]">
          <div className="text-right">
            <span className="block font-mono text-[10px] uppercase font-bold text-stone-500">Mediana Real-Time</span>
            <span className="block font-mono text-xs font-black text-stone-850">
              {getTierLabel(Math.round(currentMedian))}
            </span>
          </div>
          <div className="bg-indigo-600 text-stone-50 w-11 h-11 flex items-center justify-center border border-stone-900">
            <span className="font-mono text-2xl font-black">{currentMedian ? currentMedian.toFixed(1) : '-'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tier Selecting Grid */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <h4 className="font-mono text-xs uppercase font-bold text-stone-700 mb-3">Emitir tu voto de relevancia:</h4>
            
            <div className="space-y-3">
              {[1, 2, 3].map((tierNum) => {
                const isSelected = myVote === tierNum;
                const count = votesList.filter(v => v.tier_value === tierNum).count || votesList.filter(v => v.tier_value === tierNum).length;
                let description = "";
                let colorClass = "";
                
                if (tierNum === 1) {
                  description = "Pilar esencial de la materia. Imprescindible para entender todo lo demás.";
                  colorClass = "hover:border-red-500 border-stone-900";
                } else if (tierNum === 2) {
                  description = "Concepto de alcance intermedio. Profundiza la comprensión básica.";
                  colorClass = "hover:border-amber-500 border-stone-900";
                } else {
                  description = "Tópico especializado. Avanzado, específico u opcional.";
                  colorClass = "hover:border-blue-500 border-stone-900";
                }

                return (
                  <button
                    key={tierNum}
                    onClick={() => castVote(tierNum as 1 | 2 | 3)}
                    className={`w-full text-left p-3 border-2 transition-all duration-150 rounded-none flex items-start gap-3 ${
                      isSelected 
                        ? 'bg-stone-900 text-stone-100 border-stone-900 shadow-[2px_2px_0px_0px_rgba(79,70,229,1)]' 
                        : 'bg-stone-50 text-stone-900 hover:bg-stone-100'
                    } ${colorClass}`}
                  >
                    <div className={`w-6 h-6 border flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-stone-100 border-indigo-400' : 'bg-stone-200 border-stone-900 text-stone-900'
                    }`}>
                      {tierNum}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-sans font-bold text-sm block">Tier {tierNum}</span>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                          isSelected ? 'bg-stone-850 text-indigo-300 border-stone-700' : 'bg-stone-150 border-stone-300 text-stone-500'
                        }`}>
                          {count} {count === 1 ? 'voto' : 'votos'}
                        </span>
                      </div>
                      <p className={`text-xs leading-normal ${isSelected ? 'text-stone-300' : 'text-stone-600'}`}>
                        {description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected User details or Authenticate prompt */}
          <div className="mt-5 pt-4 border-t border-dashed border-stone-300 flex items-center justify-between gap-4">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="leading-none">
                    <span className="block text-stone-500 text-[10px] font-mono uppercase">Votando como</span>
                    <span className="font-mono text-xs font-bold text-stone-900">@{user.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {myVote && (
                    <button 
                      onClick={removeVote}
                      className="text-stone-500 hover:text-red-500 font-mono text-[11px] underline"
                    >
                      Remover Voto
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="border border-stone-900 hover:bg-stone-100 bg-stone-50 px-2.5 py-1 text-xs font-mono font-bold"
                  >
                    Salir
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3 p-3 bg-amber-50 border border-stone-300">
                <span className="text-xs text-stone-700 flex items-center gap-1.5 font-sans font-medium">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  Regístrate con GitHub para emitir tu voto y colaborar en el algoritmo.
                </span>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-black text-stone-50 border border-stone-900 py-1.5 px-3 font-mono font-bold text-xs uppercase hover:bg-stone-850 flex items-center justify-center gap-1.5 shrink-0 shadow-[2px_2px_0px_0px_rgba(245,158,11,1)]"
                >
                  <Github className="w-3.5 h-3.5" />
                  Ingresar con GitHub
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Supabase Technical Integration Details block */}
        <div className="lg:col-span-5 bg-stone-150 border-2 border-dashed border-stone-400 p-4 font-mono text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-stone-800 font-black mb-2 pb-1 border-b border-stone-300">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
              <span>ESTATUS TECH: SUPABASE CONTROLS</span>
            </div>
            
            <p className="text-stone-600 text-[11px] leading-relaxed mb-4">
              En producción con Astro, este componente ejecuta llamadas directas a Supabase usando OAuth en GitHub:
            </p>

            <div className="bg-stone-900 text-stone-200 p-3 rounded-none overflow-x-auto text-[10px] space-y-3 leading-normal border border-stone-900">
              <div>
                <span className="text-stone-400 block">// Iniciar sesión con GitHub OAuth</span>
                <span className="text-amber-400">const</span> {'{ data, error } ='} <span className="text-indigo-400">await</span> supabase.auth.<span className="text-sky-300">signInWithOAuth</span>({'{'}
                <br />
                &nbsp;&nbsp;provider: <span className="text-emerald-400">'github'</span>
                <br />
                {'}'});
              </div>

              <div>
                <span className="text-stone-400 block">// Hacer un UPSERT de voto (Inserta o reemplaza)</span>
                <span className="text-amber-400">const</span> {'{ data, error } ='} <span className="text-indigo-400">await</span> supabase
                <br />
                &nbsp;&nbsp;.<span className="text-sky-300">from</span>(<span className="text-emerald-400">'concept_votes'</span>)
                <br />
                &nbsp;&nbsp;.<span className="text-sky-300">upsert</span>({'{'}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;concept_id: conceptId,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;tag_id: tagName,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;user_id: user.id,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;tier_value: selectedTier
                <br />
                &nbsp;&nbsp;{'}'}, {'{'} onConflict: <span className="text-emerald-400">'concept_id,tag_id,user_id'</span> {'}'});
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-300 text-stone-500 text-[10px] leading-tight">
            💡 Las normas RLS aseguran que <code>auth.uid() = user_id</code> se valide en el servidor de PostgreSQL para evitar la inyección de votos.
          </div>
        </div>
      </div>

      {/* Mock login dialog box */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-stone-50 border-3 border-stone-900 p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(28,25,23,1)]">
            <div className="flex justify-between items-start mb-4">
              <h5 className="font-sans font-black text-lg text-stone-900 uppercase">Simular Acceso con GitHub</h5>
              <button 
                onClick={() => setShowLoginModal(false)}
                className="font-mono text-xs font-bold bg-stone-200 hover:bg-stone-300 px-1.5 py-0.5 border border-stone-900"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-stone-600 mb-4 leading-normal">
              Esta ventana simula la redirección segura OAuth de GitHub para validar tu perfil en Supabase.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem('username') as HTMLInputElement);
              handleMockLogin(input.value);
            }}>
              <div className="mb-4">
                <label className="block font-mono text-[10px] uppercase font-bold text-stone-700 mb-1.5">Tu Usuario de GitHub:</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-500 font-mono text-sm font-medium">@</span>
                  <input 
                    name="username"
                    type="text" 
                    placeholder="alberto_einstein"
                    required
                    className="w-full pl-7 pr-3 py-2 border-2 border-stone-900 rounded-none bg-stone-50 text-stone-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-800 py-2 border border-stone-900 font-mono text-xs font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black text-stone-50 hover:bg-stone-850 py-2 border border-stone-900 font-mono text-xs font-bold uppercase rounded-none shadow-[2px_2px_0px_0px_rgba(79,70,229,1)]"
                >
                  Autorizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
