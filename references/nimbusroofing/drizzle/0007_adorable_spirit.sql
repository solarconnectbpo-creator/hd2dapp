CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fingerprint` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`name` varchar(255),
	`interests` text,
	`painPoints` text,
	`buyerStage` enum('awareness','consideration','decision','customer') DEFAULT 'awareness',
	`preferredContactMethod` enum('email','phone','sms','none'),
	`totalConversations` int NOT NULL DEFAULT 0,
	`totalMessages` int NOT NULL DEFAULT 0,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_fingerprint_unique` UNIQUE(`fingerprint`)
);
