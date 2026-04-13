# Deploy na Hostinger - Financas Gante

## Passo 1: Configurar o Banco de Dados

1. Acesse o painel da Hostinger
2. Va em **Banco de Dados > MySQL**
3. O banco ja deve estar criado: `u668423313_financasgante`
4. Acesse o **phpMyAdmin**
5. Execute o arquivo `api/schema.sql` OU acesse `seu-dominio.com/api/setup-database.php` apos o upload

## Passo 2: Build do Projeto

No seu computador local, execute:

```bash
cd BearFinance
npm install
npm run build
```

Isso vai gerar a pasta `out/` com os arquivos estaticos.

## Passo 3: Upload dos Arquivos

1. Acesse o **Gerenciador de Arquivos** da Hostinger ou use **FTP**
2. Navegue ate a pasta `public_html/`
3. Faca upload de TODOS os arquivos da pasta `out/` para `public_html/`
4. Faca upload da pasta `api/` para `public_html/api/`
5. Faca upload do arquivo `.htaccess` da pasta `public/` para `public_html/`

### Estrutura Final no Servidor:

```
public_html/
├── api/
│   ├── config.php
│   ├── auth.php
│   ├── dados.php
│   ├── setup-database.php (remover apos configuracao)
│   └── schema.sql (remover apos configuracao)
├── _next/
│   └── (arquivos do Next.js)
├── images/
│   └── logo-gante.png
├── .htaccess
├── index.html
├── login.html
├── manifest.json
├── sw.js
└── (outros arquivos estaticos)
```

## Passo 4: Configurar o Banco

Acesse no navegador:
```
https://seu-dominio.com/api/setup-database.php
```

Isso vai criar as tabelas necessarias. **Remova este arquivo apos a configuracao!**

## Passo 5: Testar

1. Acesse `https://seu-dominio.com`
2. Crie uma conta
3. Faca login
4. Teste adicionar gastos e salvar

## Configuracoes Adicionais

### SSL/HTTPS
- A Hostinger geralmente oferece SSL gratuito
- Ative no painel: **Seguranca > SSL**
- Descomente as linhas de HTTPS no `.htaccess`

### Dominio Personalizado
- Configure em **Dominios > Gerenciar**
- Atualize o DNS se necessario

## Solucao de Problemas

### Erro 500
- Verifique as permissoes dos arquivos PHP (644)
- Verifique as permissoes das pastas (755)
- Confira o arquivo `.htaccess`

### Erro de Conexao com Banco
- Verifique as credenciais em `api/config.php`
- Confirme que o banco de dados existe

### Pagina em Branco
- Limpe o cache do navegador
- Verifique o console do navegador (F12)

### API nao Funciona
- Confirme que os arquivos PHP estao em `public_html/api/`
- Teste acessando `seu-dominio.com/api/auth.php?action=test`

## Credenciais do Banco

- **Host:** localhost
- **Banco:** u668423313_financasgante
- **Usuario:** u668423313_financasgante
- **Senha:** Gante2026@

> **IMPORTANTE:** Altere a senha em producao e nunca compartilhe estas credenciais!
