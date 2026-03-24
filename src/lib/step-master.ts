// ===== ステップマスターデータ（30件） =====

import type { AxisScores } from './types';
import { getSetting, APP_SETTING_KEYS } from './app-settings';

/** つまずきヒント */
export interface StepHints {
  how: string;        // やり方が分からない時の具体的ヒント
  motivation: string; // やる気が出ない時
  time: string;       // 時間がない時
}

export interface StepDefinition {
  id: string;
  name: string;
  description: string;
  axis: keyof AxisScores;
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
  actionItems: string[];
  completionCriteria: string;
  recommendedTools: string[];
  hints: StepHints;
}

// ---------------------------------------------------------------------------
// 軸A1: 売上・請求管理 (S01〜S06)
// ---------------------------------------------------------------------------
const AXIS_A1_STEPS: StepDefinition[] = [
  {
    id: 'S01',
    name: '請求書作成',
    description: '無料の請求書作成ツールで、実際に1枚請求書を作成してみましょう。テンプレートを選ぶだけで、すぐに作れます。',
    axis: 'a1',
    difficulty: 1,
    estimatedMinutes: 15,
    actionItems: [
      'freee、Misoca、またはマネーフォワードクラウドで無料アカウントを作成',
      'テンプレートを選んで自社情報を入力',
      'サンプル請求書を1枚作成して保存',
    ],
    completionCriteria: '請求書を1枚作成して保存できた',
    recommendedTools: ['freee請求書（無料）', 'Misoca（無料枠あり）', 'マネーフォワードクラウド請求書'],
    hints: {
      how: 'freeeなら https://www.freee.co.jp/invoice/ から始められます。アカウント作成は3分で完了します。',
      motivation: '1枚作るだけで、次回から同じテンプレートを使い回せます。最初の1枚が一番価値があります。',
      time: 'テンプレートを選んで会社名を入れるだけなら5分です。細かい設定は後からでOKです。',
    },
  },
  {
    id: 'S02',
    name: 'インボイス設定',
    description: 'インボイス制度に対応した請求書を発行するために、適格請求書発行事業者番号を設定しましょう。番号を入力するだけの簡単な作業です。',
    axis: 'a1',
    difficulty: 1,
    estimatedMinutes: 20,
    actionItems: [
      '国税庁の適格請求書発行事業者公表サイトで自社の登録番号を確認',
      '請求書ツールの設定画面で登録番号を入力',
      'インボイス対応の請求書が正しく表示されるかプレビューで確認',
    ],
    completionCriteria: '登録番号を設定してインボイス対応の請求書をプレビューできた',
    recommendedTools: ['国税庁インボイス公表サイト', 'freee請求書', 'マネーフォワードクラウド請求書'],
    hints: {
      how: '国税庁の公表サイト（https://www.invoice-kohyo.nta.go.jp/）で「T+法人番号」を検索できます。',
      motivation: '2023年10月から義務化されています。一度設定すれば全ての請求書に自動反映されます。',
      time: '登録番号をコピペして貼るだけです。5分で終わります。',
    },
  },
  {
    id: 'S03',
    name: '売上管理シート',
    description: 'Googleスプレッドシートで月次の売上を一覧管理するシートを作りましょう。テンプレートを使えば、数字を入力するだけで合計が自動計算されます。',
    axis: 'a1',
    difficulty: 2,
    estimatedMinutes: 25,
    actionItems: [
      'Googleスプレッドシートを新規作成し「売上管理」と名前を付ける',
      '列に「日付・取引先・品目・金額・入金状況」を設定',
      '直近1ヶ月分の売上データを最低3件入力する',
    ],
    completionCriteria: '売上管理シートに実データを3件以上入力できた',
    recommendedTools: ['Googleスプレッドシート（無料）', 'Microsoft Excel Online（無料）'],
    hints: {
      how: 'Googleスプレッドシートは sheets.new とブラウザに入力すれば新規作成できます。A1に「日付」、B1に「取引先」...と入力してください。',
      motivation: '手書きの売上メモをデジタル化するだけで、月末の集計が一瞬になります。',
      time: 'まず3件だけ入力しましょう。残りは後から追加できます。15分で十分です。',
    },
  },
  {
    id: 'S04',
    name: '入金管理',
    description: '売上管理シートに入金状況の列を追加して、どの請求が入金済みでどれが未入金かを一目で分かるようにしましょう。',
    axis: 'a1',
    difficulty: 2,
    estimatedMinutes: 25,
    actionItems: [
      '売上管理シートに「入金日」「入金状況（未入金/入金済）」列を追加',
      '条件付き書式で未入金を赤、入金済を緑に色分け設定',
      '実際の入金データを1件記録する',
    ],
    completionCriteria: '入金状況を色分けで管理できるシートが完成した',
    recommendedTools: ['Googleスプレッドシート（無料）', 'freee会計（入金管理機能）'],
    hints: {
      how: 'Googleスプレッドシートで「条件付き書式」は、セルを選択→書式→条件付き書式で設定できます。',
      motivation: '未入金を放置すると資金繰りが悪化します。色分けするだけで、回収漏れがゼロになります。',
      time: '色分け設定は10分で完了します。まず1件だけ試してみましょう。',
    },
  },
  {
    id: 'S05',
    name: '見積書テンプレート',
    description: '何度も使い回せる見積書のテンプレートを1つ作りましょう。一度作れば、次回から宛名と金額を変えるだけで見積書が完成します。',
    axis: 'a1',
    difficulty: 2,
    estimatedMinutes: 20,
    actionItems: [
      '請求書ツールの見積書テンプレート機能を開く',
      '自社の基本情報（社名・住所・振込先等）を登録',
      'よく使う商品・サービスの品目と単価を1つ以上登録',
    ],
    completionCriteria: '見積書テンプレートを作成し、品目を1つ以上登録できた',
    recommendedTools: ['Misoca（見積書テンプレート）', 'freee請求書', 'マネーフォワードクラウド請求書'],
    hints: {
      how: 'Misocaなら見積書タブ→新規作成で、テンプレートの雛形が用意されています。情報を埋めるだけです。',
      motivation: '見積書を毎回イチから作る時間がなくなります。テンプレート化で1件あたり15分の時短になります。',
      time: '自社情報は請求書作成時に登録済みのはず。品目を1つ追加するだけなら5分です。',
    },
  },
  {
    id: 'S06',
    name: '月次締め',
    description: '月末に行う請求・売上の締め処理を手順化しましょう。チェックリストを作って、毎月同じ手順で漏れなく処理できる仕組みを作ります。',
    axis: 'a1',
    difficulty: 3,
    estimatedMinutes: 40,
    actionItems: [
      '月末に行うべき作業をリストアップ（請求書発行・入金確認・売上集計）',
      'Googleスプレッドシートまたはメモアプリにチェックリストを作成',
      '来月の月末に使えるよう日付を入れてテンプレート化する',
    ],
    completionCriteria: '月次締めチェックリストを作成し、来月の予定としてカレンダーに登録した',
    recommendedTools: ['Googleスプレッドシート', 'Googleカレンダー（リマインダー設定）', 'Notion（無料）'],
    hints: {
      how: 'まず「月末にやっていること」を思いつく限り書き出してください。それをGoogleスプレッドシートにチェックボックス付きリストとして整理します。',
      motivation: '月末の「あれやったっけ？」がなくなります。仕組み化すれば、月末のストレスが激減します。',
      time: 'まず5つだけ作業を書き出しましょう。20分で基本のチェックリストは完成します。',
    },
  },
];

