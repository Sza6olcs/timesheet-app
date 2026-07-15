import React, { useState, useEffect, useCallback } from "react";
import { Clock, Check, X, Download, LogOut, ListChecks, FileEdit, FileSpreadsheet, ClipboardList, Plus, AlertCircle, Users, Pencil, MapPin } from "lucide-react";
import { api, setToken, getToken, downloadBlob } from "./api.js";
import logo from "./assets/inducat-logo.png";

const LANGS = ["hu", "en", "de", "ro", "tr"];
const LOCALE_MAP = { hu: "hu-HU", en: "en-US", de: "de-DE", ro: "ro-RO", tr: "tr-TR" };
const LANG_LABEL = { hu: "Magyar", en: "English", de: "Deutsch", ro: "Română", tr: "Türkçe" };

/* ---------------------------------------------------------------------- */
/* Translations                                                           */
/* ---------------------------------------------------------------------- */

const TRANSLATIONS = {
  hu: {
    appTitle: "Időnyilvántartó",
    appSub: "Munkaidő rögzítés és jóváhagyás",
    login: { code: "Dolgozói kód", password: "Jelszó", lang: "Nyelv", button: "Belépés", error: "Hibás kód vagy jelszó.", loading: "Belépés…" },
    nav: { dashboard: "Kezdőlap", newEntry: "Új bejegyzés", approvals: "Jóváhagyás", corrections: "Javítás", export: "Export", auditLog: "Auditnapló", users: "Felhasználók", locations: "Telephelyek", logout: "Kilépés" },
    status: { draft: "Piszkozat", submitted: "Beküldve", approved: "Jóváhagyva", returned: "Visszaküldve", corrected: "Javítva" },
    shift: { day: "Nappalos", night: "Éjszakás" },
    fields: { date: "Dátum", start: "Kezdés", end: "Végzés", hours: "Ledolgozott óra", shift: "Műszakkód", location: "Munkavégzés helye", comment: "Megjegyzés", extraAllowance: "Extra pótlék (%/óra)" },
    buttons: { saveDraft: "Mentés piszkozatként", submit: "Beküldés jóváhagyásra", approve: "Jóváhagyás", return: "Visszaküldés", save: "Mentés", cancel: "Mégse", bulkApprove: "Kijelöltek jóváhagyása", exportCsv: "Export CSV", exportXlsx: "Export XLSX", add: "Hozzáadás", delete: "Eltávolítás", edit: "Szerkesztés", confirmDelete: "Törlés megerősítése" },
    dashboard: { expected: "Várható óra", worked: "Ledolgozott óra", difference: "Különbség", recent: "Legutóbbi bejegyzések", newEntryCta: "Új napi bejegyzés", empty: "Még nincs bejegyzés ebben a hónapban." },
    approval: { title: "Függőben lévő bejegyzések", filterEmployee: "Dolgozó", filterStatus: "Státusz", all: "Mind", empty: "Nincs jóváhagyásra váró tétel.", reasonPrompt: "Visszaküldés oka (kötelező)", reasonPlaceholder: "Írd le, mit kell javítani…" },
    correction: { title: "Jóváhagyott rekord javítása", original: "Eredeti érték", newValue: "Új érték", reason: "Javítás oka (kötelező)", reasonPlaceholder: "Miért szükséges a módosítás…", history: "Módosítási előzmény", pickRecord: "Válassz jóváhagyott rekordot a listából", noRecords: "Nincs jóváhagyott rekord javításra." },
    exportView: { title: "Havi elszámolási export", month: "Hónap", group: "Csoport / vezető", allGroups: "Minden csoport", name: "Név", expected: "Havi várható munkaidő", worked: "Ledolgozott órák", difference: "Különbség", allowance: "Napidíj", extraAllowance: "Extra pótlék (átl. %/óra)", approver: "Jóváhagyó neve", lastMod: "Utolsó módosítás", lastModBy: "Utolsó módosítást végző", noneYet: "—", allowanceSetting: "Napidíj összege / nap", allowanceSaved: "Napidíj mentve" },
    audit: { title: "Auditnapló", entry: "Rekord", changedBy: "Módosító", changedAt: "Időpont", reason: "Ok", empty: "Nincs még módosítási bejegyzés." },
    users: { title: "Felhasználók kezelése", name: "Teljes név", code: "Dolgozói azonosító", role: "Szerepkör", supervisor: "Csoportvezető", none: "Nincs", add: "Új felhasználó", namePlaceholder: "pl. Kiss János", codePlaceholder: "pl. E-1009", password: "Kezdő jelszó", passwordPlaceholder: "min. 6 karakter", deleteWarning: "A felhasználó inaktiválásra kerül — a korábbi bejegyzései megmaradnak, de nem tud többé bejelentkezni.", confirmDeleteMsg: "Biztosan eltávolítod ezt a felhasználót?", role_employee: "Dolgozó", role_supervisor: "Csoportvezető", role_admin: "Admin" },
    locations: { title: "Telephelyek kezelése", country: "Ország", city: "Város", plant: "Gyár neve", add: "Új telephely", countryPlaceholder: "pl. Magyarország", cityPlaceholder: "pl. Győr", plantPlaceholder: "pl. Győr Gyár 2", deleteWarning: "A telephely véglegesen törlődik a listából. A korábbi bejegyzésekben a neve megmarad.", confirmDeleteMsg: "Biztosan törlöd ezt a telephelyet?" },
    misc: { hoursShort: "óra", currency: "€", loggedInAs: "Bejelentkezve mint", confirmToast: "Sikeresen mentve" },
  },
  en: {
    appTitle: "TimeTrack",
    appSub: "Time entry and approval",
    login: { code: "Employee code", password: "Password", lang: "Language", button: "Sign in", error: "Invalid code or password.", loading: "Signing in…" },
    nav: { dashboard: "Dashboard", newEntry: "New entry", approvals: "Approvals", corrections: "Corrections", export: "Export", auditLog: "Audit log", users: "Users", locations: "Locations", logout: "Sign out" },
    status: { draft: "Draft", submitted: "Submitted", approved: "Approved", returned: "Returned", corrected: "Corrected" },
    shift: { day: "Day shift", night: "Night shift" },
    fields: { date: "Date", start: "Start", end: "End", hours: "Worked hours", shift: "Shift code", location: "Work location", comment: "Comment", extraAllowance: "Extra allowance (%/hour)" },
    buttons: { saveDraft: "Save as draft", submit: "Submit for approval", approve: "Approve", return: "Return", save: "Save", cancel: "Cancel", bulkApprove: "Approve selected", exportCsv: "Export CSV", exportXlsx: "Export XLSX", add: "Add", delete: "Remove", edit: "Edit", confirmDelete: "Confirm removal" },
    dashboard: { expected: "Expected hours", worked: "Worked hours", difference: "Difference", recent: "Recent entries", newEntryCta: "New daily entry", empty: "No entries yet this month." },
    approval: { title: "Pending entries", filterEmployee: "Employee", filterStatus: "Status", all: "All", empty: "No entries awaiting approval.", reasonPrompt: "Reason for return (required)", reasonPlaceholder: "Describe what needs to be fixed…" },
    correction: { title: "Correct an approved record", original: "Original value", newValue: "New value", reason: "Reason for correction (required)", reasonPlaceholder: "Why is this change needed…", history: "Correction history", pickRecord: "Pick an approved record from the list", noRecords: "No approved records to correct." },
    exportView: { title: "Monthly payroll export", month: "Month", group: "Group / supervisor", allGroups: "All groups", name: "Name", expected: "Expected monthly hours", worked: "Worked hours", difference: "Difference", allowance: "Allowance", extraAllowance: "Extra allowance (avg. %/hour)", approver: "Approver name", lastMod: "Last modified", lastModBy: "Last modified by", noneYet: "—", allowanceSetting: "Allowance amount / day", allowanceSaved: "Allowance saved" },
    audit: { title: "Audit log", entry: "Record", changedBy: "Changed by", changedAt: "Time", reason: "Reason", empty: "No changes logged yet." },
    users: { title: "Manage users", name: "Full name", code: "Employee code", role: "Role", supervisor: "Supervisor", none: "None", add: "Add user", namePlaceholder: "e.g. John Smith", codePlaceholder: "e.g. E-1009", password: "Initial password", passwordPlaceholder: "min. 6 characters", deleteWarning: "The user will be deactivated — their past entries stay, but they can no longer sign in.", confirmDeleteMsg: "Remove this user?", role_employee: "Employee", role_supervisor: "Supervisor", role_admin: "Admin" },
    locations: { title: "Manage locations", country: "Country", city: "City", plant: "Plant name", add: "Add location", countryPlaceholder: "e.g. Hungary", cityPlaceholder: "e.g. Győr", plantPlaceholder: "e.g. Győr Plant 2", deleteWarning: "The location will be permanently removed from the list. Past entries keep its name.", confirmDeleteMsg: "Remove this location?" },
    misc: { hoursShort: "h", currency: "€", loggedInAs: "Signed in as", confirmToast: "Saved successfully" },
  },
  de: {
    appTitle: "ZeitErfassung",
    appSub: "Arbeitszeiterfassung und Freigabe",
    login: { code: "Mitarbeiternummer", password: "Passwort", lang: "Sprache", button: "Anmelden", error: "Ungültige Nummer oder Passwort.", loading: "Anmeldung…" },
    nav: { dashboard: "Übersicht", newEntry: "Neuer Eintrag", approvals: "Freigaben", corrections: "Korrekturen", export: "Export", auditLog: "Prüfprotokoll", users: "Benutzer", locations: "Standorte", logout: "Abmelden" },
    status: { draft: "Entwurf", submitted: "Eingereicht", approved: "Freigegeben", returned: "Zurückgewiesen", corrected: "Korrigiert" },
    shift: { day: "Tagschicht", night: "Nachtschicht" },
    fields: { date: "Datum", start: "Beginn", end: "Ende", hours: "Geleistete Stunden", shift: "Schichtcode", location: "Arbeitsort", comment: "Bemerkung", extraAllowance: "Zusätzliche Zulage (%/Std.)" },
    buttons: { saveDraft: "Als Entwurf speichern", submit: "Zur Freigabe einreichen", approve: "Freigeben", return: "Zurückweisen", save: "Speichern", cancel: "Abbrechen", bulkApprove: "Auswahl freigeben", exportCsv: "CSV exportieren", exportXlsx: "XLSX exportieren", add: "Hinzufügen", delete: "Entfernen", edit: "Bearbeiten", confirmDelete: "Entfernen bestätigen" },
    dashboard: { expected: "Sollstunden", worked: "Geleistete Stunden", difference: "Differenz", recent: "Letzte Einträge", newEntryCta: "Neuer Tageseintrag", empty: "Diesen Monat noch keine Einträge." },
    approval: { title: "Ausstehende Einträge", filterEmployee: "Mitarbeiter", filterStatus: "Status", all: "Alle", empty: "Keine Einträge zur Freigabe.", reasonPrompt: "Grund der Zurückweisung (erforderlich)", reasonPlaceholder: "Beschreibe, was korrigiert werden muss…" },
    correction: { title: "Freigegebenen Eintrag korrigieren", original: "Ursprünglicher Wert", newValue: "Neuer Wert", reason: "Korrekturgrund (erforderlich)", reasonPlaceholder: "Warum ist die Änderung nötig…", history: "Korrekturverlauf", pickRecord: "Wähle einen freigegebenen Eintrag aus der Liste", noRecords: "Keine freigegebenen Einträge zu korrigieren." },
    exportView: { title: "Monatlicher Abrechnungsexport", month: "Monat", group: "Gruppe / Vorgesetzter", allGroups: "Alle Gruppen", name: "Name", expected: "Monatliche Sollstunden", worked: "Geleistete Stunden", difference: "Differenz", allowance: "Zulage", extraAllowance: "Zusätzliche Zulage (Ø %/Std.)", approver: "Name des Freigebers", lastMod: "Letzte Änderung", lastModBy: "Geändert von", noneYet: "—", allowanceSetting: "Zulagenbetrag / Tag", allowanceSaved: "Zulage gespeichert" },
    audit: { title: "Prüfprotokoll", entry: "Eintrag", changedBy: "Geändert von", changedAt: "Zeitpunkt", reason: "Grund", empty: "Noch keine Änderungen protokolliert." },
    users: { title: "Benutzer verwalten", name: "Vollständiger Name", code: "Mitarbeiternummer", role: "Rolle", supervisor: "Vorgesetzter", none: "Keiner", add: "Benutzer hinzufügen", namePlaceholder: "z. B. Max Mustermann", codePlaceholder: "z. B. E-1009", password: "Anfangspasswort", passwordPlaceholder: "min. 6 Zeichen", deleteWarning: "Der Benutzer wird deaktiviert — bisherige Einträge bleiben erhalten, Anmeldung ist nicht mehr möglich.", confirmDeleteMsg: "Diesen Benutzer entfernen?", role_employee: "Mitarbeiter", role_supervisor: "Vorgesetzter", role_admin: "Admin" },
    locations: { title: "Standorte verwalten", country: "Land", city: "Stadt", plant: "Werksname", add: "Standort hinzufügen", countryPlaceholder: "z. B. Ungarn", cityPlaceholder: "z. B. Győr", plantPlaceholder: "z. B. Győr Werk 2", deleteWarning: "Der Standort wird endgültig aus der Liste entfernt. Vergangene Einträge behalten seinen Namen.", confirmDeleteMsg: "Diesen Standort entfernen?" },
    misc: { hoursShort: "Std.", currency: "€", loggedInAs: "Angemeldet als", confirmToast: "Erfolgreich gespeichert" },
  },
  ro: {
    appTitle: "Pontaj",
    appSub: "Înregistrare și aprobare a orelor de lucru",
    login: { code: "Cod angajat", password: "Parolă", lang: "Limbă", button: "Autentificare", error: "Cod sau parolă incorectă.", loading: "Se autentifică…" },
    nav: { dashboard: "Panou", newEntry: "Înregistrare nouă", approvals: "Aprobări", corrections: "Corecții", export: "Export", auditLog: "Jurnal audit", users: "Utilizatori", locations: "Locații", logout: "Deconectare" },
    status: { draft: "Ciornă", submitted: "Trimis", approved: "Aprobat", returned: "Returnat", corrected: "Corectat" },
    shift: { day: "Tură de zi", night: "Tură de noapte" },
    fields: { date: "Data", start: "Început", end: "Sfârșit", hours: "Ore lucrate", shift: "Cod tură", location: "Locul de muncă", comment: "Comentariu", extraAllowance: "Indemnizație suplimentară (%/oră)" },
    buttons: { saveDraft: "Salvează ca ciornă", submit: "Trimite spre aprobare", approve: "Aprobă", return: "Returnează", save: "Salvează", cancel: "Anulează", bulkApprove: "Aprobă selecția", exportCsv: "Export CSV", exportXlsx: "Export XLSX", add: "Adaugă", delete: "Elimină", edit: "Editează", confirmDelete: "Confirmă eliminarea" },
    dashboard: { expected: "Ore așteptate", worked: "Ore lucrate", difference: "Diferență", recent: "Înregistrări recente", newEntryCta: "Înregistrare zilnică nouă", empty: "Nicio înregistrare luna aceasta." },
    approval: { title: "Înregistrări în așteptare", filterEmployee: "Angajat", filterStatus: "Stare", all: "Toate", empty: "Nu există înregistrări de aprobat.", reasonPrompt: "Motivul returnării (obligatoriu)", reasonPlaceholder: "Descrie ce trebuie corectat…" },
    correction: { title: "Corectează o înregistrare aprobată", original: "Valoare originală", newValue: "Valoare nouă", reason: "Motivul corecției (obligatoriu)", reasonPlaceholder: "De ce este necesară modificarea…", history: "Istoric corecții", pickRecord: "Alege o înregistrare aprobată din listă", noRecords: "Nu există înregistrări aprobate de corectat." },
    exportView: { title: "Export lunar pentru salarizare", month: "Lună", group: "Grup / șef", allGroups: "Toate grupurile", name: "Nume", expected: "Ore lunare așteptate", worked: "Ore lucrate", difference: "Diferență", allowance: "Diurnă", extraAllowance: "Indemnizație suplimentară (medie %/oră)", approver: "Numele aprobatorului", lastMod: "Ultima modificare", lastModBy: "Modificat de", noneYet: "—", allowanceSetting: "Suma diurnei / zi", allowanceSaved: "Diurnă salvată" },
    audit: { title: "Jurnal audit", entry: "Înregistrare", changedBy: "Modificat de", changedAt: "Data/ora", reason: "Motiv", empty: "Nicio modificare înregistrată încă." },
    users: { title: "Gestionare utilizatori", name: "Nume complet", code: "Cod angajat", role: "Rol", supervisor: "Șef de echipă", none: "Niciunul", add: "Adaugă utilizator", namePlaceholder: "ex. Ion Popescu", codePlaceholder: "ex. E-1009", password: "Parolă inițială", passwordPlaceholder: "min. 6 caractere", deleteWarning: "Utilizatorul va fi dezactivat — înregistrările anterioare rămân, dar nu se mai poate autentifica.", confirmDeleteMsg: "Elimini acest utilizator?", role_employee: "Angajat", role_supervisor: "Șef de echipă", role_admin: "Admin" },
    locations: { title: "Gestionare locații", country: "Țară", city: "Oraș", plant: "Numele uzinei", add: "Adaugă locație", countryPlaceholder: "ex. Ungaria", cityPlaceholder: "ex. Győr", plantPlaceholder: "ex. Uzina Győr 2", deleteWarning: "Locația va fi eliminată definitiv din listă. Înregistrările anterioare păstrează numele ei.", confirmDeleteMsg: "Elimini această locație?" },
    misc: { hoursShort: "h", currency: "€", loggedInAs: "Autentificat ca", confirmToast: "Salvat cu succes" },
  },
  tr: {
    appTitle: "Puantaj",
    appSub: "Çalışma saati kaydı ve onayı",
    login: { code: "Personel kodu", password: "Şifre", lang: "Dil", button: "Giriş yap", error: "Kod veya şifre hatalı.", loading: "Giriş yapılıyor…" },
    nav: { dashboard: "Panel", newEntry: "Yeni kayıt", approvals: "Onaylar", corrections: "Düzeltmeler", export: "Dışa aktar", auditLog: "Denetim günlüğü", users: "Kullanıcılar", locations: "Lokasyonlar", logout: "Çıkış yap" },
    status: { draft: "Taslak", submitted: "Gönderildi", approved: "Onaylandı", returned: "İade edildi", corrected: "Düzeltildi" },
    shift: { day: "Gündüz vardiyası", night: "Gece vardiyası" },
    fields: { date: "Tarih", start: "Başlangıç", end: "Bitiş", hours: "Çalışılan saat", shift: "Vardiya kodu", location: "Çalışma yeri", comment: "Not", extraAllowance: "Ek ödenek (%/saat)" },
    buttons: { saveDraft: "Taslak olarak kaydet", submit: "Onaya gönder", approve: "Onayla", return: "İade et", save: "Kaydet", cancel: "Vazgeç", bulkApprove: "Seçilenleri onayla", exportCsv: "CSV dışa aktar", exportXlsx: "XLSX dışa aktar", add: "Ekle", delete: "Kaldır", edit: "Düzenle", confirmDelete: "Kaldırmayı onayla" },
    dashboard: { expected: "Beklenen saat", worked: "Çalışılan saat", difference: "Fark", recent: "Son kayıtlar", newEntryCta: "Yeni günlük kayıt", empty: "Bu ay henüz kayıt yok." },
    approval: { title: "Bekleyen kayıtlar", filterEmployee: "Çalışan", filterStatus: "Durum", all: "Tümü", empty: "Onay bekleyen kayıt yok.", reasonPrompt: "İade nedeni (zorunlu)", reasonPlaceholder: "Nelerin düzeltilmesi gerektiğini yaz…" },
    correction: { title: "Onaylı kaydı düzelt", original: "Orijinal değer", newValue: "Yeni değer", reason: "Düzeltme nedeni (zorunlu)", reasonPlaceholder: "Değişiklik neden gerekli…", history: "Düzeltme geçmişi", pickRecord: "Listeden onaylı bir kayıt seç", noRecords: "Düzeltilecek onaylı kayıt yok." },
    exportView: { title: "Aylık bordro dışa aktarımı", month: "Ay", group: "Grup / yönetici", allGroups: "Tüm gruplar", name: "İsim", expected: "Aylık beklenen saat", worked: "Çalışılan saat", difference: "Fark", allowance: "Yevmiye", extraAllowance: "Ek ödenek (ort. %/saat)", approver: "Onaylayan adı", lastMod: "Son değişiklik", lastModBy: "Değiştiren", noneYet: "—", allowanceSetting: "Yevmiye tutarı / gün", allowanceSaved: "Yevmiye kaydedildi" },
    audit: { title: "Denetim günlüğü", entry: "Kayıt", changedBy: "Değiştiren", changedAt: "Zaman", reason: "Neden", empty: "Henüz kayıtlı değişiklik yok." },
    users: { title: "Kullanıcı yönetimi", name: "Ad Soyad", code: "Personel kodu", role: "Rol", supervisor: "Ekip lideri", none: "Yok", add: "Kullanıcı ekle", namePlaceholder: "örn. Ahmet Yılmaz", codePlaceholder: "örn. E-1009", password: "Başlangıç şifresi", passwordPlaceholder: "en az 6 karakter", deleteWarning: "Kullanıcı devre dışı bırakılır — geçmiş kayıtları kalır, ancak artık giriş yapamaz.", confirmDeleteMsg: "Bu kullanıcıyı kaldırmak istiyor musun?", role_employee: "Çalışan", role_supervisor: "Ekip lideri", role_admin: "Yönetici" },
    locations: { title: "Lokasyonları yönet", country: "Ülke", city: "Şehir", plant: "Tesis adı", add: "Lokasyon ekle", countryPlaceholder: "örn. Macaristan", cityPlaceholder: "örn. Győr", plantPlaceholder: "örn. Győr Tesis 2", deleteWarning: "Lokasyon listeden kalıcı olarak kaldırılır. Geçmiş kayıtlar adını korur.", confirmDeleteMsg: "Bu lokasyonu kaldırmak istiyor musun?" },
    misc: { hoursShort: "sa", currency: "€", loggedInAs: "Giriş yapan", confirmToast: "Başarıyla kaydedildi" },
  },
};

