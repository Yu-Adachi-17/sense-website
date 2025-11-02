#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="content/blog/strategy"
DATE_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
COVER="/images/StrategyFeature.png"
mkdir -p "$BASE_DIR"

product_name(){ case "$1" in
  ar) echo "Minutes.AI";;
  da) echo "Referat AI";;
  de) echo "Protokoll KI";;
  en) echo "Minutes.AI";;
  es|es-ES|es-MX) echo "Actas IA";;
  fr) echo "Minutes.AI";;
  id) echo "Minutes AI";;
  ja) echo "議事録AI";;
  ko) echo "회의록AI";;
  ms) echo "Minit AI";;
  nl) echo "Notulen AI";;
  no) echo "Referat AI";;
  pt|pt-PT|pt-BR) echo "Ata AI";;
  sv) echo "Protokoll AI";;
  tr) echo "Tutanakları AI";;
  zh-CN) echo "会议记录AI";;
  zh-TW) echo "會議紀錄AI";;
  *) echo "Minutes.AI";;
esac; }

LOCALES=(ar da de en es-ES es-MX fr id ja ko ms nl no pt-BR pt-PT sv tr zh-CN zh-TW)

write_mdx () {
  LOC="$1"
  PROD="$(product_name "$LOC")"
  FILE="$BASE_DIR/${LOC}.mdx"
  SLUG="strategy-${LOC}"

  case "$LOC" in
    ja)
      TITLE="Strategy — ${PROD}で議事録を意思決定へ"
      DESC="短く読める解説：Strategyが議事録をBoost/Counter/Top Issueと3つの思考法に整理し、次の一手へ繋げます。"
      H1="Strategy"
      WHAT="何ができるか"
      HOW="使い方（超シンプル）"
      STEPS=$'1) 議事録を生成\n2) 「Strategy」をタップ\n3) Boost / Counter / Top Issue + 3モードを確認\n4) タスク管理に貼り付け'
      SAMPLE="サンプル（超短縮）"
      AVAIL="iOSで利用可能。今すぐお試しください。"
      B_BOOST="うまくいっている点と拡張策"
      B_COUNTER="リスクと改善策"
      B_TOP="解くべき中核の問い"
      B_LOGICAL="セグメント定義 → KPI設定 → A/B → 勝ち案を出荷"
      B_CRITICAL="SNSバイアスを疑う。ブラインドテストで検証"
      B_LATERAL="香り/ルームミストなど飲料外の体験へ拡張"
      ;;
    en)
      TITLE="Strategy — Turn minutes into decisions with ${PROD}"
      DESC="Quick read: Strategy converts minutes into Boost/Counter/Top Issue plus three thinking modes."
      H1="Strategy"
      WHAT="What it does"
      HOW="How to use (quick)"
      STEPS=$'1) Generate minutes\n2) Tap “Strategy”\n3) Review Boost / Counter / Top Issue + 3 modes\n4) Paste into your task system'
      SAMPLE="Sample (super short)"
      AVAIL="Available on iOS. Try it today."
      B_BOOST="what works and how to scale"
      B_COUNTER="risks and how to fix"
      B_TOP="the core question to solve"
      B_LOGICAL="define segments → set KPIs → A/B → ship winner"
      B_CRITICAL="validate beyond social buzz with blind tests"
      B_LATERAL="extend to a scent/room-mist edition"
      ;;
    ar)
      TITLE="Strategy — حوّل المحاضر إلى قرارات مع ${PROD}"
      DESC="قراءة سريعة: Strategy يحول المحاضر إلى Boost/Counter/Top Issue وثلاثة أساليب تفكير."
      H1="Strategy"
      WHAT="ماذا تفعل"
      HOW="طريقة الاستخدام (سريع)"
      STEPS=$'1) أنشئ المحضر\n2) اضغط Strategy\n3) راجع Boost / Counter / Top Issue + 3 أساليب\n4) انسخ إلى نظام المهام'
      SAMPLE="عينة (مختصرة جدًا)"
      AVAIL="متاح على iOS."
      B_BOOST="ما يعمل وكيف نوسّعه"
      B_COUNTER="المخاطر وكيف نعالجها"
      B_TOP="السؤال الجوهري"
      B_LOGICAL="تحديد الشرائح → مؤشرات أداء → A/B → إطلاق الفائز"
      B_CRITICAL="تحقق باختبارات عمياء بعيدًا عن ضجيج الشبكات"
      B_LATERAL="نسخة عطر/رذاذ غرف"
      ;;
    da)
      TITLE="Strategy — Gør referater til beslutninger med ${PROD}"
      DESC="Kort læsning: Strategy giver Boost/Counter/Top Issue og tre tænkemåder."
      H1="Strategy"
      WHAT="Hvad den gør"
      HOW="Sådan bruges (kort)"
      STEPS=$'1) Generér referat\n2) Tryk “Strategy”\n3) Gennemse Boost / Counter / Top Issue + 3 modes\n4) Indsæt i dit opgavesystem'
      SAMPLE="Eksempel (meget kort)"
      AVAIL="Tilgængelig på iOS."
      B_BOOST="det der virker og skalering"
      B_COUNTER="risici og afhjælpning"
      B_TOP="kernen der skal løses"
      B_LOGICAL="segmenter → KPI’er → A/B → ship vinder"
      B_CRITICAL="valider ud over hype"
      B_LATERAL="duft/room-mist-udgave"
      ;;
    de)
      TITLE="Strategy — Mit ${PROD} aus Protokollen Entscheidungen machen"
      DESC="Kurz erklärt: Strategy bündelt Protokolle zu Boost/Counter/Top Issue plus drei Denkmodi."
      H1="Strategy"
      WHAT="Funktionen"
      HOW="So geht’s (kurz)"
      STEPS=$'1) Protokoll erzeugen\n2) „Strategy“ tippen\n3) Boost / Counter / Top Issue + 3 Modi prüfen\n4) In Tasks übernehmen'
      SAMPLE="Beispiel (sehr kurz)"
      AVAIL="Verfügbar auf iOS."
      B_BOOST="was funktioniert und skalieren"
      B_COUNTER="Risiken und Abhilfe"
      B_TOP="zentrale Fragestellung"
      B_LOGICAL="Segmente → KPIs → A/B → Gewinner ausrollen"
      B_CRITICAL="jenseits des Social-Buzz blind testen"
      B_LATERAL="Duft-/Room-Mist-Edition"
      ;;
    es-ES)
      TITLE="Strategy — Convierte actas en decisiones con ${PROD}"
      DESC="Lectura rápida: Strategy resume en Boost/Counter/Top Issue y tres modos de pensamiento."
      H1="Strategy"
      WHAT="Qué hace"
      HOW="Cómo usar (rápido)"
      STEPS=$'1) Genera las actas\n2) Toca “Strategy”\n3) Revisa Boost / Counter / Top Issue + 3 modos\n4) Pega en tu gestor de tareas'
      SAMPLE="Ejemplo (muy breve)"
      AVAIL="Disponible en iOS."
      B_BOOST="qué funciona y cómo escalar"
      B_COUNTER="riesgos y cómo corregir"
      B_TOP="la pregunta clave"
      B_LOGICAL="segmentos → KPIs → A/B → lanzar ganador"
      B_CRITICAL="validar más allá del ruido social"
      B_LATERAL="edición aroma/ambientador"
      ;;
    es-MX)
      TITLE="Strategy — Convierte minutas en decisiones con ${PROD}"
      DESC="Lectura rápida: Strategy entrega Boost/Counter/Top Issue y tres modos de pensamiento."
      H1="Strategy"
      WHAT="Qué hace"
      HOW="Cómo usar (rápido)"
      STEPS=$'1) Genera minutas\n2) Toca “Strategy”\n3) Revisa Boost / Counter / Top Issue + 3 modos\n4) Pega en tu gestor de tareas'
      SAMPLE="Ejemplo (muy corto)"
      AVAIL="Disponible en iOS."
      B_BOOST="qué funciona y cómo escalar"
      B_COUNTER="riesgos y solución"
      B_TOP="pregunta central"
      B_LOGICAL="segmentos → KPIs → A/B → lanzar ganador"
      B_CRITICAL="validar más allá del hype"
      B_LATERAL="edición aromática/ambientador"
      ;;
    fr)
      TITLE="Strategy — Transformer des comptes-rendus en décisions avec ${PROD}"
      DESC="Lecture rapide : Strategy produit Boost/Counter/Top Issue et trois modes de pensée."
      H1="Strategy"
      WHAT="Ce que ça fait"
      HOW="Utilisation (rapide)"
      STEPS=$'1) Générer le CR\n2) Toucher « Strategy »\n3) Relire Boost / Counter / Top Issue + 3 modes\n4) Coller dans votre gestionnaire de tâches'
      SAMPLE="Exemple (très bref)"
      AVAIL="Disponible sur iOS."
      B_BOOST="ce qui marche et mise à l’échelle"
      B_COUNTER="risques et correctifs"
      B_TOP="la question clé"
      B_LOGICAL="segments → KPI → A/B → déployer le gagnant"
      B_CRITICAL="valider au-delà du buzz social"
      B_LATERAL="déclinaison parfum/room-mist"
      ;;
    id)
      TITLE="Strategy — Ubah notulen jadi keputusan dengan ${PROD}"
      DESC="Bacaan singkat: Strategy memberi Boost/Counter/Top Issue dan tiga mode berpikir."
      H1="Strategy"
      WHAT="Apa yang dilakukan"
      HOW="Cara pakai (ringkas)"
      STEPS=$'1) Buat notulen\n2) Ketuk “Strategy”\n3) Tinjau Boost / Counter / Top Issue + 3 mode\n4) Tempel ke sistem tugas'
      SAMPLE="Contoh (sangat singkat)"
      AVAIL="Tersedia di iOS."
      B_BOOST="apa yang berhasil & cara skala"
      B_COUNTER="risiko & perbaikan"
      B_TOP="pertanyaan inti"
      B_LOGICAL="segmen → KPI → A/B → rilis pemenang"
      B_CRITICAL="validasi di luar hype sosial"
      B_LATERAL="edisi aroma/room-mist"
      ;;
    ko)
      TITLE="Strategy — ${PROD}로 회의록을 의사결정으로"
      DESC="짧게 읽기: Strategy가 Boost/Counter/Top Issue와 3가지 사고 모드로 정리합니다."
      H1="Strategy"
      WHAT="무엇을 하나요"
      HOW="사용법 (간단)"
      STEPS=$'1) 회의록 생성\n2) “Strategy” 탭\n3) Boost / Counter / Top Issue + 3모드 확인\n4) 작업 시스템에 붙여넣기'
      SAMPLE="예시 (아주 짧게)"
      AVAIL="iOS에서 사용 가능."
      B_BOOST="잘 되는 점과 확장"
      B_COUNTER="리스크와 개선"
      B_TOP="핵심 질문"
      B_LOGICAL="세그먼트 → KPI → A/B → 우승안 배포"
      B_CRITICAL="소셜 버즈를 넘어 블라인드 테스트"
      B_LATERAL="향/룸미스트 확장"
      ;;
    ms)
      TITLE="Strategy — Ubah minit menjadi keputusan dengan ${PROD}"
      DESC="Bacaan ringkas: Strategy memberikan Boost/Counter/Top Issue dan tiga mod pemikiran."
      H1="Strategy"
      WHAT="Fungsinya"
      HOW="Cara guna (pantas)"
      STEPS=$'1) Jana minit\n2) Ketik “Strategy”\n3) Semak Boost / Counter / Top Issue + 3 mod\n4) Tampal ke sistem tugas anda'
      SAMPLE="Contoh (sangat ringkas)"
      AVAIL="Tersedia di iOS."
      B_BOOST="apa yang berkesan & skalakan"
      B_COUNTER="risiko & pembaikan"
      B_TOP="soalan teras"
      B_LOGICAL="segmen → KPI → A/B → keluarkan pemenang"
      B_CRITICAL="sahkan di luar hype sosial"
      B_LATERAL="edisi aroma/room-mist"
      ;;
    nl)
      TITLE="Strategy — Maak van notulen beslissingen met ${PROD}"
      DESC="Korte lees: Strategy levert Boost/Counter/Top Issue en drie denkmodi."
      H1="Strategy"
      WHAT="Wat het doet"
      HOW="Gebruik (kort)"
      STEPS=$'1) Genereer notulen\n2) Tik “Strategy”\n3) Review Boost / Counter / Top Issue + 3 modi\n4) Plak in je takenpakket'
      SAMPLE="Voorbeeld (zeer kort)"
      AVAIL="Beschikbaar op iOS."
      B_BOOST="wat werkt en opschalen"
      B_COUNTER="risico’s en fixes"
      B_TOP="kernvraag"
      B_LOGICAL="segmenten → KPI’s → A/B → winnaar shippen"
      B_CRITICAL="valideren buiten social buzz"
      B_LATERAL="geur/room-mist editie"
      ;;
    no)
      TITLE="Strategy — Gjør referater til beslutninger med ${PROD}"
      DESC="Kort lesing: Strategy gir Boost/Counter/Top Issue og tre tenkemåter."
      H1="Strategy"
      WHAT="Hva det gjør"
      HOW="Slik bruker du (kort)"
      STEPS=$'1) Generer referat\n2) Trykk “Strategy”\n3) Se over Boost / Counter / Top Issue + 3 modi\n4) Lim inn i oppgavesystemet ditt'
      SAMPLE="Eksempel (svært kort)"
      AVAIL="Tilgjengelig på iOS."
      B_BOOST="hva fungerer og skalering"
      B_COUNTER="risikoer og tiltak"
      B_TOP="kjerneproblem"
      B_LOGICAL="segmenter → KPI → A/B → rull ut vinner"
      B_CRITICAL="validér utover sosiale buzz"
      B_LATERAL="duft/room-mist-utgave"
      ;;
    pt-BR)
      TITLE="Strategy — Transforme atas em decisões com ${PROD}"
      DESC="Leitura rápida: Strategy entrega Boost/Counter/Top Issue e três modos de pensamento."
      H1="Strategy"
      WHAT="O que faz"
      HOW="Como usar (rápido)"
      STEPS=$'1) Gere as atas\n2) Toque “Strategy”\n3) Revise Boost / Counter / Top Issue + 3 modos\n4) Cole no seu gestor de tarefas'
      SAMPLE="Exemplo (bem curto)"
      AVAIL="Disponível no iOS."
      B_BOOST="o que funciona e como escalar"
      B_COUNTER="riscos e correções"
      B_TOP="questão central"
      B_LOGICAL="segmentos → KPIs → A/B → lançar o vencedor"
      B_CRITICAL="validar além do buzz social"
      B_LATERAL="edição com aroma/room-mist"
      ;;
    pt-PT)
      TITLE="Strategy — Transforme atas em decisões com ${PROD}"
      DESC="Leitura rápida: Strategy gera Boost/Counter/Top Issue e três modos de pensamento."
      H1="Strategy"
      WHAT="O que faz"
      HOW="Como usar (rápido)"
      STEPS=$'1) Gerar atas\n2) Tocar “Strategy”\n3) Rever Boost / Counter / Top Issue + 3 modos\n4) Colar no seu gestor de tarefas'
      SAMPLE="Exemplo (muito curto)"
      AVAIL="Disponível no iOS."
      B_BOOST="o que resulta e como escalar"
      B_COUNTER="riscos e correções"
      B_TOP="questão nuclear"
      B_LOGICAL="segmentos → KPIs → A/B → lançar vencedor"
      B_CRITICAL="validar para além do buzz social"
      B_LATERAL="edição com aroma/room-mist"
      ;;
    sv)
      TITLE="Strategy — Gör protokoll till beslut med ${PROD}"
      DESC="Snabbläsning: Strategy ger Boost/Counter/Top Issue och tre tänkelägen."
      H1="Strategy"
      WHAT="Det här gör den"
      HOW="Så använder du (kort)"
      STEPS=$'1) Skapa protokoll\n2) Tryck “Strategy”\n3) Gå igenom Boost / Counter / Top Issue + 3 lägen\n4) Klistra in i ditt uppgiftssystem'
      SAMPLE="Exempel (mycket kort)"
      AVAIL="Tillgängligt på iOS."
      B_BOOST="vad som funkar & skalning"
      B_COUNTER="risker & åtgärder"
      B_TOP="kärnfråga"
      B_LOGICAL="segment → KPI → A/B → skeppa vinnare"
      B_CRITICAL="validera bortom socialt brus"
      B_LATERAL="doft/room-mist-version"
      ;;
    tr)
      TITLE="Strategy — ${PROD} ile tutanakları karara dönüştürün"
      DESC="Kısa okuma: Strategy, Boost/Counter/Top Issue ve üç düşünme modu üretir."
      H1="Strategy"
      WHAT="Ne yapar"
      HOW="Kullanım (hızlı)"
      STEPS=$'1) Tutanak oluştur\n2) “Strategy”e dokun\n3) Boost / Counter / Top Issue + 3 modu incele\n4) Görev sistemine yapıştır'
      SAMPLE="Örnek (çok kısa)"
      AVAIL="iOS’ta mevcut."
      B_BOOST="işe yarayanlar ve ölçekleme"
      B_COUNTER="riskler ve düzeltmeler"
      B_TOP="temel soru"
      B_LOGICAL="segment → KPI → A/B → kazananı yayınla"
      B_CRITICAL="sosyal hype ötesi kör test"
      B_LATERAL="koku/oda spreyi edisyonu"
      ;;
    zh-CN)
      TITLE="Strategy — 用${PROD}把会议纪要变成决策"
      DESC="快读：Strategy 输出 Boost/Counter/Top Issue 与三种思维模式，直达下一步。"
      H1="Strategy"
      WHAT="能做什么"
      HOW="如何使用（简）"
      STEPS=$'1) 生成纪要\n2) 点按“Strategy”\n3) 查看 Boost / Counter / Top Issue + 3 模式\n4) 粘贴到任务系统'
      SAMPLE="示例（超短）"
      AVAIL="iOS 可用。"
      B_BOOST="有效之处与扩展"
      B_COUNTER="风险与改进"
      B_TOP="核心问题"
      B_LOGICAL="细分 → KPI → A/B → 上线优胜方案"
      B_CRITICAL="超越社交热度的盲测验证"
      B_LATERAL="拓展为香氛/室内喷雾版本"
      ;;
    zh-TW)
      TITLE="Strategy — 用${PROD}把會議紀錄化為決策"
      DESC="速讀：Strategy 產出 Boost/Counter/Top Issue 與三種思維模式。"
      H1="Strategy"
      WHAT="能做什麼"
      HOW="如何使用（簡）"
      STEPS=$'1) 產生紀錄\n2) 點擊「Strategy」\n3) 檢視 Boost / Counter / Top Issue + 3 模式\n4) 貼到任務系統'
      SAMPLE="範例（超短）"
      AVAIL="iOS 提供。"
      B_BOOST="有效重點與擴張"
      B_COUNTER="風險與修正"
      B_TOP="核心問題"
      B_LOGICAL="分眾 → KPI → A/B → 上線勝出方案"
      B_CRITICAL="超越社群聲量的盲測驗證"
      B_LATERAL="延伸為香氛/室內噴霧版"
      ;;
  esac

  cat > "$FILE" <<MDX
