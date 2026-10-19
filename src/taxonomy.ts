/**
 * GTDB Taxonomic rank definitions.
 *
 * GTDB follows a standardized taxonomy with the following ranks:
 * Domain → Phylum → Class → Order → Family → Genus → Species
 *
 * For bacteria and archaea, the domain is the root level.
 * GTDB also uses intermediate ranks (e.g., subphylum, subclass) in some cases.
 */

export type Domain = "Bacteria" | "Archaea";

/**
 * The seven primary taxonomic ranks in GTDB, ordered from highest to lowest.
 */
export type TaxonomicRank =
  | "domain"
  | "phylum"
  | "class"
  | "order"
  | "family"
  | "genus"
  | "species";

/**
 * Intermediate (prefix) ranks used in GTDB for finer granularity.
 * These use prefixes like "sub", "infra", "parv", "super", etc.
 */
export type IntermediateRankPrefix =
  | "super"
  | "sub"
  | "infra"
  | "parv"
  | "micro"
  | "nano"
  | "pico";

/**
 * All possible rank names including intermediate ones.
 */
export type FullRankName =
  | TaxonomicRank
  | `${IntermediateRankPrefix}${TaxonomicRank}`;

/**
 * Ordered list of the primary taxonomic ranks (highest to lowest).
 */
export const PRIMARY_RANKS: TaxonomicRank[] = [
  "domain",
  "phylum",
  "class",
  "order",
  "family",
  "genus",
  "species",
];

/**
 * Map of rank to its position in the hierarchy (0-based, domain=0).
 */
export const RANK_INDEX: Record<TaxonomicRank, number> = {
  domain: 0,
  phylum: 1,
  class: 2,
  order: 3,
  family: 4,
  genus: 5,
  species: 6,
};

/**
 * Get the parent rank of a given rank.
 * @param rank - The taxonomic rank.
 * @returns The parent rank, or null if the rank is domain.
 */
export function getParentRank(rank: TaxonomicRank): TaxonomicRank | null {
  const idx = RANK_INDEX[rank];
  if (idx <= 0) return null;
  return PRIMARY_RANKS[idx - 1];
}

/**
 * Get the child rank of a given rank.
 * @param rank - The taxonomic rank.
 * @returns The child rank, or null if the rank is species.
 */
export function getChildRank(rank: TaxonomicRank): TaxonomicRank | null {
  const idx = RANK_INDEX[rank];
  if (idx >= PRIMARY_RANKS.length - 1) return null;
  return PRIMARY_RANKS[idx + 1];
}

/**
 * Get all ancestor ranks (inclusive of the given rank, from domain down).
 * @param rank - The taxonomic rank.
 * @returns Array of ranks from domain to the given rank.
 */
export function getAncestorRanks(rank: TaxonomicRank): TaxonomicRank[] {
  const idx = RANK_INDEX[rank];
  return PRIMARY_RANKS.slice(0, idx + 1);
}

/**
 * Check if a rank name is a valid primary taxonomic rank.
 * @param rank - The rank name to check.
 * @returns True if the rank is a primary taxonomic rank.
 */
export function isPrimaryRank(rank: string): rank is TaxonomicRank {
  return rank in RANK_INDEX;
}

/**
 * Parse a GTDB taxonomic string into a structured lineage.
 *
 * GTDB taxonomy strings follow the format:
 * `d__Domain;p__Phylum;c__Class;o__Order;f__Family;g__Genus;s__Species`
 *
 * Each field uses a rank prefix (d__, p__, c__, o__, f__, g__, s__).
 * Missing or unknown values are represented as empty strings after the prefix.
 *
 * @example
 * parseTaxonomyLine("d__Bacteria;p__Firmicutes;c__Bacilli;o__Bacillales;f__Bacillaceae;g__Bacillus;s__Bacillus subtilis")
 * // => { domain: "Bacteria", phylum: "Firmicutes", class: "Bacilli", ... }
 *
 * @param line - The GTDB taxonomy string.
 * @returns A structured lineage object.
 */
export function parseTaxonomyLine(line: string): Partial<Record<TaxonomicRank, string>> {
  const result: Partial<Record<TaxonomicRank, string>> = {};
  const fields = line.split(";").map((f) => f.trim());

  const prefixMap: Record<string, TaxonomicRank> = {
    "d__": "domain",
    "p__": "phylum",
    "c__": "class",
    "o__": "order",
    "f__": "family",
    "g__": "genus",
    "s__": "species",
  };

  for (const field of fields) {
    for (const [prefix, rank] of Object.entries(prefixMap)) {
      if (field.startsWith(prefix)) {
        const value = field.slice(prefix.length).trim();
        if (value) {
          result[rank] = value;
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Format a lineage object back into a GTDB taxonomy string.
 * @param lineage - The structured lineage.
 * @returns A GTDB taxonomy string.
 */
export function formatTaxonomyLine(lineage: Partial<Record<TaxonomicRank, string>>): string {
  const parts: string[] = [];
  const prefixMap: Record<TaxonomicRank, string> = {
    domain: "d__",
    phylum: "p__",
    class: "c__",
    order: "o__",
    family: "f__",
    genus: "g__",
    species: "s__",
  };

  for (const rank of PRIMARY_RANKS) {
    const value = lineage[rank];
    parts.push(`${prefixMap[rank]}${value || ""}`);
  }

  return parts.join(";");
}
