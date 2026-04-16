-- ============================================================
-- NeatHealer — Admin Security & Pre-provisioning
-- This file secures the super-admin identity and pre-creates 
-- the admin user to prevent signup takeovers.
-- ============================================================

-- 1. Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Define Admin Identity
DO $$
DECLARE
    v_admin_email TEXT := 'forgesemmanuel82@gmail.com';
    v_admin_id    UUID := gen_random_uuid();
    v_password    TEXT := 'NeatHealerAdmin2026!'; -- CHANGE THIS AFTER FIRST LOGIN
BEGIN
    -- Check if user already exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_admin_email) THEN
        
        -- Insert into auth.users (Supabase Auth internal table)
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_admin_id,
            'authenticated',
            'authenticated',
            v_admin_email,
            crypt(v_password, gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', 'Super Admin'),
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        -- Also ensure the tenant exists for this user
        -- (The trigger create_tenant_on_signup will handle it automatically 
        -- but we can force it here just in case if we want custom plan)
        INSERT INTO public.tenants (user_id, name, plan)
        VALUES (v_admin_id, 'Super Admin', 'unlimited')
        ON CONFLICT (user_id) DO UPDATE SET plan = 'unlimited';

        RAISE NOTICE 'Admin user % created successfully.', v_admin_email;
    ELSE
        RAISE NOTICE 'Admin user % already exists. Skipping creation.', v_admin_email;
    END IF;
END $$;

-- 3. Security Hardening: Protect naming convention
-- Ensure no one can sign up with an email containing "admin" or "neathealer" 
-- unless they are explicitly authorized.
CREATE OR REPLACE FUNCTION public.check_admin_signup_security()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (NEW.email LIKE '%admin%' OR NEW.email LIKE '%neathealer%') 
       AND NEW.email != 'forgesemmanuel82@gmail.com' THEN
        RAISE EXCEPTION 'SECURITY_ALERT: Unauthorized use of protected identity keywords.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_admin_signup_security ON auth.users;
CREATE TRIGGER tr_admin_signup_security
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.check_admin_signup_security();
