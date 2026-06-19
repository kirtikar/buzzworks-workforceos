#!/usr/bin/env bash
# Auto-restart wrapper for the by-TSN Fieldglass scraper.
#
# The scraper crashes every few hours on a re-login navigation timeout
# (SAP rate-limits the gateway intermittently). The script is fully
# resumable via its JSONL alreadyDone() gate, so the right operational
# answer is "just restart". This wrapper does that automatically.
#
# Exits when the JSONL stops growing across N consecutive restarts
# (everything in the MISSING_FILE was scraped) or when the user
# Ctrl+C-s.

set -u
cd "$(dirname "$0")/.."

JSONL=out/fieldglass-march-daily.jsonl
LOG=out/scrape-by-tsn.log
MAX_STAGNANT_RESTARTS=3       # exit if N restarts in a row don't add a single line
DELAY_BETWEEN_RESTARTS=15     # seconds

stagnant=0
restart_count=0
while true; do
  before=$(wc -l < "$JSONL" 2>/dev/null | tr -d ' ')
  restart_count=$((restart_count + 1))
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  watchdog: starting scraper (restart #$restart_count, JSONL=$before lines)" | tee -a out/watchdog.log

  FG_USER='Venkat2838' FG_PASS='Buzz@2027' \
    MISSING_FILE=out/may-jun-discovery.jsonl \
    /Users/kirtikar/.npm/_npx/fd45a72a545557e9/node_modules/.bin/tsx \
    scripts/scrape-fieldglass-by-tsn.ts 2>&1 | tee -a "$LOG"

  exit_code=${PIPESTATUS[0]}
  after=$(wc -l < "$JSONL" 2>/dev/null | tr -d ' ')
  delta=$((after - before))
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  watchdog: scraper exited code=$exit_code, JSONL +$delta lines (now $after)" | tee -a out/watchdog.log

  if [ "$delta" -eq 0 ]; then
    stagnant=$((stagnant + 1))
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  watchdog: stagnant restart $stagnant/$MAX_STAGNANT_RESTARTS" | tee -a out/watchdog.log
    if [ "$stagnant" -ge "$MAX_STAGNANT_RESTARTS" ]; then
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)  watchdog: stopping — $MAX_STAGNANT_RESTARTS restarts produced nothing new (crawl likely done or hard-blocked)" | tee -a out/watchdog.log
      exit 0
    fi
  else
    stagnant=0
  fi

  sleep "$DELAY_BETWEEN_RESTARTS"
done
