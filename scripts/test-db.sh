#!/usr/bin/env bash
# Teste les migrations + RLS + triggers sur un PostgreSQL LOCAL jetable (jamais ton projet Supabase).
# Prérequis : PostgreSQL installé et démarré ; l'utilisateur doit pouvoir faire `createdb`.
# Usage : bash scripts/test-db.sh   (variable PSQL pour personnaliser, ex. PSQL="sudo -u postgres psql")
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="${PSQL:-psql}"
DB="joe_test_$$"
$PSQL -q -d postgres -c "create database $DB;"
trap '$PSQL -q -d postgres -c "drop database if exists $DB;" >/dev/null 2>&1 || true' EXIT
run() { $PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }
# Rôles globaux (anon, authenticated…) : ignorés s'ils existent déjà
$PSQL -q -d postgres -c "do \$\$ begin create role anon nologin; exception when duplicate_object then null; end \$\$;" \
  -c "do \$\$ begin create role authenticated nologin; exception when duplicate_object then null; end \$\$;" \
  -c "do \$\$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end \$\$;"
sed '/^create role/d' supabase/tests/00_stub_supabase.sql > /tmp/stub_$$.sql
run /tmp/stub_$$.sql
for f in supabase/migrations/*.sql; do echo "migration: $f"; run "$f" 2>&1 | grep -iv notice || true; done
echo "migrations (2e passage, idempotence)"; for f in supabase/migrations/*.sql; do run "$f" 2>&1 | grep -i error || true; done
$PSQL -q -d "$DB" -f supabase/tests/01_rls_checks.sql 2>&1 | tee /tmp/rls_$$.log | grep -E "NOTICE:  (PASS|FAIL)" || true
$PSQL -q -d "$DB" -f supabase/tests/02_publish_trigger.sql 2>&1 | grep -v '^$'
$PSQL -q -t -A -F ' | ' -d "$DB" -f supabase/tests/03_cv_checks.sql 2>&1 | tee /tmp/cv_$$.log | grep -E "^(PASS|FAIL)|ERROR|^learner" || true
if grep -qE "^FAIL|ERROR|a modifié" /tmp/cv_$$.log; then echo "ÉCHEC : contrôle CV"; exit 1; fi
$PSQL -q -d "$DB" -f supabase/tests/04_training_checks.sql 2>&1 | tee /tmp/train_$$.log | grep -E "NOTICE:  (PASS|FAIL)|ERROR" || true
if grep -qE "NOTICE:  FAIL" /tmp/train_$$.log; then echo "ÉCHEC : parcours formations présentielles"; exit 1; fi
if grep -q "NOTICE:  FAIL" /tmp/rls_$$.log; then echo "ÉCHEC : au moins un contrôle de sécurité a échoué"; exit 1; fi
echo "OK : tous les contrôles SQL passent"
