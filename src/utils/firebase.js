/**
 * Módulo para gerir todas as interações com o Firebase.
 * Inclui inicialização, autenticação e operações da base de dados Firestore.
 */

// As variáveis 'firebase' são disponibilizadas globalmente pelos scripts @require no meta.js
const firebaseConfig = {
  apiKey: "AIzaSyCERXiWRK8bmkAG-evSXBnwhSOjFWXyym8",
  authDomain: "wplace-a0f34.firebaseapp.com",
  projectId: "wplace-a0f34",
  storageBucket: "wplace-a0f34.appspot.com",
  messagingSenderId: "169855531458",
  appId: "1:169855531458:web:8e2e2a4b809fc4605b7e5b"
};

class FirebaseService {
  constructor() {
    this.auth = null;
    this.db = null;
    this.user = null;
  }

  /**
   * Inicializa a aplicação Firebase e os seus serviços.
   * @returns {boolean} True se a inicialização for bem-sucedida, false caso contrário.
   */
  init() {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      console.log("Firebase inicializado com sucesso! ✅");
      return true;
    } catch (error) {
      console.error("Erro ao inicializar o Firebase:", error);
      return false;
    }
  }

  /**
   * Inicia o processo de login com o Google através de um pop-up.
   * @returns {Promise<firebase.User|null>} O objeto do utilizador se o login for bem-sucedido, ou null em caso de erro.
   */
  async signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await this.auth.signInWithPopup(provider);
      this.user = result.user;
      console.log("Login bem-sucedido:", this.user.displayName);
      return this.user;
    } catch (error) {
      console.error("Erro durante o login com o Google:", error);
      return null;
    }
  }

  /**
   * Termina a sessão do utilizador atual.
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      await this.auth.signOut();
      this.user = null;
      console.log("Logout bem-sucedido.");
    } catch (error) {
      console.error("Erro durante o logout:", error);
    }
  }

  /**
   * Observa mudanças no estado de autenticação (login/logout).
   * @param {function(firebase.User|null):void} callback - Função a ser chamada quando o estado de autenticação muda.
   * @returns {function():void} Uma função para cancelar a subscrição do observador.
   */
  onAuthStateChanged(callback) {
    if (!this.auth) return () => {};
    return this.auth.onAuthStateChanged((user) => {
      this.user = user;
      callback(user);
    });
  }

  /**
   * Guarda os dados de um utilizador na Firestore.
   * @param {string} userId - O ID do utilizador.
   * @param {object} data - O objeto com os dados a serem guardados.
   * @returns {Promise<boolean>} True se os dados forem guardados com sucesso.
   */
  async saveUserData(userId, data) {
    if (!this.db || !userId) return false;
    try {
      // Usamos .set com { merge: true } para atualizar os campos sem apagar os existentes.
      await this.db.collection('users').doc(userId).set(data, { merge: true });
      console.log("Dados do utilizador guardados com sucesso.");
      return true;
    } catch (error) {
      console.error("Erro ao guardar os dados do utilizador:", error);
      return false;
    }
  }

  /**
   * Carrega os dados de um utilizador a partir da Firestore.
   * @param {string} userId - O ID do utilizador.
   * @returns {Promise<object|null>} O objeto com os dados do utilizador, ou null se não existirem.
   */
  async loadUserData(userId) {
    if (!this.db || !userId) return null;
    try {
      const docRef = this.db.collection('users').doc(userId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        console.log("Dados do utilizador carregados:", docSnap.data());
        return docSnap.data();
      } else {
        console.log("Nenhum dado encontrado para este utilizador. A criar um novo registo.");
        return null; // Indica que é um novo utilizador
      }
    } catch (error) {
      console.error("Erro ao carregar os dados do utilizador:", error);
      return null;
    }
  }
}

// Exporta uma única instância da classe para ser usada em todo o script
export const firebaseService = new FirebaseService();
