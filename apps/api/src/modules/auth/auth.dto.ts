import { IsArray, IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  fullName!: string;

  @IsString()
  nickname!: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  twoFactorCode?: string;

  @IsOptional()
  @IsString()
  backupCode?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}

export class VerifyTotpDto {
  @IsString()
  code!: string;
}

export class OnboardingDto {
  @IsInt()
  @Min(13)
  @Max(100)
  age!: number;

  @IsString()
  studyExperience!: string;

  @IsString()
  careerGoal!: string;

  @IsOptional()
  @IsString()
  targetExamId?: string;

  @IsArray()
  @IsString({ each: true })
  platformGoals!: string[];

  @IsInt()
  @Min(15)
  dailyNetStudyGoalMins!: number;

  @IsOptional()
  @IsInt()
  weeklyQuestionGoal?: number;

  @IsOptional()
  @IsString()
  examDate?: string;
}
