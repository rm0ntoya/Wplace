/**
 * Este arquivo contém funções "construtoras" para componentes de UI reutilizáveis.
 * Cada função retorna um ou mais elementos HTML prontos para serem adicionados ao overlay.
 * Isso ajuda a manter o código da UI organizado e modular.
 */

/**
 * Cria um grupo de campos de input para as coordenadas.
 * @returns {HTMLDivElement} Um elemento <div> contendo os quatro inputs e um botão.
 */
export function createCoordinateInputs() {
  const container = document.createElement('div');
  container.className = 'ns-coord-container'; // 'ns' = novo-script

  const pinIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 6">
      <circle cx="2" cy="2" r="2"></circle>
      <path d="M2 6 L3.7 3 L0.3 3 Z"></path>
      <circle cx="2" cy="2" r="0.7" fill="white"></circle>
    </svg>`;

  const getCoordsButton = document.createElement('button');
  getCoordsButton.id = 'ns-button-get-coords';
  getCoordsButton.className = 'ns-icon-button';
  getCoordsButton.title = 'Usar coordenadas do último pixel clicado';
  getCoordsButton.innerHTML = pinIconSVG;
  
  const inputTx = document.createElement('input');
  inputTx.type = 'number';
  inputTx.id = 'ns-input-tx';
  inputTx.placeholder = 'Tl X';

  const inputTy = document.createElement('input');
  inputTy.type = 'number';
  inputTy.id = 'ns-input-ty';
  inputTy.placeholder = 'Tl Y';

  const inputPx = document.createElement('input');
  inputPx.type = 'number';
  inputPx.id = 'ns-input-px';
  inputPx.placeholder = 'Px X';

  const inputPy = document.createElement('input');
  inputPy.type = 'number';
  inputPy.id = 'ns-input-py';
  inputPy.placeholder = 'Px Y';

  // Adiciona todos os elementos ao container
  container.append(getCoordsButton, inputTx, inputTy, inputPx, inputPy);

  // Adiciona uma classe comum a todos os inputs para estilização
  [inputTx, inputTy, inputPx, inputPy].forEach(input => {
    input.className = 'ns-coord-input';
  });

  return container;
}

/**
 * Cria um componente de upload de arquivo personalizado.
 * Esconde o input de arquivo padrão e usa um botão estilizado.
 * @param {string} id - O ID para o input de arquivo.
 * @param {string} labelText - O texto a ser exibido no botão.
 * @returns {{container: HTMLDivElement, input: HTMLInputElement, button: HTMLButtonElement}} Um objeto contendo o container, o input e o botão.
 */
export function createFileInput(id, labelText) {
  const container = document.createElement('div');
  container.className = 'ns-file-input-container';

  const input = document.createElement('input');
  input.type = 'file';
  input.id = id;
  input.style.display = 'none'; // Esconde o input padrão

  const button = document.createElement('button');
  button.className = 'ns-button ns-button-upload';
  button.textContent = labelText;

  // Ao clicar no botão, o input de arquivo é acionado
  button.addEventListener('click', () => {
    input.click();
  });

  // Atualiza o texto do botão com o nome do arquivo selecionado
  input.addEventListener('change', () => {
    if (input.files && input.files.length > 0) {
      button.textContent = input.files[0].name;
      button.title = input.files[0].name;
    } else {
      button.textContent = labelText;
      button.title = '';
    }
  });

  container.append(input, button);

  return { container, input, button };
}

/**
 * Cria um botão padrão com texto.
 * @param {string} id - O ID para o botão.
 * @param {string} text - O texto do botão.
 * @param {string[]} [classes=[]] - Um array de classes CSS adicionais.
 * @returns {HTMLButtonElement} O elemento de botão criado.
 */
export function createButton(id, text, classes = []) {
  const button = document.createElement('button');
  button.id = id;
  button.textContent = text;
  button.className = 'ns-button'; // Classe base
  if (classes.length > 0) {
    button.classList.add(...classes);
  }
  return button;
}
