/* =========================================================
   AI chat widget: talks to the Cloudflare Worker (which calls Groq).
   After deploying the worker, paste its URL below (no trailing slash).
   ========================================================= */
const CHAT_API_URL = "https://shekhar-portfolio-chat.shekhargayen32.workers.dev";

(() => {
  const $ = s => document.querySelector(s);
  const chat = $("#chat"), fab = $("#chatFab"), panel = $("#chatPanel"), closeBtn = $("#chatClose");
  const log = $("#chatLog"), form = $("#chatForm"), input = $("#chatInput"), send = $("#chatSend");
  const suggest = $("#chatSuggest");
  const EMAIL = "gayenshekhar2025@gmail.com";
  const configured = !CHAT_API_URL.includes("YOUR-SUBDOMAIN");

  const history = []; // { role: "user" | "assistant", content }; off-topic turns are never stored
  let busy = false, greeted = false;

  /* ---------- visitor id + termination memory (24h) ---------- */
  const BAN_KEY = "sg_chat_terminated_until", ID_KEY = "sg_chat_visitor";
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  let visitorId = store.get(ID_KEY);
  if (!visitorId) {
    visitorId = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now());
    store.set(ID_KEY, visitorId);
  }
  const isTerminated = () => Number(store.get(BAN_KEY) || 0) > Date.now();
  const TERMINATED_TEXT = `🚫 **Chat terminated.** This assistant only answers questions about Shekhar. You can still reach him at ${EMAIL} or https://www.linkedin.com/in/shekhargayen/`;

  function endChat() {
    store.set(BAN_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    input.disabled = true; send.disabled = true; suggest.hidden = true;
    input.placeholder = "Chat terminated";
    chat.classList.add("ended");
  }

  /* ---------- open / close ---------- */
  const setOpen = open => {
    chat.classList.toggle("open", open);
    chat.classList.add("seen");
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    if (open) {
      if (!greeted) {
        greeted = true;
        if (isTerminated()) {
          addBot(TERMINATED_TEXT, "danger");
          endChat();
          return;
        }
        addBot("Hi! 👋 I'm **Shekhar's AI assistant**. Ask me about his skills, projects, education, or how to reach him.\n\n_Note: I only answer questions about Shekhar._");
      }
      if (!input.disabled) setTimeout(() => input.focus(), 50);
    }
  };
  fab.addEventListener("click", () => setOpen(panel.hidden));
  closeBtn.addEventListener("click", () => { setOpen(false); fab.focus(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) { setOpen(false); fab.focus(); } });

  /* ---------- safe rendering: escape HTML, then allow **bold**, links, bullets ---------- */
  const escape = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inline = s => escape(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|\s)_(.+?)_(?=\s|$)/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    .replace(/(^|\s)([\w.+-]+@[\w-]+\.[\w.]+[\w])/g, '$1<a href="mailto:$2">$2</a>');
  const format = text => {
    const out = []; let list = null;
    text.split("\n").forEach(raw => {
      const line = raw.trim();
      const bullet = line.match(/^[-*•]\s+(.*)/) || line.match(/^\d+[.)]\s+(.*)/);
      if (bullet) { (list ||= []).push(`<li>${inline(bullet[1])}</li>`); return; }
      if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
      if (line) out.push(`<p>${inline(line)}</p>`);
    });
    if (list) out.push(`<ul>${list.join("")}</ul>`);
    return out.join("");
  };

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const addMsg = (cls, html) => {
    const el = document.createElement("div");
    el.className = `msg ${cls}`;
    el.innerHTML = html;
    log.appendChild(el); scroll();
    return el;
  };
  const addBot = (text, extra = "") => addMsg(`bot ${extra}`, format(text));
  const addUser = text => addMsg("user", `<p>${escape(text)}</p>`);

  /* ---------- send ---------- */
  async function ask(question) {
    question = question.trim().slice(0, 500);
    if (!question || busy || input.disabled) return;
    if (isTerminated()) { addBot(TERMINATED_TEXT, "danger"); endChat(); return; }
    busy = true; send.disabled = true; suggest.hidden = true;
    addUser(question);
    input.value = "";
    history.push({ role: "user", content: question });

    const typing = addMsg("bot", '<span class="typing-dots"><i></i><i></i><i></i></span>');

    if (!configured) {
      typing.remove();
      addBot(`The AI assistant isn't connected yet. Meanwhile, you can reach Shekhar at ${EMAIL} or https://www.linkedin.com/in/shekhargayen/`, "error");
      history.pop(); busy = false; send.disabled = false; return;
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(`${CHAT_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10), visitorId }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok || !data.reply) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.offTopic) {
        history.pop(); // keep off-topic questions out of the conversation
        if (data.terminated) { addBot(data.reply, "danger"); endChat(); return; }
        addBot(data.reply, "warn");
      } else {
        history.push({ role: "assistant", content: data.reply });
        addBot(data.reply);
      }
    } catch (err) {
      typing.remove();
      history.pop(); // drop the unanswered question so the conversation stays consistent
      const msg = err.name === "AbortError" ? "That took too long." : (err.message?.startsWith("HTTP") ? "Something went wrong." : err.message);
      addBot(`${msg} You can also reach Shekhar directly at ${EMAIL}.`, "error");
    } finally {
      busy = false;
      if (!input.disabled) { send.disabled = false; input.focus(); }
    }
  }

  form.addEventListener("submit", e => { e.preventDefault(); ask(input.value); });
  suggest.querySelectorAll("button").forEach(b => b.addEventListener("click", () => ask(b.textContent)));
})();
