// ==UserScript==
// @name         Projecto Aurora (Nome Provisório)
// @namespace    https://github.com/rm0ntoya/Wplace
// @version      0.1.2-debug
// @description  Melhora a experiência no wplace.live com um overlay de templates e um novo design.
// @author       Ruan Pablo
// @match        *://*.wplace.live/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wplace.live
// @grant        GM_addStyle
// @grant        GM.setValue
// @grant        GM.getValue
// @updateURL    https://raw.githubusercontent.com/rm0ntoya/Wplace/main/nomedoscript.meta.js
// @downloadURL  https://raw.githubusercontent.com/rm0ntoya/Wplace/main/novo-script.user.js
// @run-at       document-start
// ==/UserScript==

(async function() {
    'use strict';

    //================================================================================
    // CSS EMBUTIDO DIRETAMENTE PARA DEPURAÇÃO
    //================================================================================
    const embeddedCSS = `
        :root {
          --ns-bg-primary: #1e1e24;
          --ns-bg-secondary: #2a2a33;
          --ns-accent-primary: #8a42d9;
          --ns-accent-secondary: #a368e0;
          --ns-text-primary: #f0f0f5;
          --ns-text-secondary: #a0a0b0;
          --ns-border-color: #4a4a5a;
          --ns-shadow-color: rgba(0, 0, 0, 0.4);
        }
        #ns-panel {
          position: fixed;
          top: 50px;
          left: 50px;
          background-color: var(--ns-bg-primary);
          color: var(--ns-text-primary);
          border: 1px solid var(--ns-border-color);
          border-radius: 12px;
          padding: 16px;
          font-family: 'Inter', 'Roboto', sans-serif;
          z-index: 10000;
          box-shadow: 0 8px 24px var(--ns-shadow-color);
          min-width: 280px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ns-drag-handle {
          width: 100%;
          height: 20px;
          cursor: grab;
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="4"><rect width="20" height="1" y="0" fill="%234a4a5a"/><rect width="20" height="1" y="3" fill="%234a4a5a"/></svg>');
          background-repeat: no-repeat;
          background-position: center;
          margin-bottom: 8px;
        }
        #ns-panel h1 {
          font-size: 1.2em;
          font-weight: 600;
          margin: 0;
          text-align: center;
          color: var(--ns-accent-primary);
        }
        #ns-panel p {
          margin: 0;
          font-size: 0.9em;
          color: var(--ns-text-secondary);
        }
        .ns-button {
          background-color: var(--ns-accent-primary);
          color: var(--ns-text-primary);
          border: none;
          border-radius: 8px;
          padding: 10px 15px;
          font-size: 0.9em;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.1s ease;
          text-align: center;
        }
        .ns-button:hover {
          background-color: var(--ns-accent-secondary);
        }
        .ns-button:active {
          transform: scale(0.98);
        }
        .ns-button.ns-button-upload {
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ns-icon-button {
          background: none;
          border: 1px solid var(--ns-border-color);
          width: 36px;
          height: 36px;
          padding: 6px;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          flex-shrink: 0;
        }
        .ns-icon-button:hover {
          background-color: var(--ns-bg-secondary);
        }
        .ns-icon-button svg {
          width: 100%;
          height: 100%;
          fill: var(--ns-text-secondary);
        }
        .ns-coord-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .ns-coord-input {
          background-color: var(--ns-bg-secondary);
          border: 1px solid var(--ns-border-color);
          color: var(--ns-text-primary);
          border-radius: 8px;
          padding: 8px;
          width: 100%;
          font-family: 'Roboto Mono', monospace;
          font-size: 0.9em;
          text-align: center;
          -moz-appearance: textfield;
        }
        .ns-coord-input::-webkit-outer-spin-button,
        .ns-coord-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .ns-coord-input::placeholder {
          color: var(--ns-text-secondary);
          opacity: 0.7;
        }
        #ns-output-status {
            background-color: var(--ns-bg-secondary);
            border-radius: 8px;
            padding: 10px;
            font-size: 0.85em;
            min-height: 50px;
            color: var(--ns-text-secondary);
            border: 1px dashed var(--ns-border-color);
        }
        #ns-user-info {
            padding: 10px;
            background-color: var(--ns-bg-secondary);
            border-radius: 8px;
        }
    `;

    //================================================================================
    // MÓDULO: UTILS / formatters.js
    //================================================================================
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function serverTPtoDisplayTP(tile, pixel) {
        const tileX = parseInt(tile[0], 10) || 0;
        const tileY = parseInt(tile[1], 10) || 0;
        const pixelX = parseInt(pixel[0], 10) || 0;
        const pixelY = parseInt(pixel[1], 10) || 0;
        return [((tileX % 4) * 1000) + pixelX, ((tileY % 4) * 1000) + pixelY];
    }

    function uint8ToBase64(uint8Array) {
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
        }
        return window.btoa(binaryString);
    }

    function base64ToUint8(base64String) {
        const pureBase64 = base64String.split(',').pop();
        const binaryString = window.atob(pureBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    //================================================================================
    // MÓDULO: UTILS / dom.js
    //================================================================================
    function injectStyle(cssText) {
        const styleElement = document.createElement('style');
        styleElement.id = 'ns-styles';
        styleElement.textContent = cssText;
        (document.head || document.documentElement).appendChild(styleElement);
    }

    function injectScript(callback, attributes = {}) {
        const script = document.createElement('script');
        for (const [key, value] of Object.entries(attributes)) {
            script.setAttribute(key, value);
        }
        script.textContent = `(${callback})();`;
        (document.documentElement || document.body).appendChild(script);
        script.remove();
    }

    function loadGoogleFont(fontFamily) {
        const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600&display=swap`;
        if (document.querySelector(`link[href="${fontUrl}"]`)) {
            return;
        }
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = fontUrl;
        link.onload = () => { link.rel = 'stylesheet'; };
        document.head.appendChild(link);
    }

    //================================================================================
    // MÓDULO: UTILS / network.js
    //================================================================================
    function spyOnFetch() {
        const scriptElement = document.currentScript;
        const SCRIPT_ID = scriptElement?.getAttribute('data-script-id') || 'novo-script';
        const RESPONSE_ID = `${SCRIPT_ID}-response`;
        const originalFetch = window.fetch;
        const blobQueue = new Map();

        window.addEventListener('message', (event) => {
            const { source, blobID, blobData } = event.data;
            if (source !== RESPONSE_ID || !blobID || !blobData) return;
            const resolveCallback = blobQueue.get(blobID);
            if (typeof resolveCallback === 'function') {
                resolveCallback(blobData);
                blobQueue.delete(blobID);
            }
        });

        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            const url = (args[0] instanceof Request) ? args[0].url : args[0];
            const clonedResponse = response.clone();
            const contentType = clonedResponse.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                clonedResponse.json().then(jsonData => {
                    window.postMessage({ source: SCRIPT_ID, endpoint: url, jsonData: jsonData }, '*');
                }).catch(err => console.error(`[${SCRIPT_ID}] Falha ao analisar JSON:`, err));
            } else if (contentType.includes('image/') && !url.includes('openfreemap') && !url.includes('maps')) {
                return new Promise(async (resolve) => {
                    const originalBlob = await clonedResponse.blob();
                    const blobID = crypto.randomUUID();
                    blobQueue.set(blobID, (processedBlob) => {
                        resolve(new Response(processedBlob, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                        }));
                    });
                    window.postMessage({ source: SCRIPT_ID, endpoint: url, blobID: blobID, blobData: originalBlob, blink: Date.now() }, '*');
                });
            }
            return response;
        };
    }

    //================================================================================
    // MÓDULO: COMPONENTS / outros-componentes.js
    //================================================================================
    const Components = {
        createCoordinateInputs: function() {
            const container = document.createElement('div');
            container.className = 'ns-coord-container';
            const pinIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 6"><circle cx="2" cy="2" r="2"></circle><path d="M2 6 L3.7 3 L0.3 3 Z"></path><circle cx="2" cy="2" r="0.7" fill="white"></circle></svg>`;
            const getCoordsButton = document.createElement('button');
            getCoordsButton.id = 'ns-button-get-coords';
            getCoordsButton.className = 'ns-icon-button';
            getCoordsButton.title = 'Usar coordenadas do último pixel clicado';
            getCoordsButton.innerHTML = pinIconSVG;
            const inputTx = document.createElement('input');
            inputTx.type = 'number';
            inputTx.id = 'ns-input-tx';
            inputTx.placeholder = 'Tl X';
            const inputTy = document.createElement('input');
            inputTy.type = 'number';
            inputTy.id = 'ns-input-ty';
            inputTy.placeholder = 'Tl Y';
            const inputPx = document.createElement('input');
            inputPx.type = 'number';
            inputPx.id = 'ns-input-px';
            inputPx.placeholder = 'Px X';
            const inputPy = document.createElement('input');
            inputPy.type = 'number';
            inputPy.id = 'ns-input-py';
            inputPy.placeholder = 'Px Y';
            container.append(getCoordsButton, inputTx, inputTy, inputPx, inputPy);
            [inputTx, inputTy, inputPx, inputPy].forEach(input => { input.className = 'ns-coord-input'; });
            return container;
        },
        createFileInput: function(id, labelText) {
            const container = document.createElement('div');
            container.className = 'ns-file-input-container';
            const input = document.createElement('input');
            input.type = 'file';
            input.id = id;
            input.style.display = 'none';
            const button = document.createElement('button');
            button.className = 'ns-button ns-button-upload';
            button.textContent = labelText;
            button.addEventListener('click', () => { input.click(); });
            input.addEventListener('change', () => {
                if (input.files && input.files.length > 0) {
                    button.textContent = input.files[0].name;
                    button.title = input.files[0].name;
                } else {
                    button.textContent = labelText;
                    button.title = '';
                }
            });
            container.append(input, button);
            return { container, input, button };
        },
        createButton: function(id, text, classes = []) {
            const button = document.createElement('button');
            button.id = id;
            button.textContent = text;
            button.className = 'ns-button';
            if (classes.length > 0) {
                button.classList.add(...classes);
            }
            return button;
        }
    };

    //================================================================================
    // MÓDULO: COMPONENTS / Overlay.js
    //================================================================================
    class Overlay {
        constructor(name, version) {
            this.name = name;
            this.version = version;
            this.apiManager = null;
            this.outputStatusId = 'ns-output-status';
            this.rootElement = null;
            this.currentParent = null;
            this.parentStack = [];
        }
        setApiManager(apiManager) { this.apiManager = apiManager; }
        #createElement(tag, properties = {}) {
            const element = document.createElement(tag);
            for (const [property, value] of Object.entries(properties)) {
                element[property] = value;
            }
            if (!this.rootElement) {
                this.rootElement = element;
                this.currentParent = element;
            } else {
                this.currentParent?.appendChild(element);
            }
            return element;
        }
        begin(tag, properties = {}) {
            const element = this.#createElement(tag, properties);
            this.parentStack.push(this.currentParent);
            this.currentParent = element;
            return this;
        }
        end() {
            if (this.parentStack.length > 0) {
                this.currentParent = this.parentStack.pop();
            }
            return this;
        }
        add(tag, properties = {}, callback) {
            const element = tag ? this.#createElement(tag, properties) : this.currentParent;
            if (callback && typeof callback === 'function') {
                callback(element);
            }
            return this;
        }
        render(parent = document.body) {
            if (this.rootElement) {
                parent.appendChild(this.rootElement);
            }
        }
        updateText(id, content) {
            const element = document.getElementById(id.replace(/^#/, ''));
            if (!element) return;
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                element.value = content;
            } else {
                element.textContent = content;
            }
        }
        handleDrag(overlaySelector, handleSelector) {
            const overlay = document.querySelector(overlaySelector);
            const handle = document.querySelector(handleSelector);
            if (!overlay || !handle) return;
            let isDragging = false, offsetX, offsetY, animationFrame;
            const startDrag = (clientX, clientY) => {
                isDragging = true;
                const rect = overlay.getBoundingClientRect();
                offsetX = clientX - rect.left;
                offsetY = clientY - rect.top;
                handle.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
            };
            const endDrag = () => {
                isDragging = false;
                handle.style.cursor = 'grab';
                document.body.style.userSelect = '';
                cancelAnimationFrame(animationFrame);
            };
            const drag = (clientX, clientY) => {
                if (!isDragging) return;
                const x = clientX - offsetX;
                const y = clientY - offsetY;
                cancelAnimationFrame(animationFrame);
                animationFrame = requestAnimationFrame(() => {
                    overlay.style.left = `${x}px`;
                    overlay.style.top = `${y}px`;
                });
            };
            handle.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('mousemove', (e) => drag(e.clientX, e.clientY));
            handle.addEventListener('touchstart', (e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
            document.addEventListener('touchend', endDrag);
            document.addEventListener('touchmove', (e) => drag(e.touches[0].clientX, e.touches[0].clientY), { passive: false });
        }
        handleDisplayStatus(text) {
            console.info(`[${this.name}] ${text}`);
            this.updateText(this.outputStatusId, `Status: ${text}`);
        }
        handleDisplayError(text) {
            console.error(`[${this.name}] ${text}`);
            this.updateText(this.outputStatusId, `Erro: ${text}`);
        }
    }

    //================================================================================
    // MÓDULO: CORE / Template.js
    //================================================================================
    class Template {
        constructor({ displayName = 'Meu Template', file = null, coords = null, tileSize = 1000, pixelGridSize = 3 } = {}) {
            this.displayName = displayName;
            this.file = file;
            this.coords = coords;
            this.tileSize = tileSize;
            this.pixelGridSize = pixelGridSize;
            this.pixelCount = 0;
            this.chunks = {};
            this.chunksBase64 = {};
        }
        async process() {
            if (!this.file || !this.coords) return false;
            const bitmap = await createImageBitmap(this.file);
            const { width: imageWidth, height: imageHeight } = bitmap;
            const analysisCanvas = new OffscreenCanvas(imageWidth, imageHeight);
            const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
            analysisCtx.drawImage(bitmap, 0, 0);
            const imageData = analysisCtx.getImageData(0, 0, imageWidth, imageHeight);
            let opaquePixelCount = 0;
            for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] > 0) opaquePixelCount++;
            }
            this.pixelCount = opaquePixelCount;

            const chunkCanvases = {};

            for (let y = 0; y < imageHeight; y++) {
                for (let x = 0; x < imageWidth; x++) {
                    const pixelAlpha = imageData.data[(y * imageWidth + x) * 4 + 3];
                    if (pixelAlpha === 0) continue;

                    const globalPixelX = this.coords[2] + x;
                    const globalPixelY = this.coords[3] + y;
                    const tileX = this.coords[0] + Math.floor(globalPixelX / this.tileSize);
                    const tileY = this.coords[1] + Math.floor(globalPixelY / this.tileSize);
                    const localPixelX = globalPixelX % this.tileSize;
                    const localPixelY = globalPixelY % this.tileSize;
                    const tileKey = `${tileX},${tileY}`;

                    if (!chunkCanvases[tileKey]) {
                        const newChunkCanvas = new OffscreenCanvas(this.tileSize * this.pixelGridSize, this.tileSize * this.pixelGridSize);
                        const newChunkCtx = newChunkCanvas.getContext('2d', { willReadFrequently: true });
                        newChunkCtx.imageSmoothingEnabled = false;
                        chunkCanvases[tileKey] = { canvas: newChunkCanvas, context: newChunkCtx };
                    }

                    const pixelData = analysisCtx.getImageData(x, y, 1, 1);
                    chunkCanvases[tileKey].context.putImageData(pixelData, localPixelX * this.pixelGridSize + Math.floor(this.pixelGridSize / 2), localPixelY * this.pixelGridSize + Math.floor(this.pixelGridSize / 2));
                }
            }

            for (const key in chunkCanvases) {
                const { canvas } = chunkCanvases[key];
                this.chunks[key] = {
                    bitmap: await canvas.transferToImageBitmap(),
                    x: 0, // Os chunks agora são desenhados na posição 0,0 do tile combinado
                    y: 0
                };
                const blob = await canvas.convertToBlob({ type: 'image/png' });
                const buffer = await blob.arrayBuffer();
                this.chunksBase64[key] = uint8ToBase64(new Uint8Array(buffer));
            }
            return true;
        }
    }

    //================================================================================
    // MÓDULO: CORE / TemplateManager.js
    //================================================================================
    class TemplateManager {
        constructor(overlay) {
            this.overlay = overlay;
            this.templates = [];
            this.areTemplatesEnabled = true;
            this.userID = null;
            this.storageKey = 'ns_templates';
        }
        setUserID(id) { this.userID = id; }
        toggleTemplates(isEnabled) {
            this.areTemplatesEnabled = isEnabled;
            this.overlay.handleDisplayStatus(`Templates ${isEnabled ? 'ativados' : 'desativados'}.`);
        }
        async createTemplate(file, coords) {
            if (!file || !coords || coords.length < 4) {
                this.overlay.handleDisplayError("Ficheiro ou coordenadas em falta para criar o template.");
                return;
            }
            this.overlay.handleDisplayStatus("A processar novo template...");
            const template = new Template({ displayName: file.name, file: file, coords: coords });
            const success = await template.process();
            if (success) {
                this.templates.push(template);
                await this.saveTemplates();
                this.overlay.handleDisplayStatus(`Template "${template.displayName}" criado com ${template.pixelCount.toLocaleString()} píxeis.`);
            } else {
                this.overlay.handleDisplayError("Falha ao processar o template.");
            }
        }
        async drawTemplateOnTile(tileBlob, tileCoords) {
            if (!this.areTemplatesEnabled || this.templates.length === 0) return tileBlob;
            const tileKey = `${tileCoords[0]},${tileCoords[1]}`;
            const chunksToDraw = this.templates.map(template => template.chunks[tileKey]).filter(chunk => chunk);
            if (chunksToDraw.length === 0) return tileBlob;

            const originalTileBitmap = await createImageBitmap(tileBlob);
            const { width, height } = originalTileBitmap;
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(originalTileBitmap, 0, 0);

            for (const chunk of chunksToDraw) {
                ctx.drawImage(chunk.bitmap, chunk.x, chunk.y);
            }
            return await canvas.convertToBlob({ type: 'image/png' });
        }
        async saveTemplates() {
            const templatesToSave = this.templates.map(t => ({
                displayName: t.displayName,
                coords: t.coords,
                chunksBase64: t.chunksBase64,
                pixelCount: t.pixelCount,
            }));
            await GM.setValue(this.storageKey, JSON.stringify(templatesToSave));
        }
        async loadTemplates() {
            const savedData = await GM.getValue(this.storageKey, '[]');
            const parsedTemplates = JSON.parse(savedData);
            if (!Array.isArray(parsedTemplates)) return;
            this.templates = [];
            for (const saved of parsedTemplates) {
                const template = new Template({ displayName: saved.displayName, coords: saved.coords, pixelCount: saved.pixelCount });
                for (const key in saved.chunksBase64) {
                    const base64 = saved.chunksBase64[key];
                    const uint8 = base64ToUint8(base64);
                    const blob = new Blob([uint8], { type: 'image/png' });
                    const bitmap = await createImageBitmap(blob);
                    template.chunks[key] = { bitmap: bitmap, x: 0, y: 0 };
                }
                this.templates.push(template);
            }
            if (this.templates.length > 0) {
                this.overlay.handleDisplayStatus(`${this.templates.length} template(s) carregado(s).`);
            }
        }
    }

    //================================================================================
    // MÓDULO: CORE / ApiManager.js
    //================================================================================
    class ApiManager {
        constructor(templateManager) {
            this.templateManager = templateManager;
            this.lastCoords = null;
        }
        listen(overlay) {
            window.addEventListener('message', async (event) => {
                if (!event.data || event.data.source !== 'novo-script') return;
                const { endpoint, jsonData, blobData, blobID } = event.data;
                if (!endpoint) return;
                const endpointName = endpoint.split('?')[0].split('/').filter(s => s && isNaN(Number(s)) && !s.includes('.')).pop();
                switch (endpointName) {
                    case 'me':
                        if (jsonData?.status && jsonData.status.toString()[0] !== '2') {
                            overlay.handleDisplayError('Não foi possível obter os dados do utilizador. Não está autenticado?');
                            return;
                        }
                        this.updateUserInfo(overlay, jsonData);
                        break;
                    case 'pixel':
                        this.handlePixelResponse(overlay, endpoint);
                        break;
                    case 'tiles':
                        if (blobData && blobID) {
                            const tileCoords = this.extractTileCoords(endpoint);
                            const processedBlob = await this.templateManager.drawTemplateOnTile(blobData, tileCoords);
                            window.postMessage({ source: 'novo-script-response', blobID: blobID, blobData: processedBlob });
                        }
                        break;
                }
            });
        }
        updateUserInfo(overlay, userData) {
            const nextLevelPixels = Math.ceil(Math.pow(Math.floor(userData['level']) * Math.pow(30, 0.65), (1 / 0.65)) - userData['pixelsPainted']);
            overlay.updateText('ns-user-name', `Utilizador: ${escapeHTML(userData['name'])}`);
            overlay.updateText('ns-user-droplets', `Gotas: ${new Intl.NumberFormat().format(userData['droplets'])}`);
            overlay.updateText('ns-user-nextlevel', `Próximo nível em ${new Intl.NumberFormat().format(nextLevelPixels)} pixels`);
            if (this.templateManager) {
                this.templateManager.setUserID(userData['id']);
            }
        }
        handlePixelResponse(overlay, endpoint) {
            const tileCoords = endpoint.split('?')[0].split('/').filter(s => s && !isNaN(Number(s)));
            const params = new URLSearchParams(endpoint.split('?')[1]);
            const pixelCoords = [params.get('x'), params.get('y')];
            if (tileCoords.length < 2 || pixelCoords.some(c => c === null)) {
                overlay.handleDisplayError('Coordenadas inválidas recebidas. Tente clicar na tela primeiro.');
                return;
            }
            this.lastCoords = [...tileCoords, ...pixelCoords].map(Number);
            overlay.handleDisplayStatus(`Coordenadas capturadas: [${this.lastCoords.join(', ')}]`);
            overlay.updateText('ns-input-tx', this.lastCoords[0]);
            overlay.updateText('ns-input-ty', this.lastCoords[1]);
            overlay.updateText('ns-input-px', this.lastCoords[2]);
            overlay.updateText('ns-input-py', this.lastCoords[3]);
        }
        extractTileCoords(endpoint) {
            const parts = endpoint.split('/');
            const y = parseInt(parts[parts.length - 1].replace('.png', ''), 10);
            const x = parseInt(parts[parts.length - 2], 10);
            return [x, y];
        }
    }

    //================================================================================
    // --- PONTO DE ENTRADA PRINCIPAL ---
    //================================================================================
    const SCRIPT_NAME = GM_info.script.name;
    const SCRIPT_VERSION = GM_info.script.version;
    const SCRIPT_ID = 'novo-script';

    console.log(`[${SCRIPT_NAME}] v${SCRIPT_VERSION} a iniciar...`);

    loadGoogleFont('Inter');
    loadGoogleFont('Roboto Mono');

    // Injeta o CSS diretamente em vez de usar @resource
    injectStyle(embeddedCSS);

    const ui = new Overlay(SCRIPT_NAME, SCRIPT_VERSION);
    const templateManager = new TemplateManager(ui);
    const apiManager = new ApiManager(templateManager);
    ui.setApiManager(apiManager);

    const dragHandle = document.createElement('div');
    dragHandle.className = 'ns-drag-handle';
    const userInfo = document.createElement('div');
    userInfo.id = 'ns-user-info';
    userInfo.innerHTML = `<p id="ns-user-name">Utilizador: A carregar...</p><p id="ns-user-droplets">Gotas: A carregar...</p><p id="ns-user-nextlevel">Próximo nível: A carregar...</p>`;
    const coordInputs = Components.createCoordinateInputs();
    const fileUploader = Components.createFileInput('ns-template-file', 'Carregar Template');
    const createButton = Components.createButton('ns-btn-create', 'Criar Template');
    const statusArea = document.createElement('div');
    statusArea.id = ui.outputStatusId;
    statusArea.textContent = `Status: Inativo. v${SCRIPT_VERSION}`;

    ui.begin('div', { id: 'ns-panel' })
        .add(null, {}, (el) => el.append(dragHandle))
        .add('h1', { textContent: SCRIPT_NAME })
        .add(null, {}, (el) => el.append(userInfo))
        .add(null, {}, (el) => el.append(coordInputs))
        .add(null, {}, (el) => el.append(fileUploader.container))
        .add(null, {}, (el) => el.append(createButton))
        .add(null, {}, (el) => el.append(statusArea))
    .end();
    
    ui.render();

    ui.handleDrag('#ns-panel', '.ns-drag-handle');

    document.getElementById('ns-button-get-coords').addEventListener('click', () => {
        if (apiManager.lastCoords) {
            ui.updateText('ns-input-tx', apiManager.lastCoords[0]);
            ui.updateText('ns-input-ty', apiManager.lastCoords[1]);
            ui.updateText('ns-input-px', apiManager.lastCoords[2]);
            ui.updateText('ns-input-py', apiManager.lastCoords[3]);
        } else {
            ui.handleDisplayError("Nenhuma coordenada capturada. Clique no mapa primeiro.");
        }
    });

    createButton.addEventListener('click', () => {
        const file = fileUploader.input.files[0];
        const coords = [
            parseInt(document.getElementById('ns-input-tx').value, 10),
            parseInt(document.getElementById('ns-input-ty').value, 10),
            parseInt(document.getElementById('ns-input-px').value, 10),
            parseInt(document.getElementById('ns-input-py').value, 10)
        ];
        if (coords.some(isNaN)) {
            ui.handleDisplayError("Todas as coordenadas devem ser preenchidas.");
            return;
        }
        if (file) {
            templateManager.createTemplate(file, coords);
        } else {
            ui.handleDisplayError("Por favor, selecione um ficheiro de imagem.");
        }
    });

    await templateManager.loadTemplates();
    apiManager.listen(ui);
    injectScript(spyOnFetch, { 'data-script-id': SCRIPT_ID });

    console.log(`[${SCRIPT_NAME}] Carregado e a funcionar!`);

})();
