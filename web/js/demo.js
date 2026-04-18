let demoRunning = false;
let fpsInterval = null;
let scanInterval = null;

const SHELF_DETECTIONS = {
  si1: { label: 'Milk',    conf: () => (0.82 + Math.random() * 0.14).toFixed(2) },
  si2: { label: 'Yogurt',  conf: () => (0.75 + Math.random() * 0.18).toFixed(2) },
  si3: { label: 'Bread',   conf: () => (0.88 + Math.random() * 0.10).toFixed(2) },
  si4: { label: 'Apples',  conf: () => (0.91 + Math.random() * 0.07).toFixed(2) },
  si5: { label: 'Eggs',    conf: () => (0.79 + Math.random() * 0.15).toFixed(2) },
  si6: { label: 'Chicken', conf: () => (0.72 + Math.random() * 0.20).toFixed(2) },
  si7: { label: 'Butter',  conf: () => (0.84 + Math.random() * 0.12).toFixed(2) },
  si8: { label: 'Bananas', conf: () => (0.93 + Math.random() * 0.06).toFixed(2) },
};

const SHELF_KEYS = Object.keys(SHELF_DETECTIONS);

function toggleDemo() {
  demoRunning ? stopDemo() : startDemo();
}

function startDemo() {
  demoRunning = true;
  document.getElementById('demoBtn').textContent = '■ Stop Demo';
  document.getElementById('demoBtn').classList.add('running');
  document.getElementById('viewportIdle').classList.add('hidden');

  fpsInterval = setInterval(() => {
    document.getElementById('fps').textContent = Math.floor(22 + Math.random() * 8);
  }, 500);

  const scanSequence = shuffleArray([...SHELF_KEYS]);
  let scanIndex = 0;

  scanInterval = setInterval(() => {
    if (!demoRunning) return;
    const count = 1 + Math.floor(Math.random() * 3);
    const toDetect = scanSequence.slice(scanIndex % scanSequence.length, scanIndex % scanSequence.length + count);
    scanIndex += count;
    clearBoundingBoxes();

    toDetect.forEach(key => {
      const det = SHELF_DETECTIONS[key];
      const conf = det.conf();
      const isOnList = checkOnList(det.label);
      const el = document.querySelector(`.${key}`);

      if (el) {
        el.classList.add('scanning');
        setTimeout(() => el.classList.remove('scanning'), 700);
        drawBoundingBox(el, det.label, conf, isOnList);
      }

      addLogEntry(
        isOnList
          ? `✓ MATCHED  ${det.label.padEnd(10)} conf=${conf}  → on your list!`
          : `⬡ DETECTED ${det.label.padEnd(10)} conf=${conf}`,
        isOnList ? 'log-match' : 'log-detect'
      );

      document.getElementById('detectionStatus').textContent = `Detected: ${det.label} · ${conf} confidence`;

      if (isOnList && typeof window.markDetected === 'function') {
        window.markDetected(det.label);
      }
    });
  }, 1500 + Math.random() * 600);

  addLogEntry('Demo started — simulating YOLOv7-tiny on Snap Spectacles', 'log-idle');
}

function stopDemo() {
  demoRunning = false;
  clearInterval(fpsInterval);
  clearInterval(scanInterval);
  document.getElementById('demoBtn').textContent = '▶ Start Demo';
  document.getElementById('demoBtn').classList.remove('running');
  document.getElementById('viewportIdle').classList.remove('hidden');
  document.getElementById('fps').textContent = '--';
  document.getElementById('detectionStatus').textContent = 'Waiting for scan…';
  clearBoundingBoxes();
  addLogEntry('Demo stopped', 'log-idle');
}

function drawBoundingBox(el, label, conf, matched) {
  const viewport = document.getElementById('arViewport');
  const vRect = viewport.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const box = document.createElement('div');
  box.className = 'ar-bbox' + (matched ? ' matched' : '');
  box.style.left   = (eRect.left - vRect.left - 8) + 'px';
  box.style.top    = (eRect.top  - vRect.top  - 8) + 'px';
  box.style.width  = (eRect.width  + 16) + 'px';
  box.style.height = (eRect.height + 16) + 'px';
  const lbl = document.createElement('div');
  lbl.className = 'ar-bbox-label';
  lbl.textContent = `${label} · ${conf}`;
  box.appendChild(lbl);
  document.getElementById('boundingBoxes').appendChild(box);
  setTimeout(() => box.remove(), 1200);
}

function clearBoundingBoxes() {
  document.getElementById('boundingBoxes').innerHTML = '';
}

function addLogEntry(text, cls = '') {
  const container = document.getElementById('logEntries');
  const entry = document.createElement('div');
  entry.className = 'log-entry ' + cls;
  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
  entry.textContent = `[${ts}]  ${text}`;
  const idle = container.querySelector('.log-idle');
  if (idle && idle.textContent.includes('Waiting')) idle.remove();
  container.prepend(entry);
  while (container.children.length > 50) container.removeChild(container.lastChild);
}

function checkOnList(label) {
  const items = typeof window.appItems === 'function' ? window.appItems() : [];
  return items.some(i => i.name.toLowerCase() === label.toLowerCase() && !i.checked);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
