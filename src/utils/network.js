/**
 * Funções de utilidade relacionadas com a rede, incluindo a interceção de pedidos 'fetch'.
 */

/**
 * O código a ser injetado no contexto da página para espiar os pedidos 'fetch'.
 * Esta função será executada fora do ambiente 'sandboxed' do Tampermonkey.
 */
export function spyOnFetch() {
  // Obtém atributos passados do script principal
  const scriptElement = document.currentScript;
  const SCRIPT_ID = scriptElement?.getAttribute('data-script-id') || 'novo-script';
  const RESPONSE_ID = `${SCRIPT_ID}-response`;

  const originalFetch = window.fetch;
  const blobQueue = new Map(); // Fila para processar blobs de imagem

  // Ouve as respostas do script principal com os blobs processados
  window.addEventListener('message', (event) => {
    const { source, blobID, blobData } = event.data;
    if (source !== RESPONSE_ID || !blobID || !blobData) {
      return;
    }

    const resolveCallback = blobQueue.get(blobID);
    if (typeof resolveCallback === 'function') {
      resolveCallback(blobData); // Resolve a promessa com o blob modificado
      blobQueue.delete(blobID);
    }
  });

  // Sobrescreve a função 'fetch' global
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = (args[0] instanceof Request) ? args[0].url : args[0];

    // Clona a resposta para que possamos lê-la sem afetar o fluxo original
    const clonedResponse = response.clone();
    const contentType = clonedResponse.headers.get('content-type') || '';

    // Se a resposta for JSON, envia os dados para o script principal
    if (contentType.includes('application/json')) {
      clonedResponse.json().then(jsonData => {
        window.postMessage({
          source: SCRIPT_ID,
          endpoint: url,
          jsonData: jsonData,
        }, '*');
      }).catch(err => console.error(`[${SCRIPT_ID}] Falha ao analisar JSON:`, err));
    
    // Se for uma imagem (e não de um mapa base), processa-a
    } else if (contentType.includes('image/') && !url.includes('openfreemap') && !url.includes('maps')) {
      return new Promise(async (resolve) => {
        const originalBlob = await clonedResponse.blob();
        const blobID = crypto.randomUUID(); // Gera um ID único para este pedido

        // Armazena a função 'resolve' para ser chamada quando recebermos o blob processado
        blobQueue.set(blobID, (processedBlob) => {
          // Cria uma nova resposta com o blob modificado, mantendo os cabeçalhos originais
          resolve(new Response(processedBlob, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          }));
        });

        // Envia o blob original para o script principal para processamento
        window.postMessage({
          source: SCRIPT_ID,
          endpoint: url,
          blobID: blobID,
          blobData: originalBlob,
          blink: Date.now() // Para medir o tempo de processamento
        }, '*');
      });
    }

    // Retorna a resposta original para todos os outros tipos de pedidos
    return response;
  };
}
