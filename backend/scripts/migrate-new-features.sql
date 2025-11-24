-- Migration para adicionar novos campos e tabelas
-- Execute este script se a migration automática do Prisma falhar

-- Adicionar novos campos à tabela buses (se não existirem)
DO $$ 
BEGIN
    -- Adicionar brand se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='buses' AND column_name='brand') THEN
        ALTER TABLE buses ADD COLUMN brand TEXT;
    END IF;

    -- Adicionar model se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='buses' AND column_name='model') THEN
        ALTER TABLE buses ADD COLUMN model TEXT;
    END IF;

    -- Adicionar year se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='buses' AND column_name='year') THEN
        ALTER TABLE buses ADD COLUMN year INTEGER;
    END IF;

    -- Adicionar chassisNumber se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='buses' AND column_name='chassisNumber') THEN
        ALTER TABLE buses ADD COLUMN "chassisNumber" TEXT;
    END IF;

    -- Adicionar currentMileage se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='buses' AND column_name='currentMileage') THEN
        ALTER TABLE buses ADD COLUMN "currentMileage" INTEGER DEFAULT 0;
    END IF;

    -- Adicionar lastMileageUpdate se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='buses' AND column_name='lastMileageUpdate') THEN
        ALTER TABLE buses ADD COLUMN "lastMileageUpdate" TIMESTAMP;
    END IF;
END $$;

-- Atualizar currentMileage para 0 onde for NULL
UPDATE buses SET "currentMileage" = 0 WHERE "currentMileage" IS NULL;



