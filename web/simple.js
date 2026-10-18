/* Simple front page v3: concrete inputs, "already happened" from real data, "still to come" from the model. */
(function () {
  "use strict";
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ",
      h1: "น้ำมันแพงขึ้นแล้ว ครอบครัวคุณจ่ายเพิ่มเดือนละกี่บาท",
      lede: "ตอบสี่ข้อสั้น ๆ แล้วเราจะบอกว่าตอนนี้คุณจ่ายเพิ่มไปแล้วเท่าไรเทียบกับปีก่อน จากราคาหน้าปั๊มจริงและดัชนีราคาของกระทรวงพาณิชย์ และยังมีอะไรตามมาอีกในเดือนข้างหน้า",
      pumpFact: (d) => `${d.prod} หน้าปั๊มวันนี้ ${d.now} บาทต่อลิตร เทียบกับ ${d.ago} บาทเมื่อปีก่อน`,
      cpiFact: (m) => `ของแพงขึ้นจากปีก่อน (เงินเฟ้อ) ล่าสุดเดือน${m}`,
      oilFact: (d) => `น้ำมันดิบคิดเป็นเงินบาท เดือนนี้เทียบกับเดือนก่อน ข้อมูลถึง ${d}`,
      factsTitle: "ตัวเลขวันนี้", asOf: (d) => `อัปเดตล่าสุด ${d}`, panelTitle: "ครอบครัวคุณ", perMonthHint: "ตัวเลขทั้งหมดเป็นรายเดือน ใส่ค่าประมาณก็พอ",
      qFuel: "เติมน้ำมันเดือนละ", litres: "ลิตร", baht: "บาท", nowKicker: "วันนี้ เทียบกับปีก่อน", nextKicker: "ที่ยังตามมาอีก",
      copy: "คัดลอกผลลัพธ์", shareLine: "แชร์ทาง LINE", copied: "คัดลอกแล้ว",
      shareText: (d) => `น้ำมันแพงขึ้น ครอบครัวฉันจ่ายเพิ่มแล้วประมาณ ${d.now} บาทต่อเดือนเทียบกับปีก่อน และน่าจะตามมาอีกราว ${d.next} บาทต่อเดือน ลองคำนวณของคุณ: `,
      whyCards: (d) => [[d.pump, `ราคาหน้าปั๊ม${d.prod}แพงขึ้นจากปีก่อน น้ำมันดิบที่โรงกลั่นไทยซื้อ (ดูไบ) คิดเป็นเงินบาท${d.dir}ประมาณ ${d.crude}`], [d.energy, `เมื่อน้ำมันดิบแพงขึ้น 10% ราคาพลังงานในไทยขึ้นราวนี้ภายในไม่กี่เดือน และของทั้งตะกร้าแพงขึ้นราว ${d.head} จากข้อมูลตั้งแต่ปี 2543`], [d.foodH, `เดือนที่ราคาอาหารขึ้นมากที่สุดหลังน้ำมันแพง อาหารและของอื่น ๆ ขึ้นช้ากว่าเพราะต้นทุนค่อย ๆ ส่งผ่าน แต่อยู่นานกว่า นี่คือส่วนที่ยังตามมาอีก`]],
      litresPerMonth: "ลิตรต่อเดือน", fuelType: "ชนิด",
      fuelNone: "ไม่มีรถ", fuelMoto: "มอเตอร์ไซค์", fuelCar: "รถยนต์", fuelHeavy: "ขับเยอะ",
      qFood: "ค่าอาหารและเครื่องดื่ม", qElec: "ค่าไฟ ก๊าซหุงต้ม น้ำประปา", qOther: "ค่าใช้จ่ายอื่น ๆ",
      otherHint: "ค่าเช่า ของใช้ เสื้อผ้า ค่ารถสาธารณะ ค่ารักษา ค่าเทอม", bahtPerMonth: "บาทต่อเดือน",
      nowLead: "เทียบกับปีที่แล้ว ตอนนี้คุณจ่ายเพิ่มไปแล้วประมาณ", nowLeadLess: "เทียบกับปีที่แล้ว ตอนนี้คุณจ่ายน้อยลงประมาณ",
      nowNote: (d) => `คิดเป็น ${d.pct} ของค่าใช้จ่าย ${d.total} บาทต่อเดือนของคุณ ราคา ณ เดือน${d.m}`,
      nowSource: "ส่วนนี้ใช้ตัวเลขจริงล้วน ๆ ราคาหน้าปั๊มจากกระทรวงพลังงาน และตัวเลขราคาสินค้าล่าสุดของกระทรวงพาณิชย์ ไม่มีการคาดเดา",
      itemFuel: "น้ำมันรถ", itemFood: "อาหารและเครื่องดื่ม", itemElec: "ค่าไฟ ก๊าซ น้ำประปา", itemOther: "ของอื่น ๆ",
      noteFuel: (d) => `${d.prod} ${d.ago} → ${d.now} บาท/ลิตร × ${d.l} ลิตร`, noteIdx: (d) => `ดัชนีราคา${d.what} ${d.pct} จากปีก่อน`,
      idxFood: "อาหาร", idxElec: "ค่าไฟ ก๊าซ น้ำประปา", idxOther: "สินค้าทั่วไป (เงินเฟ้อพื้นฐาน)",
      nextLeadUp: "ยังไม่จบแค่นี้ อีกไม่กี่เดือนของน่าจะแพงขึ้นอีกประมาณ", nextLeadDown: "ข่าวดีคือ อีกไม่กี่เดือนราคาน่าจะลดลงนิดหน่อย ประมาณ",
      nextWhen: (d) => `นี่คือส่วนที่เพิ่มจากที่คุณจ่ายอยู่วันนี้ และจะหนักที่สุดราวเดือน${d.m}`,
      nextRange: (d) => `อาจอยู่ระหว่าง ${d.lo} ถึง ${d.hi} บาทต่อเดือน เราคำนวณสองวิธี วิธีหนึ่งจากราคาหน้าปั๊ม อีกวิธีจากราคาน้ำมันดิบ แล้วแสดงค่าตรงกลาง`,
      accuracy: (d) => `ส่วนนี้เป็นการประมาณ ใน 3 ปีที่ผ่านมา ตัวเลขล่วงหน้า 6 เดือนของเราคลาดจากของจริงราว ${d.rmse} จุดของอัตราเงินเฟ้อ ถ้าเดาว่าไม่มีอะไรเปลี่ยนจะคลาด ${d.naive} จุด`,
      whatifTitle: "แล้วถ้าน้ำมันดิบเปลี่ยนอีก", up10: "ขึ้นอีก 10%", up20: "ขึ้นอีก 20%", up50: "ขึ้นอีก 50%", down10: "ลดลง 10%",
      whatif: (d) => `ถ้าน้ำมันดิบ${d.dir}จากตอนนี้ ครอบครัวคุณจะจ่าย${d.more}อีกราว ${d.peak} บาทต่อเดือนในช่วงที่หนักที่สุด และ${d.prod}จะ${d.pumpDir}ประมาณลิตรละ ${d.pump} บาท ถ้ารัฐไม่เข้ามาช่วยตรึงราคา`,
      up: "ขึ้น", down: "ลง", moreWord: "เพิ่ม", lessWord: "น้อยลง", pumpUp: "แพงขึ้น", pumpDown: "ถูกลง",
      whyTitle: "ทำไมถึงเป็นแบบนี้",
      why1: (d) => `น้ำมันดิบที่โรงกลั่นไทยซื้อ (ดูไบ) คิดเป็นเงินบาท${d.dir}ประมาณ ${d.pct} ใน 12 เดือนที่ผ่านมา และราคาหน้าปั๊ม${d.prod}ขึ้นมาแล้ว ${d.pump} จากปีก่อน`,
      why2: (d) => `จากข้อมูลตั้งแต่ปี 2543 ทุกครั้งที่น้ำมันดิบแพงขึ้น 10% ราคาพลังงานในไทยจะขึ้นราว ${d.energy}% ภายในไม่กี่เดือน และของทั้งตะกร้าแพงขึ้นราว ${d.head}%`,
      why3: "อาหารและของอื่น ๆ ขึ้นช้ากว่าเพราะต้นทุนขนส่งและวัตถุดิบค่อย ๆ ส่งผ่าน แต่อยู่นานกว่า นี่คือส่วนที่ยังตามมาอีก",
      caveat: "ตัวเลขคาดการณ์มาจากสิ่งที่เคยเกิดขึ้นในอดีต ไม่ใช่คำทำนาย และยังไม่นับสิ่งที่รัฐอาจทำต่อจากนี้ เช่น ตรึงราคาดีเซลหรือลดค่าไฟ ซึ่งจะทำให้ของแพงน้อยลงหรือช้าลง",
      more: "ดูกราฟและรายละเอียดทั้งหมด", how: "อ่านวิธีคิดของเรา และทำไมถึงเชื่อถือได้",
      foot: (d) => `ข้อมูล: กระทรวงพาณิชย์ (ดัชนีราคาผู้บริโภค) สนพ. (ราคาน้ำมัน) ธนาคารโลก EIA อัปเดต ${d}`,
      loadError: "โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง",
      prod: { gasohol95: "แก๊สโซฮอล์ 95", gasohol91: "แก๊สโซฮอล์ 91", gasohol_e20: "แก๊สโซฮอล์ E20", diesel_b7: "ดีเซล" },
    },
    en: {
      brand: "Oil and the cost of living",
      h1: "Oil prices went up. How much more is your family paying each month?",
      lede: "Answer four quick questions. We will show you how much more you are already paying than a year ago, using real pump prices and the government's official price figures, and what is likely to come next.",
      pumpFact: (d) => `${d.prod} at the pump today: ${d.now} baht a litre. A year ago it was ${d.ago}.`,
      cpiFact: (m) => `How much more things cost than a year ago (inflation), as of ${m}`,
      oilFact: (d) => `Crude oil price in baht, this month compared with last month, up to ${d}`,
      qFuel: "Fuel you buy each month", litres: "litres", baht: "baht",
      fuelNone: "No vehicle", fuelMoto: "Motorbike", fuelCar: "Car", fuelHeavy: "Drive a lot",
      qFood: "Food and drinks", qElec: "Electricity, cooking gas, water", qOther: "Everything else",
      otherHint: "Rent, household items, clothes, bus and train fares, medical, school fees", bahtPerMonth: "baht a month",
      factsTitle: "Today's numbers", asOf: (d) => `Updated ${d}`, panelTitle: "Your household", perMonthHint: "All amounts are per month. Rough numbers are fine.",
      nowKicker: "Today, compared with a year ago", nextKicker: "What is still coming",
      copy: "Copy my result", shareLine: "Share on LINE", copied: "Copied",
      shareText: (d) => `Oil prices went up. My family is already paying about ${d.now} baht a month more than a year ago, with about ${d.next} more likely to come. Check yours: `,
      nowLead: "Compared with a year ago, you are already paying about", nowLeadLess: "Compared with a year ago, you are actually paying less, by about",
      nowNote: (d) => `That is ${d.pct} of your ${d.total} baht a month. Prices as of ${d.m}.`,
      nowSource: "This part uses real numbers only: pump prices from the Energy Ministry and the latest official price figures from the Commerce Ministry. Nothing here is a prediction.",
      itemFuel: "Fuel for your vehicle", itemFood: "Food and drinks", itemElec: "Electricity, gas, water", itemOther: "Everything else",
      noteFuel: (d) => `${d.prod} went from ${d.ago} to ${d.now} baht a litre, times ${d.l} litres`, noteIdx: (d) => `${d.what} prices are ${d.pct} compared with a year ago`,
      idxFood: "Food", idxElec: "Electricity, gas and water", idxOther: "General goods",
      nextLeadUp: "On top of that, prices will probably go up by about another", nextLeadDown: "The good news: prices should come down a little, by about",
      nextWhen: (d) => `That is extra on top of what you pay today, and it will be at its worst around ${d.m}.`,
      nextRange: (d) => `It could be anywhere from ${d.lo} to ${d.hi} baht a month. We worked it out two ways, one from pump prices and one from crude oil prices, and show the middle.`,
      accuracy: (d) => `This part is an estimate. Over the past 3 years, our 6-month estimates have usually been off by about ${d.rmse} percentage points on the inflation rate. Guessing "nothing will change" would have been off by ${d.naive}.`,
      whatifTitle: "What if oil prices move again?", up10: "Up another 10%", up20: "Up another 20%", up50: "Up another 50%", down10: "Down 10%",
      whatif: (d) => `If oil goes ${d.dir} from here, your family would pay about ${d.peak} baht a month ${d.more} at the worst point, and ${d.prod} would be about ${d.pump} baht a litre ${d.pumpDir}, unless the government steps in to hold prices down.`,
      up: "up", down: "down", moreWord: "more", lessWord: "less", pumpUp: "more expensive", pumpDown: "cheaper",
      whyTitle: "Why this is happening",
      whyCards: (d) => [[d.pump, `That is how much more ${d.prod} costs at the pump than a year ago. The crude oil Thailand buys, counted in baht, is ${d.dir} about ${d.crude}.`], [d.energy, `When oil prices rise 10%, energy prices in Thailand go up by about this much within a few months, and prices overall by about ${d.head}. That is based on what happened every time since 2000.`], [d.foodH, `Food prices usually peak about this long after oil goes up. Food and other goods take longer because transport and ingredient costs feed through slowly, and they stay high longer. That is the part still coming.`]],
      caveat: "The estimates are based on what happened in the past. They are not predictions, and they do not include anything the government might do next, like capping diesel prices or cutting electricity bills, which would make prices rise less or more slowly.",
      more: "See all the charts and details", how: "Read how this works and why you can trust it",
      foot: (d) => `Sources: Ministry of Commerce (price index), Energy Policy and Planning Office (fuel prices), World Bank, US EIA. Updated ${d}`,
      loadError: "Could not load the data. Please try again.",
      prod: { gasohol95: "Gasohol 95", gasohol91: "Gasohol 91", gasohol_e20: "Gasohol E20", diesel_b7: "Diesel" },
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

  const FUEL_PRESETS = [["fuelNone", 0], ["fuelMoto", 20], ["fuelCar", 80], ["fuelHeavy", 150]];
  const FOOD = [4000, 8000, 12000, 20000], ELEC = [500, 1000, 2000, 4000], OTHER = [5000, 8000, 15000, 25000];
  const WHATIF = [["up10", 10], ["up20", 20], ["up50", 50], ["down10", -10]];
  const PRODUCTS = ["gasohol95", "gasohol91", "gasohol_e20", "diesel_b7"];
  let D = null; const state = { litres: 80, product: "gasohol95", food: 8000, elec: 1000, other: 8000, whatif: 10 };

  // ---- helpers
  function chips(container, items, current, onPick) {
    container.innerHTML = "";
    items.forEach(([label, value]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", String(value === current));
      b.addEventListener("click", () => { onPick(value); render(); }); container.appendChild(b);
    });
  }
  function bars(container, rows) {
    const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
    container.innerHTML = `<div class="hbars">${rows.map((r) => `<div class="row${r.total ? " total" : ""}"><span class="lab">${r.label}${r.note ? `<small>${r.note}</small>` : ""}</span><div class="track" style="${r.value < 0 ? "justify-content:flex-end" : ""}"><div class="fill ${r.value < 0 ? "neg" : ""}" style="width:${Math.abs(r.value) / maxAbs * 100}%"></div></div><span class="val">${signed(round10(r.value), 0)}</span></div>`).join("")}</div>`;
  }
  const pumpNow = () => (D.retail.prices[state.product] != null ? D.retail.prices[state.product] : D.retail.prices.gasohol95);
  const pumpAgo = () => { const c = D.retail.compare[state.product] || D.retail.compare.gasohol95; return c ? c.year_ago : null; };
  // spend by item, in baht per month
  const spends = () => ({ fuel: state.litres * pumpNow(), food: state.food, elec: state.elec, other: state.other });
  const ITEMS = [["fuel", "vehicles_fuel", "itemFuel"], ["food", "food", "itemFood"], ["elec", "electricity_fuel_water", "itemElec"], ["other", "core", "itemOther"]];
  // extra baht per month at each horizon for a set of paths, net of what is already in prices (now_pp)
  function ahead(proj) {
    // further price-level change from today (percent) × what the household spends on each item
    const sp = spends(); const total = new Array(24).fill(0); const rows = {};
    ITEMS.forEach(([item, oc]) => {
      const lv = proj.level_ahead_pct && proj.level_ahead_pct[oc]; if (!lv) return;
      rows[item] = lv.map((pct) => sp[item] * pct / 100); rows[item].forEach((v, i) => { total[i] += v; });
    });
    const peak = total.slice(0, 12).reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), total[0]); const peakH = total.indexOf(peak) + 1;
    return { total, rows, peak, peakH };
  }
  function scenario(pct) {
    const irfs = D.irfs[D.model.primary_shock]; const sp = spends(); const total = new Array(24).fill(0);
    ITEMS.forEach(([item, oc]) => { if (irfs[oc]) irfs[oc].forEach((r, i) => { total[i] += sp[item] * r.beta * pct / 100; }); });
    const peak = total.slice(0, 12).reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), total[0]); return { peak };
  }

  function render() {
    document.documentElement.lang = lang; document.title = t("brand");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $("langToggle").textContent = lang === "th" ? "EN" : "ไทย";
    if (!D) return;
    const c = D.current, nc = c.nowcast, cpi = D.cpi_latest, r = D.retail; const pn = pumpNow(), pa = pumpAgo(); const pname = T[lang].prod[state.product];
    // facts
    $("dateline").textContent = t("asOf", dateLabel((D.generated_at || "").slice(0, 10)));
    const dl = pn - pa; const f = $("fPump"); f.textContent = signed(dl, 2); f.classList.toggle("neg", dl < 0); $("fPumpText").textContent = t("pumpFact", { prod: pname, now: num(pn, 2), ago: num(pa, 2) });
    $("fCpi").textContent = signed(cpi.headline_yoy, 1, "%"); $("fCpiText").textContent = t("cpiFact", mLabel(cpi.month));
    const s = c.shock_mtd_pct; const fo = $("fOil"); fo.textContent = signed(s, 1, "%"); fo.classList.toggle("neg", s < 0); $("fOilText").textContent = t("oilFact", dateLabel(nc.brent_latest_date));
    // inputs
    chips($("fuelChips"), FUEL_PRESETS.map(([k, v]) => [t(k), v]), state.litres, (v) => { state.litres = v; $("litres").value = v; });
    $("fuelType").innerHTML = PRODUCTS.filter((p) => r.prices[p] != null).map((p) => `<option value="${p}" ${p === state.product ? "selected" : ""}>${T[lang].prod[p]}</option>`).join("");
    chips($("foodChips"), FOOD.map((v) => [num(v), v]), state.food, (v) => { state.food = v; $("food").value = v; });
    chips($("elecChips"), ELEC.map((v) => [num(v), v]), state.elec, (v) => { state.elec = v; $("elec").value = v; });
    chips($("otherChips"), OTHER.map((v) => [num(v), v]), state.other, (v) => { state.other = v; $("other").value = v; });
    // ---- already happened (real data)
    const sp = spends(); const total = sp.fuel + sp.food + sp.elec + sp.other;
    const now = {
      fuel: state.litres * dl,
      food: sp.food * cpi.food_yoy / 100,
      elec: sp.elec * cpi.electricity_fuel_water_yoy / 100,
      other: sp.other * cpi.core_yoy / 100,
    };
    const nowTotal = now.fuel + now.food + now.elec + now.other;
    $("nowLead").textContent = nowTotal >= 0 ? t("nowLead") : t("nowLeadLess");
    const big = $("nowTotal"); big.textContent = num(round10(Math.abs(nowTotal))); big.className = nowTotal >= 0 ? "up" : "down";
    $("nowNote").textContent = t("nowNote", { total: num(total), pct: num(100 * nowTotal / Math.max(1, total), 1) + "%", m: mLabel(cpi.month) });
    bars($("nowBars"), [
      { label: t("itemFuel"), note: t("noteFuel", { prod: pname, ago: num(pa, 2), now: num(pn, 2), l: num(state.litres) }), value: now.fuel },
      { label: t("itemFood"), note: t("noteIdx", { what: t("idxFood"), pct: signed(cpi.food_yoy, 1, "%") }), value: now.food },
      { label: t("itemElec"), note: t("noteIdx", { what: t("idxElec"), pct: signed(cpi.electricity_fuel_water_yoy, 1, "%") }), value: now.elec },
      { label: t("itemOther"), note: t("noteIdx", { what: t("idxOther"), pct: signed(cpi.core_yoy, 1, "%") }), value: now.other },
    ]);
    // ---- still to come (model, combined of pump-price and crude models)
    const key = D.projections.combined ? "combined" : D.model.primary_shock;
    const ah = ahead(D.projections[key].observed_mtd);
    const months = Array.from({ length: 24 }, (_, i) => addMonths(c.month, i + 1));
    $("nextLead").textContent = ah.peak >= 0 ? t("nextLeadUp") : t("nextLeadDown");
    const nb = $("nextTotal"); nb.textContent = num(round10(Math.abs(ah.peak))); nb.className = ah.peak >= 0 ? "up" : "down";
    $("nextWhen").textContent = t("nextWhen", { m: mLabel(months[ah.peakH - 1]), total: num(round10(nowTotal + ah.peak)) });
    if (D.projections.retail_fuel) {
      const a = ahead(D.projections.retail_fuel.observed_mtd).total[ah.peakH - 1], b = ahead(D.projections[D.model.primary_shock].observed_mtd).total[ah.peakH - 1];
      $("nextRange").textContent = t("nextRange", { lo: num(round10(Math.min(a, b))), hi: num(round10(Math.max(a, b))) });
    }
    bars($("nextBars"), ITEMS.map(([item, oc, lab]) => ({ label: t(lab), value: ah.rows[item] ? ah.rows[item][ah.peakH - 1] : 0 })));
    const bt = D.backtests && (D.backtests.combined || D.backtests[D.model.primary_shock]); if (bt) { const r6 = bt.headline.by_h.find((x) => x.h === 6); if (r6) $("nextAccuracy").textContent = t("accuracy", { rmse: num(r6.rmse, 1), naive: num(r6.rmse_no_change, 1) }); }
    // ---- what if
    chips($("whatifChips"), WHATIF.map(([k, v]) => [t(k), v]), state.whatif, (v) => { state.whatif = v; });
    const sc = scenario(state.whatif);
    const perL = nc.dubai_spot_nowcast_thb / 158.987; const dPump = perL * (Math.exp(state.whatif / 100) - 1) * 1.07;
    $("whatifAnswer").textContent = t("whatif", { dir: `${t(state.whatif > 0 ? "up" : "down")} ${num(Math.abs(state.whatif))}%`, more: sc.peak >= 0 ? t("moreWord") : t("lessWord"), peak: num(round10(Math.abs(sc.peak))), prod: pname, pump: num(Math.abs(dPump), 1), pumpDir: dPump >= 0 ? t("pumpUp") : t("pumpDown") });
    // ---- why
    const irfs = D.irfs[D.model.primary_shock]; const pk = (oc) => irfs[oc].reduce((a, b) => (b.beta > a.beta ? b : a), irfs[oc][0]);
    const yoy = c.dubai_thb_yoy_pct;
    const cards = t("whyCards", { pump: signed(100 * (pn / pa - 1), 0, "%"), prod: pname, dir: yoy >= 0 ? (lang === "th" ? "แพงขึ้น" : "up") : (lang === "th" ? "ถูกลง" : "down"), crude: num(Math.abs(yoy), 0) + "%", energy: signed(pk("energy").beta * 10, 1, "%"), head: signed(pk("headline").beta * 10, 1, "%"), foodH: (lang === "th" ? "เดือนที่ " : "Month ") + pk("food").h });
    $("whyList").innerHTML = cards.map(([b, p]) => `<div class="why-card"><b>${b}</b><p>${p}</p></div>`).join("");
    // share
    const shareText = t("shareText", { now: num(round10(nowTotal)), next: num(round10(ah.peak)) });
    const url = location.href.split("#")[0];
    $("lineBtn").href = "https://social-plugins.line.me/lineit/share?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(shareText);
    $("copyBtn").onclick = () => { navigator.clipboard && navigator.clipboard.writeText(shareText + url).then(() => { $("copyDone").textContent = t("copied"); setTimeout(() => { $("copyDone").textContent = ""; }, 2000); }); };
    $("footSources").textContent = t("foot", (D.generated_at || "").slice(0, 10));
  }

  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} render(); });
  $("litres").addEventListener("input", (e) => { state.litres = +e.target.value || 0; render(); });
  $("fuelType").addEventListener("change", (e) => { state.product = e.target.value; render(); });
  $("food").addEventListener("input", (e) => { state.food = +e.target.value || 0; render(); });
  $("elec").addEventListener("input", (e) => { state.elec = +e.target.value || 0; render(); });
  $("other").addEventListener("input", (e) => { state.other = +e.target.value || 0; render(); });
  render();
  fetch("data/latest.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { D = d; render(); })
    .catch((err) => { console.error(err); const p = document.createElement("p"); p.className = "muted"; p.textContent = t("loadError"); document.querySelector("main").prepend(p); });
})();
