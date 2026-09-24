CREATE TYPE "public"."entry_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."member_ledger_kind" AS ENUM('opening_balance', 'yearly_fee', 'charge', 'waiver', 'payment');--> statement-breakpoint
CREATE TYPE "public"."loan_entry_kind" AS ENUM('borrowed', 'repaid');--> statement-breakpoint
CREATE TYPE "public"."member_category" AS ENUM('regular', 'executive', 'advisor', 'prospective');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" integer,
	"summary" text NOT NULL,
	"before" jsonb,
	"after" jsonb
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"type" "entry_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_id_type_unique" UNIQUE("id","type")
);
--> statement-breakpoint
CREATE TABLE "lenders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lenders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lenders_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "loan_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "loan_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lender_id" integer NOT NULL,
	"date" date NOT NULL,
	"kind" "loan_entry_kind" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_entries_amount_positive" CHECK ("loan_entries"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "member_ledger" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "member_ledger_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"member_id" integer NOT NULL,
	"date" date NOT NULL,
	"kind" "member_ledger_kind" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_ledger_amount_sign" CHECK ("member_ledger"."amount" > 0 or ("member_ledger"."kind" = 'opening_balance' and "member_ledger"."amount" <> 0))
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"old_code" text,
	"name" text NOT NULL,
	"category" "member_category" NOT NULL,
	"member_type" text,
	"phone" text,
	"registered_on" date,
	"yearly_fee" numeric(12, 2),
	"assigned_to" text,
	"blood_group" text,
	"date_of_birth" date,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" date NOT NULL,
	"particulars" text NOT NULL,
	"type" "entry_type" NOT NULL,
	"category_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"member_id" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_member_only_on_income" CHECK ("transactions"."member_id" is null or "transactions"."type" = 'income')
);
--> statement-breakpoint
ALTER TABLE "loan_entries" ADD CONSTRAINT "loan_entries_lender_id_lenders_id_fk" FOREIGN KEY ("lender_id") REFERENCES "public"."lenders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_ledger" ADD CONSTRAINT "member_ledger_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_type_categories_id_type_fk" FOREIGN KEY ("category_id","type") REFERENCES "public"."categories"("id","type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_at_index" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "loan_entries_lender_id_date_index" ON "loan_entries" USING btree ("lender_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "member_ledger_one_yearly_fee_per_year" ON "member_ledger" USING btree ("member_id",extract(year from "date")) WHERE "member_ledger"."kind" = 'yearly_fee';--> statement-breakpoint
CREATE INDEX "member_ledger_member_id_date_index" ON "member_ledger" USING btree ("member_id","date");--> statement-breakpoint
CREATE INDEX "transactions_date_index" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "transactions_member_id_index" ON "transactions" USING btree ("member_id");