function useT(lang) {
  return useCallback((path) => {
    const parts = path.split(".");
    let node = TRANSLATIONS[lang];
    for (const p of parts) node = node?.[p];
    return node ?? path;
  }, [lang]);
}

/* ---------------------------------------------------------------------- */
/* Helpers                                                                */
/* ---------------------------------------------------------------------- */

function computeHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

function monthKey(dateStr) {
  return dateStr ? dateStr.slice(0, 7) : "";
}

function fmtDate(iso, lang) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(LOCALE_MAP[lang]);
  } catch {
    return iso;
  }
}

/* ---------------------------------------------------------------------- */
/* Small UI atoms                                                         */
/* ---------------------------------------------------------------------- */

function Stamp({ status, t }) {
  return <span className={"stamp stamp-" + status}>{t("status." + status)}</span>;
}

function ShiftTag({ shift, t }) {
  return (
    <span className={"shift-tag shift-" + shift}>
      <span className="shift-dot" />
      {t("shift." + shift)}
    </span>
  );
}

function EmptyState({ children }) {
  return (
    <div className="empty-state">
      <AlertCircle size={18} strokeWidth={1.75} />
      <span>{children}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Login screen — real credentials against the backend                    */
/* ---------------------------------------------------------------------- */

function LoginScreen({ lang, setLang, onLogin, t, error, loading }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!code || !password) return;
    onLogin(code, password);
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <img src={logo} alt="Inducat" className="login-logo" />
          <div>
            <div className="login-title">{t("appTitle")}</div>
            <div className="login-sub">{t("appSub")}</div>
          </div>
        </div>

        <label className="field-label">{t("login.lang")}</label>
        <div className="lang-row">
          {LANGS.map((l) => (
            <button key={l} type="button" className={"lang-pill" + (l === lang ? " active" : "")} onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>

        <label className="field-label">{t("login.code")}</label>
        <input className="input" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />

        <label className="field-label">{t("login.password")}</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <div className="login-error">{error}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={loading || !code || !password}>
          {loading ? t("login.loading") : t("login.button")}
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Entry form                                                             */
/* ---------------------------------------------------------------------- */

function EntryForm({ t, locations, onCancel, onSave, onSubmit, busy }) {
  const [locIdx, setLocIdx] = useState(0);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    start: "06:00",
    end: "14:00",
    shift: "day",
    comment: "",
    extraAllowance: "",
  });
  const hours = computeHours(form.start, form.end);
  const loc = locations[locIdx] || { country: "", city: "", plant: "" };
  const valid = form.date && form.start && form.end && locations.length > 0;

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function payload() {
    return { ...form, extraAllowance: Number(form.extraAllowance) || 0, country: loc.country, city: loc.city, plant: loc.plant };
  }

  return (
    <div className="panel">
      <div className="form-grid">
        <div className="field">
          <label className="field-label">{t("fields.date")}</label>
          <input type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">{t("fields.shift")}</label>
          <select className="input" value={form.shift} onChange={(e) => set("shift", e.target.value)}>
            <option value="day">{t("shift.day")}</option>
            <option value="night">{t("shift.night")}</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">{t("fields.start")}</label>
          <input type="time" className="input" value={form.start} onChange={(e) => set("start", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">{t("fields.end")}</label>
          <input type="time" className="input" value={form.end} onChange={(e) => set("end", e.target.value)} />
        </div>
        <div className="field field-wide">
          <label className="field-label">{t("fields.location")}</label>
          <select className="input" value={locIdx} onChange={(e) => setLocIdx(Number(e.target.value))}>
            {locations.map((l, i) => (
              <option key={l.id} value={i}>
                {l.country} · {l.city} · {l.plant}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">{t("fields.extraAllowance")}</label>
          <div className="allowance-edit">
            <input type="number" min="0" step="1" className="input" value={form.extraAllowance} onChange={(e) => set("extraAllowance", e.target.value)} />
            <span className="unit-suffix">%</span>
          </div>
        </div>
        <div className="field field-wide">
          <label className="field-label">{t("fields.comment")}</label>
          <textarea className="input" rows={2} value={form.comment} onChange={(e) => set("comment", e.target.value)} />
        </div>
      </div>

      <div className="hours-readout">
        <Clock size={16} strokeWidth={1.75} />
        <span>
          {t("fields.hours")}: <strong>{hours}</strong> {t("misc.hoursShort")}
        </span>
      </div>

      <div className="btn-row">
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          {t("buttons.cancel")}
        </button>
        <button className="btn btn-secondary" disabled={!valid || busy} onClick={() => onSave(payload())}>
          {t("buttons.saveDraft")}
        </button>
        <button className="btn btn-primary" disabled={!valid || busy} onClick={() => onSubmit(payload())}>
          {t("buttons.submit")}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Dashboard                                                              */
/* ---------------------------------------------------------------------- */

function Dashboard({ t, lang, user, entries, settings, onOpenNewEntry }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const own = entries.filter((e) => e.employeeId === user.id);
  const monthEntries = own.filter((e) => monthKey(e.date) === thisMonth);
  const worked = monthEntries.filter((e) => e.status === "approved" || e.status === "corrected").reduce((s, e) => s + e.hours, 0);
  const diff = Math.round((settings.expectedMonthlyHours - worked) * 100) / 100;
  const recent = [...own].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  return (
    <div>
      <div className="summary-cards">
        <div className="stat-card">
          <div className="stat-label">{t("dashboard.expected")}</div>
          <div className="stat-value">{settings.expectedMonthlyHours}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("dashboard.worked")}</div>
          <div className="stat-value accent">{worked}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("dashboard.difference")}</div>
          <div className={"stat-value " + (diff > 0 ? "warn" : "good")}>{diff}</div>
        </div>
      </div>

      <div className="panel-header-row">
        <h2 className="section-title">{t("dashboard.recent")}</h2>
        <button className="btn btn-primary btn-sm" onClick={onOpenNewEntry}>
          <Plus size={15} /> {t("dashboard.newEntryCta")}
        </button>
      </div>

      {recent.length === 0 ? (
        <EmptyState>{t("dashboard.empty")}</EmptyState>
      ) : (
        <div className="ledger">
          {recent.map((e) => (
            <div className="ledger-row" key={e.id}>
              <div className="ledger-date">{e.date}</div>
              <ShiftTag shift={e.shift} t={t} />
              <div className="ledger-time">{e.start}–{e.end}</div>
              <div className="ledger-hours">{e.hours} {t("misc.hoursShort")}</div>
              <div className="ledger-loc">{e.plant}</div>
              {e.extraAllowance > 0 && (
                <div className="ledger-extra">+{e.extraAllowance}% / {t("misc.hoursShort")}</div>
              )}
              <Stamp status={e.status} t={t} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Approval view                                                          */
/* ---------------------------------------------------------------------- */

function ApprovalView({ t, user, entries, employees, onApprove, onReturn }) {
  const [empFilter, setEmpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [selected, setSelected] = useState([]);
  const [returning, setReturning] = useState(null);
  const [reason, setReason] = useState("");

  const team = user.role === "admin" ? employees.filter((e) => e.role !== "admin") : employees.filter((e) => e.supervisorId === user.id);
  const teamIds = new Set(team.map((e) => e.id));

  const visible = entries.filter((e) => {
    if (!teamIds.has(e.employeeId)) return false;
    if (empFilter !== "all" && e.employeeId !== empFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function bulkApprove() {
    selected.forEach((id) => onApprove(id));
    setSelected([]);
  }

  return (
    <div>
      <h2 className="section-title">{t("approval.title")}</h2>
      <div className="filter-row">
        <select className="input input-sm" value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
          <option value="all">{t("approval.filterEmployee")}: {t("approval.all")}</option>
          {team.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select className="input input-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t("approval.all")}</option>
          <option value="submitted">{t("status.submitted")}</option>
          <option value="approved">{t("status.approved")}</option>
          <option value="returned">{t("status.returned")}</option>
          <option value="corrected">{t("status.corrected")}</option>
        </select>
        {selected.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={bulkApprove}>
            <Check size={14} /> {t("buttons.bulkApprove")} ({selected.length})
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState>{t("approval.empty")}</EmptyState>
      ) : (
        <div className="ledger">
          {visible.map((e) => {
            const emp = employees.find((x) => x.id === e.employeeId);
            return (
              <div className="ledger-row" key={e.id}>
                {e.status === "submitted" && <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} />}
                <div className="ledger-emp">{emp?.name}</div>
                <div className="ledger-date">{e.date}</div>
                <ShiftTag shift={e.shift} t={t} />
                <div className="ledger-hours">{e.hours} {t("misc.hoursShort")}</div>
                <div className="ledger-loc">{e.country} · {e.plant}</div>
                <Stamp status={e.status} t={t} />
                {e.status === "submitted" && (
                  <div className="row-actions">
                    <button className="icon-btn approve" title={t("buttons.approve")} onClick={() => onApprove(e.id)}>
                      <Check size={15} />
                    </button>
                    <button className="icon-btn reject" title={t("buttons.return")} onClick={() => setReturning(e.id)}>
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {returning && (
        <div className="modal-backdrop" onClick={() => setReturning(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">{t("approval.reasonPrompt")}</h3>
            <textarea className="input" rows={3} placeholder={t("approval.reasonPlaceholder")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setReturning(null)}>{t("buttons.cancel")}</button>
              <button
                className="btn btn-danger"
                disabled={!reason.trim()}
                onClick={() => { onReturn(returning, reason); setReturning(null); setReason(""); }}
              >
                {t("buttons.return")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Correction view                                                        */
/* ---------------------------------------------------------------------- */

function CorrectionView({ t, user, entries, employees, auditLog, onCorrect }) {
  const [pickedId, setPickedId] = useState(null);
  const [reason, setReason] = useState("");
  const [draft, setDraft] = useState(null);

  const team = user.role === "admin" ? employees.filter((e) => e.role !== "admin") : employees.filter((e) => e.supervisorId === user.id);
  const teamIds = new Set(team.map((e) => e.id));
  const finalized = entries.filter((e) => teamIds.has(e.employeeId) && (e.status === "approved" || e.status === "corrected"));
  const picked = finalized.find((e) => e.id === pickedId);

  useEffect(() => {
    setDraft(picked ? { ...picked } : null);
    setReason("");
  }, [pickedId]); // eslint-disable-line

  const history = auditLog.filter((a) => a.entryId === pickedId);

  function set(k, v) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function save() {
    if (!draft || !reason.trim()) return;
    onCorrect(picked.id, { date: draft.date, start: draft.start, end: draft.end, shift: draft.shift, country: draft.country, city: draft.city, plant: draft.plant, reason });
    setReason("");
  }

  return (
    <div>
      <h2 className="section-title">{t("correction.title")}</h2>
      <select className="input" value={pickedId || ""} onChange={(e) => setPickedId(e.target.value || null)}>
        <option value="">{t("correction.pickRecord")}</option>
        {finalized.map((e) => {
          const emp = employees.find((x) => x.id === e.employeeId);
          return (
            <option key={e.id} value={e.id}>{emp?.name} — {e.date} ({e.start}–{e.end})</option>
          );
        })}
      </select>

      {finalized.length === 0 && <EmptyState>{t("correction.noRecords")}</EmptyState>}

      {picked && draft && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <div className="compare-grid">
            <div className="compare-col">
              <div className="compare-head">{t("correction.original")}</div>
              <div className="compare-line">{picked.date} · {picked.start}–{picked.end}</div>
              <div className="compare-line">{t("shift." + picked.shift)}</div>
              <div className="compare-line">{picked.country} · {picked.city} · {picked.plant}</div>
              <div className="compare-line">{picked.hours} {t("misc.hoursShort")}</div>
            </div>
            <div className="compare-col">
              <div className="compare-head">{t("correction.newValue")}</div>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">{t("fields.start")}</label>
                  <input type="time" className="input" value={draft.start} onChange={(e) => set("start", e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">{t("fields.end")}</label>
                  <input type="time" className="input" value={draft.end} onChange={(e) => set("end", e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">{t("fields.shift")}</label>
                  <select className="input" value={draft.shift} onChange={(e) => set("shift", e.target.value)}>
                    <option value="day">{t("shift.day")}</option>
                    <option value="night">{t("shift.night")}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <label className="field-label">{t("correction.reason")}</label>
          <textarea className="input" rows={2} placeholder={t("correction.reasonPlaceholder")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="btn-row">
            <button className="btn btn-primary" disabled={!reason.trim()} onClick={save}>{t("buttons.save")}</button>
          </div>

          {history.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: "1.25rem" }}>{t("correction.history")}</div>
              {history.map((h) => (
                <div className="audit-mini" key={h.id}>
                  <strong>{employees.find((e) => e.id === h.changedBy)?.name}</strong> — {h.reason}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Export view                                                            */
/* ---------------------------------------------------------------------- */

function ExportView({ t, lang, entries, employees, settings, onSaveSettings, onExport }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [group, setGroup] = useState("all");
  const [allowanceDraft, setAllowanceDraft] = useState(settings.allowancePerDay);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => setAllowanceDraft(settings.allowancePerDay), [settings.allowancePerDay]);

  const supervisors = employees.filter((e) => e.role === "supervisor");
  const groupEmployees = group === "all" ? employees.filter((e) => e.role !== "admin") : employees.filter((e) => e.supervisorId === group);

  const rows = groupEmployees.map((emp) => {
    const empEntries = entries.filter((e) => e.employeeId === emp.id && monthKey(e.date) === month && (e.status === "approved" || e.status === "corrected"));
    const worked = Math.round(empEntries.reduce((s, e) => s + e.hours, 0) * 100) / 100;
    const diff = Math.round((settings.expectedMonthlyHours - worked) * 100) / 100;
    const days = new Set(empEntries.map((e) => e.date)).size;
    const allowance = days * settings.allowancePerDay;
    const extraAllowancePercent = empEntries.length
      ? Math.round((empEntries.reduce((s, e) => s + (e.extraAllowance || 0), 0) / empEntries.length) * 100) / 100
      : 0;
    const approverIds = [...new Set(empEntries.map((e) => e.approvedBy).filter(Boolean))];
    const approverName = approverIds.length ? employees.find((x) => x.id === approverIds[0])?.name : "";
    const mods = empEntries.filter((e) => e.lastModifiedAt).sort((a, b) => (a.lastModifiedAt < b.lastModifiedAt ? 1 : -1));
    const lastMod = mods[0];
    return {
      name: emp.name, expected: settings.expectedMonthlyHours, worked, diff, allowance, extraAllowancePercent,
      approverName: approverName || t("exportView.noneYet"),
      lastModDate: lastMod ? lastMod.lastModifiedAt.slice(0, 10) : t("exportView.noneYet"),
      lastModBy: lastMod ? employees.find((x) => x.id === lastMod.lastModifiedBy)?.name : t("exportView.noneYet"),
    };
  });

  function saveAllowance() {
    const val = Math.max(0, Number(allowanceDraft) || 0);
    onSaveSettings({ ...settings, allowancePerDay: val });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <div>
      <h2 className="section-title">{t("exportView.title")}</h2>
      <div className="filter-row">
        <div className="field">
          <label className="field-label">{t("exportView.month")}</label>
          <input type="month" className="input input-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">{t("exportView.group")}</label>
          <select className="input input-sm" value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">{t("exportView.allGroups")}</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">{t("exportView.allowanceSetting")}</label>
          <div className="allowance-edit">
            <input type="number" min="0" step="100" className="input input-sm" value={allowanceDraft} onChange={(e) => setAllowanceDraft(e.target.value)} />
            <span className="unit-suffix">{t("misc.currency")}</span>
            <button className="btn btn-ghost btn-sm" onClick={saveAllowance} disabled={Number(allowanceDraft) === settings.allowancePerDay}>
              {t("buttons.save")}
            </button>
            {savedFlash && <span className="inline-saved">{t("exportView.allowanceSaved")}</span>}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onExport("csv", month, group)}>
          <Download size={14} /> {t("buttons.exportCsv")}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => onExport("xlsx", month, group)}>
          <FileSpreadsheet size={14} /> {t("buttons.exportXlsx")}
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("exportView.name")}</th>
              <th>{t("exportView.expected")}</th>
              <th>{t("exportView.worked")}</th>
              <th>{t("exportView.difference")}</th>
              <th>{t("exportView.allowance")}</th>
              <th>{t("exportView.extraAllowance")}</th>
              <th>{t("exportView.approver")}</th>
              <th>{t("exportView.lastMod")}</th>
              <th>{t("exportView.lastModBy")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.name}</td>
                <td>{r.expected}</td>
                <td>{r.worked}</td>
                <td className={r.diff > 0 ? "warn" : "good"}>{r.diff}</td>
                <td>{r.allowance.toLocaleString(LOCALE_MAP[lang])} {t("misc.currency")}</td>
                <td>{r.extraAllowancePercent}%</td>
                <td>{r.approverName}</td>
                <td>{r.lastModDate}</td>
                <td>{r.lastModBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Audit log view                                                         */
/* ---------------------------------------------------------------------- */

function AuditLogView({ t, lang, auditLog, employees }) {
  const sorted = [...auditLog].sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1));
  return (
    <div>
      <h2 className="section-title">{t("audit.title")}</h2>
      {sorted.length === 0 ? (
        <EmptyState>{t("audit.empty")}</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("audit.entry")}</th>
                <th>{t("audit.changedBy")}</th>
                <th>{t("audit.changedAt")}</th>
                <th>{t("audit.reason")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{h.entryId}</td>
                  <td>{employees.find((e) => e.id === h.changedBy)?.name}</td>
                  <td className="mono">{fmtDate(h.changedAt, lang)}</td>
                  <td>{h.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Users view                                                             */
/* ---------------------------------------------------------------------- */

function UsersView({ t, employees, currentUser, onAdd, onDelete, onUpdate }) {
  const [form, setForm] = useState({ name: "", code: "", role: "employee", supervisorId: "", password: "" });
  const [confirmingId, setConfirmingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const supervisors = employees.filter((e) => e.role === "supervisor");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(emp) {
    setEditingId(emp.id);
    setEditForm({ name: emp.name, code: emp.code, role: emp.role, supervisorId: emp.supervisorId || "" });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError("");
  }

  function setEdit(k, v) {
    setEditForm((f) => ({ ...f, [k]: v }));
  }

  async function saveEdit(id) {
    if (!editForm.name.trim() || !editForm.code.trim()) return;
    setEditError("");
    try {
      await onUpdate(id, {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        role: editForm.role,
        supervisorId: editForm.role === "employee" ? editForm.supervisorId || null : null,
      });
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function submit() {
    setFormError("");
    if (!form.name.trim() || !form.code.trim() || form.password.length < 6) return;
    try {
      await onAdd({
        name: form.name.trim(),
        code: form.code.trim(),
        role: form.role,
        supervisorId: form.role === "employee" ? form.supervisorId || null : null,
        password: form.password,
      });
      setForm({ name: "", code: "", role: "employee", supervisorId: "", password: "" });
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div>
      <h2 className="section-title">{t("users.title")}</h2>

      <div className="panel" style={{ marginBottom: "1.2rem" }}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">{t("users.name")}</label>
            <input className="input" placeholder={t("users.namePlaceholder")} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">{t("users.code")}</label>
            <input className="input" placeholder={t("users.codePlaceholder")} value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">{t("users.role")}</label>
            <select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="employee">{t("users.role_employee")}</option>
              <option value="supervisor">{t("users.role_supervisor")}</option>
              <option value="admin">{t("users.role_admin")}</option>
            </select>
          </div>
          {form.role === "employee" && (
            <div className="field">
              <label className="field-label">{t("users.supervisor")}</label>
              <select className="input" value={form.supervisorId} onChange={(e) => set("supervisorId", e.target.value)}>
                <option value="">{t("users.none")}</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label className="field-label">{t("users.password")}</label>
            <input type="password" className="input" placeholder={t("users.passwordPlaceholder")} value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
        </div>
        {formError && <div className="login-error" style={{ marginTop: "0.6rem" }}>{formError}</div>}
        <div className="btn-row" style={{ justifyContent: "flex-start" }}>
          <button className="btn btn-primary btn-sm" disabled={!form.name.trim() || !form.code.trim() || form.password.length < 6} onClick={submit}>
            <Plus size={14} /> {t("users.add")}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("users.name")}</th>
              <th>{t("users.code")}</th>
              <th>{t("users.role")}</th>
              <th>{t("users.supervisor")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const sup = employees.find((x) => x.id === e.supervisorId);
              const isEditing = editingId === e.id;

              if (isEditing) {
                return (
                  <tr key={e.id}>
                    <td><input className="input input-sm" value={editForm.name} onChange={(ev) => setEdit("name", ev.target.value)} /></td>
                    <td><input className="input input-sm mono" value={editForm.code} onChange={(ev) => setEdit("code", ev.target.value)} /></td>
                    <td>
                      <select className="input input-sm" value={editForm.role} onChange={(ev) => setEdit("role", ev.target.value)}>
                        <option value="employee">{t("users.role_employee")}</option>
                        <option value="supervisor">{t("users.role_supervisor")}</option>
                        <option value="admin">{t("users.role_admin")}</option>
                      </select>
                    </td>
                    <td>
                      {editForm.role === "employee" ? (
                        <select className="input input-sm" value={editForm.supervisorId} onChange={(ev) => setEdit("supervisorId", ev.target.value)}>
                          <option value="">{t("users.none")}</option>
                          {supervisors.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        t("users.none")
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn approve" title={t("buttons.save")} disabled={!editForm.name.trim() || !editForm.code.trim()} onClick={() => saveEdit(e.id)}>
                          <Check size={14} />
                        </button>
                        <button className="icon-btn reject" title={t("buttons.cancel")} onClick={cancelEdit}>
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={e.id}>
                  <td>{e.name}{e.id === currentUser.id ? " •" : ""}</td>
                  <td className="mono">{e.code}</td>
                  <td>{t("users.role_" + e.role)}</td>
                  <td>{sup ? sup.name : t("users.none")}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" title={t("buttons.edit")} onClick={() => startEdit(e)}>
                        <Pencil size={14} />
                      </button>
                      {e.id !== currentUser.id && (
                        <button className="icon-btn reject" title={t("buttons.delete")} onClick={() => setConfirmingId(e.id)}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editError && <div className="login-error" style={{ marginTop: "0.6rem" }}>{editError}</div>}

      {confirmingId && (
        <div className="modal-backdrop" onClick={() => setConfirmingId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">{t("buttons.confirmDelete")}</h3>
            <p style={{ fontSize: "0.85rem" }}>{t("users.confirmDeleteMsg")}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--slate)" }}>{t("users.deleteWarning")}</p>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setConfirmingId(null)}>{t("buttons.cancel")}</button>
              <button className="btn btn-danger" onClick={() => { onDelete(confirmingId); setConfirmingId(null); }}>
                {t("buttons.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Locations view                                                         */
/* ---------------------------------------------------------------------- */

function LocationsView({ t, locations, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState({ country: "", city: "", plant: "" });
  const [formError, setFormError] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setFormError("");
    if (!form.country.trim() || !form.city.trim() || !form.plant.trim()) return;
    try {
      await onAdd({ country: form.country.trim(), city: form.city.trim(), plant: form.plant.trim() });
      setForm({ country: "", city: "", plant: "" });
    } catch (err) {
      setFormError(err.message);
    }
  }

  function startEdit(loc) {
    setEditingId(loc.id);
    setEditForm({ country: loc.country, city: loc.city, plant: loc.plant });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError("");
  }

  function setEdit(k, v) {
    setEditForm((f) => ({ ...f, [k]: v }));
  }

  async function saveEdit(id) {
    if (!editForm.country.trim() || !editForm.city.trim() || !editForm.plant.trim()) return;
    setEditError("");
    try {
      await onUpdate(id, { country: editForm.country.trim(), city: editForm.city.trim(), plant: editForm.plant.trim() });
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      setEditError(err.message);
    }
  }

  return (
    <div>
      <h2 className="section-title">{t("locations.title")}</h2>

      <div className="panel" style={{ marginBottom: "1.2rem" }}>
        <div className="form-grid">
          <div className="field">
            <label className="field-label">{t("locations.country")}</label>
            <input className="input" placeholder={t("locations.countryPlaceholder")} value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">{t("locations.city")}</label>
            <input className="input" placeholder={t("locations.cityPlaceholder")} value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">{t("locations.plant")}</label>
            <input className="input" placeholder={t("locations.plantPlaceholder")} value={form.plant} onChange={(e) => set("plant", e.target.value)} />
          </div>
        </div>
        {formError && <div className="login-error" style={{ marginTop: "0.6rem" }}>{formError}</div>}
        <div className="btn-row" style={{ justifyContent: "flex-start" }}>
          <button className="btn btn-primary btn-sm" disabled={!form.country.trim() || !form.city.trim() || !form.plant.trim()} onClick={submit}>
            <Plus size={14} /> {t("locations.add")}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("locations.country")}</th>
              <th>{t("locations.city")}</th>
              <th>{t("locations.plant")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => {
              const isEditing = editingId === l.id;

              if (isEditing) {
                return (
                  <tr key={l.id}>
                    <td><input className="input input-sm" value={editForm.country} onChange={(ev) => setEdit("country", ev.target.value)} /></td>
                    <td><input className="input input-sm" value={editForm.city} onChange={(ev) => setEdit("city", ev.target.value)} /></td>
                    <td><input className="input input-sm" value={editForm.plant} onChange={(ev) => setEdit("plant", ev.target.value)} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn approve" title={t("buttons.save")} disabled={!editForm.country.trim() || !editForm.city.trim() || !editForm.plant.trim()} onClick={() => saveEdit(l.id)}>
                          <Check size={14} />
                        </button>
                        <button className="icon-btn reject" title={t("buttons.cancel")} onClick={cancelEdit}>
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={l.id}>
                  <td>{l.country}</td>
                  <td>{l.city}</td>
                  <td>{l.plant}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" title={t("buttons.edit")} onClick={() => startEdit(l)}>
                        <Pencil size={14} />
                      </button>
                      <button className="icon-btn reject" title={t("buttons.delete")} onClick={() => setConfirmingId(l.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editError && <div className="login-error" style={{ marginTop: "0.6rem" }}>{editError}</div>}

      {confirmingId && (
        <div className="modal-backdrop" onClick={() => setConfirmingId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">{t("buttons.confirmDelete")}</h3>
            <p style={{ fontSize: "0.85rem" }}>{t("locations.confirmDeleteMsg")}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--slate)" }}>{t("locations.deleteWarning")}</p>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setConfirmingId(null)}>{t("buttons.cancel")}</button>
              <button className="btn btn-danger" onClick={() => { onDelete(confirmingId); setConfirmingId(null); }}>
                {t("buttons.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Root app                                                                */
/* ---------------------------------------------------------------------- */

const NAV_ICONS = { dashboard: ListChecks, newEntry: Plus, approvals: Check, corrections: FileEdit, export: FileSpreadsheet, auditLog: ClipboardList, users: Users, locations: MapPin };

export default function App() {
  const [lang, setLang] = useState("hu");
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [entries, setEntries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [settings, setSettings] = useState({ allowancePerDay: 4500, expectedMonthlyHours: 168 });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const t = useT(lang);

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  const loadAll = useCallback(async (currentUser) => {
    const [emps, ents, sett, locs] = await Promise.all([api.listEmployees(), api.listEntries(), api.getSettings(), api.listLocations()]);
    setEmployees(emps);
    setEntries(ents);
    setSettings(sett);
    setLocations(locs);
    if (currentUser.role === "admin" || currentUser.role === "supervisor") {
      setAuditLog(await api.auditLog());
    }
  }, []);

  // Munkamenet visszaállítása oldalfrissítés után, ha még érvényes a token
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          const { user: me } = await api.me();
          setUser(me);
          await loadAll(me);
        } catch {
          setToken(null);
        }
      }
      setBooting(false);
    })();
  }, [loadAll]);

  async function handleLogin(code, password) {
    setLoginError("");
    setLoginLoading(true);
    try {
      const { token, user: me } = await api.login(code, password);
      setToken(token);
      setUser(me);
      await loadAll(me);
      setTab("dashboard");
    } catch (err) {
      setLoginError(err.message || t("login.error"));
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setEntries([]);
    setEmployees([]);
    setLocations([]);
    setAuditLog([]);
  }

  async function refreshEntries() {
    setEntries(await api.listEntries());
  }
  async function refreshAudit() {
    if (user.role === "admin" || user.role === "supervisor") setAuditLog(await api.auditLog());
  }

  async function saveDraft(fields) {
    setBusy(true);
    try {
      await api.createEntry({ ...fields, submit: false });
      await refreshEntries();
      flashToast(t("misc.confirmToast"));
      setTab("dashboard");
    } catch (err) {
      flashToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitEntry(fields) {
    setBusy(true);
    try {
      await api.createEntry({ ...fields, submit: true });
      await refreshEntries();
      flashToast(t("misc.confirmToast"));
      setTab("dashboard");
    } catch (err) {
      flashToast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function approveEntry(id) {
    try {
      await api.approveEntry(id);
      await refreshEntries();
    } catch (err) {
      flashToast(err.message);
    }
  }

  async function returnEntry(id, reason) {
    try {
      await api.returnEntry(id, reason);
      await refreshEntries();
      await refreshAudit();
    } catch (err) {
      flashToast(err.message);
    }
  }

  async function correctEntry(id, payload) {
    try {
      await api.correctEntry(id, payload);
      await refreshEntries();
      await refreshAudit();
      flashToast(t("misc.confirmToast"));
    } catch (err) {
      flashToast(err.message);
    }
  }

  async function addEmployee(payload) {
    await api.addEmployee(payload);
    setEmployees(await api.listEmployees());
  }

  async function updateEmployee(id, payload) {
    await api.updateEmployee(id, payload);
    setEmployees(await api.listEmployees());
  }

  async function deleteEmployee(id) {
    try {
      await api.deleteEmployee(id);
      setEmployees(await api.listEmployees());
    } catch (err) {
      flashToast(err.message);
    }
  }

  async function addLocation(payload) {
    await api.addLocation(payload);
    setLocations(await api.listLocations());
  }

  async function updateLocation(id, payload) {
    await api.updateLocation(id, payload);
    setLocations(await api.listLocations());
  }

  async function deleteLocation(id) {
    try {
      await api.deleteLocation(id);
      setLocations(await api.listLocations());
    } catch (err) {
      flashToast(err.message);
    }
  }

  async function saveSettings(next) {
    try {
      const saved = await api.updateSettings(next);
      setSettings(saved);
    } catch (err) {
      flashToast(err.message);
    }
  }

  async function doExport(kind, month, group) {
    try {
      const result = kind === "csv" ? await api.exportCsv(month, group) : await api.exportXlsx(month, group);
      downloadBlob(result);
    } catch (err) {
      flashToast(err.message);
    }
  }

  if (booting) {
    return (
      <>
        <GlobalStyles />
        <div className="boot-screen"><Clock size={22} strokeWidth={1.5} /></div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <GlobalStyles />
        <LoginScreen lang={lang} setLang={setLang} onLogin={handleLogin} t={t} error={loginError} loading={loginLoading} />
      </>
    );
  }

  const isSupervisorish = user.role === "supervisor" || user.role === "admin";
  const isAdmin = user.role === "admin";
  const navItems = ["dashboard", "newEntry"];
  if (isSupervisorish) navItems.push("approvals", "corrections");
  if (isAdmin) navItems.push("export", "auditLog", "users", "locations");

  return (
    <>
      <GlobalStyles />
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-logo-wrap">
              <img src={logo} alt="Inducat" className="brand-logo" />
            </span>
            <span>{t("appTitle")}</span>
          </div>

          <nav className="nav">
            {navItems.map((k) => {
              const Icon = NAV_ICONS[k];
              return (
                <button key={k} className={"nav-item" + (tab === k ? " active" : "")} onClick={() => setTab(k)}>
                  <Icon size={16} strokeWidth={1.75} />
                  {t("nav." + k)}
                </button>
              );
            })}
          </nav>

          <div className="sidebar-foot">
            <div className="lang-row compact">
              {LANGS.map((l) => (
                <button key={l} className={"lang-pill sm" + (l === lang ? " active" : "")} onClick={() => setLang(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="user-chip">
              <div className="avatar">{user.name.charAt(0)}</div>
              <div>
                <div className="user-chip-name">{user.name}</div>
                <div className="user-chip-role">{t("users.role_" + user.role)}</div>
              </div>
            </div>
            <button className="nav-item logout" onClick={handleLogout}>
              <LogOut size={16} strokeWidth={1.75} />
              {t("nav.logout")}
            </button>
          </div>
        </aside>

        <main className="main">
          {tab === "dashboard" && <Dashboard t={t} lang={lang} user={user} entries={entries} settings={settings} onOpenNewEntry={() => setTab("newEntry")} />}
          {tab === "newEntry" && <EntryForm t={t} locations={locations} onCancel={() => setTab("dashboard")} onSave={saveDraft} onSubmit={submitEntry} busy={busy} />}
          {tab === "approvals" && isSupervisorish && <ApprovalView t={t} user={user} entries={entries} employees={employees} onApprove={approveEntry} onReturn={returnEntry} />}
          {tab === "corrections" && isSupervisorish && <CorrectionView t={t} user={user} entries={entries} employees={employees} auditLog={auditLog} onCorrect={correctEntry} />}
          {tab === "export" && isAdmin && <ExportView t={t} lang={lang} entries={entries} employees={employees} settings={settings} onSaveSettings={saveSettings} onExport={doExport} />}
          {tab === "auditLog" && isAdmin && <AuditLogView t={t} lang={lang} auditLog={auditLog} employees={employees} />}
          {tab === "users" && isAdmin && <UsersView t={t} employees={employees} currentUser={user} onAdd={addEmployee} onDelete={deleteEmployee} onUpdate={updateEmployee} />}
          {tab === "locations" && isAdmin && <LocationsView t={t} locations={locations} onAdd={addLocation} onUpdate={updateLocation} onDelete={deleteLocation} />}
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function GlobalStyles() {
  return null; // styles are loaded globally from styles.css
}
