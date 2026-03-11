import { NoodleController, MagnetController, PresentController } from '../../index.ts';
import { createEditorView, EditorView } from '@nonoun/native-code';
import { EditorSelection } from '@codemirror/state';
import { json } from '@codemirror/lang-json';

// ── 1. Interactive Flow Builder ──

const flowArena = document.getElementById('flow-arena') as HTMLElement;
const flowViewport = document.getElementById('flow-viewport');
const flowTransform = document.getElementById('flow-transform');
const editorContainer = document.getElementById('flow-json-editor');

let magnet: MagnetController | null = null;
let noodle: NoodleController | null = null;
let editorView: InstanceType<typeof EditorView> | null = null;
let nodeCounter = 0;
let suppressEditorSync = false;
let suppressCanvasSync = false;
let editorSyncTimer: number | null = null;
const intents = ['accent', 'info', 'success', 'warning', 'danger'];

if (flowArena && flowViewport && flowTransform) {
  magnet = new MagnetController(flowArena, {
    selector: '.flow-node',
    snapToEdges: false,
    snapToSiblings: false,
    guides: false,
  });

  noodle = new NoodleController(flowArena, {
    editable: true,
    showPorts: true,
    animated: true,
    strokeWidth: 2.5,
    connections: [
      { id: 'init-1', from: 'f-sensor', to: 'f-filter', fromPort: 'right', toPort: 'left' },
      { id: 'init-2', from: 'f-transform', to: 'f-merge', fromPort: 'right', toPort: 'left' },
    ],
  });

  // ── Snap & Guides Toggles ──

  const snapToggle = document.getElementById('flow-snap-toggle') as HTMLInputElement | null;
  const guidesToggle = document.getElementById('flow-guides-toggle') as HTMLInputElement | null;

  snapToggle?.addEventListener('native:change', () => {
    if (magnet) {
      magnet.snapToSiblings = snapToggle.checked;
      magnet.snapToEdges = snapToggle.checked;
    }
  });

  guidesToggle?.addEventListener('native:change', () => {
    if (magnet) magnet.guides = guidesToggle.checked;
  });

  // ── Present Mode ──

  const flowSplit = document.getElementById('flow-split') as HTMLElement;
  const presentBtn = document.getElementById('flow-present-btn');
  const presentCtrl = flowSplit ? new PresentController(flowSplit) : null;

  presentBtn?.addEventListener('native:press', () => {
    presentCtrl?.present();
  });

  flowSplit?.addEventListener('native:present', () => {
    const icon = presentBtn?.querySelector('n-icon');
    if (icon) icon.setAttribute('name', 'arrows-in');
    noodle?.update();
  });
  flowSplit?.addEventListener('native:dismiss', () => {
    const icon = presentBtn?.querySelector('n-icon');
    if (icon) icon.setAttribute('name', 'arrows-out');
    noodle?.update();
  });

  // ── Node Selection ──

  let selectedNodeId: string | null = null;

  function selectNode(nodeId: string | null) {
    // Clear previous selection
    if (selectedNodeId) {
      document.getElementById(selectedNodeId)?.removeAttribute('data-selected');
    }
    selectedNodeId = nodeId;
    if (!nodeId) return;

    const el = document.getElementById(nodeId);
    if (!el) return;
    el.setAttribute('data-selected', '');

    // Sync position to editor and highlight the JSON block
    syncCanvasToEditor();
    highlightNodeInEditor(nodeId);
  }

  function highlightNodeInEditor(nodeId: string) {
    if (!editorView) return;
    const doc = editorView.state.doc.toString();

    // Find the node's JSON block by matching its "id" field
    const idPattern = `"id": "${nodeId}"`;
    const idIndex = doc.indexOf(idPattern);
    if (idIndex === -1) return;

    // Walk backwards to find the opening `{` of this node object
    let braceDepth = 0;
    let blockStart = idIndex;
    for (let i = idIndex; i >= 0; i--) {
      if (doc[i] === '}') braceDepth++;
      if (doc[i] === '{') {
        if (braceDepth === 0) { blockStart = i; break; }
        braceDepth--;
      }
    }

    // Walk forwards to find the closing `}`
    braceDepth = 0;
    let blockEnd = idIndex;
    for (let i = idIndex; i < doc.length; i++) {
      if (doc[i] === '{') braceDepth++;
      if (doc[i] === '}') {
        braceDepth--;
        if (braceDepth === 0) { blockEnd = i + 1; break; }
      }
    }

    // Select and scroll to the block
    suppressEditorSync = true;
    editorView.dispatch({
      selection: EditorSelection.range(blockStart, blockEnd),
      scrollIntoView: true,
    });
    suppressEditorSync = false;
  }

  flowArena.addEventListener('pointerdown', (e) => {
    const target = (e.target as HTMLElement).closest('.flow-node') as HTMLElement | null;
    if (target) {
      selectNode(target.id);
    }
  });

  // ── Inline Label Editing ──

  let editingNode: HTMLElement | null = null;

  flowArena.addEventListener('dblclick', (e) => {
    const target = (e.target as HTMLElement).closest('.flow-node') as HTMLElement | null;
    if (!target || target.hasAttribute('disabled')) return;
    startEditing(target);
  });

  function startEditing(node: HTMLElement) {
    if (editingNode) stopEditing(editingNode);
    editingNode = node;
    node.setAttribute('contenteditable', 'true');
    node.setAttribute('data-editing', '');
    node.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function stopEditing(node: HTMLElement) {
    node.removeAttribute('contenteditable');
    node.removeAttribute('data-editing');
    editingNode = null;
    syncCanvasToEditor();
  }

  flowArena.addEventListener('keydown', (e) => {
    if (!editingNode) return;
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      stopEditing(editingNode);
    }
  });

  flowArena.addEventListener('focusout', (e) => {
    const target = e.target as HTMLElement;
    if (target === editingNode) {
      stopEditing(target);
    }
  });

  // ── Noodle + Magnet sync ──

  flowArena.addEventListener('native:magnet-snap', () => {
    noodle?.update();
    syncCanvasToEditor();
    // Update highlight if a node is selected (position changed)
    if (selectedNodeId) highlightNodeInEditor(selectedNodeId);
  });
  flowArena.addEventListener('native:magnet-drop', () => {
    noodle?.update();
    syncCanvasToEditor();
    if (selectedNodeId) highlightNodeInEditor(selectedNodeId);
  });

  // Keep add button + JSON in sync during drag
  flowArena.addEventListener('pointermove', () => {
    if (flowArena.hasAttribute('magnetized')) {
      noodle?.update();
      updateAddButtonPosition();
      syncCanvasToEditor();
      if (selectedNodeId) highlightNodeInEditor(selectedNodeId);
    }
  });
  flowArena.addEventListener('native:noodle-connect', () => syncCanvasToEditor());
  flowArena.addEventListener('native:noodle-disconnect', () => syncCanvasToEditor());

  // ── Canvas Pan ──

  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panX = 0;
  let panY = 0;
  let panBaseX = 0;
  let panBaseY = 0;

  flowViewport.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    const isEmptySpace = target === flowArena || target === flowViewport || target === flowTransform;
    if (isEmptySpace || e.button === 1) {
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panBaseX = panX;
      panBaseY = panY;
      flowViewport.setPointerCapture(e.pointerId);
      flowViewport.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  flowViewport.addEventListener('pointermove', (e) => {
    if (!isPanning) return;
    panX = panBaseX + (e.clientX - panStartX);
    panY = panBaseY + (e.clientY - panStartY);
    flowTransform.style.transform = `translate(${panX}px, ${panY}px)`;
    noodle?.update();
  });

  flowViewport.addEventListener('pointerup', () => {
    if (!isPanning) return;
    isPanning = false;
    flowViewport.style.cursor = '';
  });

  // ── Add Node on Port Hover ──

  let addBtn: HTMLElement | null = null;
  let hoveredNode: HTMLElement | null = null;
  let hoveredPort: string | null = null;
  let hideTimer: number | null = null;

  function getNodePosition(node: HTMLElement): { x: number; y: number } {
    let tx = 0, ty = 0;
    const translate = node.style.translate;
    if (translate) {
      const parts = translate.match(/-?[\d.]+/g);
      if (parts) { tx = parseFloat(parts[0]) || 0; ty = parseFloat(parts[1]) || 0; }
    }
    return { x: node.offsetLeft + tx, y: node.offsetTop + ty };
  }

  function showAddButton(node: HTMLElement, port: string) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (!addBtn) {
      addBtn = document.createElement('button');
      addBtn.className = 'flow-add-btn';
      addBtn.textContent = '+';
      addBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (hoveredNode && hoveredPort) addNodeFromPort(hoveredNode, hoveredPort);
        hideAddButton();
      });
      addBtn.addEventListener('pointerenter', () => {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      });
      addBtn.addEventListener('pointerleave', () => {
        scheduleHide();
      });
    }
    const pos = getNodePosition(node);
    let btnX = 0;
    let btnY = 0;
    const btnSize = 28;
    const gap = 6;
    if (port === 'right') {
      btnX = pos.x + node.offsetWidth + gap;
      btnY = pos.y + node.offsetHeight / 2 - btnSize / 2;
    } else if (port === 'left') {
      btnX = pos.x - btnSize - gap;
      btnY = pos.y + node.offsetHeight / 2 - btnSize / 2;
    } else if (port === 'bottom') {
      btnX = pos.x + node.offsetWidth / 2 - btnSize / 2;
      btnY = pos.y + node.offsetHeight + gap;
    } else {
      btnX = pos.x + node.offsetWidth / 2 - btnSize / 2;
      btnY = pos.y - btnSize - gap;
    }
    addBtn.style.left = btnX + 'px';
    addBtn.style.top = btnY + 'px';
    if (!addBtn.parentNode) flowArena.appendChild(addBtn);
    hoveredNode = node;
    hoveredPort = port;
  }

  function updateAddButtonPosition() {
    if (hoveredNode && hoveredPort && addBtn?.parentNode) {
      const pos = getNodePosition(hoveredNode);
      const btnSize = 28;
      const gap = 6;
      let btnX = 0, btnY = 0;
      if (hoveredPort === 'right') {
        btnX = pos.x + hoveredNode.offsetWidth + gap;
        btnY = pos.y + hoveredNode.offsetHeight / 2 - btnSize / 2;
      } else if (hoveredPort === 'left') {
        btnX = pos.x - btnSize - gap;
        btnY = pos.y + hoveredNode.offsetHeight / 2 - btnSize / 2;
      } else if (hoveredPort === 'bottom') {
        btnX = pos.x + hoveredNode.offsetWidth / 2 - btnSize / 2;
        btnY = pos.y + hoveredNode.offsetHeight + gap;
      } else {
        btnX = pos.x + hoveredNode.offsetWidth / 2 - btnSize / 2;
        btnY = pos.y - btnSize - gap;
      }
      addBtn.style.left = btnX + 'px';
      addBtn.style.top = btnY + 'px';
    }
  }

  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      hideAddButton();
    }, 300);
  }

  function hideAddButton() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (addBtn?.parentNode) addBtn.parentNode.removeChild(addBtn);
    hoveredNode = null;
    hoveredPort = null;
  }

  flowArena.addEventListener('pointerenter', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList?.contains('flow-node')) return;
    const ports = (target.getAttribute('data-noodle-port') || '').split(' ');
    const port = ports[ports.length - 1];
    if (port) showAddButton(target, port);
  }, true);

  flowArena.addEventListener('pointerleave', (e) => {
    const target = e.target as HTMLElement;
    if (!target.classList?.contains('flow-node')) return;
    scheduleHide();
  }, true);

  function addNodeFromPort(sourceNode: HTMLElement, sourcePort: string) {
    nodeCounter++;
    const id = `f-new-${nodeCounter}`;
    const intent = intents[nodeCounter % intents.length];
    const label = `Node ${nodeCounter}`;

    let x = sourceNode.offsetLeft;
    let y = sourceNode.offsetTop;
    if (sourcePort === 'right') x += sourceNode.offsetWidth + 80;
    else if (sourcePort === 'left') x -= 180;
    else if (sourcePort === 'bottom') y += sourceNode.offsetHeight + 60;
    else y -= 60;

    const node = document.createElement('div');
    node.className = 'flow-node';
    node.setAttribute('intent', intent);
    node.id = id;
    node.setAttribute('data-noodle-port', 'left right');
    node.style.cssText = `left: ${Math.max(0, x)}px; top: ${Math.max(0, y)}px;`;
    node.textContent = label;
    flowArena.appendChild(node);

    if (magnet) {
      magnet.detach();
      magnet.attach();
    }

    const fromPort = sourcePort;
    const toPort = sourcePort === 'right' ? 'left' : sourcePort === 'left' ? 'right' : sourcePort === 'bottom' ? 'top' : 'bottom';
    noodle?.connect(sourceNode.id, id, fromPort, toPort);
    noodle?.update();
    syncCanvasToEditor();
  }

  // ── JSON Editor ──

  function serializeGraph() {
    const nodes: Array<{ id: string; label: string; intent: string; ports: string; x: number; y: number }> = [];
    flowArena.querySelectorAll('.flow-node').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const pos = getNodePosition(htmlEl);
      nodes.push({
        id: htmlEl.id,
        label: htmlEl.textContent?.trim() || '',
        intent: htmlEl.getAttribute('intent') || 'neutral',
        ports: htmlEl.getAttribute('data-noodle-port') || '',
        x: Math.round(pos.x),
        y: Math.round(pos.y),
      });
    });
    const connections = noodle?.getConnections() || [];
    return { nodes, connections };
  }

  function syncCanvasToEditor() {
    if (suppressCanvasSync || !editorView) return;
    suppressEditorSync = true;
    const text = JSON.stringify(serializeGraph(), null, 2);
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: text },
    });
    suppressEditorSync = false;
  }

  function syncEditorToCanvas() {
    if (suppressEditorSync || !editorView || !noodle) return;
    try {
      const data = JSON.parse(editorView.state.doc.toString());
      if (!data.nodes || !data.connections) return;

      suppressCanvasSync = true;

      const existingIds = new Set(
        Array.from(flowArena.querySelectorAll('.flow-node')).map(el => el.id)
      );
      const newIds = new Set(data.nodes.map((n: { id: string }) => n.id));

      existingIds.forEach(id => {
        if (!newIds.has(id)) {
          document.getElementById(id)?.remove();
        }
      });

      for (const n of data.nodes) {
        let el = document.getElementById(n.id) as HTMLElement | null;
        if (!el) {
          el = document.createElement('div');
          el.className = 'flow-node';
          el.id = n.id;
          flowArena.appendChild(el);
        }
        el.textContent = n.label || n.id;
        el.setAttribute('intent', n.intent || 'neutral');
        el.setAttribute('data-noodle-port', n.ports || 'left right');
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
      }

      if (magnet) {
        magnet.detach();
        magnet.attach();
      }

      noodle.setConnections(data.connections);
      noodle.update();
      suppressCanvasSync = false;
    } catch {
      suppressCanvasSync = false;
    }
  }

  // ── Editor click → find node → center canvas ──

  function findNodeIdAtCursor(): string | null {
    if (!editorView) return null;
    const doc = editorView.state.doc.toString();
    const cursor = editorView.state.selection.main.head;

    // Walk backwards from cursor to find enclosing `{`
    let braceDepth = 0;
    let blockStart = -1;
    for (let i = cursor; i >= 0; i--) {
      if (doc[i] === '}') braceDepth++;
      if (doc[i] === '{') {
        if (braceDepth === 0) { blockStart = i; break; }
        braceDepth--;
      }
    }
    if (blockStart === -1) return null;

    // Walk forwards from blockStart to find closing `}`
    braceDepth = 0;
    let blockEnd = -1;
    for (let i = blockStart; i < doc.length; i++) {
      if (doc[i] === '{') braceDepth++;
      if (doc[i] === '}') {
        braceDepth--;
        if (braceDepth === 0) { blockEnd = i + 1; break; }
      }
    }
    if (blockEnd === -1) return null;

    const block = doc.slice(blockStart, blockEnd);
    const idMatch = block.match(/"id":\s*"([^"]+)"/);
    return idMatch ? idMatch[1] : null;
  }

  function panCanvasToNode(nodeId: string) {
    const el = document.getElementById(nodeId);
    if (!el || !flowViewport) return;

    const viewportRect = flowViewport.getBoundingClientRect();
    const viewportCenterX = viewportRect.width / 2;
    const viewportCenterY = viewportRect.height / 2;

    // Node center in canvas space
    const nodeX = el.offsetLeft + el.offsetWidth / 2;
    const nodeY = el.offsetTop + el.offsetHeight / 2;

    // Where the node currently appears in viewport space
    const appearsX = nodeX + panX;
    const appearsY = nodeY + panY;

    // Distance from viewport center (as fraction of viewport size)
    const distFracX = Math.abs(appearsX - viewportCenterX) / viewportRect.width;
    const distFracY = Math.abs(appearsY - viewportCenterY) / viewportRect.height;

    // Only pan if node is > 25% away from center
    if (distFracX < 0.25 && distFracY < 0.25) {
      // Just select/highlight the node
      selectNode(nodeId);
      return;
    }

    // Pan to center the node
    panX = viewportCenterX - nodeX;
    panY = viewportCenterY - nodeY;
    flowTransform.style.transition = 'transform 300ms ease';
    flowTransform.style.transform = `translate(${panX}px, ${panY}px)`;
    setTimeout(() => { flowTransform.style.transition = ''; noodle?.update(); }, 310);

    selectNode(nodeId);
    noodle?.update();
  }

  if (editorContainer) {
    const initial = JSON.stringify(serializeGraph(), null, 2);
    editorView = createEditorView(editorContainer, {
      doc: initial,
      extensions: [
        json(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !suppressEditorSync) {
            if (editorSyncTimer) clearTimeout(editorSyncTimer);
            editorSyncTimer = window.setTimeout(syncEditorToCanvas, 300);
          }
          // Selection change (click in editor) → find node → center canvas
          if (update.selectionSet && !suppressEditorSync) {
            const nodeId = findNodeIdAtCursor();
            if (nodeId && nodeId !== selectedNodeId) {
              panCanvasToNode(nodeId);
            }
          }
        }),
      ],
    });
  }

  // ── Split Handle Resize ──

  const splitHandle = document.getElementById('flow-split-handle');
  const canvasPane = document.getElementById('flow-canvas-pane');
  if (splitHandle && canvasPane) {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    splitHandle.addEventListener('pointerdown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = canvasPane.offsetWidth;
      splitHandle.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    splitHandle.addEventListener('pointermove', (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(300, Math.min(startWidth + (e.clientX - startX), window.innerWidth - 200));
      canvasPane.style.width = newWidth + 'px';
      canvasPane.style.flex = 'none';
      noodle?.update();
    });

    splitHandle.addEventListener('pointerup', () => {
      isResizing = false;
      document.body.style.userSelect = '';
    });
  }
}

