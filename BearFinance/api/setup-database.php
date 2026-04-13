<?php
/**
 * Script de Configuracao do Banco de Dados
 * Execute este arquivo uma vez para criar as tabelas necessarias
 * Acesse: seu-dominio.com/api/setup-database.php
 */

// Configuracoes do banco
$host = 'localhost';
$dbname = 'u668423313_financasgante';
$username = 'u668423313_financasgante';
$password = 'Gante2026@';

header('Content-Type: text/html; charset=utf-8');

echo "<h1>Configuracao do Banco de Dados - Financas Gante</h1>";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    echo "<p style='color: green;'>Conexao com banco de dados estabelecida!</p>";

    // Criar tabela de usuarios
    $sql = "CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
    echo "<p style='color: green;'>Tabela 'usuarios' criada/verificada com sucesso!</p>";

    // Criar tabela de sessoes
    $sql = "CREATE TABLE IF NOT EXISTS sessoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expira_em DATETIME NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_expira (expira_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
    echo "<p style='color: green;'>Tabela 'sessoes' criada/verificada com sucesso!</p>";

    // Criar tabela de dados do usuario
    $sql = "CREATE TABLE IF NOT EXISTS dados_usuario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL UNIQUE,
        dados_criptografados LONGTEXT,
        ultima_atualizacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql);
    echo "<p style='color: green;'>Tabela 'dados_usuario' criada/verificada com sucesso!</p>";

    // Limpar sessoes expiradas (rotina de manutencao)
    $sql = "DELETE FROM sessoes WHERE expira_em < NOW()";
    $deleted = $pdo->exec($sql);
    echo "<p>Sessoes expiradas removidas: $deleted</p>";

    echo "<hr>";
    echo "<h2 style='color: green;'>Configuracao concluida com sucesso!</h2>";
    echo "<p>O banco de dados esta pronto para uso.</p>";
    echo "<p><strong>Importante:</strong> Remova ou proteja este arquivo apos a configuracao inicial.</p>";

    // Mostrar estrutura das tabelas
    echo "<hr><h3>Estrutura das Tabelas:</h3>";
    
    $tables = ['usuarios', 'sessoes', 'dados_usuario'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("DESCRIBE $table");
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h4>Tabela: $table</h4>";
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
        echo "<tr><th>Campo</th><th>Tipo</th><th>Null</th><th>Key</th><th>Default</th></tr>";
        
        foreach ($columns as $col) {
            echo "<tr>";
            echo "<td>{$col['Field']}</td>";
            echo "<td>{$col['Type']}</td>";
            echo "<td>{$col['Null']}</td>";
            echo "<td>{$col['Key']}</td>";
            echo "<td>{$col['Default']}</td>";
            echo "</tr>";
        }
        echo "</table><br>";
    }

} catch (PDOException $e) {
    echo "<p style='color: red;'>Erro: " . $e->getMessage() . "</p>";
}
?>
