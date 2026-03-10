CATALOGUE RECORD WRITER - MEDICAL RESEARCH INFRASTRUCTURE
Dummy Example Output

================================================================================

SCENARIO
========

The Canada Research Council funds a national antimicrobial resistance (AMR) genomic surveillance program spanning 5 years (2018-2023). The project monitors bacterial infections across 215 NHS hospital sites, generating massive research outputs essential for real-time public health response:

• 156 peer-reviewed publications (clinical findings, epidemiological analysis, methodological papers)
• 31 genomic datasets (47,000+ bacterial isolates sequenced; FASTA format genetic data)
• 8 bioinformatics software tools (sequence alignment, mutation detection, phylogenetic analysis)
• 247 reference bacterial sequences (gold-standard genotypes for comparison)

The research is led by Canada Research Council with contributors Niraj Patil, Taylor Snow, Jon Swift (principal investigators from 3 hospital networks).

Project Coordinator's Critical Challenge:
1. Link publications to datasets: "Which dataset was used in Paper #47? What bacteria did it analyze?"
2. Enable real-time epidemiological queries: "Find all genomic sequences from hospitalized patients (March 2020-2022)"
3. Support policy response: "During COVID-19, show secondary bacterial infection trends"
4. Track reference sequences: Which gold-standard sequences are used in surveillance?
5. Manage computational infrastructure: Which software tools process which datasets?

Instead of manually maintaining spreadsheets linking 156 papers to 31 datasets (requiring 4,000+ manual links), the coordinator uses the Catalogue Record Writer tool:

- Opens the tool and selects "Dublin Core - Medical Research Infrastructure Profile"
- Answers a guided questionnaire (~22 minutes) with project information:
  * Project title: "AMR Genomic Surveillance (5 years, National)"
  * Project type: Research infrastructure collection (Collection, InteractiveResource)
  * Creator/funder: Canada Research Council
  * Contributors: Niraj Patil, Taylor Snow, Jon Swift (lead investigators)
  * Creation date: February 19, 2018 (project launch)
  * Project period: 2018 to 2023 (temporal coverage)
  * Geographic scope: All Canadian regions, 90% of NHS acute hospital trusts
  * Project identifier: https://ca-research-council.org/genomic/MRC/R031537
  * Project extent: 156 publications, 31 datasets, 8 software tools, 247 reference sequences
  * Data formats: PDF (papers), FASTA (DNA sequences), CSV (metadata), JSON API (query interface)
  * Accrual methods: Loan (hospitals contribute isolate samples), Deposit (researchers submit sequences)
  * License: CC0 (public domain) + CC-BY 4.0 (attribution-based reuse)
  * Subject keywords: Antimicrobial Resistance, Genomic Surveillance, Clinical Microbiology, Pathogen Genomics
  * Language: English, French (bilingual Canada)
  * Related infrastructure: IRIDA platform (integrated bioinformatics workflow)

- Clicks "Export as JSON-LD with Data Linkages"
- Downloads standards-compliant JSON-LD record with embedded relationships:
  * Publication #47 → linked datasets [D3, D7, D12]
  * Software tool #2 (Mutation Detector) → processes datasets [D1-D31]
  * Reference sequences → indexed by organism type, geographic origin, resistance profile

The tool creates structured metadata enabling real-time queries: epidemiologists can instantly find "all E. coli sequences from Ontario hospitals, 2020-2022" without manually reviewing 31 datasets.


REAL-WORLD IMPACT
==================

PANDEMIC RESPONSE & REAL-TIME EPIDEMIOLOGY
-------------------------------------------
Before: COVID-19 pandemic hits Canada (March 2020). Hospitals report "secondary bacterial infections in COVID-19 patients are increasing—what's driving this?"

Epidemiologists need to answer urgently:
• Which bacteria are causing secondary infections?
• Is resistance increasing?
• Which hospitals are most affected?
• Are certain bacterial strains emerging?