// ── 2. Curve Styles ──

new NoodleController(document.getElementById('style-bezier'), {
  style: 'bezier',
  tension: 0.5,
  connections: [
    { id: 'bz1', from: 'bz-a', to: 'bz-b', fromPort: 'right', toPort: 'left' },
    { id: 'bz2', from: 'bz-b', to: 'bz-c', fromPort: 'right', toPort: 'left' },
  ],
});

new NoodleController(document.getElementById('style-step'), {
  style: 'step',
  connections: [
    { id: 'st1', from: 'st-a', to: 'st-b', fromPort: 'right', toPort: 'left' },
    { id: 'st2', from: 'st-b', to: 'st-c', fromPort: 'right', toPort: 'left' },
  ],
});

new NoodleController(document.getElementById('style-straight'), {
  style: 'straight',
  connections: [
    { id: 'sl1', from: 'sl-a', to: 'sl-b', fromPort: 'right', toPort: 'left' },
    { id: 'sl2', from: 'sl-b', to: 'sl-c', fromPort: 'right', toPort: 'left' },
  ],
});

// ── 3. Static Connections ──

new NoodleController(document.getElementById('static-arena'), {
  color: 'var(--n-color-accent-500)',
  strokeWidth: 2,
  connections: [
    { id: 'sc1', from: 's-in1', to: 's-proc', fromPort: 'right', toPort: 'left' },
    { id: 'sc2', from: 's-in2', to: 's-proc', fromPort: 'right', toPort: 'left' },
    { id: 'sc3', from: 's-proc', to: 's-out', fromPort: 'right', toPort: 'left' },
  ],
});

