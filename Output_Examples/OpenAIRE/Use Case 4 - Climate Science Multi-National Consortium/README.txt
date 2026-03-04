CATALOGUE RECORD WRITER - ARCTIC PERMAFROST CLIMATE DATA
Dummy Example Output

================================================================================

SCENARIO
========

A multi-institution climate research consortium funded by Horizon Europe has completed a major study on Arctic permafrost degradation. The research spans 7 institutions across 8 countries and produces datasets documenting soil temperature profiles, active layer thickness, and methane flux estimates from 47 monitoring sites across Siberia and Scandinavia.

The lead researcher (Klaus Mueller, ORCID: 0000-0001-5678-9012, Max Planck Institute for Meteorology) needs to:
1. Deposit the dataset across 12 different institutional repositories to ensure maximum preservation and accessibility
2. Ensure all copies describe the same resource consistently so search systems don't see fragmented duplicates
3. Link the dataset explicitly to the Horizon Europe funding source for funder compliance
4. Enable automatic EU Commission reporting on all outputs from grant #101054567
5. Make the Arctic geospatial data discoverable to climate scientists worldwide

Instead of manually entering metadata differently in each repository system, the researcher uses the Catalogue Record Writer tool:
- Opens the tool and selects "OpenAIRE - Repository Profile"
- Answers a guided questionnaire (~12 minutes) with dataset information:
  * Main title and abstract describing the climate research
  * Creator: Klaus Mueller (Max Planck Institute) with ORCID identifier
  * Creation date (March 20, 2023) and publication/availability date (June 15, 2023)
  * Publisher/platform: Zenodo (trusted data repository)
  * DOI (10.5281/zenodo.8765432) for persistent access
  * Geospatial coverage: Arctic Region bounding box (60.5°N to 89.9°N, -180° to 180°E)
  * Dataset version: 2.3 (shows iterative improvements over time)
  * Related Horizon Europe grant: 101054567 (critical for funder tracking)
  * Language: English
- Clicks "Export as JSON-LD"
- Downloads a standards-compliant JSON-LD record

Instead of creating 12 separate metadata records with inconsistencies, the researcher uses this single JSON-LD template and imports it into all 12 repositories. Each repository receives identical metadata, preventing fragmentation.

The tool validates the grant ID against the Horizon Europe registry, ensures the bounding box is properly formatted for geospatial search, and structures the funder relationship correctly.


REAL-WORLD IMPACT
==================

EUROPEAN COMMISSION FUNDER COMPLIANCE & REPORTING
--------------------------------------------------
Before: The European Commission awards €8M to a multi-country climate research project (grant #101054567). For 3 years, the project generates 45 publications, 28 datasets, 12 software tools across 7 institutions in 8 countries. When the project ends, the coordinator must manually:
  * Email all partners asking "Send me your outputs"
  * Search Zenodo, institutional repositories, GitHub for anything they missed
  * Compile a spreadsheet of what was produced
  * Verify it matches funder requirements (minimum 30% open access, linked to grant)
  * This takes 40+ hours and often has gaps

After: The Catalogue Record Writer tool is used from day one. Each output (including this Arctic permafrost dataset) contains:
  * Explicit link to grant ID (HORIZON-EUROPE-101054567)
  * Structured in JSON-LD so it's machine-readable

In the final month, the project coordinator runs an automated query:
  "Show me all outputs with relatedIdentifier = HORIZON-EUROPE-101054567"

Result: The European Commission's system automatically retrieves 85 outputs (45 publications, 28 datasets, 12 software) - complete, with no manual compilation needed. The project demonstrates immediate compliance.

Impact: Funder reporting time reduced from 40+ hours of manual work to 10 minutes of automated querying. EU can verify compliance in real-time throughout the project, not just at the end.


CLIMATE SCIENTIST DISCOVERY VIA GEOSPATIAL SEARCH
--------------------------------------------------
Before: A climate scientist studying permafrost tipping points searches: "Give me all Arctic permafrost data in the EOSC portal." Most results are scattered papers, not datasets. Those few datasets she finds have vague location descriptions like "Arctic region" or "Northern latitudes" - no precise coordinates.

After: Through Catalogue Record Writer metadata:
  * The dataset's geoLocation field contains a precise bounding box: 60.5°N to 89.9°N, -180° to 180°E
  * EOSC portal's geospatial search tool recognizes this formatted bounding box
  * When the scientist searches "permafrost data between 65-85°N, 0-40°E" (specific study area), this dataset matches
  * She sees: DOI 10.5281/zenodo.8765432, version 2.3, creator Klaus Mueller (ORCID linked to his profile)
  * She downloads the dataset, sees it was updated June 2023 (recent)
  * She cites the DOI in her paper: her work directly traces back to the Horizon Europe project

The geospatial metadata is now searchable; without it, datasets remain invisible even in open repositories.

Impact: Climate scientist discovers relevant data in minutes instead of hours; research quality improves through access to better datasets; Arctic permafrost knowledge becomes integrated across studies.


MULTI-INSTITUTIONAL DATASET COORDINATION
-----------------------------------------
Before: The climate consortium deposits the Arctic dataset in 12 repositories (Zenodo, institutional repositories in Spain, Germany, Sweden, etc.). Each repository has its own metadata entry form:
  * Zenodo description: "Arctic permafrost monitoring 2018-2023"
  * German repo description: "Beobachtung der Permafrost-Degradation"
  * Swedish repo description: "Arctic soil temperature profile data"
  * Spanish repo: "Datos de cambio climático Ártico"

Search engines see 12 different descriptions of the "same" dataset, thinking they're different resources. Citation metrics are fragmented: some systems report 15 citations, others report 3 (because they're counted separately).

