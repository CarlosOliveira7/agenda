# 📋 Painel de Entregas - UniBalsas

Aplicação web para acompanhamento de prazos e links de trabalhos acadêmicos da **UniBalsas Centro Universitário**.

Acesso via GitHub Pages: **https://carlosoliveira7.github.io/agenda/**

---

## ⚡ Conexão Firebase em Tempo Real

O aplicativo já está configurado nativamente para sincronizar com a instância:
- **Instância**: `agendaub-6d420-default-rtdb`
- **URL**: `https://agendaub-6d420-default-rtdb.firebaseio.com`

### ⚠️ Regras de Segurança no Firebase Console
Para que todos os colegas do grupo possam ler e cadastrar entregas, configure as regras no [Firebase Console](https://console.firebase.google.com/):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## 📁 Estrutura do Projeto

```
agenda/
├── index.html              # Interface semântica da aplicação
├── assets/
│   └── favicon.svg         # Ícone institucional
├── css/
│   ├── variables.css       # Cores institucionais e status funcionais
│   ├── layout.css          # Grid e estrutura de tela
│   ├── components.css      # Cartões, botões e modais
│   └── style.css           # Estilos consolidados
├── js/
│   ├── date-utils.js       # Cálculo automático de status por prazo
│   ├── sync.js             # Conexão direta com Firebase RTDB e SSE
│   ├── ui.js               # Renderização de tela e feedback
│   └── app.js              # Controlador principal da aplicação
└── README.md
```

---

## 🎨 Cores e Regras de Status

- **Pendente** (> 2 dias): Neutro (cinza/ardósia)
- **Urgente** (0 a 2 dias): Âmbar
- **Atrasado** (< 0 dias): Vermelho Carmim
- **Concluído**: Verde-azulado (*teal*)
