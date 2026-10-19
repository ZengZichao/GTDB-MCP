/**
 * Type definitions for the GTDB MCP server.
 */

import type { TaxonomicRank, Domain } from "./taxonomy.js";

/**
 * A complete GTDB lineage for a genome or taxon.
 */
export interface GTDBLineage {
  domain?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
}

/**
 * A GTDB genome entry.
 */
export interface GTDBGenome {
  /** GTDB genome identifier (e.g., GCF_000005845.2) */
  gid: string;
  /** NCBI assembly accession */
  ncbiAssemblyId?: string;
  /** Full taxonomic lineage */
  lineage: GTDBLineage;
  /** Domain (Bacteria or Archaea) */
  domain: Domain;
  /** Genome size in base pairs */
  genomeSize?: number;
  /** Number of contigs */
  contigCount?: number;
  /** N50 of contigs */
  n50?: number;
  /** GC content percentage */
  gcContent?: number;
  /** CheckM completeness score */
  completeness?: number;
  /** CheckM contamination score */
  contamination?: number;
  /** Type strain designation */
  typeStrain?: string;
  /** Species name */
  speciesName?: string;
  /** NCBI organism name */
  ncbiOrganismName?: string;
  /** NCBI strain name */
  ncbiStrain?: string;
  /** Assembly submission date */
  submissionDate?: string;
}

/**
 * A node in the GTDB taxonomic tree.
 */
export interface TaxonNode {
  /** Taxon name (e.g., "Bacillus") */
  name: string;
  /** Taxonomic rank */
  rank: TaxonomicRank;
  /** Full lineage up to this taxon */
  lineage: GTDBLineage;
  /** Domain */
  domain: Domain;
  /** Number of genomes classified under this taxon */
  genomeCount: number;
  /** Number of species classified under this taxon */
  speciesCount?: number;
  /** Number of child taxa at the next rank */
  childCount?: number;
  /** List of child taxon names */
  children?: string[];
  /** GTDB ID if this is a species or genome-level taxon */
  gtdbId?: string;
  /** Is this taxon a placeholder (e.g., "UBA1031") */
  isPlaceholder?: boolean;
}

/**
 * A node in a phylogenetic tree.
 */
export interface TreeNode {
  /** Node name / identifier */
  name: string;
  /** Node label (taxonomy if internal, genome ID if leaf) */
  label: string;
  /** Branch length from parent */
  branchLength?: number;
  /** Support value (e.g., bootstrap) */
  support?: number;
  /** Children nodes */
  children?: TreeNode[];
  /** Is this a leaf node */
  isLeaf: boolean;
  /** Depth in the tree (root = 0) */
  depth: number;
  /** Parent node name */
  parent?: string;
}

/**
 * Newick format tree data.
 */
export interface PhylogeneticTree {
  /** Newick format string */
  newick: string;
  /** Domain of the tree (bac120 or ar122) */
  domain: Domain;
  /** Tree type */
  treeType: "bac120" | "ar122" | "bac120_ar122";
  /** Number of taxa in the tree */
  taxonCount: number;
  /** Root node of the parsed tree */
  root?: TreeNode;
  /** Version of the tree */
  version?: string;
}

/**
 * A search result for genome or taxon queries.
 */
export interface SearchResult {
  /** Type of result */
  type: "genome" | "taxon";
  /** Identifier */
  id: string;
  /** Display name */
  name: string;
  /** Taxonomic rank (for taxon results) */
  rank?: TaxonomicRank;
  /** Matched field */
  matchedField: string;
  /** Match score (0-1) */
  score: number;
  /** Lineage */
  lineage: GTDBLineage;
  /** Domain */
  domain: Domain;
}

/**
 * Statistics about the GTDB database.
 */
export interface DatabaseStats {
  /** GTDB version */
  version: string;
  /** Release date */
  releaseDate: string;
  /** Total number of bacterial genomes */
  bacterialGenomes: number;
  /** Total number of archaeal genomes */
  archaealGenomes: number;
  /** Total number of genomes */
  totalGenomes: number;
  /** Number of bacterial phyla */
  bacterialPhyla: number;
  /** Number of archaeal phyla */
  archaealPhyla: number;
  /** Number of bacterial species */
  bacterialSpecies: number;
  /** Number of archaeal species */
  archaealSpecies: number;
  /** Number of bacterial genera */
  bacterialGenera: number;
  /** Number of archaeal genera */
  archaealGenera: number;
  /** Number of type strain genomes */
  typeStrainGenomes: number;
  /** Number of genomes with NCBI type material */
  ncbiTypeMaterial: number;
  /** Number of UBA genomes */
  ubaGenomes: number;
}

/**
 * Comparison result between two genomes.
 */
export interface GenomeComparison {
  /** First genome ID */
  genomeId1: string;
  /** Second genome ID */
  genomeId2: string;
  /** Lineage of the first genome */
  lineage1: GTDBLineage;
  /** Lineage of the second genome */
  lineage2: GTDBLineage;
  /** Lowest common ancestor rank */
  lcaRank: TaxonomicRank;
  /** Lowest common ancestor name */
  lcaName: string;
  /** Full shared lineage */
  sharedLineage: GTDBLineage;
  /** Number of ranks that are the same */
  sharedRankCount: number;
  /** Ranks that differ */
  differingRanks: TaxonomicRank[];
  /** Genome size difference (in bp) */
  genomeSizeDifference?: number;
  /** GC content difference (in %) */
  gcContentDifference?: number;
}

/**
 * Summary of a taxonomic group.
 */
export interface TaxonSummary {
  /** Taxon name */
  name: string;
  /** Taxonomic rank */
  rank: TaxonomicRank;
  /** Full lineage */
  lineage: GTDBLineage;
  /** Domain */
  domain: Domain;
  /** Number of genomes */
  genomeCount: number;
  /** Number of species */
  speciesCount: number;
  /** Number of genera */
  generaCount: number;
  /** Number of families */
  familiesCount: number;
  /** Number of orders */
  ordersCount: number;
  /** Number of classes */
  classesCount: number;
  /** Number of phyla */
  phylaCount: number;
  /** List of child taxa */
  children: TaxonNode[];
  /** Is this a placeholder taxon */
  isPlaceholder: boolean;
  /** Description */
  description?: string;
}

/**
 * Configuration for the GTDB MCP server.
 */
export interface GTDBConfig {
  /** Path to the GTDB data directory */
  dataDir?: string;
  /** GTDB version */
  version?: string;
  /** Whether to use built-in reference data */
  useBuiltinData: boolean;
  /** Maximum number of search results */
  maxSearchResults: number;
  /** Cache directory */
  cacheDir?: string;
  /** Whether to enable caching */
  enableCache: boolean;
}

/**
 * Default server configuration.
 */
export const DEFAULT_CONFIG: GTDBConfig = {
  useBuiltinData: true,
  maxSearchResults: 50,
  enableCache: true,
  version: "R220",
};
