import { Concept } from "./types";

export const INITIAL_CONCEPTS: Concept[] = [];

// Delivering exact source codes requested by the user
export const DELIVERABLE_FOLDER_STRUCTURE = `atlas-conceptos/
├── astro.config.mjs           # Configuración de Astro / Integración con React
├── package.json               # Dependencias del proyecto (Astro, React, Supabase)
├── tailwind.config.cjs        # Ajustes de diseño y fuentes del estilo Brutalista
├── tsconfig.json              # Configuración de tipado TypeScript
├── public/                    # Archivos estáticos e imágenes del sitio
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro       # Plantilla base (HTML, Head, Fonts, Dark Mode)
│   ├── content/
│   │   ├── config.ts          # Definición de Esquemas de Contenido (Content Collections)
│   │   └── conceptos/         # Base de datos colaborativa en archivos Markdown (.md)
│   │       ├── entropia.md
│   │       ├── teorema-godel.md
│   │       └── panoptico.md
│   ├── pages/
│   │   ├── index.astro        # Home: Buscador global y lista de disciplinas
│   │   ├── tags/
│   │   │   └── [tag].astro   # Generación dinámica estática de conceptos por Tag
│   │   └── conceptos/
│   │       └── [slug].astro  # Renderizador estático de Markdown + Tarjetas Anki + Voto
│   ├── components/
│   │   ├── SearchGlobal.tsx   # Buscador interactivo basado en Fuse.js
│   │   ├── AnkiFlipCard.tsx   # Tarjeta interactiva de memorización de Anki (React CSS Flip)
│   │   └── VotingTier.tsx     # Widget interactivo conectado a la API de Supabase
│   └── lib/
│       └── supabaseClient.ts  # Cliente de conexión directa para el micro-backend
└── scripts/
    └── import-csv.js          # SCRIPT DE DESARROLLO (Node.js) de importación masiva v2`;

export const DELIVERABLE_YAML_FRONTMATTER = `---
title: "Teoremas de Incompletitud de Gödel"
description: "Demostración matemática de los límites lógicos de cualquier sistema formal axiomático consistente."
tags: ["Matemáticas", "Lógica", "Filosofía"]
anki:
  - front: "¿Qué postula resumidamente el Primer Teorema de Incompletitud de Gödel?"
    back: "Que en todo sistema axiomático formal consistente y lo suficientemente potente, existen verdades que no son demostrables dentro del sistema."
  - front: "¿Cuándo se publicaron los Teoremas de Incompletitud y por quién?"
    back: "Fueron publicados en 1931 por el matemático austríaco Kurt Gödel."
---

Aquí va el contenido extendido del concepto escrito directamente en **Markdown clásico**.
Este bloque se lee dinámicamente y se renderiza en la web utilizando markdown integrado.

### Implicaciones Intelectuales
* **Límites de la Computación:** Hay problemas de decisión que son intrínsecamente indecidibles.
* **Filosofía Kantiana:** Esboza los límites absolutos de la razón formal humana.`;

export const DELIVERABLE_SUPABASE_SQL = `-- 1. Creación de la tabla de votos de centralidad (Tiers)
CREATE TABLE public.concept_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id VARCHAR(100) NOT NULL,
    tag_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_value INT NOT NULL CHECK (tier_value IN (1, 2, 3)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Un usuario solo puede emitir un voto de centralidad por cada concepto-disciplina específico
    CONSTRAINT unique_concept_tag_user UNIQUE (concept_id, tag_id, user_id)
);

-- 2. Habilitar Row Level Security (RLS) en la tabla para asegurar los accesos
ALTER TABLE public.concept_votes ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas RLS (Row Level Security)

-- Política 1: Lectura Pública de Votos (Todos pueden ver los votos para calcular medianas)
CREATE POLICY "Permitir lectura pública de votos" 
ON public.concept_votes 
FOR SELECT 
USING (true);

-- Política 2: Inserción de Votos (Solo usuarios autenticados con GitHub pueden votar como ellos mismos)
CREATE POLICY "Permitir inserción de votos a autenticados" 
ON public.concept_votes 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Política 3: Modificación del voto propio (Solo el dueño del voto puede cambiar de tier)
CREATE POLICY "Permitir actualización del voto propio" 
ON public.concept_votes 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política 4: Eliminación del voto propio
CREATE POLICY "Permitir borrar el voto propio" 
ON public.concept_votes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Crear un índice de búsqueda para optimizar las agregaciones masivas
CREATE INDEX idx_concept_votes_lookup ON public.concept_votes(concept_id, tag_id);`;

