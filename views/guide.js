const BOTTLE_ILLUSTRATION = `
  <svg viewBox="0 0 240 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ペットボトルを地面から5cm離して水を注ぐ様子">
    <rect x="10" y="152" width="220" height="18" rx="9" fill="#5b4632"/>
    <rect x="98" y="20" width="44" height="72" rx="10" fill="#e9f2ea" stroke="#2f6b3a" stroke-width="3"/>
    <path d="M110 92 L110 118 L130 118 L130 92 Z" fill="#e9f2ea" stroke="#2f6b3a" stroke-width="3"/>
    <rect x="108" y="8" width="24" height="14" rx="3" fill="#2f6b3a"/>
    <path d="M114 122 Q120 132 112 140 Q120 148 114 156" stroke="#4a90c4" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M126 122 Q120 132 128 140 Q120 148 126 156" stroke="#4a90c4" stroke-width="4" fill="none" stroke-linecap="round"/>
    <line x1="160" y1="120" x2="160" y2="152" stroke="#6b7268" stroke-width="2"/>
    <line x1="153" y1="120" x2="167" y2="120" stroke="#6b7268" stroke-width="2"/>
    <line x1="153" y1="152" x2="167" y2="152" stroke="#6b7268" stroke-width="2"/>
    <text x="172" y="140" font-size="14" fill="#6b7268" font-family="sans-serif">約5cm</text>
  </svg>
`;

/**
 * Static "事前準備・使い方" guide. Reachable any time from the site list
 * header, and directly from STEP1 when geolocation fails (the LINE in-app
 * browser and permission issues surfaced during real-device testing).
 */
export function renderGuide(container, { onBack }) {
  container.innerHTML = `
    <div class="guide-view">
      <h1>事前準備・使い方ガイド</h1>

      <section class="card guide-section">
        <h2>① 準備するもの</h2>
        <p>500mlのペットボトルに、あらかじめ水を約500ml入れて現場に持参してください。</p>
        <div class="guide-illustration">${BOTTLE_ILLUSTRATION}</div>
        <p class="hint">毎回同じ量・同じ高さで注ぐことで、Before/Afterの比較がより正確になります。</p>
      </section>

      <section class="card guide-section">
        <h2>② 開き方の注意</h2>
        <p>LINEやSNSに表示される「アプリ内ブラウザ」では、位置情報の許可や「ホーム画面に追加」が正しく動作しません。必ず <strong>Safari</strong>(iPhone)または <strong>Chrome</strong>(Android)で開いてください。</p>
        <p><strong>LINEのトークからリンクを開いてしまった場合</strong></p>
        <ol>
          <li>画面右下(または右上)の共有アイコン、または「…」その他メニューをタップ</li>
          <li>「Safariで開く」を選択</li>
        </ol>
      </section>

      <section class="card guide-section">
        <h2>③ 位置情報の許可</h2>
        <p><strong>iPhone(Safari)で位置情報が取得できない場合</strong></p>
        <ol>
          <li>設定 → プライバシーとセキュリティ → 位置情報サービス が全体でONになっているか確認</li>
          <li>同じ画面を下にスクロールして「Safari の Webサイト」をタップ</li>
          <li>「使用中のみ許可」または「確認」に設定</li>
          <li>Safariに戻ってページを再読み込み</li>
        </ol>
        <p><strong>Androidで位置情報が取得できない場合</strong></p>
        <ol>
          <li>設定 → アプリ → Chrome(お使いのブラウザ) → 権限 → 位置情報</li>
          <li>「許可」に設定してページを再読み込み</li>
        </ol>
      </section>

      <button type="button" class="primary" data-action="back">マイ地点一覧へ戻る</button>
    </div>
  `;

  container.querySelector('[data-action="back"]').addEventListener('click', onBack);
}
