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
