#!/usr/bin/env node
/**
 * GTDB MCP Server - Entry Point
 *
 * This is the main entry point for the GTDB (Genome Taxonomy Database) MCP server.
 * It provides tools for querying bacterial and archaeal taxonomy data,
 * searching genomes, navigating phylogenetic trees, and comparing organisms.
 *
 * The server uses the Model Context Protocol (MCP) to expose GTDB data
 * to LLM-powered applications.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GTDBClient } from "./gtdb-client.js";
import { formatTaxonomyLine, type TaxonomicRank } from "./taxonomy.js";

// Create the GTDB client
const client = new GTDBClient();

// Create the MCP server
const server = new Server(
  {
    name: "gtdb-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Define all available tools.
 */
const TOOLS = [
  {
    name: "search",
    description: "Search for taxa or genomes in the GTDB database by name. Returns matching organisms, taxonomic groups, and genome assemblies. Supports partial matching (e.g., 'Bacillus' will match 'Bacillus subtilis', 'Bacillus cereus', etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query - a taxon name, species name, or genome ID (e.g., 'Escherichia coli', 'Bacillus', 'GCF_000005845.2')",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 50)",
          default: 50,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_taxonomy",
    description: "Get the complete taxonomic lineage of an organism or taxon from GTDB. Returns the full classification from domain down to species level (d__Domain; p__Phylum; c__Class; o__Order; f__Family; g__Genus; s__Species).",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Taxon name or genome ID (e.g., 'Escherichia coli', 'Bacillus', 'GCF_000005845.2')",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_taxon_summary",
    description: "Get a comprehensive summary of a taxonomic group, including genome counts, species counts, child taxa, and description. Useful for understanding the diversity and composition of any taxonomic level.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Taxon name (e.g., 'Bacillota', 'Gammaproteobacteria', 'Enterobacteriaceae', 'Bacillus')",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_children",
    description: "Get the direct child taxa of a given taxon in the GTDB taxonomy. For example, children of 'Bacillales' include 'Bacillaceae', 'Staphylococcaceae', etc.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Parent taxon name (e.g., 'Bacillales', 'Enterobacteriaceae')",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_phyla",
    description: "List all bacterial or archaeal phyla in GTDB. This is the starting point for exploring the taxonomy tree from the top level.",
    inputSchema: {
      type: "object" as const,
      properties: {
        domain: {
          type: "string",
          enum: ["Bacteria", "Archaea"],
          description: "Domain to list phyla for. If omitted, lists all phyla.",
        },
      },
    },
  },
  {
    name: "list_taxa_by_rank",
    description: "List all taxa at a specific taxonomic rank, optionally filtered by domain. Useful for browsing the taxonomy at any level.",
    inputSchema: {
      type: "object" as const,
      properties: {
        rank: {
          type: "string",
          enum: ["phylum", "class", "order", "family", "genus", "species"],
          description: "Taxonomic rank to list",
        },
        domain: {
          type: "string",
          enum: ["Bacteria", "Archaea"],
          description: "Optional domain filter",
        },
      },
      required: ["rank"],
    },
  },
  {
    name: "get_genome",
    description: "Get detailed information about a specific genome by its GTDB genome ID (e.g., GCF_000005845.2). Returns taxonomy, genome size, GC content, quality metrics, and type strain status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        gid: {
          type: "string",
          description: "GTDB genome identifier (e.g., 'GCF_000005845.2', 'GCA_000091565.1')",
        },
      },
      required: ["gid"],
    },
  },
  {
    name: "get_genomes_for_species",
    description: "Get all genome assemblies classified under a given species in GTDB. Useful for finding reference genomes and type strains.",
    inputSchema: {
      type: "object" as const,
      properties: {
        species: {
          type: "string",
          description: "Species name (e.g., 'Escherichia coli', 'Bacillus subtilis')",
        },
      },
      required: ["species"],
    },
  },
  {
    name: "get_genomes_for_taxon",
    description: "Get all genome assemblies classified under a given taxonomic group. For example, get all genomes in the family Enterobacteriaceae or phylum Bacillota.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taxon: {
          type: "string",
          description: "Taxon name (e.g., 'Enterobacteriaceae', 'Bacillota')",
        },
        limit: {
          type: "number",
          description: "Maximum number of genome IDs to return (default: 100)",
          default: 100,
        },
      },
      required: ["taxon"],
    },
  },
  {
    name: "compare_genomes",
    description: "Compare two genomes taxonomically. Returns the shared lineage, lowest common ancestor (LCA), differing ranks, and genome metric differences (size, GC content).",
    inputSchema: {
      type: "object" as const,
      properties: {
        gid1: {
          type: "string",
          description: "First genome ID (e.g., 'GCF_000005845.2')",
        },
        gid2: {
          type: "string",
          description: "Second genome ID (e.g., 'GCF_000007865.2')",
        },
      },
      required: ["gid1", "gid2"],
    },
  },
  {
    name: "get_tree_path",
    description: "Get the phylogenetic tree path between two taxa. Shows the route through the taxonomy tree from one taxon to another via their lowest common ancestor (LCA).",
    inputSchema: {
      type: "object" as const,
      properties: {
        from_taxon: {
          type: "string",
          description: "Starting taxon name",
        },
        to_taxon: {
          type: "string",
          description: "Ending taxon name",
        },
      },
      required: ["from_taxon", "to_taxon"],
    },
  },
  {
    name: "get_database_stats",
    description: "Get statistics about the GTDB database, including version, release date, total genome counts, and taxonomic diversity metrics for both bacteria and archaea.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

/**
 * Handle tool listing requests.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

/**
 * Handle tool call requests.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case "search": {
        const query = (args?.query as string) || "";
        const limit = Math.max(1, Math.min(500, (args?.limit as number) || 50));
        const results = client.search(query, limit);
        if (results.length === 0) {
          result = `No results found for "${query}".`;
        } else {
          const lines = results.map((r, i) => {
            const rankStr = r.rank ? ` [${r.rank}]` : "";
            const scoreStr = r.score === 1.0 ? " (exact match)" : "";
            const lineageStr = formatTaxonomyLine(r.lineage);
            return `${i + 1}. ${r.type}: ${r.name}${rankStr}${scoreStr}\n   Lineage: ${lineageStr}`;
          });
          result = `Found ${results.length} result(s) for "${query}":\n\n${lines.join("\n\n")}`;
        }
        break;
      }

      case "get_taxonomy": {
        const taxonName = (args?.name as string) || "";
        const lineage = client.getLineage(taxonName);
        if (!lineage) {
          // Try as genome ID
          const genome = client.getGenome(taxonName);
          if (genome) {
            result = `Taxonomy for genome ${taxonName}:\n\n${formatTaxonomyLine(genome.lineage)}\n\nDomain: ${genome.domain}\nSpecies: ${genome.speciesName || "N/A"}`;
          } else {
            result = `Taxon or genome "${taxonName}" not found in the database.`;
          }
        } else {
          result = `Taxonomy for "${taxonName}":\n\n${formatTaxonomyLine(lineage)}`;
        }
        break;
      }

      case "get_taxon_summary": {
        const taxonName = (args?.name as string) || "";
        const summary = client.getTaxonSummary(taxonName);
        if (!summary) {
          result = `Taxon "${taxonName}" not found in the database.`;
        } else {
          const childrenStr = summary.children.length > 0
            ? summary.children.map(c => `  - ${c.name} [${c.rank}] (${c.genomeCount} genomes)`).join("\n")
            : "  (no child taxa found)";
          result = `Summary for "${summary.name}":\n\n` +
            `Rank: ${summary.rank}\n` +
            `Domain: ${summary.domain}\n` +
            `Lineage: ${formatTaxonomyLine(summary.lineage)}\n` +
            `Genome count: ${summary.genomeCount.toLocaleString()}\n` +
            `Species count: ${summary.speciesCount.toLocaleString()}\n` +
            `Genera count: ${summary.generaCount}\n` +
            `Families count: ${summary.familiesCount}\n` +
            `Orders count: ${summary.ordersCount}\n` +
            `Classes count: ${summary.classesCount}\n` +
            `Phyla count: ${summary.phylaCount}\n` +
            `Is placeholder: ${summary.isPlaceholder}\n` +
            (summary.description ? `Description: ${summary.description}\n` : "") +
            `\nChild taxa (${summary.children.length}):\n${childrenStr}`;
        }
        break;
      }

      case "get_children": {
        const taxonName = (args?.name as string) || "";
        const children = client.getChildren(taxonName);
        if (children.length === 0) {
          result = `No child taxa found for "${taxonName}". This may be a species-level taxon or not in the database.`;
        } else {
          result = `Child taxa of "${taxonName}" (${children.length}):\n\n${children.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
        }
        break;
      }

      case "list_phyla": {
        const domain = args?.domain as "Bacteria" | "Archaea" | undefined;
        const validDomains = ["Bacteria", "Archaea", undefined];
        const safeDomain = validDomains.includes(domain) ? domain : undefined;
        const phyla = client.getPhyla(safeDomain);
        const domainStr = domain ? domain : "all";
        result = `Phyla (${domainStr}, ${phyla.length} total):\n\n${phyla.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
        break;
      }

      case "list_taxa_by_rank": {
        const rank = args?.rank as TaxonomicRank;
        const domain = args?.domain as "Bacteria" | "Archaea" | undefined;
        const taxa = client.getTaxaByRank(rank, domain);
        if (taxa.length === 0) {
          result = `No taxa found at rank "${rank}".`;
        } else {
          const domainStr = domain ? ` (${domain})` : "";
          const taxaList = taxa.slice(0, 200).map((t, i) => `${i + 1}. ${t.name} (${t.genomeCount.toLocaleString()} genomes)`);
          const truncated = taxa.length > 200 ? `\n\n... and ${taxa.length - 200} more` : "";
          result = `Taxa at rank "${rank}"${domainStr} (${taxa.length} total):\n\n${taxaList.join("\n")}${truncated}`;
        }
        break;
      }

      case "get_genome": {
        const gid = (args?.gid as string) || "";
        const genome = client.getGenome(gid);
        if (!genome) {
          result = `Genome "${gid}" not found in the database.`;
        } else {
          result = `Genome: ${genome.gid}\n\n` +
            `Species: ${genome.speciesName || "N/A"}\n` +
            `Domain: ${genome.domain}\n` +
            `Lineage: ${formatTaxonomyLine(genome.lineage)}\n` +
            (genome.ncbiAssemblyId ? `NCBI Assembly ID: ${genome.ncbiAssemblyId}\n` : "") +
            (genome.genomeSize ? `Genome size: ${genome.genomeSize.toLocaleString()} bp\n` : "") +
            (genome.gcContent !== undefined ? `GC content: ${genome.gcContent}%\n` : "") +
            (genome.completeness !== undefined ? `Completeness: ${genome.completeness}%\n` : "") +
            (genome.contamination !== undefined ? `Contamination: ${genome.contamination}%\n` : "") +
            (genome.typeStrain ? `Type strain: ${genome.typeStrain}\n` : "");
        }
        break;
      }

      case "get_genomes_for_species": {
        const species = (args?.species as string) || "";
        const genomes = client.getGenomesForSpecies(species);
        if (genomes.length === 0) {
          result = `No genomes found for species "${species}".`;
        } else {
          result = `Genomes for species "${species}" (${genomes.length}):\n\n${genomes.map((g, i) => `${i + 1}. ${g}`).join("\n")}`;
        }
        break;
      }

      case "get_genomes_for_taxon": {
        const taxon = (args?.taxon as string) || "";
        const limit = Math.max(1, Math.min(10000, (args?.limit as number) || 100));
        const genomes = client.getGenomesForTaxon(taxon, limit);
        if (genomes.length === 0) {
          result = `No genomes found under taxon "${taxon}".`;
        } else {
          result = `Genomes under "${taxon}" (${genomes.length} shown):\n\n${genomes.map((g, i) => `${i + 1}. ${g}`).join("\n")}`;
        }
        break;
      }

      case "compare_genomes": {
        const gid1 = (args?.gid1 as string) || "";
        const gid2 = (args?.gid2 as string) || "";
        const comparison = client.compareGenomes(gid1, gid2);
        if (!comparison) {
          result = `One or both genomes not found. Please check the genome IDs: ${gid1}, ${gid2}`;
        } else {
          result = `Genome Comparison: ${gid1} vs ${gid2}\n\n` +
            `Lineage 1: ${formatTaxonomyLine(comparison.lineage1)}\n` +
            `Lineage 2: ${formatTaxonomyLine(comparison.lineage2)}\n\n` +
            `Shared lineage (LCA: ${comparison.lcaName} at ${comparison.lcaRank}):\n${formatTaxonomyLine(comparison.sharedLineage)}\n\n` +
            `Shared ranks: ${comparison.sharedRankCount}/7\n` +
            `Differing ranks: ${comparison.differingRanks.join(", ") || "none"}\n` +
            (comparison.genomeSizeDifference !== undefined ? `Genome size difference: ${comparison.genomeSizeDifference.toLocaleString()} bp\n` : "") +
            (comparison.gcContentDifference !== undefined ? `GC content difference: ${comparison.gcContentDifference.toFixed(1)}%\n` : "");
        }
        break;
      }

      case "get_tree_path": {
        const fromTaxon = (args?.from_taxon as string) || "";
        const toTaxon = (args?.to_taxon as string) || "";
        const treePath = client.getTreePath(fromTaxon, toTaxon);
        if (!treePath) {
          result = `One or both taxa not found: ${fromTaxon}, ${toTaxon}`;
        } else {
          result = `Tree path from "${fromTaxon}" to "${toTaxon}":\n\n${treePath.join(" -> ")}`;
        }
        break;
      }

      case "get_database_stats": {
        const stats = client.getStats();
        result = `GTDB Database Statistics\n\n` +
          `Version: ${stats.version}\n` +
          `Release date: ${stats.releaseDate}\n\n` +
          `Total genomes: ${stats.totalGenomes.toLocaleString()}\n` +
          `  Bacterial: ${stats.bacterialGenomes.toLocaleString()}\n` +
          `  Archaeal: ${stats.archaealGenomes.toLocaleString()}\n\n` +
          `Taxonomic diversity:\n` +
          `  Bacterial phyla: ${stats.bacterialPhyla}\n` +
          `  Archaeal phyla: ${stats.archaealPhyla}\n` +
          `  Bacterial species: ${stats.bacterialSpecies.toLocaleString()}\n` +
          `  Archaeal species: ${stats.archaealSpecies.toLocaleString()}\n` +
          `  Bacterial genera: ${stats.bacterialGenera.toLocaleString()}\n` +
          `  Archaeal genera: ${stats.archaealGenera.toLocaleString()}\n\n` +
          `Type strain genomes: ${stats.typeStrainGenomes.toLocaleString()}\n` +
          `NCBI type material: ${stats.ncbiTypeMaterial.toLocaleString()}\n` +
          `UBA genomes: ${stats.ubaGenomes.toLocaleString()}`;
        break;
      }

      default:
        result = `Unknown tool: ${name}`;
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMsg}` }],
      isError: true,
    };
  }
});

/**
 * Start the server.
 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GTDB MCP Server v0.1.0 started successfully");
  console.error("Using built-in reference data. For full database, set GTDB_DATA_DIR environment variable.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
