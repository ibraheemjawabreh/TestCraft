// Local-only adapter for the PostgREST subset used in the student benchmark.
// The application still runs its real production bundle and Supabase SDK.
const http = require('node:http')
const fs = require('node:fs')
const { createHash, createHmac } = require('node:crypto')
const { setTimeout: delay } = require('node:timers/promises')
const { PGlite } = require('@electric-sql/pglite')

const url = 'http://127.0.0.1:3211'
const key = 'testcraft-perf-fixture'
const uid = index => '00000000-0000-4000-8000-00000000000' + index
const id = name => { const h = createHash('md5').update(name).digest('hex'); return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-') }
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const users = new Map()
const session = (index, expired = false) => {
  const user = { id: uid(index), aud: 'authenticated', role: 'authenticated', email: 'fixture' + index + '@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  const expires_at = Math.floor(Date.now() / 1000) + (expired ? -3600 : 3600)
  const jwt = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: user.id, role: user.role, exp: expires_at, aud: user.aud })
  const access_token = jwt + '.' + createHmac('sha256', key).update(jwt).digest('base64url')
  users.set(access_token, user)
  return { access_token, token_type: 'bearer', refresh_token: 'fixture-refresh-' + index, expires_at, expires_in: 3600, user }
}
const relations = {
  lessons: { learning_modules: 'module_id', learning_paths: 'learning_path_id' },
  learning_modules: { learning_paths: 'learning_path_id' },
  challenges: { learning_modules: 'module_id' },
  lesson_progress: { lessons: 'lesson_id' },
  module_progress: { learning_modules: 'module_id' },
  challenge_attempts: { challenges: 'challenge_id' },
  bug_reports: { challenges: 'challenge_id' },
  user_badges: { badges: 'badge_id' },
  ai_evaluations: { bug_reports: 'report_id' },
}
const tables = new Set([...Object.keys(relations), 'learning_paths','learning_path_progress','profiles','badges','activity_attempts'])
const quoted = name => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw Error('Invalid fixture identifier: ' + name)
  return '"' + name + '"'
}
const split = input => {
  let depth = 0, start = 0
  const pieces = []
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '(') depth++
    if (input[i] === ')') depth--
    if (input[i] === ',' && depth === 0) { pieces.push(input.slice(start, i)); start = i + 1 }
  }
  return [...pieces, input.slice(start)].filter(Boolean)
}

function readQuery(table, params, head) {
  const args = [], joins = [], aliases = new Map([['','t']])
  const embeddedFilters = new Set()
  function projection(fields, from, alias, prefix, nested) {
    return split(fields).flatMap(field => {
      if (field === '*' && !nested) return [alias + '.*']
      const match = /^(?:(\w+):)?(\w+)(!inner)?\((.*)\)$/.exec(field)
      if (!match) return [nested ? "'" + quoted(field).slice(1,-1) + "'," + alias + '.' + quoted(field) : alias + '.' + quoted(field)]
      const [,as,name,inner,children] = match
      const output = as || name
      const path = prefix ? prefix + '.' + output : output
      if (from === 'challenges' && name === 'challenge_attempts') {
        const childParams = new URLSearchParams()
        for (const [k,v] of params) if (k.startsWith(path+'.')) {
          embeddedFilters.add(k)
          childParams.set(k.slice(path.length+1),v)
        }
        const where = filters(childParams,args,new Map([['','a']]))
        const order = sortSql(childParams,'a')
        const limit = Number(childParams.get('limit')) || 1000
        const cols = split(children).map(n=>'a.'+quoted(n))
        const sub = 'select '+cols.join(',')+' from public.challenge_attempts a where a.challenge_id='+alias+'.id'+
          (where ? ' and '+where.slice(7) : '')+order+' limit '+limit
        const value = "coalesce((select jsonb_agg(to_jsonb(selected)) from ("+sub+") selected),'[]'::jsonb)"
        return [nested ? "'"+output+"',"+value : value+' as '+quoted(output)]
      }
      const fk = relations[from]?.[name]
      if (!fk) throw Error('Unsupported fixture relationship: ' + from + '.' + name)
      const ref = 'j' + joins.length
      aliases.set(path, ref)
      joins.push((inner ? 'join' : 'left join') + ' public.' + quoted(name) + ' ' + ref + ' on ' + ref + '.id=' + alias + '.' + quoted(fk))
      const child = projection(children, name, ref, path, true)
      if (!child.length) return []
      const value = 'case when ' + ref + '.id is not null then jsonb_build_object(' + child.join(',') + ') end'
      return [nested ? "'" + output + "'," + value : value + ' as ' + quoted(output)]
    })
  }
  const fields = projection((params.get('select') || '*').replace(/\s/g,''), table,'t','',false)
  const where = filters([...params].filter(([k])=>!embeddedFilters.has(k)), args, aliases)
  const select = head ? 'count(*)::int as count' : fields.join(',')
  return {
    sql: 'select ' + select + ' from public.' + quoted(table) + ' t ' + joins.join(' ') + where +
      (!head ? sortSql(params,'t') : '') +
      (!head ? ' limit ' + (Number(params.get('limit')) || 1000) : ''),
    args,
  }
}

