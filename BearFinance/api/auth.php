<?php
/**
 * API de Autenticacao - Login, Registro e Verificacao
 */

require_once 'config.php';

$pdo = getDBConnection();
$data = getRequestData();
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        handleRegister($pdo, $data);
        break;
    case 'login':
        handleLogin($pdo, $data);
        break;
    case 'verify':
        handleVerify($pdo, $data);
        break;
    case 'logout':
        handleLogout($pdo, $data);
        break;
    default:
        jsonResponse(['success' => false, 'message' => 'Acao invalida'], 400);
}

function handleRegister($pdo, $data) {
    $username = strtolower(trim($data['username'] ?? ''));
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Usuario e senha sao obrigatorios'], 400);
    }

    if (strlen($username) < 3) {
        jsonResponse(['success' => false, 'message' => 'Usuario deve ter pelo menos 3 caracteres'], 400);
    }

    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'message' => 'Senha deve ter pelo menos 6 caracteres'], 400);
    }

    // Verificar se usuario ja existe
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE username = ?");
    $stmt->execute([$username]);
    
    if ($stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Este nome de usuario ja esta em uso'], 400);
    }

    // Criar usuario
    $passwordHash = hashPassword($password);
    $stmt = $pdo->prepare("INSERT INTO usuarios (username, senha_hash, criado_em) VALUES (?, ?, NOW())");
    
    try {
        $stmt->execute([$username, $passwordHash]);
        jsonResponse(['success' => true, 'message' => 'Conta criada com sucesso! Faca login para continuar.']);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'message' => 'Erro ao criar conta. Tente novamente.'], 500);
    }
}

function handleLogin($pdo, $data) {
    $username = strtolower(trim($data['username'] ?? ''));
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        jsonResponse(['success' => false, 'message' => 'Usuario e senha sao obrigatorios'], 400);
    }

    // Buscar usuario
    $stmt = $pdo->prepare("SELECT id, username, senha_hash FROM usuarios WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Usuario nao encontrado'], 401);
    }

    if (!verifyPassword($password, $user['senha_hash'])) {
        jsonResponse(['success' => false, 'message' => 'Senha incorreta'], 401);
    }

    // Gerar token de sessao
    $token = generateSessionToken();
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_DURATION);

    // Remover sessoes antigas do usuario
    $stmt = $pdo->prepare("DELETE FROM sessoes WHERE usuario_id = ?");
    $stmt->execute([$user['id']]);

    // Criar nova sessao
    $stmt = $pdo->prepare("INSERT INTO sessoes (usuario_id, token, expira_em) VALUES (?, ?, ?)");
    $stmt->execute([$user['id'], $token, $expiresAt]);

    jsonResponse([
        'success' => true,
        'user' => [
            'uid' => $user['username'],
            'username' => $user['username']
        ],
        'token' => $token
    ]);
}

function handleVerify($pdo, $data) {
    $token = $data['token'] ?? '';

    if (empty($token)) {
        jsonResponse(['success' => false, 'message' => 'Token nao fornecido'], 400);
    }

    // Verificar token
    $stmt = $pdo->prepare("
        SELECT u.id, u.username 
        FROM sessoes s 
        JOIN usuarios u ON s.usuario_id = u.id 
        WHERE s.token = ? AND s.expira_em > NOW()
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Sessao invalida ou expirada'], 401);
    }

    jsonResponse([
        'success' => true,
        'user' => [
            'uid' => $user['username'],
            'username' => $user['username']
        ]
    ]);
}

function handleLogout($pdo, $data) {
    $token = $data['token'] ?? '';

    if (!empty($token)) {
        $stmt = $pdo->prepare("DELETE FROM sessoes WHERE token = ?");
        $stmt->execute([$token]);
    }

    jsonResponse(['success' => true, 'message' => 'Logout realizado com sucesso']);
}
?>
