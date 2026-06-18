import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Copy, 
  Check, 
  Play, 
  Combine,
  HelpCircle
} from 'lucide-react';
import { Concept, AnkiCard } from '../types';

interface CsvImporterProps {
  conceptsList: Concept[];
  setConceptsList: (concepts: Concept[]) => void;
  customTags: string[];
  setCustomTags: (tags: string[]) => void;
  user: any;
  onRequireAuth: () => void;
  triggerConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
    requiredText?: string,
    hideHint?: boolean
  ) => void;
}

interface TempParsedConcept {
  title: string;
  tags: string[];
  tier: 1 | 2 | 3;
  isExisting: boolean;
  existingId?: string;
  originalConcept?: Concept;
}

export function CsvImporter({ 
  conceptsList, 
  setConceptsList, 
  customTags, 
  setCustomTags,
  user,
  onRequireAuth,
  triggerConfirm
}: CsvImporterProps) {
  const [pasteText, setPasteText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [importSource, setImportSource] = useState<'file' | 'paste'>('file');
  
  // Parsed results preview state
  const [parsedItems, setParsedItems] = useState<TempParsedConcept[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearAllDatabase = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!user.isDev) {
      setErrorMsg('❌ Solo un desarrollador registrado puede purgar los datos locales.');
      return;
    }
    if (triggerConfirm) {
      triggerConfirm(
        'Purgar Base de Datos Local',
        '⚠️ ATENCIÓN: Esta acción purgará de forma definitiva y permanente todos los conceptos, disciplinas y configuraciones guardados en el navegador local para comenzar con un lienzo completamente en blanco.',
        () => {
          setConceptsList([]);
          localStorage.setItem('user-atlas-concepts', JSON.stringify([]));
          setCustomTags([]);
          localStorage.setItem('custom-atlas-tags', JSON.stringify([]));
          setParsedItems([]);
          setSuccessMsg('✓ Se han purgado con éxito todos los conceptos y disciplinas pre-cargados localmente. Ahora puedes importar tu archivo CSV desde cero de manera limpia.');
          setErrorMsg(null);
        },
        'Estoy dispuesto a purgar todos los datos.',
        true // Hide hint
      );
    } else {
      const typedValue = window.prompt(
        '⚠️ ATENCIÓN: Esta acción purgará de forma definitiva y permanente todos los conceptos, disciplinas y configuraciones guardados en el navegador local para comenzar con un lienzo en blanco.\n\nPor favor, introduce la frase de confirmación exacta para validar la purga:'
      );
      if (typedValue === 'Estoy dispuesto a purgar todos los datos.') {
        setConceptsList([]);
        localStorage.setItem('user-atlas-concepts', JSON.stringify([]));
        setCustomTags([]);
        localStorage.setItem('custom-atlas-tags', JSON.stringify([]));
        setParsedItems([]);
        setSuccessMsg('✓ Se han purgado con éxito todos los conceptos y disciplinas pre-cargados localmente. Ahora puedes importar tu archivo CSV desde cero de manera limpia.');
        setErrorMsg(null);
      } else if (typedValue !== null) {
        setErrorMsg('❌ La frase de confirmación introducida no es correcta. No se han purgado los datos locales.');
        setSuccessMsg(null);
      }
    }
  };

  // Parse CSV/Pipe text content
  const processRawText = (text: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setErrorMsg('El contenido está vacío o no contiene líneas válidas.');
      return;
    }

    // Dynamic delimiter detection
    let pipeCount = 0;
    let commaCount = 0;
    let semicolonCount = 0;
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      if (lines[i].includes('|')) pipeCount++;
      if (lines[i].includes(',')) commaCount++;
      if (lines[i].includes(';')) semicolonCount++;
    }

    let delimiter = '|';
    if (commaCount > pipeCount && commaCount > semicolonCount) {
      delimiter = ',';
    } else if (semicolonCount > pipeCount && semicolonCount > commaCount) {
      delimiter = ';';
    }

    const parseLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Fast check for columns header and skip
    let hasHeader = false;
    const firstRowParsed = parseLine(lines[0]);
    if (
      firstRowParsed.some(col => /concepto|title/i.test(col)) ||
      firstRowParsed.some(col => /disciplina|tag|tier/i.test(col))
    ) {
      hasHeader = true;
    }

    const startIdx = hasHeader ? 1 : 0;
    const recordsMap = new Map<string, { title: string; tags: Set<string>; tiers: Set<number> }>();

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = parseLine(line).map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length === 0 || !cols[0]) continue;

      let rawTitle = cols[0];
      let rawTier = '';
      let rawTag = '';

      if (delimiter === '|') {
        // Concepto | Tier | Disciplina
        if (cols.length >= 3) {
          rawTier = cols[1];
          rawTag = cols[2];
        } else if (cols.length === 2) {
          rawTag = cols[1];
        }
      } else {
        // Commas/Semicolons might be classic headers-based or assume standard
        if (hasHeader) {
          const conceptIdx = firstRowParsed.findIndex(h => /concepto|title/i.test(h));
          const tagsIdx = firstRowParsed.findIndex(h => /tags|disciplina/i.test(h));
          const tierIdx = firstRowParsed.findIndex(h => /tier/i.test(h));

          rawTitle = conceptIdx !== -1 && cols[conceptIdx] ? cols[conceptIdx] : cols[0];
          rawTag = tagsIdx !== -1 && cols[tagsIdx] ? cols[tagsIdx] : (cols[2] || cols[1] || '');
          rawTier = tierIdx !== -1 && cols[tierIdx] ? cols[tierIdx] : (cols[1] || '');
        } else {
          if (cols.length >= 3) {
            rawTier = cols[1];
            rawTag = cols[2];
          } else if (cols.length === 2) {
            rawTag = cols[1];
          }
        }
      }

      if (!rawTitle || rawTitle.toLowerCase() === 'concepto' || rawTitle.toLowerCase() === 'title') {
        continue;
      }

      // Slug for deduplication / comparison
      const slug = rawTitle
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!slug) continue;

      if (!recordsMap.has(slug)) {
        recordsMap.set(slug, {
          title: rawTitle,
          tags: new Set<string>(),
          tiers: new Set<number>()
        });
      }

      const entry = recordsMap.get(slug)!;

      // Classify single or multiple tags
      if (rawTag) {
        const parsedTags = rawTag.split(/[;,]/).map(t => t.trim()).filter(t => t.length > 0);
        parsedTags.forEach(t => entry.tags.add(t));
      }

      // Parse tier number
      if (rawTier) {
        const match = rawTier.match(/\d+/);
        if (match) {
          const tierNum = parseInt(match[0], 10);
          if (tierNum >= 1 && tierNum <= 3) {
            entry.tiers.add(tierNum);
          }
        }
      }
    }

    if (recordsMap.size === 0) {
      setErrorMsg('No se encontraron registros de conceptos legibles en el formato solicitado.');
      setParsedItems([]);
      return;
    }

    // Convert parsed records map to preview array
    const compiledPreviews: TempParsedConcept[] = [];
    
    // Compare with current conceptsList (match by slug or exact title fallback)
    const getSlug = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const existingSlugsMap = new Map<string, Concept>();
    conceptsList.forEach(c => {
      existingSlugsMap.set(getSlug(c.title), c);
      existingSlugsMap.set(c.id, c);
    });

    recordsMap.forEach((data, slug) => {
      const existing = existingSlugsMap.get(slug);
      let tierVal: 1 | 2 | 3 = 2;
      if (data.tiers.size > 0) {
        tierVal = Math.min(...Array.from(data.tiers)) as 1 | 2 | 3;
      }

      compiledPreviews.push({
        title: data.title,
        tags: Array.from(data.tags),
        tier: tierVal,
        isExisting: !!existing,
        existingId: existing?.id,
        originalConcept: existing
      });
    });

    setParsedItems(compiledPreviews);
    setSuccessMsg(`✓ Procesados con éxito: se leyeron ${compiledPreviews.length} conceptos listos para revisión.`);
  };

  // Click & Drag-Drop file handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processRawText(text);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Error al leer el archivo seleccionado.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processRawText(text);
      }
    };
    reader.readAsText(file);
  };

  // Reset current upload session
  const clearCurrentDraft = () => {
    setParsedItems([]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setFileName(null);
    setPasteText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Implement the merge back into local state and cache
  const handleConfirmImport = () => {
    if (!user) {
      onRequireAuth();
      return;
    }

    if (parsedItems.length === 0) return;

    const currentList = [...conceptsList];
    const nextCustomTags = [...customTags];

    let mergedCount = 0;
    let addedCount = 0;

    parsedItems.forEach(item => {
      // Add disciplines/tags to custom list if they aren't already included
      item.tags.forEach(tag => {
        if (!nextCustomTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
          nextCustomTags.push(tag);
        }
      });

      if (item.isExisting && item.existingId) {
        // Merge into existing concept
        const idx = currentList.findIndex(c => c.id === item.existingId);
        if (idx !== -1) {
          const original = currentList[idx];
          
          // Merge tags intelligently
          const mergedTags = [...original.tags];
          item.tags.forEach(tag => {
            if (!mergedTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
              mergedTags.push(tag);
            }
          });

          // Set tier (take the minimum representing highest importance, or imported tier)
          const finalTier = Math.min(original.defaultTier, item.tier) as 1 | 2 | 3;

          currentList[idx] = {
            ...original,
            tags: mergedTags,
            defaultTier: finalTier
          };
          mergedCount++;
        }
      } else {
        // Create new concept completely
        const id = `concept-${Math.random().toString(36).substring(2, 11)}`;
        const freshConcept: Concept = {
          id,
          title: item.title,
          description: `Concepto de la disciplina ${item.tags.join(', ') || 'General'}.`,
          content: `## ${item.title}\n\nEspacio para la investigación detallada sobre **${item.title}**.\n\nForma parte de las áreas de estudio de: ${item.tags.map(t => '#' + t).join(' ')}.`,
          tags: item.tags.length > 0 ? item.tags : ['General'],
          anki: [
            {
              id: `card-${id}-0`,
              front: `¿Cuál es el significado o tesis central de "${item.title}"?`,
              back: `Escribe o graba aquí la respuesta clave de autocomprobación de memoria.`,
              likes: []
            }
          ],
          defaultTier: item.tier
        };
        currentList.push(freshConcept);
        addedCount++;
      }
    });

    // Save changes to current state & local storage
    setConceptsList(currentList);
    localStorage.setItem('user-atlas-concepts', JSON.stringify(currentList));

    setCustomTags(nextCustomTags);
    localStorage.setItem('custom-atlas-tags', JSON.stringify(nextCustomTags));

    setSuccessMsg(`🚀 ¡Importación Exitosa! Se agregaron ${addedCount} conceptos nuevos y se actualizaron/fusionaron ${mergedCount} conceptos de forma inmediata.`);
    setParsedItems([]);
    setFileName(null);
    setPasteText('');
  };

  return (
    <div className="bg-[#121214] border border-zinc-805 p-5 md:p-6 shadow-sm space-y-6">
      
      {/* Header and description of rules */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400">
            <FileSpreadsheet className="w-5 h-5" />
            <h3 className="font-sans font-black text-sm uppercase text-zinc-200 tracking-wider">
              Cargador e Importador de Datos CSV / Pipe
            </h3>
          </div>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed font-sans">
            Sube tus archivos delimitados de conceptos o pega el texto directamente. El sistema unifica de forma inteligente los conceptos repetidos combinando sus disciplinas y preservando el nivel de prioridad de Tier más central. 
            <span className="text-emerald-400 font-bold block mt-1">✓ Nota: La importación se realiza de forma aditiva y segura, por lo que NO borrará tus conceptos ni disciplinas previos.</span>
          </p>
      </div>
      
      {user?.isDev && (
        <button
          onClick={handleClearAllDatabase}
          type="button"
          className="shrink-0 bg-rose-950/30 hover:bg-rose-900 hover:text-white text-rose-400 border border-rose-800/60 font-mono text-[10px] uppercase font-bold px-3 py-1.5 transition-all text-center cursor-pointer"
        >
          🗑️ Purgar Datos Locales (Vaciar Atlas)
        </button>
      )}
    </div>

      {/* Format guidelines box */}
      <div className="bg-[#161619] border border-dashed border-zinc-800 p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-amber-500 font-mono text-[10px] uppercase font-bold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Estructura de Formatos Compatibles</span>
        </div>
        <div className="text-[11px] font-mono text-zinc-400 space-y-2 leading-relaxed">
          <p>
            El archivo puede contener o no una fila de encabezados. Cada registro debe seguir la estructura:
          </p>
          <div className="bg-[#0c0c0e] p-2.5 border border-zinc-900 rounded-none text-zinc-300 font-semibold text-[10px] select-all">
            Concepto | Tier en Disciplina | Disciplina
          </div>
          <p className="text-zinc-500 text-[10px]">
            💡 Ejercicios de ejemplo válidos con pipes, comas o punto y coma:<br />
            <code className="text-indigo-300">Memética|Tier 2|Thinking Toolbox</code><br />
            <code className="text-indigo-300">Teorema de Noether (simetría/invarianza)|Tier 1|Física Fundamental</code>
          </p>
        </div>
      </div>

      {/* Toggle method */}
      <div className="flex border-b border-zinc-800 font-mono text-[11px] uppercase font-bold">
        <button
          onClick={() => { setImportSource('file'); setErrorMsg(null); }}
          className={`px-4 py-2 border-t-2 border-x border-zinc-800 -mb-[1px] transition-all cursor-pointer ${
            importSource === 'file' 
              ? 'bg-[#121214] text-indigo-400 border-t-indigo-500 border-x-zinc-800 font-black' 
              : 'text-zinc-550 border-t-transparent border-x-transparent hover:text-zinc-300'
          }`}
        >
          📁 Cargar Archivo .csv / .txt
        </button>
        <button
          onClick={() => { setImportSource('paste'); setErrorMsg(null); }}
          className={`px-4 py-2 border-t-2 border-x border-zinc-800 -mb-[1px] transition-all cursor-pointer ${
            importSource === 'paste' 
              ? 'bg-[#121214] text-indigo-400 border-t-indigo-500 border-x-zinc-800 font-black' 
              : 'text-zinc-550 border-t-transparent border-x-transparent hover:text-zinc-300'
          }`}
        >
          ✏️ Pegar Bloque de Texto
        </button>
      </div>

      {/* Upload Zone */}
      {importSource === 'file' ? (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed py-8 px-4 text-center cursor-pointer transition-all ${
            isDragOver 
              ? 'border-indigo-500 bg-indigo-505/10 text-zinc-100 shadow-[0px_0px_12px_rgba(99,102,241,0.2)]' 
              : 'border-zinc-800 bg-[#0c0c0e] hover:border-zinc-700 text-zinc-400'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.txt"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="bg-zinc-900 border border-zinc-705 p-3 rounded-none text-zinc-300">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            {fileName ? (
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-zinc-200 uppercase tracking-wide">
                  📄 {fileName}
                </p>
                <p className="text-[10px] text-indigo-400 font-mono">
                  Haz click o arrastra para reemplazar este archivo
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold font-sans text-zinc-300">
                  Arrastra tu archivo CSV o haz click para explorar
                </p>
                <p className="text-[9.5px] font-mono text-zinc-550 uppercase">
                  Formatos soportados: .csv, .txt (Delimitado por "|" o ",")
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Memética|Tier 2|Thinking Toolbox&#10;Teorema de Noether (simetría/invarianza)|Tier 1|Física Fundamental&#10;Retroalimentación|Tier 2|Thinking Toolbox`}
            className="w-full h-40 bg-[#0c0c0e] border border-zinc-800 p-3 font-mono text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-505 resize-none h-[180px] leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              onClick={() => processRawText(pasteText)}
              disabled={!pasteText.trim()}
              className={`font-mono text-xs font-bold uppercase py-2 px-4 flex items-center gap-1.5 cursor-pointer transition-all ${
                pasteText.trim()
                  ? 'bg-indigo-650 hover:bg-indigo-555 text-white border border-indigo-700'
                  : 'bg-zinc-900 text-zinc-650 border border-zinc-850 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              Procesar Texto Pegado
            </button>
          </div>
        </div>
      )}

      {/* Notifications / Feedback messages */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800/60 p-4 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs font-mono text-rose-300 leading-relaxed">
            {errorMsg}
          </p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs font-sans text-emerald-300 leading-relaxed">
            {successMsg}
          </p>
        </div>
      )}

      {/* Preview Section & Action confirmation */}
      {parsedItems.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-zinc-850">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-sans font-black text-xs text-zinc-200 uppercase tracking-widest block">
                VISTA PREVIA DE IMPORTACIÓN
              </h4>
              <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
                Revisa los conflictos y actualizaciones antes de guardar definitivamente.
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCurrentDraft}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 font-mono text-[10px] uppercase font-bold px-3 py-1.5 cursor-pointer"
              >
                Limpiar todo
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-black uppercase px-4 py-1.5 border border-indigo-500 shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Confirmar Importación
              </button>
            </div>
          </div>

          {/* Grid/List of Parsed Records */}
          <div className="max-h-[300px] overflow-y-auto border border-zinc-805 bg-[#0a0a0c] p-2 space-y-1.5 divide-y divide-zinc-900">
            {parsedItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 py-2 px-1 text-[11px] font-mono">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-100 font-bold truncate block">{item.title}</span>
                    <span className="text-amber-500 text-[10px] shrink-0 font-bold">
                      (Tier {item.tier})
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.tags.map(t => (
                      <span key={t} className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0">
                  {item.isExisting ? (
                    <span 
                      title="Este concepto ya existe en la base. Sus temas/disciplinas se acoplarán, y se conservará el Tier de mayor precedencia." 
                      className="text-[9.5px] uppercase font-bold text-amber-400 bg-amber-950/20 border border-amber-900 px-2 py-0.5 inline-flex items-center gap-1"
                    >
                      <Combine className="w-3 h-3" />
                      Fusión
                    </span>
                  ) : (
                    <span 
                      title="Concepto nuevo. Se añadirá directamente en las disciplinas correspondientes."
                      className="text-[9.5px] uppercase font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900 px-2 py-0.5 inline-flex tracking-wider"
                    >
                      ✓ Nuevo
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
