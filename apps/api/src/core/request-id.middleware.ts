import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request & { requestId?: string }, response: Response, next: NextFunction) {
    const incoming = request.header(REQUEST_ID_HEADER);
    const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
