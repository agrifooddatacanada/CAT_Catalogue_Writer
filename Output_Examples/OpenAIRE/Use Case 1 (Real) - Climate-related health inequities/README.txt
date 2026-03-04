CLIMATE HEALTH INEQUITIES ARTICLE (Used real data)
Example Output

================================================================================

SCENARIO
========

A librarian at an EU research institution receives a climate science paper published in The Lancet Planetary Health. The article - "Approaching unsafe limits: climate-related health inequities within and beyond Europe" - was supported by two Horizon Europe projects (CATALYSE and IDAlert).

The librarian needs to:
1. Register the article in the institutional repository
2. Ensure it's discoverable through the European Open Science Cloud (EOSC)
3. Link it properly to the funding sources for funder compliance reporting
4. Make it citable with a persistent identifier

Instead of manually filling spreadsheets or database forms, the librarian uses the Catalogue Record Writer tool:
- Opens the tool and selects "OpenAIRE - Repository Profile"
- Answers a guided questionnaire (~15 minutes) with basic information:
  * Article title, 5 authors and their affiliations
  * Publication date (November 2023)
  * Publisher (Elsevier)
  * Repository Handle ID (10230/58406) and DOI (10.1016/j.lanepe.2023.100683)
  * The two Horizon Europe project numbers (101057131 and 101057554)
  * License (CC-BY 4.0 International)
  * Keywords in Spanish and English
  * Journal ISSN (2666-7762)
- Clicks "Export as JSON-LD"
- Downloads a standards-compliant JSON-LD record

The tool validates mandatory fields, ensures identifiers are properly structured, and maps all questionnaire answers to OpenAIRE field definitions. No technical schema knowledge required.


REAL-WORLD IMPACT
==================

FUNDER REPORTING (European Commission)
--------------------------------------
Before: EU program officers manually search multiple repositories and email coordinators quarterly to ask "Show me all outputs from grant 101057131."

After: The European Commission queries the EOSC metadata registry and automatically receives all outputs linked to CATALYSE (grant 101057131) and IDAlert (grant 101057554) - no manual compilation, no delays, instant compliance verification.

Impact: Funder reporting time reduced from 20+ hours per grant per year to automated real-time dashboards.


RESEARCHER DISCOVERY
--------------------
Before: A climate scientist searching for "climate-related health inequities" finds fragmented results across PubMed, Google Scholar, the publisher website, and the institutional repository - each showing different metadata, some missing author affiliations.

After: The researcher discovers the article through:
  * Institutional repository (via Handle 10230/58406)
  * Publisher's DOI system (via 10.1016/j.lanepe.2023.100683)
  * EOSC portal (via OpenAIRE metadata harvesting)
  * Subject-specific searches (via keywords: "salut urbana", "salut ambiental")

All three pathways show consistent metadata (same authors, affiliations, funding). The researcher can immediately see the paper was funded by CATALYSE/IDAlert and find other outputs from those projects.

Impact: Researcher discovery time reduced from days of searching multiple sources to minutes.


INSTITUTIONAL IMPACT
--------------------
Before: The librarian spends 30+ minutes per article manually filling database forms, worrying about formatting errors, duplicating data entry across systems.

After: The librarian spends 15 minutes answering a guided questionnaire in plain language ("Who created this?", "What's the publication date?", "Any funding?"). The tool generates production-ready JSON-LD that can be:
  * Validated against OpenAIRE standards automatically
  * Harvested by EOSC and research portals via OAI-PMH
  * Indexed by Google Scholar and search engines
  * Imported into the institutional repository without reformatting

Impact: Cataloging time per article reduced by 50%, error rates eliminated through validation, metadata quality improved through standardization.


================================================================================

DISCLAIMER
===========

This README documents an EXAMPLE output (Used real data for input) created for demonstration purposes only. The scenario, article details, and impact examples are realistic illustrations of how the Catalogue Record Writer tool functions - but are not based on actual records currently in production systems.

The JSON-LD record provided alongside this README shows what actual tool output looks like structurally, but should be treated as a TEST EXAMPLE, not a live catalogue record.

When used with real research data, the tool operates identically to this example, but produces authoritative metadata that reflects actual institutional, funding, and publication information.

For questions about integrating this tool with your repository or production systems, contact your system administrator.

================================================================================