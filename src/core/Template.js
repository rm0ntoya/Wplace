/**
 * Representa uma instância de um template.
 * Lida com toda a matemática, manipulação e análise de um único template.
 * @class Template
 */
import { uint8ToBase64 } from '../utils/formatters.js';

export default class Template {
  /**
   * O construtor para a classe Template.
   * @param {object} [params={}] - Objeto contendo todos os parâmetros opcionais.
   * @param {string} [params.displayName='Meu Template'] - O nome de exibição do template.
   * @param {File} [params.file=null] - O arquivo do template (imagem).
   * @param {number[]} [params.coords=null] - As coordenadas do canto superior esquerdo [tileX, tileY, pixelX, pixelY].
   * @param {number} [params.tileSize=1000] - O tamanho de um tile em píxeis.
   * @param {number} [params.pixelGridSize=3] - O fator de ampliação para criar o efeito de grade. Deve ser ímpar.
   */
  constructor({
    displayName = 'Meu Template',
    file = null,
    coords = null,
    tileSize = 1000,
    pixelGridSize = 3,
  } = {}) {
    this.displayName = displayName;
    this.file = file;
    this.coords = coords; // [tileX, tileY, pixelX, pixelY]
    this.tileSize = tileSize;
    this.pixelGridSize = pixelGridSize;

    this.pixelCount = 0; // Contagem total de píxeis não transparentes no template.
    this.chunks = {}; // Armazena os pedaços do template processados (bitmaps).
    this.chunksBase64 = {}; // Armazena os pedaços em base64 para salvar.
  }

  /**
   * Processa o arquivo de imagem, dividindo-o em pedaços que correspondem aos tiles do mapa.
   * @returns {Promise<boolean>} Retorna true se o processamento for bem-sucedido.
   */
  async process() {
    if (!this.file || !this.coords) {
      console.error("Faltam o arquivo ou as coordenadas para processar o template.");
      return false;
    }

    const bitmap = await createImageBitmap(this.file);
    const { width: imageWidth, height: imageHeight } = bitmap;
    
    // Canvas temporário para análise de píxeis
    const analysisCanvas = new OffscreenCanvas(imageWidth, imageHeight);
    const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    analysisCtx.drawImage(bitmap, 0, 0);
    const imageData = analysisCtx.getImageData(0, 0, imageWidth, imageHeight);
    
    let opaquePixelCount = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) { // Verifica o canal alfa
            opaquePixelCount++;
        }
    }
    this.pixelCount = opaquePixelCount;
    console.log(`Análise do template: ${imageWidth}x${imageHeight}, ${this.pixelCount.toLocaleString()} píxeis não transparentes.`);

    // Canvas para desenhar os pedaços
    const chunkCanvas = new OffscreenCanvas(this.tileSize, this.tileSize);
    const chunkCtx = chunkCanvas.getContext('2d', { willReadFrequently: true });
    chunkCtx.imageSmoothingEnabled = false; // Essencial para pixel art

    // Itera sobre a imagem, criando um pedaço para cada tile que ela sobrepõe
    for (let y = 0; y < imageHeight; y++) {
      for (let x = 0; x < imageWidth; x++) {
        // Calcula as coordenadas globais do píxel atual
        const globalPixelX = this.coords[2] + x;
        const globalPixelY = this.coords[3] + y;

        // Calcula em qual tile este píxel está
        const tileX = this.coords[0] + Math.floor(globalPixelX / this.tileSize);
        const tileY = this.coords[1] + Math.floor(globalPixelY / this.tileSize);

        // Calcula a posição do píxel dentro do seu tile
        const localPixelX = globalPixelX % this.tileSize;
        const localPixelY = globalPixelY % this.tileSize;

        const tileKey = `${tileX},${tileY}`;

        // Se for a primeira vez que encontramos este tile, preparamos o seu pedaço
        if (!this.chunks[tileKey]) {
          const newChunkCanvas = new OffscreenCanvas(this.tileSize * this.pixelGridSize, this.tileSize * this.pixelGridSize);
          const newChunkCtx = newChunkCanvas.getContext('2d', { willReadFrequently: true });
          newChunkCtx.imageSmoothingEnabled = false;
          this.chunks[tileKey] = { canvas: newChunkCanvas, context: newChunkCtx };
        }

        // Copia o píxel da imagem original para a posição correta no canvas do pedaço
        const pixelData = analysisCtx.getImageData(x, y, 1, 1);
        if (pixelData.data[3] > 0) { // Só desenha se não for transparente
          this.chunks[tileKey].context.putImageData(pixelData, localPixelX * this.pixelGridSize + Math.floor(this.pixelGridSize/2), localPixelY * this.pixelGridSize + Math.floor(this.pixelGridSize/2));
        }
      }
    }

    // Converte os pedaços finalizados em bitmaps e base64
    for (const key in this.chunks) {
        const finalBitmap = await this.chunks[key].canvas.transferToImageBitmap();
        this.chunks[key] = finalBitmap; // Substitui o objeto canvas/context pelo bitmap final

        const blob = await this.chunks[key].canvas.convertToBlob({ type: 'image/png' });
        const buffer = await blob.arrayBuffer();
        this.chunksBase64[key] = uint8ToBase64(new Uint8Array(buffer));
    }
    
    return true;
  }
}
