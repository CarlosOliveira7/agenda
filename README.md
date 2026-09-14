# 📋 Painel de Entregas - UniBalsas

Aplicação web desenvolvida com a **identidade visual UniBalsas** para grupos de trabalho gerenciarem links e prazos de entregas em tempo real, evitando links perdidos e datas esquecidas.

Hospedagem nativa no **GitHub Pages**: https://carlosoliveira7.github.io/agenda/

---

## 🎨 Identidade Visual (UniBalsas)

- **Cores Institucionais**:
  - Vermelho Carmim (`#b31329`) e Vinho Profundo (`#6b0c1a`) em gradiente.
  - Branco puro (`#ffffff`) e cinza suave (`#faf7f7`).
- **Cores Funcionais de Status**:
  - **Pendente** (prazo > 2 dias): Neutro (cinza/ardósia `#475569`).
  - **Urgente** (prazo de 0 a 2 dias): Âmbar (`#b45309`).
  - **Atrasado** (data passada): Vermelho Carmim (`#b91c1c`).
  - **Concluído** (marcado manualmente): Verde-azulado (*teal* `#0f766e`).

---

## 📁 Estrutura de Arquivos (Separação de Responsabilidades)

O projeto foi estruturado de forma modular e desacoplada, sem necessidade de ferramentas de compilação ou Node.js para rodar:

```
agenda/
├── index.html              # Estrutura semântica da página e modais
├── assets/
│   └── favicon.svg         # Ícone institucional
├── css/
│   ├── variables.css       # Design tokens (cores UniBalsas, status, sombras)
│   ├── layout.css          # Estrutura responsiva, container, cabeçalho e rodapé
│   ├── components.css      # Cartões, botões, modais, formulários e badges
│   └── style.css           # Arquivo mestre de estilos (@import)
├── js/
│   ├── date-utils.js       # Regras de cálculo de status por data e ordenação
│   ├── sync.js             # Sincronização em nuvem (Firebase RTDB), SSE e BroadcastChannel
│   ├── ui.js               # Renderização de componentes e manipulação do DOM
│   └── app.js              # Controlador principal e registro de eventos
├── .gitignore              # Arquivos ignorados pelo Git
└── README.md               # Documentação do projeto
```

---

## 🌐 Publicação no GitHub Pages

Como todos os caminhos são relativos (`./css/...`, `./js/...`), a publicação é imediata:

1. Acesse o repositório no GitHub: `https://github.com/CarlosOliveira7/agenda`
2. Vá em **Settings** &rarr; **Pages** (menu lateral).
3. Na seção **Build and deployment** &rarr; **Branch**, selecione `main` e a pasta `/ (root)`, e clique em **Save**.
4. O painel estará disponível em:
   `https://carlosoliveira7.github.io/agenda/`

---

## 🔄 Como Conectar e Compartilhar com o Grupo

1. No painel, clique no botão **Modo Local** (no cabeçalho) ou em **Conectar Nuvem** (no banner).
2. Cole a URL de um banco de dados gratuito do [Firebase Realtime Database](https://console.firebase.google.com/) (ex: `https://meu-projeto-default-rtdb.firebaseio.com`).
3. Clique em **Salvar e Conectar**.
4. Clique em **Copiar Link da Equipe** e envie o link para os colegas de grupo. Qualquer integrante que abrir o link verá e atualizará as mesmas entregas em tempo real!

---

## 💻 Testando Localmente

Para rodar no seu computador:
- Basta abrir o arquivo `index.html` em qualquer navegador.
- Ou rodar com um servidor HTTP simples:
  ```bash
  python3 -m http.server 8000
  ```
