// Store assistant chat. Talks to /api/chat (server/server.mjs); Claude when a key is set, simple search otherwise.
import { state } from './store.js';
const $ = id => document.getElementById(id);

export function initChat({ onAction }) {
  let history = []; try { history = JSON.parse(sessionStorage.getItem('bsm-chat') || '[]'); } catch {}
  const bubble = (text, who) => { const d = document.createElement('div'); d.className = 'm ' + who; d.textContent = text; $('msgs').appendChild(d); $('msgs').scrollTop = 1e9; return d; };
  bubble('Hi! Ask me where anything is, what\'s on special, or tell me what to add to your trolley', 'a');
  const open = v => { $('chat').classList.toggle('show', v); $('chatbtn').style.display = v ? 'none' : ''; if (v) $('chatq').focus(); };
  $('chatbtn').onclick = () => open(true); $('chatx').onclick = () => open(false);
  $('chatform').onsubmit = async e => {
    e.preventDefault(); const text = $('chatq').value.trim(); if (!text) return; $('chatq').value = ''; bubble(text, 'u');
    const wait = bubble('…', 'a');
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history, text, cart: state.cart }) });
      if (!r.ok && r.status !== 500) throw new Error('no api');
      const j = await r.json(); wait.textContent = j.reply; history = j.messages || history;
      try { sessionStorage.setItem('bsm-chat', JSON.stringify(history)); } catch {}
      $('mode').textContent = j.mode === 'claude' ? 'powered by Claude' : 'offline mode (no API key)';
      for (const a of j.actions || []) onAction(a);
    } catch { wait.textContent = 'The assistant needs the Node server – run `npm start` in store-map (see README) instead of a plain static server.'; }
    $('msgs').scrollTop = 1e9;
  };
  return { open };
}
