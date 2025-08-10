/**
 * Funções de utilidade para manipulação do DOM (Document Object Model).
 */

/**
 * Injeta uma folha de estilos CSS na cabeça do documento.
 * @param {string} cssText - O conteúdo CSS a ser injetado.
 */
export function injectStyle(cssText) {
  const styleElement = document.createElement('style');
  styleElement.id = 'ns-styles'; // Adiciona um ID para fácil identificação
  styleElement.textContent = cssText;
  (document.head || document.documentElement).appendChild(styleElement);
}

/**
 * Injeta e executa um script diretamente no contexto da página.
 * Isto é crucial para escapar do ambiente 'sandboxed' do Tampermonkey e interagir
 * com as variáveis globais da página, como 'window.fetch'.
 * @param {function} callback - A função a ser executada no contexto da página.
 * @param {object} [attributes={}] - Atributos para passar para o script injetado.
 */
export function injectScript(callback, attributes = {}) {
    const script = document.createElement('script');
    
    // Passa atributos para o script, útil para passar dados do userscript para o código injetado.
    for (const [key, value] of Object.entries(attributes)) {
        script.setAttribute(key, value);
    }

    script.textContent = `(${callback})();`;

    (document.documentElement || document.body).appendChild(script);
    // Remove o script do DOM após a sua execução para manter o HTML limpo.
    script.remove();
}

/**
 * Adiciona uma fonte do Google Fonts à página de forma assíncrona para não bloquear o carregamento.
 * @param {string} fontFamily - O nome da família da fonte a carregar (ex: 'Inter').
 */
export function loadGoogleFont(fontFamily) {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600&display=swap`;
    
    // Verifica se a fonte já foi adicionada
    if (document.querySelector(`link[href="${fontUrl}"]`)) {
        return;
    }
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = fontUrl;
    link.onload = () => {
        link.rel = 'stylesheet';
    };
    
    document.head.appendChild(link);
}
