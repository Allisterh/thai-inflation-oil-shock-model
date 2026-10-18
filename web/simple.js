/* Simple front page: one question, plain answers. Reads data/latest.json. */
(function () {
  "use strict";
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ",
      h1: "น้ำมันแพงขึ้น ครอบครัวคุณจะจ่ายเพิ่มเดือนละกี่บาท",
      lede: "ใส่ค่าใช้จ่ายของครอบครัว แล้วเราจะบอกเป็นตัวเลขง่าย ๆ ว่าราคาน้ำมันที่ขึ้นมาแล้วจะทำให้ของแพงขึ้นเท่าไร และเมื่อไร คิดจากข้อมูลจริงของกระทรวงพาณิชย์และราคาน้ำมันวันนี้",
      oilText: (d) => `น้ำมันดิบ (คิดเป็นเงินบาท) เดือนนี้เทียบกับเดือนก่อน ข้อมูลถึง ${d}`,
      pumpText: (d) => `แก๊สโซฮอล์ 95 หน้าปั๊มในกรุงเทพ บาทต่อลิตร ${d}`,
      cpiText: (m) => `ของแพงขึ้นจากปีก่อน (เงินเฟ้อ) ล่าสุดเดือน${m}`,
      askTitle: "ครอบครัวคุณใช้จ่ายเดือนละประมาณกี่บาท", orType: "หรือพิมพ์เอง", bahtPerMonth: "บาทต่อเดือน",
      travelTitle: "ปกติเดินทางอย่างไร", travelCar: "ขับรถเป็นหลัก", travelMixed: "ปนกัน (ค่าเฉลี่ยทั่วไป)", travelPublic: "รถสาธารณะหรือเดิน",
      resultLead: "จากราคาน้ำมันที่ขึ้นมาแล้ว ครอบครัวคุณน่าจะจ่ายเพิ่ม",
      resultLeadDown: "จากราคาน้ำมันที่ลดลงมาแล้ว ครอบครัวคุณน่าจะจ่ายน้อยลง",
      when: (m) => `หนักที่สุดราวเดือน${m} แล้วค่อย ๆ เบาลง`,
      year: (v) => `รวม 12 เดือนข้างหน้า ประมาณ ${v} บาท`,
      whereTitle: "เงินที่เพิ่มไปอยู่ที่ไหนบ้าง (รวม 12 เดือน)",
      cat: { vehicles_fuel: "น้ำมันรถและค่าดูแลรถ", electricity_fuel_water: "ค่าไฟ ก๊าซหุงต้ม น้ำประปา", public_transport: "ค่ารถสาธารณะ", food: "อาหาร", other: "ของอื่น ๆ" },
      plain: (d) => `เทียบง่าย ๆ คือของทุกอย่างแพงขึ้นเฉลี่ยประมาณ ${d.pp}% มากกว่าที่ควรจะเป็น ถ้าไม่มีน้ำมันขึ้นราคา น้ำมันรถจะรู้สึกก่อนภายใน 1 ถึง 2 เดือน ส่วนอาหารและของอื่น ๆ จะค่อย ๆ ตามมาในช่วงครึ่งปีถึงหนึ่งปี`,
      whatifTitle: "แล้วถ้าน้ำมันเปลี่ยนอีก", up10: "ขึ้นอีก 10%", up20: "ขึ้นอีก 20%", up50: "ขึ้นอีก 50%", down10: "ลดลง 10%",
      whatif: (d) => `ถ้าน้ำมันดิบ${d.dir}จากวันนี้ ครอบครัวคุณจะจ่าย${d.more}อีกประมาณ ${d.peak} บาทต่อเดือน ในช่วงที่หนักที่สุด และแก๊สโซฮอล์ 95 จะ${d.pumpDir}ราว ${d.pump} บาทต่อลิตร ถ้ารัฐไม่พยุงราคา`,
      up: "ขึ้น", down: "ลง", moreWord: "เพิ่ม", lessWord: "น้อยลง", pumpUp: "แพงขึ้น", pumpDown: "ถูกลง",
      whyTitle: "ทำไมถึงเป็นแบบนี้",
      why1: (d) => `น้ำมันดิบที่โรงกลั่นไทยซื้อ (ดูไบ) คิดเป็นเงินบาท${d.dir}ประมาณ ${d.pct} ใน 12 เดือนที่ผ่านมา`,
      why2: (d) => `ทุกครั้งที่น้ำมันดิบแพงขึ้น 10% ราคาพลังงานในไทยจะขึ้นราว ${d.energy}% ภายในไม่กี่เดือน และของทั้งตะกร้าแพงขึ้นราว ${d.head}% ตามข้อมูลตั้งแต่ปี 2543`,
      why3: "อาหารและของอื่น ๆ ขึ้นช้ากว่าเพราะต้นทุนขนส่งและวัตถุดิบค่อย ๆ ส่งผ่าน แต่อยู่นานกว่า",
      caveat: "ตัวเลขเป็นการประมาณจากสิ่งที่เคยเกิดขึ้นในอดีต ไม่ใช่คำพยากรณ์ และไม่รวมมาตรการของรัฐ เช่น การตรึงราคาดีเซล ซึ่งอาจทำให้ของแพงช้าลงหรือน้อยลง",
      more: "ดูรายละเอียด กราฟ และวิธีคิดทั้งหมด",
      foot: (d) => `ข้อมูล: กระทรวงพาณิชย์ (ดัชนีราคาผู้บริโภค) สนพ. (ราคาน้ำมัน) ธนาคารโลก EIA อัปเดต ${d}`,
      loadError: "โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง",
    },
    en: {
      brand: "Oil and the cost of living",
      h1: "Oil got dearer. How much more will your household pay each month?",
      lede: "Enter what your household spends and we will tell you, in plain numbers, how much the oil price rise that has already happened will push up prices, and when. Based on real data from the Ministry of Commerce and today's oil price.",
      oilText: (d) => `Crude oil in baht, this month versus last month, data to ${d}`,
      pumpText: (d) => `Gasohol 95 at the pump in Bangkok, baht per litre, ${d}`,
      cpiText: (m) => `Prices compared with a year ago (inflation), latest ${m}`,
      askTitle: "About how much does your household spend per month?", orType: "or type it", bahtPerMonth: "baht per month",
      travelTitle: "How do you usually get around?", travelCar: "Mostly by car", travelMixed: "A mix (typical household)", travelPublic: "Public transport or walking",
      resultLead: "Because of the oil price rise that has already happened, your household will likely pay about",
      resultLeadDown: "Because of the oil price fall that has already happened, your household will likely pay less by about",
      when: (m) => `Worst around ${m}, then it eases.`,
      year: (v) => `About ${v} baht over the next 12 months.`,
      whereTitle: "Where the extra money goes (12 months)",
      cat: { vehicles_fuel: "Fuel and running a car", electricity_fuel_water: "Electricity, cooking gas, water", public_transport: "Public transport", food: "Food", other: "Everything else" },
      plain: (d) => `Put simply, everything costs about ${d.pp}% more than it otherwise would. You feel it at the pump within a month or two; food and other goods follow over six months to a year.`,
      whatifTitle: "And if oil moves again?", up10: "Up another 10%", up20: "Up another 20%", up50: "Up another 50%", down10: "Down 10%",
      whatif: (d) => `If crude goes ${d.dir} from today, your household would pay about ${d.peak} baht ${d.more} per month at the worst point, and Gasohol 95 would get about ${d.pump} baht per litre ${d.pumpDir}, unless the government cushions it.`,
      up: "up", down: "down", moreWord: "more", lessWord: "less", pumpUp: "dearer", pumpDown: "cheaper",
      whyTitle: "Why this happens",
      why1: (d) => `The crude Thai refineries buy (Dubai), measured in baht, is ${d.dir} about ${d.pct} over the past 12 months.`,
      why2: (d) => `Each time crude rises 10%, Thai energy prices rise about ${d.energy}% within a few months and the whole basket about ${d.head}%, based on data since 2000.`,
      why3: "Food and other goods rise later because transport and input costs pass through slowly, but the effect lasts longer.",
      caveat: "These are estimates from what happened in the past, not forecasts, and they leave out government measures such as diesel price caps that can make prices rise more slowly or less.",
      more: "See the details, charts and full method",
      foot: (d) => `Data: Ministry of Commerce (CPI), EPPO (fuel prices), World Bank, EIA. Updated ${d}`,
      loadError: "Could not load data. Please try again.",
    },
  };
  let lang = "th";
  try { lang = localStorage.getItem("lang") || "th"; } catch (e) {}
  const t = (k, ...a) => { const v = T[lang][k]; return typeof v === "function" ? v(...a) : (v ?? k); };
  const $ = (id) => document.getElementById(id);
  const locale = () => (lang === "th" ? "th-TH" : "en-US");
  const num = (x, d = 0) => (x == null || isNaN(x)) ? "–" : new Intl.NumberFormat(locale(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
  const round10 = (x) => Math.round(x / 10) * 10;
  const signed = (x, d = 1, suffix = "") => (x == null || isNaN(x)) ? "–" : (x > 0 ? "+" : x < 0 ? "−" : "") + num(Math.abs(x), d) + suffix;
  const TH_M = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const TH_S = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const EN_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mLabel = (m) => { const [y, mo] = m.slice(0, 7).split("-").map(Number); return lang === "th" ? `${TH_M[mo - 1]} ${y + 543}` : `${EN_M[mo - 1]} ${y}`; };
  const addMonths = (m, n) => { const [y, mo] = m.slice(0, 7).split("-").map(Number); const k = mo - 1 + n; return `${y + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}`; };
  const dateLabel = (d) => { if (!d) return ""; const [y, mo, da] = d.split("-").map(Number); return lang === "th" ? `${da} ${TH_S[mo - 1]} ${y + 543}` : `${da} ${EN_M[mo - 1].slice(0, 3)} ${y}`; };

  const SPEND_OPTIONS = [10000, 20000, 30000, 50000];
  const TRAVEL = { car: { vehicles_fuel: 0.24, public_transport: 0.005 }, mixed: null, public: { vehicles_fuel: 0.04, public_transport: 0.04 } };
  const WHATIF = [["up10", 10], ["up20", 20], ["up50", 50], ["down10", -10]];
  let D = null; const state = { spend: 20000, travel: "mixed", whatif: 10 };

  function shares() {
    const s = { ...D.default_shares }; const adj = TRAVEL[state.travel];
    if (adj) Object.assign(s, adj);
    s.other = Math.max(0, 1 - (s.vehicles_fuel + s.electricity_fuel_water + s.public_transport + s.food));
    return s;
  }
  function household(paths) {
    const sh = shares(); const total = new Array(24).fill(0); const cats = [];
    D.household_categories.forEach((c) => {
      const p = paths[c.outcome]; if (!p) return; const spend = state.spend * (sh[c.key] || 0);
      const byH = p.map((r) => spend * r.impact_pp / 100); byH.forEach((v, i) => { total[i] += v; });
      cats.push({ key: c.key, year1: byH.slice(0, 12).reduce((a, b) => a + b, 0) });
    });
    const peak = Math.max(...total.map(Math.abs)); const idx = total.findIndex((v) => Math.abs(v) === peak);
    return { total, cats, peak: total[idx], peakH: idx + 1, year1: total.slice(0, 12).reduce((a, b) => a + b, 0) };
  }
  const scenarioPaths = (pct) => { const out = {}; const irfs = D.irfs[D.model.primary_shock]; for (const oc in irfs) out[oc] = irfs[oc].map((r) => ({ h: r.h, impact_pp: r.beta * pct })); return out; };

  function chips(container, items, current, onPick) {
    container.innerHTML = "";
    items.forEach(([label, value]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", String(value === current));
      b.addEventListener("click", () => { onPick(value); render(); }); container.appendChild(b);
    });
  }

  function render() {
    document.documentElement.lang = lang; document.title = t("brand");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $("langToggle").textContent = lang === "th" ? "EN" : "ไทย";
    if (!D) return;
    const c = D.current, nc = c.nowcast, cpi = D.cpi_latest, r = D.retail;
    // facts
    const s = c.shock_mtd_pct; const f = $("fOil"); f.textContent = signed(s, 1, "%"); f.classList.toggle("neg", s < 0);
    $("fOilText").textContent = t("oilText", dateLabel(nc.brent_latest_date));
    $("fPump").textContent = num(r.prices && r.prices.gasohol95, 2); $("fPumpText").textContent = t("pumpText", dateLabel(r.date));
    $("fCpi").textContent = signed(cpi.headline_yoy, 1, "%"); $("fCpiText").textContent = t("cpiText", mLabel(cpi.month));
    // inputs
    chips($("spendChips"), SPEND_OPTIONS.map((v) => [num(v), v]), state.spend, (v) => { state.spend = v; $("spend").value = v; });
    chips($("travelChips"), [[t("travelCar"), "car"], [t("travelMixed"), "mixed"], [t("travelPublic"), "public"]], state.travel, (v) => { state.travel = v; });
    // main answer: observed shocks, month-to-date basis
    const key = D.model.primary_shock; const paths = D.projections[key].observed_mtd.paths; const hh = household(paths);
    const months = Array.from({ length: 24 }, (_, i) => addMonths(c.month, i + 1));
    document.querySelector(".result-lead").textContent = hh.peak >= 0 ? t("resultLead") : t("resultLeadDown");
    const big = $("rPeak"); big.textContent = num(round10(Math.abs(hh.peak))); big.className = hh.peak >= 0 ? "up" : "down";
    $("rWhen").textContent = t("when", mLabel(months[hh.peakH - 1]));
    $("rYear").textContent = t("year", signed(round10(hh.year1), 0));
    const maxAbs = Math.max(1, ...hh.cats.map((x) => Math.abs(x.year1)));
    $("whereBars").innerHTML = `<div class="hbars">${hh.cats.map((x) => `<div class="row"><span>${t("cat")[x.key]}</span><div class="track" style="${x.year1 < 0 ? "justify-content:flex-end" : ""}"><div class="fill ${x.year1 < 0 ? "neg" : ""}" style="width:${Math.abs(x.year1) / maxAbs * 100}%"></div></div><span class="val">${signed(round10(x.year1), 0)}</span></div>`).join("")}</div>`;
    const head = paths.headline; const hp = head.reduce((a, b) => (Math.abs(b.impact_pp) > Math.abs(a.impact_pp) ? b : a), head[0]);
    $("rPlain").textContent = t("plain", { pp: num(hp.impact_pp, 1) });
    // what if
    chips($("whatifChips"), WHATIF.map(([k, v]) => [t(k), v]), state.whatif, (v) => { state.whatif = v; });
    const sc = household(scenarioPaths(state.whatif));
    const perL = nc.dubai_spot_nowcast_thb / 158.987; const dPump = perL * (Math.exp(state.whatif / 100) - 1) * 1.07;
    $("whatifAnswer").textContent = t("whatif", { dir: (state.whatif > 0 ? t("up") : t("down")) + (lang === "th" ? ` ${num(Math.abs(state.whatif))}%` : ` ${num(Math.abs(state.whatif))}%`), more: sc.peak >= 0 ? t("moreWord") : t("lessWord"), peak: num(round10(Math.abs(sc.peak))), pump: num(Math.abs(dPump), 1), pumpDir: dPump >= 0 ? t("pumpUp") : t("pumpDown") });
    // why
    const irfs = D.irfs[key]; const pk = (oc) => irfs[oc].reduce((a, b) => (b.beta > a.beta ? b : a), irfs[oc][0]);
    const yoy = c.dubai_thb_yoy_pct;
    $("whyList").innerHTML = [t("why1", { dir: yoy >= 0 ? (lang === "th" ? "แพงขึ้น" : "up") : (lang === "th" ? "ถูกลง" : "down"), pct: num(Math.abs(yoy), 0) + "%" }), t("why2", { energy: num(pk("energy").beta * 10, 1), head: num(pk("headline").beta * 10, 1) }), t("why3")].map((x) => `<li>${x}</li>`).join("");
    $("footSources").textContent = t("foot", (D.generated_at || "").slice(0, 10));
  }

  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} render(); });
  $("spend").addEventListener("input", (e) => { state.spend = +e.target.value || 0; render(); });
  render();
  fetch("data/latest.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { D = d; render(); })
    .catch((err) => { console.error(err); const p = document.createElement("p"); p.className = "muted"; p.textContent = t("loadError"); document.querySelector("main").prepend(p); });
})();
