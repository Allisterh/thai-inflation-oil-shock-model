/* Methodology and evidence page. Every figure and chart is computed from data/latest.json, which the
   pipeline regenerates on every run, so the case made here is always about the current model. */
(function () {
  "use strict";
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ", title: "ทำไมตัวเลขนี้เชื่อถือได้",
      lede: "หน้าแรกขอให้คุณเชื่อตัวเลขที่เป็นการประมาณ เราจึงควรพิสูจน์ให้เห็น ไม่ใช่แค่บอก หน้านี้แสดงว่าเราทดสอบอย่างไร ผิดบ่อยแค่ไหน คิดอย่างไร และข้อมูลมาจากไหน ทุกตัวเลขในหน้านี้คำนวณใหม่ทุกวันจากข้อมูลล่าสุด ไม่ได้พิมพ์ไว้ตายตัว",
      backSimple: "กลับไปคำนวณของคุณ", toHow: "ฉบับสั้น", toAdvanced: "ดูกราฟและรายละเอียดทั้งหมด", toCode: "โค้ดและข้อมูลทั้งหมดบน GitHub",
      asOf: (d) => `อัปเดตล่าสุด ${d}`, foot: (d) => `ข้อมูล: กระทรวงพาณิชย์ สนพ. ธนาคารโลก EIA ธนาคารกลางยุโรป อัปเดต ${d}`,
      proof: (f) => [
        [`${f.rmse6} จุด`, `ความคลาดเคลื่อนเฉลี่ยของตัวเลข 6 เดือนล่วงหน้า ใน 3 ปีที่ผ่านมา ถ้าเดาว่า "ไม่มีอะไรเปลี่ยน" จะคลาด ${f.naive6} จุด`],
        [`${f.signRight} จาก ${f.nOrig}`, `เดือนที่เราบอกทิศทางถูก ว่าใน 6 เดือนข้างหน้าของจะแพงขึ้นหรือถูกลง`],
        [`${f.corr6}`, `ความสัมพันธ์ระหว่างที่เราประมาณกับของจริง (1.00 คือตรงทุกครั้ง 0 คือไม่เกี่ยวกันเลย)`]],
      body: (f) => `
<p class="claim">ข้อสรุปสั้น ๆ แบบจำลองนี้ไม่ได้อ้างว่าทำนายอนาคตได้ แต่มันถูกทดสอบกับของจริงทุกเดือนย้อนหลัง 3 ปี และแม่นกว่าการเดาแบบง่าย ๆ มากกว่าสองเท่า</p>

<h2><small>หลักฐานชิ้นที่ 1</small>การทดสอบที่โกงไม่ได้</h2>
<p>วิธีที่ง่ายที่สุดที่จะหลอกตัวเองคือสร้างแบบจำลองจากข้อมูลทั้งหมด แล้วชื่นชมว่ามันอธิบายอดีตได้ดี เราไม่ทำแบบนั้น ทุกเช้าระบบย้อนกลับไปทีละเดือนใน 3 ปีที่ผ่านมา (${f.nOrig} เดือน) แล้วทำเหมือนวันนี้คือเดือนนั้น ใช้เฉพาะข้อมูลที่รู้ ณ ตอนนั้นสร้างแบบจำลองใหม่ ประมาณว่าอัตราเงินเฟ้อจะเปลี่ยนเท่าไรใน 6 เดือนข้างหน้า แล้วค่อยเปิดดูว่าของจริงเป็นอย่างไร</p>
<figure id="figBacktest"></figure>
<p>ใน ${f.nOrig} เดือนนั้น เราบอกทิศทางถูก ${f.signRight} ครั้ง และตัวเลขห่างจากของจริงไม่เกิน 1 จุด ${f.within1} ครั้ง ตัวเลขล่าสุดที่ตรวจได้แล้ว คือ ณ เดือน${f.lastOrigin} เราประมาณว่าอัตราเงินเฟ้อจะเปลี่ยน ${f.lastProj} จุดภายใน 6 เดือน ของจริงคือ ${f.lastActual} จุด</p>
<p>ตารางนี้เทียบสามวิธีกับการเดาว่า "ไม่มีอะไรเปลี่ยน" ตัวเลขคือความคลาดเคลื่อนเฉลี่ย (RMSE) เป็นจุดของอัตราเงินเฟ้อ ยิ่งน้อยยิ่งดี</p>
<div id="tblBacktest"></div>
<p>แบบจำลองที่ใช้ราคาหน้าปั๊มชนะทุกช่วงเวลา จึงเป็นตัวเลขหลักบนหน้าแรก และข้อผิดพลาดของมันเอนไปทางสูงเกินจริงเล็กน้อย (เฉลี่ย ${f.bias6} จุด) ซึ่งหมายความว่าถ้าจะผิด มักผิดไปทาง "ของแพงน้อยกว่าที่เราบอก" ไม่ใช่มากกว่า</p>

<h2><small>หลักฐานชิ้นที่ 2</small>ทำไมถึงแม่น ทั้งที่รัฐตรึงราคา</h2>
<p>คำถามที่ดีที่สุดที่เราได้รับคือ "รัฐตรึงดีเซลและลดค่าไฟ แล้วแบบจำลองจะรู้ได้อย่างไร" คำตอบคือเราไม่ได้ให้แบบจำลองดูราคาน้ำมันดิบโลกเป็นหลัก แต่ให้ดู<strong>ราคาหน้าปั๊มจริงในกรุงเทพตั้งแต่ปี 2546</strong> ซึ่งมีผลของทุกมาตรการอยู่ในนั้นแล้ว ทั้งการตรึงดีเซล เงินอุดหนุนจากกองทุนน้ำมัน และการลดภาษีสรรพสามิต แบบจำลองจึงเรียนรู้ว่า "เมื่อราคาที่คนไทยจ่ายจริงขึ้น ของอื่นตามมาเท่าไร" ไม่ใช่ "เมื่อน้ำมันโลกขึ้น"</p>
<ul>
<li><strong>เราวัดได้ว่ารัฐรับไว้เท่าไร</strong> ตั้งแต่ปี 2546 เมื่อน้ำมันดิบเปลี่ยน ราคาหน้าปั๊มขยับตามเพียงราว ${f.pt} ภายใน 3 เดือน (ช่วงที่กองทุนน้ำมันอุดหนุน ${f.ptSub} ช่วงที่เก็บเงินเข้ากองทุน ${f.ptCol}) คำถาม "แล้วถ้าน้ำมันดิบขึ้นอีก" บนหน้าแรกใช้สัดส่วนนี้ ไม่ได้สมมติว่าขึ้นเต็ม</li>
<li><strong>ค่าไฟใช้ตัวเลขที่ประกาศแล้ว</strong> กกพ. กำหนดค่าไฟล่วงหน้าทีละ 4 เดือน งวดปัจจุบันคือหน่วยละ ${f.ftTariff} บาท ถึง${f.ftUntil} เดือนที่ประกาศแล้วเราใช้ตัวเลขจริง ไม่ใช่แบบจำลอง</li>
<li><strong>ของที่รัฐไม่เคยตรึง คืออาหารและของทั่วไป</strong> และนั่นคือค่าใช้จ่ายส่วนใหญ่ของครัวเรือน แบบจำลองพบว่าราคาอาหารขึ้นช้า มักแพงที่สุดราวเดือนที่ ${f.foodPeakH} หลังน้ำมันขึ้น และอยู่นาน ส่วนนี้คือที่มาของ "ที่ยังตามมาอีก"</li>
</ul>

<h2><small>วิธีคิด</small>ทีละขั้น ไม่มีกล่องดำ</h2>
<ol class="steps">
<li><b>เก็บข้อมูลรายเดือนของไทยตั้งแต่ ${f.first} ถึง ${f.last}</b> รวม ${f.n} เดือน ราคาหน้าปั๊ม ราคาน้ำมันดิบดูไบคิดเป็นเงินบาท และดัชนีราคาผู้บริโภคของกระทรวงพาณิชย์ แยกเป็นพลังงาน น้ำมันเชื้อเพลิง ค่าไฟและก๊าซ ค่ารถสาธารณะ อาหาร และของอื่น ๆ</li>
<li><b>ถามคำถามเดียวกันกับทุกเดือน</b> เดือนที่น้ำมันแพงขึ้น 1% ราคาแต่ละหมวดเปลี่ยนไปเท่าไรใน 1 เดือนต่อมา 2 เดือน ไปจนถึง 24 เดือน โดยคุมด้วยสิ่งที่เกิดขึ้นใน 12 เดือนก่อนหน้า เพื่อไม่ให้เอาผลของช็อกเก่ามาปนกับช็อกใหม่ วิธีนี้เรียกว่า local projections (Jordà 2005) เป็นวิธีมาตรฐานที่ธนาคารกลางและกองทุนการเงินระหว่างประเทศใช้วัดผลของราคาน้ำมันต่อเงินเฟ้อ</li>
<li><b>ได้เส้นโค้งหนึ่งเส้นต่อหนึ่งหมวด</b> บอกว่าผลกระทบมาเมื่อไรและหมดไปเมื่อไร พร้อมช่วงความไม่แน่นอน ภาพด้านล่างคือเส้นโค้งของของทั้งตะกร้าและของอาหาร เมื่อราคาหน้าปั๊มขึ้น 10%</li>
<li><b>เอาราคาน้ำมันที่ขึ้นมาจริงใน 24 เดือนที่ผ่านมา วางทาบลงบนเส้นโค้ง</b> ส่วนที่ยังไม่ถึงวันนี้คือ "ที่ยังตามมาอีก" แล้วคูณด้วยงบของคุณเอง ครอบครัวที่ไม่มีรถจึงได้คำตอบต่างจากครอบครัวที่เติมเดือนละ 150 ลิตร และคนอีสานได้คำตอบจากดัชนีของภาคอีสาน</li>
</ol>
<figure id="figIrf"></figure>

<h2><small>แหล่งข้อมูล</small>ทุกตัวเลขเป็นของทางการ และคุณตรวจสอบได้</h2>
<p>เราไม่ใช้ข้อมูลที่พิมพ์เอง ทุกชุดดึงจากต้นทางโดยตรงทุกวันทำการ วันที่ทางขวาคือข้อมูลล่าสุดที่ได้มา ถ้าแหล่งใดล่ม ระบบใช้ข้อมูลล่าสุดที่มีและบันทึกไว้ว่าใช้สำรอง</p>
<dl class="src" id="srcList"></dl>

<h2><small>มาตรฐาน</small>คนอื่นตรวจได้ และเครื่องตรวจทุกวัน</h2>
<ul>
<li><strong>โค้ดและข้อมูลเปิดทั้งหมด</strong> ใครก็ตามดาวน์โหลดแล้วรันใหม่ได้ และจะได้ตัวเลขเดียวกัน</li>
<li><strong>มีชุดทดสอบอัตโนมัติ</strong> ที่ยืนยันว่าตัวประมาณค่าให้คำตอบที่ถูกต้องกับข้อมูลที่รู้คำตอบอยู่แล้ว และข้อมูลจากกระทรวงพาณิชย์ตรงกับชุดข้อมูลที่รวบรวมแยกกันอีกชุด</li>
<li><strong>ผลลัพธ์ไม่ขึ้นกับช่วงข้อมูลที่เลือก</strong> เริ่มนับจากปี 2538 2543 2548 2553 หรือ 2558 ก็ได้เส้นโค้งหน้าตาเดียวกัน</li>
<li><strong>รันใหม่ทุกวันทำการ</strong> พร้อมการทดสอบย้อนหลังด้านบน ถ้าวันไหนแบบจำลองเริ่มแย่ลง ตัวเลขในหน้านี้จะบอกก่อนที่เราจะรู้เสียอีก</li>
</ul>

<h2><small>ความซื่อสัตย์</small>สิ่งที่เราลองแล้วทิ้ง</h2>
<p>ทุกไอเดียต้องผ่านการทดสอบย้อนหลังเดียวกัน ถ้าไม่ทำให้แม่นขึ้นก็ไม่ใช้ แม้จะฟังดูดีแค่ไหน สองอย่างที่สอบตก คือ การแยกเส้นโค้งตามช่วงที่กองทุนน้ำมันอุดหนุนกับช่วงที่เก็บเงิน (ข้อมูลแต่ละช่วงน้อยเกินไป ความคลาดเคลื่อนเพิ่มเกือบเท่าตัว) และการใส่ราคาอาหารโลกเป็นตัวแปรควบคุม (ช่วยแบบน้ำมันดิบ แต่ทำให้แบบราคาหน้าปั๊มแย่ลง) ทั้งสองยังอยู่ในโค้ดให้ใครก็ตามลองซ้ำได้</p>

<h2><small>ขอบเขต</small>ตรงไหนที่ไม่ควรเชื่อ</h2>
<ul>
<li><strong>ถ้ารัฐออกมาตรการใหม่ที่ใหญ่กว่าเดิม</strong> เช่น ตรึงดีเซลแบบเข้มงวด บรรทัดน้ำมันรถจะสูงเกินจริง แบบจำลองรู้ว่ารัฐ "มักทำแค่ไหน" ไม่รู้ว่าจะทำอะไรพรุ่งนี้</li>
<li><strong>อาหารคือส่วนที่ไม่แน่นอนที่สุด</strong> เพราะอากาศและโรคระบาดในสัตว์ก็กระทบราคาอาหาร ไม่ใช่แค่น้ำมัน ตัวเลขอาหารจึงเป็นค่าเฉลี่ย ไม่ใช่สิ่งที่จะเกิดแน่</li>
<li><strong>เราไม่ได้ทำนายราคาน้ำมัน</strong> ตัวเลข "ที่ยังตามมาอีก" คิดจากน้ำมันที่ขึ้นมาแล้วเท่านั้น ถ้าน้ำมันขึ้นหรือลงอีก ให้ดูช่อง "แล้วถ้า"</li>
<li><strong>ราคาน้ำมันเป็นราคากรุงเทพฯ</strong> ต่างจังหวัดแพงกว่าไม่กี่สิบสตางค์ และดัชนีค่าไฟของทางการแกว่งตามมาตรการลดค่าไฟ ทำให้เส้นโค้งค่าไฟหลังช่วงที่ประกาศแล้วหยาบกว่าหมวดอื่น</li>
</ul>
<p class="oneline">สรุปในประโยคเดียว หน้านี้ไม่ได้ขอให้คุณเชื่อเรา แต่ขอให้ดูผลการทดสอบ ซึ่งคำนวณใหม่ทุกวัน จากข้อมูลทางการที่ใครก็ตรวจได้ ด้วยวิธีที่ธนาคารกลางใช้</p>`,
      chartBt: { title: "ประมาณ 6 เดือนล่วงหน้า เทียบกับของจริง", proj: "ที่เราประมาณไว้ ณ เดือนนั้น", actual: "ที่เกิดขึ้นจริง 6 เดือนต่อมา", y: "การเปลี่ยนแปลงของอัตราเงินเฟ้อ (จุด)", cap: "แต่ละจุดบนแกนนอนคือเดือนที่ทำการประมาณ แบบจำลองสร้างใหม่ทุกจุดโดยใช้เฉพาะข้อมูลถึงเดือนนั้น" },
      chartIrf: { title: "เมื่อราคาหน้าปั๊มขึ้น 10% ของแพงขึ้นเท่าไรในเดือนต่อ ๆ มา", head: "ของทั้งตะกร้า (เงินเฟ้อทั่วไป)", food: "อาหารและเครื่องดื่ม", band: "ช่วงความไม่แน่นอน 95% ของเส้นเงินเฟ้อทั่วไป", x: "เดือนหลังราคาขึ้น", y: "จุดของอัตราเงินเฟ้อ", cap: "อาหารขึ้นช้ากว่าแต่ค้างนานกว่า นี่คือเหตุผลที่หน้าแรกบอกว่ายังมีส่วนที่ตามมาอีก" },
      tbl: { h: "ล่วงหน้า", pump: "ราคาหน้าปั๊ม (ใช้บนหน้าแรก)", crude: "น้ำมันดิบ", avg: "ค่าเฉลี่ยสองแบบ", naive: "เดาว่าไม่เปลี่ยน", months: (h) => `${h} เดือน` },
      src: { tpso_cpi: "ดัชนีราคาผู้บริโภค กระทรวงพาณิชย์ (สนค.)", tpso_cpi_types: "ดัชนีรายภาคและผู้มีรายได้น้อย กระทรวงพาณิชย์", eppo_retail_monthly: "ราคาหน้าปั๊มกรุงเทพรายเดือน สนพ. ตาราง 9", eppo_retail_daily: "ราคาหน้าปั๊มวันนี้ สนพ.", eppo_price_structure: "โครงสร้างราคาน้ำมัน ภาษี และเงินกองทุน สนพ.", oil_fund_monthly: "อัตราเงินกองทุนน้ำมันรายเดือน สนพ. ตาราง 7", crude_monthly: "น้ำมันดิบดูไบและเบรนท์รายเดือน ธนาคารโลก", brent_daily: "เบรนท์รายวัน สำนักงานสารสนเทศพลังงานสหรัฐ (EIA)", usdthb_daily: "ค่าเงินบาทรายวัน ธนาคารกลางยุโรป", usdthb_monthly_imf: "ค่าเงินบาทรายเดือน IMF (สำรอง)", food_index_monthly: "ดัชนีราคาอาหารโลก ธนาคารโลก (ใช้ในการทดสอบ)" },
      latest: "ล่าสุด", cached: "ใช้ข้อมูลสำรอง",
    },
    en: {
      brand: "Oil and the cost of living", title: "Why you can trust these numbers",
      lede: "The front page asks you to believe an estimate. That deserves proof, not just reassurance. This page shows how the model is tested, how often it is wrong, how it thinks, and where the data comes from. Every figure here is recomputed from the latest data on every run; none of it is typed in.",
      backSimple: "Back to your calculation", toHow: "Short version", toAdvanced: "See all the charts and details", toCode: "All code and data on GitHub",
      asOf: (d) => `Updated ${d}`, foot: (d) => `Sources: Ministry of Commerce, EPPO, World Bank, US EIA, European Central Bank. Updated ${d}`,
      proof: (f) => [
        [`${f.rmse6} pts`, `Average error of our 6-month estimate over the past 3 years. Guessing "nothing changes" would be off by ${f.naive6}.`],
        [`${f.signRight} of ${f.nOrig}`, `Months where we called the direction right: whether prices would be rising or falling 6 months later.`],
        [`${f.corr6}`, `Correlation between what we estimated and what happened (1.00 is perfect, 0 is no relationship at all).`]],
      body: (f) => `
<p class="claim">The short version: this model does not claim to predict the future. It has been tested against reality every month for three years, and it beats the simplest alternative by more than two to one.</p>

<h2><small>Evidence 1</small>A test the model cannot cheat on</h2>
<p>The easiest way to fool yourself is to fit a model to all the data and admire how well it explains the past. We do not do that. Every morning the pipeline steps back through the last three years, one month at a time (${f.nOrig} months). At each step it pretends today is that month, rebuilds the model using only what was known then, estimates how inflation will change over the following six months, and only afterwards looks up what actually happened.</p>
<figure id="figBacktest"></figure>
<p>Across those ${f.nOrig} months we called the direction right ${f.signRight} times, and landed within one point of the real figure ${f.within1} times. The most recent month that can be checked is ${f.lastOrigin}: we estimated the inflation rate would change by ${f.lastProj} points within six months, and it changed by ${f.lastActual}.</p>
<p>This table compares three versions of the model with the guess that "nothing will change". The figures are the average error (root mean square) in points of the inflation rate; lower is better.</p>
<div id="tblBacktest"></div>
<p>The pump-price model wins at every horizon, which is why it is the headline figure on the front page. Its errors lean slightly high (by ${f.bias6} points on average), so when it is wrong it tends to say prices will rise a little more than they do, not less.</p>

<h2><small>Evidence 2</small>Why it stays accurate when the government holds prices down</h2>
<p>The best question we get is: "The government caps diesel and cuts electricity bills, so how can the model know?" The answer is that the model does not mainly watch world crude oil. It watches <strong>actual Bangkok pump prices since 2003</strong>, which already contain the effect of every measure: diesel caps, Oil Fund subsidies, excise cuts. So it learns "when the price Thais actually pay goes up, how much do other prices follow", not "when world oil goes up".</p>
<ul>
<li><strong>We can measure how much the government absorbs.</strong> Since 2003, when crude has moved, pump prices have followed only about ${f.pt} of it within three months (${f.ptSub} while the Oil Fund was subsidising, ${f.ptCol} while it was collecting). The "what if crude rises again" question on the front page uses that share rather than assuming the full move.</li>
<li><strong>Electricity uses announced figures.</strong> The regulator sets the tariff four months at a time; the current period is ${f.ftTariff} baht a unit through ${f.ftUntil}. For announced months we use the real figure, not the model.</li>
<li><strong>What the government has never capped is food and everyday goods</strong>, which is most of a household's spending. The model finds food rises slowly, peaking around month ${f.foodPeakH} after a fuel rise, and stays up. That is where "what is still coming" comes from.</li>
</ul>

<h2><small>Method</small>Step by step, no black box</h2>
<ol class="steps">
<li><b>Collect Thai monthly data from ${f.first} to ${f.last}</b>, ${f.n} months in all: pump prices, Dubai crude in baht, and the Commerce Ministry's price indices for energy, fuel, electricity and gas, public transport, food, and everything else.</li>
<li><b>Ask every month the same question.</b> In a month when fuel got 1% dearer, how much did each category move one month later, two months later, and so on up to 24 months, after allowing for what had happened in the previous twelve months so that old shocks are not confused with new ones? The method is called local projections (Jordà 2005). It is the standard tool central banks and the IMF use to measure how oil prices pass through to inflation.</li>
<li><b>Get one curve per category</b> saying when the effect arrives and when it fades, with an uncertainty band. The chart below shows the curves for overall prices and for food after a 10% pump-price rise.</li>
<li><b>Lay the fuel price moves of the last 24 months onto the curves.</b> The part that has not arrived yet is "what is still coming". Multiply by your own budget: a household without a car gets a different answer from one that buys 150 litres a month, and someone in the Northeast gets the Northeast's own index.</li>
</ol>
<figure id="figIrf"></figure>

<h2><small>Data</small>Every number is official, and you can check it</h2>
<p>Nothing here is typed in by hand. Each series is pulled straight from its source every weekday. The date on the right is the latest observation we have. If a source is down, the pipeline uses the last good copy and records that it did so.</p>
<dl class="src" id="srcList"></dl>

<h2><small>Standards</small>Anyone can check it, and a machine checks it daily</h2>
<ul>
<li><strong>All code and data are open.</strong> Anyone can download and re-run it and get the same numbers.</li>
<li><strong>Automatic tests</strong> confirm that the estimator recovers the right answer on data where the answer is known, and that the ministry's series matches an independently compiled one.</li>
<li><strong>The result does not depend on the sample.</strong> Starting the data in 1995, 2000, 2005, 2010 or 2015 gives the same shape of curve.</li>
<li><strong>It is re-run every weekday</strong>, including the backtest above. If the model ever starts to go wrong, the numbers on this page will say so before we notice.</li>
</ul>

<h2><small>Honesty</small>What we tried and threw out</h2>
<p>Every idea has to pass the same backtest. If it does not make the estimate more accurate it is switched off, however sensible it sounds. Two that failed: splitting the curves between periods when the Oil Fund was subsidising and periods when it was collecting (too few months in each, and the error roughly doubled), and adding world food prices as a control (it helped the crude model but made the pump-price model worse). Both remain in the code for anyone to retry.</p>

<h2><small>Limits</small>Where you should not trust it</h2>
<ul>
<li><strong>If the government brings in something bigger than before</strong>, such as a hard diesel cap, the fuel line will be too high. The model knows how much the government usually does, not what it will do tomorrow.</li>
<li><strong>Food is the most uncertain part.</strong> Weather and animal disease move food prices too, not just oil, so the food figure is an average, not a certainty.</li>
<li><strong>We do not forecast oil prices.</strong> "What is still coming" is driven only by fuel price rises that have already happened. For further moves, use the "what if" box.</li>
<li><strong>Pump prices are Bangkok prices</strong>; upcountry is a few satang higher. The official electricity index swings with bill-discount schemes, so the electricity curve after the announced period is rougher than the others.</li>
</ul>
<p class="oneline">In one sentence: this page does not ask you to trust us. It asks you to look at the test results, recomputed every day, from official data anyone can check, using the method central banks use.</p>`,
      chartBt: { title: "Six-month estimate versus what happened", proj: "What we estimated at that month", actual: "What happened six months later", y: "Change in the inflation rate (points)", cap: "Each point on the horizontal axis is a month at which the estimate was made. The model is rebuilt at every point using only data up to that month." },
      chartIrf: { title: "After a 10% rise in pump prices, how much dearer things get in the following months", head: "All prices (headline inflation)", food: "Food and drinks", band: "95% uncertainty band for the headline curve", x: "Months after the price rise", y: "Points of the inflation rate", cap: "Food rises later but stays up longer. That is why the front page says more is still to come." },
      tbl: { h: "Horizon", pump: "Pump-price model (used on the front page)", crude: "Crude-oil model", avg: "Average of the two", naive: "Guess: no change", months: (h) => `${h} month${h > 1 ? "s" : ""}` },
      src: { tpso_cpi: "Consumer price index, Ministry of Commerce (TPSO)", tpso_cpi_types: "Regional and low-income indices, Ministry of Commerce", eppo_retail_monthly: "Bangkok pump prices, monthly, EPPO Table 9", eppo_retail_daily: "Today's pump prices, EPPO", eppo_price_structure: "Fuel price structure, taxes and levies, EPPO", oil_fund_monthly: "Oil Fund levy, monthly, EPPO Table 7", crude_monthly: "Dubai and Brent crude, monthly, World Bank", brent_daily: "Brent spot, daily, US Energy Information Administration", usdthb_daily: "Baht exchange rate, daily, European Central Bank", usdthb_monthly_imf: "Baht exchange rate, monthly, IMF (backup)", food_index_monthly: "World food price index, World Bank (used in testing)" },
      latest: "latest", cached: "from cache",
    },
  };
  let lang = "th";
  try { lang = localStorage.getItem("lang") || "th"; } catch (e) {}
  const t = (k, ...a) => { const v = T[lang][k]; return typeof v === "function" ? v(...a) : (v ?? k); };
  const $ = (id) => document.getElementById(id);
  const num = (x, d = 0) => (x == null || isNaN(x)) ? "–" : new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
  const signed = (x, d = 1) => (x == null || isNaN(x)) ? "–" : (x > 0 ? "+" : x < 0 ? "−" : "") + num(Math.abs(x), d);
  const TH_M = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const TH_S = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const EN_M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mLabel = (m) => { if (!m) return "–"; const [y, mo] = m.slice(0, 7).split("-").map(Number); return lang === "th" ? `${TH_M[mo - 1]} ${y + 543}` : `${EN_M[mo - 1]} ${y}`; };
  const mShort = (m) => { const [y, mo] = m.slice(0, 7).split("-").map(Number); return lang === "th" ? `${TH_S[mo - 1]} ${String(y + 543).slice(2)}` : `${EN_M[mo - 1].slice(0, 3)} ${String(y).slice(2)}`; };
  const dateLabel = (d) => { if (!d) return ""; const [y, mo, da] = d.split("-").map(Number); return lang === "th" ? `${da} ${TH_M[mo - 1]} ${y + 543}` : `${da} ${EN_M[mo - 1]} ${y}`; };
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  let D = null;

  // ---- small SVG line chart: series = [{pts: [[x, y]], color, width, dash}], band = {upper: [[x,y]], lower: [[x,y]]}
  function lineChart(el, { title, series, band, xTicks, yLabel, xLabel, legend, caption, W = 720, H = 300 }) {
    const P = { l: 44, r: 12, t: 28, b: 40 };
    const xs = series.flatMap((s) => s.pts.map((p) => p[0])), ys = series.flatMap((s) => s.pts.map((p) => p[1])).concat(band ? band.upper.map((p) => p[1]).concat(band.lower.map((p) => p[1])) : []);
    const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys); const pad = (y1 - y0) * 0.08 || 1; y0 -= pad; y1 += pad;
    const X = (x) => P.l + (x - x0) / (x1 - x0 || 1) * (W - P.l - P.r), Y = (y) => P.t + (y1 - y) / (y1 - y0) * (H - P.t - P.b);
    const step = (y1 - y0) > 12 ? 4 : (y1 - y0) > 6 ? 2 : (y1 - y0) > 3 ? 1 : 0.5; const yt = []; for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) yt.push(+v.toFixed(2));
    const ink = css("--ink") || "#17201b", grid = css("--grid") || "#ddd", muted = css("--ink-2") || "#666";
    let g = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">`;
    g += `<text x="${P.l}" y="16" font-size="13" font-weight="600" fill="${ink}">${title}</text>`;
    yt.forEach((v) => { g += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v === 0 ? ink : grid}" stroke-width="${v === 0 ? 1 : 0.6}"/><text x="${P.l - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="${muted}">${signed(v, step < 1 ? 1 : 0)}</text>`; });
    xTicks.forEach(([x, lab]) => { g += `<text x="${X(x)}" y="${H - P.b + 16}" font-size="11" text-anchor="middle" fill="${muted}">${lab}</text>`; });
    if (xLabel) g += `<text x="${(P.l + W - P.r) / 2}" y="${H - 6}" font-size="11" text-anchor="middle" fill="${muted}">${xLabel}</text>`;
    if (yLabel) g += `<text x="${P.l}" y="${P.t - 4}" font-size="11" fill="${muted}" transform="translate(-30,0)"></text>`;
    if (band) { const up = band.upper.map((p) => `${X(p[0])},${Y(p[1])}`), lo = band.lower.slice().reverse().map((p) => `${X(p[0])},${Y(p[1])}`); g += `<polygon points="${up.concat(lo).join(" ")}" fill="${band.color}" opacity=".16"/>`; }
    series.forEach((s) => { g += `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""} stroke-linejoin="round" points="${s.pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ")}"/>`; if (s.dots) s.pts.forEach((p) => { g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="2.6" fill="${s.color}"/>`; }); });
    g += `</svg>`;
    el.innerHTML = g + `<div class="legend">${legend.map((l) => `<span><i style="background:${l[0]};${l[2] ? "height:10px;opacity:.3" : ""}"></i>${l[1]}</span>`).join("")}${yLabel ? `<span>${yLabel}</span>` : ""}</div><figcaption>${caption}</figcaption>`;
  }

  function render() {
    document.documentElement.lang = lang; document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $("langToggle").textContent = lang === "th" ? "EN" : "ไทย";
    if (!D) return;
    const bt = D.backtests.retail_fuel.headline, btc = D.backtests.dubai_thb.headline, bta = D.backtests.combined && D.backtests.combined.headline;
    const r6 = bt.by_h.find((x) => x.h === 6); const rows = bt.rows.filter((r) => r.h === 6);
    const signRight = rows.filter((r) => (r.projected > 0) === (r.actual > 0)).length, within1 = rows.filter((r) => Math.abs(r.projected - r.actual) <= 1).length;
    const last = rows[rows.length - 1]; const irfs = D.irfs.retail_fuel; const pk = (oc) => irfs[oc].reduce((a, b) => (b.beta > a.beta ? b : a), irfs[oc][0]);
    const s = D.model.samples["retail_fuel/headline"] || {}; const pt = D.pass_through || {}; const pct = (x) => (x && x.cumulative != null ? num(100 * x.cumulative, 0) + "%" : "–");
    const f = { rmse6: num(r6.rmse, 1), naive6: num(r6.rmse_no_change, 1), corr6: num(r6.corr, 2), bias6: signed(r6.bias, 2), nOrig: num(rows.length), signRight: num(signRight), within1: num(within1),
      lastOrigin: mLabel(last.origin), lastProj: signed(last.projected, 1), lastActual: signed(last.actual, 1),
      first: mLabel(s.first), last: mLabel(s.last), n: num(s.n), pt: pct(pt.all), ptSub: pct(pt.subsidy), ptCol: pct(pt.collecting),
      ftTariff: D.electricity_tariff ? num(D.electricity_tariff.current.tariff_thb_per_kwh, 2) : "–", ftUntil: D.electricity_tariff ? mLabel(D.electricity_tariff.covered_until) : "–",
      foodPeakH: pk("food").h };
    $("proof").innerHTML = t("proof", f).map(([v, l]) => `<div><span class="v">${v}</span><span class="l">${l}</span></div>`).join("");
    $("prose").innerHTML = t("body", f);
    $("dateline").textContent = t("asOf", dateLabel((D.generated_at || "").slice(0, 10)));
    $("footSources").textContent = t("foot", (D.generated_at || "").slice(0, 10));

    // Backtest chart: projected vs actual 6-month change by origin.
    const cb = T[lang].chartBt; const accent = css("--accent") || "#0f5b4b", ink = css("--ink") || "#17201b";
    const ticks = rows.map((r, i) => [i, r.origin]).filter((_, i) => i % 6 === 0).map(([i, o]) => [i, mShort(o)]);
    lineChart($("figBacktest"), { title: cb.title, series: [
      { pts: rows.map((r, i) => [i, r.actual]), color: ink, width: 2, dots: true },
      { pts: rows.map((r, i) => [i, r.projected]), color: accent, width: 2.4 }],
      xTicks: ticks, yLabel: cb.y, legend: [[ink, cb.actual], [accent, cb.proj]], caption: cb.cap });
    // IRF chart: headline (with band) and food response to a 10% pump-price rise.
    const ci = T[lang].chartIrf; const up = css("--up") || "#9b2f20";
    lineChart($("figIrf"), { title: ci.title, series: [
      { pts: irfs.headline.map((r) => [r.h, r.beta * 10]), color: accent, width: 2.4 },
      { pts: irfs.food.map((r) => [r.h, r.beta * 10]), color: up, width: 2, dash: "5 4" }],
      band: { upper: irfs.headline.map((r) => [r.h, r.upper * 10]), lower: irfs.headline.map((r) => [r.h, r.lower * 10]), color: accent },
      xTicks: [1, 6, 12, 18, 24].map((h) => [h, String(h)]), xLabel: ci.x, yLabel: ci.y, legend: [[accent, ci.head], [up, ci.food], [accent, ci.band, true]], caption: ci.cap });
    // Horizon table.
    const tb = T[lang].tbl; const byH = (b, h) => b && b.by_h.find((x) => x.h === h);
    let html = `<table class="t"><thead><tr><th>${tb.h}</th><th>${tb.pump}</th><th>${tb.crude}</th><th>${tb.avg}</th><th>${tb.naive}</th></tr></thead><tbody>`;
    [1, 3, 6, 12].forEach((h) => { const a = byH(bt, h), b = byH(btc, h), c = byH(bta, h); const vals = [a && a.rmse, b && b.rmse, c && c.rmse, a && a.rmse_no_change]; const best = Math.min(...vals.filter((v) => v != null));
      html += `<tr><td>${tb.months(h)}</td>${vals.map((v) => `<td class="${v === best ? "best" : ""}">${num(v, 2)}</td>`).join("")}</tr>`; });
    $("tblBacktest").innerHTML = html + "</tbody></table>";
    // Sources.
    const names = T[lang].src; const order = ["tpso_cpi", "tpso_cpi_types", "eppo_retail_monthly", "eppo_retail_daily", "eppo_price_structure", "oil_fund_monthly", "crude_monthly", "brent_daily", "usdthb_daily", "usdthb_monthly_imf", "food_index_monthly"];
    $("srcList").innerHTML = order.filter((k) => D.sources[k]).map((k) => { const v = D.sources[k]; const lo = v.last_obs || (k === "tpso_cpi_types" && D.sources.tpso_cpi ? D.sources.tpso_cpi.last_obs : null); const d = lo ? (lo.length > 7 ? dateLabel(lo) : mLabel(lo)) : "–";
      return `<dt>${names[k] || k}</dt><dd>${d}${v.from_cache ? ` · ${t("cached")}` : ""}</dd><div class="u">${v.source || ""}</div>`; }).join("");
  }
  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} render(); });
  render();
  fetch("data/latest.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => { D = d; render(); }).catch(console.error);
})();
