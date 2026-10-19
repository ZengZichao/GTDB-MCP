# GTDB-MCP

**A Model Context Protocol (MCP) server for the Genome Taxonomy Database (GTDB)**

[中文文档](./README_CN.md) | English

---

> ⚠️ **Disclaimer**: This is an **unofficial, third-party** community implementation and is **not** affiliated with, endorsed by, or associated with the [GTDB team](https://gtdb.ecogenomic.org/) or [Anthropic](https://www.anthropic.com/). GTDB is developed by the Australian Centre for Ecogenomics (ACE) at the University of Queensland. This project independently builds an MCP server to facilitate access to GTDB data. All GTDB data and trademarks belong to their respective owners.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Available Tools](#available-tools)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Integration with MCP Clients](#integration-with-mcp-clients)
- [Data Sources](#data-sources)
- [Development](#development)
- [License](#license)

---

## Overview

**GTDB-MCP** is a Model Context Protocol (MCP) server that provides seamless access to the [Genome Taxonomy Database (GTDB)](https://gtdb.ecogenomic.org/). It enables LLM-powered applications to query bacterial and archaeal taxonomy data, search for genomes, navigate phylogenetic trees, and perform comparative analyses.

GTDB is a genome-based taxonomy database that provides standardized taxonomic classifications for bacterial and archaeal genomes based on over 120 conserved marker genes. This MCP server makes GTDB data accessible to AI assistants and other MCP-compatible tools.

### Key Highlights

- **Zero-config startup**: Ships with a curated built-in reference dataset covering major bacterial and archaeal taxa
- **Full database support**: Can load complete GTDB TSV data files for comprehensive queries
- **12 powerful tools**: Search, taxonomy lookup, genome queries, tree navigation, and comparison
- **Type-safe**: Written in TypeScript with full type definitions
- **MCP-compliant**: Follows the Model Context Protocol specification for tool-based interactions

---

## Features

### 🔍 Search & Discovery
- Search for taxa or genomes by name (partial matching supported)
- Browse taxonomy by rank (phylum, class, order, family, genus, species)
- List all phyla for bacteria or archaea

### 🌿 Taxonomy Navigation
- Get complete taxonomic lineages (domain → species)
- Retrieve taxon summaries with genome counts and child taxa
- Navigate the taxonomy tree (get children of any taxon)
- Find the phylogenetic path between two taxa

### 🧬 Genome Information
- Look up genome metadata (size, GC content, quality, type strain status)
- Find all genomes for a given species
- Find all genomes under any taxonomic group

### 📊 Comparison & Analysis
- Compare two genomes taxonomically (shared lineage, LCA, differences)
- Get phylogenetic tree paths between taxa
- Access database-wide statistics

---

## Available Tools

| Tool | Description |
|------|-------------|
| `search` | Search for taxa or genomes by name |
| `get_taxonomy` | Get the full taxonomic lineage of a taxon or genome |
| `get_taxon_summary` | Get a comprehensive summary of a taxonomic group |
| `get_children` | Get direct child taxa of a given taxon |
| `list_phyla` | List all bacterial or archaeal phyla |
| `list_taxa_by_rank` | List all taxa at a specific rank |
| `get_genome` | Get detailed genome information by GTDB ID |
| `get_genomes_for_species` | Get all genomes for a species |
| `get_genomes_for_taxon` | Get all genomes under a taxonomic group |
| `compare_genomes` | Compare two genomes taxonomically |
| `get_tree_path` | Get the phylogenetic path between two taxa |
| `get_database_stats` | Get GTDB database statistics |

---

## Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**

### From Source

```bash
git clone <repository-url>
cd GTDB-MCP
npm install
npm run build
```

### Global Installation (optional)

```bash
npm install -g .
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GTDB_DATA_DIR` | Path to external GTDB data directory | (none - uses built-in data) |

### Using Built-in Data

By default, the server uses a curated built-in reference dataset that covers:

- **10 bacterial phyla** (Bacillota, Pseudomonadota, Actinomycetota, Bacteroidota, Spirochaetota, Cyanobacteriota, Chlamydiota, Fusobacteriota, Mycoplasmatota, Campylobacterota)
- **6 archaeal phyla** (Methanobacteriota, Thermoproteota, Methanomicrobiota, Halobacteriota, Nanoarchaeota, Thermoplasmataota)
- **100+ representative taxa** across all ranks
- **25+ reference genomes** with metadata

### Using Full GTDB Data

For comprehensive database access, download GTDB data files from [https://gtdb.ecogenomic.org/downloads](https://gtdb.ecogenomic.org/downloads) and set the data directory:

```bash
# Set the data directory
export GTDB_DATA_DIR=/path/to/gtdb/data

# Expected files in the data directory:
# - bac120_taxonomy.tsv (bacterial taxonomy)
# - ar122_taxonomy.tsv (archaeal taxonomy)
```

---

## Usage

### Starting the Server

```bash
# Using built-in data
node dist/index.js

# Using external GTDB data
GTDB_DATA_DIR=/path/to/gtdb/data node dist/index.js
```

### Programmatic API

```typescript
import { GTDBClient } from "gtdb-mcp";

const client = new GTDBClient();

// Search for organisms
const results = client.search("Bacillus");

// Get taxonomy
const lineage = client.getLineage("Escherichia coli");

// Get taxon summary
const summary = client.getTaxonSummary("Enterobacteriaceae");

// Compare genomes
const comparison = client.compareGenomes("GCF_000005845.2", "GCF_000007865.2");
```

---

## Integration with MCP Clients

### Claude Desktop

Add the server to your Claude Desktop configuration file (`claude_desktop_config.json`):

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gtdb": {
      "command": "node",
      "args": ["/absolute/path/to/GTDB-MCP/dist/index.js"]
    }
  }
}
```

### With External GTDB Data

```json
{
  "mcpServers": {
    "gtdb": {
      "command": "node",
      "args": ["/absolute/path/to/GTDB-MCP/dist/index.js"],
      "env": {
        "GTDB_DATA_DIR": "/path/to/gtdb/data"
      }
    }
  }
}
```

### Example Queries

Once connected, you can ask your AI assistant questions like:

- "What is the taxonomy of Escherichia coli?"
- "List all bacterial phyla in GTDB"
- "Compare the genomes GCF_000005845.2 and GCF_000007865.2"
- "What are the child taxa of Bacillales?"
- "Find all genomes in the family Enterobacteriaceae"
- "Show me the phylogenetic path from Bacillus to Escherichia"
- "Get statistics about the GTDB database"

---

## Data Sources

### GTDB Taxonomy Format

GTDB uses a standardized taxonomy format with rank prefixes:

```
d__Domain;p__Phylum;c__Class;o__Order;f__Family;g__Genus;s__Species
```

Example:
```
d__Bacteria;p__Pseudomonadota;c__Gammaproteobacteria;o__Enterobacterales;f__Enterobacteriaceae;g__Escherichia;s__Escherichia coli
```

### Genome Identifiers

GTDB uses NCBI assembly accessions as genome identifiers:

- `GCF_` prefix: RefSeq assemblies
- `GCA_` prefix: GenBank assemblies
- `UBA_` prefix: Unclassified Binned Assemblies
- `G_` prefix: GTDB-assigned identifiers for non-NCBI genomes

### Taxonomic Ranks

GTDB follows a seven-rank hierarchy:

1. **Domain** (d__) - Bacteria or Archaea
2. **Phylum** (p__) - e.g., Bacillota, Pseudomonadota
3. **Class** (c__) - e.g., Bacilli, Gammaproteobacteria
4. **Order** (o__) - e.g., Bacillales, Enterobacterales
5. **Family** (f__) - e.g., Bacillaceae, Enterobacteriaceae
6. **Genus** (g__) - e.g., Bacillus, Escherichia
7. **Species** (s__) - e.g., Bacillus subtilis, Escherichia coli

---

## Development

### Project Structure

```
GTDB-MCP/
├── package.json              # Project configuration and dependencies
├── tsconfig.json             # TypeScript configuration
├── README.md                 # English documentation (this file)
├── README_CN.md              # Chinese documentation
├── LICENSE                   # MIT license
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── taxonomy.ts           # Taxonomic rank definitions and utilities
│   ├── gtdb-client.ts        # GTDB database client (core logic)
│   ├── test.ts               # Test suite
│   └── data/
│       └── reference-data.ts # Built-in reference taxonomy data
└── dist/                     # Compiled output (generated)
```

### Building

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode for development
npm run clean      # Remove dist directory
```

### Testing

```bash
npm run build      # Build first
node dist/test.js  # Run the test suite
```

### Adding New Taxa

To add new taxa to the built-in reference data, edit `src/data/reference-data.ts` and add entries to the `BUILTIN_TAXONOMY` array:

```typescript
{
  name: "YourTaxonName",
  rank: "genus",
  domain: "Bacteria",
  lineage: makeLineage("Bacteria", "PhylumName", "ClassName", "OrderName", "FamilyName", "YourTaxonName", ""),
  genomeCount: 1000,
  speciesCount: 200,
  children: ["Species1", "Species2"],
  description: "A brief description of this taxon."
}
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

- [GTDB (Genome Taxonomy Database)](https://gtdb.ecogenomic.org/) - Parks et al., Nature Biotechnology 2018, 2020, 2022
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) - Anthropic
- GTDB is developed by the Australian Centre for Ecogenomics (ACE) at the University of Queensland

---

**Version**: 0.1.0  
**GTDB Version**: R220 (2024-04-17)
