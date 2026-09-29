# NEXORA diagnostic catalog — bounded runtime projection

Version: `pmc-catalog-2026-09-28-v0.1`.

This server-only snapshot contains 112,405 LOINC 2.83 entries available through
NLM, 64,009 public GTR listings from the 2026-09-27 source snapshot and 284
PMC examination families. The 759-entry NLM UCUM list is separate. It is not
the complete UCUM expression grammar. The 21 gzip shards total 3,626,124 bytes.
Source URLs, input hashes, source versions and each shard's checksum/count are
in `manifest.json`. The loader validates them before serving any result.

The source is the separately prepared `PMC_Global_Diagnostics_v0.1` package.
Regenerate without network or patient data:

```sh
python3 scripts/catalog/import-snapshot.py --source /absolute/path/to/PMC_Global_Diagnostics
```

LOINC source field names, code/name text and third-party notices are retained.
The 7,668 entries with external rights retain only available code/name/property/
method and rights metadata; questionnaire content and answer lists are excluded.
This is an NLM-derived subset, not the full LOINC distribution. SYSTEM,
TIME_ASPCT, SCALE_TYP, CLASS, STATUS and official linguistic variants are not
available here. Name similarity cannot establish a clinically correct LOINC
mapping. Existing PMC aliases are search hints, not translations of LOINC names.

GTR is a submitter-provided registry. Clinical/Research denotes its record type,
not validation, endorsement or a recommendation. The PMC family namespace is
separate from standards. Do not label its identifiers as LOINC codes.

The runtime adapter performs no OCR, image decoding, unit conversion, reference
range interpretation, diagnosis, clinical verification or persistent mapping.
The full source package's DICOM modalities and 42 intake profiles are outside
this increment. Missing and unavailable matches remain explicit. Neither
catalog coverage nor successful tests establish worldwide clinical coverage.

Read [attributions](licenses/ATTRIBUTIONS.md), [LOINC license](licenses/license.txt),
[LOINC notice](licenses/LOINC_short_license.txt), and
[UCUM license](licenses/ucum_license.txt) before redistribution.
