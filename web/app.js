/* Thai oil-shock → cost of living. Plain JS, no build step.
   Reads data/latest.json written by `python -m thai_oil_cpi run`. */
(function () {
  "use strict";

  // ---------------------------------------------------------------- i18n
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ",
      h1: "ราคาน้ำมันโลกวันนี้ จะมาถึงกระเป๋าเงินคุณเมื่อไร และเท่าไร",
      lede: "หน้านี้ดึงราคาน้ำมันดิบเบรนท์ทุกวัน แล้วใช้แบบจำลองที่ประมาณจากข้อมูลไทยปี 2017 ถึงปัจจุบัน บอกว่าการเปลี่ยนแปลงของราคาน้ำมันจะดันเงินเฟ้อไทยขึ้นกี่จุด ในอีกกี่เดือน และหมายถึงเงินกี่บาทต่อเดือนสำหรับครอบครัวของคุณ",
      boardTitle: "กระดานราคาวันนี้", tileBrent: "น้ำมันดิบเบรนท์", unitUsdBbl: "ดอลลาร์ต่อบาร์เรล",
      tileCrudeThb: "ต้นทุนน้ำมันดิบ", unitThbL: "บาทต่อลิตร", tileFx: "ค่าเงิน", unitThbUsd: "บาทต่อดอลลาร์",
      tileShock: "เทียบกับไตรมาสก่อน", shockUnitQtd: "เฉลี่ยไตรมาสนี้จนถึงวันนี้",
      boardNote: (d) => `ราคาปิดล่าสุด ${d.date} ไตรมาสก่อน (${d.prevQ}) เฉลี่ย ${d.prevAvg} ดอลลาร์ ไตรมาสนี้ผ่านไป ${d.days} วันทำการ เฉลี่ย ${d.qtdAvg} ดอลลาร์ ถ้าราคาวันนี้คงอยู่ทั้งไตรมาส จะเท่ากับช็อก ${d.spot}`,
      calcTitle: "สำหรับครอบครัวของคุณ", spendLabel: "ค่าใช้จ่ายครัวเรือนต่อเดือน (บาท)",
      basisLegend: "ใช้ราคาน้ำมันแบบไหน", basisQtd: "ราคาเฉลี่ยไตรมาสนี้จนถึงวันนี้", basisSpot: "ถ้าราคาวันนี้คงอยู่ทั้งไตรมาส", basisCustom: "กำหนดเอง",
      advanced: "ตัวเลือกเพิ่มเติม", curUsd: "วัดช็อกน้ำมันเป็นดอลลาร์ (ตามแบบจำลองหลัก)", curThb: "วัดช็อกน้ำมันเป็นบาท (รวมผลค่าเงิน)",
      ansPeak: "ช่วงที่หนักที่สุด คุณจะจ่ายเพิ่มประมาณ", perMonth: "บาทต่อเดือน", ansYear: "รวม 12 เดือนข้างหน้า", baht: "บาท",
      ansInfl: "เงินเฟ้อจะสูงขึ้นกว่าที่ควรจะเป็น", pp: "จุดเปอร์เซ็นต์",
      inQuarter: (q) => `ในช่วง ${q}`, range: (a, b) => `ช่วงที่เป็นไปได้ ${a} ถึง ${b} บาท`,
      pathTitle: "ผลต่อเงินเฟ้อไทยในอีก 8 ไตรมาสข้างหน้า (จุดเปอร์เซ็นต์ของอัตราเงินเฟ้อเทียบปีก่อน)",
      pathSubObserved: (s) => `รวมผลจากการเปลี่ยนแปลงราคาน้ำมันที่เกิดขึ้นแล้วใน 8 ไตรมาสล่าสุด รวมไตรมาสนี้ (${s})`,
      pathSubCustom: (s) => `ถ้าราคาน้ำมันเปลี่ยน ${s} ในไตรมาสนี้ครั้งเดียว`,
      tableView: "ดูเป็นตาราง", quarter: "ไตรมาส", impact: "ผลต่อเงินเฟ้อ (จุด)", low: "ต่ำสุด", high: "สูงสุด", extra: "จ่ายเพิ่ม (บาท/เดือน)",
      pumpTitle: "ที่ปั๊มน้ำมัน",
      pumpIntro: "ภาษี เงินกองทุนน้ำมัน และค่าการตลาดคิดเป็นบาทต่อลิตรค่อนข้างคงที่ ดังนั้นราคาหน้าปั๊มมักขยับตามต้นทุนน้ำมันดิบต่อลิตร ใส่ราคาที่คุณเห็นวันนี้ แล้วดูว่าถ้าเบรนท์เปลี่ยนไปเท่ากับช็อกที่เลือกไว้ข้างบน จะหมายถึงกี่บาทต่อลิตร",
      pumpPrice: "ราคาหน้าปั๊มวันนี้ (บาทต่อลิตร)", pumpPass: "สัดส่วนที่ส่งผ่านถึงหน้าปั๊ม",
      passGasohol: "แก๊สโซฮอล์ ส่งผ่านเต็มที่ (100%)", passDiesel: "ดีเซล กองทุนน้ำมันช่วยพยุงครึ่งหนึ่ง (50%)", passCapped: "ตรึงราคาเกือบทั้งหมด (25%)",
      pumpResult: "ราคาหน้าปั๊มโดยประมาณ", thbL: "บาทต่อลิตร",
      pumpDelta: (d) => `เบรนท์ ${d.pct} จาก ${d.from} เป็น ${d.to} ดอลลาร์ ต้นทุนน้ำมันดิบเปลี่ยน ${d.crude} บาทต่อลิตร หน้าปั๊มเปลี่ยน ${d.pump} บาทต่อลิตร`,
      oilTitle: "ราคาน้ำมันดิบเบรนท์", brentChartTitle: "ราคาปิดรายวัน ดอลลาร์ต่อบาร์เรล",
      d1w: "1 สัปดาห์", d1m: "1 เดือน", d3m: "3 เดือน", d1y: "1 ปี",
      modelTitle: "แบบจำลองบอกอะไร",
      modelSummary: (m) => `ประมาณด้วยวิธี local projections จากข้อมูลรายไตรมาส ${m.first} ถึง ${m.last} (${m.n} ไตรมาส) น้ำมันแพงขึ้น 10% ทำให้เงินเฟ้อเทียบปีก่อนสูงขึ้นประมาณ ${m.q1} จุดในไตรมาสถัดไป และสูงสุด ${m.peak} จุดในไตรมาสที่ ${m.peakH} ผลค่อยๆ หายไปภายในสองปี แบบจำลองประมาณใหม่ทุกครั้งที่ข้อมูลอัปเดต`,
      irfTitle: "ถ้าน้ำมันแพงขึ้น 10% เงินเฟ้อเปลี่ยนกี่จุดในแต่ละไตรมาสถัดไป", irfSub: "เส้นคือค่าประมาณ แถบคือช่วงความเชื่อมั่น 95%",
      histTitle: "ข้อมูลที่ใช้ประมาณ: เงินเฟ้อไทยและการเปลี่ยนแปลงราคาน้ำมันรายไตรมาส",
      cpiLegend: "เงินเฟ้อไทย เทียบปีก่อน (%)", shockLegend: "การเปลี่ยนแปลงราคาเบรนท์จากไตรมาสก่อน (%)",
      horizon: (h) => `ไตรมาสที่ ${h}`,
      aboutTitle: "วิธีคิดและข้อจำกัด",
      aboutBody: `<p>แบบจำลองวัดว่าในอดีต เมื่อราคาน้ำมันดิบเบรนท์เฉลี่ยรายไตรมาสเปลี่ยนไป 1% อัตราเงินเฟ้อทั่วไปของไทย (ดัชนีราคาผู้บริโภคเทียบปีก่อน) เปลี่ยนไปกี่จุดในแต่ละไตรมาสถัดไป โดยควบคุมเงินเฟ้อและช็อกน้ำมันย้อนหลัง 4 ไตรมาส (Jordà 2005, ค่าคลาดเคลื่อนมาตรฐานแบบ Newey–West) ตัวเลขในหน้านี้คือค่าประมาณนั้นคูณกับการเปลี่ยนแปลงของราคาน้ำมันที่เกิดขึ้นจริงหรือที่คุณกำหนด</p>
<p>ข้อควรรู้</p><ul>
<li>เป็นความสัมพันธ์ทางสถิติจากอดีต ไม่ใช่คำพยากรณ์ และไม่รวมผลของนโยบาย เช่น การตรึงราคาดีเซล ค่าไฟ หรือดอกเบี้ย ซึ่งอาจทำให้ผลจริงเล็กกว่าหรือช้ากว่านี้</li>
<li>ข้อมูลประมาณมีราว 30 ไตรมาส ช่วงความเชื่อมั่นจึงกว้าง และสมมติว่าผลเป็นเส้นตรง ช็อกใหญ่มากอาจไม่เป็นไปตามนี้</li>
<li>ค่าใช้จ่ายที่เพิ่มคิดจากค่าใช้จ่ายรวมคูณผลต่อเงินเฟ้อ ครัวเรือนที่ใช้น้ำมันและเดินทางมากจะได้รับผลมากกว่าค่าเฉลี่ย</li>
<li>ดัชนีราคาผู้บริโภคไทยออกเป็นรายเดือนโดยกระทรวงพาณิชย์ ชุดข้อมูลหลักในโครงการนี้ปรับด้วยมือเมื่อมีตัวเลขใหม่ ส่วนราคาน้ำมันและค่าเงินอัปเดตอัตโนมัติทุกวัน</li></ul>`,
      sourcesTitle: "แหล่งข้อมูลและสถานะการอัปเดต",
      srcBrent: "ราคาน้ำมันดิบเบรนท์รายวัน", srcFx: "ค่าเงินบาทต่อดอลลาร์รายวัน", srcCpi: "ดัชนีราคาผู้บริโภคไทย", srcModel: "ประมาณแบบจำลองล่าสุด",
      srcCurated: (q) => `ชุดข้อมูลรายไตรมาสในโครงการ (ธนาคารแห่งประเทศไทย/กระทรวงพาณิชย์) ถึง ${q}`,
      srcFeedRejected: "ฟีดภายนอกถูกปฏิเสธเพราะไม่ตรงกับชุดข้อมูลหลัก", srcFromCache: "ใช้ข้อมูลที่เก็บไว้ล่าสุด",
      lastObs: (d) => `ข้อมูลล่าสุด ${d}`,
      foot: "แบบจำลองโดย Thai Leetrakul เผยแพร่ภายใต้สัญญาอนุญาต MIT ตัวเลขทั้งหมดเป็นการประมาณเชิงสถิติ ไม่ใช่คำพยากรณ์",
      loadError: "โหลดข้อมูลไม่สำเร็จ ลองรัน python -m thai_oil_cpi run แล้วเปิดหน้านี้ใหม่",
    },
    en: {
      brand: "Oil and the cost of living",
      h1: "When today's oil price reaches your wallet, and by how much",
      lede: "This page pulls the Brent crude price every day and runs it through a model estimated on Thai data from 2017 to now. It tells you how much a change in oil prices pushes up Thai inflation, how many months later, and what that means in baht per month for your household.",
      boardTitle: "Today's board", tileBrent: "Brent crude", unitUsdBbl: "US dollars per barrel",
      tileCrudeThb: "Crude cost", unitThbL: "baht per litre", tileFx: "Exchange rate", unitThbUsd: "baht per dollar",
      tileShock: "Versus last quarter", shockUnitQtd: "quarter-to-date average",
      boardNote: (d) => `Last close ${d.date}. Last quarter (${d.prevQ}) averaged ${d.prevAvg} dollars. This quarter has ${d.days} trading days so far, averaging ${d.qtdAvg} dollars. If today's price held for the whole quarter the shock would be ${d.spot}.`,
      calcTitle: "For your household", spendLabel: "Household spending per month (baht)",
      basisLegend: "Which oil price to use", basisQtd: "This quarter's average so far", basisSpot: "If today's price holds all quarter", basisCustom: "Set my own",
      advanced: "More options", curUsd: "Measure the oil shock in dollars (main model)", curThb: "Measure the oil shock in baht (includes the exchange rate)",
      ansPeak: "At the worst point you would pay about", perMonth: "baht more per month", ansYear: "Over the next 12 months", baht: "baht",
      ansInfl: "Inflation would run higher than otherwise by", pp: "percentage points",
      inQuarter: (q) => `in ${q}`, range: (a, b) => `plausible range ${a} to ${b} baht`,
      pathTitle: "Effect on Thai inflation over the next 8 quarters (percentage points of year-on-year inflation)",
      pathSubObserved: (s) => `Combined effect of oil price moves already seen in the last 8 quarters, including this one (${s})`,
      pathSubCustom: (s) => `If oil prices change by ${s} this quarter, once`,
      tableView: "Show as a table", quarter: "Quarter", impact: "Inflation effect (pp)", low: "Low", high: "High", extra: "Extra (baht/month)",
      pumpTitle: "At the pump",
      pumpIntro: "Excise, the Oil Fund levy and marketing margins are roughly fixed per litre, so pump prices tend to move with the crude cost per litre. Enter the price you see today and see what a Brent move equal to the shock selected above would mean per litre.",
      pumpPrice: "Pump price today (baht per litre)", pumpPass: "Share passed through to the pump",
      passGasohol: "Gasohol, full pass-through (100%)", passDiesel: "Diesel, Oil Fund absorbs half (50%)", passCapped: "Price mostly capped (25%)",
      pumpResult: "Estimated pump price", thbL: "baht per litre",
      pumpDelta: (d) => `Brent ${d.pct}, from ${d.from} to ${d.to} dollars. Crude cost changes by ${d.crude} baht per litre, the pump price by ${d.pump} baht per litre.`,
      oilTitle: "Brent crude price", brentChartTitle: "Daily close, US dollars per barrel",
      d1w: "1 week", d1m: "1 month", d3m: "3 months", d1y: "1 year",
      modelTitle: "What the model says",
      modelSummary: (m) => `Estimated with local projections on quarterly data from ${m.first} to ${m.last} (${m.n} quarters). A 10% rise in oil raises year-on-year inflation by about ${m.q1} points the next quarter, peaking at ${m.peak} points in quarter ${m.peakH}, and fading within two years. The model is re-estimated whenever the data updates.`,
      irfTitle: "If oil rises 10%, how many points does inflation change in each following quarter", irfSub: "Line is the estimate, band is the 95% confidence interval",
      histTitle: "Estimation data: Thai inflation and quarterly oil price changes",
      cpiLegend: "Thai headline inflation, year on year (%)", shockLegend: "Brent change from previous quarter (%)",
      horizon: (h) => `quarter ${h}`,
      aboutTitle: "Method and limits",
      aboutBody: `<p>The model measures how, historically, a 1% change in the quarterly average Brent price changed Thai headline inflation (CPI, year on year) in each of the following quarters, controlling for four quarters of past inflation and past oil shocks (Jordà 2005, Newey–West standard errors). The numbers on this page are those estimates multiplied by the oil price change that actually happened, or the one you set.</p>
<p>Things to know</p><ul>
<li>It is a statistical relationship from the past, not a forecast, and it does not include policy responses such as diesel price caps, electricity tariffs or interest rates, which can make the real effect smaller or slower.</li>
<li>The estimation sample is about 30 quarters, so the confidence bands are wide, and the effect is assumed to be linear. Very large shocks may not follow the pattern.</li>
<li>Extra spending is total spending times the inflation effect. Households that drive a lot or use more fuel are hit harder than the average.</li>
<li>Thai CPI is published monthly by the Ministry of Commerce. The curated series in this project is updated by hand when new figures are released; oil prices and the exchange rate refresh automatically every day.</li></ul>`,
      sourcesTitle: "Data sources and update status",
      srcBrent: "Brent crude, daily", srcFx: "USD/THB, daily", srcCpi: "Thai consumer price index", srcModel: "Model last estimated",
      srcCurated: (q) => `Curated quarterly series in the repository (Bank of Thailand / Ministry of Commerce) through ${q}`,
      srcFeedRejected: "external feed rejected: inconsistent with the curated series", srcFromCache: "serving the last cached copy",
      lastObs: (d) => `latest observation ${d}`,
      foot: "Model by Thai Leetrakul, MIT licence. All figures are statistical estimates, not forecasts.",
      loadError: "Could not load data. Run python -m thai_oil_cpi run and reload this page.",
    },
  };

  let lang = "th";
  try { lang = localStorage.getItem("lang") || (navigator.language.startsWith("th") ? "th" : "th"); } catch (e) {}
  const t = (k, ...a) => { const v = T[lang][k]; return typeof v === "function" ? v(...a) : (v ?? k); };

  function applyI18n() {
    document.documentElement.lang = lang;
    document.title = t("brand");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.getElementById("langToggle").textContent = lang === "th" ? "EN" : "ไทย";
  }

  // ---------------------------------------------------------------- formatting
  const locale = () => (lang === "th" ? "th-TH" : "en-US");
  const num = (x, d = 0) => (x == null || isNaN(x)) ? "–" : new Intl.NumberFormat(locale(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
  const signed = (x, d = 1, suffix = "") => (x == null || isNaN(x)) ? "–" : (x > 0 ? "+" : x < 0 ? "−" : "") + num(Math.abs(x), d) + suffix;
  const qLabel = (q) => { // "2026Q4" -> "Q4 2026"
    const m = /^(\d{4})Q([1-4])/.exec(q); if (!m) return q;
    return lang === "th" ? `ไตรมาส ${m[2]}/${m[1]}` : `Q${m[2]} ${m[1]}`;
  };
  const qTick = (q) => { const m = /^(\d{4})Q([1-4])/.exec(q); return m ? `Q${m[2]}/${m[1].slice(2)}` : q; };
  const addQuarters = (q, n) => { const m = /^(\d{4})Q([1-4])/.exec(q); let y = +m[1], k = +m[2] - 1 + n; y += Math.floor(k / 4); k = ((k % 4) + 4) % 4; return `${y}Q${k + 1}`; };
  const dirClass = (x) => (x > 0 ? "up" : x < 0 ? "down" : "");

  // ---------------------------------------------------------------- charts (plain SVG)
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const tooltip = document.getElementById("tooltip");
  const showTip = (html, x, y) => { tooltip.innerHTML = html; tooltip.hidden = false; const r = tooltip.getBoundingClientRect(); let left = x + 14, top = y + 14; if (left + r.width > window.innerWidth - 8) left = x - r.width - 14; if (top + r.height > window.innerHeight - 8) top = y - r.height - 14; tooltip.style.left = left + "px"; tooltip.style.top = top + "px"; };
  const hideTip = () => { tooltip.hidden = true; };
  const niceTicks = (lo, hi, n = 5) => {
    if (lo === hi) { lo -= 1; hi += 1; }
    const span = hi - lo, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const steps = [1, 2, 2.5, 5, 10].map((s) => s * mag); const step = steps.find((s) => span / s <= n + 1) || steps[steps.length - 1];
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out;
  };

  /* Generic index-positioned chart: x = 0..n-1, series are lines or bars, one optional band.
     opts: { n, xTick(i)->label|null, series:[{values, color, kind:'line'|'bar', label, endLabel}], band:{lower,upper,color}, zero, yFmt, tip(i)->html, height } */
  function drawChart(container, opts) {
    container.innerHTML = "";
    const W = Math.max(280, container.clientWidth || 600), H = opts.height || Math.min(300, Math.max(200, W * 0.42));
    const m = { top: 14, right: opts.endLabels ? 70 : 28, bottom: 30, left: 44 };
    const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, container);
    const g = el("g", { transform: `translate(${m.left},${m.top})` }, svg);
    const allVals = [];
    opts.series.forEach((s) => s.values.forEach((v) => v != null && allVals.push(v)));
    if (opts.band) { opts.band.lower.forEach((v) => v != null && allVals.push(v)); opts.band.upper.forEach((v) => v != null && allVals.push(v)); }
    let lo = Math.min(...allVals), hi = Math.max(...allVals);
    if (opts.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    const ticks = niceTicks(lo, hi, 5); lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
    const n = opts.n, step = pw / Math.max(1, n - (opts.bars ? 0 : 1));
    const x = (i) => opts.bars ? (i + 0.5) * step : i * step;
    const y = (v) => ph - ((v - lo) / (hi - lo)) * ph;
    const yFmt = opts.yFmt || ((v) => num(v, Math.abs(hi - lo) < 5 ? 1 : 0));

    const grid = el("g", { class: "grid" }, g);
    ticks.forEach((tv) => { el("line", { x1: 0, x2: pw, y1: y(tv), y2: y(tv) }, grid); el("text", { x: -8, y: y(tv) + 4, "text-anchor": "end" }, g).textContent = yFmt(tv); });
    if (opts.zero && lo < 0 && hi > 0) el("line", { class: "zero", x1: 0, x2: pw, y1: y(0), y2: y(0) }, g);
    const xa = el("g", { class: "axis" }, g);
    for (let i = 0; i < n; i++) { const lab = opts.xTick(i); if (lab != null) { el("text", { x: x(i), y: ph + 20, "text-anchor": "middle" }, xa).textContent = lab; } }

    if (opts.band) {
      const up = [], dn = [];
      for (let i = 0; i < n; i++) { if (opts.band.upper[i] != null) up.push(`${x(i)},${y(opts.band.upper[i])}`); if (opts.band.lower[i] != null) dn.unshift(`${x(i)},${y(opts.band.lower[i])}`); }
      el("polygon", { class: "band", points: up.concat(dn).join(" "), fill: opts.band.color }, g);
    }
    const marks = [];
    opts.series.forEach((s) => {
      if (s.kind === "bar") {
        const bw = Math.min(24, step * 0.6);
        const layer = el("g", {}, g); marks.push(layer);
        s.values.forEach((v, i) => {
          if (v == null) return; const y0 = y(0), y1 = y(v), top = Math.min(y0, y1), h = Math.abs(y1 - y0), r = Math.min(4, h / 2);
          const d = v >= 0
            ? `M${x(i) - bw / 2},${y0} V${top + r} a${r},${r} 0 0 1 ${r},-${r} H${x(i) + bw / 2 - r} a${r},${r} 0 0 1 ${r},${r} V${y0} Z`
            : `M${x(i) - bw / 2},${y0} V${y0 + h - r} a${r},${r} 0 0 0 ${r},${r} H${x(i) + bw / 2 - r} a${r},${r} 0 0 0 ${r},-${r} V${y0} Z`;
          el("path", { class: "bar", d, fill: s.color, "data-i": i }, layer);
        });
      } else {
        let d = "", pen = false;
        s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(i) + "," + y(v); pen = true; });
        el("path", { class: "line", d, stroke: s.color }, g);
        if (s.dots) s.values.forEach((v, i) => v != null && el("circle", { class: "dot", cx: x(i), cy: y(v), r: 4, fill: s.color }, g));
        if (s.endLabel) { const last = s.values.length - 1; const v = s.values[last]; if (v != null) el("text", { class: "end-label", x: x(last) + 8, y: y(v) + 4 }, g).textContent = s.endLabel(v); }
      }
    });

    // hover layer
    const hover = el("g", { style: "pointer-events:none" }, g); let hl = null, hd = [];
    const hit = el("rect", { x: 0, y: 0, width: pw, height: ph, fill: "transparent", style: "cursor:crosshair" }, g);
    const move = (ev) => {
      const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * (W / r.width) - m.left;
      let i = opts.bars ? Math.floor(px / step) : Math.round(px / step); i = Math.max(0, Math.min(n - 1, i));
      hover.innerHTML = ""; el("line", { class: "hover-line", x1: x(i), x2: x(i), y1: 0, y2: ph }, hover);
      opts.series.forEach((s) => { const v = s.values[i]; if (v != null && s.kind !== "bar") el("circle", { class: "dot", cx: x(i), cy: y(v), r: 5, fill: s.color }, hover); });
      showTip(opts.tip(i), ev.clientX, ev.clientY);
    };
    hit.addEventListener("pointermove", move); hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", () => { hover.innerHTML = ""; hideTip(); });
    if (opts.legend && opts.legend.length) {
      const lg = document.createElement("div"); lg.className = "legend";
      opts.legend.forEach((l) => { const s = document.createElement("span"); const i = document.createElement("i"); i.style.background = l.color; s.appendChild(i); s.appendChild(document.createTextNode(l.label)); lg.appendChild(s); });
      container.appendChild(lg);
    }
  }

  function tableHtml(head, rows) {
    return `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  // ---------------------------------------------------------------- state and rendering
  let D = null;
  const state = { basis: "qtd", cur: "usd", custom: 20, spend: 24000, pump: 36, pass: 1 };
  const $ = (id) => document.getElementById(id);

  function projFor() { return D.projections[state.cur] || D.projections.usd; }
  function shockPct() {
    const c = D.current;
    if (state.basis === "custom") return state.custom;
    const key = (state.basis === "qtd" ? "shock_qtd" : "shock_spot_persists") + (state.cur === "thb" ? "_thb_pct" : "_pct");
    return c[key];
  }
  function currentPath() {
    const p = projFor();
    if (state.basis === "custom") return p.irf.filter((r) => r.beta != null).map((r) => ({ h: r.h, impact_pp: r.beta * state.custom, lower_pp: r.lower * state.custom, upper_pp: r.upper * state.custom }));
    return (state.basis === "qtd" ? p.observed_qtd : p.observed_spot).path;
  }

  function renderBoard() {
    const c = D.current;
    $("boardDate").textContent = c.brent_latest_date || "";
    $("tBrent").textContent = num(c.brent_latest, 2);
    $("tFx").textContent = num(c.usdthb_latest, 2);
    $("tCrudeThb").textContent = (c.brent_latest && c.usdthb_latest) ? num(c.brent_latest * c.usdthb_latest / 158.987, 2) : "–";
    const s = c.shock_qtd_pct; const tv = $("tShock"); tv.textContent = signed(s, 1, "%"); tv.classList.toggle("neg", s < 0);
    $("tShockUnit").textContent = t("shockUnitQtd");
    $("boardNote").textContent = t("boardNote", { date: c.brent_latest_date, prevQ: qLabel(c.prev_quarter), prevAvg: num(c.prev_quarter_avg, 1), days: c.days_so_far, qtdAvg: num(c.brent_qtd_avg, 1), spot: signed(c.shock_spot_persists_pct, 1, "%") });
  }

  function renderCalc() {
    const path = currentPath(); const s = shockPct(); const spend = state.spend;
    const base = D.current.quarter;
    const rows = path.map((r) => ({ ...r, q: addQuarters(base, r.h), extra: spend * r.impact_pp / 100, lo: spend * r.lower_pp / 100, hi: spend * r.upper_pp / 100 }));
    const peak = rows.reduce((a, b) => (b.extra > a.extra ? b : a), rows[0]);
    const y1 = rows.filter((r) => r.h <= 4);
    const yTot = 3 * y1.reduce((a, r) => a + r.extra, 0), yLo = 3 * y1.reduce((a, r) => a + r.lo, 0), yHi = 3 * y1.reduce((a, r) => a + r.hi, 0);
    const pk = $("aPeak"); pk.textContent = signed(peak.extra, 0); pk.className = dirClass(peak.extra);
    $("aPeakWhen").textContent = t("inQuarter", qLabel(peak.q));
    const yv = $("aYear"); yv.textContent = signed(yTot, 0); yv.className = dirClass(yTot);
    $("aYearRange").textContent = t("range", signed(yLo, 0), signed(yHi, 0));
    const iv = $("aInfl"); iv.textContent = signed(peak.impact_pp, 2); iv.className = dirClass(peak.impact_pp);
    $("aInflWhen").textContent = t("inQuarter", qLabel(peak.q));
    $("pathSub").textContent = state.basis === "custom" ? t("pathSubCustom", signed(s, 0, "%")) : t("pathSubObserved", signed(s, 1, "%"));
    const color = getComputedStyle(document.documentElement).getPropertyValue("--series-1").trim();
    drawChart($("pathChart"), {
      n: rows.length, xTick: (i) => qTick(rows[i].q), zero: true, endLabels: false,
      series: [{ values: rows.map((r) => r.impact_pp), color, dots: true }],
      band: { lower: rows.map((r) => r.lower_pp), upper: rows.map((r) => r.upper_pp), color },
      yFmt: (v) => signed(v, 1), height: 240,
      tip: (i) => `<b>${qLabel(rows[i].q)}</b><br>${t("impact")}: ${signed(rows[i].impact_pp, 2)} (${signed(rows[i].lower_pp, 2)} … ${signed(rows[i].upper_pp, 2)})<br>${t("extra")}: ${signed(rows[i].extra, 0)}`,
    });
    $("pathTable").innerHTML = tableHtml([t("quarter"), t("impact"), t("low"), t("high"), t("extra")], rows.map((r) => [qLabel(r.q), signed(r.impact_pp, 2), signed(r.lower_pp, 2), signed(r.upper_pp, 2), signed(r.extra, 0)]));
    renderPump();
  }

  function renderPump() {
    const c = D.current; const s = shockPct(); if (s == null || !c.brent_latest || !c.usdthb_latest) return;
    const from = c.brent_latest, to = from * Math.exp(s / 100); // s is a log-change in the model; convert back to a price
    const crude = (to - from) * c.usdthb_latest / 158.987; const dp = crude * state.pass;
    const nv = $("pumpNew"); nv.textContent = num(state.pump + dp, 2); nv.className = dirClass(dp);
    $("pumpDelta").textContent = t("pumpDelta", { pct: signed(100 * (to / from - 1), 1, "%"), from: num(from, 1), to: num(to, 1), crude: signed(crude, 2), pump: signed(dp, 2) });
  }

  function renderBrent() {
    const pts = D.data.brent_daily; if (!pts.length) return;
    const ch = D.brent_changes_pct || {};
    $("brentDeltas").innerHTML = ["1w", "1m", "3m", "1y"].filter((k) => ch[k] != null).map((k) => `<div class="delta"><b class="${dirClass(ch[k])}">${signed(ch[k], 1, "%")}</b><span>${t("d" + k)}</span></div>`).join("");
    const color = getComputedStyle(document.documentElement).getPropertyValue("--series-2").trim();
    const months = pts.map((p) => p[0].slice(0, 7)); const every = ($("brentChart").clientWidth || 600) < 520 ? 6 : 3;
    const firstOfMonth = pts.map((p, i) => i > 0 && months[i] !== months[i - 1] && (+p[0].slice(5, 7) - 1) % every === 0);
    drawChart($("brentChart"), {
      n: pts.length, xTick: (i) => firstOfMonth[i] ? (lang === "th" ? `${["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][+pts[i][0].slice(5, 7) - 1]} ${pts[i][0].slice(2, 4)}` : new Date(pts[i][0]).toLocaleDateString("en-US", { month: "short", year: "2-digit" })) : null,
      series: [{ values: pts.map((p) => p[1]), color, endLabel: (v) => num(v, 1) }], endLabels: true, height: 260,
      tip: (i) => `<b>${pts[i][0]}</b><br>${num(pts[i][1], 2)} USD/bbl`,
    });
  }

  function renderModel() {
    const p = projFor(); const irf = p.irf; const m = D.model.sample;
    const peak = irf.reduce((a, b) => (b.beta > a.beta ? b : a), irf[0]);
    $("modelSummary").textContent = t("modelSummary", { first: qLabel(m.first), last: qLabel(m.last), n: m.n, q1: num(irf[0].beta * 10, 2), peak: num(peak.beta * 10, 2), peakH: peak.h });
    const c1 = getComputedStyle(document.documentElement).getPropertyValue("--series-1").trim();
    const c2 = getComputedStyle(document.documentElement).getPropertyValue("--series-2").trim();
    drawChart($("irfChart"), {
      n: irf.length, xTick: (i) => t("horizon", irf[i].h), zero: true, height: 220,
      series: [{ values: irf.map((r) => r.beta * 10), color: c1, dots: true }],
      band: { lower: irf.map((r) => r.lower * 10), upper: irf.map((r) => r.upper * 10), color: c1 },
      yFmt: (v) => signed(v, 1),
      tip: (i) => `<b>${t("horizon", irf[i].h)}</b><br>${signed(irf[i].beta * 10, 2)} pp (${signed(irf[i].lower * 10, 2)} … ${signed(irf[i].upper * 10, 2)})<br>n = ${irf[i].n}`,
    });
    $("irfTable").innerHTML = tableHtml([t("quarter"), t("impact"), t("low"), t("high")], irf.map((r) => [t("horizon", r.h), signed(r.beta * 10, 3), signed(r.lower * 10, 3), signed(r.upper * 10, 3)]));

    const firstYoy = D.data.quarterly.findIndex((r) => r.yoy != null);
    const q = D.data.quarterly.slice(Math.max(0, firstYoy - 4)).filter((r) => r.yoy != null || r.oil_shock_pct != null);
    const xt = (i) => (q[i].quarter.endsWith("Q1") ? q[i].quarter.slice(0, 4) : null);
    drawChart($("cpiChart"), { n: q.length, xTick: xt, zero: true, height: 180, series: [{ values: q.map((r) => r.yoy), color: c1 }], legend: [{ color: c1, label: t("cpiLegend") }], yFmt: (v) => num(v, 0) + "%", tip: (i) => `<b>${qLabel(q[i].quarter)}</b><br>${t("cpiLegend")}: ${q[i].yoy == null ? "–" : signed(q[i].yoy, 2, "%")}` });
    drawChart($("shockChart"), { n: q.length, xTick: xt, zero: true, bars: true, height: 180, series: [{ kind: "bar", values: q.map((r) => r.oil_shock_pct), color: c2 }], legend: [{ color: c2, label: t("shockLegend") }], yFmt: (v) => num(v, 0) + "%", tip: (i) => `<b>${qLabel(q[i].quarter)}</b><br>${t("shockLegend")}: ${signed(q[i].oil_shock_pct, 1, "%")}<br>Brent ${num(q[i].brent, 1)} USD` });
  }

  function renderSources() {
    const s = D.sources || {}; const rows = [];
    const line = (st, fallback) => {
      if (!st) return fallback || "–";
      let txt = st.source ? `${st.source}` : ""; if (st.last_obs) txt += (txt ? ", " : "") + t("lastObs", String(st.last_obs).slice(0, 10));
      if (st.from_cache) txt += ` (${t("srcFromCache")})`;
      return txt || fallback || "–";
    };
    rows.push([t("srcBrent"), line(s.brent_daily)]);
    rows.push([t("srcFx"), line(s.usdthb_daily)]);
    const cpi = s.thai_cpi_monthly; let cpiTxt = t("srcCurated", qLabel(D.cpi_latest.quarter));
    if (cpi && cpi.source) cpiTxt += `; ${line(cpi)}`; else if (cpi && cpi.errors && cpi.errors.some((e) => /rejected/.test(e))) cpiTxt += ` (${t("srcFeedRejected")})`;
    rows.push([t("srcCpi"), cpiTxt]);
    rows.push([t("srcModel"), (D.generated_at || "").replace("T", " ").slice(0, 16) + " UTC"]);
    $("sources").innerHTML = `<table class="src-table">${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>`;
  }

  function renderAll() { applyI18n(); renderBoard(); renderCalc(); renderBrent(); renderModel(); renderSources(); }

  // ---------------------------------------------------------------- wiring
  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} if (D) renderAll(); else applyI18n(); });
  $("spend").addEventListener("input", (e) => { state.spend = +e.target.value || 0; if (D) renderCalc(); });
  document.querySelectorAll("input[name=basis]").forEach((r) => r.addEventListener("change", (e) => { state.basis = e.target.value; $("customRow").hidden = state.basis !== "custom"; if (D) renderCalc(); }));
  document.querySelectorAll("input[name=cur]").forEach((r) => r.addEventListener("change", (e) => { state.cur = e.target.value; if (D) { renderCalc(); renderModel(); } }));
  $("shockSlider").addEventListener("input", (e) => { state.custom = +e.target.value; $("shockOut").textContent = signed(state.custom, 0, "%"); if (D) renderCalc(); });
  $("pumpPrice").addEventListener("input", (e) => { state.pump = +e.target.value || 0; if (D) renderPump(); });
  $("pumpPass").addEventListener("change", (e) => { state.pass = +e.target.value; if (D) renderPump(); });
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => D && renderAll(), 150); });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => D && renderAll());

  applyI18n();
  fetch("data/latest.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { D = d; renderAll(); })
    .catch((err) => { console.error(err); const p = document.createElement("p"); p.className = "muted"; p.textContent = t("loadError"); document.querySelector("main").prepend(p); });
})();
