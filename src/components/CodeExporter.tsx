import React, { useState } from 'react';
import { 
  DELIVERABLE_FOLDER_STRUCTURE, 
  DELIVERABLE_YAML_FRONTMATTER, 
  DELIVERABLE_SUPABASE_SQL, 
  DELIVERABLE_CSV_SCRIPT,
  DELIVERABLE_DEPLOY_STEPS
} from '../data';
import { Copy, Check, FileText, Code, Database, Compass, ArrowRight, FolderKanban } from 'lucide-react';

export const CodeExporter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'folders' | 'import-script' | 'frontmatter' | 'sql' | 'deploy'>('import-script');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tabs = [
    { id: 'import-script', label: 'Script de Importación CSV', icon: Code, content: DELIVERABLE_CSV_SCRIPT, filename: 'scripts/import-csv.js' },
    { id: 'frontmatter', label: 'Esquema Frontmatter (YAML)', icon: FileText, content: DELIVERABLE_YAML_FRONTMATTER, filename: 'src/content/conceptos/ejemplo.md' },
    { id: 'sql', label: 'Esquema de Supabase (SQL)', icon: Database, content: DELIVERABLE_SUPABASE_SQL, filename: 'supabase/schema.sql' },
    { id: 'folders', label: 'Estructura de Carpetas', icon: FolderKanban, content: DELIVERABLE_FOLDER_STRUCTURE, filename: 'Estructura de Directorios' },
  ];

  return (
    <div className="bg-[#161619] border-2 border-zinc-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]" id="deliverables-exporter">
      <div className="border-b-2 border-zinc-800 pb-4 mb-6">
        <span className="font-mono text-xs font-bold text-indigo-400 uppercase tracking-widest block">DOCUMENTACIÓN Y ARQUITECTURA</span>
        <h3 className="font-sans font-black text-2xl text-zinc-100 uppercase">
          Entregables del Arquitecto Jamstack
        </h3>
        <p className="text-zinc-400 text-sm mt-1">
          Navega, copia y ejecuta directamente el código y los scripts configurados para este MVP robusto.
        </p>
      </div>

      {/* Main navigation menu for documents */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 border-2 font-mono text-xs font-bold uppercase transition-all duration-150 rounded-none flex items-center gap-1.5 ${
                isActive 
                  ? 'bg-[#4f46e5] text-zinc-100 border-zinc-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] translate-x-[1px] translate-y-[1px]' 
                  : 'bg-[#1e1e24] text-zinc-300 border-zinc-700 hover:bg-[#25252b]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
        
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-4 py-2 border-2 font-mono text-xs font-bold uppercase transition-all duration-150 rounded-none flex items-center gap-1.5 ${
            activeTab === 'deploy' 
              ? 'bg-[#e11d48] text-white border-zinc-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]' 
              : 'bg-[#1a1215] text-rose-400 border-[#e11d48]/40 hover:bg-[#20151a]'
          }`}
        >
          <Compass className="w-4 h-4" />
          Guía de Despliegue (Static CD)
        </button>
      </div>

      <div className="border-2 border-zinc-800 bg-[#121214] p-4 rounded-none">
        {activeTab !== 'deploy' ? (
          <div>
            {/* Header info bar of the selected file */}
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-zinc-800 font-mono text-xs font-medium">
              <span className="bg-[#1e1e24] border border-zinc-700 px-3 py-1 text-zinc-200 text-[11px] font-bold">
                📄 {tabs.find(t => t.id === activeTab)?.filename}
              </span>
              
              <button
                onClick={() => {
                  const currentContent = tabs.find(t => t.id === activeTab)?.content || '';
                  copyToClipboard(currentContent, activeTab);
                }}
                className="bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 px-3 py-1.5 font-mono text-xs font-bold flex items-center gap-1.5 transition-all duration-150"
              >
                {copiedId === activeTab ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">¡COPIADO!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>COPIAR</span>
                  </>
                )}
              </button>
            </div>

            {/* Special explainer text for that active tab */}
            {activeTab === 'import-script' && (
              <div className="bg-amber-950/20 border border-amber-800/40 p-3 mb-3 font-sans text-xs text-amber-200 leading-relaxed">
                ℹ️ <strong>Modo de Uso Local:</strong> Guarda este script en <code>scripts/import-csv.js</code>. Crea un archivo <code>import.csv</code> en el directorio raíz. Ejecuta la sentencia <code>node scripts/import-csv.js import.csv</code>. El script lee el archivo, limpia acentos para generar slugs correctos, comprueba la existencia para no sobreescribir tus commits, y genera los archivos Markdown listos para ser versionados en Git con Frontmatter YAML correcto.
              </div>
            )}
            
            {activeTab === 'sql' && (
              <div className="bg-[#0f2d1e]/40 border border-[#10b981]/30 p-3 mb-3 font-sans text-xs text-emerald-300 leading-relaxed">
                ℹ️ <strong>Políticas de Seguridad Supabase (RLS):</strong> Copia este código SQL en el editor del panel de control de Supabase (SQL Editor). Crea los índices óptimos para la lectura en tiempo real y protege las operaciones de escritura asegurando que solo el usuario autenticado con GitHub pueda alterar o borrar sus propios registros.
              </div>
            )}

            {activeTab === 'frontmatter' && (
              <div className="bg-[#1e1b4b]/40 border border-[#6366f1]/30 p-3 mb-3 font-sans text-xs text-indigo-300 leading-relaxed">
                ℹ️ <strong>Estructura Frontmatter YAML:</strong> Describe los metadatos de clasificación taxonómica en el encabezado. Las tarjetas Anki se estructuran como una lista anidada en el YAML, permitiendo que la UI renderice e implemente metodologías Flashcard de repetición espaciada directamente desde los archivos planos de contenido.
              </div>
            )}

            {/* Code markup rendering */}
            <pre className="overflow-x-auto text-xs font-mono bg-[#0c0c0e] text-zinc-300 p-4 border border-zinc-900 font-medium max-h-[400px] leading-relaxed">
              <code>{tabs.find(t => t.id === activeTab)?.content}</code>
            </pre>
          </div>
        ) : (
          /* Detailed deploy guidelines view */
          <div className="space-y-6 py-2">
            <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 font-sans text-xs text-amber-200 leading-relaxed">
              ⚠️ <strong>Paradigma GitOps:</strong> El MVP utiliza un flujo automatizado estático. Nadie escribe directamente en la web de producción; el contenido se actualiza cuando un investigador propone un Pull Request en tu repositorio de GitHub, y la GitHub Action ejecuta de forma segura el empaquetado para Pages.
            </div>

            <div className="space-y-4">
              {DELIVERABLE_DEPLOY_STEPS.map((step, idx) => (
                <div key={idx} className="border-l-3 border-[#rose-500] pl-4 space-y-1">
                  <h4 className="font-sans font-black text-sm text-zinc-100 flex items-center gap-1.5 uppercase">
                    <span className="bg-rose-600 text-zinc-100 w-5 h-5 flex items-center justify-center font-mono text-[11px] font-bold rounded-none">
                      {idx + 1}
                    </span>
                    {step.title}
                  </h4>
                  <p className="text-zinc-400 text-xs font-sans leading-relaxed">
                    {step.desc}
                  </p>

                  {step.code && (
                    <div className="relative mt-2">
                      <pre className="bg-[#0c0c0e] text-zinc-300 p-3 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-900">
                        <code>{step.code}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(step.code || '', `step-${idx}`)}
                        className="absolute top-2 right-2 bg-zinc-800 text-zinc-300 hover:text-zinc-50 p-1 text-[10px] font-mono border border-zinc-700 flex items-center gap-1"
                      >
                        {copiedId === `step-${idx}` ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  )}

                  {step.steps && (
                    <ul className="bg-[#161619] border border-zinc-800 p-3 text-xs text-zinc-300 font-sans list-none space-y-1.5 mt-2">
                      {step.steps.map((sub, sidx) => (
                        <li key={sidx} className="flex gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
