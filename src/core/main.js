/**
 * O ficheiro principal. Tudo no userscript é executado a partir daqui.
 */

// Importações dos Módulos Principais
import Overlay from '../components/Overlay.js';
import * as Components from '../components/outros-componentes.js';
import ApiManager from './apiManager.js';
import TemplateManager from './templateManager.js';

// Importações das Funções de Utilidade
import { injectStyle, injectScript, loadGoogleFont } from '../utils/dom.js';
import { spyOnFetch } from '../utils/network.js';

// Função principal auto-executável para encapsular o nosso script
(async function() {
    'use strict';

    // --- 1. CONFIGURAÇÃO INICIAL ---
    const SCRIPT_NAME = GM_info.script.name;
    const SCRIPT_VERSION = GM_info.script.version;
    const SCRIPT_ID = 'novo-script';

    console.log(`[${SCRIPT_NAME}] v${SCRIPT_VERSION} a iniciar...`);

    // Carrega as fontes e o CSS
    loadGoogleFont('Inter');
    loadGoogleFont('Roboto Mono');
    
    const css = GM_getResourceText("CSS_NOVO_SCRIPT");
    if (css) {
        injectStyle(css);
    } else {
        console.error("Não foi possível carregar o CSS. Verifique o caminho no @resource do seu meta.js");
    }

    // --- 2. INICIALIZAÇÃO DOS MÓDULOS ---
    const ui = new Overlay(SCRIPT_NAME, SCRIPT_VERSION);
    const templateManager = new TemplateManager(ui);
    const apiManager = new ApiManager(templateManager);
    ui.setApiManager(apiManager);

    // --- LÓGICA DO REMOVEDOR DE CHAVE ---
    const keyRemoverState = {
        isRunning: false,
        intervalId: null,
        statusTimeoutId: null
    };

    function showTemporaryStatus(message, duration = 3000) {
        const originalStatus = document.getElementById(ui.outputStatusId).textContent;
        ui.handleDisplayStatus(message);

        clearTimeout(keyRemoverState.statusTimeoutId);
        keyRemoverState.statusTimeoutId = setTimeout(() => {
            ui.updateText(ui.outputStatusId, originalStatus);
        }, duration);
    }

    function checkAndRemoveKey() {
        const key = 'lp';
        const value = localStorage.getItem(key);

        if (value) {
            try {
                const decodedValue = JSON.parse(atob(value));
                if (decodedValue && decodedValue.userId) {
                    localStorage.removeItem(key);
                    console.log(`Chave '${key}' removida para o userId: ${decodedValue.userId}`);
                    showTemporaryStatus(`UserId ${decodedValue.userId} foi deletado.`);
                }
            } catch (error) {
                console.error("Erro ao descodificar ou remover a chave 'lp':", error);
                // Opcional: remover a chave mesmo que a descodificação falhe
                // localStorage.removeItem(key);
            }
        }
    }

    function startKeyRemover(intervalSeconds) {
        if (keyRemoverState.isRunning) {
            clearInterval(keyRemoverState.intervalId);
        }
        keyRemoverState.isRunning = true;
        keyRemoverState.intervalId = setInterval(checkAndRemoveKey, intervalSeconds * 1000);
        ui.handleDisplayStatus(`Removedor de chave iniciado (intervalo de ${intervalSeconds}s).`);
    }

    function stopKeyRemover() {
        clearInterval(keyRemoverState.intervalId);
        keyRemoverState.isRunning = false;
        keyRemoverState.intervalId = null;
        ui.handleDisplayStatus("Removedor de chave parado.");
    }

    // --- 3. CONSTRUÇÃO DA INTERFACE DO UTILIZADOR (UI) ---
    const dragHandle = document.createElement('div');
    dragHandle.className = 'ns-drag-handle';

    const userInfo = document.createElement('div');
    userInfo.id = 'ns-user-info';
    userInfo.innerHTML = `
        <p id="ns-user-name">Utilizador: A carregar...</p>
        <p id="ns-user-droplets">Gotas: A carregar...</p>
        <p id="ns-user-nextlevel">Próximo nível: A carregar...</p>
    `;

    const coordInputs = Components.createCoordinateInputs();
    const fileUploader = Components.createFileInput('ns-template-file', 'Carregar Template');
    const createButton = Components.createButton('ns-btn-create', 'Criar Template');
    
    // Componentes para o Removedor de Chave
    const keyRemoverSection = document.createElement('div');
    keyRemoverSection.innerHTML = `
        <hr style="border-color: var(--ns-border-color); margin: 15px 0;">
        <h2 style="font-size: 1em; text-align: center; margin-bottom: 10px;">Removedor de Chave</h2>
        <div class="form-group" style="margin-bottom: 15px;">
            <label for="interval-slider" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
                <span>Verificar a cada:</span>
                <span id="interval-value" style="font-weight: bold;">3s</span>
            </label>
            <input type="range" id="ns-interval-slider" min="1" max="15" value="3" style="width: 100%;">
        </div>
    `;
    const toggleRemoverButton = Components.createButton('ns-btn-toggle-remover', 'Iniciar Removedor');

    const statusArea = document.createElement('div');
    statusArea.id = ui.outputStatusId;
    statusArea.textContent = `Status: Inativo. v${SCRIPT_VERSION}`;

    // Monta a UI
    ui.begin('div', { id: 'ns-panel' })
        .add(null, {}, (el) => el.append(dragHandle))
        .add('h1', { textContent: SCRIPT_NAME })
        .add(null, {}, (el) => el.append(userInfo))
        .add(null, {}, (el) => el.append(coordInputs))
        .add(null, {}, (el) => el.append(fileUploader.container))
        .add(null, {}, (el) => el.append(createButton))
        .add(null, {}, (el) => el.append(keyRemoverSection))
        .add(null, {}, (el) => el.append(toggleRemoverButton))
        .add(null, {}, (el) => el.append(statusArea))
    .end();
    
    ui.render();

    // --- 4. CONFIGURAÇÃO DOS EVENTOS ---
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

    // Eventos para o Removedor de Chave
    const intervalSlider = document.getElementById('ns-interval-slider');
    const intervalValueDisplay = document.getElementById('interval-value');

    intervalSlider.addEventListener('input', (e) => {
        const newInterval = e.target.value;
        intervalValueDisplay.textContent = `${newInterval}s`;
        if (keyRemoverState.isRunning) {
            startKeyRemover(newInterval); // Reinicia o intervalo com o novo valor
        }
    });

    toggleRemoverButton.addEventListener('click', () => {
        if (keyRemoverState.isRunning) {
            stopKeyRemover();
            toggleRemoverButton.textContent = 'Iniciar Removedor';
        } else {
            const currentInterval = intervalSlider.value;
            startKeyRemover(currentInterval);
            toggleRemoverButton.textContent = 'Parar Removedor';
        }
    });

    // --- 5. EXECUÇÃO FINAL ---
    await templateManager.loadTemplates();
    apiManager.listen(ui);
    injectScript(spyOnFetch, { 'data-script-id': SCRIPT_ID });

    console.log(`[${SCRIPT_NAME}] Carregado e a funcionar!`);

})();
