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
    
    // Durante o desenvolvimento, o @resource carrega o CSS localmente.
    // Para produção, o CSS seria empacotado diretamente no script.
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

    // --- 3. CONSTRUÇÃO DA INTERFACE DO UTILIZADOR (UI) ---
    // Cria os componentes reutilizáveis
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
    const toggleButton = Components.createButton('ns-btn-toggle', 'Desativar Templates', ['ns-button-secondary']);
    
    const statusArea = document.createElement('div');
    statusArea.id = ui.outputStatusId;
    statusArea.textContent = `Status: Inativo. v${SCRIPT_VERSION}`;

    // Monta a UI usando a classe Overlay
    ui.begin('div', { id: 'ns-panel' })
        .add(null, {}, (el) => el.append(dragHandle))
        .add('h1', { textContent: SCRIPT_NAME })
        .add(null, {}, (el) => el.append(userInfo))
        .add(null, {}, (el) => el.append(coordInputs))
        .add(null, {}, (el) => el.append(fileUploader.container))
        .add(null, {}, (el) => el.append(createButton))
        .add(null, {}, (el) => el.append(toggleButton))
        .add(null, {}, (el) => el.append(statusArea))
    .end();
    
    ui.render(); // Adiciona a UI à página

    // --- 4. CONFIGURAÇÃO DOS EVENTOS ---
    ui.handleDrag('#ns-panel', '.ns-drag-handle');

    // Botão para obter coordenadas
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

    // Botão para criar template
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

    // Botão para ativar/desativar templates
    toggleButton.addEventListener('click', () => {
        templateManager.toggleTemplates(!templateManager.areTemplatesEnabled);
        toggleButton.textContent = templateManager.areTemplatesEnabled ? 'Desativar Templates' : 'Ativar Templates';
    });

    // --- 5. EXECUÇÃO FINAL ---
    // Carrega os templates guardados
    await templateManager.loadTemplates();

    // Inicia o ouvinte da API para começar a receber mensagens
    apiManager.listen(ui);

    // Injeta o script espião para intercetar os pedidos 'fetch'
    injectScript(spyOnFetch, { 'data-script-id': SCRIPT_ID });

    console.log(`[${SCRIPT_NAME}] Carregado e a funcionar!`);

})();