// ── 4. Disabled ──

new NoodleController(document.getElementById('disabled-arena'), {
  disabled: true,
  connections: [
    { id: 'd1', from: 'd-input', to: 'd-process', fromPort: 'right', toPort: 'left' },
    { id: 'd2', from: 'd-process', to: 'd-output', fromPort: 'right', toPort: 'left' },
  ],
});

// ── Event Log ──

const eventLog = document.getElementById('event-log');

function log(type: string, detail: Record<string, unknown>) {
  if (!eventLog) return;
  const entry = document.createElement('div');
  const cls = type.includes('connect') && !type.includes('disconnect') ? 'connect' : type.includes('disconnect') ? 'disconnect' : '';
  const label = type.replace('native:noodle-', '');
  const text = JSON.stringify(detail, null, 0);
  entry.innerHTML = `<span class="${cls}">${label}</span> ${text.length > 80 ? text.slice(0, 80) + '...' : text}`;
  eventLog.prepend(entry);
  while (eventLog.children.length > 30) eventLog.lastChild?.remove();
}

document.addEventListener('native:noodle-connect', (e) => log((e as CustomEvent).type, (e as CustomEvent).detail));
document.addEventListener('native:noodle-disconnect', (e) => log((e as CustomEvent).type, (e as CustomEvent).detail));

import { initCopyButtons } from '../../nav/demo-copy.ts';
initCopyButtons();
