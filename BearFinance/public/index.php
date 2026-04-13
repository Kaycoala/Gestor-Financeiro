<?php
/**
 * Index Principal - Financas Gante
 * Redireciona para a aplicacao Next.js
 * 
 * Para Hostinger com Node.js:
 * - Configure o Node.js no painel da Hostinger
 * - Execute: npm run build && npm run start
 * 
 * Para Hostinger sem Node.js (export estatico):
 * - Execute: npm run build
 * - Configure as rewrite rules no .htaccess
 */

// Verificar se existe um arquivo estatico exportado
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = __DIR__;

// Remover query string para verificar arquivo
$path = parse_url($requestUri, PHP_URL_PATH);

// Se for uma requisicao para API, deixar passar
if (strpos($path, '/api/') === 0) {
    $apiFile = $basePath . $path;
    if (file_exists($apiFile)) {
        include $apiFile;
        exit;
    }
}

// Se for arquivo estatico existente, servir
$staticPath = $basePath . $path;
if (is_file($staticPath) && $path !== '/') {
    return false; // Deixar o servidor web servir o arquivo
}

// Verificar se existe index.html (export estatico do Next.js)
$indexHtml = $basePath . '/index.html';
if (file_exists($indexHtml)) {
    include $indexHtml;
    exit;
}

// Fallback: redirecionar para pagina principal
header('Location: /');
exit;
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Financas Gante</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #f8fafc;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .logo {
            max-width: 200px;
            margin-bottom: 2rem;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        p {
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        .loader {
            width: 48px;
            height: 48px;
            border: 4px solid #334155;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="/images/logo-gante.png" alt="Gante" class="logo">
        <h1>Carregando...</h1>
        <p>Aguarde enquanto preparamos tudo para voce</p>
        <div class="loader"></div>
    </div>
    <script>
        // Verificar se a aplicacao esta disponivel
        setTimeout(function() {
            window.location.reload();
        }, 3000);
    </script>
</body>
</html>