function sortSql(params, alias) {
  const order = (params.get('order') || '').split(',').filter(Boolean).map(part => {
    const [field,direction,nulls] = part.split('.')
    return alias+'.'+quoted(field)+(direction==='desc'?' desc':' asc')+(nulls==='nullslast'?' nulls last':nulls==='nullsfirst'?' nulls first':'')
  })
  return order.length ? ' order by '+order.join(',') : ''
}

function filters(params, args, aliases = new Map([['','t']])) {
  const clauses = []
  const bind = value => { args.push(value); return '$' + args.length }
  for (const [name, value] of params) {
    if (['select','order','limit','on_conflict'].includes(name)) continue
    const path = name.split('.'), column = path.pop(), alias = aliases.get(path.join('.'))
    if (!alias) throw Error('Unsupported fixture filter ' + name)
    const field = alias + '.' + quoted(column)
    const [op, ...rest] = value.split('.'), arg = rest.join('.')
    if (op === 'eq' || op === 'lt' || op === 'gt') clauses.push(field + {eq:'=',lt:'<',gt:'>'}[op] + bind(arg))
    else if (value === 'is.null' || value === 'not.is.null') clauses.push(field + (op === 'not' ? ' is not null' : ' is null'))
    else if (op === 'in' && arg.startsWith('(') && arg.endsWith(')')) {
      const values = arg.slice(1,-1).split(',').filter(Boolean)
      clauses.push(values.length ? field + ' in (' + values.map(bind).join(',') + ')' : 'false')
    } else throw Error('Unsupported fixture operator ' + value)
  }
  return clauses.length ? ' where ' + clauses.join(' and ') : ''
}

