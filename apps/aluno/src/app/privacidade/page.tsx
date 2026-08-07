import Link from "next/link";
import { LegalPage } from "../../components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="Politica de privacidade" updatedAt="07/08/2026">
      <section>
        <h2>Dados tratados</h2>
        <ul>
          <li>Dados de conta: nome, e-mail, apelido publico, senha protegida e configuracoes de seguranca.</li>
          <li>Dados de estudo: progresso, aulas, questoes, simulados, anotacoes, foco, flashcards e desempenho.</li>
          <li>Dados financeiros: planos, assinaturas, pagamentos, cupons e status de acesso.</li>
          <li>Dados tecnicos: IP, user agent, logs de auditoria, eventos de erro, metricas e consentimentos.</li>
          <li>Dados de IA: prompts, contexto necessario, resposta, custo estimado e revisao humana quando aplicavel.</li>
        </ul>
      </section>
      <section>
        <h2>Finalidades</h2>
        <p>
          Os dados sao usados para autenticar usuarios, entregar cursos, calcular progresso, operar pagamentos, prevenir abuso, prestar suporte, melhorar a plataforma, cumprir obrigacoes legais e oferecer recursos assistidos por IA quando autorizados.
        </p>
      </section>
      <section>
        <h2>Compartilhamento</h2>
        <p>
          A plataforma pode usar operadores de hospedagem, banco de dados, pagamento, e-mail, monitoramento, armazenamento, streaming e IA. Cada operador deve receber apenas os dados necessarios para a finalidade contratada.
        </p>
      </section>
      <section>
        <h2>Retencao</h2>
        <p>
          Dados de conta e estudo sao mantidos enquanto houver relacao ativa ou necessidade operacional. Logs de seguranca, auditoria, pagamentos e consentimentos seguem prazos descritos na documentacao operacional.
        </p>
      </section>
      <section>
        <h2>Direitos do titular</h2>
        <p>
          O usuario pode solicitar acesso, correcao, portabilidade, exclusao, anonimizacao, revogacao de consentimento e revisao de decisoes automatizadas pela area <Link className="font-semibold text-foxtrot-300" href="/lgpd">LGPD</Link>.
        </p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          Cookies necessarios mantem login e seguranca. Cookies de metricas e marketing dependem de consentimento. Veja a <Link className="font-semibold text-foxtrot-300" href="/cookies">Politica de Cookies</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