// ---------------------------------------------------------------------------
// 軸A2: 連絡・記録管理 (S07〜S12)
// ---------------------------------------------------------------------------
const AXIS_A2_STEPS: StepDefinition[] = [
  {
    id: 'S07',
    name: 'ビジネスメール設定',
    description: 'Gmailで仕事用のメールアカウントを設定しましょう。署名を設定するだけで、メールの印象がぐっとプロフェッショナルになります。',
    axis: 'a2',
    difficulty: 1,
    estimatedMinutes: 10,
    actionItems: [
      'Gmailの設定→署名欄に、会社名・氏名・電話番号を入力',
      'テスト送信して署名が正しく表示されるか確認',
    ],
    completionCriteria: 'メール署名を設定してテスト送信できた',
    recommendedTools: ['Gmail（無料）', 'Google Workspace'],
    hints: {
      how: 'Gmailを開いて右上の歯車アイコン→「すべての設定を表示」→「署名」セクションで設定できます。',
      motivation: '署名があるだけで、取引先からの信頼度が上がります。設定は一度だけで永久に使えます。',
      time: '署名を入力するだけ。3分で終わります。',
    },
  },
  {
    id: 'S08',
    name: 'LINE公式アカウント開設',
    description: 'LINE公式アカウントを開設して、お客様とLINEでやり取りできるようにしましょう。月1,000通まで無料で使えます。',
    axis: 'a2',
    difficulty: 1,
    estimatedMinutes: 15,
    actionItems: [
      'LINE公式アカウントの開設ページにアクセスしてアカウントを作成',
      'プロフィール画像と挨拶メッセージを設定',
      'まず自分のLINEで友だち追加してテスト送信',
    ],
    completionCriteria: 'LINE公式アカウントを開設してテスト送信できた',
    recommendedTools: ['LINE公式アカウント（無料プラン）', 'LINE Official Account Manager'],
    hints: {
      how: 'https://www.lycbiz.com/jp/service/line-official-account/ から「アカウント開設」ボタンで始められます。LINEアカウントがあれば3分で開設できます。',
      motivation: 'お客様の80%以上がLINEを使っています。メールより開封率が3倍高いです。',
      time: 'アカウント開設は5分で完了します。細かい設定は後日でOKです。',
    },
  },
  {
    id: 'S09',
    name: '顧客リスト作成',
    description: '既存のお客様情報をGoogleスプレッドシートにまとめましょう。まずは5件だけ入力するところから始めます。',
    axis: 'a2',
    difficulty: 2,
    estimatedMinutes: 25,
    actionItems: [
      'Googleスプレッドシートを新規作成し「顧客リスト」と名前を付ける',
      '列に「会社名・担当者名・電話番号・メール・最終連絡日」を設定',
      'よく連絡を取るお客様を5件入力する',
    ],
    completionCriteria: '顧客リストに5件以上の実データを入力できた',
    recommendedTools: ['Googleスプレッドシート（無料）', 'Googleコンタクト（無料）'],
    hints: {
      how: 'sheets.new でスプレッドシートを作成。名刺や電話帳を見ながら、まず5件だけ入力してください。',
      motivation: '顧客情報がバラバラだと、大事な連絡を忘れるリスクがあります。一覧化で機会損失を防げます。',
      time: '5件だけなら15分です。残りは1日1件ずつ追加していけば大丈夫です。',
    },
  },
  {
    id: 'S10',
    name: '連絡先一元化',
    description: '名刺・電話帳・メールなど、バラバラになっている連絡先をGoogleコンタクトに集約しましょう。スマホからもPCからもアクセスできます。',
    axis: 'a2',
    difficulty: 2,
    estimatedMinutes: 25,
    actionItems: [
      'Googleコンタクト（contacts.google.com）にアクセス',
      '名刺アプリやスマホの連絡先からエクスポートしてインポート',
      '重複する連絡先を「重複を統合」機能で整理',
    ],
    completionCriteria: '主要な連絡先をGoogleコンタクトに集約し、重複を統合できた',
    recommendedTools: ['Googleコンタクト（無料）', 'Eight（名刺管理・無料枠あり）'],
    hints: {
      how: 'Googleコンタクトは contacts.google.com でアクセスできます。左メニューの「インポート」からCSVファイルを取り込めます。',
      motivation: '「あの人の連絡先どこだっけ？」がゼロになります。スマホでもPCでも同じ連絡先を使えます。',
      time: 'スマホの連絡先の同期設定だけなら5分です。名刺の取り込みは後からでOKです。',
    },
  },
  {
    id: 'S11',
    name: '対応履歴の記録',
    description: 'お客様とのやり取り履歴を記録する仕組みを作りましょう。顧客リストに「対応メモ」列を追加して、重要なやり取りを残します。',
    axis: 'a2',
    difficulty: 3,
    estimatedMinutes: 30,
    actionItems: [
      '顧客リストに「最終対応日」「対応メモ」「次回アクション」列を追加',
      '直近のお客様対応を3件記録する',
      '週1回の更新ルールを決めてカレンダーにリマインダーを設定',
    ],
    completionCriteria: '対応履歴を3件記録し、週次更新のリマインダーを設定できた',
    recommendedTools: ['Googleスプレッドシート（無料）', 'Googleカレンダー（リマインダー）', 'HubSpot CRM（無料）'],
    hints: {
      how: '顧客リストのスプレッドシートにF列「最終対応日」G列「対応メモ」H列「次回アクション」を追加してください。',
      motivation: '「前回何を話したか覚えていない」がなくなります。お客様からの信頼が格段に上がります。',
      time: '3件のメモを書くだけなら15分です。完璧な記録でなくてOK、箇条書きで十分です。',
    },
  },
  {
    id: 'S12',
    name: 'SNSビジネス活用',
    description: 'InstagramまたはX（旧Twitter）のビジネスアカウントを整えて、1投稿してみましょう。まずはプロフィールの充実から始めます。',
    axis: 'a2',
    difficulty: 3,
    estimatedMinutes: 30,
    actionItems: [
      'ビジネス用SNSアカウントのプロフィールを充実させる（事業内容・連絡先・URL）',
      '自社のサービスや日常業務に関する投稿を1件作成して公開',
      'LINE公式アカウントのURLをプロフィールに設定',
    ],
    completionCriteria: 'SNSプロフィールを整備し、ビジネス関連の投稿を1件公開できた',
    recommendedTools: ['Instagram（無料）', 'X / Twitter（無料）', 'Canva（無料・画像作成）'],
    hints: {
      how: 'Canva（canva.com）で無料のテンプレートを使えば、見栄えの良い投稿画像が5分で作れます。',
      motivation: 'SNSは無料の広告です。1投稿でも、検索で御社を見つけてもらえる可能性が生まれます。',
      time: 'プロフィール更新だけなら10分です。投稿は後日でもOKです。',
    },
  },
];

