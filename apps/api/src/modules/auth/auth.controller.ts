import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { Public } from "../../security/public.decorator";
import { AuthService } from "./auth.service";
import { LoginDto, OnboardingDto, RegisterDto, VerifyTotpDto } from "./auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Public()
  @Post("login")
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body);
    if ("accessToken" in result) this.setCookies(response, result.accessToken, result.refreshToken);
    return result;
  }

  @Public()
  @Post("refresh")
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(request.cookies?.refresh_token as string | undefined);
    this.setCookies(response, result.accessToken, result.refreshToken);
    return result;
  }

  @Post("logout")
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: Response) {
    response.clearCookie("access_token");
    response.clearCookie("refresh_token");
    return this.auth.logout(user.id);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Post("2fa/setup")
  setupTotp(@CurrentUser() user: AuthUser) {
    return this.auth.createTotpSetup(user.id);
  }

  @Post("2fa/verify")
  verifyTotp(@CurrentUser() user: AuthUser, @Body() body: VerifyTotpDto) {
    return this.auth.verifyTotp(user.id, body.code);
  }

  @Post("onboarding")
  onboarding(@CurrentUser() user: AuthUser, @Body() body: OnboardingDto) {
    return this.auth.onboarding(user.id, body);
  }

  private setCookies(response: Response, accessToken: string, refreshToken: string) {
    const secure = process.env.NODE_ENV === "production";
    const domain = process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN !== "localhost"
      ? process.env.COOKIE_DOMAIN
      : undefined;
    response.cookie("access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      domain,
      maxAge: 15 * 60 * 1000
    });
    response.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      domain,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }
}
