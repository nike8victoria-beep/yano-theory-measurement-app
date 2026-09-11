// Bumped from 'yano_onboarding_seen' so existing test users see the v3
// procedure (trowel-based measurement, reordered steps) once more.
export const ONBOARDING_SEEN_KEY = 'yano_onboarding_seen_v2';

const SLIDES = [
  {
    icon: '🧰',
    title: '準備するもの',
    body: `
      <ul class="onboarding-steps">
        <li>スマートフォン</li>
        <li>移植ゴテ(大地の再生講座で使う小型のシャベル)</li>
        <li>水を500ml入れたペットボトル</li>
      </ul>
      <p>計測は移植ゴテを地面に「落とす」「立てかける」だけで、穴を掘ったりはしません。他人の土地で計測する場合は、あらかじめひとこと声をかけてから行ってください。</p>
    `,
  },
  {
    icon: '🌤️',
    title: '① 表層の見た目・日照',
    body: '<p>移植ゴテを地面に立て、柄の先端くらいの高さからスマホで真上から1枚撮影します。あわせて、その場所が「日向」「半日陰」「日陰」のどれに当たるかを選びます。</p>',
  },
  {
    icon: '🪏',
    title: '② 移植ゴテを落とした感じ',
    body: `
      <p>移植ゴテを腰の高さに持ち、手を自然に離して地面に落とします。刺さり方・跳ね返り方の感触を「カチカチ」「普通」「フカフカ」の3段階から選びます。</p>
      <p class="hint">(任意)選んだ後、しゃがんで土の匂いを嗅いでみるのもおすすめです。</p>
    `,
  },
  {
    icon: '💧',
    title: '③ 水はけ',
    body: `
      <p>画面内のタイマーで、水が地面に浸透しきるまでの秒数を計測します。誰が計っても同じ条件になるよう、次の手順で行ってください。</p>
      <ol class="onboarding-steps">
        <li>移植ゴテを地面に斜め45度くらいに立てかけます。</li>
        <li>その中腹を伝わせるように、500mlの水をすべて注ぎます。</li>
        <li>注ぎ終わったらタイマーをスタートし、水が地面に完全に浸透するまでの秒数を計測します。</li>
      </ol>
    `,
  },
];

export function hasSeenOnboarding() {
  return localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
}

export function renderOnboarding(container, { onFinish }) {
  let index = 0;

  function render() {
    const slide = SLIDES[index];
    const isLast = index === SLIDES.length - 1;

    container.innerHTML = `
      <div class="onboarding">
        <div class="onboarding-slide card">
          <div class="onboarding-icon">${slide.icon}</div>
          <h1>${slide.title}</h1>
          <div class="onboarding-body">${slide.body}</div>
        </div>
        <div class="onboarding-dots">
          ${SLIDES.map((_, i) => `<span class="dot ${i === index ? 'active' : ''}"></span>`).join('')}
        </div>
        <div class="onboarding-actions">
          <button type="button" class="secondary" data-action="back" ${index === 0 ? 'disabled' : ''}>戻る</button>
          <button type="button" class="primary" data-action="next">${isLast ? 'はじめる' : '次へ'}</button>
        </div>
      </div>
    `;

    container.querySelector('[data-action="back"]').addEventListener('click', () => {
      if (index > 0) {
        index -= 1;
        render();
      }
    });

    container.querySelector('[data-action="next"]').addEventListener('click', () => {
      if (isLast) {
        localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
        onFinish();
      } else {
        index += 1;
        render();
      }
    });
  }

  render();
}
