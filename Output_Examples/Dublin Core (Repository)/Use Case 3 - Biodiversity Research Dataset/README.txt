CATALOGUE RECORD WRITER - BIODIVERSITY RESEARCH DATASET
Dummy Example Output

================================================================================

SCENARIO
========

The Biodiversity Research Institute at the University of Guelph publishes a major 5-year species occurrence dataset from Mediterranean cork oak forests. The dataset contains 12,847 carefully validated species records collected across a defined geographic region in Mediterranean Spain (polygon coordinates: 1.85-3.45°E, 41.5-42.5°N) between October 2015 and October 2020.

The research team (led by institution with contributors Niraj Patil, John Doe, and Smith Will) needs to:
1. Make the dataset discoverable in GBIF (Global Biodiversity Information Facility), the international biodiversity data hub
2. Link it to related publications about cork oak forest ecology
3. Enable climate researchers worldwide to find it when searching for Mediterranean species data
4. Track how many researchers download and cite the dataset
5. Preserve it with multiple format versions (CSV, Excel, JPEG visualizations)
6. Document it under CC0 (public domain) to maximize reuse

Instead of manually uploading to multiple platforms and filling separate metadata forms for GBIF, ResearchData.org, and the institutional repository, the institute uses the Catalogue Record Writer tool:
- Opens the tool and selects "Dublin Core - Dataset Profile"
- Answers a guided questionnaire (~18 minutes) with dataset information:
  * Dataset title: "5-year species occurrence dataset from Mediterranean cork oak forests"
  * Dataset type: Dataset (DCMI Type Vocabulary)
  * Creator/Institution: Biodiversity Research Institute at University of Guelph
  * Contributors: Niraj Patil, John Doe, Smith Will
  * Creation date: October 20, 2020 (when research was completed)
  * Time period: October 2015 to October 2020 (temporal coverage)
  * Geographic coverage: POLYGON((1.85 41.5, 3.45 41.5, 3.45 42.5, 1.85 42.5, 1.85 41.5)) (GIS format)
  * Language: English
  * Formats available: CSV, Excel (xlsx), JPEG
  * License: CC0 (Public Domain - no restrictions)
  * Identifiers: UoG institutional ID + alternative research.ca ID
  * Version information: v1.1 (current version available)
  * Related publication: DOI link to cork oak ecology paper
  * Part of network: LTER Network (Long Term Ecological Research)
  * Subject keywords: Biodiversity, Cork Oak Forests, Mediterranean Ecosystems, Species Occurrence
- Clicks "Export as JSON-LD"
- Downloads standards-compliant JSON-LD record

The tool validates the geographic polygon, maps temporal coverage to ISO 8601 format, links multiple identifiers, and structures all 12,847 records for harvest by GBIF, Zenodo, and European data repositories.


REAL-WORLD IMPACT
==================

GLOBAL BIODIVERSITY DATA DISCOVERY
-----------------------------------
Before: The University of Guelph's Biodiversity Institute completes their 5-year Mediterranean cork oak study. The data sits on a local university server:
  * Available only to people who know to contact the institute
  * Not discoverable in GBIF, the global standard for species data
  * Researchers in Africa, South America, Asia searching for "Mediterranean species" never find it
  * The 12,847 carefully collected records remain unknown to 99% of the biodiversity research community

After: Using the Catalogue Record Writer, the institute generates Dublin Core metadata that includes:
  * Title: "5-year species occurrence dataset from Mediterranean cork oak forests"
  * Subject keywords: Biodiversity, Cork Oak Forests, Mediterranean Ecosystems, Species Occurrence
  * Geographic polygon: POLYGON((1.85 41.5, 3.45 41.5, 3.45 42.5, 1.85 42.5, 1.85 41.5))
  * Temporal coverage: 2015-10-20/2020-10-20 (ISO 8601 format)
  * Format: CSV, Excel, JPEG
  * License: CC0 (Public Domain)

GBIF (Global Biodiversity Information Facility) automatically harvests this metadata. Within 2 weeks:
  * The dataset appears in GBIF's global search at gbif.org
  * Researchers worldwide searching "cork oak" or "Mediterranean species" find it
  * A climate researcher in Kenya searching "Mediterranean forest species" discovers the 12,847 records
  * She downloads the CSV and incorporates Mediterranean species drought responses into her African climate adaptation study
  * A conservation biologist in Brazil uses the dataset to compare Mediterranean cork oak management with Brazilian cerrado forests
  * A university course in Spain adds it to their biodiversity informatics curriculum

