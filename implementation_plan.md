# Implementation Plan: 0,1% Kanonische Numerische Campus-ID Governance (Ablösung Buchstaben-Standard)

## 1. Forensische Ursachenanalyse (Forensic Analysis)

### 1.1 Ausgangslage & Befund
* **Problemstellung:** Auf dem gedruckten und digitalen Schulausweis ([`IDBadgeCard.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/IDBadgeCard.tsx#L441), siehe User-Screenshot Linus K.) wird unter dem QR-Code aktuell noch die ID mit Buchstaben für Schüler angezeigt:
  > **Aktuell:** `ID: 001-S-0001`
* **Login-Zustand:** Im Login-Screen ([`CampusIdPinAuthCard.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/auth/CampusIdPinAuthCard.tsx)) wurde die Rolle bereits auf ein reines Ziffernschema umgestellt (Rollen-Pills: `1` = Schüler, `2` = Lehrkraft, `3` = Schulleitung / Verwaltung). Das Tastenfeld verfügt ausschließlich über Ziffern `0`–`9` (ohne Buchstaben).
* **Bruch in der User Experience:** Ein Schüler/Kind sieht auf seinem physischen oder digitalen Ausweis den Buchstaben `S` (`001-S-0001`), kann diesen Buchstaben auf dem Numpad des iPads oder Kiosk-Terminals jedoch gar nicht eintippen. Das Kind tippt logischerweise seine Rollen-Ziffer `1-0001` (oder `001-1-0001`).

### 1.2 Forensische Codebase-Traversierung (Single Source of Truth)
Alle Campus-IDs im gesamten System stammen aus einem einzigen zentralen Modul:
1. **[`apps/groovelab/src/utils/campusIdHelper.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/campusIdHelper.ts):**
   * `CampusRoleCode` ist als `'V' | 'L' | 'S'` typisiert.
   * `getCampusRoleCode()` liefert für Schüler `'S'`, für Lehrer `'L'`, für Verwaltung `'V'`.
   * `formatCanonicalCampusId()` baut `${sNum}-${rCode}-${paddedSeq}` (z. B. `001-S-0001`).
   * `isCanonicalCampusId()` prüft `/^\d{3}-[VLS]-\d{4}$/i`.
   * `resolveUserCampusId(user)` gibt bei Vorhandensein von `user.ausweis_nummer` (`'001-S-0001'`) den Wert direkt zurück, ohne ihn in das Ziffernschema zu normalisieren.
2. **[`apps/groovelab/src/components/IDBadgeCard.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/IDBadgeCard.tsx):**
   * Zeile 195: `const canonicalCampusId = resolveUserCampusId(user);`
   * Zeile 441: Rendert `ID: {canonicalCampusId}`.
