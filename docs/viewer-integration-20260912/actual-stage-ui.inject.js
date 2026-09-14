/* Local-only placement layer on top of the real Stage Sketch document. */
(() => {
  'use strict';
  const start = () => {
    const actions = document.querySelector('.stage-history-actions');
    const shareOpen = document.getElementById('stage-share-open');
    const panel = document.getElementById('stage-session-panel');
    const panelTitle = document.getElementById('stage-share-title');
    const close = document.getElementById('stage-share-close');
    const study = panel?.querySelector('.stage-share-study');
    const studyTitle = document.getElementById('stage-share-study-title');
    const studyHint = document.getElementById('stage-share-study-hint');
    const studyAction = document.getElementById('stage-share-study-action');
    if (!actions || !shareOpen || !panel || !panelTitle || !study || !studyTitle || !studyHint || !studyAction) return;

    const original = {
      panelTitle: panelTitle.textContent,
      studyTitle: studyTitle.textContent,
      studyHint: studyHint.textContent
    };
    const intro = document.createElement('p');
    intro.className = 'stage-viewer-entry-intro';
    intro.textContent = 'リンクは舞台スケッチ本体の編集画面から発行します。';
    intro.hidden = true;
    study.before(intro);

    const explanations = document.createElement('details');
    explanations.className = 'stage-viewer-link-explanations';
    explanations.hidden = true;
    const explanationSummary = document.createElement('summary');
    explanationSummary.textContent = '説明を見る';
    const explanationBody = document.createElement('div');
    explanationBody.className = 'stage-viewer-link-explanation-body';
    explanations.append(explanationSummary, explanationBody);
    study.append(explanations);
    const movedExplanations = [];

    const moveIntoExplanations = (node) => {
      if (!node?.parentNode || node.parentNode === explanationBody) return;
      const marker = document.createComment('viewer-link-explanation');
      node.before(marker);
      movedExplanations.push({ node, marker });
      explanationBody.append(node);
    };
    const restoreExplanations = () => {
      for (const { node, marker } of movedExplanations.splice(0).reverse()) {
        if (marker.parentNode) {
          marker.parentNode.insertBefore(node, marker);
          marker.remove();
        } else {
          node.remove();
        }
      }
      explanationBody.replaceChildren();
    };
    const resetExplanationsForFreshOpen = () => {
      restoreExplanations();
      intro.hidden = false;
      moveIntoExplanations(intro);
      explanations.open = false;
    };

    const syncViewerLayout = () => {
      if (!panel.classList.contains('stage-viewer-link-mode')) return;
      explanations.hidden = false;
      intro.hidden = false;
      moveIntoExplanations(intro);
      for (const node of Array.from(studyAction.children)) {
        if (node.matches('p.stage-share-study-copy, p.stage-share-study-muted')) {
          const text = node.textContent.trim();
          const duplicate = Array.from(explanationBody.children).find((item) =>
            item.matches('p.stage-share-study-copy, p.stage-share-study-muted') && item.textContent.trim() === text);
          if (duplicate) {
            const staleIndex = movedExplanations.findIndex(({ node: movedNode }) => movedNode === duplicate);
            if (staleIndex >= 0) {
              const [{ marker }] = movedExplanations.splice(staleIndex, 1);
              marker.remove();
            }
            duplicate.remove();
          }
          moveIntoExplanations(node);
        }
      }

      const controls = Array.from(studyAction.children).find((node) =>
        node.classList.contains('stage-share-study-block') && !node.classList.contains('stage-share-study-confirm'));
      if (!controls) return;
      for (const node of Array.from(studyAction.children)) {
        if (node.tagName !== 'BUTTON') continue;
        const label = node.textContent.trim();
        node.classList.toggle('stage-viewer-link-feedback', label.includes('フィードバック') || label.includes('View feedback'));
        node.classList.toggle('stage-viewer-link-refresh', label.includes('再取得') || label.includes('Refresh status'));
      }
      const hasIssuedUrl = Boolean(controls.querySelector('#study-owner-url'));
      const actionsRow = controls.querySelector('.stage-share-study-actions');
      if (actionsRow) {
        const actionClasses = [
          'stage-viewer-link-copy-action', 'stage-viewer-link-open-action',
          'stage-viewer-link-update-action', 'stage-viewer-link-revoke-action',
          'stage-viewer-link-extra-action'
        ];
        Array.from(actionsRow.children).forEach((button, index) => {
          button.classList.remove(...actionClasses, 'stage-viewer-link-create-action');
          if (!hasIssuedUrl) {
            button.classList.add(button.classList.contains('stage-share-study-primary')
              ? 'stage-viewer-link-create-action'
              : 'stage-viewer-link-extra-action');
          } else {
            button.classList.add(actionClasses[Math.min(index, actionClasses.length - 1)]);
          }
        });
      }
      const createAction = controls.querySelector(':scope > .stage-share-study-primary');
      createAction?.classList.toggle('stage-viewer-link-create-action', !hasIssuedUrl);
      controls.querySelector('label[for="study-owner-url"]')?.classList.add('stage-viewer-link-field-label');
    };

    const entry = document.createElement('button');
    entry.type = 'button';
    entry.id = 'stage-viewer-link-open';
    entry.className = 'stage-share-open';
    entry.textContent = '演者用リンク';
    entry.setAttribute('aria-haspopup', 'dialog');
    entry.setAttribute('aria-controls', 'stage-session-panel');
    actions.append(entry);

    let openingFromViewerEntry = false;
    const showViewerMode = () => {
      panel.classList.add('stage-viewer-link-mode');
      panelTitle.textContent = '演者用リンク';
      studyTitle.textContent = '演者用ビューアーのリンク';
      studyHint.textContent = '演者がショーの動きを確認するためのViewerのリンクです。';
      syncViewerLayout();
    };
    const clearViewerMode = () => {
      panel.classList.remove('stage-viewer-link-mode');
      panelTitle.textContent = original.panelTitle;
      studyTitle.textContent = original.studyTitle;
      studyHint.textContent = original.studyHint;
      intro.hidden = true;
      explanations.hidden = true;
      explanations.open = false;
      restoreExplanations();
    };

    const observer = new MutationObserver(syncViewerLayout);
    observer.observe(studyAction, { childList: true, subtree: true });
    document.addEventListener('shosai:share-open', () => {
      if (!panel.classList.contains('stage-viewer-link-mode')) return;
      resetExplanationsForFreshOpen();
      syncViewerLayout();
    });

    shareOpen.addEventListener('click', () => {
      if (!openingFromViewerEntry) clearViewerMode();
    }, true);
    entry.addEventListener('click', () => {
      explanations.open = false;
      openingFromViewerEntry = true;
      shareOpen.click();
      openingFromViewerEntry = false;
      showViewerMode();
      window.setTimeout(showViewerMode, 60);
    });
    close?.addEventListener('click', () => window.setTimeout(clearViewerMode, 0));

    /* Open the proposed entry once so its placement and resulting panel are visible immediately. */
    entry.click();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
