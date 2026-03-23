import Link from "next/link";

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="16" cy="22" rx="12" ry="4" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
            <ellipse cx="16" cy="22" rx="8" ry="2.8" stroke="#06C755" strokeWidth="1.5" opacity="0.5" />
            <ellipse cx="16" cy="22" rx="4" ry="1.6" stroke="#06C755" strokeWidth="1.5" opacity="0.8" />
            <path d="M16 20V6" stroke="#06C755" strokeWidth="2" strokeLinecap="round" />
            <path d="M11 10.5L16 6L21 10.5" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-bold text-gray-900 tracking-wide">dxbot</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <a href="#service" className="hover:text-gray-900 transition-colors">サービス</a>
          <a href="#features" className="hover:text-gray-900 transition-colors">特徴</a>
          <a href="#cases" className="hover:text-gray-900 transition-colors">導入事例</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">料金</a>
          <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:inline-block"
          >
            ログイン
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold text-white bg-[#06C755] hover:bg-[#05B04C] px-5 py-2.5 rounded-lg transition-colors"
          >
            無料で始める
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              ITが苦手でも、<br />大丈夫。
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              御社のペースで、DXを始めませんか。<br />
              dxbotは中小企業に寄り添うDXコーチングサービスです。<br />
              現場に合わせた一歩ずつのサポートで、<br />
              無理なく業務改善を進められます。
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center text-base font-semibold text-white bg-[#06C755] hover:bg-[#05B04C] px-8 py-4 rounded-lg transition-colors"
              >
                まずは無料診断から
              </Link>
              <a
                href="#service"
                className="inline-flex items-center justify-center text-base font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-8 py-4 rounded-lg transition-colors"
              >
                詳しく見る
              </a>
            </div>
          </div>
          <div className="bg-gray-200 rounded-lg aspect-[4/3] flex items-center justify-center">
            <span className="text-gray-400 text-sm">画像</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const problems = [
  {
    title: "DXって何から始めればいいか分からない",
    description: "情報が多すぎて、自社に合った方法が見つからない。そんな状態が続いていませんか。",
  },
  {
    title: "ITツールを入れたけど定着しない",
    description: "導入したものの、現場のスタッフが使いこなせず、結局元のやり方に戻ってしまう。",
  },
  {
    title: "相談できる人が社内にいない",
    description: "IT担当者がいない、もしくは兼任で手が回らない。外部に相談するのもハードルが高い。",
  },
  {
    title: "大がかりな投資は難しい",
    description: "大手向けのコンサルは費用が合わない。でも何もしないわけにはいかない。",
  },
];

function ProblemsSection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
          こんな悩みありませんか？
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 gap-6">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="bg-white rounded-lg border border-gray-100 shadow-sm p-6"
            >
              <div className="bg-gray-200 rounded-lg aspect-[3/1] mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-sm">画像</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{problem.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceSection() {
  return (
    <section id="service" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="bg-gray-200 rounded-lg aspect-[4/3] flex items-center justify-center">
            <span className="text-gray-400 text-sm">画像</span>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              dxbotとは
            </h2>
            <p className="mt-6 text-base text-gray-600 leading-relaxed">
              dxbotは、中小企業のDX推進を伴走型でサポートするコーチングサービスです。
            </p>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              御社の業務内容や課題をヒアリングし、現場に合わせた改善プランをご提案。
              ツールの選定から導入、定着までを一歩ずつ、一緒に進めていきます。
            </p>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              「何が分からないかも分からない」という状態でも大丈夫です。
              まずは現状の棚卸しから、お気軽にご相談ください。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    number: "01",
    title: "無料診断",
    description: "簡単な質問に答えるだけで、御社のDX成熟度と優先課題が分かります。所要時間は約5分です。",
  },
  {
    number: "02",
    title: "改善プランの作成",
    description: "診断結果をもとに、御社の状況に合わせた具体的な改善ステップをご提案します。",
  },
  {
    number: "03",
    title: "伴走サポートで成果へ",
    description: "プランに沿って一つずつ実行。つまずいたときもコーチが一緒に解決します。",
  },
];

function StepsSection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
          始め方はかんたん3ステップ
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#06C755] text-white text-xl font-bold">
                {step.number}
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    title: "御社専用の改善プラン",
    description: "テンプレートではなく、御社の業種・規模・課題に合わせたオーダーメイドのプランを作成します。",
  },
  {
    title: "伴走型のコーチング",
    description: "「やり方を教えて終わり」ではありません。定着するまで一緒に取り組みます。",
  },
  {
    title: "小さく始めて、大きく育てる",
    description: "いきなり全社導入ではなく、効果が出やすい部分から始めて、段階的に広げていきます。",
  },
  {
    title: "分かりやすい進捗管理",
    description: "今どこまで進んでいるか、次に何をすべきかが一目で分かるダッシュボードをご用意しています。",
  },
  {
    title: "IT知識ゼロでも安心",
    description: "専門用語を使わず、御社の言葉で説明します。質問はいつでも何度でもお気軽にどうぞ。",
  },
  {
    title: "中小企業に合った費用感",
    description: "大手コンサルのような高額な費用は不要。御社の予算に合わせたプランをご提案します。",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
          dxbotが選ばれる理由
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-lg border border-gray-100 shadow-sm p-6"
            >
              <div className="bg-gray-200 rounded-lg aspect-[3/1] mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-sm">画像</span>
              </div>
              <h3 className="text-base font-bold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const cases = [
  {
    industry: "製造業",
    employees: "従業員 35名",
    title: "紙の日報をデジタル化し、月20時間の事務作業を削減",
    quote: "最初は不安でしたが、スタッフのペースに合わせてもらえたので、自然と定着しました。",
  },
  {
    industry: "小売業",
    employees: "従業員 12名",
    title: "在庫管理の見える化で、欠品率を半減",
    quote: "自社に合ったツールを選んでもらえたのが大きかったです。押し売りが一切なく安心でした。",
  },
  {
    industry: "建設業",
    employees: "従業員 48名",
    title: "現場写真の共有を効率化し、報告書作成時間を70%短縮",
    quote: "ITに詳しくない職人たちでも使えるよう、丁寧に教えてもらえました。",
  },
];

function CasesSection() {
  return (
    <section id="cases" className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
          導入事例
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {cases.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-lg border border-gray-100 shadow-sm p-6"
            >
              <div className="bg-gray-200 rounded-lg aspect-square mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-sm">写真</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-[#06C755] bg-green-50 px-2 py-1 rounded">
                  {item.industry}
                </span>
                <span className="text-xs text-gray-500">{item.employees}</span>
              </div>
              <h3 className="text-base font-bold text-gray-900">{item.title}</h3>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed italic">
                「{item.quote}」
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
          料金プラン
        </h2>
        <p className="mt-4 text-center text-gray-600">
          御社の規模や課題に合わせて、最適なプランをご提案します。
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center">
            <h3 className="text-lg font-bold text-gray-900">スタータープラン</h3>
            <p className="mt-2 text-sm text-gray-600">まずは1つの業務から</p>
            <div className="mt-6 text-3xl font-bold text-gray-900">
              お問い合わせ
            </div>
            <p className="mt-1 text-xs text-gray-500">月額 / 税別</p>
            <ul className="mt-6 space-y-3 text-sm text-gray-600 text-left">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                DX成熟度診断
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                改善プラン作成
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                月2回のコーチング
              </li>
            </ul>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center justify-center w-full text-sm font-semibold text-[#06C755] border border-[#06C755] hover:bg-green-50 px-6 py-3 rounded-lg transition-colors"
            >
              無料で始める
            </Link>
          </div>

          <div className="bg-white rounded-lg border-2 border-[#06C755] shadow-sm p-8 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#06C755] text-white text-xs font-semibold px-4 py-1 rounded-full">
              人気
            </div>
            <h3 className="text-lg font-bold text-gray-900">スタンダードプラン</h3>
            <p className="mt-2 text-sm text-gray-600">本格的にDXを推進</p>
            <div className="mt-6 text-3xl font-bold text-gray-900">
              お問い合わせ
            </div>
            <p className="mt-1 text-xs text-gray-500">月額 / 税別</p>
            <ul className="mt-6 space-y-3 text-sm text-gray-600 text-left">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                スタータープランの全内容
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                週1回のコーチング
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                ツール導入サポート
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                チャットサポート
              </li>
            </ul>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center justify-center w-full text-sm font-semibold text-white bg-[#06C755] hover:bg-[#05B04C] px-6 py-3 rounded-lg transition-colors"
            >
              無料で始める
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center">
            <h3 className="text-lg font-bold text-gray-900">プレミアムプラン</h3>
            <p className="mt-2 text-sm text-gray-600">全社的なDX変革に</p>
            <div className="mt-6 text-3xl font-bold text-gray-900">
              お問い合わせ
            </div>
            <p className="mt-1 text-xs text-gray-500">月額 / 税別</p>
            <ul className="mt-6 space-y-3 text-sm text-gray-600 text-left">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                スタンダードプランの全内容
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                専任コーチ
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                社内研修サポート
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#06C755] mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                カスタムレポート
              </li>
            </ul>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center justify-center w-full text-sm font-semibold text-[#06C755] border border-[#06C755] hover:bg-green-50 px-6 py-3 rounded-lg transition-colors"
            >
              お問い合わせ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    question: "DXの知識がまったくなくても大丈夫ですか？",
    answer: "はい、もちろんです。dxbotは「ITが苦手」という方を前提にサービスを設計しています。専門用語は使わず、御社の言葉で丁寧にご説明しますので、安心してご利用ください。",
  },
  {
    question: "導入までどれくらい時間がかかりますか？",
    answer: "無料診断は約5分、改善プランの作成は通常1週間程度です。最初の改善施策は、プラン確定後2週間以内に着手できるケースがほとんどです。",
  },
  {
    question: "途中で解約はできますか？",
    answer: "はい、いつでも解約可能です。最低契約期間や解約金はありません。ただし、成果を実感いただくためには、最低3ヶ月の継続をおすすめしています。",
  },
  {
    question: "どんな業種でも対応していますか？",
    answer: "製造業、小売業、建設業、サービス業など、幅広い業種に対応しています。業種特有の課題にも、過去の支援実績をもとにご提案いたします。",
  },
  {
    question: "社員数が少なくても利用できますか？",
    answer: "はい。1名から数百名規模まで対応しています。むしろ、少人数の会社ほど効果を実感しやすい傾向があります。",
  },
];

function FaqSection() {
  return (
    <section id="faq" className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
          よくある質問
        </h2>
        <div className="mt-12 space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="bg-white rounded-lg border border-gray-100 shadow-sm p-6"
            >
              <h3 className="text-base font-bold text-gray-900">Q. {faq.question}</h3>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">A. {faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-[#06C755]">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          まずは無料診断から
        </h2>
        <p className="mt-4 text-white/90 text-base leading-relaxed">
          約5分の診断で、御社のDX成熟度と優先課題が分かります。<br />
          費用は一切かかりません。お気軽にお試しください。
        </p>
        <Link
          href="/register"
          className="mt-8 inline-flex items-center justify-center text-base font-semibold text-[#06C755] bg-white hover:bg-gray-50 px-10 py-4 rounded-lg transition-colors"
        >
          無料で始める
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="16" cy="22" rx="12" ry="4" stroke="#06C755" strokeWidth="1.5" opacity="0.25" />
                <ellipse cx="16" cy="22" rx="8" ry="2.8" stroke="#06C755" strokeWidth="1.5" opacity="0.5" />
                <ellipse cx="16" cy="22" rx="4" ry="1.6" stroke="#06C755" strokeWidth="1.5" opacity="0.8" />
                <path d="M16 20V6" stroke="#06C755" strokeWidth="2" strokeLinecap="round" />
                <path d="M11 10.5L16 6L21 10.5" stroke="#06C755" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-bold text-white tracking-wide">dxbot</span>
            </div>
            <p className="text-xs leading-relaxed">
              中小企業に寄り添う<br />
              DXコーチングサービス
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">サービス</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#service" className="hover:text-white transition-colors">dxbotとは</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">特徴</a></li>
              <li><a href="#cases" className="hover:text-white transition-colors">導入事例</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">料金プラン</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">サポート</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#faq" className="hover:text-white transition-colors">よくある質問</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">ログイン</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">無料登録</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">会社情報</h4>
            <ul className="space-y-2 text-xs">
              <li>運営会社: 株式会社DXBOT</li>
              <li>所在地: 東京都</li>
              <li>お問い合わせ: info@dxbot.jp</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 text-xs text-center">
          &copy; 2026 dxbot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <ProblemsSection />
        <ServiceSection />
        <StepsSection />
        <FeaturesSection />
        <CasesSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
