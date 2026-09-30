-- ============================================
-- Módulo de Controle de Paletes - Vale Palete
-- ============================================

-- Tabela: Tipos de Palete (PBR, EUR, etc.)
CREATE TABLE IF NOT EXISTS tipos_palete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(10) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Transportadoras
CREATE TABLE IF NOT EXISTS transportadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  telefone VARCHAR(20),
  email VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Vale Palete
CREATE TABLE IF NOT EXISTS vale_palete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(20) UNIQUE NOT NULL,
  data_emissao TIMESTAMPTZ DEFAULT now(),
  transportadora_id UUID REFERENCES transportadoras(id),
  motorista VARCHAR(100) NOT NULL,
  placa VARCHAR(10) NOT NULL,
  tipo_palete_id UUID REFERENCES tipos_palete(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN ('RETIRADA', 'DEVOLUCAO')),
  observacoes TEXT,
  assinatura_conferente_transportadora VARCHAR(100),
  assinatura_conferente_cd VARCHAR(100),
  status VARCHAR(20) DEFAULT 'EMITIDO' CHECK (status IN ('EMITIDO', 'ASSINADO', 'CANCELADO')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_vale_palete_transportadora ON vale_palete(transportadora_id);
CREATE INDEX IF NOT EXISTS idx_vale_palete_data ON vale_palete(data_emissao);
CREATE INDEX IF NOT EXISTS idx_vale_palete_status ON vale_palete(status);

-- View: Saldo devedor por transportadora e tipo de palete
CREATE OR REPLACE VIEW saldo_paletes AS
SELECT
  t.id AS transportadora_id,
  t.nome_fantasia AS transportadora,
  tp.id AS tipo_palete_id,
  tp.nome AS tipo_palete,
  COALESCE(SUM(CASE WHEN vp.tipo_movimentacao = 'RETIRADA' THEN vp.quantidade ELSE -vp.quantidade END), 0) AS saldo_devedor
FROM transportadoras t
CROSS JOIN tipos_palete tp
LEFT JOIN vale_palete vp ON vp.transportadora_id = t.id AND vp.tipo_palete_id = tp.id AND vp.status != 'CANCELADO'
WHERE t.ativo = true AND tp.ativo = true
GROUP BY t.id, t.nome_fantasia, tp.id, tp.nome;

-- Dados iniciais: Tipos de palete padrão
INSERT INTO tipos_palete (codigo, nome, descricao) VALUES
  ('PBR', 'Palete PBR', 'Palete padrão brasileiro'),
  ('EUR', 'Palete EUR', 'Palete europeu (EPAL)'),
  ('PLAST', 'Palete Plástico', 'Palete plástico')
ON CONFLICT (codigo) DO NOTHING;