// ---------------------------------------------------------------------------
// 軸B: 繰り返し作業 (S13〜S18)
// ---------------------------------------------------------------------------
const AXIS_B_STEPS: StepDefinition[] = [
  {
    id: 'S13',
    name: 'タスク棚卸し',
    description: '毎日・毎週行っている業務タスクを全て書き出してみましょう。「何にどのくらい時間をかけているか」を見える化します。',
    axis: 'b',
    difficulty: 1,
    estimatedMinutes: 15,
    actionItems: [
      'メモアプリやスプレッドシートに、毎日行っている業務を全て書き出す',
      '各タスクにかかっている時間（分）を概算で記入',
      '「毎日」「毎週」「毎月」に分類する',
    ],
    completionCriteria: '10個以上の業務タスクを書き出し、時間を記入できた',
    recommendedTools: ['Googleスプレッドシート（無料）', 'Google Keep（無料）', 'Notion（無料）'],
    hints: {
      how: 'まず朝起きてから帰るまでの流れを思い出してください。「メール確認」「見積作成」「電話対応」など、細かいものも全て書き出します。',
      motivation: '「忙しい」の正体が分かります。書き出すだけで「これ、実は不要だった」という発見があります。',
      time: '通勤中や昼休みに思いつくまま書き出すだけでOKです。10分あれば十分です。',
    },
  },
  {
    id: 'S14',
    name: '自動化候補の特定',
    description: '書き出したタスクの中から「毎回同じ手順で行っている作業」を見つけましょう。それが自動化の候補です。',
    axis: 'b',
    difficulty: 1,
    estimatedMinutes: 15,
    actionItems: [
      'タスク一覧から「毎回ほぼ同じ手順」の作業に印をつける',
      '印をつけた作業を「すぐ自動化できそう」「ツールが必要」「人手が必要」に分類',
      '「すぐ自動化できそう」の中から1つ選ぶ',
    ],
    completionCriteria: '自動化候補を3つ以上見つけ、優先度をつけた',
    recommendedTools: ['Googleスプレッドシート（無料）'],
    hints: {
      how: '「コピペ」「転記」「同じ文面の送信」「定型フォーマットの作成」が自動化しやすい作業です。まずこのキーワードで探してください。',
      motivation: '1日30分の作業を自動化すると、年間で約180時間（22日分）の時間が生まれます。',
      time: 'タスク一覧を見ながら印をつけるだけ。5分で終わります。',
    },
  },
  {
    id: 'S15',
    name: 'テンプレート作成',
    description: 'よく使う文章やフォーマットをテンプレート化しましょう。メールの定型文や報告書のフォーマットを1つ作ります。',
    axis: 'b',
    difficulty: 2,
    estimatedMinutes: 20,
    actionItems: [
      'よく送るメールや文章を1つ選ぶ',
      'Gmailの「テンプレート」機能またはGoogleドキュメントでテンプレートを作成',
      '変更が必要な箇所を【】で囲んでマークする',
    ],
    completionCriteria: 'メールまたは文書のテンプレートを1つ作成して保存できた',
    recommendedTools: ['Gmail テンプレート機能（無料）', 'Googleドキュメント（無料）'],
    hints: {
      how: 'Gmailでテンプレートを有効にするには、設定→詳細→テンプレート「有効」にします。メール作成→下書き保存→テンプレートとして保存。',
      motivation: '1通3分かかるメールが30秒になります。1日5通で年間45時間の節約です。',
      time: '一番よく送るメールを1つコピーして、固有名詞を【】に変えるだけ。10分です。',
    },
  },
  {
    id: 'S16',
    name: 'カレンダー自動化',
    description: 'Googleカレンダーで定期的な予定やリマインダーを設定しましょう。「毎週月曜の朝会」など、繰り返し予定を自動化します。',
    axis: 'b',
    difficulty: 2,
    estimatedMinutes: 20,
    actionItems: [
      'Googleカレンダーで定期的な業務予定を3つ以上「繰り返し」設定する',
      '重要な締切にリマインダー（通知）を設定',
      '月次チェックリスト（S06で作成）のリマインダーを設定',
    ],
    completionCriteria: '繰り返し予定を3つ以上設定し、リマインダーが動作することを確認できた',
    recommendedTools: ['Googleカレンダー（無料）', 'TimeTree（チーム共有・無料）'],
    hints: {
      how: 'Googleカレンダーで予定を作成→「繰り返し」をクリック→「毎週」や「毎月」を選択するだけです。',
      motivation: '「あの会議、忘れてた！」がなくなります。カレンダーに任せれば、頭を使う仕事に集中できます。',
      time: '予定を1つ作って「繰り返し」を設定するだけ。1件2分、3件で6分です。',
    },
  },
  {
    id: 'S17',
    name: 'ワークフロー図式化',
    description: '普段の業務フローを簡単な図にしてみましょう。「誰が・何を・どの順番で」やっているかを整理すると、無駄が見えてきます。',
    axis: 'b',
    difficulty: 3,
    estimatedMinutes: 35,
    actionItems: [
      '主要な業務プロセスを1つ選ぶ（例: 受注→納品→請求の流れ）',
      'Googleスライドまたは紙に、ステップを矢印でつないだフロー図を作成',
      '「待ち時間」「手戻り」「重複作業」がある箇所に印をつける',
    ],
    completionCriteria: '業務フロー図を1つ作成し、改善候補を1つ以上特定できた',
    recommendedTools: ['Googleスライド（無料）', 'Miro（無料枠あり）', 'draw.io（完全無料）'],
    hints: {
      how: 'draw.io（app.diagrams.net）は登録不要で使えるフロー図ツールです。四角を並べて矢印でつなぐだけ。',
      motivation: '「なぜか忙しい」の原因が見えます。フロー図にすると、ムダな手順が一目瞭然です。',
      time: '紙とペンでOKです。まず一番よくやる業務を3ステップだけ書いてみましょう。15分で十分です。',
    },
  },
  {
    id: 'S18',
    name: '自動化ツール導入',
    description: '実際に1つの作業を自動化ツールで自動化してみましょう。Googleフォームの回答をスプレッドシートに自動記録する、など簡単なものからスタートです。',
    axis: 'b',
    difficulty: 3,
    estimatedMinutes: 40,
    actionItems: [
      '自動化するタスクを1つ決める（例: フォーム回答の集計、メール自動返信）',
      'Googleフォーム+スプレッドシート連携、またはGmailフィルタを設定',
      '実際にテストして自動処理が動くことを確認',
    ],
    completionCriteria: '1つの業務タスクを自動化し、テストで動作を確認できた',
    recommendedTools: ['Googleフォーム（無料）', 'Gmailフィルタ（無料）', 'Zapier（無料枠あり）'],
    hints: {
      how: 'Googleフォームで問い合わせフォームを作ると、回答が自動でスプレッドシートに記録されます。forms.new で新規作成できます。',
      motivation: '1つ自動化するだけで「こんなに楽になるのか」を実感できます。最初の成功体験が大事です。',
      time: 'Gmailフィルタの設定なら10分です。特定のメールに自動でラベルをつけるだけでも立派な自動化です。',
    },
  },
];

