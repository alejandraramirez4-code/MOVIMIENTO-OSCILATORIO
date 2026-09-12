/**
 * CUADERNO VIRTUAL INTERACTIVO - FÍSICA 3 (UTP)
 * Motor lógico: Navegación de páginas, Motor GeoGebra Canvas, Simulador Dinámico y Calculadoras
 */

// ==========================================================================
// Estado Global de la Aplicación
// ==========================================================================
const AppState = {
  currentPage: 1,
  totalPages: 12,
  
  // Parámetros Físicos de Simulación (Masa-Resorte y MAS)
  physics: {
    A: 0.15,       // Amplitud en metros (0.15 m = 15 cm)
    m: 2.0,        // Masa en kg
    k: 50.0,       // Constante elástica en N/m
    phi: 0.0,      // Ángulo de fase inicial en rad
    time: 0.0,     // Tiempo actual de simulación
    isRunning: true,
    speedFactor: 1.0
  },

  // Estado del Plano Cartesiano GeoGebra
  geogebra: {
    originX: 60,   // Posición del origen en canvas (px)
    originY: 110,  // Altura del eje horizontal
    scaleX: 120,   // Píxeles por segundo (eje t)
    scaleY: 450,   // Píxeles por metro (eje x)
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    activeTool: 'probe', // 'probe', 'pan', 'zoom-in', 'zoom-out'
    curveColor: '#6b21a8',
    curveWidth: 2.5,
    curveStyle: 'solid'  // 'solid', 'dashed', 'dotted'
  }
};

// ==========================================================================
// Sistema de Navegación de Páginas
// ==========================================================================
function goToPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > AppState.totalPages) return;
  
  const oldPage = AppState.currentPage;
  AppState.currentPage = pageNumber;

  // Actualizar clases de páginas
  const allPages = document.querySelectorAll('.notebook-page');
  allPages.forEach((page) => {
    const pNum = parseInt(page.getAttribute('data-page'));
    page.classList.remove('active', 'prev');
    if (pNum === pageNumber) {
      page.classList.add('active');
    } else if (pNum < pageNumber) {
      page.classList.add('prev');
    }
  });

  // Actualizar controles de navegación
  const pageIndicator = document.getElementById('pageIndicatorText');
  if (pageIndicator) pageIndicator.textContent = `Página ${pageNumber} de ${AppState.totalPages}`;
  
  const pageDropdown = document.getElementById('pageSelect');
  if (pageDropdown) pageDropdown.value = pageNumber;

  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');
  const btnFirst = document.getElementById('btnFirstPage');
  const btnLast = document.getElementById('btnLastPage');

  if (btnPrev) btnPrev.disabled = (pageNumber === 1);
  if (btnNext) btnNext.disabled = (pageNumber === AppState.totalPages);
  if (btnFirst) btnFirst.disabled = (pageNumber === 1);
  if (btnLast) btnLast.disabled = (pageNumber === AppState.totalPages);

  // Actualizar miniatura activa
  document.querySelectorAll('.thumb-item').forEach(item => {
    const p = parseInt(item.getAttribute('data-page'));
    item.classList.toggle('active', p === pageNumber);
  });

  // Si entramos a la página 7, redibujar canvas GeoGebra
  if (pageNumber === 7) {
    requestAnimationFrame(() => {
      initGeoGebraCanvas();
    });
  }
}

// ==========================================================================
// Plano Cartesiano Interactivo GeoGebra (Canvas 2D Engine)
// ==========================================================================
let ggbCanvas, ggbCtx;
let springCanvas, springCtx;
let animFrameId = null;

function initGeoGebraCanvas() {
  ggbCanvas = document.getElementById('geogebraCanvas');
  if (!ggbCanvas) return;
  ggbCtx = ggbCanvas.getContext('2d');

  // Ajustar resolución Retina / alta densidad
  const rect = ggbCanvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  ggbCanvas.width = rect.width * dpr;
  ggbCanvas.height = rect.height * dpr;
  ggbCtx.scale(dpr, dpr);

  setupGeoGebraInteractions();
}

