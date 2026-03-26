"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center">
          よくある質問
        </h2>
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={faq.question}
                className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <h3 className="text-base font-bold text-gray-900 pr-4">
                    Q. {faq.question}
                  </h3>
                  <ChevronIcon open={isOpen} />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isOpen ? "500px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <p className="px-6 pb-6 text-sm text-gray-600 leading-relaxed">
                    A. {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
