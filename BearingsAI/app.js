(function () {
  'use strict';

  const config = window.BEARINGS_CONFIG || {};
  const FAMILY_STORAGE_KEY = 'bearings-family-updates-v3';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { selectedBook: 'La telaraña de Carlota', recording: false, recorder: null, stream: null, timer: null, seconds: 0, artDataUrl: null, familyUpdates: [], visibleUpdateIndex: 0, fallbackFullscreenTarget: null };
  const DEMO_UPDATE = {
    date: localDateISO(),
    subject: 'Ciencias',
    recap: 'Las y los estudiantes exploraron cómo las plantas usan la luz solar, el agua y el aire para crecer. Hicieron observaciones y compartieron sus ideas en equipos pequeños.',
    homework: 'Busca una planta en casa y dibuja algo que observes.'
  };

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => element.classList.remove('show'), 3300);
  }

  function localDateISO() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function showView(view) {
    $$('.view').forEach((element) => element.classList.toggle('active', element.dataset.view === view));
    $$('.nav-link').forEach((element) => element.classList.toggle('active', element.dataset.route === view));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openTeacher() {
    if (sessionStorage.getItem('bearings-teacher') === 'yes') showView('teacher');
    else $('#teacher-gate').hidden = false;
  }

  function addMessage(text, role) {
    const chat = $('#chat-window');
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    if (role === 'bot') div.innerHTML = '<div class="chat-avatar">B</div>';
    const body = document.createElement('p');
    body.textContent = text;
    div.appendChild(body);
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function localGuidance(question) {
    const q = question.toLowerCase();
    if (/ensayo|haz.*tarea|haz.*trabajo|respuesta.*examen|contesta.*examen|essay|write.*for me|answer.*test/.test(q)) return 'No puedo hacer el trabajo por ti, pero sí puedo ayudarte a empezar. ¿Qué parte entiendes primero y qué te pide hacer la pregunta?';
    if (/libro|carlota|wilbur|fern|palabra|market|book|charlotte|word collector/.test(q)) return `¡Muy buena idea sobre el libro! En ${state.selectedBook}, ¿qué pasó justo antes de la parte que te causa duda? ¿Qué te dice eso sobre un personaje o una idea importante?`;
    if (/inglés|ingles|english|palabra|translate|vocab/.test(q)) return '¡Vamos a practicar! Elige una palabra nueva en inglés. ¿Puedes usarla en una oración corta sobre algo que ves en el salón? Yo te ayudo a revisarla.';
    if (/ciencia|planta|sol|agua|science|plant|sun|water/.test(q)) return '¡Qué buena pregunta de ciencias! ¿Qué crees que necesita primero una planta: luz, agua, aire o tierra? Cuéntame tu idea y algo que hayas observado.';
    if (/mate|suma|resta|número|numero|math|add|subtract|number/.test(q)) return 'Vamos paso a paso. ¿Me puedes mostrar los números del problema y decirme si la cantidad crece, disminuye o se reparte?';
    return '¡Esa es una pregunta muy curiosa! Antes de responder, ¿qué observas o qué crees que podría ser verdad? Podemos investigarlo juntos.';
  }

  async function askAssistant(question) {
    addMessage(question, 'user');
    const thinking = document.createElement('div');
    thinking.className = 'chat-message bot thinking';
    thinking.innerHTML = '<div class="chat-avatar">B</div><p>Estoy pensando contigo…</p>';
    $('#chat-window').appendChild(thinking);
    $('#chat-window').scrollTop = $('#chat-window').scrollHeight;
    try {
      if (config.geminiStudentEndpoint) {
        const response = await fetch(config.geminiStudentEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, selectedBook: state.selectedBook }) });
        if (!response.ok) throw new Error('The assistant endpoint could not respond.');
        const data = await response.json();
        thinking.remove();
        addMessage(data.answer || localGuidance(question), 'bot');
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600));
        thinking.remove();
        addMessage(localGuidance(question), 'bot');
      }
    } catch (error) {
      thinking.remove();
        addMessage('Tengo problemas para conectarme en este momento. Sigamos pensando: ¿qué sabes ya sobre eso?', 'bot');
    }
  }

  function normalizeUpdate(update = {}) {
    return {
      id: update.id || `${update.date || localDateISO()}-${update.created_at || Date.now()}`,
      date: /^\d{4}-\d{2}-\d{2}$/.test(update.date || '') ? update.date : localDateISO(),
      subject: String(update.subject || DEMO_UPDATE.subject).trim(),
      recap: String(update.recap || update.content || DEMO_UPDATE.recap).trim(),
      homework: String(update.homework || DEMO_UPDATE.homework).trim()
    };
  }

  function getLocalUpdates() {
    try {
      const saved = JSON.parse(localStorage.getItem(FAMILY_STORAGE_KEY));
      if (Array.isArray(saved) && saved.length) return saved.map(normalizeUpdate);
      if (saved && typeof saved === 'object') return [normalizeUpdate(saved)];
      const legacy = JSON.parse(localStorage.getItem('bearings-family-update-v2'));
      if (legacy && typeof legacy === 'object') return [normalizeUpdate(legacy)];
    } catch { /* Use the welcoming demonstration update below. */ }
    return [normalizeUpdate(DEMO_UPDATE)];
  }

  function saveLocalUpdates() {
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(state.familyUpdates));
  }

  function getCurrentUpdate() {
    return state.familyUpdates[state.visibleUpdateIndex] || normalizeUpdate(DEMO_UPDATE);
  }

  function formatFamilyDate(date) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    }
    return String(date || DEMO_UPDATE.date).toLocaleUpperCase('es-MX');
  }

  function renderFamily(update = getCurrentUpdate()) {
    $('#family-date').textContent = formatFamilyDate(update.date || DEMO_UPDATE.date);
    $('#hero-homework').textContent = update.homework || DEMO_UPDATE.homework;
    $('#hero-due').textContent = 'PARA MAÑANA';
    $('#family-grid').innerHTML = `
      <article class="family-card subject"><span class="family-card-icon">▣</span><small>EXPLORAMOS</small><h3>${escapeHTML(update.subject || 'Ciencias')}</h3><p>Aprendimos con preguntas, observaciones y trabajo en equipo.</p></article>
      <article class="family-card"><span class="family-card-icon">✎</span><small>LO QUE APRENDIMOS</small><h3>Resumen del día</h3><p>${escapeHTML(update.recap || update.content || DEMO_UPDATE.recap)}</p></article>
      <article class="family-card homework"><span class="family-card-icon">⌂</span><small>PARA CONTINUAR EN CASA</small><h3>Una pequeña<br/>aventura</h3><p>${escapeHTML(update.homework || DEMO_UPDATE.homework)}</p></article>`;
    const older = $('[data-family-direction="older"]');
    const newer = $('[data-family-direction="newer"]');
    if (older && newer) {
      older.disabled = state.visibleUpdateIndex >= state.familyUpdates.length - 1;
      newer.disabled = state.visibleUpdateIndex <= 0;
      $('#family-timeline-label').textContent = state.familyUpdates.length > 1 ? `ACTUALIZACIÓN ${state.visibleUpdateIndex + 1} DE ${state.familyUpdates.length}` : 'ACTUALIZACIÓN DEL SALÓN';
    }
  }

  function escapeHTML(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

  function showSummary(data = DEMO_UPDATE) {
    $('#summary-empty').hidden = true;
    $('#summary-content').hidden = false;
    $('#summary-subject').value = data.subject || DEMO_UPDATE.subject;
    $('#summary-recap').value = data.recap || data.content || DEMO_UPDATE.recap;
    $('#summary-homework').value = data.homework || DEMO_UPDATE.homework;
  }

  function moveThroughFamilyUpdates(direction) {
    const nextIndex = state.visibleUpdateIndex + direction;
    if (nextIndex < 0 || nextIndex >= state.familyUpdates.length) return;
    state.visibleUpdateIndex = nextIndex;
    renderFamily();
  }

  function familyPageURL() {
    if (config.familyPageUrl) return config.familyPageUrl;
    const base = window.location.href.split('#')[0];
    return `${base}#family-view`;
  }

  function setupFamilyQRCode() {
    const pageURL = familyPageURL();
    const image = $('#family-qr-image');
    const link = $('#family-page-link');
    link.href = pageURL;
    image.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=svg&margin=0&data=${encodeURIComponent(pageURL)}`;
    image.onerror = () => { image.alt = 'No fue posible cargar el código QR. Usa el enlace de familias que está junto a este recuadro.'; };
  }

  function updateFullscreenButtons() {
    const activeTarget = document.fullscreenElement || state.fallbackFullscreenTarget;
    const studentActive = activeTarget === $('#question-station');
    const artActive = activeTarget === $('#art-preview-card');
    const studentButton = $('#open-student-fullscreen');
    const artButton = $('#open-art-fullscreen');
    studentButton.setAttribute('aria-pressed', String(studentActive));
    artButton.setAttribute('aria-pressed', String(artActive));
    studentButton.innerHTML = studentActive ? '× <span>Salir de pantalla completa</span>' : '⛶ <span>Pantalla completa</span>';
    artButton.innerHTML = artActive ? '× <span>Salir</span>' : '⛶ <span>Presentar</span>';
  }

  function leaveFallbackFullscreen() {
    if (!state.fallbackFullscreenTarget) return;
    state.fallbackFullscreenTarget.classList.remove('is-fullscreen');
    state.fallbackFullscreenTarget = null;
    document.body.classList.remove('has-presenter');
  }

  async function toggleFullscreen(target) {
    if (document.fullscreenElement === target) {
      await document.exitFullscreen();
      return;
    }
    if (state.fallbackFullscreenTarget === target) {
      leaveFallbackFullscreen();
      updateFullscreenButtons();
      return;
    }
    leaveFallbackFullscreen();
    // A CSS presenter fills the complete app viewport even when a kiosk,
    // embedded browser, or mobile browser refuses the native Fullscreen API.
    // That makes the classroom control reliable without a browser permission.
    target.classList.add('is-fullscreen');
    state.fallbackFullscreenTarget = target;
    document.body.classList.add('has-presenter');
    target.focus({ preventScroll: true });
    updateFullscreenButtons();
  }

  function secondsText(seconds) { return `00:${String(seconds).padStart(2, '0')}`; }

  async function beginRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Este navegador no permite grabar con micrófono.'); showSummary(); return; }
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.recorder = new MediaRecorder(state.stream);
      const chunks = [];
      state.recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
      state.recorder.onstop = async () => {
        state.stream.getTracks().forEach((track) => track.stop());
        state.recording = false;
        $('#recorder').classList.remove('recording');
        $('#record-status').textContent = 'Creando tu borrador…';
        clearInterval(state.timer);
        const audio = new Blob(chunks, { type: state.recorder.mimeType || 'audio/webm' });
        try {
          if (config.geminiAudioEndpoint) {
            const form = new FormData(); form.append('audio', audio, 'classroom-wrap-up.webm');
            const response = await fetch(config.geminiAudioEndpoint, { method: 'POST', body: form });
            if (!response.ok) throw new Error('Servicio de audio no disponible');
            showSummary(await response.json());
          } else {
            await new Promise((resolve) => setTimeout(resolve, 900)); showSummary();
          }
          $('#record-status').textContent = 'Borrador listo para revisar';
          $('#record-time').textContent = 'Puedes editar todos los detalles.';
          toast(config.geminiAudioEndpoint ? 'Tu borrador creado con IA está listo.' : 'Borrador de demostración listo; conecta Gemini cuando quieras.');
        } catch (error) {
          $('#record-status').textContent = 'No se pudo crear el borrador';
          $('#record-time').textContent = 'Inténtalo una vez más.';
          toast('El servicio de audio no está disponible.');
        }
      };
      state.recorder.start();
      state.recording = true; state.seconds = 0;
      $('#recorder').classList.add('recording');
      $('#record-status').textContent = 'Grabando tu resumen…';
      $('#record-time').textContent = secondsText(0);
      state.timer = setInterval(() => { state.seconds += 1; $('#record-time').textContent = secondsText(state.seconds); if (state.seconds >= 60) stopRecording(); }, 1000);
    } catch (error) { toast('No se autorizó el micrófono. Aun así puedes ver el resumen de demostración.'); showSummary(); }
  }

  function stopRecording() { if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop(); }

  async function makePoster() {
    const prompt = $('#art-prompt').value.trim();
    if (!prompt) { toast('Escribe primero una idea visual.'); return; }
    $('#art-status').textContent = 'Creando tu vista previa…'; $('#art-status-dot').style.background = '#e5a13a';
    try {
      if (config.imagenEndpoint) {
        const style = $('.style-option.active').dataset.style;
        const response = await fetch(config.imagenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, style }) });
        if (!response.ok) throw new Error('Conexión de Imagen no disponible');
        const data = await response.json();
        const src = data.imageUrl || (data.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : '');
        if (!src) throw new Error('La conexión no devolvió una imagen.');
        const image = new Image();
        image.className = 'generated-image'; image.alt = 'Ilustración educativa generada'; image.src = src;
        $('#art-preview').replaceChildren(image);
        state.artDataUrl = src;
        $('#art-status').textContent = 'Ilustración generada'; $('#art-status-dot').style.background = '#62ad68'; $('#download-art').disabled = false;
        toast('Tu ilustración de Imagen está lista.');
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700));
        $('#art-preview').innerHTML = `<div class="generated-poster"><div class="poster-sun"></div><div class="poster-title">Cómo crece una planta de frijol</div><div class="poster-plant"><i class="plant-leaf"></i></div><div class="poster-hill hill-one"></div><div class="poster-hill hill-two"></div><span class="poster-label label-sun">luz solar</span><span class="poster-label label-leaf">hojas</span><span class="poster-label label-root">raíces</span></div>`;
        $('#art-status').textContent = 'Ilustración de demostración creada'; $('#art-status-dot').style.background = '#62ad68'; $('#download-art').disabled = false;
        toast('Vista previa creada; conecta Imagen para generar ilustraciones.');
      }
    } catch (error) {
      $('#art-status').textContent = 'No se pudo generar la ilustración'; $('#art-status-dot').style.background = '#e66d58';
      toast('El servicio de ilustración no respondió. Inténtalo de nuevo.');
    }
  }

  function speechInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast('Este navegador no permite preguntas por voz. Escribe tu pregunta.'); return; }
    const recognizer = new SpeechRecognition(); recognizer.lang = 'es-MX'; recognizer.interimResults = false;
    const button = $('#student-mic'); button.classList.add('listening');
    recognizer.onresult = (event) => { $('#student-question').value = event.results[0][0].transcript; };
    recognizer.onerror = () => toast('No pude escuchar eso. Inténtalo de nuevo o escribe tu pregunta.');
    recognizer.onend = () => button.classList.remove('listening'); recognizer.start();
  }

  function setupEvents() {
    $$('[data-route]').forEach((button) => button.addEventListener('click', () => button.dataset.route === 'teacher' ? openTeacher() : showView(button.dataset.route)));
    $('#footer-settings').addEventListener('click', () => { sessionStorage.setItem('bearings-teacher', 'yes'); showView('teacher'); setTeacherPanel('settings'); });
    $('#gate-form').addEventListener('submit', (event) => { event.preventDefault(); if ($('#gate-code').value === '1234') { sessionStorage.setItem('bearings-teacher', 'yes'); $('#teacher-gate').hidden = true; $('#gate-code').value = ''; $('#gate-error').textContent = ''; showView('teacher'); } else $('#gate-error').textContent = 'Ese código no es correcto. Prueba 1234 en esta demostración.'; });
    $$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => $("#" + button.dataset.closeModal).hidden = true));
    $('#teacher-gate').addEventListener('click', (event) => { if (event.target === $('#teacher-gate')) $('#teacher-gate').hidden = true; });
    $('#ask-now').addEventListener('click', () => $('#question-station').scrollIntoView({ behavior: 'smooth', block: 'center' }));
    $('#welcome-audio').addEventListener('click', () => { if ('speechSynthesis' in window) { const welcome = new SpeechSynthesisUtterance('¡Hola, exploradores! Bienvenidos a Bearings AI. ¿Qué van a descubrir hoy?'); welcome.lang = 'es-MX'; speechSynthesis.speak(welcome); } else toast('¡Hola, exploradores! Descubramos algo nuevo.'); });
    $('#question-form').addEventListener('submit', (event) => { event.preventDefault(); const input = $('#student-question'); const question = input.value.trim(); if (!question) return; input.value = ''; askAssistant(question); });
    $('#student-mic').addEventListener('click', speechInput);
    $$('.quick-questions button').forEach((button) => button.addEventListener('click', () => { $('#student-question').value = button.dataset.question; $('#question-form').requestSubmit(); }));
    $$('[data-discuss-book]').forEach((button) => button.addEventListener('click', () => { state.selectedBook = button.dataset.discussBook; $$('.book-card').forEach((item) => item.classList.toggle('selected', item.dataset.book === state.selectedBook)); $('#student-question').value = `Tengo una pregunta sobre ${state.selectedBook}.`; $('#question-station').scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
    $('#add-book').addEventListener('click', () => toast('La maestra o el maestro podrá agregar el libro de la semana cuando se conecte la biblioteca.'));
    $('#book-help').addEventListener('click', () => toast('Elige el libro que lee tu equipo y pregunta sobre un personaje, una palabra o una idea importante.'));
    $('#record-button').addEventListener('click', () => state.recording ? stopRecording() : beginRecording());
    $('#publish-update').addEventListener('click', async () => {
      const draft = { subject: $('#summary-subject').value.trim(), recap: $('#summary-recap').value.trim(), homework: $('#summary-homework').value.trim() };
      if (!draft.subject || !draft.recap || !draft.homework) { toast('Completa materia, resumen y tarea antes de publicar.'); return; }
      const update = normalizeUpdate({ date: localDateISO(), ...draft });
      state.familyUpdates = [update, ...state.familyUpdates.filter((item) => item.date !== update.date)];
      state.visibleUpdateIndex = 0;
      saveLocalUpdates();
      renderFamily();
      if (config.publishUpdateEndpoint) {
        try { await fetch(config.publishUpdateEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) }); } catch { toast('La actualización quedó guardada aquí; no se pudo sincronizar el servicio.'); return; }
      }
      toast('¡Listo! La tarea y el resumen ya aparecen en Familias.');
    });
    $('#edit-summary').addEventListener('click', () => { $('#summary-recap').focus(); toast('Puedes editar el borrador antes de publicarlo.'); });
    $$('.teacher-tab').forEach((button) => button.addEventListener('click', () => setTeacherPanel(button.dataset.teacherPanel)));
    $$('.style-option').forEach((button) => button.addEventListener('click', () => $$('.style-option').forEach((item) => item.classList.toggle('active', item === button))));
    $('#generate-art').addEventListener('click', makePoster);
    $('#download-art').addEventListener('click', () => {
      if (!state.artDataUrl) { toast('La vista previa está lista para mostrar en clase. Conecta Imagen para descargar ilustraciones.'); return; }
      const link = document.createElement('a'); link.href = state.artDataUrl; link.download = 'bearings-ai-illustration.png'; link.target = '_blank'; link.rel = 'noopener'; link.click();
    });
    $('[data-family-direction="older"]').addEventListener('click', () => moveThroughFamilyUpdates(1));
    $('[data-family-direction="newer"]').addEventListener('click', () => moveThroughFamilyUpdates(-1));
    $('#open-student-fullscreen').addEventListener('click', () => toggleFullscreen($('#question-station')));
    $('#open-art-fullscreen').addEventListener('click', () => toggleFullscreen($('#art-preview-card')));
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) leaveFallbackFullscreen(); updateFullscreenButtons(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.fallbackFullscreenTarget) { leaveFallbackFullscreen(); updateFullscreenButtons(); } });
  }

  function setTeacherPanel(name) {
    $$('.teacher-tab').forEach((button) => button.classList.toggle('active', button.dataset.teacherPanel === name));
    $$('[data-teacher-panel-content]').forEach((panel) => panel.classList.toggle('active', panel.dataset.teacherPanelContent === name));
  }

  async function loadRemoteUpdates() {
    if (!config.familyUpdatesEndpoint) return;
    try {
      const response = await fetch(config.familyUpdatesEndpoint);
      if (!response.ok) return;
      const remoteUpdates = await response.json();
      const updates = Array.isArray(remoteUpdates) ? remoteUpdates : [remoteUpdates];
      if (updates[0]) { state.familyUpdates = updates.map(normalizeUpdate); state.visibleUpdateIndex = 0; renderFamily(); showSummary(getCurrentUpdate()); }
    } catch { /* The local preview stays available without a network connection. */ }
  }

  function start() { state.familyUpdates = getLocalUpdates(); renderFamily(); showSummary(getCurrentUpdate()); setupFamilyQRCode(); setupEvents(); updateFullscreenButtons(); loadRemoteUpdates(); setTimeout(() => { $('#splash').classList.add('is-done'); $('#app').hidden = false; }, 1350); }
  start();
})();