function drawGeoGebraPlane() {
  if (!ggbCanvas || !ggbCtx) return;
  const w = ggbCanvas.width / (window.devicePixelRatio || 1);
  const h = ggbCanvas.height / (window.devicePixelRatio || 1);
  const { originX, originY, scaleX, scaleY, curveColor, curveWidth, curveStyle } = AppState.geogebra;

  ggbCtx.clearRect(0, 0, w, h);

  // 1. Cuadrícula Menor (Estilo Papel Milimetrado GeoGebra)
  const minorStepX = scaleX / 10; // cada 0.1 s
  const minorStepY = scaleY / 20; // cada 0.05 m
  
  ggbCtx.lineWidth = 0.5;
  ggbCtx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
  
  // Líneas verticales menores
  const startX = originX % minorStepX;
  for (let x = startX; x < w; x += minorStepX) {
    ggbCtx.beginPath();
    ggbCtx.moveTo(x, 0);
    ggbCtx.lineTo(x, h);
    ggbCtx.stroke();
  }
  // Líneas horizontales menores
  const startY = originY % minorStepY;
  for (let y = startY; y < h; y += minorStepY) {
    ggbCtx.beginPath();
    ggbCtx.moveTo(0, y);
    ggbCtx.lineTo(w, y);
    ggbCtx.stroke();
  }

  // 2. Cuadrícula Mayor (Líneas principales con marcas)
  const majorStepX = scaleX;      // cada 1.0 s
  const majorStepY = scaleY * 0.1; // cada 0.1 m
  
  ggbCtx.lineWidth = 1;
  ggbCtx.strokeStyle = 'rgba(148, 163, 184, 0.6)';

  // Verticales mayores
  for (let x = originX % majorStepX; x < w; x += majorStepX) {
    ggbCtx.beginPath();
    ggbCtx.moveTo(x, 0);
    ggbCtx.lineTo(x, h);
    ggbCtx.stroke();
  }
  // Horizontales mayores
  for (let y = originY % majorStepY; y < h; y += majorStepY) {
    ggbCtx.beginPath();
    ggbCtx.moveTo(0, y);
    ggbCtx.lineTo(w, y);
    ggbCtx.stroke();
  }

  // 3. Ejes Cartesianos Principales con Regla y Ticks
  ggbCtx.lineWidth = 2;
  ggbCtx.strokeStyle = '#334155';

  // Eje X (Tiempo t)
  ggbCtx.beginPath();
  ggbCtx.moveTo(0, originY);
  ggbCtx.lineTo(w, originY);
  ggbCtx.stroke();

  // Flecha Eje X
  ggbCtx.beginPath();
  ggbCtx.moveTo(w - 8, originY - 4);
  ggbCtx.lineTo(w, originY);
  ggbCtx.lineTo(w - 8, originY + 4);
  ggbCtx.fillStyle = '#334155';
  ggbCtx.fill();

  // Eje Y (Elongación x)
  ggbCtx.beginPath();
  ggbCtx.moveTo(originX, 0);
  ggbCtx.lineTo(originX, h);
  ggbCtx.stroke();

  // Flecha Eje Y
  ggbCtx.beginPath();
  ggbCtx.moveTo(originX - 4, 8);
  ggbCtx.lineTo(originX, 0);
  ggbCtx.lineTo(originX + 4, 8);
  ggbCtx.fill();

  // 4. Marcas numéricas y etiquetas sobre los ejes (Ticks)
  ggbCtx.font = '10px "Fira Code", monospace';
  ggbCtx.fillStyle = '#475569';
  ggbCtx.textAlign = 'center';
  ggbCtx.textBaseline = 'top';

  // Números en Eje t
  const minT = -Math.floor(originX / scaleX);
  const maxT = Math.ceil((w - originX) / scaleX);
  for (let t = minT; t <= maxT; t++) {
    if (t === 0) continue;
    const px = originX + t * scaleX;
    if (px >= 0 && px <= w) {
      // Tick vertical
      ggbCtx.beginPath();
      ggbCtx.moveTo(px, originY - 4);
      ggbCtx.lineTo(px, originY + 4);
      ggbCtx.stroke();
      ggbCtx.fillText(`${t}s`, px, originY + 6);
    }
  }

  // Números en Eje x (elongación)
  ggbCtx.textAlign = 'right';
  ggbCtx.textBaseline = 'middle';
  for (let val = -0.3; val <= 0.3; val += 0.1) {
    const rounded = Math.round(val * 10) / 10;
    if (Math.abs(rounded) < 0.01) continue;
    const py = originY - rounded * scaleY;
    if (py >= 0 && py <= h) {
      // Tick horizontal
      ggbCtx.beginPath();
      ggbCtx.moveTo(originX - 4, py);
      ggbCtx.lineTo(originX + 4, py);
      ggbCtx.stroke();
      ggbCtx.fillText(`${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}m`, originX - 6, py);
    }
  }

  // Etiquetas de los ejes
  ggbCtx.font = 'bold 11px "Outfit", sans-serif';
  ggbCtx.fillStyle = '#1e1b4b';
  ggbCtx.fillText('x(m)', originX - 12, 14);
  ggbCtx.textAlign = 'right';
  ggbCtx.fillText('t (segundos)', w - 12, originY - 10);

  // 5. Dibujar Curva Teórica del M.A.S.: x(t) = A * cos(omega * t + phi)
  const { A, m, k, phi, time } = AppState.physics;
  const omega = Math.sqrt(k / m);

  ggbCtx.save();
  ggbCtx.lineWidth = curveWidth;
  ggbCtx.strokeStyle = curveColor;

  if (curveStyle === 'dashed') {
    ggbCtx.setLineDash([8, 5]);
  } else if (curveStyle === 'dotted') {
    ggbCtx.setLineDash([3, 3]);
  } else {
    ggbCtx.setLineDash([]);
  }

  ggbCtx.beginPath();
  let firstPoint = true;
  for (let px = 0; px <= w; px += 2) {
    const tVal = (px - originX) / scaleX;
    const xVal = A * Math.cos(omega * tVal + phi);
    const py = originY - xVal * scaleY;
    
    if (firstPoint) {
      ggbCtx.moveTo(px, py);
      firstPoint = false;
    } else {
      ggbCtx.lineTo(px, py);
    }
  }
  ggbCtx.stroke();
  ggbCtx.restore();

  // 6. Trazador Móvil (Punto animado en tiempo real)
  const currentT = time % ((w - originX) / scaleX);
  const currentX = A * Math.cos(omega * currentT + phi);
  const pointPx = originX + currentT * scaleX;
  const pointPy = originY - currentX * scaleY;

  if (pointPx >= 0 && pointPx <= w) {
    // Líneas proyectadas a los ejes (estilo GeoGebra)
    ggbCtx.save();
    ggbCtx.setLineDash([3, 3]);
    ggbCtx.strokeStyle = '#9333ea';
    ggbCtx.lineWidth = 1.2;
    
    // Proyección a eje t
    ggbCtx.beginPath();
    ggbCtx.moveTo(pointPx, originY);
    ggbCtx.lineTo(pointPx, pointPy);
    ggbCtx.stroke();

    // Proyección a eje x
    ggbCtx.beginPath();
    ggbCtx.moveTo(originX, pointPy);
    ggbCtx.lineTo(pointPx, pointPy);
    ggbCtx.stroke();

    // Punto resaltado con halo
    ggbCtx.beginPath();
    ggbCtx.arc(pointPx, pointPy, 6, 0, Math.PI * 2);
    ggbCtx.fillStyle = '#d97706';
    ggbCtx.fill();
    ggbCtx.lineWidth = 2;
    ggbCtx.strokeStyle = '#ffffff';
    ggbCtx.stroke();

    // Etiqueta flotante de coordenadas
    ggbCtx.font = 'bold 9px "Fira Code", monospace';
    ggbCtx.fillStyle = '#3b0764';
    ggbCtx.fillText(`P(${currentT.toFixed(2)}s, ${currentX.toFixed(3)}m)`, pointPx + 8, pointPy - 8);
    ggbCtx.restore();
  }
}

