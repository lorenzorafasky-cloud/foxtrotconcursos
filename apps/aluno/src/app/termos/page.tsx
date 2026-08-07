import Link from "next/link";
import { LegalPage } from "../../components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage title="Termos de uso" updatedAt="07/08/2026">
      <section>
        <h2>Uso da plataforma</h2>
        <p>
          A Foxtrot Concursos oferece recursos de estudo, cursos, aulas, questoes, simulados, produtividade, pagamentos e ferramentas assistidas por IA. O acesso depende do tipo de conta, plano, matricula e permissoes vinculadas ao usuario.
        </p>
      </section>
      <section>
        <h2>Conta e seguranca</h2>
        <ul>
          <li>O usuario deve manter e-mail, senha e segundo fator protegidos.</li>
          <li>Credenciais nao podem ser compartilhadas.</li>
          <li>A plataforma pode bloquear sessoes ou acoes suspeitas para proteger contas e conteudo.</li>
        </ul>
      </section>
      <section>
        <h2>Conteudo e conduta</h2>
        <p>
          Materiais, aulas, questoes, simulados e respostas de professores sao protegidos por direitos autorais e regras de acesso. E proibido copiar, redistribuir, revender ou automatizar uso sem autorizacao.
        </p>
      </section>
      <section>
        <h2>IA e decisoes automatizadas</h2>
        <p>
          Recursos de IA apoiam estudo, busca e organizacao de materiais. Conteudo gerado para publicacao passa por revisao humana quando aplicavel. A IA nao substitui orientacao profissional, pedagogica ou juridica.
        </p>
      </section>
      <section>
        <h2>Pagamentos</h2>
        <p>
          Planos, assinaturas, cupons e cancelamentos seguem as condicoes exibidas no checkout e no historico financeiro. Eventos de pagamento sao confirmados por provedor externo e podem levar alguns minutos para refletir no acesso.
        </p>
      </section>
      <section>
        <h2>Privacidade</h2>
        <p>
          O tratamento de dados pessoais esta descrito na <Link className="font-semibold text-foxtrot-300" href="/privacidade">Politica de Privacidade</Link>. Estes termos devem ser revisados juridicamente antes do lancamento publico.
        </p>
      </section>
    </LegalPage>
  );
}
