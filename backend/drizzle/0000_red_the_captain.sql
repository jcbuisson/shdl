CREATE TYPE "public"."Tab" AS ENUM('users', 'groups', 'shdl_tests', 'craps_tests', 'followup', 'workshop', 'grade');--> statement-breakpoint
CREATE TABLE "group" (
	"uid" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "group_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "group_slot" (
	"uid" text NOT NULL,
	"group_uid" text NOT NULL,
	"name" text NOT NULL,
	"start" timestamp NOT NULL,
	"end" timestamp NOT NULL,
	CONSTRAINT "group_slot_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "groupslot_shdltest_relation" (
	"uid" text NOT NULL,
	"group_slot_uid" text NOT NULL,
	"shdl_test_uid" text NOT NULL,
	CONSTRAINT "groupslot_shdltest_relation_uid_unique" UNIQUE("uid"),
	CONSTRAINT "groupslot_shdltest_relation_group_slot_uid_shdl_test_uid_unique" UNIQUE("group_slot_uid","shdl_test_uid")
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"uid" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "metadata_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "shdl_test" (
	"uid" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'shdl' NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"test_statements" text,
	"memory_contents" text,
	CONSTRAINT "shdl_test_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"uid" text NOT NULL,
	"email" text,
	"password" text,
	"firstname" text,
	"lastname" text,
	"pict" text DEFAULT '/static/img/avatar.svg' NOT NULL,
	"notes" text,
	CONSTRAINT "user_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_document" (
	"uid" text NOT NULL,
	"user_uid" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"text" text NOT NULL,
	"update_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_document_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "user_document_event" (
	"uid" text NOT NULL,
	"document_uid" text NOT NULL,
	"type" text NOT NULL,
	"start" timestamp NOT NULL,
	"end" timestamp,
	CONSTRAINT "user_document_event_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "user_group_relation" (
	"uid" text NOT NULL,
	"user_uid" text NOT NULL,
	"group_uid" text NOT NULL,
	CONSTRAINT "user_group_relation_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_group_relation_user_uid_group_uid_unique" UNIQUE("user_uid","group_uid")
);
--> statement-breakpoint
CREATE TABLE "user_shdltest_relation" (
	"uid" text NOT NULL,
	"user_uid" text NOT NULL,
	"shdl_test_uid" text NOT NULL,
	"first_try_date" timestamp,
	"last_try_date" timestamp,
	"success_date" timestamp,
	"update_count" integer DEFAULT 0 NOT NULL,
	"evaluation" integer,
	CONSTRAINT "user_shdltest_relation_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_shdltest_relation_user_uid_shdl_test_uid_unique" UNIQUE("user_uid","shdl_test_uid")
);
--> statement-breakpoint
CREATE TABLE "user_slot_excuse" (
	"uid" text NOT NULL,
	"user_uid" text NOT NULL,
	"group_slot_uid" text NOT NULL,
	CONSTRAINT "user_slot_excuse_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_slot_excuse_user_uid_group_slot_uid_unique" UNIQUE("user_uid","group_slot_uid")
);
--> statement-breakpoint
CREATE TABLE "user_tab_relation" (
	"uid" text NOT NULL,
	"user_uid" text NOT NULL,
	"tab" "Tab" NOT NULL,
	CONSTRAINT "user_tab_relation_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_tab_relation_user_uid_tab_unique" UNIQUE("user_uid","tab")
);
