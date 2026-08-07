import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateCourseDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  description!: string;

  @IsIn(["PRE_EDITAL", "POS_EDITAL"])
  status!: "PRE_EDITAL" | "POS_EDITAL";

  @IsString()
  careerId!: string;

  @IsOptional()
  @IsString()
  boardId?: string;

  @IsString()
  area!: string;
}

export class ImportQuestionDto {
  @IsString()
  code!: string;

  @IsIn(["MULTIPLE_CHOICE", "TRUE_FALSE", "DISCURSIVE"])
  kind!: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "DISCURSIVE";

  @IsString()
  statement!: string;

  @IsOptional()
  alternatives?: unknown;

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsInt()
  @Min(1900)
  year!: number;

  @IsString()
  board!: string;

  @IsString()
  career!: string;

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsString()
  institution!: string;

  @IsString()
  position!: string;

  @IsOptional()
  @IsString()
  sourceExam?: string;

  @IsOptional()
  @IsString()
  explanation?: string;
}

export class ImportQuestionBatchDto {
  @IsArray()
  questions!: ImportQuestionDto[];
}