Impact: Research visibility increased 10,000x; data reuse accelerated across continents; Mediterranean biodiversity science democratized globally through proper metadata.


CLIMATE CHANGE RESEARCH IMPACT
-------------------------------
Before: A climate researcher in Kenya studies drought adaptation in African vegetation. She searches for comparative data on how other Mediterranean-climate ecosystems respond to water stress. She finds scattered papers, but no unified species dataset. She must manually compile her own dataset from published tables (time-consuming, error-prone).

After: Using the metadata from the Catalogue Record Writer:
  * Temporal coverage: 2015-2020 (recent data, critical for climate trend analysis)
  * Spatial coverage: Mediterranean Spain (exact GIS polygon enables map overlay with African data)
  * Subject tags: Mediterranean Ecosystems (machine-searchable)
  * Format: CSV (directly importable into R, Python, GIS software)
  * License: CC0 (legally free to use, no permission needed)

The Kenyan researcher:
  * Searches GBIF for "Mediterranean species" + "oak forests"
  * Finds the Guelph dataset with clear temporal/spatial coverage
  * Downloads 12,847 species occurrence records in CSV format
  * Overlays it on her Kenya drought data using GIS (spatial polygon enables this)
  * Compares drought tolerance traits between Mediterranean and East African species
  * Publishes a comparative drought-adaptation study citing the Guelph dataset
  * Her paper recommends drought-resistant species from the Mediterranean dataset for Kenya's reforestation programs

Impact: Climate adaptation research enabled; international research collaboration accelerated; African environmental policy informed by Mediterranean biodiversity data through proper metadata structure.


INSTITUTIONAL RESEARCH OUTPUT DOCUMENTATION
--------------------------------------------
Before: The University of Guelph reports research productivity to rankings bodies (Times Higher Education, Shanghai Ranking). They count:
  * Number of papers published: 2,847
  * Number of datasets published: "uncertain" (scattered across multiple systems)
  * Data reuse citations: unknown

The university cannot showcase how much their research data is used globally because they have no unified way to track dataset discoverability and downloads.

After: All datasets including the Biodiversity Institute's 5-year cork oak study use the Catalogue Record Writer. The university's research infrastructure now shows:
  * Research datasets catalogued: 1,204 (with standardized DC metadata)
  * Dataset formats available: CSV, Excel, JPEG (diverse formats tracked)
  * Global discoverability: harvested by GBIF, Zenodo, European Open Science repositories
  * Download statistics: cork oak dataset downloaded 847 times in first year (measurable impact)
  * Citations in published papers: 23 papers cite the cork oak dataset within 18 months (trackable via metadata)

When reporting to funders (like Tri-Council Research Initiatives), the university documents:
  * Research data output: 1,204 datasets with 423,000+ downloads globally
  * Data reuse impact: 67 academic papers cite our published datasets
  * Open science leadership: 89% of datasets released under open licenses (CC0, CC-BY)

Impact: Institutional research data leadership documented; funding increased based on demonstrated data reuse impact; reputation enhanced in global research data ecosystem.


CROSS-DISCIPLINARY ENVIRONMENTAL RESEARCH
-------------------------------------------
Before: Three research communities exist in silos:
  * Mediterranean ecology researchers (studying cork oak forests)
  * Climate scientists (modeling drought impacts)
  * Conservation planners (designing protected areas)

Each group searches for "Mediterranean forest data" independently. The Guelph dataset exists, but they don't know about each other's research needs.

After: Using the Catalogue Record Writer metadata:
  * Subject tags: Biodiversity, Cork Oak Forests, Mediterranean Ecosystems, Species Occurrence
  * Spatial coverage: Polygon enables intersection with climate model grids
  * Temporal coverage: Multi-year trend data enables climate analysis
  * Links to related publications: connected to cork oak ecology papers
  * Format diversity: CSV for analysis, JPEG for visualization

Three research communities discover the dataset through different pathways:
  1. Mediterranean ecologist searches GBIF for "cork oak species" → finds it immediately
  2. Climate scientist searches Google Dataset Search for "Mediterranean species + drought" → metadata makes it discoverable
  3. Conservation planner queries LTER (Long Term Ecological Research) network → finds it as affiliated dataset

Result: Collaborative project emerges:
  * Cork oak ecologists + climate scientists + conservation planners coordinate
  * Combined research project: "Climate-adaptive cork oak management for Mediterranean protected areas"
  * Funded by EU H2020 research program
  * Results implemented across Portugal, Spain, France