function setupGeoGebraInteractions() {
  const container = ggbCanvas.parentElement;

  // Manejo de herramientas (Pan, Zoom, Sondas)
  container.addEventListener('mousedown', (e) => {
    if (AppState.geogebra.activeTool === 'pan') {
      AppState.geogebra.isPanning = true;
      AppState.geogebra.panStartX = e.clientX;
      AppState.geogebra.panStartY = e.clientY;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (AppState.geogebra.isPanning) {
      const dx = e.clientX - AppState.geogebra.panStartX;
      const dy = e.clientY - AppState.geogebra.panStartY;
      AppState.geogebra.originX += dx;
      AppState.geogebra.originY += dy;
      AppState.geogebra.panStartX = e.clientX;
      AppState.geogebra.panStartY = e.clientY;
    }

    // Actualizar indicador de coordenadas en el header de GeoGebra
    if (ggbCanvas && e.target === ggbCanvas) {
      const rect = ggbCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const tVal = (mouseX - AppState.geogebra.originX) / AppState.geogebra.scaleX;
      const xVal = -(mouseY - AppState.geogebra.originY) / AppState.geogebra.scaleY;
      const coordLabel = document.getElementById('ggbCoordsDisplay');
      if (coordLabel) {
        coordLabel.textContent = `t = ${tVal.toFixed(2)} s, x = ${xVal.toFixed(3)} m`;
      }
    }
  });

  window.addEventListener('mouseup', () => {
    AppState.geogebra.isPanning = false;
  });

  // Zoom con la rueda del mouse
  ggbCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    applyGeoGebraZoom(zoomFactor, e.offsetX, e.offsetY);
  }, { passive: false });
}

