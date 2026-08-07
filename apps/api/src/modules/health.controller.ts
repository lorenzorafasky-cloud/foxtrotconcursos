import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../security/public.decorator";

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  @Get()
  status() {
    return { ok: true, service: "foxtrot-api", time: new Date().toISOString() };
  }
}
