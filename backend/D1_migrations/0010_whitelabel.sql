-- WHITE-LABEL / BRANDING SUPPORT
ALTER TABLE companies ADD COLUMN branding TEXT DEFAULT '{}';
ALTER TABLE companies ADD COLUMN custom_domain TEXT;
ALTER TABLE companies ADD COLUMN smtp_config TEXT;
ALTER TABLE companies ADD COLUMN sms_footer TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN ai_voice TEXT DEFAULT 'default';

CREATE INDEX idx_companies_custom_domain ON companies(custom_domain);
