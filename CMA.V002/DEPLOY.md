# Guia de Deploy na Vercel - CMA.V02

## 📋 Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Conta no [GitHub](https://github.com) (ou GitLab/Bitbucket)
- Projeto Supabase configurado e ativo

---

## 🚀 Passo a Passo do Deploy

### 1. Preparar o Repositório Git

Se ainda não tiver um repositório Git, crie um:

```bash
cd C:\Users\Usuario\Desktop\CMA.V02\CMA.V002
git init
git add .
git commit -m "Initial commit - CMA.V02 ready for deploy"
```

Crie um repositório no GitHub e faça push:

```bash
git remote add origin https://github.com/SEU_USUARIO/cma-v02.git
git branch -M main
git push -u origin main
```

### 2. Conectar à Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New Project"**
3. Importe seu repositório do GitHub
4. A Vercel detectará automaticamente que é um projeto Vite

### 3. Configurar Variáveis de Ambiente

No painel da Vercel, antes de fazer o deploy, adicione as seguintes variáveis de ambiente:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `VITE_SUPABASE_URL` | `https://qhxsrxewfhumlmrwpjdr.supabase.co` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Chave pública do Supabase |
| `GEMINI_API_KEY` | `sua-chave-aqui` | (Opcional) Chave da API Gemini |

> [!IMPORTANT]
> **Nunca** commite o arquivo `.env.local` para o Git. As variáveis de ambiente devem ser configuradas apenas no painel da Vercel.

### 4. Configurações de Build (Já Configuradas)

A Vercel usará automaticamente as configurações do `vercel.json`:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Framework**: Vite

### 5. Fazer o Deploy

1. Clique em **"Deploy"**
2. Aguarde o build completar (geralmente 1-2 minutos)
3. Acesse a URL gerada pela Vercel

---

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

- [ ] Página carrega sem erros
- [ ] Conexão com Supabase funciona
- [ ] Dados são carregados corretamente
- [ ] Funcionalidades CRUD funcionam
- [ ] Aplicação responsiva em mobile

---

## 🔄 Deploys Automáticos

A Vercel está configurada para fazer deploy automático:

- **Production**: Commits na branch `main`
- **Preview**: Pull requests e outras branches

Cada commit na branch principal criará um novo deploy automaticamente.

---

## 🐛 Troubleshooting

### Erro: "Module not found"

**Solução**: Verifique se todas as dependências estão no `package.json` e não apenas em `devDependencies`.

### Erro: "Environment variable not defined"

**Solução**: Verifique se as variáveis de ambiente foram configuradas corretamente no painel da Vercel.

### Build falha com erro de memória

**Solução**: A Vercel tem limite de memória. Se necessário, otimize o código ou considere o plano Pro.

### Página em branco após deploy

**Solução**: 
1. Verifique o console do navegador para erros
2. Confirme que as variáveis de ambiente estão corretas
3. Verifique se o `vercel.json` tem as regras de rewrite corretas

---

## 📊 Monitoramento

### Analytics

A Vercel oferece analytics gratuito. Acesse em:
- Dashboard → Seu Projeto → Analytics

### Logs

Para ver logs de build e runtime:
- Dashboard → Seu Projeto → Deployments → Clique no deploy → Logs

---

## 🔒 Segurança

### Headers de Segurança (Já Configurados)

O `vercel.json` já inclui headers de segurança:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### HTTPS

Todos os deploys na Vercel usam HTTPS automaticamente.

---

## 🎯 Próximos Passos

1. **Domínio Customizado**: Configure um domínio próprio no painel da Vercel
2. **Monitoramento**: Configure alertas para erros
3. **Performance**: Use o Vercel Analytics para otimizar
4. **Backup**: Configure backups automáticos do Supabase

---

## 📞 Suporte

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Vite](https://vitejs.dev/guide/)
- [Documentação Supabase](https://supabase.com/docs)