// ---------------------------------------------------------------------------
// 軸C: データ経営 (S19〜S24)
// ---------------------------------------------------------------------------
const AXIS_C_STEPS: StepDefinition[] = [
  {
    id: 'S19',
    name: '売上データ入力',
    description: '直近3ヶ月分の売上データをスプレッドシートに入力しましょう。まずは月ごとの合計金額だけでOKです。',
    axis: 'c',
    difficulty: 1,
    estimatedMinutes: 15,
    actionItems: [
      'Googleスプレッドシートに「月」「売上合計」の2列を作成',
      '直近3ヶ月分の売上合計金額を入力',
      'SUM関数で合計と平均を計算するセルを追加',
    ],
    completionCriteria: '3ヶ月分の売上データを入力し、合計・平均を計算できた',
    recommendedTools: ['Googleスプレッドシート（無料）'],
    hints: {
      how: 'スプレッドシートのSUM関数は =SUM(B2:B4) のように入力します。平均は =AVERAGE(B2:B4) です。',
      motivation: '数字を「なんとなく」ではなく「正確に」把握するだけで、経営判断の質が変わります。',
      time: '月の売上合計を3つ入力するだけ。通帳や帳簿を見ながら10分です。',
    },
  },
  {
    id: 'S20',
    name: 'KPI設定',
    description: '事業で一番大切な数字（KPI）を3つ決めましょう。売上・顧客数・利益率など、毎月チェックする指標を明確にします。',
    axis: 'c',
    difficulty: 1,
    estimatedMinutes: 20,
    actionItems: [
      '事業で最も重要な数字を3つ選ぶ（例: 月間売上、新規顧客数、粗利率）',
      '各KPIの現在値と目標値を記入',
      'スプレッドシートに「KPI管理」シートを作成して記録',
    ],
    completionCriteria: 'KPIを3つ決めて、現在値と目標値を記入できた',
    recommendedTools: ['Googleスプレッドシート（無料）'],
    hints: {
      how: '迷ったら「月間売上」「新規問い合わせ数」「リピート率」の3つから始めましょう。これで多くの中小企業の経営状態が把握できます。',
      motivation: 'KPIがないと「頑張っているのに成果が出ない」原因が分かりません。数字で見れば改善点が明確になります。',
      time: '3つの数字を決めて書くだけ。10分で十分です。',
    },
  },
  {
    id: 'S21',
    name: 'ダッシュボード構築',
    description: 'KPIを一目で確認できるダッシュボードをGoogleスプレッドシートで作りましょう。グラフを1つ追加するだけで「見える化」が実現します。',
    axis: 'c',
    difficulty: 2,
    estimatedMinutes: 30,
    actionItems: [
      '売上データのシートから棒グラフまたは折れ線グラフを1つ作成',
      'KPI管理シートに「今月の達成率」を自動計算するセルを追加',
      'ダッシュボード用の別シートにグラフとKPIサマリをまとめる',
    ],
    completionCriteria: 'グラフ付きのKPIダッシュボードを作成できた',
    recommendedTools: ['Googleスプレッドシート（グラフ機能）', 'Googleデータポータル（Looker Studio・無料）'],
    hints: {
      how: 'スプレッドシートでデータ範囲を選択→「挿入」→「グラフ」で自動的にグラフが作成されます。',
      motivation: '数字の羅列よりグラフの方が100倍分かりやすいです。月初にグラフを見るだけで経営状態が把握できます。',
      time: 'グラフ1つの作成は5分です。まず売上の棒グラフだけ作りましょう。',
    },
  },
  {
    id: 'S22',
    name: '定期レポート作成',
    description: '月次の経営レポートのテンプレートを作りましょう。KPIの推移とコメントを1ページにまとめます。',
    axis: 'c',
    difficulty: 2,
    estimatedMinutes: 30,
    actionItems: [
      'Googleドキュメントで月次レポートのテンプレートを作成',
      'KPIの数値とグラフを貼り付ける場所を設ける',
      '「今月のハイライト」「来月のアクション」セクションを追加',
    ],
    completionCriteria: '月次レポートのテンプレートを作成し、今月分の数値を記入できた',
    recommendedTools: ['Googleドキュメント（無料）', 'Googleスプレッドシート'],
    hints: {
      how: 'Googleドキュメントで「挿入」→「グラフ」→「スプレッドシートから」で、作成済みのグラフを直接貼り付けられます。',
      motivation: '毎月のレポートがあると、振り返りの質が上がります。「先月何をやったか」が明確になります。',
      time: 'テンプレートの枠組みだけ作るなら15分です。数字は後から埋めればOKです。',
    },
  },
  {
    id: 'S23',
    name: 'データ分析入門',
    description: '売上データから「どの商品が一番売れているか」「どの月が好調か」を分析してみましょう。フィルタとソートを使えば簡単です。',
    axis: 'c',
    difficulty: 3,
    estimatedMinutes: 35,
    actionItems: [
      '売上データにフィルタを適用して、商品別・月別に並べ替える',
      '売上上位3商品と、売上が伸びている月を特定する',
      '分析結果を1〜2行のコメントとして月次レポートに追記',
    ],
    completionCriteria: '売上の上位商品と好調月を特定し、レポートに記載できた',
    recommendedTools: ['Googleスプレッドシート（フィルタ・ピボットテーブル）'],
    hints: {
      how: 'スプレッドシートのデータ範囲を選択→「データ」→「フィルタを作成」で、列ごとにソートやフィルタができます。',
      motivation: 'データを見るだけで「思い込み」と「事実」の違いに気づけます。意外な発見があるかもしれません。',
      time: 'フィルタの設定は2分です。まず売上金額で「降順ソート」するだけでも十分な分析です。',
    },
  },
  {
    id: 'S24',
    name: 'データに基づく判断',
    description: '集めたデータをもとに、1つ具体的な経営判断をしてみましょう。「売上が伸びている商品に広告を増やす」など、データ → アクションの流れを体験します。',
    axis: 'c',
    difficulty: 3,
    estimatedMinutes: 40,
    actionItems: [
      '分析結果から改善アクションを3つリストアップ',
      '最もインパクトが大きそうな1つを選び、実行計画を書く',
      '1ヶ月後に効果を測定する日をカレンダーに登録',
    ],
    completionCriteria: 'データに基づく改善アクションを1つ決め、実行計画と効果測定日を設定できた',
    recommendedTools: ['Googleスプレッドシート', 'Googleカレンダー'],
    hints: {
      how: '「売上上位の商品」に関連するアクションから始めましょう。例: その商品のPRを強化する、在庫を増やす、セット販売を試す、など。',
      motivation: '「勘」ではなく「データ」で判断する経験を1回するだけで、経営の質が変わります。',
      time: 'アクションを1つ決めるだけなら10分です。計画は箇条書き3行で十分です。',
    },
  },
];

