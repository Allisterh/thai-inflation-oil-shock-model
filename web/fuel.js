/* Oil Fund and pump-price tracker. Every figure comes from data/fuel.json, which the pipeline writes
   from EPPO's price structure, EPPO Table 7 and the Oil Fuel Fund Office's weekly sheet. */
(function () {
  "use strict";
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ", navHome: "คำนวณของคุณ", navPredict: "คาดการณ์รายเดือน", navFuel: "กองทุนน้ำมัน", navMethod: "ทำไมถึงเชื่อถือได้", navAdvanced: "กราฟและรายละเอียด",
      title: "น้ำมันหนึ่งลิตร เงินไปอยู่ที่ใคร และกองทุนน้ำมันช่วยคุณอยู่เท่าไร",
      lede: "ทุกวัน กระทรวงพลังงานประกาศว่าราคาน้ำมันแต่ละลิตรประกอบด้วยอะไรบ้าง หน้านี้เอาตัวเลขนั้นมากางให้ดู ว่าเท่าไรเป็นเนื้อน้ำมัน เท่าไรเป็นภาษี กองทุนน้ำมันกำลังช่วยจ่ายหรือเก็บเพิ่มกี่บาท และถ้าไม่มีกองทุน คุณจะจ่ายเท่าไร ทุกตัวเลขเป็นของทางการหรือบวกลบจากตัวเลขทางการเท่านั้น",
      backSimple: "กลับไปคำนวณของคุณ", toMethod: "ทำไมถึงเชื่อถือได้", toEppo: "โครงสร้างราคาน้ำมันของ สนพ.", toOffo: "ฐานะกองทุนน้ำมัน (สกนช.)",
      asOf: (d) => `อัปเดตล่าสุด ${d}`, foot: (d) => `ข้อมูล: สนพ. กระทรวงพลังงาน (โครงสร้างราคา ตาราง 7) สำนักงานกองทุนน้ำมันเชื้อเพลิง อัปเดต ${d}`,
      fuel: { gasohol95: "แก๊สโซฮอล์ 95", gasohol91: "แก๊สโซฮอล์ 91", gasohol_e20: "แก๊สโซฮอล์ E20", gasohol_e85: "แก๊สโซฮอล์ E85", diesel_b7: "ดีเซล B7", ulg95_premium: "เบนซิน 95 (พรีเมียม)" },
      s1: "หนึ่งลิตรจ่ายให้ใครบ้าง", s1k: "โครงสร้างราคาวันนี้",
      s1p: (d) => `โครงสร้างราคาขายปลีกในกรุงเทพฯ ของ สนพ. ณ วันที่ ${d.date} หน่วยเป็นบาทต่อลิตร แท่งที่ยื่นไปทางซ้ายของเส้นศูนย์คือส่วนที่ "ลด" ราคา เช่น เงินอุดหนุนจากกองทุนน้ำมัน ทุกส่วนบวกกันแล้วเท่ากับราคาหน้าปั๊มของ สนพ. พอดี (เราตรวจทุกวัน)`,
      keys: { refinery: "เนื้อน้ำมัน (ราคา ณ โรงกลั่น)", discount: "ส่วนลดราคา ณ โรงกลั่น (มาตรการรัฐ)", tax: "ภาษีสรรพสามิตและภาษีเทศบาล", oil_fund: "กองทุนน้ำมัน (ลบ = อุดหนุน)", conservation_fund: "กองทุนอนุรักษ์พลังงาน", marketing: "ค่าการตลาด", vat: "ภาษีมูลค่าเพิ่ม 7%" },
      checkFail: "ตัวเลขของเชื้อเพลิงนี้บวกกันไม่ตรงกับราคาของ สนพ. วันนี้ จึงไม่แสดงราคาที่คำนวณต่อ",
      s2: "ถ้าไม่มีกองทุนน้ำมัน คุณจะจ่ายเท่าไร", s2k: "คิดจากโครงสร้างราคา",
      s2p: "เงินกองทุนน้ำมันอยู่ในราคาขายส่ง ซึ่งถูกคิดภาษีมูลค่าเพิ่ม 7% อีกชั้น ดังนั้นถ้าเอากองทุนออก ราคาจะเปลี่ยนเท่ากับเงินกองทุนคูณ 1.07 สำหรับดีเซล รัฐยังให้โรงกลั่นลดราคา ณ โรงกลั่นอีกต่างหาก เราจึงแสดงอีกตัวเลขคือราคาถ้าไม่มีมาตรการช่วยเหลือของรัฐเลย",
      th: { fuel: "เชื้อเพลิง", retail: "ราคาหน้าปั๊ม", fund: "กองทุนน้ำมัน บาท/ลิตร", nofund: "ถ้าไม่มีกองทุน", discount: "ส่วนลดโรงกลั่น", nosupport: "ถ้าไม่มีมาตรการรัฐเลย", crude: "เนื้อน้ำมันคิดเป็น" },
      sub: "ช่วยจ่าย", col: "เก็บเพิ่ม",
      discTitle: "ส่วนลดราคา ณ โรงกลั่น คืออะไร",
      discP: (d) => `ในโครงสร้างราคาของ สนพ. มีช่อง DISCOUNT ซึ่งหัวตารางภาษาไทยของ สนพ. เองเรียกว่า "${d.label}" ปัจจุบันมีเฉพาะดีเซล ${d.note} เราจึงนับเป็นมาตรการของรัฐ และแสดงราคา "ถ้าไม่มีมาตรการรัฐเลย" แยกต่างหาก`,
      s3: "กองทุนน้ำมันเก็บหรือช่วยมาตลอด 25 ปี", s3k: "ประวัติอัตราเงินกองทุน",
      s3p: (d) => `อัตราเงินกองทุนน้ำมันรายเดือนตั้งแต่ปี 2544 จาก สนพ. ตาราง 7 (ข้อมูลถึง${d.last}) ค่าลบคือช่วงที่กองทุนช่วยจ่าย (แรเงา) ค่าบวกคือช่วงที่เก็บเงินเข้ากองทุน จุดสีคือค่าของวันนี้จากโครงสร้างราคา`,
      chartY: "บาทต่อลิตร", today: (d) => `วันนี้ ${d}`,
      s4: "ฐานะกองทุนน้ำมัน", s4k: "จากสำนักงานกองทุนน้ำมันเชื้อเพลิง (สกนช.)",
      asOfFund: (d) => `ณ วันที่ ${d}`, fundTotal: "ฐานะสุทธิรวม", fundOil: "บัญชีน้ำมัน", fundLpg: "บัญชีก๊าซหุงต้ม (LPG)", mb: "ล้านบาท",
      fundBorrow: (d) => `ในจำนวนนี้เป็นเงินกู้ยืม ${d} ล้านบาท`,
      fundP: "ตัวเลขนี้มาจากรายงาน \"ประมาณการฐานะกองทุนน้ำมันเชื้อเพลิง\" ที่ สกนช. เผยแพร่ทุกสัปดาห์ เราอ่านจากไฟล์ของ สกนช. โดยตรง ไม่ได้ประมาณเอง ติดลบหมายถึงกองทุนเป็นหนี้ (จ่ายเงินชดเชยมากกว่าเงินที่เก็บได้) ซึ่งสุดท้ายต้องเก็บคืนจากผู้ใช้น้ำมันในอนาคต",
      fundCached: (d) => `ดึงข้อมูลจาก สกนช. ไม่สำเร็จในรอบล่าสุด แสดงรายงานล่าสุดที่มี (${d})`,
      fundChart: "ฐานะสุทธิรายสัปดาห์ (ล้านบาท)", fundNone: "ยังไม่มีข้อมูลฐานะกองทุน",
      s5: "ทำไมน้ำมันดิบขึ้น 10% แต่หน้าปั๊มขึ้นแค่ครึ่งเดียว", s5k: "อธิบายสั้น ๆ",
      s5p: (d) => `
<p>เนื้อน้ำมัน (ราคา ณ โรงกลั่น) เป็นเพียงส่วนหนึ่งของราคาหน้าปั๊ม วันนี้คิดเป็น ${d.share} ของราคาแก๊สโซฮอล์ 95 ที่เหลือคือภาษีสรรพสามิต ภาษีเทศบาล เงินกองทุน และค่าการตลาด ซึ่งกำหนดเป็นบาทต่อลิตรคงที่ ไม่ได้ขึ้นลงตามน้ำมันดิบ เมื่อน้ำมันดิบแพงขึ้น 10% ราคาหน้าปั๊มจึงขยับประมาณครึ่งหนึ่งถึงสองในสามของนั้น แม้ไม่มีการอุดหนุนเลย</p>
<p>กองทุนน้ำมันทำหน้าที่อีกอย่าง คือปรับอัตราเงินกองทุนเพื่อชะลอการเปลี่ยนแปลง ช่วงน้ำมันแพงกองทุนลดอัตราหรือติดลบเพื่อให้ราคาขึ้นช้าลง แล้วเก็บเงินคืนทีหลังเมื่อน้ำมันถูกลง ดังนั้นสิ่งที่กองทุนทำคือ "เกลี่ยเวลา" ไม่ใช่ทำให้ของฟรี เงินที่ช่วยจ่ายวันนี้คือหนี้ที่ผู้ใช้น้ำมันจ่ายคืนภายหลัง ตามที่เห็นในฐานะกองทุนด้านบน</p>`,
      volNote: "เราไม่ได้ประมาณว่ากองทุนจ่ายเงินอุดหนุนเดือนละเท่าไร เพราะไม่พบข้อมูลปริมาณการใช้น้ำมันรายเดือนแยกชนิดจากทางการที่ดาวน์โหลดได้สม่ำเสมอ",
      loadError: "โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง",
    },
    en: {
      brand: "Oil and the cost of living", navHome: "Your calculation", navPredict: "Monthly prediction", navFuel: "Oil Fund", navMethod: "Why trust it", navAdvanced: "Charts and details",
      title: "One litre of fuel: where the money goes, and how much the Oil Fund is helping you",
      lede: "Every day the Energy Ministry publishes what each litre of fuel is made of. This page lays those numbers out: how much is the fuel itself, how much is tax, how much the Oil Fund is paying for you or charging you, and what you would pay without it. Every figure is official, or simple arithmetic on official figures.",
      backSimple: "Back to your calculation", toMethod: "Why trust it", toEppo: "EPPO's price structure", toOffo: "Fund position (Oil Fuel Fund Office)",
      asOf: (d) => `Updated ${d}`, foot: (d) => `Sources: EPPO, Ministry of Energy (price structure, Table 7); Oil Fuel Fund Office. Updated ${d}`,
      fuel: { gasohol95: "Gasohol 95", gasohol91: "Gasohol 91", gasohol_e20: "Gasohol E20", gasohol_e85: "Gasohol E85", diesel_b7: "Diesel B7", ulg95_premium: "Benzine 95 (premium)" },
      s1: "Where each baht of a litre goes", s1k: "Today's price structure",
      s1p: (d) => `EPPO's Bangkok retail price structure for ${d.date}, in baht per litre. Bars to the left of the zero line reduce the price, such as an Oil Fund subsidy. The parts add up exactly to EPPO's pump price (we check this every day).`,
      keys: { refinery: "Fuel itself (ex-refinery price)", discount: "Refinery price discount (government measure)", tax: "Excise and municipal tax", oil_fund: "Oil Fund (negative = subsidy)", conservation_fund: "Energy conservation fund", marketing: "Marketing margin", vat: "VAT 7%" },
      checkFail: "This fuel's parts do not add up to EPPO's price today, so no derived prices are shown for it.",
      s2: "What you would pay without the Oil Fund", s2k: "From the price structure",
      s2p: "The Oil Fund levy sits inside the wholesale price, on which 7% VAT is charged, so removing the levy changes the price by the levy times 1.07. For diesel the government also has refiners discount the refinery price, so a second figure shows the price with no government support at all.",
      th: { fuel: "Fuel", retail: "Pump price", fund: "Oil Fund, baht/litre", nofund: "Without the Oil Fund", discount: "Refinery discount", nosupport: "Without any government support", crude: "Fuel itself is" },
      sub: "paying", col: "charging",
      discTitle: "What the refinery discount is",
      discP: (d) => `EPPO's structure has a DISCOUNT column, which the Thai header in EPPO's own spreadsheet calls "${d.label}" (${d.labelEn}). Today it applies to diesel only. ${d.note} We therefore count it as a government measure and show a separate "without any government support" price.`,
      s3: "Twenty-five years of the Oil Fund charging and paying", s3k: "Levy history",
      s3p: (d) => `Monthly Oil Fund levy since 2001 from EPPO Table 7 (data to ${d.last}). Negative values are months when the Fund was paying (shaded); positive values are months when it was collecting. The dot is today's value from the price structure.`,
      chartY: "baht per litre", today: (d) => `today ${d}`,
      s4: "The Fund's financial position", s4k: "From the Oil Fuel Fund Office",
      asOfFund: (d) => `as of ${d}`, fundTotal: "Net position, total", fundOil: "Oil account", fundLpg: "LPG (cooking gas) account", mb: "million baht",
      fundBorrow: (d) => `of which borrowings: ${d} million baht`,
      fundP: "These figures come from the weekly \"estimated fund position\" sheet the Oil Fuel Fund Office publishes. We read the office's own file; nothing is estimated. A negative position means the Fund owes money (it has paid out more in subsidies than it has collected), which fuel users repay later.",
      fundCached: (d) => `The latest fetch from the office failed; showing the last sheet we have (${d}).`,
      fundChart: "Weekly net position (million baht)", fundNone: "No fund position data yet.",
      s5: "Why a 10% rise in crude moves pump prices by only about half that", s5k: "The short explanation",
      s5p: (d) => `
<p>The fuel itself (the ex-refinery price) is only part of the pump price: today it is ${d.share} of gasohol 95. The rest is excise, municipal tax, fund levies and the marketing margin, all set as fixed baht amounts per litre that do not move with crude. So when crude rises 10%, the pump price moves by roughly half to two-thirds of that, even with no subsidy at all.</p>
<p>The Oil Fund does something different: it adjusts its levy to slow price changes. When oil is expensive it lowers the levy or pays out, so prices rise more slowly, and it charges the money back later when oil is cheaper. It spreads the change over time; it does not make anything free. Today's support is a debt that fuel users repay later, which is what the Fund position above shows.</p>`,
      volNote: "We do not estimate how much the Fund pays out each month, because no official monthly sales volume by fuel with a stable download was found.",
      loadError: "Could not load the data. Please try again.",
    },
  };
  let lang = "th";
  try { lang = localStorage.getItem("lang") || "th"; } catch (e) {}
  const t = (k, ...a) => { const v = T[lang][k]; return typeof v === "function" ? v(...a) : (v ?? k); };
  const $ = (id) => document.getElementById(id);
  const num = (x, d = 2) => (x == null || isNaN(x)) ? "–" : new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
  const signed = (x, d = 2) => (x == null || isNaN(x)) ? "–" : (x > 0 ? "+" : x < 0 ? "−" : "") + num(Math.abs(x), d);
  const TH_M = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const EN_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mLabel = (m) => { if (!m) return "–"; const [y, mo] = m.slice(0, 7).split("-").map(Number); return lang === "th" ? `${TH_M[mo - 1]} ${y + 543}` : `${EN_M[mo - 1]} ${y}`; };
  const dateLabel = (d) => { if (!d) return "–"; const [y, mo, da] = d.slice(0, 10).split("-").map(Number); return lang === "th" ? `${da} ${TH_M[mo - 1]} ${y + 543}` : `${da} ${EN_M[mo - 1]} ${y}`; };
  const yLabel = (m) => { const y = Number(m.slice(0, 4)); return lang === "th" ? String(y + 543) : String(y); };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const esc = (s) => String(s).replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[ch]));
  const FUELS = ["gasohol95", "gasohol91", "gasohol_e20", "gasohol_e85", "diesel_b7", "ulg95_premium"];
  const PARTS = ["refinery", "discount", "tax", "oil_fund", "conservation_fund", "marketing", "vat"];
  const COLORS = () => ({ refinery: css("--ink") || "#17201b", discount: "#b8860b", tax: css("--muted") || "#848c86", oil_fund: css("--accent") || "#0f5b4b", conservation_fund: "#6b8e7a", marketing: "#9aa39c", vat: "#c9cfc9" });
  let D = null; let levyFuel = "diesel_b7";

  // ---- stacked per-litre bar: positive parts to the right of zero, negative parts to the left, same scale for every fuel
  function stackSvg(parts, scaleMax, scaleMin) {
    const W = 600, H = 26, col = COLORS();
    const span = scaleMax - scaleMin; const X = (v) => (v - scaleMin) / span * W;
    let pos = 0, neg = 0, g = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">`;
    PARTS.forEach((k) => {
      const v = parts[k] || 0; if (!v) return;
      if (v > 0) { g += `<rect x="${X(pos)}" y="2" width="${X(pos + v) - X(pos)}" height="22" fill="${col[k]}"><title>${t("keys")[k]}: ${num(v)}</title></rect>`; pos += v; }
      else { g += `<rect x="${X(neg + v)}" y="2" width="${X(neg) - X(neg + v)}" height="22" fill="${col[k]}" opacity=".85"><title>${t("keys")[k]}: ${num(v)}</title></rect>`; neg += v; }
    });
    g += `<line x1="${X(0)}" x2="${X(0)}" y1="0" y2="${H}" stroke="${css("--ink") || "#000"}" stroke-width="1.2"/></svg>`;
    return g;
  }

  function lineChart(el, { title, series, band, xTicks, yLabel, legend, caption, marker, W = 720, H = 280 }) {
    const P = { l: 46, r: 14, t: 26, b: 36 };
    const xs = series.flatMap((s) => s.pts.map((p) => p[0])), ys = series.flatMap((s) => s.pts.map((p) => p[1]));
    const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys); const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad;
    const X = (x) => P.l + (x - x0) / (x1 - x0 || 1) * (W - P.l - P.r), Y = (y) => P.t + (y1 - y) / (y1 - y0) * (H - P.t - P.b);
    const range = y1 - y0; const step = range > 60000 ? 20000 : range > 20000 ? 10000 : range > 8 ? 2 : range > 4 ? 1 : 0.5; const yt = []; for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) yt.push(+v.toFixed(2));
    const ink = css("--ink") || "#17201b", grid = css("--grid") || "#ddd", muted = css("--ink-2") || "#666";
    let g = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}"><text x="${P.l}" y="16" font-size="13" font-weight="600" fill="${ink}">${title}</text>`;
    if (band) band.forEach(([a, b]) => { g += `<rect x="${X(a)}" y="${Y(0)}" width="${Math.max(1, X(b) - X(a))}" height="${Y(y0) - Y(0)}" fill="${band.color || "#9b2f20"}" opacity=".10"/>`; });
    yt.forEach((v) => { g += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? ink : grid}" stroke-width="${v === 0 ? 1 : 0.6}"/><text x="${P.l - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="${muted}">${num(v, step < 1 ? 1 : 0)}</text>`; });
    xTicks.forEach(([x, lab]) => { g += `<text x="${X(x)}" y="${H - P.b + 16}" font-size="11" text-anchor="middle" fill="${muted}">${lab}</text>`; });
    series.forEach((s) => { g += `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" stroke-linejoin="round" points="${s.pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")}"/>`; });
    if (marker) g += `<circle cx="${X(marker[0])}" cy="${Y(marker[1])}" r="4.5" fill="${marker[2]}" stroke="${css("--page") || "#fff"}" stroke-width="1.5"/><text x="${X(marker[0]) - 8}" y="${Y(marker[1]) - 9}" font-size="11" text-anchor="end" fill="${ink}">${marker[3]}</text>`;
    g += `</svg>`;
    el.innerHTML = g + `<div class="legend">${legend.map((l) => `<span><i style="background:${l[0]}"></i>${l[1]}</span>`).join("")}<span>${yLabel}</span></div><figcaption>${caption}</figcaption>`;
  }

  function render() {
    document.documentElement.lang = lang; document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $("langToggle").textContent = lang === "th" ? "EN" : "ไทย";
    if (!D) return;
    const S = D.structure, fuels = S.fuels || {}, names = T[lang].fuel, keys = t("keys"), col = COLORS();
    const present = FUELS.filter((f) => fuels[f]);
    const maxPos = Math.max(1, ...present.map((f) => PARTS.reduce((a, k) => a + Math.max(0, fuels[f].parts[k] || 0), 0)));
    const minNeg = Math.min(0, ...present.map((f) => PARTS.reduce((a, k) => a + Math.min(0, fuels[f].parts[k] || 0), 0)));
    // 1. stacked bars
    let s1 = `<h2><small>${t("s1k")}</small>${t("s1")}</h2><p>${t("s1p", { date: dateLabel(S.date) })}</p>`;
    if (S.from_cache) s1 += `<p class="warn">${lang === "th" ? "ดึงข้อมูลจาก สนพ. ไม่สำเร็จในรอบล่าสุด แสดงโครงสร้างราคาล่าสุดที่มี" : "The latest fetch from EPPO failed; showing the last structure we have"} (${dateLabel(S.date)}).</p>`;
    s1 += `<div class="stack">` + present.map((f) => { const b = fuels[f];
      return `<div class="row"><span class="name">${names[f]}<small>${lang === "th" ? "กองทุน" : "Fund"} ${signed(b.oil_fund)}${b.discount ? ` · ${lang === "th" ? "ส่วนลด" : "discount"} ${signed(b.discount)}` : ""}</small></span>${stackSvg(b.parts, maxPos, minNeg)}<span class="price">${num(b.retail)}</span></div>`; }).join("") + `</div>`;
    s1 += `<div class="keys">${PARTS.map((k) => `<span><i style="background:${col[k]}"></i>${keys[k]}</span>`).join("")}</div>`;
    s1 += `<p class="srcline">${S.source} · ${dateLabel(S.date)}${S.all_checks_ok ? "" : ` · <span class="warn">${t("checkFail")}</span>`}</p>`;
    // 2. without the fund
    let s2 = `<h2><small>${t("s2k")}</small>${t("s2")}</h2><p>${t("s2p")}</p>`;
    const th = t("th");
    s2 += `<table class="t"><thead><tr><th>${th.fuel}</th><th>${th.retail}</th><th>${th.fund}</th><th>${th.nofund}</th><th>${th.discount}</th><th>${th.nosupport}</th><th>${th.crude}</th></tr></thead><tbody>` +
      present.map((f) => { const b = fuels[f]; if (!b.checks_ok) return `<tr><td>${names[f]}</td><td>${num(b.retail)}</td><td colspan="5" class="warn">${t("checkFail")}</td></tr>`;
        return `<tr><td>${names[f]}</td><td>${num(b.retail)}</td><td class="${b.oil_fund < 0 ? "sub" : "col"}">${signed(b.oil_fund)} <small>(${b.oil_fund < 0 ? t("sub") : t("col")})</small></td><td>${num(b.without_oil_fund)}</td><td>${b.discount ? signed(b.discount) : "–"}</td><td>${b.without_support != null ? num(b.without_support) : "–"}</td><td>${b.crude_share_pct != null ? num(b.crude_share_pct, 0) + "%" : "–"}</td></tr>`; }).join("") + `</tbody></table>`;
    s2 += `<p class="srcline">${lang === "th" ? "คำนวณจากโครงสร้างราคาของ สนพ." : "Computed from EPPO's price structure"} · ${dateLabel(S.date)} · ${lang === "th" ? "ภาษีมูลค่าเพิ่ม" : "VAT"} ${num(100 * S.vat_rate, 0)}%</p>`;
    const dm = D.discount || {};
    s2 += `<h2>${t("discTitle")}</h2><p>${t("discP", { label: dm.label_th, labelEn: dm.label_en, note: lang === "th" ? dm.note_th : dm.note_en })}</p><p class="srcline">${lang === "th" ? "ที่มาของป้ายชื่อ" : "Label source"}: ${esc(dm.label_source || "")}. ${(dm.sources || []).map((u) => `<a href="${u}">${u.replace(/^https?:\/\//, "").split("/")[0]}</a>`).join(" · ")}</p>`;
    // 3. levy history
    const L = D.levy || { months: [], series: {} };
    let s3 = `<h2><small>${t("s3k")}</small>${t("s3")}</h2><p>${t("s3p", { last: mLabel(L.last_month) })}</p><div class="seg" id="levyChips"></div><figure id="figLevy"></figure>`;
    if (D.levy_status && D.levy_status.from_cache) s3 += `<p class="warn">${lang === "th" ? "ดึงตาราง 7 จาก สนพ. ไม่สำเร็จในรอบล่าสุด แสดงข้อมูลล่าสุดที่มี" : "The latest fetch of EPPO Table 7 failed; showing the last data we have"} (${mLabel(L.last_month)}).</p>`;
    // 4. fund position
    const F = D.fund; let s4 = `<h2><small>${t("s4k")}</small>${t("s4")}</h2>`;
    if (F && F.total != null) {
      s4 += `<p class="asof">${t("asOfFund", dateLabel(F.date))}</p>`;
      if (F.from_cache) s4 += `<p class="warn">${t("fundCached", dateLabel(F.date))}</p>`;
      s4 += `<div class="fund"><div><span class="v ${F.total < 0 ? "up" : ""}">${signed(F.total, 0)}</span><span class="l">${t("fundTotal")}, ${t("mb")}${F.borrowings && F.borrowings.total ? `<br>${t("fundBorrow", num(F.borrowings.total, 0))}` : ""}</span></div><div><span class="v">${signed(F.oil, 0)}</span><span class="l">${t("fundOil")}, ${t("mb")}</span></div><div><span class="v">${signed(F.lpg, 0)}</span><span class="l">${t("fundLpg")}, ${t("mb")}</span></div></div>`;
      s4 += `<p>${t("fundP")}</p><figure id="figFund"></figure>`;
      s4 += `<p class="srcline">${lang === "th" ? "ที่มา" : "Source"}: <a href="${F.source_url || F.page_url || "#"}">${esc(lang === "th" ? "ประมาณการฐานะกองทุนน้ำมันเชื้อเพลิง สกนช." : "Oil Fuel Fund Office, estimated fund position")}</a> · ${dateLabel(F.date)}</p>`;
    } else { s4 += `<p class="warn">${t("fundNone")}</p>`; }
    // 5. explanation
    const g95 = fuels.gasohol95; const share = g95 && g95.crude_share_pct != null ? num(g95.crude_share_pct, 0) + "%" : "–";
    const s5 = `<h2><small>${t("s5k")}</small>${t("s5")}</h2>${t("s5p", { share })}<p class="srcline">${t("volNote")}</p>`;
    $("prose").innerHTML = s1 + s2 + s3 + s4 + s5;
    // levy chart with fuel selector
    const chips = $("levyChips");
    FUELS.filter((f) => L.series[f]).forEach((f) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = names[f]; b.setAttribute("aria-pressed", String(f === levyFuel)); b.addEventListener("click", () => { levyFuel = f; render(); }); chips.appendChild(b); });
    const ser = L.series[levyFuel] || []; const pts = []; L.months.forEach((m, i) => { if (ser[i] != null) pts.push([i, ser[i]]); });
    if (pts.length) {
      const band = []; let start = null; L.months.forEach((m, i) => { const v = ser[i]; if (v != null && v < 0) { if (start == null) start = i; } else if (start != null) { band.push([start, i]); start = null; } }); if (start != null) band.push([start, L.months.length - 1]);
      band.color = css("--up") || "#9b2f20";
      const ticks = L.months.map((m, i) => [i, m]).filter(([i, m]) => i > 12 && m.endsWith("-01") && Number(m.slice(0, 4)) % 3 === 0).map(([i, m]) => [i, yLabel(m)]);
      const todayV = fuels[levyFuel] ? fuels[levyFuel].oil_fund : null;
      lineChart($("figLevy"), { title: names[levyFuel], series: [{ pts, color: css("--accent") || "#0f5b4b", width: 1.8 }], band, xTicks: ticks, yLabel: t("chartY"),
        legend: [[css("--accent") || "#0f5b4b", lang === "th" ? "อัตราเงินกองทุนรายเดือน" : "Monthly levy"], [band.color, lang === "th" ? "ช่วงที่กองทุนช่วยจ่าย" : "Fund paying (subsidy)"]],
        caption: `${esc(L.source || "")}`, marker: todayV != null ? [L.months.length - 1 + 1.5, todayV, css("--up") || "#9b2f20", t("today", signed(todayV))] : null });
    }
    // fund history chart
    if (F && F.history && F.history.length > 1) {
      const h = F.history; const ink = css("--ink") || "#17201b", accent = css("--accent") || "#0f5b4b", up = css("--up") || "#9b2f20";
      const ticks = h.map((r, i) => [i, r.date]).filter((_, i) => i % Math.max(1, Math.floor(h.length / 6)) === 0).map(([i, d]) => [i, (lang === "th" ? `${Number(d.slice(8, 10))} ${TH_M[Number(d.slice(5, 7)) - 1].slice(0, 3)}` : `${Number(d.slice(8, 10))} ${EN_M[Number(d.slice(5, 7)) - 1].slice(0, 3)}`)]);
      lineChart($("figFund"), { title: t("fundChart"), series: [{ pts: h.map((r, i) => [i, r.total]), color: ink, width: 2.2 }, { pts: h.map((r, i) => [i, r.oil]), color: accent, width: 1.6 }, { pts: h.map((r, i) => [i, r.lpg]), color: up, width: 1.6 }],
        xTicks: ticks, yLabel: t("mb"), legend: [[ink, t("fundTotal")], [accent, t("fundOil")], [up, t("fundLpg")]], caption: `${lang === "th" ? "รายงานรายสัปดาห์ของ สกนช. ตั้งแต่" : "Weekly sheets from the Oil Fuel Fund Office since"} ${dateLabel(h[0].date)}` });
    }
    $("dateline").textContent = t("asOf", dateLabel((D.generated_at || "").slice(0, 10)));
    $("footSources").textContent = t("foot", (D.generated_at || "").slice(0, 10));
  }
  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} render(); });
  render();
  fetch("data/fuel.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => { D = d; render(); })
    .catch((err) => { console.error(err); const p = document.createElement("p"); p.className = "muted"; p.textContent = t("loadError"); document.querySelector("main").prepend(p); });
})();
