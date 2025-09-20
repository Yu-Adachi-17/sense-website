const GATEWAY_BASE =
  process.env.GATEWAY_BASE || 'https://minutesai-bot-gw-production.up.railway.app';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || '';
const START_TICKET_BEARER = process.env.START_TICKET_BEARER || '';

function authHeadersJSON() {
  return START_TICKET_BEARER
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${START_TICKET_BEARER}` }
    : { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN };
}
function authHeaders() {
  return START_TICKET_BEARER
    ? { Authorization: `Bearer ${START_TICKET_BEARER}` }
    : { 'X-Internal-Token': INTERNAL_TOKEN };
}
export { GATEWAY_BASE, authHeadersJSON, authHeaders };
