/**
 * GTDB-MCP Test Suite
 *
 * Comprehensive tests for all GTDBClient methods and MCP server tools.
 * Run with: node dist/test.js
 */

import { GTDBClient } from "./gtdb-client.js";
import { formatTaxonomyLine, parseTaxonomyLine } from "./taxonomy.js";

const client = new GTDBClient();

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passed++;
  } else {
    failed++;
    failures.push(`${message}\n    Expected: ${expectedStr}\n    Actual:   ${actualStr}`);
    console.error(`  FAIL: ${message}`);
    console.error(`    Expected: ${expectedStr}`);
    console.error(`    Actual:   ${actualStr}`);
  }
}

function testName(name: string): void {
  console.log(`\n=== ${name} ===`);
}

// ===== Test 1: Database Stats =====
testName("Test 1: getStats()");
{
  const stats = client.getStats();
  assert(stats.version === "R220", "Version should be R220");
  assert(stats.totalGenomes > 0, "Total genomes should be positive");
  assert(stats.bacterialGenomes > 0, "Bacterial genomes should be positive");
  assert(stats.archaealGenomes > 0, "Archaeal genomes should be positive");
  assert(stats.bacterialPhyla > 0, "Bacterial phyla count should be positive");
  assert(stats.archaealPhyla > 0, "Archaeal phyla count should be positive");
  console.log(`  Stats: ${stats.totalGenomes} total genomes, ${stats.bacterialPhyla} bacterial phyla, ${stats.archaealPhyla} archaeal phyla`);
}

// ===== Test 2: Search =====
testName("Test 2: search()");
{
  // Search for a taxon
  const results1 = client.search("Bacillus", 10);
  assert(results1.length > 0, "Search for 'Bacillus' should return results");
  assert(results1.some(r => r.name === "Bacillus"), "Should find exact match 'Bacillus'");
  assert(results1.some(r => r.name === "Bacillus subtilis"), "Should find 'Bacillus subtilis'");
  assert(results1.some(r => r.score === 1.0), "Exact match should have score 1.0");

  // Search for a genome ID
  const results2 = client.search("GCF_000005845", 10);
  assert(results2.some(r => r.type === "genome"), "Should find genome by GID");
  assert(results2.some(r => r.id === "GCF_000005845.2"), "Should find exact genome ID");

  // Search for a species
  const results3 = client.search("Escherichia coli", 10);
  assert(results3.length > 0, "Search for 'Escherichia coli' should return results");
  assert(results3.some(r => r.name === "Escherichia coli"), "Should find exact species match");

  // Search with no results
  const results4 = client.search("NonExistentTaxon12345");
  assertEqual(results4.length, 0, "Search for nonexistent taxon should return 0 results");

  // Search with empty query
  const results5 = client.search("", 5);
  assert(results5.length <= 5, "Empty search should respect limit");

  console.log(`  Search 'Bacillus': ${results1.length} results`);
  console.log(`  Search 'GCF_000005845': ${results2.length} results`);
  console.log(`  Search 'Escherichia coli': ${results3.length} results`);
}

// ===== Test 3: getLineage =====
testName("Test 3: getLineage()");
{
  const lineage = client.getLineage("Escherichia coli");
  assert(lineage !== null, "Lineage for 'Escherichia coli' should not be null");
  assertEqual(lineage?.domain, "Bacteria", "Domain should be Bacteria");
  assertEqual(lineage?.phylum, "Pseudomonadota", "Phylum should be Pseudomonadota");
  assertEqual(lineage?.class, "Gammaproteobacteria", "Class should be Gammaproteobacteria");
  assertEqual(lineage?.order, "Enterobacterales", "Order should be Enterobacterales");
  assertEqual(lineage?.family, "Enterobacteriaceae", "Family should be Enterobacteriaceae");
  assertEqual(lineage?.genus, "Escherichia", "Genus should be Escherichia");
  assertEqual(lineage?.species, "Escherichia coli", "Species should be Escherichia coli");

  const lineage2 = client.getLineage("Bacillota");
  assert(lineage2 !== null, "Lineage for 'Bacillota' should not be null");
  assertEqual(lineage2?.domain, "Bacteria", "Domain should be Bacteria");
  assertEqual(lineage2?.phylum, "Bacillota", "Phylum should be Bacillota");

  const lineage3 = client.getLineage("NonExistentTaxon");
  assertEqual(lineage3, null, "Lineage for nonexistent taxon should be null");

  // Case insensitive test
  const lineage4 = client.getLineage("escherichia coli");
  assert(lineage4 !== null, "Lineage lookup should be case-insensitive");
}

