/**
 * Gere os pedidos, respostas e interações da API.
 * Atua como uma ponte entre os dados intercetados e o resto do script.
 * @class ApiManager
 */
import TemplateManager from './templateManager.js';

export default class ApiManager {
  /**
   * Construtor da classe ApiManager.
   * @param {TemplateManager} templateManager - A instância do gestor de templates.
   */
  constructor(templateManager) {
    this.templateManager = templateManager;
    this.callbacks = {}; // Armazena as funções de callback do main.js
  }

  /**
   * Inicializa o ApiManager com as funções de callback.
   * @param {object} callbacks - Um objeto contendo as funções de callback.
   * @param {function(object):void} callbacks.onUserData - Chamada com os dados do utilizador.
   * @param {function(number[]):void} callbacks.onCoordsData - Chamada com as novas coordenadas.
   */
  init({ onUserData, onCoordsData }) {
    this.callbacks.onUserData = onUserData;
    this.callbacks.onCoordsData = onCoordsData;
  }

  /**
   * Inicia o ouvinte de eventos para processar mensagens do código injetado.
   */
  listen() {
    window.addEventListener('message', async (event) => {
      // Ignora mensagens que não são do nosso script
      if (!event.data || event.data.source !== 'novo-script') {
        return;
      }

      const { endpoint, jsonData, blobData, blobID } = event.data;

      if (!endpoint) return;
      
      const endpointName = endpoint.split('?')[0].split('/').filter(s => s && isNaN(Number(s)) && !s.includes('.')).pop();

      switch (endpointName) {
        case 'me':
          if (jsonData && this.callbacks.onUserData) {
            // Notifica o main.js sobre os novos dados do utilizador
            this.callbacks.onUserData(jsonData);
          }
          break;

        case 'pixel':
          const tileCoords = endpoint.split('?')[0].split('/').filter(s => s && !isNaN(Number(s)));
          const params = new URLSearchParams(endpoint.split('?')[1]);
          const pixelCoords = [params.get('x'), params.get('y')];

          if (tileCoords.length >= 2 && pixelCoords.every(c => c !== null)) {
            const allCoords = [...tileCoords, ...pixelCoords].map(Number);
            if (this.callbacks.onCoordsData) {
              // Notifica o main.js sobre as novas coordenadas
              this.callbacks.onCoordsData(allCoords);
            }
          }
          break;
        
        case 'tiles':
          if (blobData && blobID) {
            const tileCoords = this.extractTileCoords(endpoint);
            const processedBlob = await this.templateManager.drawTemplateOnTile(blobData, tileCoords);
            
            // Envia o blob processado de volta para o código injetado
            window.postMessage({
              source: 'novo-script-response',
              blobID: blobID,
              blobData: processedBlob,
            });
          }
          break;
      }
    });
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
