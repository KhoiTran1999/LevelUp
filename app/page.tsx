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

export const dynamic = 'force-dynamic';

export default function LevelUpPage() {
  const htmlFilePath = path.join(process.cwd(), 'public', 'index.html');
  let legacyTabsContent = '';
  let legacyOverlaysContent = '';

  try {
    const rawHtml = fs.readFileSync(htmlFilePath, 'utf8');
    const leaderboardIndex = rawHtml.indexOf('<section id="tab-leaderboard"');
    const mainCloseIndex = rawHtml.indexOf('</main>');
    const confettiIndex = rawHtml.indexOf('<!-- RPG Confetti VFX');

    if (leaderboardIndex !== -1 && mainCloseIndex !== -1) {
      legacyTabsContent = rawHtml.slice(leaderboardIndex, mainCloseIndex);
    }
    if (mainCloseIndex !== -1 && confettiIndex !== -1) {
      // Exclude duplicate legacy mobile navigation since React 19 MobileBottomNav manages it
      let overlays = rawHtml.slice(mainCloseIndex + 7, confettiIndex);
      overlays = overlays.replace(/<nav class="md:hidden m3-navigation-bar[\s\S]*?<\/nav>/i, '');
      // Exclude duplicate legacy proof modals since React 19 proof modals manage them
      overlays = overlays.replace(/<!-- =+\s*-->\s*<!-- MODAL: SUBMIT QUEST PROOF[\s\S]*?(?=<!-- =+\s*-->\s*<!-- ONBOARDING INTERACTIVE TOUR)/i, '');
      // Exclude legacy quest & reward setup modals since React 19 QuestSetupModal & RewardSetupModal manage them
      overlays = overlays.replace(/<!--\s*MODAL 1: SUBMIT QUEST TO AI ARBITER[\s\S]*?(?=<!--\s*MODAL 3: PROFILE & SYNC)/i, '');
      legacyOverlaysContent = overlays;
    }
  } catch (err) {
    console.error('Error reading LevelUp public/index.html template:', err);
  }

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

          {/* Legacy Main Tabs (Leaderboard, Ledger, Bank, Admin, Tracker) */}
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

        {/* React 19 Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </LevelUpProvider>
  );
}
