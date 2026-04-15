const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'your_service_role_key_here') {
  console.error("ERREUR: La clé SUPABASE_SERVICE_ROLE_KEY n'est pas configurée dans .env.local.");
  console.error("Veuillez la configurer pour pouvoir injecter le compte administrateur.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("🚀 Création du compte Super Admin en cours...");
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'forgesemmanuel82@gmail.com',
    password: 'NeatHealerAdmin2026!',
    email_confirm: true,
    user_metadata: { full_name: 'Emmanuel Forges (Admin)' }
  });

  if (error) {
    if (error.message.includes('already been registered')) {
        console.log("✅ Ce compte administrateur existe déjà dans la base de données !");
    } else {
        console.error("❌ Erreur lors de la création :", error);
    }
  } else {
    console.log("✅ Compte administrateur créé avec succès !");
    console.log("Email : forgesemmanuel82@gmail.com");
    console.log("Mot de passe temporaire : NeatHealerAdmin2026!");
    console.log("Note : La table 'tenants' a été automatiquement provisionnée par le trigger SQL.");
  }
}

main();
