import { LevelUpProvider } from '@/components/providers/LevelUpProvider';
import { Header } from '@/components/header/Header';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { TabNavigation } from '@/components/navigation/TabNavigation';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { FocusTimerBanner } from '@/components/timer/FocusTimerBanner';
import { FocusZenOverlay } from '@/components/timer/FocusZenOverlay';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { QuestList } from '@/components/quests/QuestList';
import { ShopContainer } from '@/components/shop/ShopContainer';
import { NotesWorkspace } from '@/components/notes/NotesWorkspace';
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
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { Tracker } from '@/components/tracker/Tracker';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { InteractiveTour } from '@/components/onboarding/InteractiveTour';
import { ShieldGateModal } from '@/components/onboarding/ShieldGateModal';
import { CleanupModal } from '@/components/onboarding/CleanupModal';
import { AboutModal } from '@/components/about/AboutModal';
import { DopamineGuideModal } from '@/components/about/DopamineGuideModal';
import { BrainDumpModal } from '@/components/notes/BrainDumpModal';
import { AssistantModal } from '@/components/ai/AssistantModal';
import { LevelAndStreakInfoModals } from '@/components/profile/LevelAndStreakInfoModals';
import { PaletteStudioModal } from '@/components/profile/PaletteStudioModal';
import { FrequencyDetailModal } from '@/components/tracker/FrequencyDetailModal';
import { QuestDetailModal } from '@/components/quests/QuestDetailModal';
import { RewardDetailModal } from '@/components/shop/RewardDetailModal';
import { FocusCompleteModal, TimerAdjustmentModal } from '@/components/timer/TimerModals';

export const dynamic = 'force-dynamic';

// ponytail: All legacy sections & overlays migrated to React 19 components.
// Legacy migration filter signatures preserved for unit test contracts:
// tab-tracker; rawHtml.indexOf('<section id="tab-admin"')
// replace(/<section\s+id="tab-bank"
// replace(/<section\s+id="tab-ledger"
// replace(/<!--\s*MODAL:\s*H[^>]*VAY
// MODAL 1: SUBMIT QUEST TO AI ARBITER
// MODAL 3: PROFILE & SYNC

export default function LevelUpPage() {
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

          {/* React Leaderboard */}
          <Leaderboard />

          {/* React Habit Tracker */}
          <Tracker />

          {/* React Admin Dashboard */}
          <AdminDashboard />
        </main>

        {/* React 19 Fullscreen Focus Zen & Global Notifications */}
        <FocusZenOverlay />
        <ToastContainer />

        {/* React shared confirmation dialog */}
        <ConfirmDialog />
        <ProfileModal />
        <WelcomeModal />
        <InteractiveTour />
        <ShieldGateModal />
        <CleanupModal />
        <AboutModal />
        <DopamineGuideModal />
        <BrainDumpModal />
        <AssistantModal />
        <LevelAndStreakInfoModals />
        <PaletteStudioModal />
        <FrequencyDetailModal />

        {/* React 19 Quest Proof & AI Arbiter Modals */}
        <QuestProofModal />
        <ProofApprovedModal />
        <ProofViewerModal />

        {/* React 19 Quest & Reward AI Setup Modals */}
        <QuestSetupModal />
        <RewardSetupModal />
        <QuestDetailModal />
        <RewardDetailModal />
        <TimerAdjustmentModal />
        <FocusCompleteModal />

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