After: Using Catalogue Record Writer, all 12 repositories receive identical JSON-LD metadata:
  * Same title, abstract, DOI, creator
  * Same geospatial bounding box
  * Same version number (2.3)
  * Same Horizon Europe grant link

Systems recognize these as 12 copies of one dataset, not 12 separate datasets. Citation tracking aggregates across all copies. Research impact metrics are accurate: "This dataset cited in 47 papers" (not fragmented as "cited 5 times here, 8 times there").

Impact: Research impact tracking becomes reliable; dataset preservation is decentralized (12 copies) but discovery is unified; data citation culture improves.


RESEARCHER VERSION TRACKING & ITERATIVE IMPROVEMENT
----------------------------------------------------
Before: Klaus Mueller releases the Arctic dataset. In month 6 of the project, the team discovers errors in 3 of 47 monitoring sites. They recalibrate instruments and recalculate soil temperature estimates. But:
  * Old version still online (no retraction statement)
  * New version available but labeled "v2" with no clear link to v1
  * Researchers using the data don't know there was an update
  * Citation tracking can't distinguish which version was used in which paper

After: Catalogue Record Writer maintains version control:
  * Version 2.3 JSON-LD record includes version field: "2.3"
  * It includes relatedIdentifier showing previous versions exist
  * When an update occurs, metadata explicitly states "This is an updated version of [previous DOI]"
  * Researchers download version 2.3, see it's the latest, understand earlier versions had issues
  * Their paper cites: "DOI 10.5281/zenodo.8765432, version 2.3" - specifically traceable

Impact: Research reproducibility improves through version tracking; data quality iterations become visible; downstream researchers use correct versions; trust in open data increases.


ARCTIC GEOPOLITICS & REGIONAL DATA SHARING
-------------------------------------------
Before: Arctic climate data is politically sensitive. Different countries (Russia, Norway, Finland, Sweden) have competing interests in Arctic resource management. When data is published:
  * Russian data stays in Russian repositories
  * Nordic data stays in Nordic systems
  * No unified view of Arctic-wide permafrost trends

After: Geospatial metadata in Catalogue Record Writer makes all Arctic data discoverable together:
  * Bounding box: 60.5°N to 89.9°N (encompasses all Arctic territories)
  * Single EOSC query shows permafrost datasets from Russia, Scandinavia, Greenland together
  * Scientists across borders access shared baseline data
  * Arctic Council can use unified datasets for policy decisions
  * Climate monitoring becomes truly circumpolar, not fragmented by national borders

Impact: Arctic climate science becomes integrated; international cooperation on climate data enabled; geopolitical fragmentation of scientific infrastructure reduced.


================================================================================

DISCLAIMER
===========

This README documents a DUMMY EXAMPLE output created for demonstration purposes only. The scenario, dataset details, creator information, geospatial coverage, and impact examples are realistic illustrations of how the Catalogue Record Writer tool functions - but are not based on actual production records.

The JSON-LD record provided alongside this README shows what actual tool output looks like for large-scale climate science datasets - but should be treated as a TEST EXAMPLE demonstrating how geospatial and multi-institutional metadata is structured.

This example illustrates how the tool handles climate/geoscience data with emphasis on:
  * Precise geospatial bounding boxes for regional data discovery
  * Multi-institutional dataset coordination across 8+ countries
  * Version tracking for iterative scientific improvements
  * Explicit funder grant linking for Horizon Europe compliance
  * Creator ORCID integration for researcher attribution

When used with real climate research datasets, the tool operates identically to this example, but produces authoritative metadata reflecting actual monitoring sites, time periods, institutions, and funding sources.

For questions about integrating this tool with climate data systems, European research infrastructure, or international data coordination networks, contact your system administrator.

================================================================================