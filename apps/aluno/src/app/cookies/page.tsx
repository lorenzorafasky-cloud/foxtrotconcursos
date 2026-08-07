import { LegalPage } from "../../components/LegalPage";

export default function CookiesPage() {
  return (
    <LegalPage title="Politica de cookies" updatedAt="07/08/2026">
      <section>
        <h2>Categorias</h2>
        <ul>
          <li>Necessarios: autenticacao, sessao, seguranca, prevencao de fraude e preferencias essenciais.</li>
          <li>Metricas: desempenho, erros, funis e uso agregado para melhoria do produto.</li>
          <li>Marketing: campanhas, atribuicao e comunicacoes personalizadas, quando configuradas.</li>
        </ul>
      </section>
      <section>
        <h2>Consentimento</h2>
        <p>
          O banner permite aceitar, rejeitar ou personalizar cookies nao essenciais. A preferencia fica salva no navegador por versao de politica. Cookies necessarios permanecem ativos porque sustentam a prestacao do servico.
        </p>
      </section>
      <section>
        <h2>Alteracao de preferencia</h2>
        <p>
          O usuario pode limpar o armazenamento local do navegador para exibir o banner novamente. Antes do lancamento, a operacao deve conectar o historico de consentimento autenticado ao endpoint `POST /privacy/consents` quando houver login.
        </p>
      </section>
      <section>
        <h2>Operadores</h2>
        <p>
          Monitoramento, metricas, pagamentos, video, IA e CDN podem gerar cookies ou identificadores tecnicos. A lista final de operadores deve ser revisada sempre que uma integracao nova for ativada.
        </p>
      </section>
    </LegalPage>
  );
}
