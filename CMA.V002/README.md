# C.M.A - Controle de Montagens e Assistências

Sistema de gerenciamento de ordens de serviço para montagens e assistências técnicas.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SEU_USUARIO/cma-v02)

## 🚀 Tecnologias

- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Supabase** - Banco de dados e backend
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones
- **date-fns** - Manipulação de datas

## 📋 Funcionalidades

- ✅ Gerenciamento de ordens de serviço (Assistência e Montagem)
- ✅ Controle de usuários (Admin, Técnicos, Clientes)
- ✅ Sistema de notificações
- ✅ Dashboard com estatísticas
- ✅ Checklist de tarefas
- ✅ Ambientes de montagem
- ✅ Comentários e histórico
- ✅ Avaliações de serviço

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### Instalação

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/cma-v02.git
cd cma-v02

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais do Supabase

# Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

### Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Cria build de produção
npm run preview  # Preview do build de produção
```

## 🗄️ Banco de Dados

O projeto usa Supabase como backend. Para inicializar o banco de dados:

```bash
npx tsx init-database.ts
```

Isso criará:
- 3 usuários (Admin, Técnico, Cliente)
- 2 ordens de serviço de exemplo
- 2 notificações
- Dados relacionados (ambientes, checklists, comentários)

## 🚀 Deploy na Vercel

Para fazer deploy na Vercel, siga o guia completo em [DEPLOY.md](./DEPLOY.md).

### Deploy Rápido

1. Faça push do código para o GitHub
2. Conecte o repositório à Vercel
3. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## 📁 Estrutura do Projeto

```
CMA.V002/
├── components/          # Componentes React
├── services/           # Serviços (db, mockData)
├── types.ts            # Definições TypeScript
├── App.tsx             # Componente principal
├── index.tsx           # Entry point
├── vite.config.ts      # Configuração Vite
├── vercel.json         # Configuração Vercel
└── DEPLOY.md           # Guia de deploy
```

## 🔒 Segurança

- Row Level Security (RLS) habilitado no Supabase
- Headers de segurança configurados
- HTTPS obrigatório em produção
- Variáveis de ambiente protegidas

## 📝 Licença

Este projeto é privado e proprietário.

## 👥 Autores

- Desenvolvido para gerenciamento de ordens de serviço

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique o [DEPLOY.md](./DEPLOY.md) para troubleshooting
2. Consulte a documentação do [Supabase](https://supabase.com/docs)
3. Consulte a documentação da [Vercel](https://vercel.com/docs)
