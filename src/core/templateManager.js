/**
 * Gere o sistema de templates.
 * Esta classe lida com todos os pedidos externos para modificação, criação e análise de templates.
 * Serve como o coordenador central entre as instâncias de templates e a interface do utilizador.
 * @class TemplateManager
 */
import Template from './Template.js';
import { base64ToUint8 } from '../utils/formatters.js';

export default class TemplateManager {
  /**
   * O construtor para a classe TemplateManager.
   * @param {Overlay} overlay - A instância da classe Overlay para feedback da UI.
   */
  constructor(overlay) {
    this.overlay = overlay;
    this.templates = []; // Array para armazenar instâncias da classe Template
    this.areTemplatesEnabled = true; // Controlo global para ativar/desativar a sobreposição de templates
    this.userID = null; // ID do utilizador atual
    this.storageKey = 'ns_templates'; // Chave para o armazenamento do Tampermonkey
  }

  /**
   * Define o ID do utilizador atual.
   * @param {string|number} id - O ID do utilizador.
   */
  setUserID(id) {
    this.userID = id;
  }

  /**
   * Ativa ou desativa a renderização de todos os templates.
   * @param {boolean} isEnabled - O estado para o qual definir.
   */
  toggleTemplates(isEnabled) {
    this.areTemplatesEnabled = isEnabled;
    this.overlay.handleDisplayStatus(`Templates ${isEnabled ? 'ativados' : 'desativados'}.`);
    // Aqui, seria necessário acionar uma nova renderização da tela, se aplicável.
  }

  /**
   * Cria um novo template a partir de um ficheiro e coordenadas, processa-o e guarda-o.
   * @param {File} file - O ficheiro de imagem para o template.
   * @param {number[]} coords - As coordenadas [tileX, tileY, pixelX, pixelY].
   */
  async createTemplate(file, coords) {
    if (!file || !coords || coords.length < 4) {
      this.overlay.handleDisplayError("Ficheiro ou coordenadas em falta para criar o template.");
      return;
    }

    this.overlay.handleDisplayStatus("A processar novo template...");

    const template = new Template({
      displayName: file.name,
      file: file,
      coords: coords,
    });

    const success = await template.process();

    if (success) {
      this.templates.push(template);
      await this.saveTemplates();
      this.overlay.handleDisplayStatus(`Template "${template.displayName}" criado com ${template.pixelCount.toLocaleString()} píxeis.`);
    } else {
      this.overlay.handleDisplayError("Falha ao processar o template.");
    }
  }

  /**
   * Desenha os templates relevantes sobre um determinado tile do mapa.
   * @param {Blob} tileBlob - O blob da imagem original do tile.
   * @param {number[]} tileCoords - As coordenadas [x, y] do tile.
   * @returns {Promise<Blob>} O novo blob de imagem com os templates desenhados por cima.
   */
  async drawTemplateOnTile(tileBlob, tileCoords) {
    if (!this.areTemplatesEnabled || this.templates.length === 0) {
      return tileBlob; // Retorna o tile original se os templates estiverem desativados
    }

    const tileKey = `${tileCoords[0]},${tileCoords[1]}`;
    
    // Filtra para encontrar apenas os pedaços de template relevantes para este tile
    const chunksToDraw = this.templates
      .map(template => template.chunks[tileKey])
      .filter(chunk => chunk); // Remove undefined/null

    if (chunksToDraw.length === 0) {
      return tileBlob; // Nenhum template para este tile
    }

    const originalTileBitmap = await createImageBitmap(tileBlob);
    const { width, height } = originalTileBitmap;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // 1. Desenha o tile original
    ctx.drawImage(originalTileBitmap, 0, 0);

    // 2. Desenha cada pedaço de template por cima
    for (const chunkBitmap of chunksToDraw) {
      ctx.drawImage(chunkBitmap, 0, 0);
    }

    return await canvas.convertToBlob({ type: 'image/png' });
  }

  /**
   * Guarda a lista atual de templates no armazenamento do Tampermonkey.
   */
  async saveTemplates() {
    const templatesToSave = this.templates.map(t => ({
      displayName: t.displayName,
      coords: t.coords,
      chunksBase64: t.chunksBase64,
      pixelCount: t.pixelCount,
    }));
    
    await GM.setValue(this.storageKey, JSON.stringify(templatesToSave));
    console.log(`${templatesToSave.length} templates guardados.`);
  }

  /**
   * Carrega os templates a partir do armazenamento do Tampermonkey.
   */
  async loadTemplates() {
    const savedData = await GM.getValue(this.storageKey, '[]');
    const parsedTemplates = JSON.parse(savedData);

    if (!Array.isArray(parsedTemplates)) return;

    this.templates = []; // Limpa a lista atual

    for (const saved of parsedTemplates) {
      const template = new Template({
        displayName: saved.displayName,
        coords: saved.coords,
        pixelCount: saved.pixelCount,
      });

      // Reconstrói os chunks a partir de base64
      for (const key in saved.chunksBase64) {
        const base64 = saved.chunksBase64[key];
        const uint8 = base64ToUint8(base64);
        const blob = new Blob([uint8], { type: 'image/png' });
        template.chunks[key] = await createImageBitmap(blob);
      }
      
      this.templates.push(template);
    }
    
    if (this.templates.length > 0) {
        this.overlay.handleDisplayStatus(`${this.templates.length} template(s) carregado(s).`);
    }
    console.log(`${this.templates.length} templates carregados do armazenamento.`);
  }
}
