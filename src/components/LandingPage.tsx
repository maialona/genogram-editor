import { Network, Sparkles, Share2, ShieldCheck, ArrowRight } from "lucide-react";
import "./LandingPage.css";

const APP_VERSION = "0.2.0";

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI 輔助生成",
    body: "用文字描述家庭關係，AI 自動生成結構正確的家系圖，再手動微調細節。",
  },
  {
    icon: Network,
    title: "標準化符號",
    body: "完整支援 Genogram / McGoldrick-Gerson 標準符號與關係線，維持專業辨識度。",
  },
  {
    icon: Share2,
    title: "彈性匯出",
    body: "一鍵匯出圖片或文件，方便納入報告、病歷或家庭治療紀錄。",
  },
  {
    icon: ShieldCheck,
    title: "在地儲存",
    body: "文件預設儲存在本機，資料掌握在你手上，隨時可繼續編輯。",
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing-page">
      <main className="landing-hero">
        <p className="landing-eyebrow">家庭關係譜圖編輯器</p>
        <div className="landing-title-row">
          <h1 className="landing-title">Open Family Map</h1>
          <span className="landing-badge landing-badge-beta">Beta</span>
        </div>
        <p className="landing-subtitle">
          為協助個人與家庭的專業工作者打造。輸入文字或手動繪製，AI
          協助生成結構正確、易讀易改的家系圖，讓你專注在關係本身。
        </p>
        <div className="landing-actions">
          <button className="landing-cta" onClick={onGetStarted}>
            Get started
            <ArrowRight size={16} strokeWidth={2.25} />
          </button>
        </div>
      </main>

      <section className="landing-features" aria-label="產品特色">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article className="landing-feature-card" key={title}>
            <span className="landing-feature-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={2} />
            </span>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <footer className="landing-footer">
        <span>Open Family Map · v{APP_VERSION}</span>
        <span>&copy; 2026 Aolume</span>
      </footer>
    </div>
  );
}