Without the genomic surveillance registry, process would be:
  * Contact 31 dataset managers asking for "COVID-era bacterial sequences"
  * Wait 2-4 weeks for responses (some datasets may not be organized)
  * Manual compilation of 47,000+ sequences across datasets
  * Identify bacterial species manually (error-prone, time-consuming)
  * Statistical analysis takes 6-8 weeks
  * Policy response delayed by 3 months
  * During pandemic, a 3-month delay costs lives (hospitals not informed of emerging resistant strain)

After: Using the Catalogue Record Writer medical research registry with real-time query capability:
  * Epidemiologist opens registry query interface
  * Selects: "All datasets; Temporal filter: March 2020-2023; Geographic filter: All Canadian regions; Metadata: Hospital admission data"
  * Results returned in 30 seconds:
    - 12,847 bacterial sequences from hospitalized COVID-19 patients
    - Organism breakdown: 4,200 Staph aureus (28% methicillin-resistant), 3,100 Klebsiella pneumoniae (67% carbapenem-resistant), 2,400 Pseudomonas aeruginosa (45% pan-resistant)
    - Geographic hotspot: Toronto hospitals showing 2.3× higher resistant Klebsiella than national average
    - Temporal trend: Resistance increased from 32% (March 2020) to 58% (November 2021)

Result (2020-2022):
  * Week 1: Epidemiologists publish rapid communication in Canadian Medical Association Journal: "Emerging antimicrobial-resistant Klebsiella pneumoniae in COVID-19 hospitalized patients"
  * Week 2: Public Health Agency of Canada issues infection control alert to all hospital networks
  * Week 3: Hospitals in Toronto implement enhanced screening protocols for resistant Klebsiella (isolate suspected cases, enhanced infection control)
  * Week 4: Resistance rate in Toronto begins declining (new protocols working)
  * Month 2: National guidance updated based on emerging surveillance data
  * Impact: Estimated 1,200 hospital-acquired infection cases prevented; 200 deaths averted; reduced antibiotic overuse (cost savings: €8M)

Impact: Real-time genomic data enabled policy response in days (vs. months); lives saved through rapid epidemiological intelligence; hospital infection control optimized based on surveillance evidence; antibiotic stewardship informed by pathogen surveillance.


RESEARCH CONTINUITY & PUBLICATION CREDIBILITY
----------------------------------------------
Before: A researcher publishes Paper #47: "Temporal trends in resistant Staph aureus, 2018-2022" (published in Lancet Infectious Diseases). But:
  * Paper doesn't clearly state which datasets were used
  * Readers cannot verify which of 31 datasets contributed data
  * Other researchers wanting to cite or build on this work must contact original authors
  * Reproducibility: Unclear which bacterial isolates were included

After: Using the Catalogue Record Writer with publication-to-dataset linking:
  * Paper #47 metadata includes:
    - "Analyzed datasets: D2, D5, D8, D11, D14, D18, D23 (7 of 31 datasets)"
    - "Sample size: 3,200 Staph aureus isolates"
    - "Geographic coverage: Ontario, Quebec, British Columbia (3 provinces)"
    - "Temporal span: 2018-2022 (5 years)"
    - "Resistance phenotypes tracked: Methicillin, fluoroquinolone, vancomycin resistance"
  * Readers accessing paper can:
    - Click linked datasets to access raw data (if open access)
    - View methodology: How were isolates selected? What metadata was captured?
    - Reproduce analysis: Access same datasets, validate findings
    - Extend research: Researchers use same datasets for new analysis

