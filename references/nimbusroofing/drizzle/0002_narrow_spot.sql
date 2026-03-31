CREATE TABLE `weatherAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nwsId` varchar(255) NOT NULL,
	`event` varchar(255) NOT NULL,
	`headline` text,
	`description` text,
	`severity` varchar(50),
	`urgency` varchar(50),
	`onset` timestamp,
	`expires` timestamp,
	`areaDesc` text,
	`isStormRelated` boolean NOT NULL DEFAULT false,
	`contentTriggered` boolean NOT NULL DEFAULT false,
	`blogPostId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weatherAlerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `weatherAlerts_nwsId_unique` UNIQUE(`nwsId`)
);