function applyGeoGebraZoom(factor, centerX, centerY) {
  const cx = (centerX !== undefined) ? centerX : ggbCanvas.width / 2;
  const cy = (centerY !== undefined) ? centerY : ggbCanvas.height / 2;

  AppState.geogebra.scaleX *= factor;
  AppState.geogebra.scaleY *= factor;

  // Re-ajustar origen respecto al centro de zoom
  AppState.geogebra.originX = cx - (cx - AppState.geogebra.originX) * factor;
  AppState.geogebra.originY = cy - (cy - AppState.geogebra.originY) * factor;
}

// ==========================================================================
// Simulador Físico de Oscilador Masa-Resorte (Spring Canvas)
// ==========================================================================
function initSpringCanvas() {
  springCanvas = document.getElementById('springCanvas');
  if (!springCanvas) return;
  springCtx = springCanvas.getContext('2d');

  const rect = springCanvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  springCanvas.width = 140 * dpr;
  springCanvas.height = 100 * dpr;
  springCtx.scale(dpr, dpr);
}

function drawSpringSimulation(currentX, currentV) {
  if (!springCanvas || !springCtx) return;
  const w = 140;
  const h = 100;

  springCtx.clearRect(0, 0, w, h);

  // Pared de anclaje (izquierda)
  springCtx.fillStyle = '#64748b';
  springCtx.fillRect(10, 20, 10, 60);

  // Patrón rayado de pared fija
  springCtx.strokeStyle = '#334155';
  springCtx.lineWidth = 1.5;
  for (let y = 25; y < 80; y += 8) {
    springCtx.beginPath();
    springCtx.moveTo(10, y);
    springCtx.lineTo(5, y + 6);
    springCtx.stroke();
  }

  // Posición de la masa (mapeada a píxeles en el canvas)
  const equilibriumPx = 75;
  const massPx = equilibriumPx + (currentX / 0.2) * 40; // escala visual
  const massWidth = 26;
  const massHeight = 26;

  // Dibujar Resorte Helicoidal
  const springStartX = 20;
  const springEndX = massPx - massWidth / 2;
  const coils = 11;
  const coilWidth = (springEndX - springStartX) / coils;

  springCtx.beginPath();
  springCtx.strokeStyle = '#7e22ce';
  springCtx.lineWidth = 2.5;
  springCtx.moveTo(springStartX, 50);

  for (let i = 0; i < coils; i++) {
    const cx = springStartX + i * coilWidth;
    const dy = (i % 2 === 0) ? -12 : 12;
    springCtx.lineTo(cx + coilWidth / 2, 50 + dy);
  }
  springCtx.lineTo(springEndX, 50);
  springCtx.stroke();

  // Dibujar Bloque de Masa m
  springCtx.fillStyle = '#3b82f6';
  springCtx.strokeStyle = '#1d4ed8';
  springCtx.lineWidth = 2;
  springCtx.fillRect(massPx - massWidth / 2, 50 - massHeight / 2, massWidth, massHeight);
  springCtx.strokeRect(massPx - massWidth / 2, 50 - massHeight / 2, massWidth, massHeight);

  // Texto "m" dentro del bloque
  springCtx.fillStyle = '#ffffff';
  springCtx.font = 'bold 10px "Outfit", sans-serif';
  springCtx.textAlign = 'center';
  springCtx.textBaseline = 'middle';
  springCtx.fillText('m', massPx, 50);

  // Vector de Velocidad (Flecha verde)
  if (Math.abs(currentV) > 0.02) {
    const vArrowLen = (currentV / 1.5) * 25;
    springCtx.beginPath();
    springCtx.strokeStyle = '#10b981';
    springCtx.lineWidth = 2;
    springCtx.moveTo(massPx, 30);
    springCtx.lineTo(massPx + vArrowLen, 30);
    springCtx.stroke();
    
    // Punta de flecha
    const arrowDir = vArrowLen > 0 ? 1 : -1;
    springCtx.beginPath();
    springCtx.moveTo(massPx + vArrowLen, 30);
    springCtx.lineTo(massPx + vArrowLen - 4 * arrowDir, 27);
    springCtx.lineTo(massPx + vArrowLen - 4 * arrowDir, 33);
    springCtx.fillStyle = '#10b981';
    springCtx.fill();
  }

  // Línea de referencia de equilibrio x=0
  springCtx.setLineDash([2, 2]);
  springCtx.strokeStyle = '#cbd5e1';
  springCtx.lineWidth = 1;
  springCtx.beginPath();
  springCtx.moveTo(equilibriumPx, 15);
  springCtx.lineTo(equilibriumPx, 85);
  springCtx.stroke();
  springCtx.setLineDash([]);
}

