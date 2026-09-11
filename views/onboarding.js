export const ONBOARDING_SEEN_KEY = 'yano_onboarding_seen';

const SLIDES = [
  {
    icon: '🪨',
    title: '① 土壌の質感',
    body: '<p>地面をタップで触れる感覚で評価します。「カチカチ」「普通」「フカフカ」の3段階から選びます。</p>',
  },
  {
    icon: '🌤️',
    title: '② 表層の見た目・日照',
    body: '<p>表層の写真を1枚撮影し、その場所が「日向」「半日陰」「日陰」のどれに当たるかを選びます。</p>',
  },
  {
    icon: '💧',
    title: '③ 水はけ',
    body: `
      <p>画面内のタイマーで、水が地面に浸透しきるまでの秒数を計測します。誰が計っても同じ条件になるよう、次の手順で行ってください。</p>
      <ol class="onboarding-steps">
        <li>500mlのペットボトルを用意し、水を約500ml入れます。</li>
        <li>ペットボトルの口を下にして、地面から約5cm離します。</li>
        <li>そのまま水を注ぎきり、ペットボトルが空になった瞬間から、水が地面に完全に浸透するまでの秒数を計測します。</li>
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
