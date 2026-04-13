<?php
/**
 * API de Dados - Salvar e Carregar dados do usuario
 */

require_once 'config.php';

$pdo = getDBConnection();
$data = getRequestData();
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'save':
        handleSave($pdo, $data);
        break;
    case 'load':
        handleLoad($pdo, $data);
        break;
    default:
        jsonResponse(['success' => false, 'message' => 'Acao invalida'], 400);
}

function getUserFromToken($pdo, $token) {
    if (empty($token)) {
        return null;
    }

    $stmt = $pdo->prepare("
        SELECT u.id, u.username 
        FROM sessoes s 
        JOIN usuarios u ON s.usuario_id = u.id 
        WHERE s.token = ? AND s.expira_em > NOW()
    ");
    $stmt->execute([$token]);
    return $stmt->fetch();
}

function handleSave($pdo, $data) {
    $token = $data['token'] ?? '';
    $dadosCriptografados = $data['dados'] ?? '';

    $user = getUserFromToken($pdo, $token);
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Sessao invalida'], 401);
    }

    if (empty($dadosCriptografados)) {
        jsonResponse(['success' => false, 'message' => 'Dados nao fornecidos'], 400);
    }

    // Verificar se ja existe dados para o usuario
    $stmt = $pdo->prepare("SELECT id FROM dados_usuario WHERE usuario_id = ?");
    $stmt->execute([$user['id']]);
    $existingData = $stmt->fetch();

    try {
        if ($existingData) {
            // Atualizar dados existentes
            $stmt = $pdo->prepare("
                UPDATE dados_usuario 
                SET dados_criptografados = ?, ultima_atualizacao = NOW() 
                WHERE usuario_id = ?
            ");
            $stmt->execute([$dadosCriptografados, $user['id']]);
        } else {
            // Inserir novos dados
            $stmt = $pdo->prepare("
                INSERT INTO dados_usuario (usuario_id, dados_criptografados, ultima_atualizacao) 
                VALUES (?, ?, NOW())
            ");
            $stmt->execute([$user['id'], $dadosCriptografados]);
        }

        jsonResponse(['success' => true, 'message' => 'Dados salvos com sucesso']);
    } catch (PDOException $e) {
        jsonResponse(['success' => false, 'message' => 'Erro ao salvar dados'], 500);
    }
}

function handleLoad($pdo, $data) {
    $token = $data['token'] ?? '';

    $user = getUserFromToken($pdo, $token);
    if (!$user) {
        jsonResponse(['success' => false, 'message' => 'Sessao invalida'], 401);
    }

    // Buscar dados do usuario
    $stmt = $pdo->prepare("SELECT dados_criptografados FROM dados_usuario WHERE usuario_id = ?");
    $stmt->execute([$user['id']]);
    $result = $stmt->fetch();

    if ($result && !empty($result['dados_criptografados'])) {
        jsonResponse([
            'success' => true,
            'dados' => $result['dados_criptografados']
        ]);
    } else {
        jsonResponse([
            'success' => true,
            'dados' => null
        ]);
    }
}
?>
