import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  status() {
    return { ok: true, service: "foxtrot-api", time: new Date().toISOString() };
  }
}