// Bucle principal de animación a 60 FPS
let lastFrameTime = performance.now();

function simulationLoop(now) {
  const dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  if (AppState.physics.isRunning) {
    AppState.physics.time += dt * AppState.physics.speedFactor;
  }

  const { A, m, k, phi, time } = AppState.physics;
  const omega = Math.sqrt(k / m);
  const currentX = A * Math.cos(omega * time + phi);
  const currentV = -A * omega * Math.sin(omega * time + phi);
  const currentA = -omega * omega * currentX;

  // Actualizar energías: Ec = 1/2 m v^2, Ep = 1/2 k x^2, Et = 1/2 k A^2
  const Ek = 0.5 * m * currentV * currentV;
  const Ep = 0.5 * k * currentX * currentX;
  const Et = 0.5 * k * A * A;

  updateEnergyBars(Ek, Ep, Et);

  // Renderizar gráficos interactivos si la página 7 está activa
  if (AppState.currentPage === 7) {
    drawGeoGebraPlane();
    drawSpringSimulation(currentX, currentV);
  }

  animFrameId = requestAnimationFrame(simulationLoop);
}

function updateEnergyBars(Ek, Ep, Et) {
  const maxEnergy = Math.max(Et, 0.001);
  const pctEk = Math.min(100, Math.max(0, (Ek / maxEnergy) * 100));
  const pctEp = Math.min(100, Math.max(0, (Ep / maxEnergy) * 100));
  const pctEt = 100;

  const barEk = document.getElementById('barEk');
  const barEp = document.getElementById('barEp');
  const barEt = document.getElementById('barEt');

  const valEk = document.getElementById('valEk');
  const valEp = document.getElementById('valEp');
  const valEt = document.getElementById('valEt');

  if (barEk) barEk.style.width = `${pctEk}%`;
  if (barEp) barEp.style.width = `${pctEp}%`;
  if (barEt) barEt.style.width = `${pctEt}%`;

  if (valEk) valEk.textContent = `${Ek.toFixed(2)} J`;
  if (valEp) valEp.textContent = `${Ep.toFixed(2)} J`;
  if (valEt) valEt.textContent = `${Et.toFixed(2)} J`;
}