async function main() {
  const pg = new PGlite({ initialMemory: 128*1024*1024 })
  for (const file of ['tests/fixtures/database.sql','tests/fixtures/curriculum-deletion-progress.sql',
    ...fs.readdirSync('supabase/migrations').filter(n => Number(n.slice(0,3)) >= 20).sort().map(n => 'supabase/migrations/' + n),
    'tests/fixtures/student-perf.sql']) {
    await pg.exec(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))
  }
  const events = []
  const latency = Number(process.env.TESTCRAFT_BENCH_LATENCY_MS || 60)
  const server = http.createServer(async (req,res) => {
    const started = performance.now(), u = new URL(req.url,url), method = req.method
    let sqlMs = 0, rows = null
    const send = (status, data, headers = {}) => {
      const body = data === undefined ? '' : JSON.stringify(data)
      if (!u.pathname.startsWith('/__')) events.push({ method, path:u.pathname, query:u.search, status, ms:performance.now()-started, sqlMs, rows, bytes:Buffer.byteLength(body) })
      res.writeHead(status, { 'Content-Type':'application/json', 'Cache-Control':'no-store', ...headers })
      res.end(body)
    }
    try {
      if (u.pathname === '/__session') return send(200,session(Number(u.searchParams.get('user') || 2),u.searchParams.has('expired')))
      if (u.pathname === '/__events') return send(200,events.splice(0))
      if (u.pathname === '/__progress') {
        const result = await pg.query('select * from lesson_progress where lesson_id=$1 and user_id=$2',[u.searchParams.get('id'),uid(Number(u.searchParams.get('user') || 2))])
        return send(200,result.rows[0] ?? null)
      }
      if (u.pathname === '/__age-visit' && method === 'POST') {
        const {rows} = await pg.query("update lesson_progress set last_opened_at=now()-interval '1 hour' where lesson_id=$1 and user_id=$2 returning *",[u.searchParams.get('id'),uid(2)])
        return send(200,rows[0] ?? null)
      }
      if (u.pathname === '/__rewards') {
        const {rows} = await pg.query('select coalesce(sum(amount),0)::int as xp,count(*)::int as awards from xp_transactions where user_id=$1',[uid(2)])
        return send(200,rows[0])
      }
      if (u.pathname === '/__meta') return send(200,{ latency, path:id('path1'), otherPath:id('path2'), lesson:id('lesson1-1-2'), next:id('lesson1-1-3'), fresh:id('lesson1-1-7'), existing:id('lesson1-1-1'), locked:id('lesson1-2-1'), last:id('lesson1-1-12') })
      if (req.headers.apikey !== key) return send(401,{message:'Invalid fixture key'})
      const user = users.get(req.headers.authorization?.slice(7))
      await delay(latency)
      if (u.pathname === '/auth/v1/token' && method === 'POST') {
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const match = /^fixture-refresh-([123])$/.exec(JSON.parse(Buffer.concat(chunks).toString()).refresh_token)
        return match ? send(200,session(Number(match[1]))) : send(401,{message:'Invalid fixture refresh token'})
      }
      if (!user) return send(401,{message:'Invalid fixture session'})
      if (u.pathname === '/auth/v1/user') return send(200,user)
      const pieces = u.pathname.split('/').filter(Boolean)
      if (pieces[0] !== 'rest' || pieces[1] !== 'v1') throw Error('Unsupported fixture endpoint')
      let body, sql, args
      if (method === 'POST' || method === 'PATCH') {
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        body = JSON.parse(Buffer.concat(chunks).toString())
      }
      const rpc = pieces[2] === 'rpc', table = pieces[2]
      if (rpc) {
        if (!pieces[3]?.startsWith('curriculum_')) throw Error('Unsupported fixture RPC')
        const names = Object.keys(body)
        args = Object.values(body).map(value => value && typeof value === 'object' ? JSON.stringify(value) : value)
        sql = 'select public.' + quoted(pieces[3]) + '(' + names.map((name,i) => quoted(name) + '=>$' + (i+1)).join(',') + ') as result'
      } else {
        if (!tables.has(table)) throw Error('Unsupported fixture table ' + table)
        if (method === 'GET' || method === 'HEAD') ({sql,args} = readQuery(table,u.searchParams,method==='HEAD'))
        else {
          if (!['lesson_progress','module_progress','learning_path_progress'].includes(table)) throw Error('Unsupported fixture write')
          const names = Object.keys(body).map(quoted)
          args = Object.values(body)
          const conflict = u.searchParams.get('on_conflict')
          const prefer = req.headers.prefer || ''
          const sets = names.map((n,i) => n + '=$' + (i+1))
          sql = method === 'PATCH'
            ? 'update public.' + quoted(table) + ' t set ' + sets.join(',') + filters(u.searchParams,args)
            : 'insert into public.' + quoted(table) + '(' + names.join(',') + ') values (' + sets.map(s=>s.split('=')[1]).join(',') + ')' +
              (conflict ? ' on conflict(' + conflict.split(',').map(quoted).join(',') + ') do ' +
                (prefer.includes('ignore-duplicates') ? 'nothing' : 'update set ' + names.map(n=>n+'=excluded.'+n).join(',')) : '')
          if (prefer.includes('return=representation')) {
            const selected = u.searchParams.get('select')
            sql += ' returning ' + (selected && selected !== '*' ? split(selected).map(quoted).join(',') : '*')
          }
        }
      }
      const result = await pg.transaction(async tx => {
        await tx.exec('set local role authenticated')
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user.id])
        const t = performance.now()
        try { return await tx.query(sql,args) } finally { sqlMs = performance.now()-t }
      })
      rows = result.rows.length
      if (rpc) return send(200,result.rows[0].result)
      if (method === 'HEAD') return send(200,undefined,{'Content-Range':'*/'+result.rows[0].count})
      if (method !== 'GET' && !req.headers.prefer?.includes('return=representation')) return send(204)
      if (req.headers.accept?.includes('vnd.pgrst.object')) return result.rows.length === 1 ? send(200,result.rows[0]) : send(406,{code:'PGRST116',details:'The result contains '+result.rows.length+' rows',message:'Single row expected'})
      return send(200,result.rows)
    } catch (error) {
      console.error(method,u.pathname,error.message)
      send(400,{code:error.code || 'FIXTURE',message:error.message})
    }
  })
  server.listen(3211,'127.0.0.1',()=>console.log('Student benchmark fixture ready at '+url))
}
main().catch(error=>{ console.error(error); process.exitCode=1 })
