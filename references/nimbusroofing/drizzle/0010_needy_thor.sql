CREATE TABLE `ctaInteractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(255),
	`userFingerprint` varchar(255),
	`ctaType` varchar(50),
	`ctaText` text,
	`ctaContext` text,
	`phone` varchar(20),
	`email` varchar(320),
	`name` varchar(255),
	`clicked` boolean NOT NULL DEFAULT false,
	`converted` boolean NOT NULL DEFAULT false,
	`source` varchar(50) NOT NULL DEFAULT 'chatbot',
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ctaInteractions_id` PRIMARY KEY(`id`)
);
