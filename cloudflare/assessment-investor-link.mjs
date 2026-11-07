// Adds identity association to the existing lead writer. No investor writes or sends.
const uuid = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const key = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const idKey = value => value.replaceAll('-', '').toLowerCase();

export function withInvestorProfileLink({notion, token, investorDataSourceId, fetchImpl = fetch}) {
  if (!notion?.writeLead || !token || !uuid.test(investorDataSourceId ?? '')) throw Error('investor_link_configuration');
  async function call(path, method = 'GET', body) {
    let response;
    try {
      response = await fetchImpl('https://api.notion.com/v1/' + path, {
        method, redirect: 'manual',
        headers: {Authorization: 'Bearer ' + token, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json'},
        ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(15000)
      });
    } catch { throw Error('notion_investor_read_unavailable'); }
    if (!response.ok) throw Error('notion_investor_http_' + response.status);
    try { return await response.json(); } catch { throw Error('notion_investor_invalid_response'); }
  }
  async function findInvestors(email) {
    const ids = new Map(), cursors = new Set(); let cursor;
    for (let page = 0; page < 20; page++) {
      const result = await call('data_sources/' + investorDataSourceId + '/query', 'POST', {
        filter: {property: 'Email', email: {equals: email}}, page_size: 100,
        ...(cursor ? {start_cursor: cursor} : {})
      });
      if (!Array.isArray(result.results)) throw Error('notion_investor_invalid_response');
      for (const row of result.results) {
        if (!uuid.test(row.id ?? '') || typeof row.properties?.Email?.email !== 'string') throw Error('notion_investor_invalid_response');
        if (!row.archived && !row.in_trash && key(row.properties.Email.email) === email) ids.set(idKey(row.id), row.id);
      }
      if (ids.size > 1 || result.has_more === false) return [...ids.values()];
      if (result.has_more !== true || typeof result.next_cursor !== 'string' || !result.next_cursor || cursors.has(result.next_cursor)) throw Error('notion_investor_incomplete_pagination');
      cursor = result.next_cursor; cursors.add(cursor);
    }
    throw Error('notion_investor_query_limit');
  }
  return {...notion, async writeLead(plan) {
    if (plan.state !== 'ready') throw Error('notion_write_not_ready');
    const email = key(plan.properties?.Email?.email);
    if (!email) throw Error('notion_investor_email_required');
    if (!['create','update'].includes(plan.operation) || (plan.operation === 'update' && !uuid.test(plan.pageId ?? ''))) throw Error('notion_invalid_operation');
    let existing = [], matches;
    const properties = {...plan.properties};
    try {
    if (plan.operation === 'update') {
      if (!uuid.test(plan.pageId ?? '')) throw Error('notion_invalid_operation');
      const page = await call('pages/' + plan.pageId);
      const relation = page.properties?.['Investor Profile'];
      if (relation?.type !== 'relation' || !Array.isArray(relation.relation) || relation.has_more === true || relation.relation.some(r => !uuid.test(r.id ?? ''))) throw Error('notion_investor_relation_unavailable');
      existing = relation.relation.map(r => r.id);
    } else if (plan.operation !== 'create') throw Error('notion_invalid_operation');
    matches = await findInvestors(email);
    } catch (error) {
      // Association is enrichment: a read failure must not lose an otherwise valid Assessment.
      properties['Contact Match Review'] = {checkbox: true};
      console.warn('assessment_investor_link_review', /^notion_investor_[a-z_0-9]+$/.test(error?.message ?? '') ? error.message : 'read_unavailable');
      return notion.writeLead({...plan, properties});
    }
    // Identity matching does not promote, qualify, overwrite an existing relation or change consent.
    if (matches.length > 1 || existing.length > 1 || (matches.length === 1 && existing.length === 1 && idKey(matches[0]) !== idKey(existing[0]))) {
      properties['Contact Match Review'] = {checkbox: true};
    } else if (matches.length === 1) {
      properties['Investor Profile'] = {relation: [{id: matches[0]}]};
      properties['Contact Match Review'] = {checkbox: false};
    }
    return notion.writeLead({...plan, properties});
  }};
}
