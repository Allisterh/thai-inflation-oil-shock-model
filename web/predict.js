/* Monthly inflation prediction and scorecard. All numbers come from data/predictions.json, written by
   the pipeline (thai_oil_cpi/predict.py); this script only displays them. */
(function () {
  "use strict";
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ", navHome: "คำนวณของคุณ", navPredict: "คาดการณ์รายเดือน", navMethod: "ทำไมถึงเชื่อถือได้", navAdvanced: "กราฟและรายละเอียด",
      title: "เงินเฟ้อเดือนนี้จะเป็นเท่าไร เราบอกก่อนทางการประกาศ",
      lede: "ทุกเดือน ก่อนที่กระทรวงพาณิชย์จะประกาศอัตราเงินเฟ้อ เราประกาศตัวเลขคาดการณ์ของเราไว้ก่อน และล็อกไว้ให้แก้ไม่ได้ เมื่อตัวเลขทางการออกมา เราให้คะแนนตัวเองต่อหน้าทุกคน ทุกคำคาดการณ์อยู่บนหน้านี้ถาวร ทั้งที่ถูกและที่ผิด",
      backSimple: "กลับไปคำนวณของคุณ", toMethod: "ทำไมถึงเชื่อถือได้", toCsv: "ไฟล์บันทึกคำคาดการณ์ทั้งหมดบน GitHub",
      asOf: (d) => `อัปเดตล่าสุด ${d}`, foot: (d) => `ข้อมูล: กระทรวงพาณิชย์ (ดัชนีราคาผู้บริโภค) สนพ. (ราคาน้ำมัน) ธนาคารโลก EIA อัปเดต ${d}`,
      locked: "ล็อกแล้ว", notLocked: "ตัวเลขปัจจุบัน ยังไม่ล็อก",
      headLocked: (d) => `คำคาดการณ์ของเราสำหรับเงินเฟ้อเดือน${d.m}`, headCurrent: (d) => `ตัวเลขปัจจุบันสำหรับเงินเฟ้อเดือน${d.m} (ยังไม่ล็อก)`,
      range: (d) => `น่าจะอยู่ระหว่าง ${d.lo}% ถึง ${d.hi}%`,
      lockedOn: (d) => `ล็อกเมื่อ ${d.d} ตัวเลขทางการจะออกต้นเดือน${d.due}`,
      lockOn: (d) => `ตัวเลขนี้เปลี่ยนทุกวันตามราคาน้ำมัน และจะถูกล็อกในวันที่ ${d.d} เมื่อราคาน้ำมันของเดือนนี้เกือบครบแล้ว ตัวเลขทางการจะออกต้นเดือน${d.due}`,
      basis: (d) => `ฐาน: เงินเฟ้อเดือน${d.m} ที่ประกาศแล้ว ${d.v}% บวกผลจากราคาน้ำมันระหว่างเดือน${d.m}ถึงเดือน${d.t} ${d.oil} จุด (ราคาหน้าปั๊มเดือน${d.t}ถึงตอนนี้ ${d.shock} จากเดือนก่อน)`,
      altNoChange: "ถ้าเงินเฟ้อไม่เปลี่ยนจากเดือนก่อน", altCrude: "ถ้าใช้แบบจำลองน้ำมันดิบแทน", altRange: "ความคลาดเคลื่อนเฉลี่ย 1 เดือนล่วงหน้า (จากการทดสอบย้อนหลัง)",
      scoreTitle: "ผลงานที่ผ่านมา", scoreKicker: "คำคาดการณ์จริง",
      sumMae: "ความคลาดเคลื่อนเฉลี่ยของเรา", sumNc: "ถ้าเดาว่าไม่เปลี่ยนจากเดือนก่อน", sumHits: (d) => `อยู่ในช่วงที่บอก ${d.hits} จาก ${d.n} ครั้ง`,
      sumNone: "ยังไม่มีคำคาดการณ์ที่ตรวจคะแนนแล้ว คำแรกจะถูกล็อกวันที่ 25 ของเดือนนี้ และตรวจเมื่อตัวเลขทางการออก",
      thMonth: "เดือน", thPred: "เราคาดการณ์", thActual: "ตัวเลขทางการ", thErr: "คลาด", thNc: "ถ้าเดาว่าไม่เปลี่ยน คลาด", thIn: "อยู่ในช่วง",
      yes: "ใช่", no: "ไม่", pending: "รอตัวเลขทางการ",
      scoreNote: "ทุกแถวถูกบันทึกในไฟล์สาธารณะบน GitHub ตอนที่ล็อก พร้อมเวลาและรหัสเวอร์ชันของแบบจำลอง ดูประวัติการแก้ไขของไฟล์ได้ที่ลิงก์ด้านล่าง เราแก้ตัวเลขที่ล็อกแล้วไม่ได้โดยไม่ทิ้งร่องรอย",
      howTitle: "วิธีคิด และสิ่งที่ทำไม่ได้",
      how: (d) => `
<p>คำคาดการณ์คือ เงินเฟ้อเดือนก่อนที่ประกาศแล้ว บวกผลของราคาน้ำมันที่เพิ่งเปลี่ยน แบบจำลองเดียวกับหน้าแรกบอกว่าเมื่อราคาหน้าปั๊มขยับ ของอื่น ๆ ขยับตามเท่าไรในเดือนถัดไป เราเอาราคาน้ำมันของเดือนนี้มาคูณกับตัวเลขนั้น นี่คือการคำนวณแบบเดียวกับที่การทดสอบย้อนหลัง 1 เดือนให้คะแนนไว้ ความคลาดเคลื่อนที่วัดได้ (${d.rmse} จุด) จึงใช้กับตัวเลขนี้ได้โดยตรง</p>
<ul>
<li><strong>เรารอจนราคาน้ำมันของเดือนนั้นรู้เกือบครบ</strong> จึงล็อกวันที่ 25 ไม่ใช่ต้นเดือน แบบจำลองไม่ได้เดาว่าน้ำมันจะไปทางไหน มันบอกว่าน้ำมันที่ขึ้นไปแล้วจะส่งผลต่อของอื่นอย่างไร</li>
<li><strong>ไม่ทำนายการตัดสินใจของรัฐ</strong> ถ้าเดือนนั้นรัฐประกาศลดค่าไฟหรือตรึงดีเซลเพิ่ม ตัวเลขจริงจะต่ำกว่าที่เราบอก</li>
<li><strong>มองแค่ช่องทางน้ำมัน</strong> เงินเฟ้อยังขึ้นกับอากาศ ราคาหมู ค่าเช่า และอีกมาก ที่แบบจำลองไม่ได้ดู ตัวเลขฐานของเดือนก่อนมีสิ่งเหล่านั้นอยู่แล้ว แต่ถ้ามันเปลี่ยนในเดือนนี้ เราจะพลาด</li>
</ul>`,
      btTitle: "ผลการทดสอบย้อนหลัง", btKicker: "ไม่ใช่คำคาดการณ์จริง",
      btNote: "ตารางนี้มาจากการทดสอบย้อนหลัง 3 ปี แบบจำลองถูกประมาณใหม่ทุกเดือนด้วยข้อมูลในอดีตเท่านั้น แล้วป้อนราคาน้ำมันที่เกิดขึ้นจริงหลังจากนั้น มันวัดว่าน้ำมันส่งผ่านไปยังราคาได้แม่นแค่ไหน ไม่ใช่การคาดการณ์ที่ประกาศล่วงหน้าจริง ซึ่งเริ่มเก็บในตารางด้านบนตั้งแต่เดือนนี้",
      btH: "ล่วงหน้า", btRmse: "คลาดเฉลี่ย (จุด)", btNc: "ถ้าเดาว่าไม่เปลี่ยน", btN: "จำนวนเดือน", months: (h) => `${h} เดือน`,
      chartTitle: "ทดสอบย้อนหลัง 1 เดือน: ที่แบบจำลองบอก เทียบกับที่เกิดขึ้นจริง", chartProj: "แบบจำลอง", chartActual: "ของจริง", chartY: "การเปลี่ยนแปลงของอัตราเงินเฟ้อใน 1 เดือน (จุด)",
      srcCard: "ที่มา: เงินเฟ้อจากกระทรวงพาณิชย์ ราคาน้ำมันจาก สนพ. ความคลาดเคลื่อนจาก results/backtest_rolling.csv",
      loadError: "โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง",
    },
    en: {
      brand: "Oil and the cost of living", navHome: "Your calculation", navPredict: "Monthly prediction", navMethod: "Why trust it", navAdvanced: "Charts and details",
      title: "This month's inflation, called before the official figure",
      lede: "Every month, before the Ministry of Commerce publishes the inflation rate, we publish our prediction and lock it so it cannot be changed. When the official figure comes out, we score ourselves in public. Every prediction stays on this page for good, hits and misses alike.",
      backSimple: "Back to your calculation", toMethod: "Why trust it", toCsv: "The full prediction log on GitHub",
      asOf: (d) => `Updated ${d}`, foot: (d) => `Sources: Ministry of Commerce (CPI), EPPO (fuel prices), World Bank, US EIA. Updated ${d}`,
      locked: "Locked", notLocked: "Current estimate, not yet locked",
      headLocked: (d) => `Our prediction for ${d.m} inflation`, headCurrent: (d) => `Current estimate for ${d.m} inflation (not yet locked)`,
      range: (d) => `likely between ${d.lo}% and ${d.hi}%`,
      lockedOn: (d) => `Locked on ${d.d}. Official figure due in early ${d.due}.`,
      lockOn: (d) => `This figure moves daily with fuel prices and will be locked on ${d.d}, once most of the month's fuel prices are in. Official figure due in early ${d.due}.`,
      basis: (d) => `Basis: the published ${d.m} rate of ${d.v}%, plus the oil-driven change from ${d.m} to ${d.t} of ${d.oil} points (pump prices in ${d.t} so far are ${d.shock} on the month before).`,
      altNoChange: "If inflation simply stayed at last month's rate", altCrude: "Using the crude-oil model instead", altRange: "Average one-month error from the backtest",
      scoreTitle: "Track record", scoreKicker: "Real predictions",
      sumMae: "Our average error", sumNc: "Error from assuming no change", sumHits: (d) => `Inside our range ${d.hits} of ${d.n} times`,
      sumNone: "No scored predictions yet. The first one is locked on the 25th of this month and scored when the official figure is published.",
      thMonth: "Month", thPred: "Our prediction", thActual: "Official figure", thErr: "Our error", thNc: "Error from assuming no change", thIn: "Inside our range",
      yes: "yes", no: "no", pending: "awaiting official figure",
      scoreNote: "Each row is written to a public file on GitHub at the moment it is locked, with the time and the model's version code. The file's edit history is public at the link below, so a locked figure cannot be changed without leaving a trace.",
      howTitle: "How it works, and what it cannot do",
      how: (d) => `
<p>The prediction is last month's published inflation rate plus the effect of the fuel price moves that have just happened. The same model as the front page says how much other prices follow when pump prices move, one month on. We multiply this month's fuel price move by that. It is exactly the calculation that the one-month backtest scores, so the measured error (${d.rmse} points) applies directly to this figure.</p>
<ul>
<li><strong>It waits until most of the month's oil prices are known.</strong> That is why it locks on the 25th, not at the start of the month. The model does not guess where oil is going; it says what oil moves that have already happened will do to other prices.</li>
<li><strong>It does not predict government decisions.</strong> If a new electricity discount or a tighter diesel cap is announced that month, the official figure will come in below ours.</li>
<li><strong>It only models the oil channel.</strong> Inflation also moves with weather, pork prices, rents and much else that the model does not look at. Last month's base rate already contains those, but if they change this month we will miss it.</li>
</ul>`,
      btTitle: "Backtest results", btKicker: "Not live predictions",
      btNote: "This table comes from the three-year backtest: the model is re-estimated each month on past data only, then fed the fuel prices that actually happened afterwards. It measures how accurately oil feeds into prices. It is not a record of predictions published in advance; those start in the table above from this month.",
      btH: "Horizon", btRmse: "Average error (points)", btNc: "Assuming no change", btN: "Months", months: (h) => `${h} month${h > 1 ? "s" : ""}`,
      chartTitle: "One-month backtest: what the model said against what happened", chartProj: "Model", chartActual: "Actual", chartY: "Change in the inflation rate over one month (points)",
      srcCard: "Sources: inflation from the Ministry of Commerce, fuel prices from EPPO, error from results/backtest_rolling.csv.",
      loadError: "Could not load the data. Please try again.",
    },
  };
  let lang = "th";
  try { lang = localStorage.getItem("lang") || "th"; } catch (e) {}
  const t = (k, ...a) => { const v = T[lang][k]; return typeof v === "function" ? v(...a) : (v ?? k); };
  const $ = (id) => document.getElementById(id);
  const num = (x, d = 1) => (x == null || isNaN(x)) ? "–" : new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
  const signed = (x, d = 2) => (x == null || isNaN(x)) ? "–" : (x > 0 ? "+" : x < 0 ? "−" : "") + num(Math.abs(x), d);
  const TH_M = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const TH_S = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const EN_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mLabel = (m) => { if (!m) return "–"; const [y, mo] = m.slice(0, 7).split("-").map(Number); return lang === "th" ? `${TH_M[mo - 1]} ${y + 543}` : `${EN_M[mo - 1]} ${y}`; };
  const mShort = (m) => { const [y, mo] = m.slice(0, 7).split("-").map(Number); return lang === "th" ? `${TH_S[mo - 1]} ${String(y + 543).slice(2)}` : `${EN_M[mo - 1].slice(0, 3)} ${String(y).slice(2)}`; };
  const dateLabel = (d) => { if (!d) return "–"; const [y, mo, da] = d.slice(0, 10).split("-").map(Number); return lang === "th" ? `${da} ${TH_M[mo - 1]} ${y + 543}` : `${da} ${EN_M[mo - 1]} ${y}`; };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  let D = null;

  function lineChart(el, { title, series, xTicks, yLabel, legend, caption, W = 720, H = 260 }) {
    const P = { l: 44, r: 12, t: 28, b: 36 };
    const xs = series.flatMap((s) => s.pts.map((p) => p[0])), ys = series.flatMap((s) => s.pts.map((p) => p[1]));
    const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys); const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad;
    const X = (x) => P.l + (x - x0) / (x1 - x0 || 1) * (W - P.l - P.r), Y = (y) => P.t + (y1 - y) / (y1 - y0) * (H - P.t - P.b);
    const step = (y1 - y0) > 6 ? 2 : (y1 - y0) > 3 ? 1 : 0.5; const yt = []; for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) yt.push(+v.toFixed(2));
    const ink = css("--ink") || "#17201b", grid = css("--grid") || "#ddd", muted = css("--ink-2") || "#666";
    let g = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}"><text x="${P.l}" y="16" font-size="13" font-weight="600" fill="${ink}">${title}</text>`;
    yt.forEach((v) => { g += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? ink : grid}" stroke-width="${v === 0 ? 1 : 0.6}"/><text x="${P.l - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="${muted}">${signed(v, step < 1 ? 1 : 0)}</text>`; });
    xTicks.forEach(([x, lab]) => { g += `<text x="${X(x)}" y="${H - P.b + 16}" font-size="11" text-anchor="middle" fill="${muted}">${lab}</text>`; });
    series.forEach((s) => { g += `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" stroke-linejoin="round" points="${s.pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")}"/>`; if (s.dots) s.pts.forEach((p) => { g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="2.6" fill="${s.color}"/>`; }); });
    g += `</svg>`;
    el.innerHTML = g + `<div class="legend">${legend.map((l) => `<span><i style="background:${l[0]}"></i>${l[1]}</span>`).join("")}<span>${yLabel}</span></div><figcaption>${caption}</figcaption>`;
  }

  function render() {
    document.documentElement.lang = lang; document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $("langToggle").textContent = lang === "th" ? "EN" : "ไทย";
    if (!D) return;
    const locked = D.locked && D.locked_row; const v = locked ? D.locked_row : D.current; const cur = D.current;
    const m = mLabel(D.target_month), due = mLabel(D.official_due_month);
    const basis = t("basis", { m: mLabel(D.cpi_last_month), v: num(cur.no_change, 1), t: m, oil: signed(cur.oil_change, 2), shock: signed(cur.shock_target_month, 1) + "%" });
    $("card").innerHTML = `
      <p class="status ${locked ? "locked" : ""}">${locked ? t("locked") : t("notLocked")}</p>
      <p class="line">${locked ? t("headLocked", { m }) : t("headCurrent", { m })}</p>
      <p class="big">${num(v.predicted, 1)}%<small>${t("range", { lo: num(v.low, 1), hi: num(v.high, 1) })}</small></p>
      <p class="line">${locked ? t("lockedOn", { d: dateLabel(D.locked_row.locked_at), due }) : t("lockOn", { d: dateLabel(D.lock_date), due })}</p>
      <p class="meta">${basis}</p>
      <div class="alt">
        <div><span class="v">${num(v.no_change, 1)}%</span><span class="l">${t("altNoChange")}</span></div>
        <div><span class="v">${num(v.crude_model, 1)}%</span><span class="l">${t("altCrude")}</span></div>
        <div><span class="v">±${num(cur.rmse1, 2)}</span><span class="l">${t("altRange")}</span></div>
      </div>
      <p class="srcline">${t("srcCard")} ${locked ? `· ${lang === "th" ? "เวอร์ชัน" : "version"} ${D.locked_row.model_version}` : ""}</p>`;
    // scorecard
    const s = D.summary || {}; const rows = D.rows || [];
    let sum = "";
    if (s.n_scored) {
      sum = `<div class="sum"><div><span class="v">${num(s.mae, 2)}</span><span class="l">${t("sumMae")}</span></div><div><span class="v">${num(s.mae_no_change, 2)}</span><span class="l">${t("sumNc")}</span></div><div><span class="v">${s.hits}/${s.n_scored}</span><span class="l">${t("sumHits", { hits: s.hits, n: s.n_scored })}</span></div></div>`;
    } else { sum = `<p class="empty">${t("sumNone")}</p>`; }
    let table = "";
    if (rows.length) {
      table = `<table class="t"><thead><tr><th>${t("thMonth")}</th><th>${t("thPred")}</th><th>${t("thActual")}</th><th>${t("thErr")}</th><th>${t("thNc")}</th><th>${t("thIn")}</th></tr></thead><tbody>` +
        rows.slice().reverse().map((r) => r.actual == null
          ? `<tr><td>${mLabel(r.target_month)}</td><td>${num(r.predicted, 1)}% <small>(${num(r.low, 1)}–${num(r.high, 1)})</small></td><td class="pending" colspan="4">${t("pending")}</td></tr>`
          : `<tr><td>${mLabel(r.target_month)}</td><td>${num(r.predicted, 1)}% <small>(${num(r.low, 1)}–${num(r.high, 1)})</small></td><td>${num(r.actual, 1)}%</td><td>${signed(r.error, 2)}</td><td>${signed(r.no_change_error, 2)}</td><td class="${r.inside_range === "yes" ? "yes" : "no"}">${r.inside_range === "yes" ? t("yes") : t("no")}</td></tr>`).join("") + "</tbody></table>";
    }
    const bt = D.backtest || {}; const r1 = (bt.by_h || []).find((x) => x.h === 1) || {};
    const btTable = `<table class="t"><thead><tr><th>${t("btH")}</th><th>${t("btRmse")}</th><th>${t("btNc")}</th><th>${t("btN")}</th></tr></thead><tbody>` +
      (bt.by_h || []).map((r) => `<tr><td>${t("months", r.h)}</td><td>${num(r.rmse, 2)}</td><td>${num(r.rmse_no_change, 2)}</td><td>${r.n}</td></tr>`).join("") + "</tbody></table>";
    $("prose").innerHTML = `
      <h2><small>${t("scoreKicker")}</small>${t("scoreTitle")}</h2>${sum}${table}<p class="srcline">${t("scoreNote")}</p>
      <h2>${t("howTitle")}</h2>${t("how", { rmse: num(cur.rmse1, 2) })}
      <h2><small>${t("btKicker")}</small>${t("btTitle")}</h2><p>${t("btNote")}</p>${btTable}<figure id="figBt"></figure>`;
    const rh = bt.rows_h1 || [];
    if (rh.length) {
      const accent = css("--accent") || "#0f5b4b", ink = css("--ink") || "#17201b";
      lineChart($("figBt"), { title: t("chartTitle"), series: [{ pts: rh.map((r, i) => [i, r.actual]), color: ink, width: 2, dots: true }, { pts: rh.map((r, i) => [i, r.projected]), color: accent, width: 2.4 }],
        xTicks: rh.map((r, i) => [i, r.origin]).filter((_, i) => i % 6 === 0).map(([i, o]) => [i, mShort(o)]), yLabel: t("chartY"), legend: [[ink, t("chartActual")], [accent, t("chartProj")]], caption: bt.source || "" });
    }
    $("dateline").textContent = t("asOf", dateLabel(D.as_of_date || (D.generated_at || "").slice(0, 10)));
    $("footSources").textContent = t("foot", (D.generated_at || "").slice(0, 10));
    if (D.csv_url) $("csvLink").href = D.csv_url;
  }
  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} render(); });
  render();
  fetch("data/predictions.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => { D = d; render(); })
    .catch((err) => { console.error(err); const p = document.createElement("p"); p.className = "muted"; p.textContent = t("loadError"); document.querySelector("main").prepend(p); });
})();