Result:
  * Paper #47 becomes highly citeable: 150+ subsequent citations (vs. typical 12 for AMR papers)
  * Researcher receives invitations to speak at international conferences
  * Three independent teams replicate analysis using linked datasets, confirming findings
  * Collaborative meta-analysis published: "Multi-national comparison of Staph aureus resistance trends" (uses Paper #47 data alongside UK, US, Australian data)
  * Registry becomes standard reference: "See linked datasets in AMR Registry" becomes common phrasing in methods sections

Impact: Research reproducibility enhanced; transparency increases citations; collaborative science accelerated through data linkage; evidence becomes more robust through independent validation.


ANTIMICROBIAL STEWARDSHIP & CLINICAL GUIDELINES
-----------------------------------------------
Before: Hospitals want to update their antibiotic prescribing guidelines based on local resistance patterns. But:
  * Hospital A queries: "What % of our isolates are resistant to cephalosporins? (Data scattered across surveillance reports)"
  * Hospital A manually reviews 31 datasets to find their samples
  * Takes 6 weeks to compile answer: "48% resistant"
  * During those 6 weeks, prescribing continues with outdated assumptions
  * Guidelines updated slowly; antibiotic selection remains suboptimal

After: Using the Catalogue Record Writer with geographic-filtered queries:
  * Hospital A epidemiologist queries registry:
    - Filter: "My hospital only"
    - Organism: "All"
    - Antibiotics: "Cephalosporin (3rd generation)"
    - Time period: "Last 12 months"
  * Results return in 2 minutes:
    - 847 isolates tested for cephalosporin resistance (last 12 months)
    - Resistance rate: 48% overall; breakdown by organism:
      * E. coli: 32% resistant
      * Klebsiella: 67% resistant
      * Pseudomonas: 54% resistant
    - Resistance trends: Increasing 2% per year (cephalosporin resistance)
    - Alternative susceptibilities: 89% susceptible to carbapenems (but resistance to this class also rising: 11%)

Hospital A response (within 1 week):
  * Updates antibiotic stewardship guidelines: "For empiric treatment of suspected gram-negative infection, use carbapenem (cephalosporin resistance too high); if carbapenem unavailable, consider combination therapy (fluoroquinolone + aminoglycoside)"
  * Trains 200 prescribers on new guidance
  * Implements prospective audit: Track prescriptions post-implementation
  * 3-month follow-up: Inappropriate cephalosporin prescriptions down 67%; carbapenem use increases appropriately; clinical outcomes improve (treatment failure rate down 23%)

Scaling impact (all 90 hospital trusts):
  * Each hospital uses same registry data to update local guidelines
  * National consensus emerges: Cephalosporin use decreases 40% nationally
  * Carbapenem resistance monitored closely (emergence is main concern)
  * Antibiotic consumption becomes data-driven (not opinion-driven)
  * Cost savings: Reduced inappropriate antibiotic use = €45M annually

Impact: Clinical guidelines data-driven; hospital prescribing optimized; treatment outcomes improved; antibiotic resistance contained through surveillance-informed stewardship; cost savings through rationalization.


SOFTWARE TOOL VALIDATION & BIOINFORMATICS STANDARDIZATION
----------------------------------------------------------
Before: Eight bioinformatics software tools are developed (mutation detection, phylogenetic analysis, etc.). But:
  * Tool #3 ("Phylo Analyzer") claims to detect resistant mutations
  * Different hospitals use different versions (v1.2, v1.5, v2.0)
  * Results are incomparable: Hospital A uses v1.2; Hospital B uses v2.0
  * Publications using Tool #3 don't specify which version
  * Questions emerge: "Are results comparable across publications?"

After: Using the Catalogue Record Writer with software-to-dataset-to-publication linkage:
  * Software Tool #3 metadata includes:
    - "Used in: 23 publications (listed by ID and citation)"
    - "Tested on datasets: D1, D3, D5, D8, D12, D15, D18, D21, D24, D27, D30 (11 of 31 datasets)"
    - "Version history: v1.0 (2018), v1.2 (2019), v1.5 (2021), v2.0 (2023)"
    - "Validation data: 4,200 isolates with known resistance phenotypes"
    - "Performance metrics per version:
      * v1.2: Sensitivity 91%, Specificity 94% (tested on D1, D3, D5)
      * v2.0: Sensitivity 97%, Specificity 98% (tested on D1-D30)"
    - "Publications using v1.2: [Papers 3, 7, 12, 15, 18, 21]"
    - "Publications using v2.0: [Papers 22, 34, 45, 56, 67, 78]"

Result:
  * Researchers can identify: "Is my analysis using validated version? How does my tool version compare to others?"
  * Meta-analysis of papers becomes possible: "Papers using v1.2 showed 91% sensitivity; papers using v2.0 show 97% sensitivity—results ARE comparable"
  * Tool developers can track impact: "My tool is used in 23 publications, 11 datasets; adoption is strong"
  * Standardization emerges: Most recent publications use v2.0; earlier publications transparently identified as using older versions
  * Benchmark datasets become research standard: "Validate your mutation detector on Dataset D1 (gold-standard 4,200 isolates)"

Impact: Software validation transparent; tool comparison standardized; bioinformatics reproducibility enhanced; benchmark datasets established; method quality quantified and tracked.


REFERENCE SEQUENCE STEWARDSHIP & INTERNATIONAL COLLABORATION
------------------------------------------------------------
Before: Project maintains 247 reference bacterial sequences (gold-standard genomes for comparison). But:
  * Researchers don't know reference sequences exist
  * International teams independently curate their own reference sequences
  * No coordination: Europe, US, Canada each have different "gold standards"
  * Publications cite reference sequences inconsistently
  * Collaborative analysis across borders is difficult (incompatible references)

After: Using the Catalogue Record Writer with reference sequence metadata:
  * Reference sequence metadata includes:
    - "ID: Staph_aureus_MRSA_Toronto_2021" (Canadian MRSA reference)
    - "Organism: Staphylococcus aureus (MRSA phenotype)"
    - "Geographic origin: Toronto, Ontario, Canada"
    - "Year isolated: 2021"
    - "Phenotypic properties: Resistant to methicillin, fluoroquinolone, vancomycin-intermediate"
    - "Used in publications: [Papers 12, 23, 45, 67, 89] (5 papers)"
    - "Used in datasets: [D3, D7, D11, D15, D19] (5 datasets)"
    - "Citation: DOI:10.xxxx/ref-seq-mrsa-tor-2021"
    - "Availability: Public domain (CC0); download from registry"
  * International collaboration: EU researchers query for "Staph aureus MRSA references from all countries"
  * Results: Find Canadian reference (Toronto_2021), UK reference (London_2022), US reference (NYC_2021)
  * Collaborative publication emerges: "International comparison of MRSA genomic signatures" using references from all 3 countries

Result:
  * Reference sequences become international research assets
  * Collaborative projects use coordinated references: "We aligned sequences to Toronto_2021, London_2022, NYC_2021 references"
  * Citation tracking: "Toronto_2021 reference cited in 5 Canadian papers, 3 EU papers, 2 US papers" (international reach visible)
  * Standardization improves: International researchers increasingly use published reference sequences (vs. creating their own)
  * Reuse metrics demonstrate value: References are downloaded 1,200+ times (year 1); "most-downloaded" reference sequences ranked in registry

Impact: International reference standardization enabled; collaborative genomics research accelerated; reproducibility across borders improved; Canadian research contribution visible in global context.


DATA PRESERVATION & LONG-TERM ARCHIVAL
---------------------------------------
Before: The 5-year project ends (2023). But critical data (47,000 bacterial sequences) is at risk:
  * Genomic data stored on research servers (will be decommissioned post-project)
  * No permanent archival plan for raw datasets
  * Publications cite datasets that may disappear
  * Future researchers cannot access data (servers gone, contacts lost)

After: Using the Catalogue Record Writer with archival metadata and preservation tracking:
  * Dataset preservation status tracked in registry:
    - Dataset D1: "Archived at Canadian Institute for Health Information repository (permanent preservation agreement)"
    - Dataset D15: "Archived at ENA (European Nucleotide Archive; mirrored globally)"
    - Dataset D23: "Archival pending (requires €15K preservation fund)"
  * Funder requirement: All 31 datasets must achieve permanent archival status by 2024
  * Coordination through registry:
    - 28 datasets already archived (cost: €200K over 5 years)
    - 3 datasets (D12, D23, D29) require additional archival funding
  * Funding secured: €50K grant for "AMR Data Preservation Initiative"
  * By end of 2024: 31/31 datasets permanently archived

Result (2030+):
  * New researcher (7 years post-project) wants to analyze historical trends in resistant Klebsiella
  * Searches registry: "Klebsiella pneumoniae, all years, all regions"
  * Access: All 9 relevant datasets available (archived, permanently preserved)
  * Retrieves data from archives, reproduces analyses from 2018-2023
  * Publishes: "Long-term trends in carbapenem-resistant Klebsiella: From 2018 surveillance to 2030" (using original datasets)
  * Cites: "Data accessed from Canadian Institute for Health Information Archive; originally collected 2018-2023 AMR Genomic Surveillance Project"

Impact: Research legacy preserved 30+ years; long-term surveillance continuity enabled; future epidemiology research possible; original data accessible indefinitely; evidence base grows with time instead of disappearing.


================================================================================

DISCLAIMER
===========

This README documents a DUMMY EXAMPLE output created for demonstration purposes only. The scenario, project details, Canada Research Council information, hospital network statistics, datasets, publications, software tools, and impact examples are realistic illustrations of how the Catalogue Record Writer tool functions - but are not based on actual production records.

The JSON-LD record provided alongside this README shows what actual tool output looks like for Dublin Core (medical-research-infrastructure-specific) metadata applied to genomic surveillance programs, clinical research networks, and public health infrastructure - but should be treated as a TEST EXAMPLE demonstrating medical research cataloguing workflows.

This example illustrates how the tool handles medical research infrastructure with emphasis on:
  * Large-scale research coordination (215 hospital sites, 5-year surveillance)
  * Multi-output integration (156 publications + 31 datasets + 8 software tools + 247 references)
  * Real-time epidemiological queries (temporal, geographic, organism-specific filtering)
  * Publication-to-dataset linkage (transparency, reproducibility, verification)
  * Software tool tracking (version management, validation, performance metrics)
  * Reference sequence stewardship (international collaboration, standardization)
  * Data preservation and long-term archival (legacy research protection)
  * Pandemic response and policy impact (rapid information access during crisis)
  * Clinical guideline development (evidence-based hospital practice change)
  * Antibiotic stewardship (surveillance-informed prescribing)

When used with real medical research programs, genomic surveillance networks, and public health infrastructure, the tool operates identically to this example, but produces authoritative metadata reflecting actual research projects, findings, and clinical/policy impacts.

For questions about integrating this tool with your hospital networks, genomic databases, public health systems, or clinical research infrastructures, contact your research IT director or public health informatics team.

================================================================================

Last Updated: December 2025
Tool: Catalogue Record Writer v1.0
Schema: Dublin Core (Medical Research Infrastructure-Specific)
Record Type: Medical Research Infrastructure / Genomic Surveillance Network
Program: AMR Genomic Surveillance (5 years, National)
Duration: 5 years (February 2018 – 2023)
Geographic Reach: All Canadian regions; 90% of NHS acute hospital trusts
Program Scale: 215 hospital sites; 47,000+ bacterial isolates; 156 publications; 31 datasets
Outputs: 156 publications, 31 genomic datasets, 8 bioinformatics software tools, 247 reference sequences
Data Formats: PDF, FASTA (DNA sequences), CSV, JSON API
Crisis Response: Real-time COVID-19 pandemic secondary infection surveillance (2020-2022)
Policy Impact: Hospital infection control guidance; antibiotic stewardship protocols; national surveillance coordination
Licensing: CC0 (public domain) + CC-BY 4.0 (attribution-based reuse)
