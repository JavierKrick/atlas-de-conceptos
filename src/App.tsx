import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_CONCEPTS } from './data';
import { AnkiCard } from './components/AnkiCard';
import { CodeExporter } from './components/CodeExporter';
import { CsvImporter } from './components/CsvImporter';
import { Concept, Quote, CommentHeap, MemberBio, Reply } from './types';
import { INITIAL_QUOTES, INITIAL_COMMENTS, INITIAL_MEMBER_BIOS } from './communityData';
import { 
  Plus, 
  Minus, 
  BookOpen, 
  ChevronRight, 
  Github, 
  ExternalLink, 
  Code,
  Sparkles,
  Info,
  Layers,
  Search,
  Check,
  X,
  Copy,
  PlusCircle,
  HelpCircle,
  Terminal,
  Trash2,
  MessageSquare,
  Users,
  Edit,
  RefreshCw,
  UserPlus
} from 'lucide-react';

interface GitHubUser {
  id: string;
  name: string;
  avatar: string;
  isDev?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'mvp' | 'frases' | 'comentarios' | 'integrantes' | 'technical' | 'export'>('mvp');
  
  // Real-time reactive list of quotes with localStorage caching
  const [quotesList, setQuotesList] = useState<Quote[]>(() => {
    const saved = localStorage.getItem('user-atlas-quotes');
    return saved ? JSON.parse(saved) : INITIAL_QUOTES;
  });

