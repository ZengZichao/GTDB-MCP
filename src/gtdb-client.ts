/**
 * GTDB Database Client
 *
 * This module provides the core data access layer for the GTDB MCP server.
 * It supports both built-in reference data and external GTDB data files.
 */

import * as fs from "fs";
import * as path from "path";
import {
  type GTDBGenome,
  type TaxonNode,
  type DatabaseStats,
  type TaxonSummary,
  type SearchResult,
  type GenomeComparison,
  type GTDBLineage,
  type GTDBConfig,
  DEFAULT_CONFIG,
} from "./types.js";
import {
  type TaxonomicRank,
  type Domain,
  PRIMARY_RANKS,
  RANK_INDEX,
  getChildRank,
  parseTaxonomyLine,
} from "./taxonomy.js";
import {
  BUILTIN_STATS,
  ALL_TAXONOMY,
  BUILTIN_GENOMES,
  type TaxonomyEntry,
} from "./data/reference-data.js";

/**
 * Internal genome record type used by the client for both built-in and external data.
 * This unifies the shape of genome data regardless of its source.
 */
interface GenomeRecord {
  gid: string;
  species: string;
  domain: Domain;
  lineage: GTDBLineage;
  genomeSize?: number;
  gcContent?: number;
  completeness?: number;
  contamination?: number;
  typeStrain?: boolean;
}

/**
 * The GTDB database client.
 */
export class GTDBClient {
  private config: GTDBConfig;
  private taxonomyMap: Map<string, TaxonomyEntry> = new Map();
  private taxonomyByRank: Map<TaxonomicRank, TaxonomyEntry[]> = new Map();
  private genomeMap: Map<string, GenomeRecord> = new Map();
  private speciesToGenomeMap: Map<string, string[]> = new Map();
  private stats: DatabaseStats;

  constructor(config?: Partial<GTDBConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = { ...BUILTIN_STATS } as DatabaseStats;
    this.loadData();
  }

  /**
   * Load taxonomy and genome data from built-in data or external files.
   */
  private loadData(): void {
    if (this.config.dataDir && fs.existsSync(this.config.dataDir)) {
      this.loadExternalData();
    } else {
      this.loadBuiltinData();
    }
  }

  /**
   * Load built-in reference data.
   */
  private loadBuiltinData(): void {
    for (const entry of ALL_TAXONOMY) {
      this.taxonomyMap.set(entry.name.toLowerCase(), entry);
      const rankList = this.taxonomyByRank.get(entry.rank) || [];
      rankList.push(entry);
      this.taxonomyByRank.set(entry.rank, rankList);
    }

    for (const [gid, genome] of Object.entries(BUILTIN_GENOMES)) {
      const record: GenomeRecord = {
        gid: genome.gid,
        species: genome.species,
        domain: genome.domain,
        lineage: genome.lineage,
        genomeSize: genome.genomeSize,
        gcContent: genome.gcContent,
        completeness: genome.completeness,
        contamination: genome.contamination,
        typeStrain: genome.typeStrain,
      };
      this.genomeMap.set(gid, record);
      const speciesKey = genome.species.toLowerCase();
      const existing = this.speciesToGenomeMap.get(speciesKey) || [];
      existing.push(gid);
      this.speciesToGenomeMap.set(speciesKey, existing);
    }
  }

  /**
   * Load external GTDB data from TSV files.
   * Expected files:
   * - bac120_taxonomy.tsv
   * - ar122_taxonomy.tsv
   * - bacterial metadata file (optional)
   * - archaeal metadata file (optional)
   */
  private loadExternalData(): void {
    if (!this.config.dataDir) return;
    const dataDir = this.config.dataDir;

    // Load bacterial taxonomy
    const bacTaxFile = path.join(dataDir, "bac120_taxonomy.tsv");
    if (fs.existsSync(bacTaxFile)) {
      this.loadTaxonomyFile(bacTaxFile, "Bacteria");
    }

    // Load archaeal taxonomy
    const arTaxFile = path.join(dataDir, "ar122_taxonomy.tsv");
    if (fs.existsSync(arTaxFile)) {
      this.loadTaxonomyFile(arTaxFile, "Archaea");
    }
  }

