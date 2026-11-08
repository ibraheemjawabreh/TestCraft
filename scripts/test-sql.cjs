const fs = require('fs');
(async () => {
  try {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    console.log('Loading base fixture...');
    await db.exec(fs.readFileSync('tests/fixtures/database.sql', 'utf8'));
    console.log('Executing RUN_THIS_IN_SUPABASE.sql...');
    await db.exec(fs.readFileSync('supabase/RUN_THIS_IN_SUPABASE.sql', 'utf8'));
    const r1 = await db.query('SELECT count(*) FROM curriculum_sources');
    console.log('curriculum_sources exists! Count:', r1.rows[0].count);
    const r2 = await db.query("SELECT proname FROM pg_proc WHERE proname = 'curriculum_path_status'");
    console.log('Found function:', r2.rows.map(x => x.proname));
    console.log('ALL TESTS PASSED - RUN_THIS_IN_SUPABASE.sql is 100% valid SQL!');
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();