export const DELIVERABLE_CSV_SCRIPT = `/**
 * Script de desarrollo: scripts/import-csv.js
 * Ejecución: node scripts/import-csv.js archivo.csv
 */
import fs from 'fs';
import path from 'path';

// Asegurar argumentos adecuados
const csvPath = process.argv[2] || 'import.csv';

if (!fs.existsSync(csvPath)) {
  console.error(\`⚠️ Error: No se encontró el archivo CSV en la ruta: \${csvPath}\`);
  console.log('Uso: node import-csv.js <tu-archivo.csv>');
  process.exit(1);
}

console.log(\`🚀 Procesando importación de conceptos desde: \${csvPath}...\`);

try {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\\r?\\n/).filter(line => line.trim().length > 0);
  
  if (lines.length < 1) {
    console.error('⚠️ El archivo CSV está vacío o le faltan registros.');
    process.exit(1);
  }

  // Detectar formato y delimitador dinámicamente
  // Cuenta cuántas líneas contienen el separador pipe |
  let pipeCount = 0;
  let commaCount = 0;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (lines[i].includes('|')) pipeCount++;
    if (lines[i].includes(',')) commaCount++;
  }
  const isPipeDelimited = pipeCount > commaCount || lines[0].includes('|');
  const delimiter = isPipeDelimited ? '|' : ',';
  console.log(\`📊 Formato detectado: Delimitador '\${delimiter}' (\${isPipeDelimited ? 'Pipe-delimited' : 'Standard CSV'})\`);

  // Agrupador para unificar conceptos que se repiten con distintas disciplinas
  const conceptsMap = new Map(); // key: slug, value: { title, tags: Set, tiers: Set }

  // Parser robusto de línea
  const parseLine = (line) => {
    const result = [];
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

  // Leer líneas
  let hasColumnsHeaders = false;
  const firstRow = parseLine(lines[0]);
  
  // Determinar si la primera línea contiene nombres de columnas comunes
  if (
    firstRow.some(col => /concepto|title|def/i.test(col)) ||
    firstRow.some(col => /disciplina|tag|tier/i.test(col))
  ) {
    hasColumnsHeaders = true;
    console.log('🏷️  Encabezados de columna detectados y saltados:', firstRow.join(' | '));
  }

  const startLineIndex = hasColumnsHeaders ? 1 : 0;

  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseLine(line);
    if (row.length < 1) continue;

    let title = '';
    let tierStr = '';
    let tagStr = '';

    if (isPipeDelimited) {
      // Formato: Concepto | Tier | Disciplina (o sólo Concepto | Disciplina)
      if (row.length >= 3) {
        title = row[0];
        tierStr = row[1];
        tagStr = row[2];
      } else if (row.length === 2) {
        title = row[0];
        tagStr = row[1];
      } else {
        title = row[0];
      }
    } else {
      // Standard CSV: buscar índices si hay cabeceras o asumir [Concepto, Tags] / [Concepto, Tier, Disciplina]
      if (hasColumnsHeaders) {
        const conceptIdx = firstRow.findIndex(h => /concepto|title/i.test(h));
        const tagsIdx = firstRow.findIndex(h => /tags|disciplina/i.test(h));
        const tierIdx = firstRow.findIndex(h => /tier/i.test(h));

        title = conceptIdx !== -1 && row[conceptIdx] ? row[conceptIdx] : '';
        tagStr = tagsIdx !== -1 && row[tagsIdx] ? row[tagsIdx] : '';
        tierStr = tierIdx !== -1 && row[tierIdx] ? row[tierIdx] : '';
      } else {
        title = row[0] || '';
        if (row.length >= 3) {
          tierStr = row[1] || '';
          tagStr = row[2] || '';
        } else if (row.length === 2) {
          tagStr = row[1] || '';
        }
      }
    }

    // Limpiar comillas extras y espacios
    title = title.replace(/^"|"$/g, '').trim();
    tagStr = tagStr.replace(/^"|"$/g, '').trim();
    tierStr = tierStr.replace(/^"|"$/g, '').trim();

    if (!title || title.toLowerCase() === 'concepto') continue; // Evitar basura

    // Clave única basada en slug para unificar registros
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "") // quitar acentos
      .replace(/[^a-z0-9]+/g, "-")       // caracteres especiales a guión
      .replace(/^-+|-+$/g, "");          // quitar guiones redundantes

    if (!slug) continue;

    if (!conceptsMap.has(slug)) {
      conceptsMap.set(slug, {
        title: title,
        tags: new Set(),
        tiers: new Set()
      });
    }

    const conceptData = conceptsMap.get(slug);

    // Parsear tags/disciplinas individuales (separadas por coma o punto y coma o barra vertical)
    if (tagStr) {
      const individualTags = tagStr
        .split(/[;,]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
      individualTags.forEach(t => conceptData.tags.add(t));
    }

    // Parsear número del Tier si existe (e.g. "Tier 1" -> 1)
    if (tierStr) {
      const match = tierStr.match(/\\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num >= 1 && num <= 3) {
          conceptData.tiers.add(num);
        }
      }
    }
  }

  // Definir carpeta de destino para el contenido del MD
  const targetDir = path.join(process.cwd(), 'src', 'content', 'conceptos');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const [slug, data] of conceptsMap.entries()) {
    const filename = \`\${slug}.md\`;
    const filepath = path.join(targetDir, filename);

    // Evitar sobre-escribir archivos existentes para GitOps seguro
    if (fs.existsSync(filepath)) {
      console.log(\`⏭️ Omitido (Ya existe): \${filename}\`);
      skippedCount++;
      continue;
    }

    // Determinar mejor Tier predeterminado (por defecto el menor número, que es el más prioritario/central)
    let finalTier = 2;
    if (data.tiers.size > 0) {
      finalTier = Math.min(...Array.from(data.tiers));
    }

    const finalTags = Array.from(data.tags);

    // Generar plantilla de frontmatter con tarjetas de memorización vacías por defecto
    const markdownTemplate = \`---
title: "\${data.title}"
description: "Inserte una descripción corta para \${data.title} aquí."
tags: \${JSON.stringify(finalTags)}
defaultTier: \${finalTier}
anki:
  - front: "¿Pregunta clave para \${data.title}?"
    back: "Respuesta clave para \${data.title}."
---

Escribe el contenido extendido de la investigación sobre **\${data.title}** en este espacio de Markdown.
Este archivo forma parte del Atlas colaborativo y se sincronizará con GitHub Pages automáticamente.
\`;

    fs.writeFileSync(filepath, markdownTemplate, 'utf-8');
    console.log(\`✅ Generado: \${filename} (Tier \${finalTier}, Tags: \${finalTags.join(', ')})\`);
    createdCount++;
  }

  console.log(\`\\n🎉 Proceso finalizado exitosamente:\`);
  console.log(\`   - Procesados: \${conceptsMap.size} conceptos únicos.\`);
  console.log(\`   - Creados nuevos: \${createdCount} archivos planos Markdown.\`);
  console.log(\`   - Omitidos (ya existían): \${skippedCount} archivos.\`);

} catch (error) {
  console.error('❌ Error de E/S leyendo el archivo CSV:', error.message);
}
`;

