import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  Database,
  Ellipsis,
  FileChartColumnIncreasing,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Play,
  Search,
  Settings,
  Sigma,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

const navigation = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "courses", label: "Khóa học của tôi", icon: BookOpen, badge: "4" },
  { id: "analytics", label: "Phân tích học tập", icon: BarChart3 },
  { id: "path", label: "Lộ trình cá nhân", icon: ListChecks, badge: "3" },
  { id: "activity", label: "Hoạt động", icon: Activity },
];

const iconMap = {
  chart: BarChart3,
  brain: BrainCircuit,
  database: Database,
  sigma: Sigma,
};

function App() {
  const [config, setConfig] = useState(null);
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState("overview");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [toast, setToast] = useState("");
  const [authError, setAuthError] = useState("");

  const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";
  const isLoggedIn = Boolean(user);

  useEffect(() => {
    async function load() {
      try {
        const [configResponse, meResponse, overviewResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/app-config`),
          fetch(`${apiBaseUrl}/me`),
          fetch(`${apiBaseUrl}/overview`),
        ]);
        if (!configResponse.ok || !meResponse.ok || !overviewResponse.ok) {
          throw new Error("Không tải được dữ liệu ứng dụng.");
        }
        const [configResult, meResult, overviewResult] = await Promise.all([
          configResponse.json(),
          meResponse.json(),
          overviewResponse.json(),
        ]);
        setConfig(configResult);
        setUser(meResult.user);
        setData(overviewResult);
      } catch {
        setAuthError("Không thể kết nối máy chủ. Hãy khởi động máy chủ ứng dụng rồi thử lại.");
      } finally {
        setBusy(false);
      }
    }
    load();
    const params = new URLSearchParams(window.location.search);
    const message = {
      cancelled: "Bạn đã hủy đăng nhập Google.",
      invalid_state: "Phiên đăng nhập không hợp lệ. Vui lòng thử lại.",
      oauth_failed: "Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.",
    }[params.get("authError")];
    if (message) {
      setAuthError(message);
      params.delete("authError");
      const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredCourses = useMemo(() => {
    if (!data) return [];
    return data.courses.filter((course) =>
      `${course.title} ${course.category}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);

  async function logout() {
    await fetch("/auth/logout", { method: "POST" });
    setUser(null);
    setProfileOpen(false);
    setToast("Đã đăng xuất an toàn.");
  }

  function startCourse(course) {
    setToast(`Đã mở khóa học “${course.title}”.`);
  }

  if (busy) {
    return <div className="loading-screen"><div className="brand-mark"><GraduationCap size={22} /></div><span>Đang chuẩn bị không gian học tập...</span></div>;
  }

  if (!isLoggedIn && !demoMode) {
    return (
      <LoginScreen
        config={config}
        error={authError}
        onDemo={() => {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("demo", "1");
          window.location.assign(nextUrl);
        }}
      />
    );
  }

  if (!data) return <LoginScreen config={config} error={authError} onDemo={() => {}} />;

  return (
    <div className="app-shell">
      {menuOpen && <button className="mobile-backdrop" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={21} strokeWidth={2.2} /></div>
          <span>learnwise<span className="brand-period">.</span></span>
          <button className="mobile-close icon-button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy"><strong>Không gian học tập</strong><span>Gói cá nhân</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        <div className="nav-section-label">MENU CHÍNH</div>
        <nav className="primary-nav" aria-label="Điều hướng chính">
          {navigation.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} className={`nav-item ${page === id ? "nav-active" : ""}`} onClick={() => { setPage(id); setMenuOpen(false); }}>
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {badge && <span className="nav-badge">{badge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="weekly-card">
            <div className="weekly-icon"><Sparkles size={16} /></div>
            <span className="weekly-eyebrow">MỤC TIÊU TUẦN</span>
            <strong>18,5 <small>/ 20 giờ</small></strong>
            <div className="weekly-progress"><span /></div>
            <span className="weekly-caption">Bạn gần đạt mục tiêu rồi! ✨</span>
          </div>
          <button className="nav-item support-link" onClick={() => setToast("Trung tâm trợ giúp sẽ sớm có mặt.")}><CircleHelp size={18} /><span>Trợ giúp</span></button>
          <div className="sidebar-user">
            <Avatar user={user} />
            <div className="sidebar-user-copy"><strong>{user?.name || "Người học demo"}</strong><span>{user?.email || "Chế độ xem thử"}</span></div>
            <button className="icon-button sidebar-more" aria-label="Tùy chọn tài khoản" onClick={() => setProfileOpen(!profileOpen)}><Ellipsis size={19} /></button>
            {profileOpen && <div className="profile-menu"><button onClick={logout}><LogOut size={15} />Đăng xuất</button></div>}
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>Không gian học tập</span><ChevronRight size={14} /><strong>{navigation.find((item) => item.id === page)?.label || "Tổng quan"}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm khóa học..." aria-label="Tìm khóa học" />
              <kbd><Command size={11} /> K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="Thông báo" onClick={() => setToast("Bạn đã cập nhật mọi thông báo.")}><Bell size={18} /><i /></button>
            <div className="topbar-divider" />
            <button className="topbar-profile" onClick={() => setProfileOpen(!profileOpen)} aria-label="Thông tin tài khoản">
              <Avatar user={user} /><span>{user?.name?.split(" ")[0] || "Khách"}</span><ChevronDown size={14} />
            </button>
            {profileOpen && <div className="topbar-profile-menu"><strong>{user?.email || "Chế độ xem thử"}</strong>{isLoggedIn && <button onClick={logout}><LogOut size={15} />Đăng xuất</button>}</div>}
          </div>
        </header>

        {demoMode && <div className="demo-banner"><Sparkles size={15} /><span>Chế độ xem thử · Dữ liệu minh họa, không phải dự đoán ML thực tế.</span><button onClick={() => window.location.assign("/")}>Đăng nhập Google<ArrowRight size={14} /></button></div>}

        <div className="page-content">
          {page === "overview" && <Overview data={data} onNavigate={setPage} onStart={startCourse} />}
          {page === "courses" && <Courses courses={filteredCourses} search={search} onStart={startCourse} />}
          {page === "analytics" && <Analytics data={data} />}
          {page === "path" && <LearningPath recommendations={data.recommendations} onStart={(item) => setToast(`Đã thêm “${item.title}” vào lộ trình.`)} />}
          {page === "activity" && <ActivityPage activities={data.activities} />}
        </div>
        <footer className="page-footer"><span>© {new Date().getFullYear()} Learnwise</span><span>Dữ liệu minh họa cho đồ án Cloud Computing</span><span className="footer-status"><i /> Hệ thống hoạt động</span></footer>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function Avatar({ user, size = "" }) {
  return user?.picture
    ? <img className={`avatar ${size}`} src={user.picture} alt="" referrerPolicy="no-referrer" />
    : <span className={`avatar avatar-fallback ${size}`}>{user?.name?.trim()?.[0]?.toUpperCase() || "A"}</span>;
}

function LoginScreen({ config, error, onDemo }) {
  const missing = config?.missingSettings || [];
  return (
    <main className="login-screen">
      <div className="login-top"><div className="brand"><div className="brand-mark"><GraduationCap size={21} /></div><span>learnwise<span className="brand-period">.</span></span></div><span className="login-top-note">Nền tảng học tập thông minh</span></div>
      <div className="login-layout">
        <section className="login-copy">
          <div className="login-kicker"><span className="kicker-spark"><Sparkles size={14} /></span> HỌC TẬP THEO CÁCH CỦA BẠN</div>
          <h1>Mỗi bước tiến<br />đều <span>đáng tự hào.</span></h1>
          <p>Theo dõi hành trình học tập, khám phá điểm mạnh và tìm ra lộ trình phù hợp nhất với bạn.</p>
          <div className="login-points">
            <div><span className="point-icon point-green"><BarChart3 size={17} /></span><span><strong>Hiểu rõ tiến độ</strong><small>Nhìn thấy sự tiến bộ mỗi ngày</small></span><Check size={16} /></div>
            <div><span className="point-icon point-purple"><BrainCircuit size={17} /></span><span><strong>Học đúng trọng tâm</strong><small>Gợi ý chủ đề tiếp theo phù hợp</small></span><Check size={16} /></div>
            <div><span className="point-icon point-orange"><Target size={17} /></span><span><strong>Chinh phục mục tiêu</strong><small>Biến kế hoạch thành thói quen</small></span><Check size={16} /></div>
          </div>
          <div className="login-testimonial"><div className="testimonial-avatars"><span>H</span><span>M</span><span>L</span><span>+</span></div><div><strong>Học tập có mục tiêu, tiến bộ mỗi ngày</strong><small>Không gian riêng dành cho hành trình của bạn</small></div></div>
        </section>
        <section className="login-card">
          <div className="login-card-icon"><GraduationCap size={22} /></div>
          <div className="login-card-heading"><h2>Chào mừng bạn!</h2><p>Đăng nhập để tiếp tục hành trình học tập.</p></div>
          {error && <div className="auth-alert"><CircleHelp size={16} /><span>{error}</span></div>}
          <a className={`google-button ${!config?.googleEnabled ? "google-disabled" : ""}`} href={config?.googleEnabled ? "/auth/google" : undefined} onClick={(event) => { if (!config?.googleEnabled) event.preventDefault(); }} aria-disabled={!config?.googleEnabled}>
            <GoogleIcon /><span>Tiếp tục với Google</span><ArrowRight size={16} />
          </a>
          {!config?.googleEnabled && (
            <div className="setup-notice">
              <strong>Đang chờ cấu hình Google OAuth</strong>
              <span>Thêm các biến sau vào tệp <code>.env</code> ở máy chủ:</span>
              <ul>{(missing.length ? missing : ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET"]).map((name) => <li key={name}><code>{name}</code></li>)}</ul>
              <small>Google Client Secret chỉ được sử dụng phía máy chủ.</small>
            </div>
          )}
          <div className="login-separator"><span /><small>HOẶC KHÁM PHÁ TRƯỚC</small><span /></div>
          <button className="demo-button" onClick={onDemo}><span className="demo-play"><Play size={13} fill="currentColor" /></span>Xem bản demo</button>
          <p className="login-disclaimer">Bằng việc tiếp tục, bạn đồng ý với <a href="#terms" onClick={(event) => event.preventDefault()}>Điều khoản sử dụng</a> và <a href="#privacy" onClick={(event) => event.preventDefault()}>Chính sách bảo mật</a>.</p>
        </section>
      </div>
      <div className="login-bottom"><span>© {new Date().getFullYear()} Learnwise</span><span><i /> Bảo mật thông tin của bạn luôn được ưu tiên</span></div>
    </main>
  );
}

function GoogleIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="google-logo"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(4 4)" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.24l7.73 6C44.38 38.05 47 31.95 47 24.55Z" transform="translate(1 0)" /><path fill="#FBBC05" d="M10.53 28.41A14.4 14.4 0 0 1 9.75 24c0-1.53.27-3.01.75-4.41l-7.98-6.19A23.91 23.91 0 0 0 0 24c0 3.86.92 7.51 2.52 10.74l8.01-6.33Z" transform="translate(4 0)" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-8.01 6.33C6.48 42.62 14.62 48 24 48Z" transform="translate(4 0)" /></svg>;
}

function PageHeading({ eyebrow, title, description, action, className = "" }) {
  return <div className={`page-heading ${className}`}><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Overview({ data, onNavigate, onStart }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Chào buổi sáng," : hour < 18 ? "Chào buổi chiều," : "Chào buổi tối,";

  return (
    <>
      <PageHeading className="overview-heading" eyebrow="KHÔNG GIAN HỌC TẬP CỦA BẠN" title={<>{greeting} <span className="heading-highlight">bạn nhé!</span> <span className="wave">✦</span></>} description="Một ngày mới để tiến gần hơn tới mục tiêu của bạn." action={<button className="date-filter"><Clock3 size={15} /> 7 ngày qua <ChevronDown size={14} /></button>} />
      <div className="stat-grid">{data.stats.map((stat, index) => <StatCard key={stat.label} stat={stat} index={index} />)}</div>
      <section className="dashboard-grid">
        <div className="panel activity-chart-panel">
          <div className="panel-heading"><div><h2>Thời gian học tập</h2><p>Thói quen học tập của bạn trong tuần này</p></div><button className="panel-menu" aria-label="Tùy chọn biểu đồ"><Ellipsis size={19} /></button></div>
          <div className="chart-summary"><strong>18,5 <small>giờ</small></strong><span className="trend-pill"><ArrowUpRight size={13} /> 12,8%</span><small>so với tuần trước</small></div>
          <div className="chart-container"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.weeklyActivity} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.24} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#f0ebf8" strokeDasharray="4 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9590a2", fontSize: 11 }} dy={10} /><Tooltip formatter={(value) => [`${value} giờ`, "Thời gian học"]} contentStyle={{ border: "1px solid #e8e2f1", borderRadius: 12, boxShadow: "0 8px 24px #34214a12", fontSize: 12 }} /><Area type="monotone" dataKey="hours" stroke="#8455e8" strokeWidth={2.5} fill="url(#activityFill)" activeDot={{ r: 5, fill: "#ff7d8f", stroke: "white", strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div>
          <div className="chart-legend"><span><i /> Giờ học mỗi ngày</span><span className="chart-insight"><Sparkles size={13} /> Thứ 5 là ngày học hiệu quả nhất</span></div>
        </div>
        <div className="panel goal-panel">
          <div className="panel-heading"><div><h2>Mục tiêu tuần</h2><p>Kiên trì một chút mỗi ngày!</p></div><div className="goal-illustration"><Target size={18} /></div></div>
          <div className="goal-ring" role="img" aria-label="Đạt 92 phần trăm mục tiêu tuần"><svg viewBox="0 0 140 140"><circle className="ring-track" cx="70" cy="70" r="57" /><circle className="ring-value" cx="70" cy="70" r="57" /></svg><div className="ring-label"><strong>92<span>%</span></strong><small>hoàn thành</small></div></div>
          <div className="goal-stats"><div><strong>18,5 <small>giờ</small></strong><span>Đã học</span></div><div><strong>20 <small>giờ</small></strong><span>Mục tiêu</span></div></div>
          <div className="goal-message"><Sparkles size={14} /> Chỉ còn <strong>1,5 giờ</strong> nữa thôi!</div>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><div className="eyebrow">TIẾP TỤC HÀNH TRÌNH</div><h2>Khóa học của bạn <span className="section-count">04</span></h2></div><button className="text-link" onClick={() => onNavigate("courses")}>Tất cả khóa học <ArrowRight size={15} /></button></div>
        <div className="course-grid">{data.courses.slice(0, 3).map((course) => <CourseCard key={course.id} course={course} onStart={onStart} />)}</div>
      </section>
      <section className="dashboard-grid lower-grid">
        <div className="panel recent-panel"><div className="panel-heading"><div><h2>Hoạt động gần đây</h2><p>Những bước tiến mới nhất của bạn</p></div><button className="text-link compact-link" onClick={() => onNavigate("activity")}>Xem tất cả <ArrowRight size={14} /></button></div><ActivityList activities={data.activities.slice(0, 3)} /></div>
        <div className="panel recommendation-panel"><div className="recommend-title"><div className="recommend-spark"><Sparkles size={17} /></div><div><h2>Gợi ý dành cho bạn</h2><p>Dựa trên tiến độ học gần đây</p></div></div><div className="recommendation-item"><div className="recommend-topic-icon"><BrainCircuit size={17} /></div><div><strong>Ôn tập ma trận và vector</strong><span>Nền tảng cho bài học PCA tiếp theo</span></div><button className="round-arrow" aria-label="Xem gợi ý"><ArrowRight size={15} /></button></div><button className="recommend-more" onClick={() => onNavigate("path")}>Khám phá lộ trình cá nhân <ArrowRight size={14} /></button></div>
      </section>
      <div className="sample-note"><CircleHelp size={14} /> Nội dung và số liệu trên trang này là dữ liệu minh họa cho prototype, chưa được kết nối với dữ liệu học tập hoặc mô hình ML thực tế.</div>
    </>
  );
}

function StatCard({ stat, index }) {
  const Icon = [BookOpen, Clock3, Target, TrendingUp][index];
  return <article className="stat-card"><div className={`stat-icon stat-icon-${index}`}><Icon size={17} /></div><div className="stat-top"><span>{stat.label}</span><button className="stat-more" aria-label={`Thông tin ${stat.label}`}><Ellipsis size={18} /></button></div><div className="stat-value">{stat.value}{index === 2 && <small>%</small>}</div><div className="stat-change"><span><ArrowUpRight size={13} /></span>{stat.change}</div></article>;
}

function CourseCard({ course, onStart }) {
  const Icon = iconMap[course.icon] || BookOpen;
  return <article className="course-card"><div className={`course-art course-art-${course.color}`}><div className="course-art-orbit" /><div className="course-art-icon"><Icon size={25} strokeWidth={1.7} /></div><span className="course-tag">{course.category}</span><button className="course-options" aria-label={`Tùy chọn ${course.title}`}><Ellipsis size={19} /></button></div><div className="course-card-body"><h3>{course.title}</h3><div className="course-meta"><span><BookOpen size={13} />{course.lessons}</span><span>{course.progress}%</span></div><div className="course-progress"><span style={{ width: `${course.progress}%` }} /></div><button className="course-continue" onClick={() => onStart(course)}><span><Play size={13} fill="currentColor" /></span>Tiếp tục học<ArrowRight size={14} /></button></div></article>;
}

function Courses({ courses, search, onStart }) {
  return <><PageHeading eyebrow="KHÔNG GIAN HỌC TẬP" title="Khóa học của tôi" description="Tiếp tục khám phá và chinh phục những chủ đề mới." action={<button className="primary-button" onClick={() => window.alert("Tính năng khám phá khóa học sẽ sớm có mặt.")}><Sparkles size={15} /> Khám phá khóa học</button>} /><div className="course-filter-row"><div className="filter-tabs"><button className="filter-active">Tất cả <span>04</span></button><button>Đang học <span>04</span></button><button>Đã hoàn thành <span>00</span></button></div><span className="result-count">{courses.length} khóa học</span></div>{courses.length ? <div className="course-grid course-page-grid">{courses.map((course) => <CourseCard key={course.id} course={course} onStart={onStart} />)}</div> : <div className="empty-state"><Search size={24} /><strong>Không tìm thấy khóa học</strong><span>Thử tìm với từ khóa khác.</span></div>}<div className="sample-note"><CircleHelp size={14} /> Các khóa học và tiến độ hiện là dữ liệu minh họa.</div></>;
}

function Analytics({ data }) {
  const subjects = [{ name: "Python", score: 90, color: "mint" }, { name: "SQL", score: 86, color: "violet" }, { name: "Machine Learning", score: 72, color: "peach" }, { name: "Thống kê", score: 68, color: "blue" }];
  return <><PageHeading eyebrow="HIỂU CÁCH BẠN HỌC" title="Phân tích học tập" description="Khám phá nhịp độ, kết quả và những chủ đề bạn đang chinh phục." action={<button className="date-filter"><Clock3 size={15} /> Tháng này <ChevronDown size={14} /></button>} /><div className="stat-grid analytics-stats">{data.stats.slice(1).map((stat, index) => <StatCard key={stat.label} stat={stat} index={index + 1} />)}</div><section className="dashboard-grid analytics-grid"><div className="panel activity-chart-panel"><div className="panel-heading"><div><h2>Nhịp độ học tập</h2><p>Số giờ học theo ngày trong tuần</p></div><span className="chart-legend"><i /> Giờ học</span></div><div className="chart-container analytics-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.weeklyActivity} margin={{ top: 15, right: 6, left: -24, bottom: 0 }}><defs><linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.24} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#f0ebf8" strokeDasharray="4 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#9590a2", fontSize: 11 }} dy={10} /><Tooltip formatter={(value) => [`${value} giờ`, "Thời gian học"]} /><Area type="monotone" dataKey="hours" stroke="#8455e8" strokeWidth={2.5} fill="url(#analyticsFill)" /></AreaChart></ResponsiveContainer></div></div><div className="panel skill-panel"><div className="panel-heading"><div><h2>Chủ đề nổi bật</h2><p>Mức độ hoàn thành theo chủ đề</p></div></div><div className="skill-list">{subjects.map((item) => <div className="skill-row" key={item.name}><div><span className={`skill-dot skill-${item.color}`} /><span>{item.name}</span><strong>{item.score}%</strong></div><div className="skill-track"><i style={{ width: `${item.score}%` }} /></div></div>)}</div><div className="skill-footnote"><Sparkles size={14} /> Python đang là điểm mạnh của bạn!</div></div></section><div className="insight-card"><div className="insight-icon"><Sparkles size={20} /></div><div><strong>Một gợi ý nhỏ cho hành trình của bạn</strong><p>Dành thêm thời gian cho Thống kê sẽ giúp bạn tự tin hơn khi bước vào các chủ đề Machine Learning nâng cao.</p></div><span className="insight-spark">✳</span></div><div className="sample-note"><CircleHelp size={14} /> Các chỉ số trong prototype là số liệu giả lập, không được tạo từ mô hình dự đoán đã huấn luyện.</div></>;
}

function LearningPath({ recommendations, onStart }) {
  return <><PageHeading eyebrow="BƯỚC TIẾP THEO CỦA BẠN" title="Lộ trình cá nhân" description="Một vài gợi ý để bạn học đúng trọng tâm và giữ nhịp tiến bộ." action={<button className="date-filter"><Sparkles size={15} /> Đề xuất mẫu</button>} /><div className="path-overview"><div className="path-overview-icon"><Target size={20} /></div><div><strong>Lộ trình học tập của bạn</strong><p>3 gợi ý dựa trên nội dung khóa học và tiến độ mẫu.</p></div><span className="path-label">BẢN NHÁP</span></div><div className="path-layout"><div className="path-timeline">{recommendations.map((item, index) => <article className="path-item" key={item.title}><div className="timeline-marker"><span>{index + 1}</span>{index < recommendations.length - 1 && <i />}</div><div className={`path-card path-card-${item.color}`}><div className="path-card-top"><div className={`path-topic-icon topic-${item.color}`}>{index === 0 ? <Sigma size={18} /> : index === 1 ? <Database size={18} /> : <BrainCircuit size={18} />}</div><span className="path-duration"><Clock3 size={13} />{item.duration}</span></div><div className="eyebrow">GỢI Ý {String(index + 1).padStart(2, "0")}</div><h2>{item.title}</h2><p>{item.reason}</p><button className="path-start" onClick={() => onStart(item)}>Thêm vào lộ trình <ArrowRight size={14} /></button></div></article>)}</div><aside className="panel path-tip"><div className="recommend-spark"><Sparkles size={17} /></div><h3>Vì sao có những gợi ý này?</h3><p>Prototype này dùng quy tắc minh họa dựa trên tiến độ và chủ đề khóa học. Gợi ý chưa được cá nhân hóa bằng mô hình ML đã huấn luyện.</p><div className="tip-divider" /><div className="tip-meta"><CheckCircle2 size={15} />Bạn có thể chọn gợi ý phù hợp với mình</div></aside></div><div className="sample-note"><CircleHelp size={14} /> Lộ trình chỉ mang tính minh họa. Quy tắc đề xuất và dữ liệu đầu vào cần được xác định trong các bước tiếp theo của đồ án.</div></>;
}

function ActivityList({ activities }) {
  return <div className="activity-list">{activities.map((item, index) => <div className="activity-row" key={`${item.title}-${index}`}><div className={`activity-type activity-type-${item.type}`}>{item.type === "quiz" ? <FileChartColumnIncreasing size={16} /> : item.type === "lesson" ? <BookOpen size={16} /> : <Sparkles size={16} />}</div><div className="activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><div className="activity-result"><strong>{item.result}</strong><span>{item.time}</span></div></div>)}</div>;
}

function ActivityPage({ activities }) {
  return <><PageHeading eyebrow="NHẬT KÝ HỌC TẬP" title="Hoạt động gần đây" description="Theo dõi những dấu mốc trên hành trình học tập của bạn." action={<button className="date-filter"><Clock3 size={15} /> 7 ngày qua <ChevronDown size={14} /></button>} /><div className="panel full-activity-panel"><div className="activity-date-heading"><span className="date-dot" />Hôm nay <small>24 tháng 11</small></div><ActivityList activities={activities.slice(0, 2)} /><div className="activity-date-heading"><span className="date-dot muted-date-dot" />Hôm qua <small>23 tháng 11</small></div><ActivityList activities={activities.slice(2)} /></div><div className="sample-note"><CircleHelp size={14} /> Nhật ký hoạt động là dữ liệu mẫu phục vụ trình diễn giao diện.</div></>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
