-- =====================================================
-- Schema do Banco de Dados - Financas Gante
-- Hostinger MySQL Database
-- =====================================================

-- Usar o banco de dados
USE u668423313_financasgante;

-- Remover tabelas existentes (em ordem correta por causa das foreign keys)
DROP TABLE IF EXISTS dados_usuario;
DROP TABLE IF EXISTS sessoes;
DROP TABLE IF EXISTS usuarios;

-- =====================================================
-- Tabela de Usuarios
-- =====================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Tabela de Sessoes
-- =====================================================
CREATE TABLE sessoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expira_em DATETIME NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expira (expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Tabela de Dados do Usuario (dados criptografados)
-- =====================================================
CREATE TABLE dados_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE,
    dados_criptografados LONGTEXT,
    ultima_atualizacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Evento para limpar sessoes expiradas (opcional)
-- =====================================================
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS limpar_sessoes_expiradas
-- ON SCHEDULE EVERY 1 HOUR
-- DO DELETE FROM sessoes WHERE expira_em < NOW();