---
title: "${TITLE}"
description: "${DESC}"
date: "${DATE_UTC}"
tags:
  - ${PROD}
  - Strategy
slug: "${SLUG}"
cover: "${COVER}"
---

import Callout from "@/components/Callout.mdx";

# ${H1}

<Callout>Not just minutes — <strong>Strategy</strong> uses modern AI (ChatGPT-5, Gemini 2.5 Pro) to turn discussion into next steps.</Callout>

## ${WHAT}
- **Boost**: ${B_BOOST}
- **Counter**: ${B_COUNTER}
- **Top Issue**: ${B_TOP}
- **Thinking modes**: Logical / Critical / Lateral

## ${HOW}
${STEPS}

## ${SAMPLE}
- Topic: “Solar Chill” (summer blend)
- Risk: 15% say “too sour”

**Boost:** pilot 10 stores; measure 7-day re-order  
**Counter:** add “mild sweet” option; A/B syrup level  
**Top Issue:** widen appeal without losing distinctiveness  
**Logical:** ${B_LOGICAL}  
**Critical:** ${B_CRITICAL}  
**Lateral:** ${B_LATERAL}

---

*${AVAIL}*
MDX
  echo "$FILE"
}

for L in "${LOCALES[@]}"; do
  write_mdx "$L"
done