// ===== Test 4: getTaxonSummary =====
testName("Test 4: getTaxonSummary()");
{
  const summary = client.getTaxonSummary("Bacillota");
  assert(summary !== null, "Summary for 'Bacillota' should not be null");
  assertEqual(summary?.rank, "phylum", "Rank should be phylum");
  assertEqual(summary?.domain, "Bacteria", "Domain should be Bacteria");
  assert((summary?.genomeCount || 0) > 0, "Genome count should be positive");
  assert((summary?.speciesCount || 0) > 0, "Species count should be positive");
  assert((summary?.children.length || 0) > 0, "Should have child taxa");

  // Check that species count doesn't double-count (the bug we fixed)
  const ecoliSummary = client.getTaxonSummary("Escherichia coli");
  assertEqual(ecoliSummary?.speciesCount, 1, "Species count for a species should be 1");

  // Check summary for a genus
  const genusSummary = client.getTaxonSummary("Bacillus");
  assert(genusSummary !== null, "Summary for 'Bacillus' should not be null");
  assertEqual(genusSummary?.rank, "genus", "Rank should be genus");
  assert((genusSummary?.speciesCount || 0) > 0, "Bacillus should have species");
  assert((genusSummary?.children.length || 0) > 0, "Bacillus should have children");

  const nullSummary = client.getTaxonSummary("NonExistentTaxon");
  assertEqual(nullSummary, null, "Summary for nonexistent taxon should be null");

  console.log(`  Bacillota: ${summary?.genomeCount} genomes, ${summary?.speciesCount} species, ${summary?.children.length} children`);
  console.log(`  Bacillus: ${genusSummary?.speciesCount} species, ${genusSummary?.children.length} children`);
}

// ===== Test 5: getChildren =====
testName("Test 5: getChildren()");
{
  const children = client.getChildren("Bacillales");
  assert(children.length > 0, "Bacillales should have children");
  assert(children.includes("Bacillaceae"), "Children should include Bacillaceae");
  assert(children.includes("Staphylococcaceae"), "Children should include Staphylococcaceae");

  const noChildren = client.getChildren("Bacillus subtilis");
  assertEqual(noChildren.length, 0, "Species should have no children");

  const notFound = client.getChildren("NonExistentTaxon");
  assertEqual(notFound.length, 0, "Nonexistent taxon should return empty children");

  // Test Clostridiaceae has Clostridioides (data fix)
  const clostridiaceaeChildren = client.getChildren("Clostridiaceae");
  assert(clostridiaceaeChildren.includes("Clostridioides"), "Clostridiaceae should include Clostridioides (data fix)");

  console.log(`  Bacillales children: ${children.join(", ")}`);
  console.log(`  Clostridiaceae children: ${clostridiaceaeChildren.join(", ")}`);
}

