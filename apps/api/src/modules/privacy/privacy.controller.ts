import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { Request } from "express";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { AuditAction } from "../../security/audit.decorator";
import { RequireRoles } from "../../security/roles.decorator";
import {
  CreateDataSubjectRequestDto,
  DataSubjectRequestStatusValue,
  RecordConsentDto,
  ResolveDataSubjectRequestDto
} from "./privacy.dto";
import { PrivacyService } from "./privacy.service";

@ApiTags("privacy")
@Controller("privacy")
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @AuditAction("privacy.consent.record")
  @Post("consents")
  recordConsent(
    @CurrentUser() user: AuthUser,
    @Body() body: RecordConsentDto,
    @Req() request: Request & { requestId?: string }
  ) {
    return this.privacy.recordConsent(user.id, body, this.requestContext(request));
  }

  @Get("consents")
  listConsents(@CurrentUser() user: AuthUser) {
    return this.privacy.listConsents(user.id);
  }

  @Get("me/export")
  exportMyData(@CurrentUser() user: AuthUser) {
    return this.privacy.exportMyData(user.id);
  }

  @AuditAction("privacy.request.create")
  @Post("requests")
  createRequest(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateDataSubjectRequestDto,
    @Req() request: Request & { requestId?: string }
  ) {
    return this.privacy.createRequest(user.id, body, this.requestContext(request));
  }

  @Get("requests")
  listMyRequests(@CurrentUser() user: AuthUser) {
    return this.privacy.listMyRequests(user.id);
  }

  @RequireRoles("ADMIN_MASTER")
  @Get("admin/requests")
  listRequests(@Query("status") status?: DataSubjectRequestStatusValue) {
    return this.privacy.listRequests(status);
  }

  @RequireRoles("ADMIN_MASTER")
  @AuditAction("privacy.request.resolve")
  @Patch("admin/requests/:id")
  resolveRequest(@Param("id") id: string, @Body() body: ResolveDataSubjectRequestDto) {
    return this.privacy.resolveRequest(id, body);
  }

  private requestContext(request: Request & { requestId?: string }) {
    return {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.header("user-agent")
    };
  }
}
