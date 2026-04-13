<?php
/**
 * Configuracao do Banco de Dados MySQL - Hostinger
 */

// Configuracoes do banco de dados
define('DB_HOST', 'localhost');
define('DB_NAME', 'u668423313_financasgante');
define('DB_USER', 'u668423313_financasgante');
define('DB_PASS', 'Gante2026@');

// Configuracoes de seguranca
define('CORS_ORIGIN', '*'); // Em producao, especifique o dominio
define('SESSION_DURATION', 86400); // 24 horas em segundos

// Headers CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Conexao com o banco de dados
function getDBConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro de conexao com o banco de dados']);
        exit();
    }
}

// Funcao para resposta JSON
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

// Funcao para obter dados do request
function getRequestData() {
    $json = file_get_contents('php://input');
    return json_decode($json, true) ?? [];
}

// Funcao para hash de senha
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}

// Funcao para verificar senha
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Funcao para gerar token de sessao
function generateSessionToken() {
    return bin2hex(random_bytes(32));
}
?>
