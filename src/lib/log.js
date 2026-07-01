import { supabase } from './supabase'

/**
 * Registra uma atividade no log do sistema.
 *
 * @param {string} acao - O que foi feito (ex: 'importou', 'excluiu', 'criou', 'editou', 'agendou')
 * @param {string} entidade - Onde foi feito (ex: 'nota_fiscal', 'produto', 'coleta')
 * @param {string} descricao - Texto legível descrevendo a ação (ex: 'Importou NF 12345 como ENTRADA')
 * @param {string} entidade_id - ID do registro afetado (opcional)
 */
export async function registrarLog(
  acao,
  entidade,
  descricao,
  entidade_id = null,
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('log_atividades').insert({
      usuario_email: user.email,
      acao,
      entidade,
      descricao,
      entidade_id: entidade_id ? String(entidade_id) : null,
    })
  } catch (err) {
    // Log nunca deve quebrar o fluxo principal do app
    console.warn('Erro ao registrar log:', err)
  }
}
