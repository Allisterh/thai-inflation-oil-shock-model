/* "How it works" page. Figures are filled from data/latest.json so they stay current. */
(function () {
  "use strict";
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ", navHome: "คำนวณของคุณ", navMethod: "ทำไมถึงเชื่อถือได้", navHow: "วิธีคิดฉบับสั้น", navAdvanced: "กราฟและรายละเอียด",  title: "วิธีคิดของเรา และทำไมถึงเชื่อถือได้",
      backSimple: "กลับไปคำนวณของคุณ", toMethod: "หลักฐานและวิธีคิดฉบับเต็ม", toAdvanced: "ดูกราฟและรายละเอียดทั้งหมด", toCode: "โค้ดและข้อมูลทั้งหมดบน GitHub",
      asOf: (d) => `อัปเดตล่าสุด ${d}`, foot: (d) => `ข้อมูล: กระทรวงพาณิชย์ สนพ. ธนาคารโลก EIA ธนาคารกลางยุโรป อัปเดต ${d}`,
      body: (f) => `
<p>เว็บนี้ตอบคำถามเดียว คือเมื่อราคาน้ำมันเปลี่ยน ครอบครัวไทยจะจ่ายเพิ่มเท่าไร และเมื่อไร</p>

<h2>หน้าเว็บทำอะไรจริง ๆ</h2>
<p>คำตอบแบ่งเป็นสองส่วน และความต่างนี้สำคัญ ส่วนแรก "วันนี้ เทียบกับปีก่อน" <strong>ไม่มีการคาดการณ์เลย</strong> เราเอาราคาหน้าปั๊มวันนี้จากข้อมูลรายวันของสำนักงานนโยบายและแผนพลังงาน ราคาเมื่อปีก่อนจากแหล่งเดียวกัน และดัชนีราคาอาหาร ค่าสาธารณูปโภค และสินค้าทั่วไปของกระทรวงพาณิชย์ มาคูณกับค่าใช้จ่ายที่คุณบอกเรา ใครมีเครื่องคิดเลขกับเว็บของสองหน่วยงานนี้ก็คำนวณซ้ำได้</p>
<p>ส่วนที่สอง "ที่ยังตามมาอีก" เป็นการประมาณ เพราะราคาน้ำมันที่ขึ้นไม่ได้กระทบของทุกอย่างพร้อมกัน น้ำมันรถขยับภายในไม่กี่สัปดาห์ ส่วนอาหาร ค่ารถ และของใช้ประจำวันค่อย ๆ ขยับในปีถัดมา เมื่อต้นทุนดีเซลและปุ๋ยไหลผ่านไร่นา รถบรรทุก และโรงงาน หน้าที่เดียวของแบบจำลองคืออธิบายความล่าช้านั้น จากสิ่งที่เกิดขึ้นในประเทศไทยทุกครั้งที่ผ่านมา</p>

<h2>ประมาณการอย่างไร</h2>
<p>เราใช้ข้อมูลรายเดือนของไทยตั้งแต่ ${f.first} ถึง ${f.last} รวม ${f.n} เดือน แล้วถามคำถามง่าย ๆ กับทุกเดือน ว่าเดือนที่น้ำมันแพงขึ้น ราคาสินค้าเป็นอย่างไรในอีก 1 เดือน 2 เดือน ไปจนถึง 24 เดือนถัดมา เฉลี่ยคำตอบจากหลายร้อยเดือนก็จะได้เส้นโค้งหนึ่งเส้น คือเส้นทางปกติของราคาสินค้าไทยหลังน้ำมันขยับ วิธีนี้เรียกว่า local projections เสนอโดย Òscar Jordà ในปี 2005 และเป็นหนึ่งในสองเครื่องมือมาตรฐานที่ธนาคารกลางและกองทุนการเงินระหว่างประเทศใช้กับคำถามแบบนี้ ข้อดีคือไม่ต้องสมมติรูปร่างของเส้นโค้งล่วงหน้า ข้อมูลเป็นคนวาดเอง</p>
<p>สามทางเลือกที่ทำให้แบบจำลองนี้เป็นของไทย ไม่ใช่ตำรา</p>
<ul>
<li><strong>เราวัดราคาน้ำมันแบบที่ไทยซื้อจริง</strong> โรงกลั่นไทยอ้างอิงน้ำมันดิบดูไบ ไม่ใช่เบรนท์ และครัวเรือนจ่ายเป็นเงินบาท ราคาน้ำมันในแบบจำลองจึงเป็นดูไบคูณอัตราแลกเปลี่ยน เดือน${f.lastCrudeMonth} เบรนท์เฉลี่ย ${f.brent} ดอลลาร์ แต่ดูไบ ${f.dubai} ดอลลาร์ นี่ไม่ใช่เรื่องเล็ก</li>
<li><strong>เราใช้ราคาหน้าปั๊มจริงเป็นตัวขับหลัก</strong> แบบจำลองหลักเรียนรู้จากราคาหน้าปั๊มในกรุงเทพตั้งแต่ปี 2546 ซึ่งมีทุกการตัดสินใจของรัฐอยู่ในนั้นแล้ว ทั้งการตรึงดีเซล เงินกองทุนน้ำมัน และการลดภาษีสรรพสามิต จึงเรียนรู้ด้วยว่ารัฐมักพยุงแค่ไหน ในการทดสอบย้อนหลัง แบบนี้แม่นกว่าแบบที่ใช้น้ำมันดิบอย่างชัดเจน จึงเป็นตัวเลขหลักบนหน้าเว็บ ส่วนแบบน้ำมันดิบแสดงไว้เป็นตัวเลขเปรียบเทียบ สำหรับคำถาม "ถ้าน้ำมันดิบขึ้นอีก" เราวัดจากข้อมูลจริงว่าราคาหน้าปั๊มขยับตามน้ำมันดิบเพียงราว ${f.pt} ภายใน 3 เดือน (ช่วงที่กองทุนน้ำมันอุดหนุนอยู่ ${f.ptSub} ช่วงที่เก็บเงินเข้ากองทุน ${f.ptCol}) แล้วจึงส่งต่อเข้าแบบจำลองราคาหน้าปั๊ม</li>
<li><strong>เราประมาณเส้นโค้งแยกตามประเภทค่าใช้จ่าย และแยกตามภาค</strong> น้ำมันรถ (ดัชนีน้ำมันเชื้อเพลิงโดยตรง) ค่าไฟและก๊าซ ค่ารถสาธารณะ อาหาร และของอื่น ๆ ต่างมีเส้นโค้งของตัวเอง และเราประมาณชุดเดียวกันนี้ซ้ำสำหรับกรุงเทพฯ ภาคกลาง เหนือ อีสาน ใต้ และดัชนีผู้มีรายได้น้อยของกระทรวงพาณิชย์ ครัวเรือนอีสานที่ใช้งบไปกับอาหารเกือบครึ่งได้คำตอบต่างจากครัวเรือนกรุงเทพฯ และครอบครัวที่ไม่มีรถได้คำตอบต่างจากครอบครัวที่เติมเดือนละ 150 ลิตรมาก และควรเป็นเช่นนั้น ค่าไฟเป็นกรณีพิเศษ เพราะ กกพ. ประกาศค่าไฟล่วงหน้าทีละ 4 เดือน เดือนที่ประกาศแล้วเราจึงใช้ตัวเลขที่ประกาศ (งวดปัจจุบัน ${f.ftTariff} บาทต่อหน่วย ถึง${f.ftUntil}) แทนแบบจำลอง</li>
</ul>

<h2>ทำไมถึงเชื่อถือได้ และตรงไหนที่ไม่ควรเชื่อ</h2>
<ul>
<li><strong>ตัวเลขเป็นของทางการและผ่านการตรวจ</strong> ราคามาจากกระทรวงพาณิชย์ กระทรวงพลังงาน ธนาคารโลก สำนักงานสารสนเทศพลังงานสหรัฐ และธนาคารกลางยุโรป มีชุดทดสอบในโค้ดยืนยันว่าชุดข้อมูลของกระทรวงตรงกับชุดที่รวบรวมด้วยมืออิสระถึงทศนิยมสองตำแหน่ง</li>
<li><strong>ผลลัพธ์ไม่ขึ้นกับช่วงข้อมูลที่เลือก</strong> ประมาณใหม่โดยเริ่มปี 2538 2543 2548 2553 หรือ 2558 ได้คำตอบเดียวกันทุกครั้ง น้ำมันแพงขึ้น 10% ทำให้เงินเฟ้อทั่วไปสูงขึ้นประมาณ ${f.headPeak} จุดภายในไม่กี่เดือน และราคาพลังงานขึ้น ${f.energyPeak} จุด</li>
<li><strong>ถูกทดสอบกับของจริงทุกวัน</strong> ทุกเช้าระบบรันการทดสอบที่โกงไม่ได้ คือประมาณแบบจำลองใหม่โดยใช้เฉพาะข้อมูลที่มีอยู่ ณ แต่ละจุดในสามปีที่ผ่านมา คาดการณ์ไปข้างหน้า แล้วเทียบกับที่เกิดจริง ล่วงหน้า 6 เดือน แบบจำลองราคาหน้าปั๊มคลาดเคลื่อนราว ${f.rmse} จุดของอัตราเงินเฟ้อ ถ้าเดาว่าไม่มีอะไรเปลี่ยนจะคลาด ${f.naive} จุด หน้าเว็บพิมพ์ตัวเลขนี้ไว้ข้างค่าประมาณ และจะพิมพ์ต่อไปแม้แบบจำลองจะแย่ลง</li>
<li><strong>จับช็อกของปีนี้ได้</strong> เมื่อประมาณด้วยข้อมูลถึงธันวาคม 2568 เท่านั้น แล้วป้อนราคาน้ำมันที่เกิดขึ้นถึงมีนาคม 2569 แบบจำลองให้เงินเฟ้อทั่วไปของเดือนกันยายน 2569 ห่างจากตัวเลขจริงไม่ถึง 0.3 จุด</li>
<li><strong>บอกตรง ๆ ว่าไม่ได้นับอะไร</strong> แบบจำลองสมมติว่ารัฐทำเหมือนที่ทำมาโดยเฉลี่ย ถ้ามีมาตรการใหม่ที่ใหญ่กว่าเดิม เช่น ตรึงดีเซลแบบเข้มงวด บรรทัดน้ำมันรถและค่าไฟจะสูงเกินจริง ส่วนอาหารและของทั่วไป ซึ่งเป็นค่าใช้จ่ายส่วนใหญ่ในปีที่สอง ไม่เคยถูกปกป้องแบบนั้น ค่าประมาณแสดงเป็นช่วงเสมอ และหน้าเว็บระบุชัดว่าส่วนไหนเป็นการคาดการณ์</li>
</ul>
<h2>สิ่งที่เราลองแล้วและไม่ใช้</h2>
<p>ทุกการปรับปรุงต้องผ่านการทดสอบย้อนหลังเดียวกัน ถ้าไม่ทำให้แม่นขึ้นก็ไม่ใช้ สองอย่างที่ฟังดูดีแต่สอบตก คือ การแยกเส้นโค้งตามช่วงที่กองทุนน้ำมันอุดหนุนกับช่วงที่เก็บเงิน (ข้อมูลแต่ละช่วงน้อยเกินไป ความคลาดเคลื่อนเพิ่มเกือบเท่าตัว) และการใส่ราคาอาหารโลกของธนาคารโลกเป็นตัวแปรควบคุม (ช่วยแบบน้ำมันดิบ แต่ทำให้แบบราคาหน้าปั๊มแย่ลง) โค้ดของทั้งสองยังอยู่ในโครงการ เปิดใช้ได้ด้วยสวิตช์เดียว และราคาหน้าปั๊มรายวันย้อนหลังไม่มีแหล่งข้อมูลสาธารณะ เราจึงเก็บสะสมเองทุกวันตั้งแต่เริ่มโครงการ</p>
<p class="oneline">สรุปในประโยคเดียว เว็บนี้รวมข้อเท็จจริงที่คุณตรวจสอบได้ เข้ากับวิธีทางสถิติที่เป็นมาตรฐาน สร้างบนข้อมูลทางการของไทย ทดสอบกับโลกจริงใหม่ทุกเช้า และบอกอัตราความคลาดเคลื่อนของตัวเอง</p>`,
    },
    en: {
      brand: "Oil and the cost of living", navHome: "Your calculation", navMethod: "Why trust it", navHow: "Short version", navAdvanced: "Charts and details",  title: "How this works, and why you can trust it",
      backSimple: "Back to your calculation", toMethod: "Full evidence and method", toAdvanced: "See all the charts and details", toCode: "All code and data on GitHub",
      asOf: (d) => `Updated ${d}`, foot: (d) => `Sources: Ministry of Commerce, EPPO, World Bank, US EIA, European Central Bank. Updated ${d}`,
      body: (f) => `
<p>This page answers one question: when oil prices move, how much more does a Thai household end up paying, and when?</p>

<h2>What the page actually does</h2>
<p>It answers in two parts, and the distinction matters. The first part, "today compared with a year ago", <strong>contains no forecasting at all</strong>. It takes the price you pay at the pump today from the Energy Ministry's daily feed, the price a year ago from the same source, and the official price indices for food, utilities and other goods from the Commerce Ministry, and multiplies them by what you told us you spend. Anyone with a calculator and the two government websites could reproduce it.</p>
<p>The second part, "what is still coming", is an estimate. Oil price rises do not hit all prices at once. Fuel moves within weeks; food, transport fares and everyday goods move over the following year as higher diesel and fertiliser costs work through farms, trucks and factories. The model's only job is to describe that delay, using what has happened in Thailand every time before.</p>

<h2>How the estimate is made</h2>
<p>We take Thai monthly data from ${f.first} to ${f.last}, ${f.n} months in all, and ask a simple question of each month: when oil got more expensive that month, what happened to prices one month later, two months later, and so on up to 24 months later? Averaging that answer across hundreds of months gives a curve: the typical path of Thai prices after an oil move. The method is called local projections. It was introduced by Òscar Jordà in 2005 and is one of the two standard tools central banks and the IMF use for exactly this question. Its appeal is that it does not assume a shape for the curve in advance; the data draws it.</p>
<p>Three choices make this version fit Thailand rather than a textbook:</p>
<ul>
<li><strong>We measure oil the way Thailand buys it.</strong> Thai refineries price against Dubai crude, not Brent, and households pay in baht, so the oil price in the model is Dubai converted at the exchange rate. In ${f.lastCrudeMonth} Brent averaged ${f.brent} dollars and Dubai ${f.dubai}, so this is not a cosmetic choice.</li>
<li><strong>Real pump prices are the main driver.</strong> The headline model learns from Bangkok pump prices since 2003, which already contain every government decision: diesel caps, Oil Fund subsidies, excise cuts. So it also learns how much the government typically cushions a shock. In backtesting it is clearly more accurate than the crude-oil version, so it is the headline number on the page; the crude version is shown alongside for comparison. For the "what if crude rises again" question we measure from the data that pump prices follow only about ${f.pt} of a crude move within three months (${f.ptSub} while the Oil Fund is subsidising, ${f.ptCol} while it is collecting), and feed that into the pump-price model.</li>
<li><strong>We estimate the curve separately for each kind of spending, and for each region.</strong> Vehicle fuel (the fuel index itself), electricity and gas, public transport, food, and everything else each get their own curve, and the same set is estimated again for Bangkok, the Central, North, Northeast and South regions and for the Commerce Ministry's low-income index. A Northeastern household that spends almost half its budget on food gets a different answer from a Bangkok one, and a household without a car gets a very different answer from one that fills up 150 litres a month, as it should. Electricity is a special case: the regulator sets the tariff four months at a time, so for months already announced we use the announced figure (currently ${f.ftTariff} baht a unit through ${f.ftUntil}) instead of the model.</li>
</ul>

<h2>Why you can trust it, and where you should not</h2>
<ul>
<li><strong>The numbers are official and checked.</strong> Prices come from the Ministry of Commerce, the Energy Ministry, the World Bank, the US Energy Information Administration and the European Central Bank. A test in the code confirms the ministry's series matches an independently curated version to two decimal places.</li>
<li><strong>The result does not depend on the sample.</strong> Re-estimating from 1995, 2000, 2005, 2010 or 2015 gives the same answer each time: a 10% oil rise lifts headline inflation by about ${f.headPeak} of a point within a few months and energy prices by about ${f.energyPeak} points.</li>
<li><strong>It is tested against reality every day.</strong> Each morning the pipeline re-runs a test it cannot cheat on: it re-estimates the model using only data available at each point in the last three years, projects forward, and compares with what happened. Six months ahead, the pump-price model's typical error is about ${f.rmse} of a point of inflation. Guessing that nothing would change produces an error of about ${f.naive}. The page prints this number next to the estimate, and will keep printing it if the model gets worse.</li>
<li><strong>It caught this year's shock.</strong> Fitted only on data to December 2025 and given the oil moves to March 2026, it put September 2026 headline inflation within 0.3 points of the actual figure.</li>
<li><strong>It says what it leaves out.</strong> It assumes the government behaves as it has on average. A new, larger intervention, such as a hard diesel cap, would make the fuel and electricity lines too high. Food and general goods, which are most of the second-year cost, have never been shielded that way. Estimates are shown as ranges, and the page labels the forecast half as a forecast.</li>
</ul>
<h2>What we tried and did not keep</h2>
<p>Every refinement has to pass the same backtest; if it does not improve accuracy it is switched off. Two ideas that sound right but failed: splitting the curves between periods when the Oil Fund was subsidising and periods when it was collecting (too few months in each regime, and the error roughly doubled), and adding the World Bank's world food price index as a control (it helped the crude model but made the pump-price model worse). Both remain in the code behind a single switch. A daily history of pump prices is not published anywhere, so the project has been collecting its own since it started.</p>
<p class="oneline">In one sentence: the page combines facts you can check with a well-established statistical method, built on official Thai data, that is re-tested against the real world every morning and tells you its own error rate.</p>`,
    },
  };
  let lang = "th";
  try { lang = localStorage.getItem("lang") || "th"; } catch (e) {}
  const t = (k, ...a) => { const v = T[lang][k]; return typeof v === "function" ? v(...a) : (v ?? k); };
  const $ = (id) => document.getElementById(id);
  const num = (x, d = 0) => (x == null || isNaN(x)) ? "–" : new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
  const TH_M = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const EN_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mLabel = (m) => { if (!m) return "–"; const [y, mo] = m.slice(0, 7).split("-").map(Number); return lang === "th" ? `${TH_M[mo - 1]} ${y + 543}` : `${EN_M[mo - 1]} ${y}`; };
  const dateLabel = (d) => { if (!d) return ""; const [y, mo, da] = d.split("-").map(Number); return lang === "th" ? `${da} ${TH_M[mo - 1]} ${y + 543}` : `${da} ${EN_M[mo - 1]} ${y}`; };
  let D = null;
  const pct = (x) => (x && x.cumulative != null ? num(100 * x.cumulative, 0) + "%" : "–");
  function render() {
    document.documentElement.lang = lang; document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $("langToggle").textContent = lang === "th" ? "EN" : "ไทย";
    if (!D) return;
    const s = D.model.samples["dubai_thb/headline"] || {}; const irfs = D.irfs[D.model.primary_shock];
    const pk = (oc) => irfs[oc].reduce((a, b) => (b.beta > a.beta ? b : a), irfs[oc][0]);
    const bt = D.backtests && D.backtests.retail_fuel; const r6 = bt ? bt.headline.by_h.find((x) => x.h === 6) : null;
    const f = { first: mLabel(s.first), last: mLabel(s.last), n: num(s.n), lastCrudeMonth: mLabel(D.current.dubai_last_month),
      brent: num(D.current.brent_last_usd, 0), dubai: num(D.current.dubai_last_usd, 0),
      headPeak: num(pk("headline").beta * 10, 1), energyPeak: num(pk("energy").beta * 10, 0),
      rmse: r6 ? num(r6.rmse, 1) : "–", naive: r6 ? num(r6.rmse_no_change, 1) : "–",
      pt: pct(D.pass_through && D.pass_through.all), ptSub: pct(D.pass_through && D.pass_through.subsidy), ptCol: pct(D.pass_through && D.pass_through.collecting),
      ftTariff: D.electricity_tariff ? num(D.electricity_tariff.current.tariff_thb_per_kwh, 2) : "–", ftUntil: D.electricity_tariff ? mLabel(D.electricity_tariff.covered_until) : "–" };
    $("prose").innerHTML = t("body", f);
    $("dateline").textContent = t("asOf", dateLabel((D.generated_at || "").slice(0, 10)));
    $("footSources").textContent = t("foot", (D.generated_at || "").slice(0, 10));
  }
  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} render(); });
  render();
  fetch("data/latest.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => { D = d; render(); }).catch(console.error);
})();
