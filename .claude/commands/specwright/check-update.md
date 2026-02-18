# Check Update

Pruefe ob ein Specwright-Update verfuegbar ist.

Fuehre folgenden Befehl aus:
```
bash <(curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/check-update.sh)
```

Zeige dem Benutzer das Ergebnis. Falls ein Update verfuegbar ist, frage ob es installiert werden soll.
Falls ja, fuehre aus:
```
bash <(curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/check-update.sh) --update
```
