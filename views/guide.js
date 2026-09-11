const TROWEL_ILLUSTRATION = `
  <svg viewBox="0 0 240 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="移植ゴテを地面に45度に立てかけ、水を伝わせて注ぐ様子">
    <rect x="10" y="150" width="220" height="20" rx="10" fill="#5b4632"/>
    <g transform="rotate(-45 120 150)">
      <rect x="112" y="40" width="16" height="70" rx="6" fill="#8a5a2b"/>
      <path d="M104 108 L136 108 L124 150 L116 150 Z" fill="#c7ced1" stroke="#5b6469" stroke-width="2"/>
    </g>
    <path d="M118 66 Q130 96 118 126 Q130 146 121 152" stroke="#4a90c4" stroke-width="4" fill="none" stroke-linecap="round"/>
    <line x1="150" y1="150" x2="176" y2="124" stroke="#6b7268" stroke-width="2"/>
    <text x="150" y="118" font-size="14" fill="#6b7268" font-family="sans-serif">約45度</text>
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
        <ul>
          <li>スマートフォン</li>
          <li>移植ゴテ(大地の再生講座で使う小型のシャベル)</li>
          <li>水を500ml入れたペットボトル</li>
        </ul>
        <p>計測は移植ゴテを地面に「落とす」「立てかける」だけで、穴を掘ったりはしません。他人の土地で計測する場合は、あらかじめひとこと声をかけてから行ってください。</p>
        <div class="guide-illustration">${TROWEL_ILLUSTRATION}</div>
        <p class="hint">水はけの計測では、移植ゴテを地面に約45度で立てかけ、その中腹を伝わせるように500mlの水をすべて注ぎます。毎回同じやり方で行うことで、Before/Afterの比較がより正確になります。</p>
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
