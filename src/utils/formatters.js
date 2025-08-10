/**
 * Funções de utilidade para formatação, codificação e sanitização de dados.
 */

/**
 * Sanitiza uma string de HTML para evitar a execução de scripts (XSS).
 * Exibe o HTML como texto simples.
 * @param {string} text - O texto a ser sanitizado.
 * @returns {string} A string de HTML escapada.
 */
export function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Converte o sistema de coordenadas do servidor (tile/pixel) para o sistema de exibição.
 * Esta função é específica para a forma como o wplace.live organiza os seus tiles.
 * @param {string[]} tile - As coordenadas do tile como um array [x, y].
 * @param {string[]} pixel - As coordenadas do píxel dentro do tile como um array [x, y].
 * @returns {number[]} Um array com as coordenadas de exibição [x, y].
 */
export function serverTPtoDisplayTP(tile, pixel) {
  const tileX = parseInt(tile[0], 10) || 0;
  const tileY = parseInt(tile[1], 10) || 0;
  const pixelX = parseInt(pixel[0], 10) || 0;
  const pixelY = parseInt(pixel[1], 10) || 0;

  // A lógica pode precisar de ajuste dependendo do site, mas esta é a base do Blue Marble.
  return [((tileX % 4) * 1000) + pixelX, ((tileY % 4) * 1000) + pixelY];
}

/**
 * Converte um Uint8Array (dados binários de uma imagem) para uma string base64.
 * Isto é necessário para guardar os templates como texto no armazenamento do Tampermonkey.
 * @param {Uint8Array} uint8Array - O array de bytes a ser convertido.
 * @returns {string} A string codificada em base64.
 */
export function uint8ToBase64(uint8Array) {
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binaryString); // btoa é uma função nativa do browser
}

/**
 * Converte uma string base64 de volta para um Uint8Array.
 * Usado ao carregar os templates guardados para reconstruir as imagens.
 * @param {string} base64String - A string codificada em base64.
 * @returns {Uint8Array} O array de bytes descodificado.
 */
export function base64ToUint8(base64String) {
  // Remove o cabeçalho de dados da imagem, se existir (ex: "data:image/png;base64,")
  const pureBase64 = base64String.split(',').pop();
  const binaryString = window.atob(pureBase64); // atob é uma função nativa do browser
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
