import "./AnimatedWelcomeArtwork.css";

/** Decorative motion over the original poster; its embedded lettering stays sharp. */
export default function AnimatedWelcomeArtwork() {
  return <div className="welcome-artwork">
    <img src="/images/flux-welcome.webp" alt="FLUX Studio: biến ý tưởng thành hình ảnh" />
    <span className="sr-only">Minh họa: nhấn Tạo ảnh, sau đó ba ảnh Phố cổ Hội An, thác nước giữa núi mây và hoa sen màu nước lần lượt xuất hiện.</span>
    <div className="welcome-artwork__mask welcome-artwork__mask--hoi-an" aria-hidden="true" />
    <div className="welcome-artwork__mask welcome-artwork__mask--mountain" aria-hidden="true" />
    <div className="welcome-artwork__mask welcome-artwork__mask--lotus" aria-hidden="true" />
    <div className="welcome-artwork__click" aria-hidden="true" />
    <div className="welcome-artwork__cursor" aria-hidden="true" />
    <svg className="welcome-artwork__light" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="welcome-light-gradient"><stop stopColor="#ad5cff" /><stop offset=".48" stopColor="#22d3ee" /><stop offset="1" stopColor="#ad5cff" /></linearGradient>
        <filter id="welcome-light-glow"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <path className="welcome-artwork__trail" d="M 1120 765 C 1205 743 1230 680 1300 652 S 1490 622 1587 540" filter="url(#welcome-light-glow)" />
      <path className="welcome-artwork__trail welcome-artwork__trail--second" d="M 1070 646 C 1190 614 1277 535 1283 463 S 1370 367 1470 357" filter="url(#welcome-light-glow)" />
      <g className="welcome-artwork__spark welcome-artwork__spark--one"><circle cx="270" cy="194" r="8" /><circle cx="270" cy="194" r="20" fill="none" stroke="white" strokeWidth="2" /></g>
      <g className="welcome-artwork__spark welcome-artwork__spark--two"><circle cx="1265" cy="664" r="7" /><circle cx="1265" cy="664" r="16" fill="none" stroke="white" strokeWidth="2" /></g>
      <g className="welcome-artwork__spark welcome-artwork__spark--three"><circle cx="1500" cy="420" r="6" /></g>
    </svg>
  </div>;
}
