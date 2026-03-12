/**
 * Pattern Loader — Runtime access to the pattern catalog and individual patterns.
 *
 * The catalog is the System of Record index used by the reasoning pipeline
 * to match user concepts → relevant patterns. Individual patterns are loaded
 * on demand when injected into generation context.
 */

import type { PatternCatalog, CatalogEntry, Pattern, PatternCategory } from './pattern-types.ts';
import catalogData from './pattern-catalog.json' with { type: 'json' };

/** Cached catalog singleton. */
const catalog = catalogData as PatternCatalog;

/** Returns the full pattern catalog (System of Record). */
export function loadCatalog(): PatternCatalog {
  return catalog;
}

/**
 * Match patterns by concept keywords.
 *
 * Scores each pattern by how many of the query keywords appear in its
 * `concepts` array or `description`. Returns matches sorted by relevance.
 *
 * @param keywords - Search terms from the user's intent or concept analysis.
 * @param options - Optional filters (tier, category, limit).
 */
export function matchPatterns(
  keywords: string[],
  options?: {
    tier?: 'block' | 'micro';
    category?: PatternCategory;
    limit?: number;
  },
): CatalogEntry[] {
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const limit = options?.limit ?? 5;

  const scored = catalog.patterns
    .filter(entry => {
      if (options?.tier && entry.tier !== options.tier) return false;
      if (options?.category && entry.category !== options.category) return false;
      return true;
    })
    .map(entry => {
      let score = 0;
      const concepts = entry.concepts.map(c => c.toLowerCase());
      const desc = entry.description.toLowerCase();
      const label = entry.label.toLowerCase();

      for (const kw of lowerKeywords) {
        // Exact concept match = 3 points
        if (concepts.includes(kw)) score += 3;
        // Partial concept match = 2 points
        else if (concepts.some(c => c.includes(kw) || kw.includes(c))) score += 2;
        // Description match = 1 point
        if (desc.includes(kw)) score += 1;
        // Label match = 1 point
        if (label.includes(kw)) score += 1;
      }
      return { entry, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(s => s.entry);
}

/**
 * Load a full pattern by ID (lazy, on-demand).
 *
 * Uses dynamic import to avoid bundling all 50 patterns upfront.
 * The pipeline calls this only for patterns matched during concept analysis.
 */
export async function loadPattern(id: string): Promise<Pattern | null> {
  // Determine tier from catalog
  const entry = catalog.patterns.find(p => p.id === id);
  if (!entry) return null;

  const folder = entry.tier === 'micro' ? 'micro' : 'blocks';
  try {
    const mod = await import(`./${folder}/${id}.json`, { with: { type: 'json' } });
    return mod.default as Pattern;
  } catch {
    return null;
  }
}