// ==========================================================================
// Calculadoras Interactivas para Ejercicios con Código de Color Estricto
// ==========================================================================
function recalculateExercise1() {
  const mInput = document.getElementById('ex1_m');
  const kInput = document.getElementById('ex1_k');
  const AInput = document.getElementById('ex1_A');

  if (!mInput || !kInput || !AInput) return;

  const m = parseFloat(mInput.value) || 3.0;
  const k = parseFloat(kInput.value) || 1200.0;
  const A = parseFloat(AInput.value) || 0.05;

  const omega = Math.sqrt(k / m);
  const f = omega / (2 * Math.PI);
  const T = 1 / f;
  const vMax = A * omega;
  const aMax = A * omega * omega;

  // Actualizar badges naranjas (incógnitas resueltas)
  const resW = document.getElementById('res_ex1_omega');
  const resF = document.getElementById('res_ex1_f');
  const resT = document.getElementById('res_ex1_T');
  const resV = document.getElementById('res_ex1_vmax');
  const resA = document.getElementById('res_ex1_amax');

  if (resW) resW.textContent = `${omega.toFixed(2)} rad/s`;
  if (resF) resF.textContent = `${f.toFixed(2)} Hz`;
  if (resT) resT.textContent = `${T.toFixed(3)} s`;
  if (resV) resV.textContent = `${vMax.toFixed(2)} m/s`;
  if (resA) resA.textContent = `${aMax.toFixed(2)} m/s²`;
}

function recalculateExercise2() {
  const aMaxInput = document.getElementById('ex2_amax');
  const fInput = document.getElementById('ex2_f');

  if (!aMaxInput || !fInput) return;

  const aMax = parseFloat(aMaxInput.value) || 45.0; // m/s²
  const f = parseFloat(fInput.value) || 15.0;      // Hz

  const omega = 2 * Math.PI * f;
  const T = 1 / f;
  const A = aMax / (omega * omega); // en metros
  const A_mm = A * 1000;            // en milímetros
  const vMax = A * omega;

  const resW = document.getElementById('res_ex2_omega');
  const resT = document.getElementById('res_ex2_T');
  const resA = document.getElementById('res_ex2_A');
  const resV = document.getElementById('res_ex2_vmax');

  if (resW) resW.textContent = `${omega.toFixed(2)} rad/s`;
  if (resT) resT.textContent = `${T.toFixed(4)} s`;
  if (resA) resA.textContent = `${A_mm.toFixed(3)} mm (${A.toExponential(3)} m)`;
  if (resV) resV.textContent = `${vMax.toFixed(3)} m/s`;
}

