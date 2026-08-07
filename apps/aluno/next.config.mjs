/**
 * Multi-zone do banco de questoes (Secao 4 do Prompt Mestre):
 * o subdominio `questoes.foxtrotconcursos.com.br` e servido por este mesmo
 * app via rewrites baseados em Host — a rota `/questoes/*` responde na raiz
 * do subdominio. A autenticacao e compartilhada pelo cookie no dominio raiz
 * (`COOKIE_DOMAIN=.foxtrotconcursos.com.br`).
 */
const questoesHost = process.env.NEXT_PUBLIC_QUESTOES_HOST ?? "questoes.foxtrotconcursos.com.br";

const nextConfig = {
  transpilePackages: ["@foxtrot/ui", "@foxtrot/shared-types"],
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: questoesHost }],
          destination: "/questoes"
        },
        {
          source: "/:path((?!questoes|_next|api|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
          has: [{ type: "host", value: questoesHost }],
          destination: "/questoes/:path"
        }
      ],
      afterFiles: [],
      fallback: []
    };
  }
};

export default nextConfig;
