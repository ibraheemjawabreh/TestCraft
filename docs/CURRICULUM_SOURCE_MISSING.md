# Original Master Curriculum required

The exact approved Master Curriculum was not included. The planning estimates (9 Core paths, approximately 273 Core and 73 Advanced lessons) are not a source manifest.

Available verified source: `src/lib/admin/seeder.ts`, baseline commit `100a4fc`: QA Foundations / intro-to-qa (3 lessons), manual-testing-fundamentals (3), bug-reporting-and-defect-management (3). These are demo inventory titles, not a claim of canonical approval. See `content/verified-manifest.json` for their exact scoped keys and provenance.

Still required: original path/module/lesson bilingual titles, exact order, stable slugs, educational objectives and any approved prerequisites for all remaining Core and Advanced entries. Import that list through Curriculum Factory as JSON or the documented CSV format. Validation rejects duplicates, ambiguous ordering and unknown prerequisite references. No application rewrite is needed to continue generation.

## Curriculum v2 clarification

The user-confirmed opening sequence for the intended new Curriculum v2 is:

1. What is Quality Assurance?
2. Why is Software Quality Important?
3. QA vs Testing vs Debugging

These three titles are not present in the current demo manifest. The full approved list of paths, modules and lessons is still missing, so the 9-lesson demo bundle must not be presented or imported as the new curriculum. The Supabase migrations install the Curriculum Factory schema and functions; they do not insert this curriculum's lesson content. A successful migration therefore does not mean new lessons were added.

All pilot content is unpublished. Expert editorial approval and a connected, migrated test database are required before publication.