// ===== Test 6: getPhyla =====
testName("Test 6: getPhyla()");
{
  const allPhyla = client.getPhyla();
  assert(allPhyla.length > 0, "Should return phyla");

  const bacterialPhyla = client.getPhyla("Bacteria");
  assert(bacterialPhyla.length > 0, "Should return bacterial phyla");
  assert(bacterialPhyla.includes("Bacillota"), "Should include Bacillota");
  assert(bacterialPhyla.includes("Pseudomonadota"), "Should include Pseudomonadota");
  assert(bacterialPhyla.includes("Actinomycetota"), "Should include Actinomycetota");
  assert(bacterialPhyla.includes("Bacteroidota"), "Should include Bacteroidota");
  assert(bacterialPhyla.includes("Campylobacterota"), "Should include Campylobacterota");

  const archaealPhyla = client.getPhyla("Archaea");
  assert(archaealPhyla.length > 0, "Should return archaeal phyla");
  assert(archaealPhyla.includes("Methanobacteriota"), "Should include Methanobacteriota");
  assert(archaealPhyla.includes("Thermoproteota"), "Should include Thermoproteota");
  assert(archaealPhyla.includes("Halobacteriota"), "Should include Halobacteriota");
  assert(archaealPhyla.includes("Nanoarchaeota"), "Should include Nanoarchaeota");
  assert(archaealPhyla.includes("Thermoplasmataota"), "Should include Thermoplasmataota");
  assert(archaealPhyla.includes("Methanomicrobiota"), "Should include Methanomicrobiota");

  console.log(`  All phyla: ${allPhyla.length}`);
  console.log(`  Bacterial phyla: ${bacterialPhyla.length} - ${bacterialPhyla.join(", ")}`);
  console.log(`  Archaeal phyla: ${archaealPhyla.length} - ${archaealPhyla.join(", ")}`);
}

// ===== Test 7: getTaxaByRank =====
testName("Test 7: getTaxaByRank()");
{
  const genera = client.getTaxaByRank("genus");
  assert(genera.length > 0, "Should return genera");
  assert(genera.some(g => g.name === "Bacillus"), "Should include Bacillus");
  assert(genera.some(g => g.name === "Escherichia"), "Should include Escherichia");

  const species = client.getTaxaByRank("species");
  assert(species.length > 0, "Should return species");
  assert(species.some(s => s.name === "Escherichia coli"), "Should include E. coli");

  const archaealGenera = client.getTaxaByRank("genus", "Archaea");
  assert(archaealGenera.length > 0, "Should return archaeal genera");
  assert(archaealGenera.some(g => g.name === "Methanobrevibacter"), "Should include Methanobrevibacter");

  console.log(`  Genera: ${genera.length}`);
  console.log(`  Species: ${species.length}`);
  console.log(`  Archaeal genera: ${archaealGenera.length}`);
}

// ===== Test 8: getGenome =====
testName("Test 8: getGenome()");
{
  const genome = client.getGenome("GCF_000005845.2");
  assert(genome !== null, "Genome should not be null");
  assertEqual(genome?.gid, "GCF_000005845.2", "GID should match");
  assertEqual(genome?.speciesName, "Bacillus subtilis", "Species should be Bacillus subtilis");
  assertEqual(genome?.domain, "Bacteria", "Domain should be Bacteria");
  assert(genome?.genomeSize !== undefined && genome.genomeSize > 0, "Genome size should be positive");
  assert(genome?.gcContent !== undefined && genome.gcContent > 0, "GC content should be positive");
  assertEqual(genome?.typeStrain, "yes", "Should be type strain");

  const notFound = client.getGenome("NON_EXISTENT_GID");
  assertEqual(notFound, null, "Nonexistent genome should return null");

  console.log(`  Genome: ${genome?.gid} - ${genome?.speciesName} - ${genome?.genomeSize} bp - GC ${genome?.gcContent}%`);
}

// ===== Test 9: getGenomesForSpecies =====
testName("Test 9: getGenomesForSpecies()");
{
  const genomes = client.getGenomesForSpecies("Bacillus subtilis");
  assert(genomes.length > 0, "Should find genomes for B. subtilis");
  assert(genomes.includes("GCF_000005845.2"), "Should include GCF_000005845.2");

  const noGenomes = client.getGenomesForSpecies("NonExistentSpecies");
  assertEqual(noGenomes.length, 0, "Nonexistent species should return empty");

  // Case insensitive
  const caseInsensitive = client.getGenomesForSpecies("bacillus subtilis");
  assert(caseInsensitive.length > 0, "Species lookup should be case-insensitive");

  console.log(`  Bacillus subtilis genomes: ${genomes.join(", ")}`);
}

