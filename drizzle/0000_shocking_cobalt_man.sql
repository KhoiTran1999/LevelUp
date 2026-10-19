CREATE TABLE "bank_pool" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"pool_gold" integer DEFAULT 500,
	"total_borrowed" integer DEFAULT 0,
	"reserve_fund" integer DEFAULT 150,
	"total_deposited" integer DEFAULT 0,
	"bailout_debt" integer DEFAULT 0,
	"last_accrued_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '',
	"category" varchar(64) DEFAULT 'general',
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_game_states" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"active_timer" jsonb,
	"last_synced_at" timestamp with time zone,
	"last_modified" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"picture" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"nickname" varchar(64),
	"name" varchar(255),
	"avatar" text,
	"role" varchar(32) DEFAULT 'adventurer',
	"title" varchar(128) DEFAULT 'Tân Binh Cấp 1',
	"level" integer DEFAULT 1,
	"exp" integer DEFAULT 0,
	"coins" integer DEFAULT 20,
	"total_coins_earned" integer DEFAULT 20,
	"total_coins_spent" integer DEFAULT 0,
	"streak" integer DEFAULT 0,
	"net_worth" integer DEFAULT 20,
	"is_cheater" boolean DEFAULT false,
	"last_online_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_game_states" ADD CONSTRAINT "user_game_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notes_user" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notes_category" ON "notes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_users_coins" ON "users" USING btree ("coins");--> statement-breakpoint
CREATE INDEX "idx_users_net_worth" ON "users" USING btree ("net_worth");--> statement-breakpoint
CREATE INDEX "idx_users_nickname" ON "users" USING btree ("nickname");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_cheater" ON "users" USING btree ("is_cheater");