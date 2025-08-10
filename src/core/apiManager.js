/**
 * Gere os pedidos, respostas e interações da API.
 * A espionagem de busca é feita em main.js, não aqui.
 * @class ApiManager
 */
import TemplateManager from './templateManager.js';
import { escapeHTML, serverTPtoDisplayTP } from '../utils/formatters.js';

export default class ApiManager {

  /**
   * Construtor da classe ApiManager.
   * @param {TemplateManager} templateManager - A instância do gestor de modelos.
   */
  constructor(templateManager) {
    this.templateManager = templateManager;
    this.lastCoords = null; // Armazena o último par de coordenadas detetado [tileX, tileY, pixelX, pixelY]
  }

  /**
   * Inicia o ouvinte de eventos para processar mensagens do código injetado.
   * @param {Overlay} overlay - A instância da classe Overlay para interagir com a UI.
   */
  listen(overlay) {
    window.addEventListener('message', async (event) => {
      // Ignora mensagens que não são do nosso script
      if (!event.data || event.data.source !== 'novo-script') {
        return;
      }

      const { endpoint, jsonData, blobData, blobID, blink } = event.data;

      // Se não houver um endpoint, a mensagem não é para este ouvinte.
      if (!endpoint) {
        return;
      }
      
      // Extrai o nome do endpoint para facilitar o manuseamento (ex: 'me', 'pixel', 'tiles')
      const endpointName = endpoint.split('?')[0].split('/').filter(s => s && isNaN(Number(s)) && !s.includes('.')).pop();

      console.log(`[API Manager] Mensagem recebida para o endpoint: "${endpointName}"`);

      switch (endpointName) {
        case 'me':
          if (jsonData?.status && jsonData.status.toString()[0] !== '2') {
            overlay.handleDisplayError('Não foi possível obter os dados do utilizador. Não está autenticado?');
            return;
          }
          // Atualiza a UI com os novos dados do utilizador
          this.updateUserInfo(overlay, jsonData);
          break;

        case 'pixel':
          // Extrai as coordenadas da resposta do pixel
          this.handlePixelResponse(overlay, endpoint);
          break;
        
        case 'tiles':
          // Se for um tile de imagem, envia para o templateManager para processamento
          if (blobData && blobID) {
            const tileCoords = this.extractTileCoords(endpoint);
            const processedBlob = await this.templateManager.drawTemplateOnTile(blobData, tileCoords);
            
            // Envia o blob processado de volta para o código injetado
            window.postMessage({
              source: 'novo-script-response',
              blobID: blobID,
              blobData: processedBlob,
              blink: blink
            });
          }
          break;
      }
    });
  }

  /**
   * Atualiza as informações do utilizador na UI.
   * @param {Overlay} overlay - A instância da UI.
   * @param {object} userData - Os dados do utilizador recebidos da API.
   */
  updateUserInfo(overlay, userData) {
    const nextLevelPixels = Math.ceil(Math.pow(Math.floor(userData['level']) * Math.pow(30, 0.65), (1/0.65)) - userData['pixelsPainted']);
    
    // Supondo que a sua UI tenha elementos com estes IDs
    overlay.updateText('ns-user-name', `Utilizador: ${escapeHTML(userData['name'])}`);
    overlay.updateText('ns-user-droplets', `Gotas: ${new Intl.NumberFormat().format(userData['droplets'])}`);
    overlay.updateText('ns-user-nextlevel', `Próximo nível em ${new Intl.NumberFormat().format(nextLevelPixels)} pixels`);

    if (this.templateManager) {
        this.templateManager.setUserID(userData['id']);
    }
  }

  /**
   * Processa a resposta de um clique no pixel e armazena as coordenadas.
   * @param {Overlay} overlay - A instância da UI.
   * @param {string} endpoint - O URL do endpoint que foi chamado.
   */
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
    
    // Atualiza os campos de input na UI
    overlay.updateText('ns-input-tx', this.lastCoords[0]);
    overlay.updateText('ns-input-ty', this.lastCoords[1]);
    overlay.updateText('ns-input-px', this.lastCoords[2]);
    overlay.updateText('ns-input-py', this.lastCoords[3]);
  }

  /**
   * Extrai as coordenadas de um URL de tile.
   * @param {string} endpoint - O URL do endpoint do tile.
   * @returns {number[]} As coordenadas [x, y] do tile.
   */
  extractTileCoords(endpoint) {
    const parts = endpoint.split('/');
    const y = parseInt(parts[parts.length - 1].replace('.png', ''), 10);
    const x = parseInt(parts[parts.length - 2], 10);
    return [x, y];
  }
}