// ==========================================================================
// Glosario Interactivo con Búsqueda en Tiempo Real
// ==========================================================================
function setupGlossarySearch() {
  const searchInput = document.getElementById('glossarySearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.glossary-card');

    cards.forEach(card => {
      const term = card.querySelector('.glossary-term').textContent.toLowerCase();
      const def = card.querySelector('.glossary-def').textContent.toLowerCase();
      if (term.includes(query) || def.includes(query)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

// ==========================================================================
// Vinculación de Eventos del DOM e Inicialización
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Configurar botones de navegación
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');
  const btnFirst = document.getElementById('btnFirstPage');
  const btnLast = document.getElementById('btnLastPage');
  const btnOpen = document.getElementById('btnOpenNotebook');
  const pageDropdown = document.getElementById('pageSelect');

  if (btnPrev) btnPrev.addEventListener('click', () => goToPage(AppState.currentPage - 1));
  if (btnNext) btnNext.addEventListener('click', () => goToPage(AppState.currentPage + 1));
  if (btnFirst) btnFirst.addEventListener('click', () => goToPage(1));
  if (btnLast) btnLast.addEventListener('click', () => goToPage(AppState.totalPages));
  if (btnOpen) btnOpen.addEventListener('click', () => goToPage(2));

  if (pageDropdown) {
    pageDropdown.addEventListener('change', (e) => {
      goToPage(parseInt(e.target.value));
    });
  }

  // Navegación por teclado
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      goToPage(AppState.currentPage + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      goToPage(AppState.currentPage - 1);
    } else if (e.key === 'Home') {
      goToPage(1);
    } else if (e.key === 'End') {
      goToPage(AppState.totalPages);
    }
  });

  // 2. Modal de Miniaturas (Thumbnails Drawer)
  const btnThumbs = document.getElementById('btnToggleThumbs');
  const modalThumbs = document.getElementById('thumbnailsModal');
  const btnCloseModal = document.getElementById('btnCloseThumbs');

  if (btnThumbs && modalThumbs) {
    btnThumbs.addEventListener('click', () => modalThumbs.classList.add('open'));
  }
  if (btnCloseModal && modalThumbs) {
    btnCloseModal.addEventListener('click', () => modalThumbs.classList.remove('open'));
  }
  if (modalThumbs) {
    modalThumbs.addEventListener('click', (e) => {
      if (e.target === modalThumbs) modalThumbs.classList.remove('open');
    });
  }

  document.querySelectorAll('.thumb-item').forEach(item => {
    item.addEventListener('click', () => {
      const targetPage = parseInt(item.getAttribute('data-page'));
      goToPage(targetPage);
      if (modalThumbs) modalThumbs.classList.remove('open');
    });
  });

  // Enlaces del Índice de Contenidos (Página 3)
  document.querySelectorAll('.toc-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = parseInt(item.getAttribute('data-target-page'));
      if (targetPage) goToPage(targetPage);
    });
  });

  // 3. Controles del Simulador GeoGebra (Página 7)
  const sliderA = document.getElementById('sliderA');
  const sliderM = document.getElementById('sliderM');
  const sliderK = document.getElementById('sliderK');
  const sliderPhi = document.getElementById('sliderPhi');

  const lblA = document.getElementById('lblValA');
  const lblM = document.getElementById('lblValM');
  const lblK = document.getElementById('lblValK');
  const lblPhi = document.getElementById('lblValPhi');

  if (sliderA) {
    sliderA.addEventListener('input', (e) => {
      AppState.physics.A = parseFloat(e.target.value);
      if (lblA) lblA.textContent = `${AppState.physics.A.toFixed(2)} m`;
    });
  }
  if (sliderM) {
    sliderM.addEventListener('input', (e) => {
      AppState.physics.m = parseFloat(e.target.value);
      if (lblM) lblM.textContent = `${AppState.physics.m.toFixed(1)} kg`;
    });
  }
  if (sliderK) {
    sliderK.addEventListener('input', (e) => {
      AppState.physics.k = parseFloat(e.target.value);
      if (lblK) lblK.textContent = `${AppState.physics.k.toFixed(0)} N/m`;
    });
  }
  if (sliderPhi) {
    sliderPhi.addEventListener('input', (e) => {
      AppState.physics.phi = parseFloat(e.target.value);
      if (lblPhi) lblPhi.textContent = `${(AppState.physics.phi / Math.PI).toFixed(2)}π rad`;
    });
  }

  const btnPlayPause = document.getElementById('btnPlayPause');
  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      AppState.physics.isRunning = !AppState.physics.isRunning;
      btnPlayPause.innerHTML = AppState.physics.isRunning 
        ? '<i class="lucide-pause"></i> Pausar' 
        : '<i class="lucide-play"></i> Reanudar';
    });
  }

  const btnResetSim = document.getElementById('btnResetSim');
  if (btnResetSim) {
    btnResetSim.addEventListener('click', () => {
      AppState.physics.time = 0.0;
    });
  }

  // Herramientas GeoGebra (Zoom in, Zoom out, Pan, Reset)
  const btnZoomIn = document.getElementById('btnGgbZoomIn');
  const btnZoomOut = document.getElementById('btnGgbZoomOut');
  const btnPan = document.getElementById('btnGgbPan');
  const btnResetView = document.getElementById('btnGgbResetView');
  const btnPalette = document.getElementById('btnGgbPalette');
  const paletteDropdown = document.getElementById('stylePaletteDropdown');

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => applyGeoGebraZoom(1.2));
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => applyGeoGebraZoom(0.8));
  }
  if (btnPan) {
    btnPan.addEventListener('click', () => {
      const isPanActive = (AppState.geogebra.activeTool === 'pan');
      AppState.geogebra.activeTool = isPanActive ? 'probe' : 'pan';
      btnPan.classList.toggle('active', !isPanActive);
      const canvasWrapper = document.querySelector('.geogebra-canvas-wrapper');
      if (canvasWrapper) canvasWrapper.classList.toggle('pan-mode', !isPanActive);
    });
  }
  if (btnResetView) {
    btnResetView.addEventListener('click', () => {
      AppState.geogebra.originX = 60;
      AppState.geogebra.originY = 110;
      AppState.geogebra.scaleX = 120;
      AppState.geogebra.scaleY = 450;
    });
  }
  if (btnPalette && paletteDropdown) {
    btnPalette.addEventListener('click', (e) => {
      e.stopPropagation();
      paletteDropdown.classList.toggle('show');
    });
    window.addEventListener('click', () => {
      paletteDropdown.classList.remove('show');
    });
  }

  // Chips de color de paleta GeoGebra
  document.querySelectorAll('.color-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      AppState.geogebra.curveColor = chip.getAttribute('data-color');
    });
  });

  // Selector de grosor de trazo
  const strokeWidthSelect = document.getElementById('strokeWidthSelect');
  if (strokeWidthSelect) {
    strokeWidthSelect.addEventListener('change', (e) => {
      AppState.geogebra.curveWidth = parseFloat(e.target.value);
    });
  }
  // Selector de estilo de línea
  const strokeStyleSelect = document.getElementById('strokeStyleSelect');
  if (strokeStyleSelect) {
    strokeStyleSelect.addEventListener('change', (e) => {
      AppState.geogebra.curveStyle = e.target.value;
    });
  }

  // 4. Calculadoras interactivas para Ejercicios
  ['ex1_m', 'ex1_k', 'ex1_A'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalculateExercise1);
  });
  ['ex2_amax', 'ex2_f'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalculateExercise2);
  });

  // 5. Configurar buscador de Glosario
  setupGlossarySearch();

  // 6. Modo Pantalla Completa
  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
        btnFullscreen.innerHTML = '⛶ Normal';
      } else {
        document.exitFullscreen();
        btnFullscreen.innerHTML = '⛶ Pantalla Completa';
      }
    });
  }

  // Iniciar lienzos gráficos
  initGeoGebraCanvas();
  initSpringCanvas();

  // Iniciar ciclo de simulación continua
  requestAnimationFrame(simulationLoop);

  // Inicializar KaTeX si está presente
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ],
      throwOnError: false
    });
  }
});