// ---------------------------------------------------------------------------
// 軸D: ツール習熟 (S25〜S30)
// ---------------------------------------------------------------------------
const AXIS_D_STEPS: StepDefinition[] = [
  {
    id: 'S25',
    name: 'ファイル整理',
    description: 'PC内のファイルをフォルダで整理しましょう。「年度フォルダ → 月フォルダ」のルールを決めて、デスクトップをスッキリさせます。',
    axis: 'd',
    difficulty: 1,
    estimatedMinutes: 15,
    actionItems: [
      'デスクトップまたはマイドキュメントに「2026」フォルダを作成',
      'その中に「01月」〜「12月」のサブフォルダを作成',
      'デスクトップの書類ファイルを5つ以上、適切なフォルダに移動',
    ],
    completionCriteria: '年月フォルダを作成し、ファイルを5つ以上整理できた',
    recommendedTools: ['エクスプローラー（Windows）', 'Finder（Mac）'],
    hints: {
      how: 'デスクトップで右クリック→「新しいフォルダ」で作成できます。フォルダ名は「2026」→その中に「01」「02」...と作ります。',
      motivation: '必要なファイルを探す時間は、1日平均15分と言われています。整理すれば年間60時間の節約です。',
      time: 'フォルダ作成は3分、ファイル移動は5つで5分。合計8分で完了します。',
    },
  },
  {
    id: 'S26',
    name: 'クラウドストレージ',
    description: 'Googleドライブで重要なファイルをクラウドに保存しましょう。PCが壊れても安心です。スマホからもアクセスできます。',
    axis: 'd',
    difficulty: 1,
    estimatedMinutes: 15,
    actionItems: [
      'Googleドライブ（drive.google.com）にアクセスして使い方を確認',
      '仕事で使う重要なファイルを3つ以上アップロード',
      'スマホにGoogleドライブアプリをインストールしてアクセスを確認',
    ],
    completionCriteria: 'Googleドライブにファイルを3つ以上保存し、スマホからもアクセスできた',
    recommendedTools: ['Googleドライブ（15GB無料）', 'Dropbox（2GB無料）'],
    hints: {
      how: 'drive.google.com にアクセスして、画面左上の「新規」→「ファイルのアップロード」でファイルを保存できます。',
      motivation: 'PCの故障やデータ消失のリスクがゼロになります。出先でもスマホでファイルを確認できます。',
      time: 'ファイルを3つドラッグ&ドロップするだけ。5分で完了します。',
    },
  },
  {
    id: 'S27',
    name: 'ビデオ会議',
    description: 'Google MeetまたはZoomでビデオ会議を1回開催してみましょう。社内の同僚やパートナーとテスト通話するだけでOKです。',
    axis: 'd',
    difficulty: 2,
    estimatedMinutes: 20,
    actionItems: [
      'Google Meet（meet.google.com）で会議を新規作成',
      '参加者にURLを共有して接続テスト',
      '画面共有の方法を確認する',
    ],
    completionCriteria: 'ビデオ会議を開催し、画面共有ができた',
    recommendedTools: ['Google Meet（無料・60分制限）', 'Zoom（無料・40分制限）'],
    hints: {
      how: 'meet.google.com にアクセス→「新しい会議を作成」でURLが生成されます。そのURLを相手に送るだけです。',
      motivation: '移動時間ゼロで打ち合わせができます。遠方のお客様との商談にも使えます。',
      time: '会議作成は1分。テスト通話5分。合計10分で完了します。',
    },
  },
  {
    id: 'S28',
    name: 'セキュリティ強化',
    description: 'Googleアカウントの2段階認証を設定して、不正アクセスから守りましょう。パスワードだけでは不十分な時代です。',
    axis: 'd',
    difficulty: 2,
    estimatedMinutes: 20,
    actionItems: [
      'Googleアカウントのセキュリティ設定ページにアクセス',
      '2段階認証プロセスを有効化（スマホで認証コードを受け取る設定）',
      '重要なサービス（ネットバンキング等）のパスワードを変更し、使い回しをやめる',
    ],
    completionCriteria: 'Googleアカウントの2段階認証を有効化できた',
    recommendedTools: ['Googleアカウント セキュリティ設定', 'Google認証システムアプリ'],
    hints: {
      how: 'myaccount.google.com/security にアクセス→「2段階認証プロセス」→「使ってみる」で設定できます。SMSで認証コードを受け取る方法が一番簡単です。',
      motivation: 'パスワード漏洩による不正アクセスは年々増加しています。2段階認証で被害の99%を防げます。',
      time: 'スマホを手元に用意して、画面の指示に従うだけ。10分で完了します。',
    },
  },
  {
    id: 'S29',
    name: 'ツール比較・選定',
    description: '自社の課題に合ったITツールを比較検討してみましょう。「必要な機能」と「予算」を整理して、最適なツールを見つけます。',
    axis: 'd',
    difficulty: 3,
    estimatedMinutes: 30,
    actionItems: [
      '解決したい業務課題を1つ明確にする',
      '候補ツールを3つ以上リストアップし、機能・料金・口コミを比較表にまとめる',
      '無料トライアルがあるツールを1つ試してみる',
    ],
    completionCriteria: 'ツール比較表を作成し、1つ以上のツールの無料トライアルを開始できた',
    recommendedTools: ['ITreview（口コミ比較サイト）', 'Googleスプレッドシート（比較表作成）'],
    hints: {
      how: 'ITreview（https://www.itreview.jp/）で業種・カテゴリを選ぶと、ユーザーの口コミ付きでツールを比較できます。',
      motivation: '「とりあえず安いもの」ではなく「課題に合うもの」を選べば、導入後の後悔がなくなります。',
      time: 'まず課題を1つ書くだけなら3分です。ツール検索は後日でOK。',
    },
  },
  {
    id: 'S30',
    name: 'IT活用振り返り',
    description: 'これまでのステップを振り返り、IT活用度がどう変わったかを確認しましょう。どのツールが業務に役立っているかを整理します。',
    axis: 'd',
    difficulty: 3,
    estimatedMinutes: 30,
    actionItems: [
      '導入済みツールのリストを作成し、「使用頻度」「効果」を記入',
      'まだ活用できていないツールの原因を1つ書き出す',
      '今後3ヶ月で取り組みたいIT施策を1つ決める',
    ],
    completionCriteria: 'ツール活用状況を整理し、今後の施策を1つ決められた',
    recommendedTools: ['Googleスプレッドシート（振り返りシート）', 'Googleドキュメント'],
    hints: {
      how: 'スプレッドシートに「ツール名」「用途」「使用頻度（毎日/週1/月1/未使用）」「効果（高/中/低）」の列を作って記入してください。',
      motivation: '振り返りをすることで「やりっぱなし」を防げます。次の一手が明確になります。',
      time: 'ツール名を書き出すだけなら10分。効果の評価は後から追記でOKです。',
    },
  },
];

