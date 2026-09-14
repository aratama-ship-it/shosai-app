/* Local-only API fixture. It prevents preview actions from publishing anything. */
(() => {
  'use strict';
  try { localStorage.setItem('shosai-stage-tour-v1', 'done'); } catch (_) { /* Preview remains usable without storage. */ }
  const realFetch = window.fetch.bind(window);
  let issuedLink = null;
  const reply = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }));
  const now = () => new Date().toISOString();

  window.fetch = async (input, options = {}) => {
    const raw = typeof input === 'string' ? input : input?.url;
    const url = new URL(raw, location.href);
    const prefix = '/study/api/owner/';
    if (!url.pathname.startsWith(prefix)) return realFetch(input, options);

    const path = url.pathname.slice(prefix.length);
    const method = String(options.method || 'GET').toUpperCase();
    if (path === 'links' && method === 'GET') return reply({ links: issuedLink ? [issuedLink] : [] });
    if (/^links\/[^/]+\/notes$/.test(path) && method === 'GET') return reply({ notes: [] });
    if (/^shows\//.test(path) && method === 'GET') return reply({ link: issuedLink });

    if (/^shows\//.test(path) && method === 'POST') {
      let title = '無題のショー';
      let showId = decodeURIComponent(path.slice('shows/'.length));
      try {
        const body = JSON.parse(options.body || '{}');
        title = body.document?.project?.title || title;
        showId = body.document?.project?.id || showId;
      } catch (_) { /* The local fixture can keep its fallback title. */ }
      issuedLink = {
        token: 'local-viewer-preview-only', showId, title, revision: 1,
        createdAt: now(), updatedAt: now(), revokedAt: null, noteCount: 0
      };
      return reply({ link: issuedLink });
    }

    if (/^links\//.test(path) && method === 'PUT' && issuedLink) {
      issuedLink = { ...issuedLink, revision: issuedLink.revision + 1, updatedAt: now() };
      return reply({ link: issuedLink });
    }
    if (/^links\//.test(path) && method === 'DELETE' && issuedLink) {
      issuedLink = { ...issuedLink, revokedAt: now(), updatedAt: now() };
      return reply({ link: issuedLink });
    }
    return reply({ error: 'local-preview-only' }, 404);
  };
})();
