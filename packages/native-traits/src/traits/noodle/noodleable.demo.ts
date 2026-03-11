import { NoodleController, MagnetController } from '../index.ts';
import { createEditorView, EditorView } from '@nonoun/native-code';
import { EditorSelection } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { FLOW_DATASETS } from './noodleable.datasets.ts';
import type { FlowDataset } from './noodleable.datasets.ts';

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

  // ── Lightbox Mode ──

  const flowSplit = document.getElementById('flow-split') as HTMLElement;
  const lightboxBtn = document.getElementById('flow-lightbox-btn');
  let lightboxMode = false;

  lightboxBtn?.addEventListener('native:press', () => {
    lightboxMode = !lightboxMode;
    if (lightboxMode) {
      flowSplit.setAttribute('popover', 'manual');
      flowSplit.showPopover();
    } else {
      flowSplit.hidePopover();
      flowSplit.removeAttribute('popover');
    }
    flowSplit.toggleAttribute('data-lightbox', lightboxMode);
    const icon = lightboxBtn.querySelector('n-icon');
    if (icon) icon.setAttribute('name', lightboxMode ? 'arrows-in-simple' : 'arrows-out-simple');
    noodle?.update();
  });

  // ── Dataset Select ──

  const docSelect = document.getElementById('flow-doc-select') as HTMLElement & {
    options: Array<{ value: string; label: string }>;
  };

  if (docSelect) {
    docSelect.options = FLOW_DATASETS.map(d => ({ value: d.id, label: d.name }));
    docSelect.addEventListener('native:change', (e: Event) => {
      const value = (e as CustomEvent).detail.value;
      const dataset = FLOW_DATASETS.find(d => d.id === value);
      if (dataset) loadDataset(dataset);
    });
  }

  function loadDataset(dataset: FlowDataset): void {
    // Remove existing nodes
    for (const el of Array.from(flowArena.querySelectorAll('.flow-node'))) el.remove();

    // Create new node elements
    for (const n of dataset.nodes) {
      const el = document.createElement('div');
      el.className = 'flow-node';
      el.id = n.id;
      el.setAttribute('intent', n.intent);
      el.setAttribute('data-noodle-port', n.ports);
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      el.textContent = n.label;
      flowArena.appendChild(el);
    }

    // Re-attach controllers
    if (magnet) { magnet.detach(); magnet.attach(); }
    noodle?.setConnections(dataset.connections);

    // Reset canvas state
    panX = 0;
    panY = 0;
    zoomLevel = 1;
    updateTransform();
    selectedNodeId = null;
    clearMultiSelection();
    nodeCounter = dataset.nodes.length;

    // Defer noodle update until after layout — otherwise port positions are wrong
    requestAnimationFrame(() => {
      noodle?.update();
      syncCanvasToEditor();
    });
  }

  // ── Auto-Arrange Layouts ──

  type NodePos = { id: string; x: number; y: number };
  const LAYOUT_COL_GAP = 200;
  const LAYOUT_ROW_GAP = 70;
  const LAYOUT_PAD = 32;
  const LAYOUT_NODE_H = 38;

  function applyLayout(positions: NodePos[]): void {
    for (const pos of positions) {
      const el = document.getElementById(pos.id) as HTMLElement | null;
      if (!el) continue;
      el.style.transition = 'left 400ms cubic-bezier(0.4, 0, 0.2, 1), top 400ms cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.translate = '';
      el.style.left = Math.round(pos.x) + 'px';
      el.style.top = Math.round(pos.y) + 'px';
    }
    setTimeout(() => {
      for (const pos of positions) {
        const el = document.getElementById(pos.id) as HTMLElement | null;
        if (el) el.style.transition = '';
      }
      if (magnet) { magnet.detach(); magnet.attach(); }
      noodle?.update();
      syncCanvasToEditor();
    }, 420);
  }

  function getNodeIds(): Array<{ id: string; intent: string }> {
    return Array.from(flowArena.querySelectorAll('.flow-node')).map(el => ({
      id: (el as HTMLElement).id,
      intent: (el as HTMLElement).getAttribute('intent') || 'neutral',
    }));
  }

  // Flow: topological sort → layered columns
  function computeFlowLayout(): NodePos[] {
    const nodes = getNodeIds();
    const connections = noodle?.getConnections() || [];

    const incoming = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    for (const n of nodes) { incoming.set(n.id, 0); outgoing.set(n.id, []); }
    for (const c of connections) {
      incoming.set(c.to, (incoming.get(c.to) || 0) + 1);
      outgoing.get(c.from)?.push(c.to);
    }

    // Kahn's algorithm + layer assignment
    const layer = new Map<string, number>();
    const queue: string[] = [];
    const remaining = new Map(incoming);
    for (const n of nodes) {
      if ((incoming.get(n.id) || 0) === 0) { queue.push(n.id); layer.set(n.id, 0); }
    }
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const currLayer = layer.get(curr) || 0;
      for (const next of (outgoing.get(curr) || [])) {
        remaining.set(next, (remaining.get(next) || 1) - 1);
        const proposed = currLayer + 1;
        if (proposed > (layer.get(next) || 0)) layer.set(next, proposed);
        if ((remaining.get(next) || 0) === 0) queue.push(next);
      }
    }
    // Cycle participants: max layer + 1
    const maxLayer = Math.max(0, ...layer.values());
    for (const n of nodes) { if (!layer.has(n.id)) layer.set(n.id, maxLayer + 1); }

    // Group by layer
    const layers = new Map<number, string[]>();
    for (const [id, l] of layer) {
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l)!.push(id);
    }

    const positions: NodePos[] = [];
    for (const [l, ids] of layers) {
      const x = LAYOUT_PAD + l * LAYOUT_COL_GAP;
      const totalH = (ids.length - 1) * LAYOUT_ROW_GAP + LAYOUT_NODE_H;
      const startY = Math.max(LAYOUT_PAD, 200 - totalH / 2);
      ids.forEach((id, i) => { positions.push({ id, x, y: startY + i * LAYOUT_ROW_GAP }); });
    }
    return positions;
  }

  // Grid: uniform grid, row-major
  function computeGridLayout(): NodePos[] {
    const nodes = getNodeIds();
    const cols = Math.ceil(Math.sqrt(nodes.length));
    return nodes.map((n, i) => ({
      id: n.id,
      x: LAYOUT_PAD + (i % cols) * LAYOUT_COL_GAP,
      y: LAYOUT_PAD + Math.floor(i / cols) * LAYOUT_ROW_GAP,
    }));
  }

  // Cluster: group by intent, radial arrangement
  function computeClusterLayout(): NodePos[] {
    const nodes = getNodeIds();
    const groups = new Map<string, string[]>();
    for (const n of nodes) {
      if (!groups.has(n.intent)) groups.set(n.intent, []);
      groups.get(n.intent)!.push(n.id);
    }
    const groupList = [...groups.entries()];
    const centerX = 500;
    const centerY = 240;
    const radius = Math.max(160, 55 * groupList.length);

    const positions: NodePos[] = [];
    groupList.forEach(([_intent, ids], gi) => {
      const angle = (gi / groupList.length) * 2 * Math.PI - Math.PI / 2;
      const cx = centerX + Math.cos(angle) * radius;
      const cy = centerY + Math.sin(angle) * radius;
      ids.forEach((id, i) => {
        const offsetY = (i - (ids.length - 1) / 2) * (LAYOUT_NODE_H + 12);
        positions.push({
          id,
          x: Math.max(LAYOUT_PAD, Math.round(cx - 56)),
          y: Math.max(LAYOUT_PAD, Math.round(cy + offsetY)),
        });
      });
    });
    return positions;
  }

  // Tree: single-root BFS tree, parent centered on children
  function computeTreeLayout(): NodePos[] {
    const nodes = getNodeIds();
    const connections = noodle?.getConnections() || [];

    const inCount = new Map<string, number>();
    const children = new Map<string, string[]>();
    for (const n of nodes) { inCount.set(n.id, 0); children.set(n.id, []); }
    for (const c of connections) {
      inCount.set(c.to, (inCount.get(c.to) || 0) + 1);
      children.get(c.from)?.push(c.to);
    }

    const roots = nodes.filter(n => (inCount.get(n.id) || 0) === 0).map(n => n.id);
    if (roots.length !== 1) return computeFlowLayout();

    const positions: NodePos[] = [];
    const visited = new Set<string>();

    function layoutSubtree(id: string, depth: number, startRow: number): number {
      if (visited.has(id)) return startRow;
      visited.add(id);
      const ch = (children.get(id) || []).filter(c => !visited.has(c));
      if (ch.length === 0) {
        positions.push({ id, x: LAYOUT_PAD + depth * LAYOUT_COL_GAP, y: LAYOUT_PAD + startRow * LAYOUT_ROW_GAP });
        return startRow + 1;
      }
      let row = startRow;
      const firstRow = row;
      for (const child of ch) { row = layoutSubtree(child, depth + 1, row); }
      const centerRow = (firstRow + row - 1) / 2;
      positions.push({ id, x: LAYOUT_PAD + depth * LAYOUT_COL_GAP, y: LAYOUT_PAD + centerRow * LAYOUT_ROW_GAP });
      return row;
    }

    layoutSubtree(roots[0], 0, 0);

    // Disconnected nodes at bottom
    let extraRow = positions.length;
    for (const n of nodes) {
      if (!visited.has(n.id)) {
        positions.push({ id: n.id, x: LAYOUT_PAD, y: LAYOUT_PAD + extraRow * LAYOUT_ROW_GAP });
        extraRow++;
      }
    }
    return positions;
  }

  // Force-directed: spring-electrical model (Fruchterman–Reingold variant)
  function computeForceLayout(): NodePos[] {
    const nodes = getNodeIds();
    const connections = noodle?.getConnections() || [];
    const n = nodes.length;
    if (n === 0) return [];

    // Initialize positions from current DOM positions or random
    const pos = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
      const el = document.getElementById(node.id);
      if (el) {
        const p = getNodePosition(el);
        pos.set(node.id, { x: p.x, y: p.y });
      } else {
        pos.set(node.id, { x: Math.random() * 600 + LAYOUT_PAD, y: Math.random() * 400 + LAYOUT_PAD });
      }
    }

    const area = 800 * 500;
    const k = Math.sqrt(area / n); // ideal spring length
    const iterations = 80;

    for (let iter = 0; iter < iterations; iter++) {
      const temp = 200 * (1 - iter / iterations); // cooling
      const disp = new Map<string, { dx: number; dy: number }>();
      for (const node of nodes) disp.set(node.id, { dx: 0, dy: 0 });

      // Repulsive forces between all pairs
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = pos.get(nodes[i].id)!;
          const b = pos.get(nodes[j].id)!;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const force = (k * k) / dist;
          dx = (dx / dist) * force;
          dy = (dy / dist) * force;
          disp.get(nodes[i].id)!.dx += dx;
          disp.get(nodes[i].id)!.dy += dy;
          disp.get(nodes[j].id)!.dx -= dx;
          disp.get(nodes[j].id)!.dy -= dy;
        }
      }

      // Attractive forces along edges
      for (const conn of connections) {
        const a = pos.get(conn.from);
        const b = pos.get(conn.to);
        if (!a || !b) continue;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const force = (dist * dist) / k;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        disp.get(conn.from)!.dx -= dx;
        disp.get(conn.from)!.dy -= dy;
        disp.get(conn.to)!.dx += dx;
        disp.get(conn.to)!.dy += dy;
      }

      // Apply displacements with temperature clamping
      for (const node of nodes) {
        const d = disp.get(node.id)!;
        const dist = Math.max(1, Math.hypot(d.dx, d.dy));
        const clamped = Math.min(dist, temp);
        const p = pos.get(node.id)!;
        p.x += (d.dx / dist) * clamped;
        p.y += (d.dy / dist) * clamped;
      }
    }

    // Normalize to start at LAYOUT_PAD
    let minX = Infinity, minY = Infinity;
    for (const p of pos.values()) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); }
    return nodes.map(n => ({
      id: n.id,
      x: Math.max(LAYOUT_PAD, Math.round(pos.get(n.id)!.x - minX + LAYOUT_PAD)),
      y: Math.max(LAYOUT_PAD, Math.round(pos.get(n.id)!.y - minY + LAYOUT_PAD)),
    }));
  }

  // Radial: BFS layers from roots, arranged on concentric circles
  function computeRadialLayout(): NodePos[] {
    const nodes = getNodeIds();
    const connections = noodle?.getConnections() || [];
    if (nodes.length === 0) return [];

    const inCount = new Map<string, number>();
    const children = new Map<string, string[]>();
    for (const n of nodes) { inCount.set(n.id, 0); children.set(n.id, []); }
    for (const c of connections) {
      inCount.set(c.to, (inCount.get(c.to) || 0) + 1);
      children.get(c.from)?.push(c.to);
    }

    const roots = nodes.filter(n => (inCount.get(n.id) || 0) === 0).map(n => n.id);
    if (roots.length === 0) roots.push(nodes[0].id);

    // BFS to assign layers
    const layer = new Map<string, number>();
    const queue: string[] = [];
    for (const r of roots) { layer.set(r, 0); queue.push(r); }
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const currLayer = layer.get(curr)!;
      for (const child of (children.get(curr) || [])) {
        if (!layer.has(child)) {
          layer.set(child, currLayer + 1);
          queue.push(child);
        }
      }
    }
    // Unvisited nodes
    for (const n of nodes) {
      if (!layer.has(n.id)) { layer.set(n.id, (Math.max(0, ...layer.values()) + 1)); }
    }

    // Group by layer
    const layers = new Map<number, string[]>();
    for (const [id, l] of layer) {
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l)!.push(id);
    }

    const centerX = 500;
    const centerY = 300;
    const ringGap = 120;
    const positions: NodePos[] = [];

    for (const [l, ids] of layers) {
      if (l === 0) {
        // Root(s) at center
        ids.forEach((id, i) => {
          const offset = (i - (ids.length - 1) / 2) * 60;
          positions.push({ id, x: Math.round(centerX + offset), y: Math.round(centerY) });
        });
      } else {
        const radius = l * ringGap;
        ids.forEach((id, i) => {
          const angle = (i / ids.length) * 2 * Math.PI - Math.PI / 2;
          positions.push({
            id,
            x: Math.max(LAYOUT_PAD, Math.round(centerX + Math.cos(angle) * radius)),
            y: Math.max(LAYOUT_PAD, Math.round(centerY + Math.sin(angle) * radius)),
          });
        });
      }
    }
    return positions;
  }

  // Swimlane: group by intent into horizontal lanes, topological order within lanes
  function computeSwimlaneLayout(): NodePos[] {
    const nodes = getNodeIds();
    const connections = noodle?.getConnections() || [];
    if (nodes.length === 0) return [];

    // Compute topological order for within-lane sorting
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, string[]>();
    for (const n of nodes) { incoming.set(n.id, 0); outgoing.set(n.id, []); }
    for (const c of connections) {
      incoming.set(c.to, (incoming.get(c.to) || 0) + 1);
      outgoing.get(c.from)?.push(c.to);
    }

    const topoOrder = new Map<string, number>();
    const queue: string[] = [];
    const remaining = new Map(incoming);
    for (const n of nodes) {
      if ((incoming.get(n.id) || 0) === 0) queue.push(n.id);
    }
    let head = 0;
    let order = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      topoOrder.set(curr, order++);
      for (const next of (outgoing.get(curr) || [])) {
        remaining.set(next, (remaining.get(next) || 1) - 1);
        if ((remaining.get(next) || 0) === 0) queue.push(next);
      }
    }
    // Unvisited (cycles) get highest order
    for (const n of nodes) {
      if (!topoOrder.has(n.id)) topoOrder.set(n.id, order++);
    }

    // Group by intent
    const lanes = new Map<string, typeof nodes>();
    for (const n of nodes) {
      if (!lanes.has(n.intent)) lanes.set(n.intent, []);
      lanes.get(n.intent)!.push(n);
    }

    // Sort within each lane by topological order
    for (const [, laneNodes] of lanes) {
      laneNodes.sort((a, b) => (topoOrder.get(a.id) || 0) - (topoOrder.get(b.id) || 0));
    }

    const laneHeight = 80;
    const laneGap = 20;
    const headerHeight = 24;
    const positions: NodePos[] = [];
    let laneY = LAYOUT_PAD;

    for (const [, laneNodes] of lanes) {
      laneY += headerHeight;
      laneNodes.forEach((n, i) => {
        positions.push({
          id: n.id,
          x: LAYOUT_PAD + i * LAYOUT_COL_GAP,
          y: laneY + (laneHeight - LAYOUT_NODE_H) / 2,
        });
      });
      laneY += laneHeight + laneGap;
    }

    return positions;
  }

  // DAG: Sugiyama-style with barycenter edge-crossing minimization
  function computeDagLayout(): NodePos[] {
    const nodes = getNodeIds();
    const connections = noodle?.getConnections() || [];
    if (nodes.length === 0) return [];

    // Layer assignment via longest path
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    for (const n of nodes) { incoming.set(n.id, []); outgoing.set(n.id, []); }
    for (const c of connections) {
      incoming.get(c.to)?.push(c.from);
      outgoing.get(c.from)?.push(c.to);
    }

    // Topological sort for layer assignment (longest path from source)
    const layer = new Map<string, number>();
    const inCount = new Map<string, number>();
    for (const n of nodes) inCount.set(n.id, incoming.get(n.id)!.length);

    const queue: string[] = [];
    for (const n of nodes) {
      if (inCount.get(n.id) === 0) { queue.push(n.id); layer.set(n.id, 0); }
    }
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      const currLayer = layer.get(curr) || 0;
      for (const next of (outgoing.get(curr) || [])) {
        const proposed = currLayer + 1;
        if (proposed > (layer.get(next) || 0)) layer.set(next, proposed);
        inCount.set(next, (inCount.get(next) || 1) - 1);
        if ((inCount.get(next) || 0) === 0) queue.push(next);
      }
    }
    const maxLayer = Math.max(0, ...layer.values());
    for (const n of nodes) { if (!layer.has(n.id)) layer.set(n.id, maxLayer + 1); }

    // Group by layer
    const layers = new Map<number, string[]>();
    for (const [id, l] of layer) {
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l)!.push(id);
    }

    // Barycenter heuristic: minimize edge crossings by sorting each layer
    // based on the average position of connected nodes in the previous layer
    const layerKeys = [...layers.keys()].sort((a, b) => a - b);

    // Assign initial positions within layers
    const posInLayer = new Map<string, number>();
    for (const [, ids] of layers) {
      ids.forEach((id, i) => posInLayer.set(id, i));
    }

    // Run barycenter passes (forward then backward)
    for (let pass = 0; pass < 4; pass++) {
      const keys = pass % 2 === 0 ? layerKeys : [...layerKeys].reverse();
      for (let ki = 1; ki < keys.length; ki++) {
        const prevLayer = keys[ki - 1];
        const currLayerKey = keys[ki];
        const ids = layers.get(currLayerKey)!;

        // Compute barycenter for each node based on neighbors in prev layer
        const bary = new Map<string, number>();
        for (const id of ids) {
          const neighbors = pass % 2 === 0
            ? (incoming.get(id) || []).filter(n => layer.get(n) === prevLayer)
            : (outgoing.get(id) || []).filter(n => layer.get(n) === prevLayer);
          if (neighbors.length > 0) {
            const avg = neighbors.reduce((sum, n) => sum + (posInLayer.get(n) || 0), 0) / neighbors.length;
            bary.set(id, avg);
          } else {
            bary.set(id, posInLayer.get(id) || 0);
          }
        }

        ids.sort((a, b) => (bary.get(a) || 0) - (bary.get(b) || 0));
        ids.forEach((id, i) => posInLayer.set(id, i));
      }
    }

    // Generate positions
    const positions: NodePos[] = [];
    for (const [l, ids] of layers) {
      const x = LAYOUT_PAD + l * LAYOUT_COL_GAP;
      const totalH = (ids.length - 1) * LAYOUT_ROW_GAP + LAYOUT_NODE_H;
      const startY = Math.max(LAYOUT_PAD, 250 - totalH / 2);
      ids.forEach((id, i) => {
        positions.push({ id, x, y: startY + i * LAYOUT_ROW_GAP });
      });
    }
    return positions;
  }

  // ── Layout Buttons ──

  document.getElementById('layout-flow')?.addEventListener('native:press', () => applyLayout(computeFlowLayout()));
  document.getElementById('layout-grid')?.addEventListener('native:press', () => applyLayout(computeGridLayout()));
  document.getElementById('layout-cluster')?.addEventListener('native:press', () => applyLayout(computeClusterLayout()));
  document.getElementById('layout-tree')?.addEventListener('native:press', () => applyLayout(computeTreeLayout()));
  document.getElementById('layout-force')?.addEventListener('native:press', () => applyLayout(computeForceLayout()));
  document.getElementById('layout-radial')?.addEventListener('native:press', () => applyLayout(computeRadialLayout()));
  document.getElementById('layout-swimlane')?.addEventListener('native:press', () => applyLayout(computeSwimlaneLayout()));
  document.getElementById('layout-dag')?.addEventListener('native:press', () => applyLayout(computeDagLayout()));

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

  // ── Multi-Selection ──

  const multiSelected = new Set<string>();

  function clearMultiSelection() {
    for (const id of multiSelected) {
      document.getElementById(id)?.removeAttribute('data-multi-selected');
    }
    multiSelected.clear();
  }

  function toggleMultiSelect(nodeId: string) {
    if (multiSelected.has(nodeId)) {
      multiSelected.delete(nodeId);
      document.getElementById(nodeId)?.removeAttribute('data-multi-selected');
    } else {
      multiSelected.add(nodeId);
      document.getElementById(nodeId)?.setAttribute('data-multi-selected', '');
    }
  }

  flowArena.addEventListener('pointerdown', (e) => {
    const target = (e.target as HTMLElement).closest('.flow-node') as HTMLElement | null;
    if (!target) return;

    if (e.shiftKey) {
      // Shift+click: toggle multi-selection
      toggleMultiSelect(target.id);
      e.preventDefault();
      return;
    }

    // Regular click: single select (clear multi if clicking outside multi-selection)
    if (!multiSelected.has(target.id)) {
      clearMultiSelection();
    }
    selectNode(target.id);
  });

  // ── Group Drag (multi-selected nodes move together) ──

  let groupDrag: { startX: number; startY: number; origins: Map<string, { x: number; y: number }> } | null = null;

  flowArena.addEventListener('native:magnet-snap', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail?.element) return;
    const draggedEl = detail.element as HTMLElement;
    const draggedId = draggedEl.id;

    // Only do group drag if the dragged node is part of multi-selection
    if (multiSelected.size < 2 || !multiSelected.has(draggedId)) return;

    const pos = getNodePosition(draggedEl);

    if (!groupDrag) {
      // First snap event — record all origins
      groupDrag = {
        startX: pos.x,
        startY: pos.y,
        origins: new Map(),
      };
      for (const id of multiSelected) {
        if (id === draggedId) continue;
        const el = document.getElementById(id);
        if (el) groupDrag.origins.set(id, getNodePosition(el));
      }
    }

    // Apply delta to all other selected nodes
    const dx = pos.x - groupDrag.startX;
    const dy = pos.y - groupDrag.startY;
    for (const [id, origin] of groupDrag.origins) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.style.left = Math.round(origin.x + dx) + 'px';
      el.style.top = Math.round(origin.y + dy) + 'px';
      el.style.translate = '';
    }
  });

  flowArena.addEventListener('native:magnet-drop', () => {
    groupDrag = null;
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
  let zoomLevel = 1;
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.1;
  const zoomLabel = document.getElementById('zoom-label');

  function updateTransform() {
    flowTransform.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
    noodle?.update();
  }

  function setZoom(newZoom: number, centerX?: number, centerY?: number) {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    if (clamped === zoomLevel) return;

    // Zoom toward the center point (viewport-relative)
    if (centerX !== undefined && centerY !== undefined) {
      // Point in canvas space before zoom
      const canvasX = (centerX - panX) / zoomLevel;
      const canvasY = (centerY - panY) / zoomLevel;
      // Adjust pan so the same canvas point stays under the pointer
      panX = centerX - canvasX * clamped;
      panY = centerY - canvasY * clamped;
    }
    zoomLevel = clamped;
    updateTransform();
  }

  // Zoom buttons
  document.getElementById('zoom-in')?.addEventListener('native:press', () => setZoom(zoomLevel + ZOOM_STEP));
  document.getElementById('zoom-out')?.addEventListener('native:press', () => setZoom(zoomLevel - ZOOM_STEP));

  // Scroll wheel zoom
  flowViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = flowViewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;
    setZoom(zoomLevel + delta * zoomLevel, cx, cy);
  }, { passive: false });

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
    updateTransform();
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
    node.setAttribute('data-noodle-port', 'left right top bottom');
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
    panX = viewportCenterX - nodeX * zoomLevel;
    panY = viewportCenterY - nodeY * zoomLevel;
    flowTransform.style.transition = 'transform 300ms ease';
    updateTransform();
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

import { initCopyButtons } from '../../../../../src/nav/demo-copy.ts';
initCopyButtons();