// ---------------------------------------------------------------------------
// 全ステップ（デフォルト値）
// ---------------------------------------------------------------------------
const DEFAULT_STEPS: StepDefinition[] = [
  ...AXIS_A1_STEPS,
  ...AXIS_A2_STEPS,
  ...AXIS_B_STEPS,
  ...AXIS_C_STEPS,
  ...AXIS_D_STEPS,
];

/** デフォルトの軸別ステップ一覧（同期版で使用） */
const STEPS_BY_AXIS: Record<keyof AxisScores, StepDefinition[]> = {
  a1: AXIS_A1_STEPS,
  a2: AXIS_A2_STEPS,
  b: AXIS_B_STEPS,
  c: AXIS_C_STEPS,
  d: AXIS_D_STEPS,
};

// ---------------------------------------------------------------------------
// 公開関数
// ---------------------------------------------------------------------------

/** 指定軸のステップ一覧を取得 */
export function getStepsForAxis(axis: keyof AxisScores): StepDefinition[] {
  return STEPS_BY_AXIS[axis];
}

/** 軸交互方式で次の未完了ステップを選択 */
export function getNextStep(
  completedStepIds: string[],
  weakAxis: keyof AxisScores,
  axisScores?: AxisScores
): StepDefinition | null {
  const completed = new Set(completedStepIds);

  // axisScoresが渡された場合は軸交互方式を使用
  if (axisScores) {
    return getNextStepInterleaved(completed, axisScores);
  }

  // フォールバック: 従来の弱軸優先方式
  return getNextStepLegacy(completed, weakAxis);
}