3. **Verbundene Screens (100% Symmetrie über `resolveUserCampusId`):**
   * [`StudentModalHeader.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/detail/shared/StudentModalHeader.tsx#L296) (Karteikarte & Copy-Button)
   * [`StudentProfileTab.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/tabs/StudentProfileTab.tsx#L231) (Schülerprofil & Copy-Button)
   * [`AdminTeachersView.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/admin/AdminTeachersView.tsx#L232) & [`SecretaryEmployeesView.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/secretary/SecretaryEmployeesView.tsx#L515)
   * [`CampusSidebarUserHub.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/layout/CampusSidebarUserHub.tsx#L58)
   * [`AdminIDGalleryView.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/admin/AdminIDGalleryView.tsx) (Sammelausweisdruck)
   * [`QRCodeModal.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/QRCodeModal.tsx#L423) (Ausweis-Modal & JPEG-Export)
4. **Login-Kopplung ([`CampusIdPinAuthCard.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/auth/CampusIdPinAuthCard.tsx)):**
   * `resolveAusweisIdentity()` übersetzte Eingaben wie `1-0001` bisher intern heimlich zurück in `canonicalId: 001-S-0001`, um die alte Datenbankspalte zu matchen, während `supportId: 001-1-0001` hieß.
   * Wenn wir die kanonische ID auf `001-1-0001` umstellen, muss sowohl das Frontend als auch der Auth-RPC symmetrisch funktionieren.
5. **Datenbank & RPCs ([`authenticate_by_credential`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/supabase/migrations/571_enterprise_legal_and_b2c_contract_goldstandard.sql#L1289)):**
   * Migration 574 vergibt in `assign_canonical_ausweis_nummer()` bisher `'S'`, `'L'`, `'V'`.
   * Wir benötigen Migration 585 zur Backfill-Harmonisierung (`-S-` -> `-1-`, `-L-` -> `-2-`, `-V-` -> `-3-`) und Dual-Format-Toleranz im RPC, damit Altsysteme, gedruckte Altkarten und neue Ziffernkarten zu 100% kollisionsfrei und ohne Ausfallzeit koexistieren.

---

## 2. Geplante Architektur & Lösungsansatz

### Säule 1: Zentraler Helper [`apps/groovelab/src/utils/campusIdHelper.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/campusIdHelper.ts)
* **Erweiterung von `CampusRoleCode`:**
  `export type CampusRoleCode = '1' | '2' | '3' | 'S' | 'L' | 'V';`
* **`getCampusRoleCode()` liefert autoritativ numerische Rollen:**
  * Schüler: `'1'` (Standard)
  * Lehrkraft: `'2'`
  * Verwaltung / Admin / Sekretariat: `'3'`
* **`formatCanonicalCampusId()`:**
  * Mappt Rollen-Eingaben automatisch auf Ziffern (`'S'`|`'1'` -> `'1'`, `'L'`|`'2'` -> `'2'`, `'V'`|`'3'` -> `'3'`).
  * Garantiert feste 10 Zeichen: `{Schule_3Stellen}-{Rolle_1Stelle}-{Sequenz_4Stellen}` (z. B. `001-1-0001`).
* **`isCanonicalCampusId()`:**
  * Erkennt sowohl neue Ziffern-IDs (`001-1-0001`) als auch Alt-IDs (`001-S-0001`): `/^\d{3}-([123VLS])-\d{4}$/i`.
* **`resolveUserCampusId(user)` (Normalisierungs-Garantie):**
  * Erkennt bestehende Ausweisnummern mit Buchstaben (`001-S-XXXX`, `001-L-XXXX`, `001-V-XXXX`) und normalisiert diese **sofort und deterministisch** auf die kanonische Ziffernform:
    * `001-S-0001` -> `001-1-0001`
    * `001-L-0001` -> `001-2-0001`
    * `001-V-0001` -> `001-3-0001`
  * Default-Fallback bei `!user`: `'001-1-0001'`.

### Säule 2: Login-Resilienz [`apps/groovelab/src/components/auth/CampusIdPinAuthCard.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/auth/CampusIdPinAuthCard.tsx)
* `resolveAusweisIdentity()`:
  * Gibt als `canonicalId` primär die neue Ziffern-ID aus (`001-1-0042`, `001-2-0003`, `001-3-0001`).
  * Stellt gleichzeitig `legacyId` (`001-S-0042`) bereit.
* In `handleSubmit()`:
  * Führt primär den Login mit der kanonischen Ziffern-ID aus.
  * Schlägt dieser fehl (z. B. wenn die lokale oder Remote-DB noch nicht migriert ist), greift automatisch ein geräuschloser Fallback auf die `legacyId` (`-S-`).
  * **Ergebnis:** Null Login-Ausfälle, unabhängig vom Migrationsstand der jeweiligen Datenbank.

### Säule 3: UI-Konsistenz in Modals & Badges
* [`IDBadgeCard.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/IDBadgeCard.tsx): Zeigt sofort `ID: 001-1-0001` an (Linus K. und alle weiteren Schüler).
* [`StudentModalHeader.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/detail/shared/StudentModalHeader.tsx) & [`StudentProfileTab.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/tabs/StudentProfileTab.tsx): Aktualisierung der Aria-Labels und Inline-Kommentare auf `{Schul-ID}-1-{Nummer}`.
* [`legalContent.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/legal/legalContent.ts#L847): Aktualisierung des Muster-Beispiels im Widerrufsformular von `001-S-0042` auf `001-1-0042`.

### Säule 4: Datenbank-Migration 585 (`supabase/migrations/585_canonical_numeric_campus_id_governance.sql`)
* **Trigger-Aktualisierung (`assign_canonical_ausweis_nummer`):**
  * Schülern wird bei Neuanlage automatisch `v_school_num || '-1-' || lpad(v_next_seq, 4, '0')` zugewiesen (Lehrern `'-2-'`, Verwaltung `'-3-'`).
* **Backfill-Update:**
  * Atomare Migration aller Bestandsdatensätze in `users_raw.ausweis_nummer` von `-S-` auf `-1-`, `-L-` auf `-2-`, `-V-` auf `-3-`.
* **RPC-Härtung (`authenticate_by_credential`):**
  * Bidirektionale Äquivalenz: Der RPC prüft sowohl auf `v_clean` als auch auf die jeweils andere Repräsentation (`-1-` <-> `-S-`).

---

## 3. Detaillierte Implementierungsschritte

1. **Schritt 1:** Anpassung von [`campusIdHelper.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/campusIdHelper.ts) (Rollen-Schema 1/2/3, Normalisierung `001-S-` -> `001-1-`, Typen, Tests).
2. **Schritt 2:** Anpassung von [`CampusIdPinAuthCard.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/auth/CampusIdPinAuthCard.tsx) (Kanonische Ziffern-ID Rückgabe + automatischer Fallback-Airbag).
3. **Schritt 3:** Bereinigung von Text- und Label-Referenzen in [`IDBadgeCard.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/IDBadgeCard.tsx), [`StudentModalHeader.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/detail/shared/StudentModalHeader.tsx), [`StudentProfileTab.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/tabs/StudentProfileTab.tsx) und [`legalContent.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/legal/legalContent.ts).
4. **Schritt 4:** Erstellung der idempotenten SQL-Migration `supabase/migrations/585_canonical_numeric_campus_id_governance.sql`.

---

## 4. Verifikationsplan

* **Frontend-Parität:**
  * Prüfung, dass `IDBadgeCard` für Linus K. und alle Schüler exakt `ID: 001-1-0001` (bzw. `001-1-XXXX`) rendert.
  * Prüfung, dass Lehrkräfte `001-2-XXXX` und Schulleitungen `001-3-XXXX` erhalten.
  * Verifikation des Kopiervorgangs in Schüler-Karteikarte und Profil (kopiert `001-1-XXXX`).
* **Login-Parität:**
  * Verifikation, dass die Eingabe von `1-1`, `1-0001`, `001-1-0001` und legacy `001-S-0001` gleichermaßen erfolgreich authentifiziert wird.
* **Governance-Integrität:**
  * Ausführung von `npm run gate` ausschließlich bei expliziter Nutzeraufforderung oder beim Codewort `commit`.