// ===== Test 10: getGenomesForTaxon =====
testName("Test 10: getGenomesForTaxon()");
{
  const genomes = client.getGenomesForTaxon("Enterobacteriaceae");
  assert(genomes.length > 0, "Should find genomes under Enterobacteriaceae");
  assert(genomes.includes("GCF_000007865.2"), "Should include E. coli genome");

  const genomes2 = client.getGenomesForTaxon("Bacillota");
  assert(genomes2.length > 0, "Should find genomes under Bacillota");

  const noGenomes = client.getGenomesForTaxon("NonExistentTaxon");
  assertEqual(noGenomes.length, 0, "Nonexistent taxon should return empty");

  // Test limit
  const limited = client.getGenomesForTaxon("Bacillota", 2);
  assert(limited.length <= 2, "Should respect limit");

  console.log(`  Enterobacteriaceae genomes: ${genomes.join(", ")}`);
  console.log(`  Bacillota genomes (limit 2): ${limited.length}`);
}

// ===== Test 11: compareGenomes =====
testName("Test 11: compareGenomes()");
{
  const comparison = client.compareGenomes("GCF_000005845.2", "GCF_000007865.2");
  assert(comparison !== null, "Comparison should not be null");
  assertEqual(comparison?.genomeId1, "GCF_000005845.2", "Genome ID 1 should match");
  assertEqual(comparison?.genomeId2, "GCF_000007865.2", "Genome ID 2 should match");
  assert(comparison!.sharedRankCount >= 1, "Should share at least domain rank");
  assertEqual(comparison?.lcaRank, "domain", "LCA should be at domain level (Bacteria vs Bacteria)");
  assertEqual(comparison?.lcaName, "Bacteria", "LCA name should be Bacteria");
  assert(comparison!.differingRanks.length > 0, "Should have differing ranks");
  assert(comparison!.genomeSizeDifference !== undefined, "Should compute genome size difference");
  assert(comparison!.gcContentDifference !== undefined, "Should compute GC content difference");

  // Compare two closely related genomes
  const comparison2 = client.compareGenomes("GCF_000005845.2", "GCF_000006765.1");
  assert(comparison2 !== null, "Comparison of related genomes should not be null");
  assert(comparison2!.sharedRankCount >= 5, "B. subtilis and B. cereus should share at least 5 ranks");
  assertEqual(comparison2?.lcaRank, "genus", "LCA should be at genus level (Bacillus)");

  const nullComparison = client.compareGenomes("GCF_000005845.2", "NON_EXISTENT");
  assertEqual(nullComparison, null, "Comparison with nonexistent genome should return null");

  console.log(`  B. subtilis vs E. coli: shared ${comparison!.sharedRankCount}/7, LCA: ${comparison!.lcaName} (${comparison!.lcaRank})`);
  console.log(`  B. subtilis vs B. cereus: shared ${comparison2!.sharedRankCount}/7, LCA: ${comparison2!.lcaName} (${comparison2!.lcaRank})`);
}

// ===== Test 12: getTreePath =====
testName("Test 12: getTreePath()");
{
  const path = client.getTreePath("Bacillus", "Escherichia");
  assert(path !== null, "Tree path should not be null");
  assert(path!.length > 0, "Path should have nodes");
  assert(path!.includes("Bacillus"), "Path should include Bacillus");
  assert(path!.includes("Escherichia"), "Path should include Escherichia");

  const path2 = client.getTreePath("Bacillus subtilis", "Bacillus cereus");
  assert(path2 !== null, "Tree path between sibling species should not be null");
  assert(path2!.includes("Bacillus subtilis"), "Path should include Bacillus subtilis");
  assert(path2!.includes("Bacillus cereus"), "Path should include Bacillus cereus");

  const nullPath = client.getTreePath("NonExistent", "Bacillus");
  assertEqual(nullPath, null, "Path with nonexistent taxon should be null");

  // Cross-domain path
  const crossDomain = client.getTreePath("Bacillus", "Sulfolobus");
  assert(crossDomain !== null, "Cross-domain path should not be null");
  assert(crossDomain!.length > 0, "Cross-domain path should have nodes");

  console.log(`  Bacillus -> Escherichia: ${path!.join(" -> ")}`);
  console.log(`  B. subtilis -> B. cereus: ${path2!.join(" -> ")}`);
  console.log(`  Bacillus -> Sulfolobus (cross-domain): ${crossDomain!.join(" -> ")}`);
}

