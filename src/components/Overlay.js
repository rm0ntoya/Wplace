/**
 * Classe para construir e gerenciar a interface de usuário (UI) do script.
 * Permite a criação de uma interface flutuante e interativa de forma programática,
 * servindo como base para o novo design.
 * @class Overlay
 */
export default class Overlay {

  /**
   * Construtor da classe Overlay.
   * @param {string} name - O nome do userscript.
   * @param {string} version - A versão do userscript.
   */
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.apiManager = null; // Será preenchido depois pelo main.js

    // Prefixo 'ns' (novo-script) para evitar conflitos de ID
    this.outputStatusId = 'ns-output-status'; 

    this.rootElement = null; // O elemento raiz da UI (o painel principal)
    this.currentParent = null; // O elemento pai atual onde novos elementos são adicionados
    this.parentStack = []; // Pilha para gerenciar o aninhamento de elementos
  }

  /**
   * Define a instância do ApiManager para comunicação interna.
   * @param {ApiManager} apiManager - A instância da classe ApiManager.
   */
  setApiManager(apiManager) {
    this.apiManager = apiManager;
  }

  /**
   * Cria um elemento HTML. Método privado para uso interno da classe.
   * @param {string} tag - A tag do elemento (ex: 'div', 'button').
   * @param {Object} [properties={}] - Propriedades para aplicar ao elemento (ex: id, className, textContent).
   * @returns {HTMLElement} O elemento HTML criado.
   * @private
   */
  #createElement(tag, properties = {}) {
    const element = document.createElement(tag);

    // Aplica todas as propriedades passadas ao elemento
    for (const [property, value] of Object.entries(properties)) {
        element[property] = value;
    }

    // Se for o primeiro elemento, define como raiz. Senão, anexa ao pai atual.
    if (!this.rootElement) {
      this.rootElement = element;
      this.currentParent = element;
    } else {
      this.currentParent?.appendChild(element);
    }

    return element;
  }

  /**
   * Inicia um novo grupo de elementos filhos (cria um aninhamento).
   * @param {string} tag - A tag do elemento container (ex: 'div').
   * @param {Object} [properties={}] - Propriedades para o container.
   * @returns {Overlay} A instância da classe Overlay para encadeamento de métodos.
   */
  begin(tag, properties = {}) {
    const element = this.#createElement(tag, properties);
    this.parentStack.push(this.currentParent); // Salva o pai atual
    this.currentParent = element; // O novo elemento se torna o pai atual
    return this;
  }

  /**
   * Finaliza o grupo de elementos filhos atual e retorna ao nível de aninhamento anterior.
   * @returns {Overlay} A instância da classe Overlay para encadeamento.
   */
  end() {
    if (this.parentStack.length > 0) {
      this.currentParent = this.parentStack.pop(); // Retorna ao pai anterior
    }
    return this;
  }

  /**
   * Adiciona um elemento simples que não terá filhos.
   * @param {string} tag - A tag do elemento.
   * @param {Object} [properties={}] - Propriedades para o elemento.
   * @param {function(HTMLElement):void} [callback] - Uma função opcional para manipulação adicional do elemento.
   * @returns {Overlay} A instância da classe Overlay para encadeamento.
   */
  add(tag, properties = {}, callback) {
    const element = this.#createElement(tag, properties);
    if (callback && typeof callback === 'function') {
      callback(element);
    }
    return this;
  }

  /**
   * Renderiza a UI completa no corpo do documento ou em outro elemento pai.
   * @param {HTMLElement} [parent=document.body] - O elemento onde a UI será adicionada.
   */
  render(parent = document.body) {
    if (this.rootElement) {
      parent.appendChild(this.rootElement);
    }
  }

  /**
   * Atualiza o conteúdo de um elemento na UI pelo seu ID.
   * @param {string} id - O ID do elemento.
   * @param {string} content - O novo conteúdo (texto simples).
   */
  updateText(id, content) {
    const element = document.getElementById(id.replace(/^#/, ''));
    if (!element) return;

    // Trata inputs de forma diferente de outros elementos
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = content;
    } else {
      element.textContent = content;
    }
  }

  /**
   * Adiciona a funcionalidade de arrastar a um elemento, com suporte a mouse e toque.
   * @param {string} overlaySelector - O seletor do elemento a ser movido.
   * @param {string} handleSelector - O seletor do elemento que serve como "alça" para arrastar.
   */
  handleDrag(overlaySelector, handleSelector) {
    const overlay = document.querySelector(overlaySelector);
    const handle = document.querySelector(handleSelector);

    if (!overlay || !handle) {
      console.error("Elementos para arrastar não encontrados:", { overlay, handle });
      return;
    }

    let isDragging = false;
    let offsetX, offsetY;
    let animationFrame;

    const startDrag = (clientX, clientY) => {
        isDragging = true;
        
        // Usa getBoundingClientRect para uma posição mais precisa
        const rect = overlay.getBoundingClientRect();
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;

        handle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none'; // Impede a seleção de texto durante o arrasto
    };

    const endDrag = () => {
        isDragging = false;
        handle.style.cursor = 'grab';
        document.body.style.userSelect = '';
        cancelAnimationFrame(animationFrame);
    };

    const drag = (clientX, clientY) => {
        if (!isDragging) return;

        const x = clientX - offsetX;
        const y = clientY - offsetY;

        // Usa requestAnimationFrame para uma animação mais fluida
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(() => {
            overlay.style.left = `${x}px`;
            overlay.style.top = `${y}px`;
        });
    };
    
    // Eventos de Mouse
    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('mousemove', (e) => drag(e.clientX, e.clientY));

    // Eventos de Toque (para dispositivos móveis)
    handle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchmove', (e) => drag(e.touches[0].clientX, e.touches[0].clientY), { passive: false });
  }

  /**
   * Exibe uma mensagem de status na UI e no console.
   * @param {string} text - O texto do status.
   */
  handleDisplayStatus(text) {
    console.info(`[${this.name}] ${text}`);
    this.updateText(this.outputStatusId, `Status: ${text}`);
  }

  /**
   * Exibe uma mensagem de erro na UI e no console.
   * @param {string} text - O texto do erro.
   */
  handleDisplayError(text) {
    console.error(`[${this.name}] ${text}`);
    this.updateText(this.outputStatusId, `Erro: ${text}`);
  }
}