export const DELIVERABLE_DEPLOY_STEPS = [
  {
    title: "1. Inicialización e Instalación en tu Entorno Local",
    desc: "Crea el proyecto usando Astro y añade la integración con Tailwind CSS v4 / React para los componentes dinámicos de Atlas.",
    code: `# 1. Crear el proyecto en una carpeta vacía
npm create astro@latest atlas-conceptos -- --template minimal --typescript strict

# 2. Navegar a la carpeta e Instalar dependencias requeridas
cd atlas-conceptos
npx astro add react
npm install @supabase/supabase-js lucide-react fuse.js`
  },
  {
    title: "2. Estructura de Colecciones de Contenido (src/content/config.ts)",
    desc: "Astro valida el Frontmatter de tus archivos Markdown automáticamente en tiempo de compilación. Define este esquema para asegurar los campos title, description, tags, y tarjetas anki.",
    code: `import { defineCollection, z } from 'astro:content';

const conceptos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    anki: z.array(z.object({
      front: z.string(),
      back: z.string(),
    })).default([]),
  }),
});

export const collections = { conceptos };`
  },
  {
    title: "3. Configurar Acción de GitHub de Despliegue Automático (CI/CD)",
    desc: "Crea un archivo de flujo de trabajo en tu repositorio en '.github/workflows/deploy.yml'. Cada vez que un usuario cree un Pull Request con un nuevo concepto Markdown y este se fusione en 'main', se reconstruirá y publicará en GitHub Pages inmediatamente.",
    code: `name: Desplegar en GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout del repositorio
        uses: actions/checkout@v4
      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Instalar dependencias
        run: npm ci
      - name: Compilar sitio Astro
        run: npm run build
        env:
          # Para que Astro compile estático en producción
          PUBLIC_SUPABASE_URL: \${{ secrets.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: \${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
      - name: Subir artefacto para Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Desplegar en GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`
  },
  {
    title: "4. Registro de GitHub OAuth en Supabase",
    desc: "Para permitir que los investigadores voten el Tier de relevancia del concepto sin almacenar claves, habilitamos login con GitHub.",
    steps: [
      "1. Ve a tu cuenta de GitHub > Settings > Developer Settings > OAuth Apps > Nueva Aplicación.",
      "2. Copia la URL de Callback que te facilita el dashboard de Supabase (Sección Authentication > Providers > GitHub).",
      "3. Añade el Client ID y el Client Secret en Supabase. El inicio de sesión se gestiona cliente-side con una sola línea de código."
    ]
  }
];
