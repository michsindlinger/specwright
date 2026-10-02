#!/usr/bin/env bash
# INT-2026-030 E2E: Kontrollfälle (EK-03) und N Anfragen mit Messung (EK-01, EK-02)
# gegen ein Branch-Backend mit SPECWRIGHT_EINGANG=on.
#
# Aufruf (aus ui/):
#   bash ../intent/INT-2026-030-sitzung-von-aussen/e2e/eingang-e2e.sh <projektpfad> <token-datei> [anzahl]
# Umgebung: EINGANG_PORT (Standard 3111).
# Ausgabe: je Anfrage eine Zeile „i status zustand dauer_s", am Ende Quote und Median.
# Jede gestartete Sitzung wird nach der Messung geschlossen (Arbeitskopie sauber → entfernt),
# zwischen den Starts liegen 13 s, damit das Fenster 5/60 s nicht greift.
set -u
PROJEKT="$1"
TOKEN="$(tr -d '\n' < "$2")"
N="${3:-20}"
PORT="${EINGANG_PORT:-3111}"
URL="http://localhost:${PORT}/api/eingang/sitzung"
HDIR="$(cd "$(dirname "$0")" && pwd)"

post() { # extra-curl-args... → "status body"
  curl -s -o /tmp/eingang-e2e-body.$$ -w '%{http_code}' -X POST -H 'content-type: application/json' "$@" "$URL"
}

echo "== EK-03 Kontrollfälle (erwartet je 403, 0 Starts)"
BODY="{\"projekt\":\"${PROJEKT}\",\"satz\":\"Kontrollfall\"}"
k_ok=0
for fall in ohne-token falsches-token x-forwarded-for x-forwarded-host tailscale-user-login cf-connecting-ip fremder-host origin; do
  case "$fall" in
    ohne-token)            s=$(post -d "$BODY") ;;
    falsches-token)        s=$(post -H "x-specwright-eingang-token: $(printf 'f%.0s' $(seq 1 64))" -d "$BODY") ;;
    x-forwarded-for)       s=$(post -H "x-specwright-eingang-token: $TOKEN" -H 'x-forwarded-for: 100.64.0.2' -d "$BODY") ;;
    x-forwarded-host)      s=$(post -H "x-specwright-eingang-token: $TOKEN" -H 'x-forwarded-host: mac.example.ts.net' -d "$BODY") ;;
    tailscale-user-login)  s=$(post -H "x-specwright-eingang-token: $TOKEN" -H 'tailscale-user-login: someone@example.com' -d "$BODY") ;;
    cf-connecting-ip)      s=$(post -H "x-specwright-eingang-token: $TOKEN" -H 'cf-connecting-ip: 203.0.113.9' -d "$BODY") ;;
    fremder-host)          s=$(post -H "x-specwright-eingang-token: $TOKEN" -H 'host: mac.example.ts.net' -d "$BODY") ;;
    origin)                s=$(post -H "x-specwright-eingang-token: $TOKEN" -H "origin: http://localhost:${PORT}" -d "$BODY") ;;
  esac
  echo "  $fall → $s $(cat /tmp/eingang-e2e-body.$$)"
  [ "$s" = "403" ] && k_ok=$((k_ok + 1))
done
echo "  Kontrollfälle mit 403: $k_ok/8"

echo "== EK-01/EK-02: $N Anfragen"
aktiv=0
dauern=""
for i in $(seq 1 "$N"); do
  t0=$(python3 -c 'import time;print(time.time())')
  s=$(post -H "x-specwright-eingang-token: $TOKEN" -d "{\"projekt\":\"${PROJEKT}\",\"satz\":\"E2E-Lauf ${i}: antworte nur mit OK\",\"titel\":\"E2E ${i}\"}")
  body=$(cat /tmp/eingang-e2e-body.$$)
  sid=$(printf '%s' "$body" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("sessionId",""))' 2>/dev/null)
  zustand="-"
  if [ "$s" = "201" ] && [ -n "$sid" ]; then
    for _ in $(seq 1 140); do
      zustand=$(curl -s -H "x-specwright-eingang-token: $TOKEN" "$URL/$sid" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["zustand"]+("|"+d["grund"] if "grund" in d else ""))')
      case "$zustand" in startet) sleep 0.5 ;; *) break ;; esac
    done
  fi
  t1=$(python3 -c 'import time;print(time.time())')
  d=$(python3 -c "print(round($t1-$t0,1))")
  echo "  $i $s $zustand ${d}s"
  if [ "$zustand" = "aktiv" ]; then aktiv=$((aktiv + 1)); dauern="$dauern $d"; fi
  [ -n "$sid" ] && (node "$HDIR/ws-op.mjs" close "$sid" >/dev/null 2>&1)
  [ "$i" -lt "$N" ] && sleep 13
done
median=$(python3 -c "import statistics,sys;v=[float(x) for x in '$dauern'.split()];print(statistics.median(v) if v else '-')")
echo "== Ergebnis: aktiv $aktiv/$N, Median bis aktiv ${median}s"
rm -f /tmp/eingang-e2e-body.$$