  /**
   * Parse a GTDB taxonomy TSV file.
   */
  private loadTaxonomyFile(filePath: string, domain: Domain): void {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const [gid, taxonomyStr] = line.split("\t");
      if (!gid || !taxonomyStr) continue;

      const lineage = parseTaxonomyLine(taxonomyStr);
      if (!lineage.domain) lineage.domain = domain;

      // Create taxonomy entries for each rank
      for (const rank of PRIMARY_RANKS) {
        const name = lineage[rank];
        if (name && !this.taxonomyMap.has(name.toLowerCase())) {
          const entry: TaxonomyEntry = {
            name,
            rank,
            domain: domain,
            lineage: { ...lineage } as GTDBLineage,
            genomeCount: 0,
            speciesCount: 0,
          };
          this.taxonomyMap.set(name.toLowerCase(), entry);
          const rankList = this.taxonomyByRank.get(rank) || [];
          rankList.push(entry);
          this.taxonomyByRank.set(rank, rankList);
        }
      }

      // Store genome info (external TSV files don't include metadata)
      this.genomeMap.set(gid, {
        gid,
        species: lineage.species || "",
        domain,
        lineage: lineage as GTDBLineage,
      });

      // Build species-to-genome map
      if (lineage.species) {
        const key = lineage.species.toLowerCase();
        const existing = this.speciesToGenomeMap.get(key) || [];
        existing.push(gid);
        this.speciesToGenomeMap.set(key, existing);
      }
    }
  }

  /**
   * Get database statistics.
   */
  getStats(): DatabaseStats {
    return { ...this.stats };
  }

  /**
   * Search for taxa or genomes by name.
   */
  search(query: string, limit?: number): SearchResult[] {
    const maxResults = limit || this.config.maxSearchResults;
    const queryLower = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search taxonomy
    for (const entry of this.taxonomyMap.values()) {
      if (entry.name.toLowerCase().includes(queryLower)) {
        results.push({
          type: "taxon",
          id: entry.name,
          name: entry.name,
          rank: entry.rank,
          matchedField: "name",
          score: entry.name.toLowerCase() === queryLower ? 1.0 : 0.7,
          lineage: entry.lineage,
          domain: entry.domain,
        });
      }
    }

    // Search genomes
    for (const [gid, genome] of this.genomeMap) {
      if (gid.toLowerCase().includes(queryLower) || genome.species.toLowerCase().includes(queryLower)) {
        results.push({
          type: "genome",
          id: gid,
          name: genome.species || gid,
          matchedField: gid.toLowerCase().includes(queryLower) ? "gid" : "species",
          score: gid.toLowerCase() === queryLower ? 1.0 : 0.7,
          lineage: genome.lineage,
          domain: genome.domain,
        });
      }
    }

    // Sort by score descending, then by name for deterministic output
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
    return results.slice(0, maxResults);
  }

  /**
   * Get a taxon entry by name.
   */
  getTaxon(name: string): TaxonomyEntry | null {
    return this.taxonomyMap.get(name.toLowerCase()) || null;
  }

  /**
   * Get a taxon summary by name.
   */
  getTaxonSummary(name: string): TaxonSummary | null {
    const entry = this.taxonomyMap.get(name.toLowerCase());
    if (!entry) return null;

    const children = this.getChildren(name);
    const childNodes: TaxonNode[] = children.map((childName) => {
      const childEntry = this.taxonomyMap.get(childName.toLowerCase());
      return {
        name: childName,
        rank: getChildRank(entry.rank) || "species",
        lineage: childEntry?.lineage || entry.lineage,
        domain: entry.domain,
        genomeCount: childEntry?.genomeCount || 0,
        speciesCount: childEntry?.speciesCount,
        childCount: childEntry?.children?.length,
      };
    });

    // Count subtaxa by iterating through all entries at each rank
    let speciesCount = 0;
    let generaCount = 0, familiesCount = 0, ordersCount = 0, classesCount = 0, phylaCount = 0;

    if (entry.rank === "species") {
      speciesCount = 1;
    } else {
      for (const rank of PRIMARY_RANKS) {
        const rankEntries = this.taxonomyByRank.get(rank) || [];
        for (const re of rankEntries) {
          if (this.isAncestor(entry, re)) {
            switch (rank) {
              case "species": speciesCount++; break;
              case "genus": generaCount++; break;
              case "family": familiesCount++; break;
              case "order": ordersCount++; break;
              case "class": classesCount++; break;
              case "phylum": phylaCount++; break;
            }
          }
        }
      }
    }

    return {
      name: entry.name,
      rank: entry.rank,
      lineage: entry.lineage,
      domain: entry.domain,
      genomeCount: entry.genomeCount,
      speciesCount,
      generaCount,
      familiesCount,
      ordersCount,
      classesCount,
      phylaCount,
      children: childNodes,
      isPlaceholder: entry.isPlaceholder || false,
      description: entry.description,
    };
  }

  /**
   * Get the full lineage of a taxon.
   */
  getLineage(name: string): GTDBLineage | null {
    const entry = this.taxonomyMap.get(name.toLowerCase());
    if (!entry) return null;
    return entry.lineage;
  }

  /**
   * Get children of a taxon.
   */
  getChildren(name: string): string[] {
    const entry = this.taxonomyMap.get(name.toLowerCase());
    if (!entry) return [];
    if (entry.children) return entry.children;

    // For external data, find children by lineage
    const childRank = getChildRank(entry.rank);
    if (!childRank) return [];

    const childEntries = this.taxonomyByRank.get(childRank) || [];
    const children: string[] = [];
    for (const ce of childEntries) {
      if (ce.lineage[entry.rank]?.toLowerCase() === entry.name.toLowerCase()) {
        children.push(ce.name);
      }
    }
    return children;
  }

  /**
   * Get all taxa at a specific rank, optionally filtered by domain.
   */
  getTaxaByRank(rank: TaxonomicRank, domain?: Domain): TaxonomyEntry[] {
    const entries = this.taxonomyByRank.get(rank) || [];
    if (domain) {
      return entries.filter((e) => e.domain === domain);
    }
    return entries;
  }

  /**
   * Get all phyla.
   */
  getPhyla(domain?: Domain): string[] {
    return this.getTaxaByRank("phylum", domain).map((e) => e.name);
  }

  /**
   * Get genome information by GTDB genome ID.
   */
  getGenome(gid: string): GTDBGenome | null {
    const genome = this.genomeMap.get(gid);
    if (!genome) return null;

    return {
      gid: genome.gid,
      domain: genome.domain,
      lineage: genome.lineage,
      speciesName: genome.species,
      genomeSize: genome.genomeSize,
      gcContent: genome.gcContent,
      completeness: genome.completeness,
      contamination: genome.contamination,
      typeStrain: genome.typeStrain ? "yes" : undefined,
      ncbiAssemblyId: gid.startsWith("GCF_") || gid.startsWith("GCA_") ? gid : undefined,
    };
  }

  /**
   * Get all genomes for a species.
   */
  getGenomesForSpecies(speciesName: string): string[] {
    return this.speciesToGenomeMap.get(speciesName.toLowerCase()) || [];
  }

  /**
   * Get all genomes under a taxon.
   */
  getGenomesForTaxon(taxonName: string, limit?: number): string[] {
    const entry = this.taxonomyMap.get(taxonName.toLowerCase());
    if (!entry) return [];

    const maxResults = limit || 100;
    const result: string[] = [];

    for (const [gid, genome] of this.genomeMap) {
      if (this.isInLineage(genome.lineage, entry)) {
        result.push(gid);
        if (result.length >= maxResults) break;
      }
    }

    return result;
  }

  /**
   * Compare two genomes.
   */
  compareGenomes(gid1: string, gid2: string): GenomeComparison | null {
    const g1 = this.genomeMap.get(gid1);
    const g2 = this.genomeMap.get(gid2);
    if (!g1 || !g2) return null;

    const sharedLineage: GTDBLineage = {};
    const differingRanks: TaxonomicRank[] = [];
    let lcaRank: TaxonomicRank = "domain";
    let lcaName = "";

    for (const rank of PRIMARY_RANKS) {
      const v1 = g1.lineage[rank];
      const v2 = g2.lineage[rank];
      if (v1 && v2 && v1.toLowerCase() === v2.toLowerCase()) {
        sharedLineage[rank] = v1;
        lcaRank = rank;
        lcaName = v1;
      } else {
        if (v1 || v2) differingRanks.push(rank);
      }
    }

    const sharedRankCount = PRIMARY_RANKS.filter((r) => sharedLineage[r]).length;
    const genomeSizeDifference = g1.genomeSize != null && g2.genomeSize != null
      ? Math.abs(g1.genomeSize - g2.genomeSize)
      : undefined;
    const gcContentDifference = g1.gcContent != null && g2.gcContent != null
      ? Math.abs(g1.gcContent - g2.gcContent)
      : undefined;

    return {
      genomeId1: gid1,
      genomeId2: gid2,
      lineage1: g1.lineage,
      lineage2: g2.lineage,
      lcaRank,
      lcaName,
      sharedLineage,
      sharedRankCount,
      differingRanks,
      genomeSizeDifference,
      gcContentDifference,
    };
  }

  /**
   * Get the phylogenetic tree path between two taxa (lineage-based).
   */
  getTreePath(fromTaxon: string, toTaxon: string): string[] | null {
    const e1 = this.taxonomyMap.get(fromTaxon.toLowerCase());
    const e2 = this.taxonomyMap.get(toTaxon.toLowerCase());
    if (!e1 || !e2) return null;

    // Find LCA
    let lcaRank: TaxonomicRank | null = null;
    for (const rank of PRIMARY_RANKS) {
      const v1 = e1.lineage[rank];
      const v2 = e2.lineage[rank];
      if (v1 && v2 && v1.toLowerCase() === v2.toLowerCase()) {
        lcaRank = rank;
      } else {
        break;
      }
    }

    // If no LCA found (different domains), return just the two taxa
    if (lcaRank === null) {
      return [e1.name, e2.name];
    }

    // Build path: from -> up to LCA -> down to to
    const path: string[] = [];

    // Up from e1 to LCA (inclusive)
    for (let i = RANK_INDEX[e1.rank]; i > RANK_INDEX[lcaRank]; i--) {
      const rank = PRIMARY_RANKS[i];
      const val = e1.lineage[rank];
      if (val) path.push(val);
    }
    path.push(e1.lineage[lcaRank] || "");

    // Down from LCA to e2 (reversed for path direction)
    const downPath: string[] = [];
    for (let i = RANK_INDEX[lcaRank] + 1; i <= RANK_INDEX[e2.rank]; i++) {
      const rank = PRIMARY_RANKS[i];
      const val = e2.lineage[rank];
      if (val) downPath.push(val);
    }

    return [...path, ...downPath.reverse()];
  }

  /**
   * Check if a lineage contains a taxon entry.
   */
  private isInLineage(lineage: GTDBLineage, entry: TaxonomyEntry): boolean {
    const rankValue = lineage[entry.rank];
    return rankValue?.toLowerCase() === entry.name.toLowerCase();
  }

  /**
   * Check if one entry is an ancestor of another.
   */
  private isAncestor(ancestor: TaxonomyEntry, descendant: TaxonomyEntry): boolean {
    if (RANK_INDEX[ancestor.rank] >= RANK_INDEX[descendant.rank]) return false;
    const val = descendant.lineage[ancestor.rank];
    return val?.toLowerCase() === ancestor.name.toLowerCase();
  }
}
