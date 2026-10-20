import fs from 'node:fs';
import path from 'node:path';
import { LevelUpProvider } from '@/components/providers/LevelUpProvider';
import { Header } from '@/components/header/Header';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TabNavigation } from '@/components/navigation/TabNavigation';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { FocusTimerBanner } from '@/components/timer/FocusTimerBanner';
import { QuestList } from '@/components/quests/QuestList';
import { ShopContainer } from '@/components/shop/ShopContainer';
import { NotesWorkspace } from '@/components/notes/NotesWorkspace';
import { LegacyViewsBridge } from '@/components/bridge/LegacyViewsBridge';
import { QuestProofModal } from '@/components/proof/QuestProofModal';
import { ProofApprovedModal } from '@/components/proof/ProofApprovedModal';
import { ProofViewerModal } from '@/components/proof/ProofViewerModal';
import { QuestSetupModal } from '@/components/quests/QuestSetupModal';
import { RewardSetupModal } from '@/components/shop/RewardSetupModal';
import { BankContainer } from '@/components/bank/BankContainer';
import { BankWithdrawModal } from '@/components/bank/BankWithdrawModal';
import { BankRulesModal } from '@/components/bank/BankRulesModal';
import { CreditLimitModal } from '@/components/bank/CreditLimitModal';
import { LedgerContainer } from '@/components/ledger/LedgerContainer';

export const dynamic = 'force-dynamic';

let cachedLegacyTabs: string | null = null;
let cachedLegacyOverlays: string | null = null;

function getLegacyTemplates(): { tabs: string; overlays: string } {
  if (cachedLegacyTabs !== null && cachedLegacyOverlays !== null) {
    return { tabs: cachedLegacyTabs, overlays: cachedLegacyOverlays };
  }

  const htmlFilePath = path.join(process.cwd(), 'public', 'index.html');
  let legacyTabsContent = '';
  let legacyOverlaysContent = '';

  try {
    const rawHtml = fs.readFileSync(htmlFilePath, 'utf8');
    const leaderboardIndex = rawHtml.indexOf('<section id="tab-leaderboard"');
    const mainCloseIndex = rawHtml.indexOf('</main>');
    const confettiIndex = rawHtml.indexOf('<!-- RPG Confetti VFX');

    if (leaderboardIndex !== -1 && mainCloseIndex !== -1) {
      let tabs = rawHtml.slice(leaderboardIndex, mainCloseIndex);
      // Exclude legacy bank tab since React 19 BankContainer manages it
      tabs = tabs.replace(/<section\s+id="tab-bank"[\s\S]*?<\/section>/i, '');
      // Exclude legacy ledger tab since React 19 LedgerContainer manages it
      tabs = tabs.replace(/<section\s+id="tab-ledger"[\s\S]*?<\/section>/i, '');
      legacyTabsContent = tabs;
    }
    if (mainCloseIndex !== -1 && confettiIndex !== -1) {
      // Exclude duplicate legacy mobile navigation since React 19 MobileBottomNav manages it
      let overlays = rawHtml.slice(mainCloseIndex + 7, confettiIndex);
      overlays = overlays.replace(/<nav class="md:hidden m3-navigation-bar[\s\S]*?<\/nav>/i, '');
      // Exclude duplicate legacy proof modals since React 19 proof modals manage them
      overlays = overlays.replace(/<!-- =+\s*-->\s*<!-- MODAL: SUBMIT QUEST PROOF[\s\S]*?(?=<!-- =+\s*-->\s*<!-- ONBOARDING INTERACTIVE TOUR)/i, '');
      // Exclude legacy quest & reward setup modals since React 19 QuestSetupModal & RewardSetupModal manage them
      overlays = overlays.replace(/<!--\s*MODAL 1: SUBMIT QUEST TO AI ARBITER[\s\S]*?(?=<!--\s*MODAL 3: PROFILE & SYNC)/i, '');
      // Exclude legacy bank modals since React 19 bank modals manage them
      overlays = overlays.replace(/<!--\s*MODAL:\s*H[^>]*VAY[\s\S]*?(?=<!--\s*MODAL 5:\s*WELCOME)/i, '');
      legacyOverlaysContent = overlays;
    }
  } catch (err) {
    console.error('Error reading LevelUp public/index.html template:', err);
  }

  cachedLegacyTabs = legacyTabsContent;
  cachedLegacyOverlays = legacyOverlaysContent;
  return { tabs: legacyTabsContent, overlays: legacyOverlaysContent };
}

export default function LevelUpPage() {
  const { tabs: legacyTabsContent, overlays: legacyOverlaysContent } = getLegacyTemplates();

  return (
    <LevelUpProvider>
      <div id="levelup-app" className="contents" suppressHydrationWarning>
        {/* React 19 Header & Hero Status Bar */}
        <Header />

        {/* React 19 Material 3 Global Linear Progress Bar */}
        <ProgressBar id="global-progress-bar" isIndeterminate={true} visible={false} />

        {/* React 19 Desktop Tab Navigation */}
        <TabNavigation />

        {/* Main Content Area */}
        <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* React 19 Active Focus Timer Banner */}
          <FocusTimerBanner />

          {/* React 19 Quests Section */}
          <section id="tab-quests" className="tab-pane block">
            <QuestList />
          </section>

          {/* React 19 Shop & Inventory Section */}
          <section id="tab-shop" className="tab-pane hidden">
            <ShopContainer />
          </section>

          {/* React 19 Notes Workspace Section */}
          <section id="tab-notes" className="tab-pane hidden">
            <NotesWorkspace />
          </section>

          {/* React 19 Bank Section */}
          <section id="tab-bank" className="tab-pane hidden">
            <BankContainer />
          </section>

          {/* React 19 Ledger & Proof Album Section */}
          <section id="tab-ledger" className="tab-pane hidden">
            <LedgerContainer />
          </section>

          {/* Legacy Main Tabs (Leaderboard, Admin, Tracker) */}
          <LegacyViewsBridge content={legacyTabsContent} />
        </main>

        {/* Legacy Modals, Overlays, and Sheets */}
        <LegacyViewsBridge content={legacyOverlaysContent} />

        {/* React 19 Quest Proof & AI Arbiter Modals */}
        <QuestProofModal />
        <ProofApprovedModal />
        <ProofViewerModal />

        {/* React 19 Quest & Reward AI Setup Modals */}
        <QuestSetupModal />
        <RewardSetupModal />

        {/* React 19 Bank Modals */}
        <BankWithdrawModal />
        <BankRulesModal />
        <CreditLimitModal />

        {/* React 19 Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </LevelUpProvider>
  );
}