  // Real-time reactive stack of comments with localStorage caching
  const [commentsList, setCommentsList] = useState<CommentHeap[]>(() => {
    const saved = localStorage.getItem('user-atlas-comments');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_COMMENTS; }
    }
    return INITIAL_COMMENTS;
  });

  // Real-time reactive list of member bios with localStorage caching
  const [biosList, setBiosList] = useState<MemberBio[]>(() => {
    const saved = localStorage.getItem('user-atlas-member-bios');
    return saved ? JSON.parse(saved) : INITIAL_MEMBER_BIOS;
  });

  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [showWelcomePopups, setShowWelcomePopups] = useState(true);
  const [welcomeStep, setWelcomeStep] = useState<number>(1);

  // Security master verification states
  const [authPassword, setAuthPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isCheckingGithub, setIsCheckingGithub] = useState(false);

  // Forms states
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');

  // Validation error states
  const [commentError, setCommentError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [editCommentError, setEditCommentError] = useState<string | null>(null);
  const [editReplyError, setEditReplyError] = useState<string | null>(null);

  // Cooperative card states
  const [addingAnkiForConceptId, setAddingAnkiForConceptId] = useState<string | null>(null);
  const [newAnkiFront, setNewAnkiFront] = useState('');
  const [newAnkiBack, setNewAnkiBack] = useState('');

  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [newReplyText, setNewReplyText] = useState('');

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null); // formatted as "commentId-replyId"
  const [editingReplyText, setEditingReplyText] = useState('');

  const [temporaryDesc, setTemporaryDesc] = useState<Record<string, string>>({});

  // Confirmation modal states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<(() => void) | null>(null);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [confirmModalRequiredText, setConfirmModalRequiredText] = useState('eliminar');
  const [confirmModalHideHint, setConfirmModalHideHint] = useState(false);

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    requiredText: string = 'eliminar',
    hideHint: boolean = false
  ) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setConfirmModalAction(() => onConfirm);
    setConfirmInputText('');
    setConfirmModalRequiredText(requiredText);
    setConfirmModalHideHint(hideHint);
    setConfirmModalOpen(true);
  };

  const [showAddBioModal, setShowAddBioModal] = useState(false);
  const [bioFormName, setBioFormName] = useState('');
  const [bioFormStudy, setBioFormStudy] = useState('');
  const [bioFormLikes, setBioFormLikes] = useState('');
  const [bioFormText, setBioFormText] = useState('');

  // Real-time reactive list of concepts with user additions loaded from localStorage
  const [conceptsList, setConceptsList] = useState<Concept[]>(() => {
    const saved = localStorage.getItem('user-atlas-concepts');
    let rawConcepts = INITIAL_CONCEPTS;
    if (saved) {
      try {
        rawConcepts = JSON.parse(saved);
      } catch (e) {
        rawConcepts = INITIAL_CONCEPTS;
      }
    }
    // Deeply inspect and verify that EVERY card has a unique, stable 'id' string!
    return rawConcepts.map(c => {
      const ankiWithIds = (c.anki || []).map((card, idx) => {
        if (!card.id) {
          return {
            ...card,
            id: `card-${c.id}-${idx}`,
            likes: card.likes || []
          };
        }
        return {
          ...card,
          likes: card.likes || []
        };
      });
      return {
        ...c,
        anki: ankiWithIds
      };
    });
  });

  // Unique tags/disciplines dynamically computed from conceptsList plus custom created tags
  const [customTags, setCustomTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom-atlas-tags');
    return saved ? JSON.parse(saved) : [];
  });

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    
    // Add default concepts’ tags
    conceptsList.forEach(concept => {
      concept.tags.forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed) tagsSet.add(trimmed);
      });
    });

    // Add manually created empty/custom tags
    customTags.forEach(tag => {
      const trimmed = tag.trim();
      if (trimmed) tagsSet.add(trimmed);
    });

    return Array.from(tagsSet).sort();
  }, [conceptsList, customTags]);

  // Set default selected tag safely
  const [selectedTag, setSelectedTag] = useState<string>(() => {
    return allTags[0] || 'General';
  });
  
  // Keep live, interactive tiers in state so upvoting/downvoting updates instantly in real-time
  const [conceptTiers, setConceptTiers] = useState<Record<string, 1 | 2 | 3>>(() => {
    const savedVoted = localStorage.getItem('user-atlas-tiers');
    if (savedVoted) {
      try {
        return JSON.parse(savedVoted);
      } catch (e) {
        // Handled below
      }
    }
    // Return empty record, meaning no personal votes yet! Only new creations or explicit votes will populate it!
    return {};
  });

  // Track simulated Github User for authorization flow
  const [user, setUser] = useState<GitHubUser | null>(() => {
    const saved = localStorage.getItem('simulated-github-user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTempUsername, setAuthTempUsername] = useState('');

  // Active selected concept inside the tag to view details
  const [expandedConceptId, setExpandedConceptId] = useState<string | null>(null);

  // Search filter across the active tag list or overall
  const [searchQuery, setSearchQuery] = useState('');

  // Form states to add custom Disciplina (Tag)
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [showAddDisciplineFeedback, setShowAddDisciplineFeedback] = useState(false);

  // Form states to add custom Concept inside active selected Tag
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInitialTier, setNewInitialTier] = useState<1 | 2 | 3>(1); // Requirement: Must select a tier
  const [newContent, setNewContent] = useState('');
  
  // Optional Anki cards state in the creator form
  const [ankiQ1, setAnkiQ1] = useState('');
  const [ankiA1, setAnkiA1] = useState('');

  // Copy to clipboard indicator inside individual concepts
  const [copiedConceptId, setCopiedConceptId] = useState<string | null>(null);

  // Dictionary keeping track of new tag inputs per concept
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

  // Suggestion modifications per concept
  const [proposalDescInputs, setProposalDescInputs] = useState<Record<string, string>>({});
  const [proposalContentInputs, setProposalContentInputs] = useState<Record<string, string>>({});
  const [adjustingConcepts, setAdjustingConcepts] = useState<Record<string, boolean>>({});

  // Filter concepts belonging to the current selected tag, compute Public/Personal Tiers, apply forced 10% ranges, and sort by relevance and averages
  // Filter concepts belonging to the current selected tag, compute Public/Personal Tiers, apply forced 10% ranges, and sort by relevance and averages
  const computedConceptsInTag = useMemo(() => {
    // 1. Get raw concepts matching of tag
    const baseList = conceptsList.filter(concept => {
      const belongsToTag = concept.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase());
      return belongsToTag;
    });

    // 2. Fetch votes and calculate raw average and median for each
    const listWithStats = baseList.map(concept => {
      // Load votes
      const key = `votes-${concept.id}-${selectedTag}`;
      const saved = localStorage.getItem(key);
      let votesList: any[] = [];
      if (saved) {
        try {
          votesList = JSON.parse(saved);
        } catch (e) {}
      } else {
        // Default preloaded votes to avoid blank states
        votesList = [
          { concept_id: concept.id, tag_id: selectedTag, user_id: 'usr1', username: 'lucia_phys', tier_value: 1 },
          { concept_id: concept.id, tag_id: selectedTag, user_id: 'usr2', username: 'roberto_sc', tier_value: 2 },
          { concept_id: concept.id, tag_id: selectedTag, user_id: 'usr3', username: 'sophia_l', tier_value: 1 },
          { concept_id: concept.id, tag_id: selectedTag, user_id: 'usr4', username: 'marcos_d', tier_value: 2 }
        ];
      }

      // Sync the logged-in user's vote dynamically from conceptTiers (personal vote)
      const userVote = conceptTiers[concept.id];
      if (user) {
        const idx = votesList.findIndex(v => v.username === user.name || v.user_id === user.id);
        if (userVote !== undefined) {
          if (idx >= 0) {
            votesList[idx].tier_value = userVote;
          } else {
            votesList.push({
              concept_id: concept.id,
              tag_id: selectedTag,
              user_id: user.id || 'curr_user',
              username: user.name,
              tier_value: userVote
            });
          }
        } else {
          // If user hasn't voted of this concept, ensure they don't have a vote in votesList
          if (idx >= 0) {
            votesList.splice(idx, 1);
          }
        }
      }

      // Average score (closer to 1.0 is more central/important)
      const sum = votesList.reduce((acc, v) => acc + v.tier_value, 0);
      const avg = votesList.length > 0 ? sum / votesList.length : concept.defaultTier || 2;

      // Median score
      const sortedValues = votesList.map(v => v.tier_value).sort((a, b) => a - b);
      let median = 2;
      if (sortedValues.length > 0) {
        const half = Math.floor(sortedValues.length / 2);
        if (sortedValues.length % 2 !== 0) {
          median = sortedValues[half];
        } else {
          // Rule requirement: In case of technical tie in the median (even number of elements),
          // default to the lower tier of importance (which corresponds to the larger numerical value, e.g., Tier 2 instead of Tier 1, Tier 3 instead of Tier 2)
          // unless overridden by the 10% rules.
          median = Math.max(sortedValues[half - 1], sortedValues[half]);
        }
      } else {
        median = concept.defaultTier || 2;
      }

      return {
        concept,
        avg,
        median,
        votesCount: votesList.length
      };
    });

    // 3. Sort by raw Average score (ascending) to identify top 10% and bottom 10%
    const sortedByAvg = [...listWithStats].sort((a, b) => a.avg - b.avg);
    const N = sortedByAvg.length;
    
    // Calculate limit size (10%, minimum 1 concept if N > 0)
    const limit10 = N > 0 ? Math.max(1, Math.round(N * 0.1)) : 0;

    const top10Ids = new Set(N > 0 ? sortedByAvg.slice(0, limit10).map(item => item.concept.id) : []);
    
    // Bottom indices must not overlap with top indices if N is small
    const bottom10IdxStart = N > 0 ? Math.max(limit10, N - limit10) : 0;
    const bottom10Ids = new Set(N > 0 ? sortedByAvg.slice(bottom10IdxStart).map(item => item.concept.id) : []);

    // 4. Overwrite Public Tier with 10% rules
    const listWithTiers = listWithStats.map(item => {
      let publicTier = item.median;
      let forceReason = '';
      if (top10Ids.has(item.concept.id)) {
        publicTier = 1;
        forceReason = 'Top 10% Relevancia (Forzado Tier 1)';
      } else if (bottom10Ids.has(item.concept.id)) {
        publicTier = 3;
        forceReason = 'Peor 10% Puntuado (Forzado Tier 3)';
      }

      // Personal tier: user's choice in conceptTiers (can be undefined/empty)
      const personalTier = conceptTiers[item.concept.id];

      return {
        ...item,
        publicTier,
        personalTier,
        forceReason
      };
    });

    // 5. Apply Search query filter
    const filteredList = listWithTiers.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.concept.title.toLowerCase().includes(q) ||
        item.concept.description.toLowerCase().includes(q)
      );
    });

    // 6. Sort according to requirements:
    // - Primary: Public Tier (ascending, Tier 1 is highest priority so it comes first: 1 -> 2 -> 3)
    // - Secondary: If a concept has < 3 votes, it goes to the bottom of that tier group
    // - Tertiary: averageScore (ascending, closer to 1.0 comes first)
    // - Quaternary: Alphabetical by title
    filteredList.sort((a, b) => {
      if (a.publicTier !== b.publicTier) {
        return a.publicTier - b.publicTier;
      }
      const aHas3 = a.votesCount >= 3;
      const bHas3 = b.votesCount >= 3;
      if (aHas3 !== bHas3) {
        return aHas3 ? -1 : 1;
      }
      if (a.avg !== b.avg) {
        return a.avg - b.avg;
      }
      const aHasDesc = !!a.concept.description && a.concept.description.trim() !== "";
      const bHasDesc = !!b.concept.description && b.concept.description.trim() !== "";
      if (aHasDesc !== bHasDesc) {
        return aHasDesc ? -1 : 1;
      }
      return a.concept.title.localeCompare(b.concept.title);
    });

    return filteredList;
  }, [conceptsList, selectedTag, searchQuery, conceptTiers]);

  // Export functions to trigger browser download
  const downloadMarkdownCompendio = () => {
    let md = `# COMPENDIO ACADÉMICO COOPERATIVO DE CONCEPTOS\n`;
    md += `Generado el: ${new Date().toLocaleString('es-ES')}\n\n`;
    md += `Este compendio contiene todas las disciplinas académicas registradas, sus subtemas fundamentales y las descripciones revisadas por colaboradores del espacio.\n\n`;
    md += `========================================================================\n\n`;

    allTags.forEach(tag => {
      md += `\n# DISCIPLINA: #${tag.toUpperCase()}\n`;
      md += `========================================================================\n`;
      
      const tagConcepts = conceptsList.filter(c => c.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
      
      const sortedForExport = [...tagConcepts].map(c => {
        const key = `votes-${c.id}-${tag}`;
        const saved = localStorage.getItem(key);
        let votesList = [];
        if (saved) {
          try { votesList = JSON.parse(saved); } catch (e) {}
        }
        const sum = votesList.reduce((acc, v) => acc + v.tier_value, 0);
        const avg = votesList.length > 0 ? sum / votesList.length : c.defaultTier || 2;
        return { concept: c, avg };
      }).sort((a, b) => a.avg - b.avg);

      sortedForExport.forEach(({ concept, avg }) => {
        md += `\n## ${concept.title.toUpperCase()}\n`;
        md += `- **Descripción de Síntesis**: ${concept.description || 'Sin descripción'}\n`;
        md += `- **Relevancia del Consenso (Promedio de Tiers)**: Promedio ${avg.toFixed(2)}\n`;
        md += `- **Categorías Asociadas**: ${concept.tags.join(', ')}\n\n`;
        md += `### MARCO CONCEPTUAL ESTUDIADO:\n`;
        md += `${concept.content}\n`;
        
        if (concept.anki && concept.anki.length > 0) {
          md += `\n### TARJETAS DE AUTOEVALUACIÓN RECONOCIDAS (ANKI DECK):\n`;
          concept.anki.forEach((card, idx) => {
            md += `  Tarjeta #${idx + 1}:\n`;
            md += `    - Pregunta (Anverso): ${card.front}\n`;
            md += `    - Respuesta (Reverso): ${card.back}\n`;
          });
        }
        md += `\n------------------------------------------------------------------------\n`;
      });
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Compendio-Atlas-Espacio.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAnkiJSON = () => {
    const dataToExport = conceptsList.map(c => ({
      conceptId: c.id,
      conceptTitle: c.title,
      categories: c.tags,
      deck: (c.anki || []).map((card, idx) => ({
        id: card.id || `card-${c.id}-${idx}`,
        front: card.front,
        back: card.back,
        likesCount: card.likes?.length || 0
      }))
    }));

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Atlas-Deck-Autoevaluaciones.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openMarkdownInNewWindow = () => {
    let md = `# COMPENDIO ACADÉMICO COOPERATIVO DE CONCEPTOS\n`;
    md += `Generado el: ${new Date().toLocaleString('es-ES')}\n\n`;
    md += `Este compendio contiene todas las disciplinas académicas registradas, sus subtemas fundamentales y las descripciones revisadas por colaboradores del espacio.\n\n`;
    md += `========================================================================\n\n`;

    allTags.forEach(tag => {
      md += `\n# DISCIPLINA: #${tag.toUpperCase()}\n`;
      md += `========================================================================\n`;
      
      const tagConcepts = conceptsList.filter(c => c.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
      
      const sortedForExport = [...tagConcepts].map(c => {
        const key = `votes-${c.id}-${tag}`;
        const saved = localStorage.getItem(key);
        let votesList = [];
        if (saved) {
          try { votesList = JSON.parse(saved); } catch (e) {}
        }
        const sum = votesList.reduce((acc, v) => acc + v.tier_value, 0);
        const avg = votesList.length > 0 ? sum / votesList.length : c.defaultTier || 2;
        return { concept: c, avg };
      }).sort((a, b) => a.avg - b.avg);

      sortedForExport.forEach(({ concept, avg }) => {
        md += `\n## ${concept.title.toUpperCase()}\n`;
        md += `- **Descripción de Síntesis**: ${concept.description || 'Sin descripción'}\n`;
        md += `- **Relevancia del Consenso**: Tier ${concept.defaultTier || 2}\n`;
        md += `- **Categorías Asociadas**: ${concept.tags.join(', ')}\n\n`;
        md += `### MARCO CONCEPTUAL ESTUDIADO:\n`;
        md += `${concept.content}\n`;
        
        if (concept.anki && concept.anki.length > 0) {
          md += `\n### TARJETAS RECONOCIDAS (ANKI DECK):\n`;
          concept.anki.forEach((card, idx) => {
            md += `  Tarjeta #${idx + 1}:\n`;
            md += `    - Pregunta (Anverso): ${card.front}\n`;
            md += `    - Respuesta (Reverso): ${card.back}\n`;
          });
        }
        md += `\n------------------------------------------------------------------------\n`;
      });
    });

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write("<!DOCTYPE html><html><head><title>Compendio Atlas de Conceptos</title><meta charset='utf-8'><style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; } h1 { font-size: 2.22rem; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 30px; } pre { background-color: #0f172a; color: #f8fafc; padding: 20px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 14px; white-space: pre-wrap; word-wrap: break-word; } .btn-group { display: flex; gap: 10px; margin-bottom: 30px; } button { background-color: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; } button:hover { background-color: #4338ca; }</style></head><body><div class='btn-group'><button onclick='window.print()'>🖨️ Imprimir / Guardar como PDF</button><button id='dlBtn'>📥 Descargar Archivo Markdown (.md)</button></div><h1>Compendio Completo de Disciplinas</h1><p>Se ha generado el documento completo. Puedes usar el botón de arriba para archivarlo o imprimirlo localmente.</p><pre id='content-block'></pre></body></html>");
      newWindow.document.close();
      const preBlock = newWindow.document.getElementById('content-block');
      if (preBlock) {
        preBlock.textContent = md;
      }
      const dlBtn = newWindow.document.getElementById('dlBtn');
      if (dlBtn) {
        dlBtn.onclick = () => {
          const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = newWindow.document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'Compendio-Atlas-Espacio.md');
          newWindow.document.body.appendChild(link);
          link.click();
          newWindow.document.body.removeChild(link);
        };
      }
    }
  };

  const openAnkiJSONInNewWindow = () => {
    const dataToExport = conceptsList.map(c => ({
      conceptId: c.id,
      conceptTitle: c.title,
      categories: c.tags,
      deck: (c.anki || []).map((card, idx) => ({
        id: card.id || `card-${c.id}-${idx}`,
        front: card.front,
        back: card.back,
        likesCount: card.likes?.length || 0
      }))
    }));

    const jsonText = JSON.stringify(dataToExport, null, 2);

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write("<!DOCTYPE html><html><head><title>Copias de Tarjetas Anki (JSON Backup)</title><meta charset='utf-8'><style>body { font-family: monospace; color: #f8fafc; background-color: #0c0c0e; padding: 40px; line-height: 1.4; } .header-info { background-color: #161619; border: 1px solid #27272a; padding: 20px; margin-bottom: 25px; font-family: sans-serif; } button { background-color: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; } button:hover { background-color: #059669; } pre { margin: 0; background-color: #09090b; padding: 20px; border: 1px solid #18181b; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }</style></head><body><div class='header-info'><h2 style='margin-top: 0; color: #10b981;'>Respaldo de Tarjetas de Autoevaluación Anki</h2><p style='color: #a1a1aa; font-size: 13px;'>Este archivo en formato JSON estructurado contiene los cuestionarios y tarjetas generados colaborativamente para cada disciplina académica.</p><button id='dlBtn'>📥 Descargar Respaldo JSON (.json)</button></div><pre id='jsonPre'></pre></body></html>");
      newWindow.document.close();
      const preBlock = newWindow.document.getElementById('jsonPre');
      if (preBlock) {
        preBlock.textContent = jsonText;
      }
      const dlBtn = newWindow.document.getElementById('dlBtn');
      if (dlBtn) {
        dlBtn.onclick = () => {
          const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = newWindow.document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'Atlas-Deck-Autoevaluaciones.json');
          newWindow.document.body.appendChild(link);
          link.click();
          newWindow.document.body.removeChild(link);
        };
      }
    }
  };

  // Adjust/Vote Tier level directly (T1, T2, T3 or null to clear)
  const handleVoteTierDirect = (conceptId: string, tierValue: 1 | 2 | 3 | null) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const updatedTiers = { ...conceptTiers };
    if (tierValue === null) {
      delete updatedTiers[conceptId];
    } else {
      updatedTiers[conceptId] = tierValue;
    }
    setConceptTiers(updatedTiers);
    localStorage.setItem('user-atlas-tiers', JSON.stringify(updatedTiers));

    // Also persist the votesList for this concept in localStorage under its votes-${conceptId}-${selectedTag} key
    // so that it matches exactly and gets calculated in consensus immediately!
    const key = `votes-${conceptId}-${selectedTag}`;
    const saved = localStorage.getItem(key);
    let votesList: any[] = [];
    if (saved) {
      try {
        votesList = JSON.parse(saved);
      } catch (e) {}
    } else {
      // Find the template concept to get its defaultTier
      const templateConcept = conceptsList.find(c => c.id === conceptId);
      const defaultT = templateConcept ? templateConcept.defaultTier : 2;

      // populate with defaults first so we don't wipe out prepopulated consensus
      votesList = [
        { concept_id: conceptId, tag_id: selectedTag, user_id: 'usr1', username: 'lucia_phys', tier_value: 1 },
        { concept_id: conceptId, tag_id: selectedTag, user_id: 'usr2', username: 'roberto_sc', tier_value: 2 },
        { concept_id: conceptId, tag_id: selectedTag, user_id: 'usr3', username: 'sophia_l', tier_value: 1 },
        { concept_id: conceptId, tag_id: selectedTag, user_id: 'usr4', username: 'marcos_d', tier_value: 2 }
      ];
    }

    const idx = votesList.findIndex(v => v.username === user.name || v.user_id === user.id);
    if (tierValue !== null) {
      if (idx >= 0) {
        votesList[idx].tier_value = tierValue;
      } else {
        votesList.push({
          concept_id: conceptId,
          tag_id: selectedTag,
          user_id: user.id || 'curr_user',
          username: user.name,
          tier_value: tierValue
        });
      }
    } else {
      if (idx >= 0) {
        votesList.splice(idx, 1);
      }
    }
    localStorage.setItem(key, JSON.stringify(votesList));
  };

  const handleAddTagToConcept = (conceptId: string, customTagToAdd: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const cleanTag = customTagToAdd.trim();
    if (!cleanTag) return;

    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        const alreadyHas = c.tags.some(t => t.toLowerCase() === cleanTag.toLowerCase());
        if (alreadyHas) return c;
        return {
          ...c,
          tags: [...c.tags, cleanTag]
        };
      }
      return c;
    });

    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
    setNewTagInputs(prev => ({ ...prev, [conceptId]: '' }));
  };

  const handleAddDescriptionDirect = (conceptId: string, descriptionText: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const txt = descriptionText.trim();
    if (!txt) return;

    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          description: txt
        };
      }
      return c;
    });

    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleProposeConceptChanges = (conceptId: string, proposedDescription: string, proposedContent: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const desc = proposedDescription.trim();
    const content = proposedContent.trim();
    if (!desc && !content) return;

    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          proposedChange: {
            proposedDescription: desc || undefined,
            proposedContent: content || undefined,
            proposedBy: user.name,
            createdAt: new Date().toISOString()
          }
        };
      }
      return c;
    });

    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleDeleteConcept = (conceptId: string) => {
    if (!user || !user.isDev) return;
    const updated = conceptsList.filter(c => c.id !== conceptId);
    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleCancelProposal = (conceptId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          proposedChange: undefined
        };
      }
      return c;
    });

    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleAcceptProposal = (conceptId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const targetConcept = conceptsList.find(c => c.id === conceptId);
    if (!targetConcept || !targetConcept.proposedChange) return;

    if (targetConcept.proposedChange.proposedBy === user.name) {
      alert("No puedes aprobar tu propia propuesta. Debe ser revisada y aprobada por otro colaborador académico.");
      return;
    }

    const updated = conceptsList.map(c => {
      if (c.id === conceptId && c.proposedChange) {
        const nextConcept = { ...c };
        if (c.proposedChange.proposedDescription !== undefined) {
          nextConcept.description = c.proposedChange.proposedDescription;
        }
        if (c.proposedChange.proposedContent !== undefined) {
          nextConcept.content = c.proposedChange.proposedContent;
        }
        nextConcept.proposedChange = undefined;
        return nextConcept;
      }
      return c;
    });

    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  // -----------------------------------------------------
  // COLLABORATIVE ANKI CARD HANDLERS
  // -----------------------------------------------------
  const handleLikeAnkiCard = (conceptId: string, cardId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          anki: (c.anki || []).map((card, idx) => {
            const tempId = card.id || String(idx);
            if (tempId === cardId || card.id === cardId) {
              const currentLikes = card.likes || [];
              const alreadyLiked = currentLikes.includes(user.name);
              const nextLikes = alreadyLiked
                ? currentLikes.filter(u => u !== user.name)
                : [...currentLikes, user.name];
              return { ...card, likes: nextLikes };
            }
            return card;
          })
        };
      }
      return c;
    });
    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleProposeAnkiCardChange = (conceptId: string, cardId: string, front: string, back: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          anki: (c.anki || []).map((card, idx) => {
            const tempId = card.id || String(idx);
            if (tempId === cardId || card.id === cardId) {
              return {
                ...card,
                proposedChange: {
                  proposedFront: front,
                  proposedBack: back,
                  proposedBy: user.name,
                  createdAt: new Date().toISOString()
                }
              };
            }
            return card;
          })
        };
      }
      return c;
    });
    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleAcceptAnkiCardProposal = (conceptId: string, cardId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const targetConcept = conceptsList.find(c => c.id === conceptId);
    if (!targetConcept) return;
    const targetCard = (targetConcept.anki || []).find((card, idx) => {
      const tempId = card.id || String(idx);
      return tempId === cardId || card.id === cardId;
    });
    if (!targetCard || !targetCard.proposedChange) return;

    if (targetCard.proposedChange.proposedBy === user.name) {
      alert("No puedes aprobar tu propia propuesta de tarjeta. Debe ser revisada por otro colaborador académico.");
      return;
    }

    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          anki: (c.anki || []).map((card, idx) => {
            const tempId = card.id || String(idx);
            if ((tempId === cardId || card.id === cardId) && card.proposedChange) {
              return {
                ...card,
                front: card.proposedChange.proposedFront,
                back: card.proposedChange.proposedBack,
                proposedChange: undefined
              };
            }
            return card;
          })
        };
      }
      return c;
    });
    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleCancelAnkiCardProposal = (conceptId: string, cardId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          anki: (c.anki || []).map((card, idx) => {
            const tempId = card.id || String(idx);
            if (tempId === cardId || card.id === cardId) {
              return {
                ...card,
                proposedChange: undefined
              };
            }
            return card;
          })
        };
      }
      return c;
    });
    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleDeleteAnkiCard = (conceptId: string, cardId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        return {
          ...c,
          anki: (c.anki || []).filter((card, idx) => {
            const tempId = card.id || String(idx);
            return tempId !== cardId && card.id !== cardId;
          })
        };
      }
      return c;
    });
    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const handleAddAnkiCard = (conceptId: string, front: string, back: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const updated = conceptsList.map(c => {
      if (c.id === conceptId) {
        const newCard = {
          id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          front: front.trim(),
          back: back.trim(),
          likes: []
        };
        return {
          ...c,
          anki: [...(c.anki || []), newCard]
        };
      }
      return c;
    });
    setConceptsList(updated);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(updated));
  };

  const getTierDetails = (tier: number) => {
    switch (tier) {
      case 1:
        return { label: 'Tier 1: Central', color: 'bg-rose-50 text-rose-700 border-red-400' };
      case 2:
        return { label: 'Tier 2: Derivado', color: 'bg-amber-50 text-amber-700 border-amber-400' };
      case 3:
      default:
        return { label: 'Tier 3: Periférico', color: 'bg-emerald-50 text-emerald-800 border-emerald-400' };
    }
  };

  // Simple Levenshtein distance metric for key tolerance
  const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          tmp[i][j] = tmp[i - 1][j - 1];
        } else {
          tmp[i][j] = Math.min(
            tmp[i - 1][j] + 1, // deletion
            tmp[i][j - 1] + 1, // insertion
            tmp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }
    return tmp[a.length][b.length];
  };

  const validateAccessKey = (typed: string): { isValid: boolean; dist: number; bestMatch: string } => {
    const inputCleaned = typed.trim().toLowerCase();
    const inputStripped = inputCleaned.replace(/\s+/g, '');
    
    // Explicit exact options
    const targets = ["sapereaude", "sapere aude"];
    if (targets.includes(inputCleaned) || inputStripped === "sapereaude") {
      return { isValid: true, dist: 0, bestMatch: "Sapere Aude" };
    }

    // Levenshtein metric matching
    let minD = 999;
    let bMatch = "Sapere Aude";
    for (const target of targets) {
      const d = getLevenshteinDistance(inputCleaned, target);
      if (d < minD) {
        minD = d;
        bMatch = target;
      }
    }

    // Compare space-stripped as well
    const dStripped = getLevenshteinDistance(inputStripped, "sapereaude");
    if (dStripped < minD) {
      minD = dStripped;
      bMatch = "Sapere Aude";
    }

    return { isValid: minD <= 2, dist: minD, bestMatch: bMatch };
  };

  const handleSimulateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUsername = authTempUsername.trim();
    if (!rawUsername) return;

    // Validate corporate password
    const check = validateAccessKey(authPassword);
    if (!check.isValid) {
      setPasswordError("❌ Contraseña grupal incorrecta. Por favor, introducí la contraseña de acceso grupal válida.");
      return;
    }

    const isDevMode = rawUsername === 'modo_desarrollador_9999';
    setIsCheckingGithub(true);
    setPasswordError(null);

    try {
      let mock: GitHubUser;

      if (isDevMode) {
        mock = {
          id: 'usr-dev-9999',
          name: 'modo_desarrollador_9999',
          avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=developer_9999',
          isDev: true
        };
      } else {
        // Query GitHub API to ensure it is a real account
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(rawUsername)}`);
        
        if (res.status === 404) {
          setPasswordError("❌ El usuario de GitHub especificado no existe. Por favor, ingresá un usuario real y existente de GitHub.");
          setIsCheckingGithub(false);
          return;
        }

        if (!res.ok) {
          if (res.status === 403) {
            setPasswordError("⚠️ El límite de solicitudes a la API de GitHub se ha agotado temporalmente. Para permitir el acceso preventivo offline, verificá que tu usuario sea real.");
            // Under API rate limit, fallback to local generation is permitted for a real-looking username
            const formatted = rawUsername.replace(/[^a-zA-Z0-9_-]/g, '') || 'usuario_github';
            mock = {
              id: `usr-${Date.now()}`,
              name: rawUsername,
              avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${formatted}`,
              isDev: false
            };
          } else {
            throw new Error(`GitHub responded with ${res.status}`);
          }
        } else {
          const githubData = await res.json();
          const formatted = githubData.login || rawUsername;
          mock = {
            id: `usr-${githubData.id || Date.now()}`,
            name: githubData.name || formatted,
            avatar: githubData.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${formatted}`,
            isDev: false
          };
        }
      }

      // Login success
      localStorage.setItem('atlas-unlocked', 'true');
      setUser(mock);
      localStorage.setItem('simulated-github-user', JSON.stringify(mock));
      localStorage.setItem('has-logged-in-previously', 'true');
      setShowAuthModal(false);
      setAuthTempUsername('');
      setAuthPassword('');
      setPasswordError(null);
      setShowWelcomePopups(true); // reset displaying welcome dialog
      setWelcomeStep(1);
    } catch (err) {
      setPasswordError("❌ Error de red al conectar con GitHub. Verificá tu conexión a internet e intentalo de nuevo.");
    } finally {
      setIsCheckingGithub(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('simulated-github-user');
  };

  // Caching synchronization helpers
  const saveQuotes = (updated: Quote[]) => {
    setQuotesList(updated);
    localStorage.setItem('user-atlas-quotes', JSON.stringify(updated));
  };

  const saveComments = (updated: CommentHeap[]) => {
    setCommentsList(updated);
    localStorage.setItem('user-atlas-comments', JSON.stringify(updated));
  };

  const saveBios = (updated: MemberBio[]) => {
    setBiosList(updated);
    localStorage.setItem('user-atlas-member-bios', JSON.stringify(updated));
  };

  // Rotate quotes index when user changes or quotes are added
  useEffect(() => {
    if (user) {
      const savedIndex = parseInt(localStorage.getItem('last-seen-quote-index') || '0', 10);
      const nextIndex = (savedIndex + 1) % quotesList.length;
      localStorage.setItem('last-seen-quote-index', nextIndex.toString());
      setActiveQuoteIndex(nextIndex);
    }
  }, [user, quotesList.length]);

  // Handler for adding Quotes
  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newQuoteText.trim() || !newQuoteAuthor.trim()) return;

    const fresh: Quote = {
      id: `quote-${Date.now()}`,
      text: newQuoteText.trim(),
      author: newQuoteAuthor.trim(),
      sharedBy: user.name,
      createdAt: new Date().toISOString()
    };

    const nextList = [fresh, ...quotesList];
    saveQuotes(nextList);

    setNewQuoteText('');
    setNewQuoteAuthor('');
    setShowAddQuoteModal(false);
  };

  // Handlers for Comments (Heap)
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const textTrimmed = newCommentText.trim();
    if (!textTrimmed) return;

    if (textTrimmed.length < 100) {
      const missing = 100 - textTrimmed.length;
      setCommentError(`Faltan ${missing} caracteres para poder publicar.`);
      return;
    }
    setCommentError(null);

    const fresh: CommentHeap = {
      id: `comment-${Date.now()}`,
      username: user.name,
      avatar: user.avatar,
      text: textTrimmed,
      createdAt: new Date().toISOString(),
      replies: []
    };

    const nextList = [fresh, ...commentsList];
    saveComments(nextList);
    setNewCommentText('');
  };

  const handleEditComment = (commentId: string, updatedText: string) => {
    if (!user) return;
    const textTrimmed = updatedText.trim();
    if (textTrimmed.length < 100) {
      const missing = 100 - textTrimmed.length;
      setEditCommentError(`Faltan ${missing} caracteres para poder editar.`);
      return;
    }
    setEditCommentError(null);
    const nextList = commentsList.map(c => {
      if (c.id === commentId && c.username === user.name) {
        return {
          ...c,
          text: textTrimmed,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });
    saveComments(nextList);
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (!user) return;
    const comment = commentsList.find(c => c.id === commentId);
    if (!comment) return;
    
    // Check permission: owner or developer
    if (comment.username !== user.name && !user.isDev) {
      return;
    }
    
    const nextList = commentsList.filter(c => c.id !== commentId);
    saveComments(nextList);
  };

  const handleAddReply = (commentId: string) => {
    if (!user) return;
    const textTrimmed = newReplyText.trim();
    if (!textTrimmed) return;

    if (textTrimmed.length < 100) {
      const missing = 100 - textTrimmed.length;
      setReplyError(`Faltan ${missing} caracteres para poder responder.`);
      return;
    }
    setReplyError(null);

    const freshReply: Reply = {
      id: `reply-${Date.now()}`,
      username: user.name,
      avatar: user.avatar,
      text: textTrimmed,
      createdAt: new Date().toISOString()
    };

    const nextList = commentsList.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...c.replies, freshReply]
        };
      }
      return c;
    });

    saveComments(nextList);
    setNewReplyText('');
    setReplyingToCommentId(null);
  };

  const handleEditReply = (commentId: string, replyId: string, updatedText: string) => {
    if (!user) return;
    const textTrimmed = updatedText.trim();
    if (textTrimmed.length < 100) {
      const missing = 100 - textTrimmed.length;
      setEditReplyError(`Faltan ${missing} caracteres para poder editar la respuesta.`);
      return;
    }
    setEditReplyError(null);
    const nextList = commentsList.map(c => {
      if (c.id === commentId) {
        const nextReplies = c.replies.map(r => {
          if (r.id === replyId && r.username === user.name) {
            return {
              ...r,
              text: textTrimmed,
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });
        return { ...c, replies: nextReplies };
      }
      return c;
    });
    saveComments(nextList);
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const handleDeleteReply = (commentId: string, replyId: string) => {
    if (!user) return;
    const comment = commentsList.find(c => c.id === commentId);
    if (!comment) return;
    const reply = comment.replies.find(r => r.id === replyId);
    if (!reply) return;
    
    if (reply.username !== user.name && !user.isDev) {
      return;
    }

    const nextList = commentsList.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: c.replies.filter(r => r.id !== replyId)
        };
      }
      return c;
    });
    saveComments(nextList);
  };

  // Handlers for Member Bios (Integrantes)
  const handleSaveBio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!bioFormName.trim() || !bioFormText.trim()) return;

    const fresh: MemberBio = {
      username: user.name,
      name: bioFormName.trim(),
      bio: bioFormText.trim()
    };

    const cleanList = biosList.filter(b => b.username !== user.name);
    const nextList = [...cleanList, fresh];
    saveBios(nextList);

    setBioFormName('');
    setBioFormStudy('');
    setBioFormLikes('');
    setBioFormText('');
    setShowAddBioModal(false);
  };

  const handleDeleteBio = (username: string) => {
    if (!user || user.name !== username) return;
    triggerConfirm(
      'Eliminar Presentación',
      '¿Estás seguro de que deseas eliminar tu presentación?',
      () => {
        const nextList = biosList.filter(b => b.username !== username);
        saveBios(nextList);
      }
    );
  };

  // Handles adding a new Discipline (Tag)
  const handleAddDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    
    // REQUIREMENT: Must be logged in to execute changes
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const name = newDisciplineName.trim();
    if (!name) return;

    // Check if it already exists
    if (allTags.some(t => t.toLowerCase() === name.toLowerCase())) {
      setSelectedTag(name);
      setNewDisciplineName('');
      return;
    }

    const updatedCustom = [...customTags, name];
    setCustomTags(updatedCustom);
    localStorage.setItem('custom-atlas-tags', JSON.stringify(updatedCustom));
    setSelectedTag(name);
    setNewDisciplineName('');
    setShowAddDisciplineFeedback(true);
    setTimeout(() => setShowAddDisciplineFeedback(false), 3000);
  };

  const handleDeleteDiscipline = (tagToDelete: string) => {
    if (!user || !user.isDev) return;

    // Remove from customTags
    const nextCustom = customTags.filter(t => t.toLowerCase() !== tagToDelete.toLowerCase());
    setCustomTags(nextCustom);
    localStorage.setItem('custom-atlas-tags', JSON.stringify(nextCustom));

    // Remove tag from all concepts
    const nextConcepts = conceptsList.map(c => ({
      ...c,
      tags: c.tags.filter(t => t.toLowerCase() !== tagToDelete.toLowerCase())
    })).filter(c => c.tags.length > 0);

    setConceptsList(nextConcepts);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(nextConcepts));

    // Safely shift selected tag
    const remainingTags = allTags.filter(t => t.toLowerCase() !== tagToDelete.toLowerCase());
    if (selectedTag.toLowerCase() === tagToDelete.toLowerCase()) {
      setSelectedTag(remainingTags[0] || 'Física');
    }
    setExpandedConceptId(null);
  };

  // Handles adding a new concept dynamically to the browser session and localStorage
  const handleCreateConceptSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // REQUIREMENT: Must be logged in to execute
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!newTitle.trim()) return;

    // Sluggify title to get clean unique ID
    const generatedId = newTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newAnkiSet = [];
    if (ankiQ1.trim() && ankiA1.trim()) {
      newAnkiSet.push({ front: ankiQ1.trim(), back: ankiA1.trim() });
    }

    // Set fallback default content if empty
    const finalContent = newContent.trim() || `La investigación de campo de **${newTitle.trim()}** en el área de **${selectedTag}** fue agregada en tiempo real.`;

    const freshConcept: Concept = {
      id: generatedId || `custom-${Date.now()}`,
      title: newTitle.trim(),
      description: newDescription.trim() || 'Este concepto fue agregado colaborativamente sin descripción extendida.',
      tags: [selectedTag], // Prefilled inside selected tag
      anki: newAnkiSet,
      defaultTier: newInitialTier,
      content: finalContent
    };

    const nextList = [freshConcept, ...conceptsList];
    setConceptsList(nextList);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(nextList));

    // Register its initial tier level in real-time tiers
    const nextTiers = {
      ...conceptTiers,
      [freshConcept.id]: newInitialTier
    };
    setConceptTiers(nextTiers);
    localStorage.setItem('user-atlas-tiers', JSON.stringify(nextTiers));

    // Auto-expand the newly generated element
    setExpandedConceptId(freshConcept.id);

    // reset fields
    setNewTitle('');
    setNewDescription('');
    setNewContent('');
    setAnkiQ1('');
    setAnkiA1('');
    setShowAddModal(false);
  };

  // Generates real-world .md file contents with proper Frontmatter YAML
  const generateMarkdownString = (concept: Concept) => {
    const tier = conceptTiers[concept.id] || concept.defaultTier;
    const yamlAnki = concept.anki.map(a => `  - front: "${a.front.replace(/"/g, '\\"')}"\n    back: "${a.back.replace(/"/g, '\\"')}"`).join('\n');
    
    return `---
title: "${concept.title.replace(/"/g, '\\"')}"
description: "${concept.description.replace(/"/g, '\\"')}"
tags: ${JSON.stringify(concept.tags)}
defaultTier: ${tier}
anki:
${yamlAnki || '  - front: "¿Ejemplo?"\n    back: "Respuesta."'}
---

${concept.content}`;
  };

  const copyRawMDToClipboard = (concept: Concept) => {
    const text = generateMarkdownString(concept);
    navigator.clipboard.writeText(text);
    setCopiedConceptId(concept.id);
    setTimeout(() => setCopiedConceptId(null), 2500);
  };

  // Reset to default INITIAL_CONCEPTS
  const handleResetToDefault = () => {
    if (!user || !user.isDev) {
      alert('❌ Solo un desarrollador registrado en modo desarrollo puede purgar los datos.');
      return;
    }
    triggerConfirm(
      'Restablecer Base de Datos / Atlas Completo',
      '⚠️ ATENCIÓN: Esta acción restablecerá el Atlas completo y eliminará todas las disciplinas y conceptos cargados. Se perderán todos los datos creados en esta sesión.',
      () => {
        localStorage.removeItem('user-atlas-concepts');
        localStorage.removeItem('user-atlas-tiers');
        localStorage.removeItem('custom-atlas-tags');
        setConceptsList(INITIAL_CONCEPTS);
        setCustomTags([]);
        
        const initial: Record<string, 1 | 2 | 3> = {};
        INITIAL_CONCEPTS.forEach(c => {
          initial[c.id] = c.defaultTier as 1 | 2 | 3;
        });
        setConceptTiers(initial);
        if (INITIAL_CONCEPTS.length > 0) {
          setSelectedTag(INITIAL_CONCEPTS[0].tags[0]);
        } else {
          setSelectedTag('General');
        }
        setExpandedConceptId(null);
      },
      'Estoy dispuesto a purgar todos los datos.',
      true // Hide hint
    );
  };

  // Completely empty the database (Lienzo en Blanco / Vaciar de manera limpia)
  const handlePurgeAllDatabase = () => {
    if (!user || !user.isDev) {
      alert('❌ Solo un desarrollador registrado en modo desarrollo puede purgar los datos.');
      return;
    }
    triggerConfirm(
      'Vaciar Base de Datos / Atlas Completo',
      '⚠️ ATENCIÓN: Esta acción purgará de forma definitiva y permanente todos los conceptos, disciplinas, configuraciones, citas y comentarios guardados en el navegador local para comenzar con un lienzo en blanco (ideal para importar un nuevo archivo CSV desde cero).',
      () => {
        setConceptsList([]);
        localStorage.setItem('user-atlas-concepts', JSON.stringify([]));
        setCustomTags([]);
        localStorage.setItem('custom-atlas-tags', JSON.stringify([]));
        setQuotesList([]);
        localStorage.setItem('user-atlas-quotes', JSON.stringify([]));
        setCommentsList([]);
        localStorage.setItem('user-atlas-comments', JSON.stringify([]));
        setSelectedTag('General');
        setExpandedConceptId(null);
      },
      'Estoy dispuesto a purgar todos los datos y perder absolutamente toda la información de todos.',
      true
    );
  };

  // Developer Bypass Tool: Batch Add elements or trigger test scenarios
  const handleDeveloperAddMockData = () => {
    if (!user || !user.isDev) return;
    
    // Add multiple mock entries for demonstration in developer mode
    const timestamp = Date.now();
    const devConcept: Concept = {
      id: `dev-concept-${timestamp}`,
      title: `Concepto Dev ${timestamp}`,
      description: 'Generado automáticamente a través del bypass del modo desarrollador de forma ágil.',
      tags: [selectedTag],
      anki: [{ front: '¿Modo Desarrollador Activo?', back: 'Sí, bypass verificado correctamente.' }],
      defaultTier: 1,
      content: '## Análisis del Sandbox\nEsta es una simulación del sandbox para pruebas rápidas de rendering y análisis lógico.'
    };

    const nextList = [devConcept, ...conceptsList];
    setConceptsList(nextList);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(nextList));

    const nextTiers = {
      ...conceptTiers,
      [devConcept.id]: 1 as const
    };
    setConceptTiers(nextTiers);
    localStorage.setItem('user-atlas-tiers', JSON.stringify(nextTiers));
    setExpandedConceptId(devConcept.id);
  };

  // Simple text parser to format basic markdown natively with elegant academic typography
  const renderSimpleMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-3" />;
      
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={index} className="font-sans font-black text-sm text-zinc-100 mt-5 mb-2 uppercase tracking-wider">
            {trimmed.replace('###', '').trim()}
          </h4>
        );
      }
      
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={index} className="font-sans font-black text-base text-indigo-400 mt-6 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-1">
            {trimmed.replace('##', '').trim()}
          </h3>
        );
      }

      if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
        return (
          <div key={index} className="bg-[#0a0a0c] text-indigo-300 border border-zinc-850 px-4 py-3 my-4 font-mono text-[11px] leading-relaxed select-all overflow-x-auto rounded-none">
            {trimmed.replace(/\$\$/g, '')}
          </div>
        );
      }

      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        return (
          <li key={index} className="font-serif text-zinc-300 text-[14px] md:text-[15px] ml-5 list-disc mb-2 leading-relaxed">
            {parseInlineStyles(trimmed.substring(1).trim())}
          </li>
        );
      }

      return (
        <p key={index} className="font-serif text-zinc-300 text-[14px] md:text-[15px] leading-relaxed mb-4 antialiased">
          {parseInlineStyles(trimmed)}
        </p>
      );
    });
  };

  const parseInlineStyles = (raw: string) => {
    let parts: (string | React.ReactNode)[] = [raw];

    // Bold converter **text**
    let currentParts = [...parts];
    let nextParts: (string | React.ReactNode)[] = [];
    currentParts.forEach(part => {
      if (typeof part === 'string') {
        const regex = /\*\*(.*?)\*\*/g;
        let match;
        let lastIndex = 0;
        while ((match = regex.exec(part)) !== null) {
          const before = part.substring(lastIndex, match.index);
          const boldText = match[1];
          if (before) nextParts.push(before);
          nextParts.push(<strong className="font-black text-zinc-50 underline decoration-zinc-650" key={match.index}>{boldText}</strong>);
          lastIndex = regex.lastIndex;
        }
        const remaining = part.substring(lastIndex);
        if (remaining || nextParts.length === 0) {
          nextParts.push(remaining);
        }
      } else {
        nextParts.push(part);
      }
    });

    parts = nextParts;

    // $MathFormula$ converter
    let mathParts: (string | React.ReactNode)[] = [];
    parts.forEach(part => {
      if (typeof part === 'string') {
        const regex = /\$(.*?)\$/g;
        let match;
        let lastIndex = 0;
        while ((match = regex.exec(part)) !== null) {
          const before = part.substring(lastIndex, match.index);
          const mathExpr = match[1];
          if (before) mathParts.push(before);
          mathParts.push(<code className="bg-zinc-800 border border-zinc-700 font-mono px-1.5 py-0.5 text-[11px] text-indigo-300" key={match.index}>{mathExpr}</code>);
          lastIndex = regex.lastIndex;
        }
        const remaining = part.substring(lastIndex);
        if (remaining || mathParts.length === 0) {
          mathParts.push(remaining);
        }
      } else {
        mathParts.push(part);
      }
    });

    return <>{mathParts}</>;
  };

  // Dedicated Auth Modal Renderer (Available to both Visitors and Logged-In users)
  const renderAuthModal = () => {
    if (!showAuthModal) return null;
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-[#121214] border-2 border-zinc-700 p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,0.6)] animate-fade-in rounded-none">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-sans font-black text-xs uppercase text-zinc-150">Círculo Epistémico</h4>
            <button 
              onClick={() => {
                setShowAuthModal(false);
                setPasswordError(null);
              }}
              className="font-mono text-xs bg-zinc-800 border border-zinc-650 px-2.5 py-0.5 hover:bg-zinc-750 text-zinc-300"
              disabled={isCheckingGithub}
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-zinc-400 mb-4 leading-normal font-sans">
            Para colaborar en el Atlas, introducirte en la comunidad o escribir comentarios y citas, ingresa tus datos.
          </p>

          <form onSubmit={handleSimulateLogin} className="space-y-4">
            <div>
              <label className="block font-mono text-[9px] uppercase font-bold text-zinc-400 mb-1">Nombre de Usuario de GitHub:</label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-mono text-xs text-zinc-550 font-bold">@</span>
                <input
                  type="text"
                  required
                  value={authTempUsername}
                  onChange={(e) => setAuthTempUsername(e.target.value)}
                  placeholder="tu_usuario de github"
                  className="w-full bg-[#0c0c0e] border border-zinc-750 py-1.5 pl-7 pr-3 text-xs font-mono text-zinc-150 focus:outline-none focus:border-zinc-500 rounded-none placeholder-zinc-700 font-bold"
                  autoFocus
                  disabled={isCheckingGithub}
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[9px] uppercase font-bold text-zinc-400 mb-1">Contraseña Grupal de Acceso:</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="ingresá la contraseña de acceso grupal"
                className="w-full bg-[#0c0c0e] border border-zinc-750 py-1.5 px-3 text-xs font-mono text-zinc-150 focus:outline-none focus:border-zinc-500 rounded-none placeholder-zinc-700 font-bold"
                disabled={isCheckingGithub}
              />
            </div>

            {passwordError && (
              <div className="text-[10px] text-rose-450 font-mono bg-rose-950/40 p-2 border border-rose-900/60 leading-normal animate-fade-in">
                {passwordError}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  setPasswordError(null);
                }}
                className="flex-1 border border-zinc-700 py-1.5 font-mono text-xs uppercase text-zinc-350 bg-zinc-850 hover:bg-zinc-750 rounded-none"
                disabled={isCheckingGithub}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCheckingGithub}
                className="flex-1 bg-indigo-600 text-white hover:bg-indigo-550 border border-indigo-700 py-1.5 font-mono text-xs uppercase font-bold rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingGithub ? "Verificando..." : "Conectar Cuenta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderConfirmModal = () => {
    if (!confirmModalOpen) return null;
    const isMatched = confirmInputText.trim().toLowerCase() === confirmModalRequiredText.toLowerCase();
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
        <div className="bg-[#121214] border-2 border-zinc-700 p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,0.6)] animate-fade-in rounded-none">
          <div className="mb-4">
            <h4 className="font-sans font-black text-xs uppercase text-rose-500 tracking-wider">⚠️ Confirmación Requerida</h4>
            <h5 className="font-sans font-black text-sm text-zinc-100 uppercase mt-1">
              {confirmModalTitle}
            </h5>
          </div>
          <p className="text-xs text-zinc-300 font-mono leading-relaxed mb-4">
            {confirmModalMessage}
          </p>

          <div className="mb-6 space-y-2">
            <label className="block text-[11px] font-mono text-amber-500 uppercase font-bold">
              Copiá o escribí la frase exacta de confirmación:
            </label>
            <div className="bg-[#09090b] border border-zinc-800 p-2.5 font-mono text-rose-400 text-xs select-all text-center rounded-sm font-bold">
              {confirmModalRequiredText}
            </div>
            <input
              type="text"
              autoFocus
              placeholder="escribí/pegá la frase exacta aquí"
              value={confirmInputText}
              onChange={(e) => setConfirmInputText(e.target.value)}
              className="w-full bg-[#0c0c0e] border border-zinc-700 py-1.5 px-3 text-xs font-mono text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-505"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setConfirmModalOpen(false);
                setConfirmModalAction(null);
              }}
              className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono text-xs uppercase px-4 py-2 cursor-pointer font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={!isMatched}
              onClick={() => {
                if (confirmModalAction) confirmModalAction();
                setConfirmModalOpen(false);
                setConfirmModalAction(null);
              }}
              className={`font-mono text-xs uppercase px-4 py-2 cursor-pointer font-bold transition-all border ${
                isMatched
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
                  : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-50'
              }`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Visitor landing page early return
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 font-sans flex flex-col antialiased animate-fade-in">
        {/* Visitor Navigation */}
        <nav className="border-b border-zinc-800 bg-[#121114] py-4 px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="font-sans font-black tracking-tight text-sm uppercase text-zinc-100">
              🧭 ATLAS DE CONCEPTOS
            </span>
            <button 
              onClick={() => {
                setShowAuthModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-705 py-1.5 px-3 font-mono text-xs uppercase font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
            >
              Iniciar Sesión
            </button>
          </div>
        </nav>

        {/* Visitor Main Landing Section */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col items-center justify-center gap-8 py-12">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch w-full">
            
            {/* Left Box: Ramsey Quote Card */}
            <section className="md:col-span-6 bg-[#161619] border border-zinc-800 p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 font-mono text-[60px] text-zinc-800/25 select-none leading-none font-serif">
                “
              </div>
              <div className="space-y-4">
                <span className="bg-indigo-950/40 text-indigo-400 font-mono text-[9px] px-2 py-0.5 border border-indigo-900/60 uppercase tracking-widest inline-block">
                  Cita Destacada
                </span>
                
                <p className="text-zinc-200 text-sm md:text-base leading-relaxed italic font-serif relative z-10">
                  “No siento la menor humildad ante la vastedad de los cielos. Las estrellas pueden ser grandes, pero no pueden pensar ni amar; y estas son cualidades que me impresionan mucho más que el tamaño.
                  <br /><br />
                  Mi imagen del mundo está dibujada en perspectiva, y no como un modelo a escala. El primer plano está ocupado por seres humanos y las estrellas son todas tan pequeñas como monedas de tres peniques.”
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80">
                <p className="font-mono text-xs font-black text-zinc-300 uppercase tracking-wide">
                  — Frank Ramsey
                </p>
                <p className="font-mono text-[10px] text-zinc-550 mt-1">
                  Recomendado para el Atlas por <span className="text-indigo-455 font-bold">Javier Krick</span>
                </p>
              </div>
            </section>

            {/* Right Box: Introductory Letter by Javier Krick */}
            <section className="md:col-span-6 bg-[#121215] border border-zinc-800/60 p-6 md:p-8 flex flex-col justify-between shadow-lg">
              <div className="space-y-6">
                <h2 className="font-sans font-black text-lg text-zinc-100 uppercase tracking-tight border-b border-zinc-850 pb-3">
                  Para quienes forman parte de mi vida
                </h2>

                <div className="font-sans text-xs md:text-sm text-zinc-400 leading-relaxed space-y-4 font-serif">
                  <p>
                    A lo largo de los años, cada uno de nosotros ha ido encontrando ideas, libros, conceptos y preguntas que le han ayudado a comprender un poco mejor el mundo. Muchas de esas cosas aparecen en una conversación y luego se pierden; otras dejan una huella y nos acompañan durante años.
                  </p>
                  <p>
                    Este espacio nació para reunir y compartir esos descubrimientos. No como una colección de verdades, sino como un registro de aquello que nos ha hecho pensar, aprender y crecer.
                  </p>
                  <p>
                    Que las ideas que encontremos aquí sigan generando nuevas conversaciones, nuevas preguntas y nuevas formas de comprender.
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-zinc-850 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs font-black text-zinc-300 uppercase">
                    — Javier Krick
                  </p>
                </div>
                
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-indigo-650 hover:bg-indigo-550 text-white border-2 border-indigo-700 px-4 py-2 font-mono text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-[2px]"
                >
                  <Github className="w-4 h-4" />
                  Acceso Colaboradores
                </button>
              </div>
            </section>

          </div>



        </main>

        <footer className="border-t border-zinc-850 bg-[#111113] py-6 px-4 text-zinc-500 font-mono text-center text-[11px]">
          <span>© 🧭 ATLAS DE CONCEPTOS</span>
        </footer>

        {renderAuthModal()}
        {renderConfirmModal()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100 font-sans flex flex-col antialiased">
      
      {/* Absolute clean minimalist Navigation bar */}
      <nav className="border-b border-zinc-800 bg-[#121214] py-4 px-4 md:px-8 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="font-sans font-black tracking-tight text-sm uppercase text-zinc-100">
              🧭 ATLAS DE CONCEPTOS
            </span>
            {user?.isDev && (
              <span className="bg-purple-950 text-purple-300 font-mono text-[9px] font-black px-1.5 py-0.5 border border-purple-800 uppercase rounded-none tracking-wider">
                ⚡ MODO DESARROLLADOR ACTIVO
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 animate-fade-in">
            {/* Minimal dual navigation tabs */}
            <div className="flex bg-zinc-900 p-0.5 border border-zinc-700/80">
              <button
                onClick={() => setActiveTab('mvp')}
                className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all rounded-none ${
                  activeTab === 'mvp' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100 font-bold'
                }`}
              >
                Conceptos
              </button>
              <button
                onClick={() => setActiveTab('frases')}
                className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all rounded-none ${
                  activeTab === 'frases' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Citas
              </button>
              <button
                onClick={() => setActiveTab('comentarios')}
                className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all rounded-none ${
                  activeTab === 'comentarios' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Diálogos
              </button>
              <button
                onClick={() => setActiveTab('integrantes')}
                className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all rounded-none ${
                  activeTab === 'integrantes' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Integrantes
              </button>
              <button
                onClick={() => setActiveTab('technical')}
                className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all rounded-none ${
                  activeTab === 'technical' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Importar
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all rounded-none ${
                  activeTab === 'export' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Exportar
              </button>
            </div>

            <button
              onClick={() => {
                setShowWelcomePopups(true);
                setWelcomeStep(1);
              }}
              className="bg-zinc-900 text-zinc-350 hover:text-zinc-100 border border-zinc-750 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase flex items-center gap-1 shadow-sm shrink-0"
              title="Abrir novedades y diálogo de entrada"
            >
              <span>💬</span> Diálogos del Día
            </button>

            {/* Authenticated User Status Widget */}
            {user ? (
              <div className="hidden md:flex items-center gap-2 bg-[#1e1e24] border border-zinc-700 px-2.5 py-1">
                <span className="font-mono text-[11px] text-zinc-300 font-bold shrink-0">@{user.name}</span>
                <button onClick={handleLogout} className="text-zinc-400 hover:text-red-400 font-mono text-[10px] ml-1 shrink-0 underline">
                  Salir
                </button>
              </div>
            ) : null}
          </div>
          
        </div>
      </nav>

      {/* Main content body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">

        {activeTab === 'mvp' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT SIDEBAR: Add/Select Active Disciplines (Tags) */}
            <section className="lg:col-span-3 space-y-4">
              
              {/* Creator Card for Disciplinas - Demands authentication */}
              <div className="bg-[#161619] border border-zinc-800 p-4">
                <h3 className="font-sans font-black text-xs text-zinc-100 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  Agregar Disciplina
                </h3>
                
                <form onSubmit={handleAddDiscipline} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={newDisciplineName}
                    onChange={(e) => {
                      if (!user) {
                        setShowAuthModal(true);
                        return;
                      }
                      setNewDisciplineName(e.target.value);
                    }}
                    onFocus={() => {
                      if (!user) {
                        setShowAuthModal(true);
                      }
                    }}
                    placeholder="e.g. Psicología"
                    className="w-full bg-zinc-900 border border-zinc-700 py-1.5 px-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] font-bold uppercase py-1.5 text-center transition-colors"
                  >
                    Crear Disciplina
                  </button>
                </form>

                {showAddDisciplineFeedback && (
                  <div className="text-[10px] text-emerald-400 font-mono mt-2 bg-emerald-950/40 p-1.5 border border-emerald-800/40">
                    ✓ Disciplina creada con éxito.
                  </div>
                )}
              </div>

              {/* Disciplines selectable list browser */}
              <div className="bg-[#161619] border border-zinc-800 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-sans font-black text-xs text-zinc-100 uppercase tracking-wider">
                    Disciplinas Activas
                  </h3>
                  <span className="font-mono text-[10px] text-zinc-500 font-bold">({allTags.length})</span>
                </div>

                <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
                  {allTags.map(tag => {
                    const count = conceptsList.filter(c => c.tags.some(t => t.toLowerCase() === tag.toLowerCase())).length;
                    const isSelected = selectedTag.toLowerCase() === tag.toLowerCase();
                    return (
                      <div key={tag} className="flex gap-1 items-stretch">
                        <button
                          onClick={() => {
                            setSelectedTag(tag);
                            setExpandedConceptId(null); // Fold expanded views on tag change
                          }}
                          className={`flex-1 text-left px-3 py-2 border transition-all duration-150 rounded-none flex items-center justify-between text-xs font-mono uppercase ${
                            isSelected 
                              ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,0.35)]' 
                              : 'bg-zinc-900 text-zinc-300 hover:bg-[#25252b] border-zinc-800/70'
                          }`}
                        >
                          <span>#{tag}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 border font-semibold ${
                            isSelected ? 'bg-zinc-700 border-zinc-600 text-zinc-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                        {user?.isDev && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerConfirm(
                                'Eliminar Disciplina',
                                `¿Estás seguro que querés eliminar la disciplina/tag "#${tag}"? Se removerá la disciplina de todos los conceptos. Aquellos conceptos que queden huérfanos sin ninguna disciplina se eliminarán de la base de datos.`,
                                () => handleDeleteDiscipline(tag)
                              );
                            }}
                            className="bg-rose-955/40 text-rose-400 hover:bg-rose-900 hover:text-white border border-rose-800/60 px-2 flex items-center justify-center cursor-pointer transition-colors"
                            title="Eliminar esta disciplina permanentemente"
                          >
                            ✖
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Developer panel shortcut */}
              {user?.isDev && (
                <div className="bg-purple-950/20 border border-purple-900/65 p-3 font-mono text-[11px] text-purple-300 space-y-2 mt-2">
                  <span className="block font-bold text-xs">🛠️ CONTROLES DESARROLLADOR:</span>
                  
                  <button
                    onClick={handleDeveloperAddMockData}
                    className="w-full bg-purple-900 hover:bg-purple-850 text-white font-mono font-bold uppercase py-1 px-2 border border-purple-950 transition-colors cursor-pointer text-center"
                  >
                    + Generar Mock en #{selectedTag}
                  </button>

                  <button
                    onClick={handleResetToDefault}
                    className="w-full bg-amber-950/40 hover:bg-amber-900 border border-amber-800/60 text-amber-400 font-mono font-bold uppercase py-1 px-2 transition-colors cursor-pointer text-center"
                  >
                    🔄 Restablecer Predeterminados (Reiniciar)
                  </button>

                  <button
                    onClick={handlePurgeAllDatabase}
                    className="w-full bg-rose-955/40 hover:bg-rose-900 border border-rose-800/60 text-rose-400 font-mono font-bold uppercase py-1 px-2 transition-colors cursor-pointer text-center"
                  >
                    🗑️ Purgar / Vaciar Todo (Lienzo Blanco)
                  </button>

                  <p className="text-[9px] text-purple-500 leading-relaxed pt-1">
                    Prueba los niveles libres de relevancia, restablece los datos académicos por defecto, o vacía la base de datos para pruebas limpias de CSV.
                  </p>
                </div>
              )}

              {/* Mobile Quick User registration widget */}
              <div className="md:hidden bg-[#161619] border border-zinc-800 p-3 flex justify-between items-center">
                {user ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-zinc-350">@{user.name}</span>
                    </div>
                    <button onClick={handleLogout} className="text-red-400 font-mono text-[11px] underline">Salir</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowAuthModal(true)} 
                    className="w-full text-center bg-zinc-800 text-zinc-100 py-1.5 font-mono text-[11px] font-bold"
                  >
                    Autenticarse para colaborar
                  </button>
                )}
              </div>
            </section>

            {/* MAIN CONTENT WORKSPACE: Concepts List browser */}
            <section className="lg:col-span-9 space-y-4">
              
              <div className="bg-[#161619] border border-zinc-800 p-5 md:p-6 shadow-xs">
                
                {/* Active select Tag Header with absolute inline adding controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-4">
                  <div>
                    <span className="font-mono text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">Disciplina Seleccionada</span>
                    <h2 className="font-sans font-black text-xl text-zinc-150 uppercase flex items-center gap-1.5">
                      📖 #{selectedTag}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        if (!user) {
                          setShowAuthModal(true);
                        } else {
                          setShowAddModal(true);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-indigo-700 px-3.5 py-2 font-mono text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      Agregar concepto a #{selectedTag}
                    </button>
                  </div>
                </div>

                {/* Instant search text queries */}
                <div className="relative mb-5">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Filtrar en #${selectedTag}...`}
                    className="w-full bg-[#0c0c0e] border border-zinc-700 text-zinc-150 pl-10 pr-4 py-2.5 rounded-none font-mono text-xs focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder-zinc-500"
                  />
                </div>

                {/* Main Concept collection loop */}
                <div className="space-y-3">
                  {computedConceptsInTag.length > 0 ? (
                    computedConceptsInTag.map(item => {
                      const { concept, publicTier, personalTier, avg, votesCount, forceReason } = item;
                      const tierInfo = getTierDetails(publicTier);
                      const isExpanded = expandedConceptId === concept.id;

                      return (
                        <div 
                          key={concept.id}
                          className={`relative border transition-all duration-150 rounded-none overflow-hidden ${
                            isExpanded ? 'border-zinc-650 bg-[#1c1c21] shadow-md' : 'border-zinc-800 bg-[#121214] hover:bg-[#161619]'
                          }`}
                        >
                          {/* Discreto: Arriba a la derecha (Consenso general de la tarjeta & Voto) */}
                          <div className="absolute top-2.5 right-2.5 text-right font-mono text-[10px] sm:text-[11px] select-none leading-normal z-10">
                            {/* Concepto Tier 1, 2, 3 based on publicTier */}
                            <div className="text-zinc-400 font-bold uppercase tracking-wider">
                              Concepto Tier {publicTier}
                            </div>
                            
                            {/* Mi voto: Tier X and up/down arrows control */}
                            <div className="flex items-center justify-end gap-1 text-zinc-500 mt-0.5">
                              <span>Mi voto: Tier {personalTier !== null ? personalTier : '—'}</span>
                              <div className="flex flex-col -space-y-1.5 ml-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!user) {
                                      setShowAuthModal(true);
                                      return;
                                    }
                                    let nextVote: 1 | 2 | 3 = 2;
                                    if (personalTier === null) nextVote = 2;
                                    else if (personalTier === 3) nextVote = 2;
                                    else if (personalTier === 2) nextVote = 1;
                                    else if (personalTier === 1) nextVote = 1;
                                    handleVoteTierDirect(concept.id, nextVote);
                                  }}
                                  className="text-[11px] sm:text-[12px] text-zinc-500 hover:text-indigo-400 cursor-pointer px-1 py-0.2 focus:outline-none"
                                  title="Subir Tier (más prioritario)"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!user) {
                                      setShowAuthModal(true);
                                      return;
                                    }
                                    let nextVote: 1 | 2 | 3 = 2;
                                    if (personalTier === null) nextVote = 2;
                                    else if (personalTier === 1) nextVote = 2;
                                    else if (personalTier === 2) nextVote = 3;
                                    else if (personalTier === 3) nextVote = 3;
                                    handleVoteTierDirect(concept.id, nextVote);
                                  }}
                                  className="text-[11px] sm:text-[12px] text-zinc-500 hover:text-indigo-400 cursor-pointer px-1 py-0.2 focus:outline-none"
                                  title="Bajar Tier (menos prioritario)"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Alert notification banner about proposal */}
                          {concept.proposedChange && (
                            <div className="bg-[#241a0c] border-b border-amber-800/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-amber-500 shrink-0">⚠️</span>
                                <span className="leading-normal">
                                  Propuesta de modificación del concepto por <strong className="text-amber-100 font-bold">@{concept.proposedChange.proposedBy}</strong>
                                </span>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                {user?.name === concept.proposedChange.proposedBy ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelProposal(concept.id);
                                    }}
                                    className="bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 px-2 py-1 text-[10px] font-bold uppercase cursor-pointer"
                                  >
                                    Cancelar mi modificación
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!user) {
                                        setShowAuthModal(true);
                                      } else {
                                        handleAcceptProposal(concept.id);
                                      }
                                    }}
                                    className="bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-700 px-2.5 py-1 text-[10px] font-black uppercase cursor-pointer"
                                  >
                                    Aceptar modificación
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Row details */}
                          <div className="p-4 pr-24 sm:pr-28 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            
                            {/* Concept primary title & trigger to read details */}
                            <div 
                              onClick={() => setExpandedConceptId(isExpanded ? null : concept.id)}
                              className="flex-1 min-w-0 cursor-pointer group"
                            >
                              <div className="flex items-center gap-2">
                                <h4 className="font-sans font-black text-md text-zinc-100 group-hover:text-indigo-400 transition-colors uppercase">
                                  {concept.title}
                                </h4>
                                <span className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-350">
                                  {isExpanded ? '▲ plegar' : '▼ ver detalles'}
                                </span>
                                {user?.isDev && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerConfirm(
                                        'Eliminar Concepto',
                                        `¿Estás seguro que querés eliminar el concepto "${concept.title}"?`,
                                        () => handleDeleteConcept(concept.id)
                                      );
                                    }}
                                    className="ml-3 bg-rose-955/40 text-rose-400 hover:bg-rose-900 border border-rose-800/60 px-2 py-0.5 text-[9.5px] font-mono uppercase font-black tracking-wider cursor-pointer transition-colors"
                                    title="Eliminar este concepto permanentemente"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                              <p className="text-zinc-300 text-xs mt-1 font-serif max-w-xl line-clamp-2 leading-relaxed">
                                {concept.description || "Este concepto no tiene descripción cargada. Haz click en 'ver detalles' para agregarle una."}
                              </p>
                            </div>

                          </div>

                          {/* Expanded content view drawer */}
                          {isExpanded && (
                            <div className="border-t border-zinc-800 bg-[#161619] p-5 space-y-5 animate-fade-in">
                              
                              {/* Tags display configuration */}
                              <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                                <div className="space-y-1">
                                  <span className="block font-mono text-[9px] uppercase font-bold text-zinc-500">Disciplinas / Tags asociados</span>
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {concept.tags.map(t => (
                                      <span key={t} className="bg-zinc-850 text-indigo-300 px-2 py-0.5 border border-zinc-750 text-[10px] font-bold">
                                        #{t}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 mt-2 sm:mt-0">
                                  <input 
                                    type="text"
                                    placeholder="Agregar tag..."
                                    id={`add-tag-input-${concept.id}`}
                                    value={newTagInputs[concept.id] || ''}
                                    onChange={(e) => {
                                      if (!user) {
                                        setShowAuthModal(true);
                                        return;
                                      }
                                      setNewTagInputs(prev => ({ ...prev, [concept.id]: e.target.value }));
                                    }}
                                    className="bg-[#0c0c0e] border border-zinc-700 py-1 px-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-700 w-32 focus:outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      if (!user) {
                                        setShowAuthModal(true);
                                        return;
                                      }
                                      const val = newTagInputs[concept.id];
                                      if (val && val.trim()) {
                                        handleAddTagToConcept(concept.id, val.trim());
                                      }
                                    }}
                                    className="bg-[#1a1a24] hover:bg-[#222230] border border-indigo-700/80 text-indigo-300 font-mono text-[10px] uppercase font-bold px-3 py-1 cursor-pointer"
                                  >
                                    + Tag
                                  </button>
                                </div>
                              </div>

                              {/* Description editor and proposal box */}
                              {(() => {
                                const hasNoDescription = !concept.description || 
                                  concept.description.trim() === '' || 
                                  concept.description.trim() === 'Este concepto fue agregado colaborativamente sin descripción extendida.';

                                return (
                                  <div className="bg-zinc-900/40 border border-zinc-800 p-4 space-y-3 font-sans">
                                    {hasNoDescription ? (
                                      <div className="space-y-2">
                                        <p className="text-[11px] font-mono text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                                          <span>ℹ️</span> Este concepto no tiene descripción cargada.
                                        </p>
                                        <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                                          Puedes incorporar una descripción directa que se guardará automáticamente de inmediato.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                          <input 
                                            type="text" 
                                            id={`desc-add-input-${concept.id}`}
                                            placeholder="Redactar la descripción para autoguardar..." 
                                            value={temporaryDesc[concept.id] || ''}
                                            onChange={(e) => setTemporaryDesc(prev => ({ ...prev, [concept.id]: e.target.value }))}
                                            className="flex-1 bg-[#0c0c0e] border border-zinc-700 py-1.5 px-3 text-xs font-mono text-zinc-100 placeholder-zinc-650 focus:outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              if (!user) {
                                                setShowAuthModal(true);
                                                return;
                                              }
                                              const val = temporaryDesc[concept.id];
                                              if (val && val.trim()) {
                                                handleAddDescriptionDirect(concept.id, val);
                                              }
                                            }}
                                            className={`font-mono text-xs uppercase px-4 py-1.5 font-bold cursor-pointer transition-colors border ${
                                              (temporaryDesc[concept.id] || '').trim() !== ''
                                                ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 ring-2 ring-emerald-300 animate-pulse font-extrabold'
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-705'
                                            }`}
                                          >
                                            Guardar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <div>
                                          <span className="block font-mono text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Descripción del Concepto</span>
                                          <p className="text-zinc-150 text-sm mt-1 leading-relaxed font-sans">
                                            {concept.description}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Main Markdown explanation contents */}
                              <div className="prose max-w-none text-zinc-300 space-y-3 font-sans leading-relaxed">
                                {renderSimpleMarkdown(concept.content)}
                              </div>

                              {/* SECCIÓN DE PROPUESTAS DE MODIFICACIÓN UNIFICADAS */}
                              <div className="pt-4 border-t border-zinc-850 space-y-4">
                                <div className="bg-[#121215] border border-zinc-800/80 p-4">
                                  {concept.proposedChange ? (
                                    <div className="space-y-4">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-900/35 pb-3">
                                        <div className="space-y-1">
                                          <span className="font-mono text-[9px] uppercase font-bold text-amber-505 tracking-wider block">PROPUESTA DE MODIFICACIÓN ACTIVA</span>
                                          <h4 className="font-sans font-bold text-sm text-amber-200">
                                            Sugerido por <span className="text-zinc-100 font-black block sm:inline">@{concept.proposedChange.proposedBy}</span>
                                          </h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2 font-mono text-[11px] justify-end">
                                          {user?.name === concept.proposedChange.proposedBy ? (
                                            <button
                                              onClick={() => handleCancelProposal(concept.id)}
                                              className="bg-rose-955 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1.5 font-bold uppercase cursor-pointer transition-colors"
                                            >
                                              Cancelar mi modificación
                                            </button>
                                          ) : (
                                            <>
                                              {adjustingConcepts[concept.id] ? (
                                                <>
                                                  <button
                                                    onClick={() => {
                                                      const dVal = proposalDescInputs[concept.id] !== undefined ? proposalDescInputs[concept.id] : concept.proposedChange!.proposedDescription;
                                                      const cVal = proposalContentInputs[concept.id] !== undefined ? proposalContentInputs[concept.id] : concept.proposedChange!.proposedContent;
                                                      handleProposeConceptChanges(concept.id, dVal, cVal);
                                                      setAdjustingConcepts(prev => ({ ...prev, [concept.id]: false }));
                                                    }}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 font-black uppercase cursor-pointer shadow-sm transition-colors"
                                                  >
                                                    Publicar Ajuste de Propuesta
                                                  </button>
                                                  <button
                                                    onClick={() => setAdjustingConcepts(prev => ({ ...prev, [concept.id]: false }))}
                                                    className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 px-3 py-1.5 font-medium uppercase cursor-pointer"
                                                  >
                                                    Cancelar Ajuste
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    onClick={() => {
                                                      setProposalDescInputs(prev => ({ ...prev, [concept.id]: concept.proposedChange!.proposedDescription || concept.description }));
                                                      setProposalContentInputs(prev => ({ ...prev, [concept.id]: concept.proposedChange!.proposedContent || concept.content }));
                                                      setAdjustingConcepts(prev => ({ ...prev, [concept.id]: true }));
                                                    }}
                                                    className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-805 px-3 py-1.5 font-bold uppercase cursor-pointer transition-colors"
                                                    title="Modificar la propuesta de modificación sugerida por este usuario"
                                                  >
                                                    Modificar Propuesta
                                                  </button>
                                                  <button
                                                    onClick={() => handleCancelProposal(concept.id)}
                                                    className="bg-rose-955 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1.5 font-bold uppercase cursor-pointer transition-colors"
                                                  >
                                                    Rechazar
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      if (!user) {
                                                        setShowAuthModal(true);
                                                      } else {
                                                        handleAcceptProposal(concept.id);
                                                      }
                                                    }}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 px-3.5 py-1.5 font-black uppercase cursor-pointer shadow-sm transition-colors"
                                                  >
                                                    Aceptar y Publicar Cambios
                                                  </button>
                                                </>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Comparación de Descripción */}
                                      {(concept.proposedChange.proposedDescription && concept.proposedChange.proposedDescription !== concept.description || adjustingConcepts[concept.id]) && (
                                        <div className="space-y-2">
                                          <span className="block font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Cambio propuesto en la Descripción:</span>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="bg-zinc-950/50 p-3 border border-zinc-900 opacity-60">
                                              <span className="block font-mono text-[8px] text-rose-455 mb-1 font-bold">ACTUAL</span>
                                              <p className="text-zinc-400 text-xs font-sans italic">"{concept.description}"</p>
                                            </div>
                                            <div className="bg-amber-955/20 p-3 border border-amber-900/30">
                                              <span className="block font-mono text-[8px] text-amber-400 mb-1 font-bold">PROPUESTA</span>
                                              {adjustingConcepts[concept.id] ? (
                                                <textarea
                                                  value={proposalDescInputs[concept.id] !== undefined ? proposalDescInputs[concept.id] : concept.proposedChange.proposedDescription}
                                                  onChange={(e) => setProposalDescInputs(prev => ({ ...prev, [concept.id]: e.target.value }))}
                                                  rows={2}
                                                  className="w-full bg-[#0c0c0e] border border-amber-800 text-zinc-150 p-2 text-xs font-mono focus:outline-none focus:border-amber-500"
                                                />
                                              ) : (
                                                <p className="text-zinc-200 text-xs font-sans font-medium">"{concept.proposedChange.proposedDescription}"</p>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Comparación de Contenido */}
                                      {(concept.proposedChange.proposedContent && concept.proposedChange.proposedContent !== concept.content || adjustingConcepts[concept.id]) && (
                                        <div className="space-y-2 pt-2">
                                          <span className="block font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-bold">Cambio propuesto en el Desarrollo Conceptual (Markdown):</span>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="bg-zinc-955/50 p-3 border border-zinc-900 opacity-60 max-h-48 overflow-y-auto">
                                              <span className="block font-mono text-[8px] text-rose-455 mb-1 font-bold">ACTUAL</span>
                                              <pre className="text-zinc-500 text-[10px] font-mono whitespace-pre-wrap leading-tight">{concept.content}</pre>
                                            </div>
                                            <div className="bg-amber-955/20 p-3 border border-amber-900/30 max-h-96 overflow-y-auto">
                                              <span className="block font-mono text-[8px] text-amber-400 mb-1 font-bold">PROPUESTA</span>
                                              {adjustingConcepts[concept.id] ? (
                                                <textarea
                                                  value={proposalContentInputs[concept.id] !== undefined ? proposalContentInputs[concept.id] : concept.proposedChange.proposedContent}
                                                  onChange={(e) => setProposalContentInputs(prev => ({ ...prev, [concept.id]: e.target.value }))}
                                                  rows={10}
                                                  className="w-full bg-[#0c0c0e] border border-amber-850 text-zinc-150 p-2 text-xs font-mono focus:outline-none focus:border-amber-500 font-medium"
                                                />
                                              ) : (
                                                <pre className="text-zinc-200 text-[10px] font-mono whitespace-pre-wrap leading-tight font-medium">{concept.proposedChange.proposedContent}</pre>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <details className="group">
                                      <summary className="font-mono text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase cursor-pointer select-none flex items-center gap-2">
                                        <span className="transition-transform group-open:rotate-90">▶</span>
                                        Proponer una modificación alternativa a este concepto (.md / Descripción)
                                      </summary>
                                      <div className="mt-4 space-y-4 pl-3 border-l border-indigo-900/50 animate-fade-in">
                                        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed max-w-3xl">
                                          ¿Deseas corregir erratas, agregar teoremas o ampliar este marco? Puedes sugerir cambios simultáneos tanto a la síntesis de un párrafo (Descripción) como al desarrollo académico en profundidad (Markdown). Tu propuesta quedará visible para revisión por pares comunitarios.
                                        </p>

                                        <div className="space-y-4">
                                          {/* Editor de Descripción */}
                                          <div className="space-y-1.5">
                                            <label className="block font-mono text-[9px] uppercase font-bold text-zinc-400">
                                              Descripción Corta de Síntesis
                                            </label>
                                            <textarea
                                              value={proposalDescInputs[concept.id] !== undefined ? proposalDescInputs[concept.id] : concept.description}
                                              onChange={(e) => setProposalDescInputs(prev => ({ ...prev, [concept.id]: e.target.value }))}
                                              rows={2}
                                              placeholder="Modifica la descripción síntesis..."
                                              className="w-full bg-[#0c0c0e] border border-zinc-700 text-zinc-150 p-2.5 text-xs font-mono focus:outline-none focus:border-indigo-650"
                                            />
                                          </div>

                                          {/* Editor de Contenido Conceptual (Markdown) */}
                                          <div className="space-y-1.5">
                                            <label className="block font-mono text-[9px] uppercase font-bold text-zinc-400">
                                              Desarrollo del Marco Conceptual (Código Markdown)
                                            </label>
                                            <textarea
                                              value={proposalContentInputs[concept.id] !== undefined ? proposalContentInputs[concept.id] : concept.content}
                                              onChange={(e) => setProposalContentInputs(prev => ({ ...prev, [concept.id]: e.target.value }))}
                                              rows={10}
                                              placeholder="Modifica la entrada de estudio..."
                                              className="w-full bg-[#0c0c0e] border border-zinc-700 text-zinc-150 p-2.5 text-xs font-mono focus:outline-none focus:border-indigo-650 font-medium"
                                            />
                                          </div>

                                          {(() => {
                                            const dVal = proposalDescInputs[concept.id] !== undefined ? proposalDescInputs[concept.id] : concept.description;
                                            const cVal = proposalContentInputs[concept.id] !== undefined ? proposalContentInputs[concept.id] : concept.content;
                                            const isModified = dVal.trim() !== concept.description.trim() || cVal.trim() !== concept.content.trim();
                                            return (
                                              <div className="flex justify-end pt-1">
                                                <button
                                                  onClick={() => {
                                                    if (!user) {
                                                      setShowAuthModal(true);
                                                      return;
                                                    }
                                                    handleProposeConceptChanges(concept.id, dVal, cVal);
                                                  }}
                                                  className={`font-mono text-xs uppercase font-black px-4 py-2 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all border ${
                                                    isModified
                                                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 ring-2 ring-emerald-300 animate-pulse font-extrabold'
                                                      : 'bg-indigo-650 hover:bg-indigo-550 text-white border-indigo-700'
                                                  }`}
                                                >
                                                  Subir Propuesta Alternativa
                                                </button>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </details>
                                  )}
                                </div>
                              </div>

                              {/* Interactive Anki deck */}
                              <div className="space-y-4 pt-4 border-t border-zinc-800 animate-fade-in">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-sans font-black text-xs text-zinc-150 uppercase tracking-tight flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-indigo-400" />
                                    Autoevaluación de Conceptos Anki
                                  </h5>

                                  <button
                                    onClick={() => {
                                      if (!user) {
                                        setShowAuthModal(true);
                                        return;
                                      }
                                      setAddingAnkiForConceptId(addingAnkiForConceptId === concept.id ? null : concept.id);
                                    }}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] uppercase px-2.5 py-1 border border-zinc-700 transition-colors cursor-pointer"
                                  >
                                    {addingAnkiForConceptId === concept.id ? '✕ Cancelar' : '+ Agregar Tarjeta'}
                                  </button>
                                </div>

                                {/* Form to add new card */}
                                {addingAnkiForConceptId === concept.id && (
                                  <form 
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      if (newAnkiFront.trim() && newAnkiBack.trim()) {
                                        handleAddAnkiCard(concept.id, newAnkiFront, newAnkiBack);
                                        setNewAnkiFront('');
                                        setNewAnkiBack('');
                                        setAddingAnkiForConceptId(null);
                                      }
                                    }}
                                    className="bg-zinc-900 border border-zinc-750 p-4 space-y-3 shadow-md animate-fade-in text-xs"
                                  >
                                    <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wide border-b border-zinc-800 pb-1 flex items-center gap-1.5">
                                      <span>🗃️</span> Nueva tarjeta didáctica para {concept.title}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-[9px] uppercase font-bold text-zinc-450 mb-1">Frente (Pregunta / Término):</label>
                                        <textarea
                                          required
                                          rows={2}
                                          value={newAnkiFront}
                                          onChange={(e) => setNewAnkiFront(e.target.value)}
                                          placeholder="e.g. ¿Qué define el panopticismo en Foucault?"
                                          className="w-full bg-[#0c0c0e] border border-zinc-700 p-2 text-xs font-mono text-zinc-150 focus:outline-none focus:border-zinc-555"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] uppercase font-bold text-zinc-455 mb-1">Respuesta (Dorso):</label>
                                        <textarea
                                          required
                                          rows={2}
                                          value={newAnkiBack}
                                          onChange={(e) => setNewAnkiBack(e.target.value)}
                                          placeholder="e.g. Un modelo arquitectónico de control social invisible..."
                                          className="w-full bg-[#0c0c0e] border border-zinc-700 p-2 text-xs font-mono text-zinc-150 focus:outline-none focus:border-zinc-555"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 text-[10px]">
                                      <button
                                        type="button"
                                        onClick={() => setAddingAnkiForConceptId(null)}
                                        className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 px-3 py-1 font-mono uppercase text-zinc-400 font-bold cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="submit"
                                        className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-700 px-3.5 py-1 text-white font-mono uppercase font-black cursor-pointer shadow-sm"
                                      >
                                        Guardar Tarjeta
                                      </button>
                                    </div>
                                  </form>
                                )}

                                {concept.anki && concept.anki.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[...(concept.anki || [])]
                                      .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
                                      .map((card, idx) => (
                                        <AnkiCard 
                                          key={card.id || idx} 
                                          card={card} 
                                          index={idx} 
                                          user={user}
                                          onLike={() => handleLikeAnkiCard(concept.id, card.id || String(idx))}
                                          onProposeChange={(front, back) => handleProposeAnkiCardChange(concept.id, card.id || String(idx), front, back)}
                                          onAcceptProposal={() => handleAcceptAnkiCardProposal(concept.id, card.id || String(idx))}
                                          onCancelProposal={() => handleCancelAnkiCardProposal(concept.id, card.id || String(idx))}
                                          onDeleteCard={() => {
                                            triggerConfirm(
                                              'Eliminar Tarjeta Memorística',
                                              '¿Estás seguro de que deseas eliminar esta tarjeta de memoria?',
                                              () => handleDeleteAnkiCard(concept.id, card.id || String(idx))
                                            );
                                          }}
                                          onRequireAuth={() => setShowAuthModal(true)}
                                        />
                                      ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 bg-zinc-950 border border-zinc-850 text-zinc-500 font-mono text-[10px]">
                                    Esta baraja no posee tarjetas creadas aún. ¡Crea la primera para empezar la autoevaluación!
                                  </div>
                               )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 bg-[#121214] border border-zinc-800 font-mono text-xs text-zinc-500">
                      No hay conceptos cargados en la disciplina #{selectedTag}.
                    </div>
                  )}
                </div>

              </div>
              
            </section>

          </div>
        ) : activeTab === 'frases' ? (
          /* "TAB FRASES": Browse quotes database */
          <div className="space-y-6 animate-fade-in text-zinc-100">
            <div className="bg-[#161619] border border-zinc-800 p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[9px] text-indigo-400 font-extrabold tracking-widest block uppercase">BIBLIOTECA CONCEPTUAL</span>
                <h2 className="font-sans font-black text-lg text-zinc-150 uppercase mt-1">
                  Frases & Pensamientos de Autores
                </h2>
                <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-sans max-w-xl">
                  Un catálogo de citas y aforismos compartidas por colaboradores del círculo. Estas ideas rotan secuencialmente para ofrecer inspiración continua.
                </p>
              </div>

              <button
                onClick={() => setShowAddQuoteModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-indigo-700 py-2.5 px-4 font-mono text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Compartir Frase de Autor
              </button>
            </div>

            {/* List of Quotes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotesList.map(quote => (
                <div key={quote.id} className="bg-[#121214] border border-zinc-800 p-5 flex flex-col justify-between shadow-xs hover:border-zinc-700 hover:bg-zinc-900/45 transition-colors duration-205">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-serif text-[40px] text-zinc-800 leading-none h-4 inline-block select-none font-serif font-black">“</span>
                    </div>
                    
                    <p className="font-serif text-zinc-200 text-sm italic leading-relaxed whitespace-pre-line">
                      “{quote.text}”
                    </p>
                    
                    <p className="font-mono text-xs font-black text-zinc-350 uppercase tracking-wide">
                      — {quote.author}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-zinc-850 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[9px] text-zinc-500">
                        Compartido por <span className="text-indigo-400 font-semibold">@{quote.sharedBy}</span>
                      </p>
                      <p className="font-mono text-[8px] text-zinc-650 mt-0.5">
                        {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-ES') : ''}
                      </p>
                    </div>

                    {(quote.sharedBy === user?.name || user?.isDev) && (
                      <button
                        onClick={() => {
                          triggerConfirm(
                            'Eliminar Cita',
                            '¿Estás seguro que querés eliminar la frase/cita?',
                            () => {
                              const updated = quotesList.filter(q => q.id !== quote.id);
                              saveQuotes(updated);
                            }
                          );
                        }}
                        className="text-zinc-600 hover:text-rose-400 font-mono text-[9px] hover:underline cursor-pointer"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'comentarios' ? (
          /* "TAB COMENTARIOS": Interactive pile of thoughts */
          <div className="space-y-6 animate-fade-in text-zinc-100">
            <div className="bg-[#161619] border border-zinc-800 p-5 md:p-6 shadow-sm">
              <span className="font-mono text-[9px] text-indigo-400 font-black tracking-widest block uppercase">Comentario Epistémico</span>
              <h2 className="font-sans font-black text-lg text-zinc-150 uppercase mt-1">
                Foro de Entrada & Discusión Colaborativa
              </h2>
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-sans max-w-xl">
                Todos los colaboradores pueden compartir reflexiones críticas en este espacio de diálogo. Esto sirve de punto de encuentro interactivo para conversar, debatir y refinar las disciplinas de forma compartida.
              </p>

              {/* Form to submit a comment */}
              <form onSubmit={handleAddComment} className="mt-6 space-y-3 pt-4 border-t border-zinc-850">
                <label className="block font-mono text-[10px] uppercase font-bold text-zinc-400">
                  Redacta tu comentario:
                </label>
                <textarea
                  value={newCommentText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCommentText(val);
                    const textTrimmed = val.trim();
                    if (textTrimmed.length > 0 && textTrimmed.length < 100) {
                      const missing = 100 - textTrimmed.length;
                      setCommentError(`Faltan ${missing} caracteres para poder publicar.`);
                    } else {
                      setCommentError(null);
                    }
                  }}
                  placeholder="Redacta tu comentario..."
                  rows={3}
                  className="w-full bg-[#0c0c0e] border border-zinc-750 text-zinc-150 p-3 text-xs font-mono focus:outline-none placeholder-zinc-655 rounded-none focus:ring-1 focus:ring-zinc-600"
                  required
                />
                
                {commentError && (
                  <p className="text-rose-400 font-mono text-[11px] font-bold">
                    ⚠️ {commentError}
                  </p>
                )}
                
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    * Publicando como <strong className="text-indigo-400 font-bold">@{user?.name}</strong>
                  </span>
                  <button
                    type="submit"
                    className="bg-indigo-650 hover:bg-indigo-550 text-white border border-indigo-700 py-1.5 px-4 font-mono text-xs font-bold uppercase rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] transition-all cursor-pointer"
                  >
                    Publicar Comentario
                  </button>
                </div>
              </form>
            </div>

            {/* Loop through comments (latest comments on top) */}
            <div className="space-y-4">
              {commentsList.length > 0 ? (
                [...commentsList]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(comment => (
                  <div key={comment.id} className="bg-[#121214] border border-zinc-800 p-5 md:p-6 shadow-xs flex flex-col justify-between">
                    
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <p className="font-mono text-xs font-bold text-zinc-100">@{comment.username}</p>
                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                            Publicado: {new Date(comment.createdAt).toLocaleString('es-ES')}
                            {comment.updatedAt && (
                              <span className="text-zinc-500 text-[8px] ml-1.5">
                                (Modificado el {new Date(comment.updatedAt).toLocaleDateString('es-ES')} a las {new Date(comment.updatedAt).toLocaleTimeString('es-ES')})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Controls for owner / developer */}
                      <div className="flex items-center gap-2">
                        {comment.username === user?.name && (
                          <>
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.text);
                                setEditCommentError(null);
                              }}
                              className="text-zinc-500 hover:text-indigo-400 font-mono text-[9px] uppercase hover:underline cursor-pointer"
                            >
                              Editar
                            </button>
                            {(comment.username === user?.name || user?.isDev) && <span className="text-zinc-700">|</span>}
                          </>
                        )}
                        {(comment.username === user?.name || user?.isDev) && (
                          <button
                            onClick={() => {
                              triggerConfirm(
                                'Eliminar Comentario',
                                '¿Estás seguro que querés eliminar el comentario?',
                                () => handleDeleteComment(comment.id)
                              );
                            }}
                            className="text-zinc-500 hover:text-rose-400 font-mono text-[9px] uppercase hover:underline cursor-pointer"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="mt-4">
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingCommentText(val);
                              const textTrimmed = val.trim();
                              if (textTrimmed.length > 0 && textTrimmed.length < 100) {
                                const missing = 100 - textTrimmed.length;
                                setEditCommentError(`Faltan ${missing} caracteres para poder editar.`);
                              } else {
                                setEditCommentError(null);
                              }
                            }}
                            className="w-full bg-[#0c0c0e] border border-zinc-600 text-zinc-150 p-2 text-xs font-mono focus:outline-none rounded-none focus:ring-1 focus:ring-zinc-650"
                            rows={3}
                          />
                          {editCommentError && (
                            <p className="text-rose-400 font-mono text-[10px] font-bold">
                              ⚠️ {editCommentError}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditComment(comment.id, editingCommentText)}
                              className={`px-4 py-1 text-[10px] font-mono font-black uppercase transition-all duration-200 border ${
                                editingCommentText.trim() !== comment.text.trim()
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 ring-2 ring-emerald-300 animate-pulse font-extrabold'
                                  : 'bg-indigo-650 hover:bg-indigo-555 text-white border-indigo-700'
                              }`}
                            >
                              Guardar Cambios
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentError(null);
                              }}
                              className="bg-zinc-800 text-zinc-400 px-3 py-1 text-[10px] font-mono"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-zinc-300 text-xs md:text-sm font-sans leading-relaxed whitespace-pre-wrap font-serif italic border-l-2 border-zinc-800 pl-4 py-1">
                          “{comment.text}”
                        </p>
                      )}
                    </div>

                    {/* Replies listing */}
                    <div className="mt-6 pt-4 border-t border-zinc-850/60 space-y-4">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono uppercase">
                        <span>Respuestas ({comment.replies.length})</span>
                        
                        {replyingToCommentId !== comment.id && !editingCommentId && (
                          <button
                            onClick={() => {
                              setReplyingToCommentId(comment.id);
                              setNewReplyText('');
                            }}
                            className="text-zinc-400 hover:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer font-bold"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Agregar una respuesta
                          </button>
                        )}
                      </div>

                      {/* Replying block */}
                      {replyingToCommentId === comment.id && (
                        <div className="bg-[#161619]/60 border border-zinc-800 p-3 space-y-2 mt-2 animate-fade-in">
                          <span className="block font-mono text-[9px] text-zinc-500 uppercase">Respuesta rápida a @{comment.username}:</span>
                          <textarea
                            value={newReplyText}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewReplyText(val);
                              const textTrimmed = val.trim();
                              if (textTrimmed.length > 0 && textTrimmed.length < 100) {
                                const missing = 100 - textTrimmed.length;
                                setReplyError(`Faltan ${missing} caracteres para poder responder.`);
                              } else {
                                setReplyError(null);
                              }
                            }}
                            placeholder="Redacta tu réplica..."
                            rows={2}
                            required
                            className="w-full bg-[#0c0c0e] border border-zinc-700 text-zinc-150 p-2 text-xs font-mono focus:outline-none rounded-none focus:ring-1 focus:ring-zinc-600"
                          />
                          {replyError && (
                            <p className="text-rose-400 font-mono text-[10px] font-bold">
                              ⚠️ {replyError}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddReply(comment.id)}
                              className="bg-indigo-650 hover:bg-indigo-550 text-white px-3 py-1 text-[10px] font-mono uppercase font-bold cursor-pointer"
                            >
                              Responder
                            </button>
                            <button
                              onClick={() => {
                                setReplyingToCommentId(null);
                                setReplyError(null);
                              }}
                              className="bg-zinc-855 text-zinc-400 px-3 py-1 text-[10px] font-mono uppercase"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Replies iterations (oldest replies at the top) */}
                      {comment.replies.length > 0 && (
                        <div className="pl-4 border-l-2 border-zinc-800 space-y-4 mt-2">
                          {[...comment.replies]
                            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                            .map(reply => (
                            <div key={reply.id} className="bg-[#161619]/40 border border-zinc-845 p-3 shadow-xs rounded-none animate-fade-in">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <span className="block font-mono text-[11px] font-bold text-zinc-200">@{reply.username}</span>
                                    <span className="block text-[8px] text-zinc-550 font-mono">
                                      Respondió: {new Date(reply.createdAt).toLocaleString('es-ES')}
                                      {reply.updatedAt && (
                                        <span className="text-zinc-500 text-[8px] ml-1.5 font-bold">
                                          (Modificado el {new Date(reply.updatedAt).toLocaleDateString('es-ES')} a las {new Date(reply.updatedAt).toLocaleTimeString('es-ES')})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Controls for owner / developer / public delete */}
                                <div className="flex items-center gap-1.5 text-[8px] font-mono text-zinc-500 uppercase">
                                    {reply.username === user?.name && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingReplyId(`${comment.id}-${reply.id}`);
                                            setEditingReplyText(reply.text);
                                          }}
                                          className="hover:text-indigo-400 hover:underline cursor-pointer"
                                        >
                                          Editar
                                        </button>
                                        {(reply.username === user?.name || user?.isDev) && <span>|</span>}
                                      </>
                                    )}
                                    {(reply.username === user?.name || user?.isDev) && (
                                      <button
                                        onClick={() => {
                                          triggerConfirm(
                                            'Eliminar Respuesta',
                                            '¿Estás seguro que querés eliminar la respuesta?',
                                            () => handleDeleteReply(comment.id, reply.id)
                                          );
                                        }}
                                        className="hover:text-rose-400 hover:underline cursor-pointer font-bold"
                                      >
                                        Borrar
                                      </button>
                                    )}
                                  </div>
                              </div>

                              <div className="mt-2 pl-1">
                                {editingReplyId === `${comment.id}-${reply.id}` ? (
                                  <div className="space-y-1.5 mt-1">
                                    <textarea
                                      value={editingReplyText}
                                      onChange={(e) => setEditingReplyText(e.target.value)}
                                      className="w-full bg-[#0c0c0e] border border-zinc-650 text-zinc-150 p-2 text-xs font-mono focus:outline-none rounded-none focus:ring-1 focus:ring-zinc-600"
                                      rows={2}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditReply(comment.id, reply.id, editingReplyText)}
                                        className={`px-3 py-1 text-[9px] font-mono font-black uppercase transition-all duration-200 border ${
                                          editingReplyText.trim() !== reply.text.trim()
                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 ring-2 ring-emerald-300 animate-pulse font-extrabold'
                                            : 'bg-indigo-650 hover:bg-indigo-550 text-white border-indigo-700'
                                        }`}
                                      >
                                        Listo
                                      </button>
                                      <button
                                        onClick={() => setEditingReplyId(null)}
                                        className="bg-zinc-800 text-zinc-400 px-2.5 py-0.5 text-[9px] font-mono"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-zinc-350 text-xs font-sans leading-relaxed font-serif">
                                    {reply.text}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>

                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-[#121214] border border-zinc-800 font-mono text-xs text-zinc-500 italic leading-relaxed">
                  “¿Tienes una idea para compartir, un comentario o algo interesante que leíste y que quieres compartir con la comunidad?”
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'integrantes' ? (
          /* "TAB INTEGRANTES": Profile bios card lists */
          <div className="space-y-6 animate-fade-in text-zinc-100">
            <div className="bg-[#161619] border border-zinc-800 p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[9px] text-indigo-400 font-black tracking-widest block uppercase">CÍRCULO DE PENSADORES</span>
                <h2 className="font-sans font-black text-lg text-zinc-150 uppercase mt-1">
                  Quiénes Integran Nuestro Espacio
                </h2>
                <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-sans max-w-xl">
                  Un directorio de colaboradores para darnos a conocer y compartir una breve reseña sobre nosotros dentro del círculo.
                </p>
              </div>

              {(() => {
                const myBio = biosList.find(b => b.username === user?.name);
                return (
                  <button
                    onClick={() => {
                      if (myBio) {
                        setBioFormName(myBio.name);
                        setBioFormText(myBio.bio);
                      } else {
                        setBioFormName('');
                        setBioFormText('');
                      }
                      setShowAddBioModal(true);
                    }}
                    className="bg-indigo-650 hover:bg-indigo-550 text-white border-2 border-indigo-700 py-2.5 px-4 font-mono text-xs font-black uppercase flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] cursor-pointer"
                  >
                    {myBio ? (
                      <>
                        <Edit className="w-4 h-4" />
                        Editar mi Presentación
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Presentarme en el círculo
                      </>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* Grid of BIOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {biosList.map(bio => {
                const isMe = bio.username === user?.name;
                return (
                  <div key={bio.username} className={`bg-[#121214] border p-6 flex flex-col justify-between shadow-xs transition-all duration-150 rounded-none ${
                    isMe ? 'border-indigo-800 bg-[#161623]/20 shadow-md' : 'border-zinc-800'
                  }`}>
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-850 pb-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <h4 className="font-sans font-black text-sm text-zinc-150 uppercase leading-none font-bold">
                              {bio.name}
                            </h4>
                            <span className="font-mono text-[9px] text-zinc-550 block mt-1">
                              @{bio.username} {isMe && <span className="text-indigo-400 font-bold ml-1 tracking-wide">(TÚ)</span>}
                            </span>
                          </div>
                        </div>

                        {isMe && (
                          <button
                            onClick={() => handleDeleteBio(bio.username)}
                            className="text-zinc-500 hover:text-rose-455 hover:underline"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 font-sans text-xs">
                        <div className="pt-0.5">
                          <span className="font-mono text-[9px] uppercase tracking-wide text-zinc-550 block font-bold mb-1">Sobre mí:</span>
                          <p className="text-zinc-200 font-serif italic leading-relaxed text-sm">
                            “{bio.bio}”
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'export' ? (
          /* "EXPORTAR ATLAS" TAB: Opens dynamic print/markdown windows */
          <div className="space-y-6 animate-fade-in text-zinc-100">
            <div className="bg-[#161619] border border-zinc-800 p-5 md:p-6 shadow-sm">
              <span className="font-mono text-[9px] text-indigo-400 font-black tracking-widest block uppercase">CENTRO DE EXPORTACIÓN Y ARCHIVO</span>
              <h2 className="font-sans font-black text-lg text-zinc-150 uppercase mt-1">
                Archivar y Respaldar Conocimiento Epistémico
              </h2>
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-sans max-w-2xl">
                Compila todo el atlas de conceptos, disciplinas y cuestionarios de autoevaluación académica en un documento limpio o en copias de respaldo legibles por máquina, abriéndolos directamente en una ventana optimizada para guardar, imprimir o exportar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Compendio Markdown */}
              <div className="bg-[#121214] border border-zinc-800 p-6 flex flex-col justify-between shadow-xs hover:border-zinc-700 transition-all rounded-none">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <span className="text-lg">📥</span>
                    <h3 className="font-sans font-black text-sm uppercase text-zinc-200">
                      Compendio de Disciplinas (.md)
                    </h3>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                    Genera un único archivo Markdown completo compilando todas las disciplinas cargadas, marcos conceptuales detallados, relevancias de consenso académico y decks de autoevaluación. 
                    Optimizado con tipografía y jerarquía elegante ideal para guardar o exportar.
                  </p>
                </div>
                <div className="pt-6">
                  <button
                    onClick={openMarkdownInNewWindow}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-indigo-700 py-2 px-4 font-mono text-xs font-black uppercase text-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
                  >
                    📂 Abrir Compendio en Nueva Ventana
                  </button>
                </div>
              </div>

              {/* Respaldos JSON */}
              <div className="bg-[#121214] border border-zinc-800 p-6 flex flex-col justify-between shadow-xs hover:border-zinc-700 transition-all rounded-none">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="text-lg">📁</span>
                    <h3 className="font-sans font-black text-sm uppercase text-zinc-200">
                      Colección de Tarjetas Anki (JSON)
                    </h3>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                    Exporta la jerarquía completa de cuestionarios de autoevaluación (ánversos y réversos) de todas las áreas conceptuales en formato JSON estándar. 
                    Un formato estructurado y portátil para almacenar o importar en otras instancias.
                  </p>
                </div>
                <div className="pt-6">
                  <button
                    onClick={openAnkiJSONInNewWindow}
                    className="w-full bg-[#12231c] hover:bg-emerald-900/40 text-emerald-300 border-2 border-emerald-950 py-2 px-4 font-mono text-xs font-black uppercase text-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
                  >
                    📂 Abrir Respaldos en Nueva Ventana
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* "IMPORTAR CONCEPTOS" TAB: Structured code generator */
          <div className="space-y-6 animate-fade-in text-zinc-100">
            {/* Interactive Client-side CSV/text block uploader */}
            <CsvImporter 
              conceptsList={conceptsList}
              setConceptsList={setConceptsList}
              customTags={customTags}
              setCustomTags={setCustomTags}
              user={user}
              onRequireAuth={() => setShowAuthModal(true)}
              triggerConfirm={triggerConfirm}
              setQuotesList={setQuotesList}
              setCommentsList={setCommentsList}
            />

            <div className="bg-[#161619] border border-zinc-800 p-5 shadow-xs">
              <span className="font-mono text-[9px] text-indigo-400 font-black tracking-widest block uppercase">GUÍA DE IMPORTACIÓN AVANZADA & PARADIGMA GITOPS</span>
              <h2 className="font-sans font-black text-lg text-zinc-150 uppercase mt-1">
                Estructura de Carpetas & Script CSV Local
              </h2>
              <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed font-sans">
                El MVP del Atlas de conceptos organiza los datos intelectuales en archivos estáticos Markdown. Si deseas realizar una importación por lote o inicializar el sistema de producción en tu cuenta de GitHub Pages de forma automatizada, revisa y usa los siguientes bloques de código.
              </p>
            </div>
            
            <CodeExporter />
          </div>
        )}

      </main>

      {/* Floating Welcome Popups Overlay for general unread messages */}
      {showWelcomePopups && user && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-40 overflow-y-auto w-full h-full">
          <div className="bg-[#121214] border-2 border-zinc-700 max-w-2xl w-full shadow-[16px_16px_0px_0px_rgba(0,0,0,0.8)] animate-fade-in rounded-none p-6 md:p-8 space-y-6 my-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🧭</span>
                <div>
                  <h3 className="font-sans font-black text-xs uppercase text-zinc-100 tracking-wider">
                    Portal de Entrada al Atlas
                  </h3>
                  <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider font-bold">
                    Paso {welcomeStep} de 2 — Lectura Obligatoria
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWelcomePopups(false);
                  setWelcomeStep(1);
                }}
                className="font-mono text-[10px] uppercase font-bold bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-700 transition-all cursor-pointer"
              >
                Saltear ✕
              </button>
            </div>

            {/* Stepper Content */}
            {welcomeStep === 1 ? (
              /* Paso 1: Cita Destacada */
              <div className="space-y-5 py-2 animate-fade-in">
                <div className="space-y-1">
                  <span className="bg-indigo-950/40 text-indigo-400 font-mono text-[9px] px-2 py-0.5 border border-indigo-900/60 uppercase tracking-widest font-black inline-block">
                    Paso 1: Cita Célebre Destacada
                  </span>
                  <h4 className="font-sans font-black text-sm text-zinc-200 uppercase mt-1">
                    Un momento de contemplación antes de ingresar
                  </h4>
                </div>

                <div className="bg-[#161619] border border-zinc-800 p-6 md:p-8 flex flex-col justify-between shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 font-mono text-[70px] text-zinc-800/15 select-none leading-none font-serif">
                    “
                  </div>
                  <div className="space-y-4">
                    {quotesList[activeQuoteIndex] ? (
                      <div className="space-y-3 pt-2">
                        <p className="text-zinc-100 text-sm md:text-base italic leading-relaxed font-serif relative z-10">
                          “{quotesList[activeQuoteIndex].text}”
                        </p>
                        <p className="font-mono text-xs font-black text-[#8ba3c7] uppercase tracking-wide">
                          — {quotesList[activeQuoteIndex].author}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-650 font-mono italic">No hay frases guardadas en la base local.</p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-850 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-500">
                      Recomendado por: <strong className="text-indigo-400">@{quotesList[activeQuoteIndex]?.sharedBy || 'sistema'}</strong>
                    </span>

                    {quotesList.length > 1 && (
                      <button
                        onClick={() => {
                          const nextIdx = (activeQuoteIndex + 1) % quotesList.length;
                          setActiveQuoteIndex(nextIdx);
                        }}
                        className="bg-zinc-800 hover:bg-[#1c1c1f] text-zinc-300 px-2.5 py-1 text-[10px] font-mono flex items-center gap-1.5 border border-zinc-700 cursor-pointer font-bold transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 text-zinc-500" />
                        Rotar otra frase
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Indicators & Next Action */}
                <div className="pt-4 border-t border-zinc-850 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                    <span className="inline-block w-2.5 h-2.5 bg-zinc-800 border border-zinc-700 rounded-full"></span>
                    <span className="font-mono text-[9px] uppercase font-bold text-zinc-500 ml-1.5">Cita leída</span>
                  </div>

                  <button
                    onClick={() => setWelcomeStep(2)}
                    className="bg-indigo-650 hover:bg-indigo-555 border border-indigo-700 text-white font-mono text-xs font-black uppercase px-5 py-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] transition-all flex items-center gap-1.5"
                  >
                    Siguiente: Diálogo Reciente ➡️
                  </button>
                </div>
              </div>
            ) : (
              /* Paso 2: Primer Comentario del Heap */
              <div className="space-y-5 py-2 animate-fade-in">
                <div className="space-y-1">
                  <span className="bg-indigo-950/40 text-indigo-400 font-mono text-[9px] px-2 py-0.5 border border-indigo-900/60 uppercase tracking-widest font-black inline-block">
                    Paso 2: Diálogos Activos
                  </span>
                  <h4 className="font-sans font-black text-sm text-zinc-200 uppercase mt-1">
                    El diálogo más reciente en el Heap del Foro
                  </h4>
                </div>

                <div className="bg-[#121215] border border-zinc-800 p-6 md:p-8 flex flex-col justify-between shadow-inner relative">
                  {commentsList.length > 0 ? (
                    (() => {
                      const newest = commentsList[0];
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-400">@{newest.username}</span>
                            <span className="text-[9px] text-zinc-550 font-mono">— {new Date(newest.createdAt).toLocaleString('es-ES')}</span>
                          </div>
                          
                          <p className="text-zinc-150 text-sm md:text-base leading-relaxed italic font-serif border-l-2 border-indigo-500 pl-4 py-1">
                            “{newest.text}”
                          </p>

                          {newest.replies && newest.replies.length > 0 && (
                            <div className="bg-zinc-900/35 border border-zinc-850 p-3 mt-2">
                              <span className="block font-mono text-[8px] uppercase tracking-wider text-zinc-550 mb-1">Última respuesta:</span>
                              <p className="text-xs text-zinc-400 leading-normal italic font-serif">
                                "@{newest.replies[newest.replies.length - 1].username}": “{newest.replies[newest.replies.length - 1].text}”
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-3 pt-2 text-center py-4">
                      <p className="text-zinc-300 text-sm italic font-serif leading-relaxed">
                        “El debate es el motor de los conceptos. Actualmente no hay diálogos cargados en la base local. ¿Tenés alguna idea sugerente que el grupo deba discutir en el Atlas?”
                      </p>
                      <p className="text-[10px] text-zinc-550 font-mono uppercase font-bold tracking-wider mt-2">
                        — PODRÁS INICIAR EL PRIMER DEBATE AL INGRESAR
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress Indicators & Completed Action */}
                <div className="pt-4 border-t border-zinc-850 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="font-mono text-[9px] uppercase font-bold text-zinc-500 ml-1.5 font-bold">Listos para entrar</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWelcomeStep(1)}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-400 hover:text-zinc-200 font-mono text-xs font-black uppercase px-4 py-2 cursor-pointer transition-all"
                    >
                      ⬅️ Volver
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowWelcomePopups(false);
                        setWelcomeStep(1);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-700 text-white font-mono text-xs font-black uppercase px-5 py-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)] transition-all"
                    >
                      Ingresar al Atlas Conceptual 🚀
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Manual ADD NEW QUOTE Modal */}
      {showAddQuoteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#121214] border-2 border-zinc-700 p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] rounded-none">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-sans font-black text-xs uppercase text-zinc-150">Compartir cita célebre</h4>
              <button 
                onClick={() => setShowAddQuoteModal(false)}
                className="font-mono text-xs bg-zinc-800 border border-zinc-650 px-2.5 py-0.5 text-zinc-300 hover:bg-zinc-755"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddQuote} className="space-y-4">
              <div>
                <label className="block font-mono text-[9px] uppercase font-bold text-zinc-400 mb-1">Cuerpo de la cita:</label>
                <textarea
                  required
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  placeholder="Escribe la frase intelectual del pensador..."
                  className="w-full bg-[#0c0c0e] border border-zinc-750 p-2 text-xs font-mono text-zinc-205 focus:outline-none placeholder-zinc-700 font-serif"
                  rows={3}
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase font-bold text-zinc-400 mb-1">Autor de la cita:</label>
                <input
                  type="text"
                  required
                  value={newQuoteAuthor}
                  onChange={(e) => setNewQuoteAuthor(e.target.value)}
                  placeholder="e.g. Karl Popper"
                  className="w-full bg-[#0c0c0e] border border-zinc-750 p-1.5 text-xs font-mono text-zinc-200 focus:outline-none placeholder-zinc-700 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddQuoteModal(false)}
                  className="flex-1 border border-zinc-700 py-1.5 font-mono text-xs uppercase text-zinc-350 bg-zinc-800 hover:bg-zinc-700 rounded-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white hover:bg-indigo-550 border border-indigo-700 py-1.5 font-mono text-xs uppercase font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] cursor-pointer"
                >
                  Guardar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual ADD NEW BIO Modal */}
      {showAddBioModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#121214] border-2 border-zinc-700 p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] rounded-none">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-sans font-black text-xs uppercase text-zinc-150">Mi Presentación Comunitaria</h4>
              <button 
                onClick={() => setShowAddBioModal(false)}
                className="font-mono text-xs bg-zinc-800 border border-zinc-650 px-2.5 py-0.5 text-zinc-300 hover:bg-zinc-750"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBio} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[9px] uppercase font-bold text-zinc-400 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={bioFormName}
                  onChange={(e) => setBioFormName(e.target.value)}
                  placeholder="Javier Krick"
                  className="w-full bg-[#0c0c0e] border border-zinc-750 p-2 text-xs font-mono text-zinc-200 focus:outline-none placeholder-zinc-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-zinc-400 mb-1">Breve Biografía / Sobre mí:</label>
                <textarea
                  required
                  value={bioFormText}
                  onChange={(e) => setBioFormText(e.target.value)}
                  placeholder="Cuéntanos un poco sobre tus motivaciones en el Atlas..."
                  className="w-full bg-[#0c0c0e] border border-zinc-750 p-2 text-xs font-mono text-zinc-240 focus:outline-none placeholder-zinc-700 font-serif"
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddBioModal(false)}
                  className="flex-1 border border-zinc-700 py-1.5 font-mono text-xs uppercase text-zinc-350 bg-zinc-800 hover:bg-zinc-700 rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white hover:bg-indigo-550 border border-indigo-700 py-1.5 font-mono text-xs uppercase font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] cursor-pointer"
                >
                  Confirmar Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render authorization overlay in the background when active */}
      {renderAuthModal()}
      {renderConfirmModal()}
      
      {/* Create Concept Form modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto w-full">
          <div className="bg-[#121214] border-2 border-zinc-700 p-6 max-w-xl w-full my-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.6)] animate-fade-in rounded-none">
            
            <div className="flex justify-between items-start border-b border-zinc-850 pb-3 mb-4">
              <div>
                <h3 className="font-sans font-black text-md uppercase text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Nuevo Concepto en #{selectedTag}
                </h3>
                <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Carga de metadatos estructurales de forma ágil</span>
              </div>
              
              <button 
                onClick={() => setShowAddModal(false)}
                className="font-mono text-xs bg-zinc-805 border border-zinc-650 px-2 py-1 text-zinc-300 hover:bg-zinc-750"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateConceptSubmit} className="space-y-4">
              
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  Título del Concepto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Dualidad Onda-Partícula"
                  className="w-full bg-[#0c0c0e] border border-zinc-700 py-2 px-3 text-xs font-mono text-zinc-150 focus:outline-none placeholder-zinc-650 rounded-none focus:ring-1 focus:ring-zinc-600 font-bold"
                  autoFocus
                />
              </div>

              {/* Requirement: Select Tier level */}
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
                  Asignar Tier de Relevancia <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((tierNum) => {
                    const isSelected = newInitialTier === tierNum;
                    return (
                      <button
                        type="button"
                        key={tierNum}
                        onClick={() => setNewInitialTier(tierNum as 1 | 2 | 3)}
                        className={`py-2 px-3 border transition-all text-xs font-mono text-center flex flex-col justify-between h-13 rounded-none ${
                          isSelected 
                            ? 'bg-zinc-800 text-zinc-101 border-zinc-550 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]'
                            : 'bg-[#0c0c0e] text-zinc-400 border-zinc-750 hover:bg-zinc-900'
                        }`}
                      >
                        <span className="text-[10px] block text-left">Tier {tierNum}</span>
                        <span className="text-[8px] text-zinc-500 uppercase text-right leading-none self-end">
                          {tierNum === 1 ? 'Central' : tierNum === 2 ? 'Derivado' : 'Periférico'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description field - now requested to be optional */}
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  Descripción Breve (Opcional):
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Comportamiento doble de los objetos cuánticos..."
                  className="w-full bg-[#0c0c0e] border border-zinc-700 py-2 px-3 text-xs font-mono text-zinc-150 focus:outline-none placeholder-zinc-650 rounded-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              {/* Research markdown content optional */}
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-[#a0a0a5] mb-1">
                  Cuerpo de Investigación (Markdown - Opcional):
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  placeholder="Escribe la explicación usando Markdown o LaTeX simplificado..."
                  className="w-full bg-[#0c0c0e] border border-zinc-700 text-zinc-150 p-2.5 text-xs font-mono focus:outline-none placeholder-zinc-650 rounded-none focus:ring-1 focus:ring-zinc-600"
                />
              </div>

              {/* Optional Anki card */}
              <div className="border border-zinc-800 p-3 bg-[#161619] space-y-2">
                <span className="block font-mono text-[10px] uppercase font-bold text-zinc-350 font-mono">Flashcard interactiva Anki (Opcional):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[8px] font-mono font-medium text-zinc-550 mb-0.5 font-bold font-mono">PREGUNTA:</span>
                    <input 
                      type="text"
                      value={ankiQ1}
                      onChange={(e) => setAnkiQ1(e.target.value)}
                      placeholder="e.g. ¿Quién lo propuso?"
                      className="w-full bg-[#0c0c0e] border border-zinc-705 py-1.5 px-2 text-[11px] font-mono text-zinc-150 placeholder-zinc-650 focus:outline-none rounded-none"
                    />
                  </div>
                  <div>
                    <span className="block text-[8px] font-mono font-medium text-zinc-550 mb-0.5 font-bold font-mono">RESPUESTA:</span>
                    <input 
                      type="text"
                      value={ankiA1}
                      onChange={(e) => setAnkiA1(e.target.value)}
                      placeholder="Louis de Broglie en 1924."
                      className="w-full bg-[#0c0c0e] border border-zinc-705 py-1.5 px-2 text-[11px] font-mono text-zinc-150 placeholder-zinc-650 focus:outline-none rounded-none"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-350 py-2 border border-zinc-700 font-mono text-xs font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-640 hover:bg-indigo-500 text-white py-2 border border-indigo-700 font-mono text-xs font-bold uppercase rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)] cursor-pointer"
                >
                  Confirmar & Guardar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Clean minimal brutalist footer */}
      <footer className="border-t border-zinc-850 bg-[#121214] py-8 px-4 shrink-0 text-zinc-400 font-mono text-center text-[11px]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🧭 ATLAS DE CONCEPTOS</span>
        </div>
      </footer>

    </div>
  );
}
