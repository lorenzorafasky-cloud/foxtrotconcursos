resource "cloudflare_r2_bucket" "assets" {
  account_id = var.account_id
  name       = "foxtrot-assets"
}

resource "cloudflare_turnstile_widget" "auth" {
  account_id = var.account_id
  name       = "foxtrot-auth"
  domains    = [var.root_domain, "www.${var.root_domain}", "questoes.${var.root_domain}"]
  mode       = "managed"
}

resource "cloudflare_dns_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  content = var.api_origin
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "aluno" {
  zone_id = var.zone_id
  name    = "app"
  content = var.student_origin
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "questoes" {
  zone_id = var.zone_id
  name    = "questoes"
  content = var.student_origin
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "admin" {
  zone_id = var.zone_id
  name    = "admin"
  content = var.admin_origin
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "professor" {
  zone_id = var.zone_id
  name    = "professor"
  content = var.professor_origin
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_ruleset" "managed_waf" {
  zone_id     = var.zone_id
  name        = "foxtrot-managed-waf"
  description = "Managed rules para protecao base da plataforma."
  kind        = "zone"
  phase       = "http_request_firewall_managed"

  rules = [{
    action = "execute"
    expression = "true"
    description = "Cloudflare Managed Ruleset"
    action_parameters = {
      id = "efb7b8c949ac4650a09736fc376e9aee"
    }
  }]
}

resource "cloudflare_ruleset" "rate_limit_auth" {
  zone_id     = var.zone_id
  name        = "foxtrot-auth-rate-limit"
  description = "Rate limiting para login, cadastro e API."
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [{
    action      = "block"
    description = "Bloqueia excesso em rotas sensiveis"
    expression  = "(http.request.uri.path contains \"/auth\" or http.request.uri.path contains \"/api\")"
    ratelimit = {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 120
      mitigation_timeout  = 600
    }
  }]
}

resource "cloudflare_ruleset" "cache_static" {
  zone_id     = var.zone_id
  name        = "foxtrot-static-cache"
  description = "Cache de assets estaticos dos frontends."
  kind        = "zone"
  phase       = "http_request_cache_settings"

  rules = [{
    action      = "set_cache_settings"
    description = "Cache agressivo para assets versionados"
    expression  = "(http.request.uri.path contains \"/_next/static\" or http.request.uri.path contains \"/assets/\")"
    action_parameters = {
      cache = true
      edge_ttl = {
        mode    = "override_origin"
        default = 31536000
      }
    }
  }]
}

# --- Bot Fight Mode (Secao 12 do Prompt Mestre) ---
resource "cloudflare_bot_management" "fight_mode" {
  zone_id    = var.zone_id
  fight_mode = true
}

# --- WAF custom rules (defesa alem das managed rules) ---
resource "cloudflare_ruleset" "custom_waf" {
  zone_id     = var.zone_id
  name        = "foxtrot-custom-waf"
  description = "Regras customizadas: endurecimento das rotas de autenticacao e webhooks."
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules = [
    {
      action      = "block"
      description = "Bloqueia POST de autenticacao sem User-Agent (automacao trivial)"
      expression  = "(http.request.uri.path contains \"/auth/\" and http.request.method eq \"POST\" and len(http.user_agent) == 0)"
    },
    {
      action      = "managed_challenge"
      description = "Desafio gerenciado em tentativas de login/cadastro com score de bot baixo"
      expression  = "(http.request.uri.path in {\"/auth/login\" \"/auth/register\"} and http.request.method eq \"POST\" and cf.bot_management.score lt 30)"
    },
    {
      action      = "block"
      description = "Webhook do Stream so aceita POST"
      expression  = "(http.request.uri.path contains \"/media/webhooks/\" and http.request.method ne \"POST\")"
    }
  ]
}

# --- Cloudflare Access (Zero Trust) no painel admin ---
resource "cloudflare_zero_trust_access_application" "admin" {
  count            = length(var.access_allowed_emails) > 0 ? 1 : 0
  zone_id          = var.zone_id
  name             = "Foxtrot Admin"
  domain           = "admin.${var.root_domain}"
  type             = "self_hosted"
  session_duration = "12h"
}

resource "cloudflare_zero_trust_access_policy" "admin_allow" {
  count          = length(var.access_allowed_emails) > 0 ? 1 : 0
  application_id = cloudflare_zero_trust_access_application.admin[0].id
  zone_id        = var.zone_id
  name           = "Equipe autorizada"
  decision       = "allow"
  include = [
    for email in var.access_allowed_emails : { email = { email = email } }
  ]
}
