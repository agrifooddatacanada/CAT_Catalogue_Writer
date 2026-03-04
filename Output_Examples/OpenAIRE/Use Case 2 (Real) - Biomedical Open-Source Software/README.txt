PROTEIN STRUCTURE PREDICTION SOFTWARE PIPELINE (Used real data)
Example Output

================================================================================

SCENARIO
========

A bioinformatics research team at the Centre for Genomic Regulation (CRG) in Barcelona has developed nf-core/proteinfold - an open-source computational pipeline for predicting 3D protein structures using state-of-the-art deep learning models like AlphaFold2.

The team needs to:
1. Make the software discoverable for other research groups worldwide
2. Ensure proper credit to all 7 developers (with ORCID identifiers)
3. Link the software to its GitHub repository for collaborative development
4. Enable other researchers to cite the specific version they used
5. Show how the pipeline connects to related computational resources

Instead of manually documenting the software across multiple platforms (GitHub README, Zenodo, institutional repository), the lead developer uses the Catalogue Record Writer tool:
- Opens the tool and selects "OpenAIRE - Repository Profile"
- Answers a guided questionnaire (~20 minutes) with software information:
  * Pipeline title and detailed technical description
  * All 7 creators with affiliations (CRG Barcelona, Seoul National University, Seqera Labs)
  * ORCID identifiers for each developer
  * Creation date (December 2022) and last update (July 2024)
  * Publisher (Zenodo - standard for research software)
  * Main DOI (10.5281/zenodo.7437038) and version (1.0.0)
  * License (CC-BY 4.0 International)
  * Links to GitHub repository and previous version
  * Technical details (Nextflow DSL 2, Docker/Singularity containers)
  * File size and documentation
- Clicks "Export as JSON-LD"
- Downloads a standards-compliant JSON-LD record

The tool validates mandatory fields, maps all creator ORCIDs correctly, ensures version information is structured, and links the software to its GitHub repository and related outputs. Developers' contributions are now properly attributed and discoverable.


REAL-WORLD IMPACT
==================

DEVELOPER ATTRIBUTION & CAREER RECOGNITION
-------------------------------------------
Before: A bioinformatician contributes code to nf-core/proteinfold but their work remains invisible in traditional academic metrics. Their GitHub commits don't appear on their CV, their contributions aren't tracked for promotion/hiring decisions.

After: The JSON-LD record contains all 7 developers with ORCID identifiers (e.g., Baltzis Athanasios: 0000-0002-7495-1218). When the software is cited:
  * Each developer's ORCID profile automatically updates to show their software contributions
  * Research evaluation committees see not just papers, but also tools they built
  * Other researchers discovering the software can directly credit individual developers
  * The DOI (10.5281/zenodo.7437038) creates a citable artifact that appears on CVs

Impact: Developer career recognition improved; contribution visibility extended beyond GitHub to institutional/funder evaluation systems.


GLOBAL RESEARCHER ADOPTION
---------------------------
Before: A protein researcher in Japan wants to use the latest proteinfold pipeline but struggles to find it. GitHub is discoverable, but version tracking is chaotic. They can't easily find which version to cite in a paper.

After: Through the Catalogue Record Writer metadata:
  * The researcher discovers nf-core/proteinfold via EOSC portal search (via OpenAIRE harvesting)
  * The JSON-LD record shows version 1.0.0 with DOI 10.5281/zenodo.7437038
  * They immediately see the GitHub link (https://github.com/nf-core/proteinfold) for code and documentation
  * They see the previous version DOI (10.5281/zenodo.7437037) for version tracking
  * All 7 developers are listed with their ORCIDs, showing institutional credibility
  * CC-BY 4.0 license shows they can use it freely (even commercially) with attribution

They download version 1.0.0, cite the DOI in their paper, and contribute bug fixes back to GitHub - all discoverable through the same metadata record.

Impact: Software adoption accelerated from months of searching to minutes; citation tracking enabled; community contributions encouraged.


PIPELINE IMPROVEMENT & SUSTAINABILITY
--------------------------------------
Before: The nf-core community maintains 50+ pipelines across multiple GitHub repositories. Tracking which pipelines have been documented, which versions exist, which have related datasets/publications - requires manual spreadsheets and email coordination.

After: Each pipeline (including proteinfold) has a machine-readable JSON-LD record:
  * Repository manager queries: "Show all nf-core pipelines updated in 2024"
  * System returns: nf-core/proteinfold (last updated July 2024), with 1.0.0 as latest version
  * Links show related outputs (papers using the pipeline, datasets produced)
  * New researchers instantly understand pipeline purpose, creators, and usage without hunting through docs

The structured metadata also helps:
  * Automated validation: "All software must have DOI and GitHub link" - checked automatically
  * Community dashboards: Show adoption metrics for each pipeline
  * Funding reports: Horizon Europe projects can automatically report "Software tool developed with X citations"

Impact: Pipeline ecosystem becomes discoverable infrastructure rather than scattered GitHub repos; community coordination streamlined.


INSTITUTIONAL REPOSITORY INTEGRATION
-------------------------------------
Before: CRG wants to showcase software tools developed by their team. They manually maintain a list of tools on their website. If a tool moves to a new GitHub organization or gets a new version, the website goes out of sync.

After: CRG's repository automatically harvests the JSON-LD record:
  * nf-core/proteinfold automatically appears in "CRG Software" collection (via creator affiliation: "Centre for Genomic Regulation")
  * When a new version is released, the relatedIdentifier ("IsNewVersionOf") allows the repository to show version history
  * Metrics dashboard shows: "CRG software has been cited 147 times across 89 papers"
  * Funding page shows: "Horizon Europe projects produced 12 software tools" (harvested from all JSON-LD records)

No manual updates needed - the structured metadata does the work.

Impact: Institutional software visibility improved; funder reporting automated; community contributions traceable.


================================================================================

DISCLAIMER
===========

This README documents an EXAMPLE output (Used real data for input) created for demonstration purposes only. The scenario, software details, developer information, and impact examples are realistic illustrations of how the Catalogue Record Writer tool functions - but are not based on actual production records.

The JSON-LD record provided alongside this README shows what actual tool output looks like for research software - but should be treated as a TEST EXAMPLE demonstrating software-specific metadata fields (ORCID identifiers, GitHub links, version tracking, container formats).

This example illustrates how the tool handles software outputs differently than articles or datasets, with emphasis on:
  * Developer attribution and ORCID integration
  * Version control and related identifiers
  * Repository links (GitHub, Zenodo)
  * Technical implementation details (containers, dependencies)

When used with real software research outputs, the tool operates identically to this example, but produces authoritative metadata reflecting actual developers, institutions, and repositories.

For questions about integrating this tool with your software distribution or institutional systems, contact your system administrator.

================================================================================