/**
 * 軸交互方式: 弱軸Lv.1を2つ → 2番目に弱い軸のLv.1を1つ → 弱軸Lv.2 → ...
 * axisScoresの低い順に優先して配信
 */
function getNextStepInterleaved(
  completed: Set<string>,
  axisScores: AxisScores
): StepDefinition | null {
  // スコア昇順で軸をソート
  const axes = (Object.keys(STEPS_BY_AXIS) as (keyof AxisScores)[])
    .sort((a, b) => axisScores[a] - axisScores[b]);

  // 各軸の未完了ステップを難易度別に取得
  const axisUnfinished = new Map<keyof AxisScores, Map<number, StepDefinition[]>>();
  for (const axis of axes) {
    const byDifficulty = new Map<number, StepDefinition[]>();
    for (const step of STEPS_BY_AXIS[axis]) {
      if (!completed.has(step.id)) {
        const list = byDifficulty.get(step.difficulty) ?? [];
        list.push(step);
        byDifficulty.set(step.difficulty, list);
      }
    }
    axisUnfinished.set(axis, byDifficulty);
  }

  // 配信順序: 難易度1→2→3の順に、各難易度内で軸を交互に回す
  for (const difficulty of [1, 2, 3]) {
    for (const axis of axes) {
      const byDifficulty = axisUnfinished.get(axis);
      if (!byDifficulty) continue;
      const steps = byDifficulty.get(difficulty);
      if (steps && steps.length > 0) {
        return steps[0];
      }
    }
  }

  return null;
}