// ===== Test 13: Taxonomy utility functions =====
testName("Test 13: Taxonomy utilities");
{
  const lineage = parseTaxonomyLine("d__Bacteria;p__Bacillota;c__Bacilli;o__Bacillales;f__Bacillaceae;g__Bacillus;s__Bacillus subtilis");
  assertEqual(lineage.domain, "Bacteria", "Parsed domain should be Bacteria");
  assertEqual(lineage.phylum, "Bacillota", "Parsed phylum should be Bacillota");
  assertEqual(lineage.species, "Bacillus subtilis", "Parsed species should be Bacillus subtilis");

  const formatted = formatTaxonomyLine(lineage);
  assert(formatted.includes("d__Bacteria"), "Formatted lineage should include d__Bacteria");
  assert(formatted.includes("s__Bacillus subtilis"), "Formatted lineage should include species");

  // Test empty values
  const partialLineage = parseTaxonomyLine("d__Bacteria;p__Bacillota;c__Bacilli;o__Bacillales;f__;g__Bacillus;s__Bacillus subtilis");
  assertEqual(partialLineage.family, undefined, "Empty family should be undefined");
  assertEqual(partialLineage.genus, "Bacillus", "Genus should be Bacillus");
}

// ===== Test 14: Data consistency checks =====
testName("Test 14: Data consistency");
{
  // Verify Mycoplasma doesn't have M. tuberculosis (the bug we fixed)
  const mycoplasma = client.getTaxonSummary("Mycoplasma");
  assert(mycoplasma !== null, "Mycoplasma should exist");
  assert(!mycoplasma!.children.some(c => c.name === "Mycoplasma tuberculosis"), "Mycoplasma should NOT have M. tuberculosis as child");

  // Verify Clostridioides genus exists (the data we added)
  const clostridioides = client.getTaxon("Clostridioides");
  assert(clostridioides !== null, "Clostridioides genus should exist");
  assertEqual(clostridioides?.rank, "genus", "Clostridioides should be a genus");

  // Verify Corynebacteriales doesn't have Mycobacteriaceae as child (inconsistent lineage)
  const corynebacteriales = client.getTaxonSummary("Corynebacteriales");
  assert(corynebacteriales !== null, "Corynebacteriales should exist");
  assert(!corynebacteriales!.children.some(c => c.name === "Mycobacteriaceae"), "Corynebacteriales should NOT have Mycobacteriaceae (lineage mismatch)");

  console.log("  All data consistency checks passed");
}

// ===== Test 15: Edge cases =====
testName("Test 15: Edge cases");
{
  // Empty query search
  const emptySearch = client.search("", 5);
  assert(emptySearch.length <= 5, "Empty search should respect limit");

  // Very long query
  const longQuery = "A".repeat(1000);
  const longSearch = client.search(longQuery);
  assertEqual(longSearch.length, 0, "Very long query should return 0 results");

  // Self-comparison
  const selfCompare = client.compareGenomes("GCF_000005845.2", "GCF_000005845.2");
  assert(selfCompare !== null, "Self-comparison should work");
  assertEqual(selfCompare?.sharedRankCount, 7, "Self-comparison should share all 7 ranks");
  assertEqual(selfCompare?.differingRanks.length, 0, "Self-comparison should have 0 differing ranks");
  assertEqual(selfCompare?.genomeSizeDifference, 0, "Self-comparison size difference should be 0");

  // Tree path to self
  const selfPath = client.getTreePath("Bacillus", "Bacillus");
  assert(selfPath !== null, "Self tree path should work");
  assertEqual(selfPath!.length, 1, "Self tree path should have 1 node");
  assertEqual(selfPath![0], "Bacillus", "Self tree path should contain the taxon itself");

  console.log("  All edge case checks passed");
}

// ===== Summary =====
console.log("\n" + "=".repeat(50));
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50));

if (failed > 0) {
  console.error("\nFailed tests:");
  failures.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
} else {
  console.log("\nAll tests passed!");
  process.exit(0);
}
