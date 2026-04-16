# NeatHealer: Guide Technique & État du Projet

Ce document résume l'architecture implémentée et les fonctionnalités clés de la plateforme NeatHealer.

## 🤖 1. AI Surgeon (Chirurgie Autonome)
Le cœur de NeatHealer est sa capacité à réparer les sites de manière autonome.
- **Moteur de Décision** : L'IA analyse les messages d'erreurs réels et génère du code SQL correctif.
- **Sécurité (Bootstrap SQL)** : Les clients doivent installer le script `docs/neathealer_surge_bootstrap.sql` pour autoriser l'exécution sécurisée des réparations via RPC.
- **Mode Validation** : Par défaut, les réparations SQL sont mises en file d'attente (`SurgeonQueue`) pour validation humaine avant exécution.

## 🛡️ 2. Guardian Mode (Meta-Monitoring)
NeatHealer se surveille lui-même pour garantir une disponibilité maximale.
- **Heartbeat & Watchdog** : Un script Postgres (`system_watchdog`) vérifie le "pouls" de l'orchestrateur toutes les 2 minutes. En cas de blocage, il tente de relancer le processus.
- **Platform Health** : Une interface admin (`components/PlatformHealth.tsx`) affiche les constantes vitales de l'infrastructure en temps réel.

## 🎚️ 3. Intelligent Autonomy Switch
Permet de moduler la confiance accordée à l'IA pour chaque projet :
- **Advisor** : Alerte uniquement, validation humaine requise pour tout.
- **Guardian** : Auto-restart/rollback autorisés, mais SQL manuel.
- **Surgeon** : Autonomie totale (SQL automatisé). **Réservé aux plans Premium/Enterprise.**

## 💳 4. Monétisation Stripe
- **Plans gérés** : Basic (limité), Premium, Enterprise.
- **Webhooks** : Synchronisation automatique des quotas et statuts d'abonnement.
- **Verrouillage UI** : Le mode Surgeon est visuellement verrouillé (badge PRO) pour les utilisateurs gratuits.

## 🔧 5. Maintenance & Build
- **Client Supabase** : Utiliser impérativement `lib/supabaseServer.ts` pour les routes API (compatible Next.js 15+ / Turbopack). Éviter `createRouteHandlerClient`.
- **Diagnostic** : Les routes sous `/api/admin` retournent désormais des messages d'erreurs détaillés (`PostgREST error`, etc.) pour faciliter le débogage.

## 🚀 6. Lancement
L'application est configurée pour être lancée sur le port **3001** pour éviter les conflits.
Commande : `npm run dev -- -p 3001`
