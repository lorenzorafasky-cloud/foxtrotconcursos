import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export const DATA_SUBJECT_REQUEST_TYPES = [
  "ACCESS",
  "CORRECTION",
  "DELETION",
  "PORTABILITY",
  "ANONYMIZATION",
  "CONSENT_WITHDRAWAL",
  "AUTOMATED_DECISION_REVIEW"
] as const;

export const DATA_SUBJECT_REQUEST_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "COMPLETED",
  "REJECTED"
] as const;

export const RESOLVABLE_DATA_SUBJECT_REQUEST_STATUSES = [
  "IN_REVIEW",
  "COMPLETED",
  "REJECTED"
] as const;

export type DataSubjectRequestTypeValue = typeof DATA_SUBJECT_REQUEST_TYPES[number];
export type DataSubjectRequestStatusValue = typeof DATA_SUBJECT_REQUEST_STATUSES[number];

export class RecordConsentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  version!: string;

  @IsBoolean()
  accepted!: boolean;
}

export class CreateDataSubjectRequestDto {
  @IsIn(DATA_SUBJECT_REQUEST_TYPES)
  type!: DataSubjectRequestTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  description?: string;
}

export class ResolveDataSubjectRequestDto {
  @IsIn(RESOLVABLE_DATA_SUBJECT_REQUEST_STATUSES)
  status!: Extract<DataSubjectRequestStatusValue, "IN_REVIEW" | "COMPLETED" | "REJECTED">;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  response?: string;
}