/** 従来の弱軸優先方式（フォールバック） */
function getNextStepLegacy(
  completed: Set<string>,
  weakAxis: keyof AxisScores
): StepDefinition | null {
  // 1. 弱点軸から未完了ステップを探す（難易度順）
  const weakSteps = STEPS_BY_AXIS[weakAxis];
  for (const step of weakSteps) {
    if (!completed.has(step.id)) {
      return step;
    }
  }

  // 2. 弱点軸が全完了なら、他の軸からスコア昇順で探す
  const otherAxes = (Object.keys(STEPS_BY_AXIS) as (keyof AxisScores)[])
    .filter((a) => a !== weakAxis);

  for (const axis of otherAxes) {
    for (const step of STEPS_BY_AXIS[axis]) {
      if (!completed.has(step.id)) {
        return step;
      }
    }
  }

  // 3. 全ステップ完了
  return null;
}

/** 全ステップ一覧を取得（同期版: デフォルト値を返す） */
export function getAllSteps(): StepDefinition[] {
  return DEFAULT_STEPS;
}

// ---------------------------------------------------------------------------
// DB優先の非同期版（Phase B: webhook等のサーバーサイドで使用）
// ---------------------------------------------------------------------------

/** DBからステップ定義を読み込む。未設定時はnullを返す */
async function loadStepsFromDb(): Promise<StepDefinition[] | null> {
  try {
    const dbSteps = await getSetting<StepDefinition[]>(APP_SETTING_KEYS.STEPS, DEFAULT_STEPS);
    // getSettingはデフォルト値を返すので、DBに値がある場合のみdbStepsは異なる
    // ただし getSetting は常にT型を返すため null にはならない
    return dbSteps;
  } catch (err) {
    console.error('[step-master] DB読み込みエラー:', err);
    return null;
  }
}

/** 軸別にグループ化するヘルパー */
function buildStepsByAxis(steps: StepDefinition[]): Record<keyof AxisScores, StepDefinition[]> {
  const result: Record<keyof AxisScores, StepDefinition[]> = {
    a1: [], a2: [], b: [], c: [], d: [],
  };
  for (const step of steps) {
    if (result[step.axis]) {
      result[step.axis].push(step);
    }
  }
  return result;
}

/** 全ステップ一覧を取得（非同期版: DB優先、フォールバックはDEFAULT_STEPS） */
export async function getAllStepsAsync(): Promise<StepDefinition[]> {
  const dbSteps = await loadStepsFromDb();
  return dbSteps ?? DEFAULT_STEPS;
}

/** 軸交互方式で次の未完了ステップを選択（非同期版: DB優先） */
export async function getNextStepAsync(
  completedStepIds: string[],
  weakAxis: keyof AxisScores,
  axisScores?: AxisScores
): Promise<StepDefinition | null> {
  const allSteps = await getAllStepsAsync();
  const stepsByAxis = buildStepsByAxis(allSteps);
  const completed = new Set(completedStepIds);

  // axisScoresが渡された場合は軸交互方式を使用
  if (axisScores) {
    // スコア昇順で軸をソート
    const axes = (Object.keys(stepsByAxis) as (keyof AxisScores)[])
      .sort((a, b) => axisScores[a] - axisScores[b]);

    // 配信順序: 難易度1→2→3の順に、各難易度内で軸を交互に回す
    for (const difficulty of [1, 2, 3]) {
      for (const axis of axes) {
        const steps = stepsByAxis[axis] ?? [];
        for (const step of steps) {
          if (!completed.has(step.id) && step.difficulty === difficulty) {
            return step;
          }
        }
      }
    }
    return null;
  }

  // フォールバック: 従来の弱軸優先方式
  // 1. 弱点軸から未完了ステップを探す（難易度順）
  const weakSteps = stepsByAxis[weakAxis] ?? [];
  for (const step of weakSteps) {
    if (!completed.has(step.id)) {
      return step;
    }
  }

  // 2. 弱点軸が全完了なら、他の軸からスコア昇順で探す
  const otherAxes = (Object.keys(stepsByAxis) as (keyof AxisScores)[])
    .filter((a) => a !== weakAxis);

  for (const axis of otherAxes) {
    for (const step of stepsByAxis[axis] ?? []) {
      if (!completed.has(step.id)) {
        return step;
      }
    }
  }

  // 3. 全ステップ完了
  return null;
}

/** stepIdからStepDefinitionを検索（非同期版: DB優先） */
export async function findStepByIdAsync(stepId: string): Promise<StepDefinition | null> {
  const allSteps = await getAllStepsAsync();
  return allSteps.find((s) => s.id === stepId) ?? null;
}
