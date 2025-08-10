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
import { firebaseService } from '../utils/firebase.js'; // <-- NOVA IMPORTAÇÃO

// Função principal auto-executável para encapsular o nosso script
(async function() {
    'use strict';
    try {
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
        const keyRemoverState = { isRunning: false, intervalId: null, statusTimeoutId: null };

        function showTemporaryStatus(message, duration = 3000) {
            const statusElement = document.getElementById(ui.outputStatusId);
            if (!statusElement) return;

            const originalStatus = statusElement.textContent;
            ui.handleDisplayStatus(message);

            clearTimeout(keyRemoverState.statusTimeoutId);
            keyRemoverState.statusTimeoutId = setTimeout(() => {
                if (statusElement.textContent.includes(message)) {
                    ui.updateText(ui.outputStatusId, originalStatus);
                }
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

        // --- NOVA LÓGICA DE DADOS E ESTADO ---
        let currentUser = null;
        let lastSavedData = {};

        async function saveStateToFirebase() {
            if (!currentUser || !document.getElementById('ns-panel')) return;

            const currentState = {
                lastCoords: {
                    tx: document.getElementById('ns-input-tx').value,
                    ty: document.getElementById('ns-input-ty').value,
                    px: document.getElementById('ns-input-px').value,
                    py: document.getElementById('ns-input-py').value,
                },
                removerInterval: document.getElementById('ns-interval-slider').value,
                templates: templateManager.getTemplatesForSaving() // Necessita de um novo método no TemplateManager
            };
            
            if (JSON.stringify(currentState) !== JSON.stringify(lastSavedData)) {
                await firebaseService.saveUserData(currentUser.uid, currentState);
                lastSavedData = currentState;
                console.log("Estado guardado na Firebase.");
            }
        }

        // --- 3. CONSTRUÇÃO DA INTERFACE DO UTILIZADOR (UI) ---
        function buildLoginPanel() {
            const loginPanel = document.createElement('div');
            loginPanel.id = 'ns-login-panel';
            loginPanel.style.display = 'none'; // Começa escondido
            loginPanel.style.position = 'fixed';
            loginPanel.style.top = '20px';
            loginPanel.style.right = '20px';
            loginPanel.style.zIndex = '10000';
            
            const loginButton = Components.createButton('ns-btn-login', 'Login com Google');
            const title = document.createElement('h1');
            title.textContent = SCRIPT_NAME;
            const subtitle = document.createElement('p');
            subtitle.textContent = 'Faça login para continuar';

            loginPanel.append(title, subtitle, loginButton);
            document.body.appendChild(loginPanel);

            // Adiciona estilos ao painel de login
            injectStyle(`
                #ns-login-panel {
                    background-color: var(--ns-bg-primary);
                    color: var(--ns-text-primary);
                    border: 1px solid var(--ns-border-color);
                    border-radius: 12px;
                    padding: 16px;
                    font-family: 'Inter', sans-serif;
                    box-shadow: 0 8px 24px var(--ns-shadow-color);
                    text-align: center;
                }
                #ns-login-panel h1 { color: var(--ns-accent-primary); font-size: 1.2em; margin-bottom: 8px; }
                #ns-login-panel p { color: var(--ns-text-secondary); margin-bottom: 16px; }
            `);

            loginButton.addEventListener('click', () => {
                firebaseService.signInWithGoogle();
            });
        }

        function buildMainPanel() {
            ui.begin('div', { id: 'ns-panel', style: 'display: none;' }) // Começa escondido
                .add('div', { className: 'ns-drag-handle' })
                .add('h1', { textContent: SCRIPT_NAME })
                .add('div', { id: 'ns-user-info' })
                .add(null, {}, (panel) => panel.append(Components.createCoordinateInputs()))
                .add(null, {}, (panel) => panel.append(Components.createFileInput('ns-template-file', 'Carregar Template').container))
                .add(null, {}, (panel) => panel.append(Components.createButton('ns-btn-create', 'Criar Template')))
                .add('hr', { style: "border-color: var(--ns-border-color); margin: 15px 0;" })
                .add('h2', { textContent: 'Removedor de Chave', style: "font-size: 1em; text-align: center; margin-bottom: 10px;" })
                .begin('div', { className: 'form-group', style: "margin-bottom: 15px;" })
                    .begin('label', { htmlFor: 'ns-interval-slider', style: "display: flex; justify-content: space-between; align-items: center; font-size: 14px;" })
                        .add('span', { textContent: 'Verificar a cada:' })
                        .add('span', { id: 'interval-value', textContent: '3s', style: "font-weight: bold;" })
                    .end()
                    .add('input', { type: 'range', id: 'ns-interval-slider', min: '1', max: '15', value: '3', style: "width: 100%;" })
                .end()
                .add(null, {}, (panel) => panel.append(Components.createButton('ns-btn-toggle-remover', 'Iniciar Removedor')))
                .add('div', { id: ui.outputStatusId, textContent: `Status: Inativo. v${SCRIPT_VERSION}` })
                .add(null, {}, (panel) => panel.append(Components.createButton('ns-btn-logout', 'Logout')))
            .end();
            
            ui.render();
            setupEventListeners();
        }

        // --- 4. CONFIGURAÇÃO DOS EVENTOS ---
        function setupEventListeners() {
            ui.handleDrag('#ns-panel', '.ns-drag-handle');

            const fileUploaderInput = document.getElementById('ns-template-file');
            const intervalSlider = document.getElementById('ns-interval-slider');
            const intervalValueDisplay = document.getElementById('interval-value');
            const toggleRemoverButton = document.getElementById('ns-btn-toggle-remover');

            document.getElementById('ns-button-get-coords').addEventListener('click', () => {
                if (apiManager.lastCoords) {
                    ui.updateText('ns-input-tx', apiManager.lastCoords[0]);
                    ui.updateText('ns-input-ty', apiManager.lastCoords[1]);
                    ui.updateText('ns-input-px', apiManager.lastCoords[2]);
                    ui.updateText('ns-input-py', apiManager.lastCoords[3]);
                    saveStateToFirebase();
                } else {
                    ui.handleDisplayError("Nenhuma coordenada capturada. Clique no mapa primeiro.");
                }
            });

            document.getElementById('ns-btn-create').addEventListener('click', async () => {
                const file = fileUploaderInput.files[0];
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
                    await templateManager.createTemplate(file, coords);
                    await saveStateToFirebase();
                } else {
                    ui.handleDisplayError("Por favor, selecione um ficheiro de imagem.");
                }
            });

            document.getElementById('ns-btn-logout').addEventListener('click', () => {
                firebaseService.signOut();
            });

            intervalSlider.addEventListener('input', (e) => {
                const newInterval = e.target.value;
                intervalValueDisplay.textContent = `${newInterval}s`;
                if (keyRemoverState.isRunning) {
                    startKeyRemover(newInterval);
                }
            });
            
            intervalSlider.addEventListener('change', saveStateToFirebase);

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
        }

        // --- 5. FLUXO DE AUTENTICAÇÃO E EXECUÇÃO ---
        buildLoginPanel();
        buildMainPanel();

        if (firebaseService.init()) {
            firebaseService.onAuthStateChanged(async (user) => {
                const loginPanel = document.getElementById('ns-login-panel');
                const mainPanel = document.getElementById('ns-panel');

                if (user) {
                    currentUser = user;
                    loginPanel.style.display = 'none';
                    mainPanel.style.display = 'flex';

                    document.getElementById('ns-user-info').innerHTML = `<p>Bem-vindo, ${user.displayName}!</p>`;
                    
                    const userData = await firebaseService.loadUserData(user.uid);
                    if (userData) {
                        lastSavedData = userData;
                        ui.updateText('ns-input-tx', userData.lastCoords?.tx || '');
                        ui.updateText('ns-input-ty', userData.lastCoords?.ty || '');
                        ui.updateText('ns-input-px', userData.lastCoords?.px || '');
                        ui.updateText('ns-input-py', userData.lastCoords?.py || '');
                        
                        const interval = userData.removerInterval || '3';
                        document.getElementById('ns-interval-slider').value = interval;
                        document.getElementById('interval-value').textContent = `${interval}s`;

                        await templateManager.loadTemplatesFromData(userData.templates);
                    }
                    
                    apiManager.init({
                        onUserData: (data) => {},
                        onCoordsData: (coords) => {
                            ui.updateText('ns-input-tx', coords[0]);
                            ui.updateText('ns-input-ty', coords[1]);
                            ui.updateText('ns-input-px', coords[2]);
                            ui.updateText('ns-input-py', coords[3]);
                            saveStateToFirebase();
                        }
                    });
                    apiManager.listen();
                    injectScript(spyOnFetch, { 'data-script-id': SCRIPT_ID });
                } else {
                    currentUser = null;
                    mainPanel.style.display = 'none';
                    loginPanel.style.display = 'block';
                }
            });
        } else {
            alert("Não foi possível conectar ao Firebase. O script não funcionará corretamente.");
        }

    } catch (error) {
        console.error("Ocorreu um erro fatal no script:", error);
    }
})();
