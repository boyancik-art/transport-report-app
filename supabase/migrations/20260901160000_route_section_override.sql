-- Keep a delivery's manual block choice separate from the imported expeditor.
-- The existing route_facts policies continue to restrict who can edit it.
ALTER TABLE public.route_facts ADD COLUMN IF NOT EXISTS section_override text
  CHECK (section_override IS NULL OR section_override IN
    ('Самовивіз', 'STV', 'SAV', 'ФОП', 'TS', 'Кур’єр', 'Пекарня/Фреш'));
