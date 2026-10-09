import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getDb, initDb } from '../offline/db';

const copy = {
  en: {
    fieldOperations: 'FIELD OPERATIONS', goodMorning: 'Good morning', homeIntro: 'Keep your route moving and your records current.', syncStatus: 'Sync status', synced: 'Synced', monthlyTarget: 'Monthly sales target', noTarget: 'No target set for {month}', today: 'Today at a glance', outletsVisited: 'Outlets visited', salesLogged: 'Sales logged', totalToday: 'Total today', shiftInProgress: 'Shift in progress', readyForShift: 'Ready for your shift?', routeActive: 'Route tracking is active', startTracking: 'Start tracking when you leave your base', startShift: 'Start shift', endShift: 'End shift', quickAccess: 'Quick access', assignedOutlets: 'Assigned outlets', todaysRoute: 'Today’s route', salesHistory: 'Sales history', shiftHistory: 'Shift history', pendingSales: 'Pending sales', performance: 'My performance', language: 'Language', signOut: 'Sign out', logSale: 'Log sale', shiftHistoryTitle: 'Shift history', routeMapTitle: 'Today’s route', pendingSalesTitle: 'Pending sales', performanceTitle: 'My performance', exportCsv: 'Export CSV', records: 'RECORDS', submittedTransactions: 'Your submitted transactions', noSales: 'No sales yet', noSalesMessage: 'Completed sales will appear here once they are recorded.', homeTab: 'Home', salesTab: 'Sales', moreTab: 'More', account: 'Account', workspace: 'Workspace', settings: 'Settings', darkMode: 'Dark mode', teamAnnouncements: 'Team announcements', fieldRequests: 'Request time or field support', updatedAt: 'Updated {time}', syncFailed: 'Sync failed', todayRoute: 'Today’s route', quickActions: 'Quick actions', recordSale: 'Record sale', outlets: 'Outlets', routeAction: 'View today’s route', shiftActive: 'Shift active', ready: 'Ready for your shift?', startShiftPrompt: 'Location tracking will begin when you start your shift.', offlineStatus: 'Offline', queuedSync: '{count} waiting to sync',
  },
  sw: {
    fieldOperations: 'OPERESHENI ZA UWANJANI', goodMorning: 'Habari za asubuhi', homeIntro: 'Endelea na njia yako na weka rekodi zako sahihi.', syncStatus: 'Hali ya usawazishaji', synced: 'Zimesawazishwa', monthlyTarget: 'Lengo la mauzo ya mwezi', noTarget: 'Hakuna lengo la {month}', today: 'Leo kwa muhtasari', outletsVisited: 'Maduka yaliyotembelewa', salesLogged: 'Mauzo yaliyowekwa', totalToday: 'Jumla ya leo', shiftInProgress: 'Zamu inaendelea', readyForShift: 'Uko tayari kwa zamu?', routeActive: 'Ufuatiliaji wa njia unaendelea', startTracking: 'Anza ufuatiliaji unapoondoka kituoni', startShift: 'Anza zamu', endShift: 'Maliza zamu', quickAccess: 'Ufikiaji wa haraka', assignedOutlets: 'Maduka uliyopangiwa', todaysRoute: 'Njia ya leo', salesHistory: 'Historia ya mauzo', shiftHistory: 'Historia ya zamu', pendingSales: 'Mauzo yanayosubiri', performance: 'Utendaji wangu', language: 'Lugha', signOut: 'Ondoka', logSale: 'Weka mauzo', shiftHistoryTitle: 'Historia ya zamu', routeMapTitle: 'Njia ya leo', pendingSalesTitle: 'Mauzo yanayosubiri', performanceTitle: 'Utendaji wangu', exportCsv: 'Hamisha CSV', records: 'REKODI', submittedTransactions: 'Miamala uliyotuma', noSales: 'Bado hakuna mauzo', noSalesMessage: 'Mauzo yaliyokamilika yataonekana hapa yakisharekodiwa.', homeTab: 'Nyumbani', salesTab: 'Mauzo', moreTab: 'Zaidi', account: 'Akaunti', workspace: 'Eneo la kazi', settings: 'Mipangilio', darkMode: 'Hali ya giza', teamAnnouncements: 'Matangazo ya timu', fieldRequests: 'Omba ruhusa au usaidizi wa kazi', updatedAt: 'Ilisasishwa {time}', syncFailed: 'Usawazishaji umeshindwa', todayRoute: 'Njia ya leo', quickActions: 'Vitendo vya haraka', recordSale: 'Rekodi mauzo', outlets: 'Maduka', routeAction: 'Tazama njia ya leo', shiftActive: 'Zamu inaendelea', ready: 'Uko tayari kwa zamu?', startShiftPrompt: 'Ufuatiliaji wa eneo utaanza ukianza zamu.', offlineStatus: 'Nje ya mtandao', queuedSync: '{count} zinasubiri kusawazishwa',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initDb();
    const saved = getDb().getFirstSync("SELECT value FROM app_settings WHERE key = 'language';");
    if (saved?.value in copy) setLanguageState(saved.value);
    setReady(true);
  }, []);
  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage);
    getDb().runSync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);', ['language', nextLanguage]);
  };
  const value = useMemo(() => ({ language, setLanguage, t: (key, values = {}) => (copy[language][key] || copy.en[key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`) }), [language]);
  return <LanguageContext.Provider value={value}>{ready ? children : null}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}