Impact: Cross-disciplinary collaboration enabled; research funding attracted; environmental management improved through unified data accessibility.


LONG-TERM ECOLOGICAL MONITORING & SCIENCE
-------------------------------------------
Before: The Biodiversity Institute completes their 5-year cork oak study. The data is published, but:
  * It's treated as "finished research" rather than ongoing monitoring
  * Future researchers don't know it's part of a long-term ecological program
  * Version history is unclear (is this v1? v1.1? Will there be v2?)
  * Relationships to prior/future datasets aren't documented

After: The Catalogue Record Writer captures:
  * hasVersion: v1.1 (indicates current version)
  * isVersionOf: reference to the larger cork oak forest monitoring project
  * isPartOf: LTER Network (Long Term Ecological Research)
  * Created/modified dates: indicates when future updates occur

This metadata enables:
  * Year 6-10 follow-up: Institute collects 5 more years of data (2020-2025)
  * New version published: v2.0 released with 25,472 records (double the original)
  * Metadata updated automatically: version tracking shows v1.1 → v2.0 progression
  * Researchers using v1.1 notified of newer version via metadata
  * Citation tracking: papers citing v1.1 vs. v2.0 tracked separately

The dataset becomes a true long-term ecological monitoring resource—like LTER stations that have been collecting data for 40+ years. It's no longer one-off research, but an ongoing, versioned data series that grows and improves over time.

Impact: Long-term ecological research capacity demonstrated; funding for extended monitoring secured; scientific credibility enhanced through sustained data collection commitment.


OPEN DATA & PUBLIC DOMAIN IMPACT
---------------------------------
Before: The cork oak dataset is released with "CC0 (Public Domain)" license, but:
  * Users don't know what CC0 means
  * Some assume they still need permission
  * Commercial users are uncertain about reuse rights
  * Data discovery systems don't understand the license implications

After: The Catalogue Record Writer metadata includes:
  * Rights: CC0 (Public Domain)
  * License explicitly stated in machine-readable format
  * Harvest systems (GBIF, Google Dataset Search, Zenodo) understand license immediately

Result: Unrestricted global reuse:
  * An environmental consulting firm uses the dataset to estimate carbon sequestration in cork oak forests (commercial use)
  * They calculate that Mediterranean cork oaks provide $14.7M annual ecosystem service value
  * They present findings to Spanish government environmental ministry
  * Spain designates 250,000 hectares of cork oak forest as protected areas
  * Decision is informed by the Guelph biodiversity dataset

Another reuse:
  * An NGO in Morocco uses the data to train citizen scientists in species identification
  * They don't need to pay licensing fees (CC0) or seek permission
  * They distribute the dataset to 40 field researchers
  * The NGO submits their own observations back to GBIF, expanding the dataset
  * Guelph scientists see their original data cited and extended by Moroccan conservationists

Impact: Open data amplifies research impact; policy decisions informed by public biodiversity data; global conservation action enabled through unrestricted data sharing.


================================================================================

DISCLAIMER
===========

This README documents a DUMMY EXAMPLE output created for demonstration purposes only. The scenario, dataset details, research team information, dates, geographic coordinates, and impact examples are realistic illustrations of how the Catalogue Record Writer tool functions - but are not based on actual production records.

The JSON-LD record provided alongside this README shows what actual tool output looks like for Dublin Core (dataset-specific) metadata applied to biodiversity research - but should be treated as a TEST EXAMPLE demonstrating dataset cataloguing workflows for environmental science.

This example illustrates how the tool handles research datasets with emphasis on:
  * Complex geographic coverage (GIS polygon formats)
  * Temporal coverage ranges (ISO 8601 period notation)
  * Multiple data formats (CSV, Excel, imagery)
  * Institutional network affiliation (LTER, GBIF harvesting)
  * Version tracking and dataset evolution
  * Public domain and open data impact
  * Cross-disciplinary research discovery
  * Long-term ecological monitoring documentation

When used with real biodiversity datasets and environmental research projects, the tool operates identically to this example, but produces authoritative metadata reflecting actual research institutions, contributors, geographic regions, and data repositories.

For questions about integrating this tool with your institutional data repository, GBIF harvesting systems, or research data management workflows, contact your system administrator.

================================================================================

Last Updated: December 2025
Tool: Catalogue Record Writer v1.0
Schema: Dublin Core (Dataset-Specific)
Record Type: Environmental/Biodiversity Research Dataset
Institution: University of Guelph - Biodiversity Research Institute
Network: LTER (Long Term Ecological Research)
