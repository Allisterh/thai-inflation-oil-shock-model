/* Thai oil-shock → cost of living, v2. Plain JS, no build step.
   Reads data/latest.json written by `python -m thai_oil_cpi run`. */
(function () {
  "use strict";

  // ---------------------------------------------------------------- i18n
  const OUTCOME_NAMES = {
    th: { headline: "เงินเฟ้อทั่วไป", energy: "พลังงาน", vehicles_fuel: "ยานพาหนะและน้ำมันเชื้อเพลิง", electricity_fuel_water: "ค่าไฟ ก๊าซหุงต้ม น้ำประปา", public_transport: "ค่าโดยสารสาธารณะ", food: "อาหารและเครื่องดื่ม", core: "เงินเฟ้อพื้นฐาน" },
    en: { headline: "Headline inflation", energy: "Energy", vehicles_fuel: "Vehicles and fuel", electricity_fuel_water: "Electricity, cooking gas, water", public_transport: "Public transport", food: "Food and drink", core: "Core inflation" },
  };
  const CAT_NAMES = {
    th: { vehicles_fuel: "น้ำมันรถและค่าดูแลรถ", electricity_fuel_water: "ค่าไฟ ก๊าซหุงต้ม น้ำประปา", public_transport: "ค่าโดยสารสาธารณะ", food: "อาหารและเครื่องดื่ม", other: "อื่น ๆ (ที่พัก เสื้อผ้า สุขภาพ การศึกษา)" },
    en: { vehicles_fuel: "Vehicle fuel and upkeep", electricity_fuel_water: "Electricity, cooking gas, water", public_transport: "Public transport", food: "Food and drink", other: "Everything else (rent, clothes, health, school)" },
  };
  const PRODUCT_NAMES = {
    th: { gasohol95: "แก๊สโซฮอล์ 95", gasohol91: "แก๊สโซฮอล์ 91", gasohol_e20: "แก๊สโซฮอล์ E20", gasohol_e85: "แก๊สโซฮอล์ E85", ulg95_premium: "เบนซิน 95", diesel_b7: "ดีเซล B7", premium_diesel: "ดีเซลพรีเมียม", diesel_b20: "ดีเซล B20" },
    en: { gasohol95: "Gasohol 95", gasohol91: "Gasohol 91", gasohol_e20: "Gasohol E20", gasohol_e85: "Gasohol E85", ulg95_premium: "Premium ULG 95", diesel_b7: "Diesel B7", premium_diesel: "Premium diesel", diesel_b20: "Diesel B20" },
  };
  const STRUCT_NAMES = {
    th: { ex_refinery: "ราคาหน้าโรงกลั่น", discount: "ส่วนลด", excise: "ภาษีสรรพสามิต", municipal_tax: "ภาษีเทศบาล", oil_fund: "กองทุนน้ำมัน", conservation_fund: "กองทุนอนุรักษ์พลังงาน", vat_ws: "ภาษีมูลค่าเพิ่ม (ขายส่ง)", marketing: "ค่าการตลาด", vat_mm: "ภาษีมูลค่าเพิ่ม (ค่าการตลาด)", retail: "ราคาขายปลีก" },
    en: { ex_refinery: "Ex-refinery price", discount: "Discount", excise: "Excise tax", municipal_tax: "Municipal tax", oil_fund: "Oil Fund levy", conservation_fund: "Energy conservation fund", vat_ws: "VAT on wholesale", marketing: "Marketing margin", vat_mm: "VAT on margin", retail: "Retail price" },
  };
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ", navHome: "คำนวณของคุณ", navMethod: "ทำไมถึงเชื่อถือได้", navAdvanced: "กราฟและรายละเอียด",  backSimple: "กลับหน้าหลัก", howLink: "วิธีคิด",
      h1: "น้ำมันแพงขึ้นวันนี้ ครอบครัวคุณจะจ่ายเพิ่มเท่าไร และเมื่อไร",
      lede: "หน้านี้ติดตามราคาน้ำมันดิบดูไบ ซึ่งเป็นราคาอ้างอิงที่โรงกลั่นไทยซื้อจริง ควบคู่กับเบรนท์รายวันและค่าเงินบาท แล้วใช้ดัชนีราคาผู้บริโภครายเดือนของกระทรวงพาณิชย์ตั้งแต่ปี 2543 ประมาณว่าราคาน้ำมันที่เปลี่ยนไปจะดันเงินเฟ้อ ราคาพลังงาน ค่าเดินทาง และราคาอาหารขึ้นเท่าไร ในอีกกี่เดือน และหมายถึงเงินกี่บาทต่อเดือนสำหรับครอบครัวของคุณ",
      boardTitle: "กระดานราคาวันนี้", tileDubai: (m) => `น้ำมันดิบดูไบ เฉลี่ย${m}`, unitUsdBbl: "ดอลลาร์ต่อบาร์เรล", perLitre: (v) => `≈ ${v} บาทต่อลิตร`,
      tileBrent: "เบรนท์ ราคาตลาดจรล่าสุด", brentSub: (d) => `${d} ดอลลาร์ต่อบาร์เรล (EIA)`, tileFx: "ค่าเงิน", unitThbUsd: "บาทต่อดอลลาร์",
      tileG95: "แก๊สโซฮอล์ 95 หน้าปั๊ม", tileDiesel: "ดีเซล หน้าปั๊ม", pumpSub: (d) => `บาทต่อลิตร ${d} กรุงเทพ`,
      tileShock: "น้ำมันดิบเป็นบาท เทียบเดือนก่อน", shockSub: "ประมาณการเดือนนี้จนถึงวันนี้",
      boardNote: (d) => `ราคาดูไบรายเดือนล่าสุดคือ${d.m} ที่ ${d.dubai} ดอลลาร์ ขณะที่เบรนท์เฉลี่ย ${d.brent} ดอลลาร์ ส่วนต่างกว้างกว่าปกติ สำหรับเดือนนี้ยังไม่มีตัวเลขดูไบ จึงประมาณจากเบรนท์รายวัน (เฉลี่ย ${d.brentMtd} ดอลลาร์ใน ${d.days} วันทำการ) คูณสัดส่วนดูไบต่อเบรนท์ของเดือนล่าสุด (${d.ratio}) ได้ประมาณ ${d.nowcast} ดอลลาร์ หรือ ${d.nowcastL} บาทต่อลิตร ถ้าราคาวันนี้คงอยู่ทั้งเดือน ช็อกจะเท่ากับ ${d.spot}`,
      nowTitle: "เงินเฟ้อไทยล่าสุด", yoyLabel: "เทียบปีก่อน", prevMonth: (v) => `เดือนก่อน ${v}`,
      calcTitle: "สำหรับครอบครัวของคุณ", spendLabel: "ค่าใช้จ่ายครัวเรือนต่อเดือน (บาท)",
      basisLegend: "ใช้ราคาน้ำมันแบบไหน", basisMtd: "ราคาที่เกิดขึ้นแล้ว รวมเดือนนี้จนถึงวันนี้", basisSpot: "ราคาที่เกิดขึ้นแล้ว ถ้าราคาวันนี้คงอยู่ทั้งเดือน", basisCustom: "สมมติเอง น้ำมันดิบเปลี่ยนครั้งเดียว",
      sharesTitle: "สัดส่วนค่าใช้จ่ายของครอบครัวคุณ", sharesHint: "ค่าเริ่มต้นคือน้ำหนักตะกร้าดัชนีราคาผู้บริโภคของกระทรวงพาณิชย์ ปรับให้ตรงกับครอบครัวคุณได้",
      shareOther: (v) => `ที่เหลือ ${v} ของค่าใช้จ่ายคือหมวดอื่น ๆ ซึ่งใช้ผลต่อเงินเฟ้อพื้นฐานเป็นตัวแทน`,
      advanced: "ตัวเลือกแบบจำลอง", shockCombined: "ค่ากลางของสองแบบจำลอง (ค่าเริ่มต้น)", shockRetail: "จากราคาหน้าปั๊มจริง (รวมการพยุงของรัฐแล้ว)", shockDubaiThb: "จากน้ำมันดิบดูไบเป็นบาท", shockDubaiUsd: "จากน้ำมันดิบดูไบเป็นดอลลาร์", shockBrentUsd: "จากเบรนท์เป็นดอลลาร์",
      combinedNote: "ค่ากลางคือค่าเฉลี่ยของแบบจำลองที่ใช้ราคาหน้าปั๊มจริง กับแบบจำลองที่ใช้น้ำมันดิบ ช่วงที่แสดงครอบคลุมช่วงความเชื่อมั่นของทั้งสอง",
      btTitle: "แบบจำลองแม่นแค่ไหนในช่วง 3 ปีที่ผ่านมา", btSub: "ทดสอบย้อนหลังแบบไม่ใช้ข้อมูลอนาคต ประมาณแบบจำลองใหม่ทุกเดือน แล้วเทียบการเปลี่ยนแปลงของเงินเฟ้อทั่วไปที่ทำนายกับที่เกิดจริง (จุดเปอร์เซ็นต์)",
      btModel: "แบบจำลอง", btH: "ล่วงหน้า", btRmse: "คลาดเคลื่อนเฉลี่ย (RMSE)", btNaive: "ถ้าทายว่าไม่เปลี่ยน", btCorr: "สหสัมพันธ์", btMonths: (h) => `${h} เดือน`,
      btChartTitle: "ทำนายล่วงหน้า 6 เดือน เทียบกับที่เกิดจริง (การเปลี่ยนแปลงของเงินเฟ้อทั่วไป จุดเปอร์เซ็นต์)", btProjected: "ที่แบบจำลองทำนาย", btActual: "ที่เกิดจริง",
      asymNote: (d) => `เมื่อแยกช่วงน้ำมันขึ้นกับลง ผลจากน้ำมันแพงขึ้น 10% ต่อเงินเฟ้อทั่วไปที่ 12 เดือนคือ ${d.up} จุด ส่วนน้ำมันถูกลง 10% คือ ${d.down} จุด ความแตกต่างอยู่ในช่วงความคลาดเคลื่อน จึงใช้ค่าเดียวกันทั้งสองทิศทาง`,
      ansPeak: "ช่วงที่หนักที่สุด คุณจะจ่ายเพิ่มประมาณ", perMonth: "บาทต่อเดือน", ansYear: "รวม 12 เดือนข้างหน้า", baht: "บาท",
      ansInfl: "เงินเฟ้อทั่วไปจะสูงกว่าที่ควรจะเป็น", pp: "จุดเปอร์เซ็นต์",
      inMonth: (m) => `ในเดือน${m}`, yearSub: (v) => `ถ้าตะกร้าของคุณเหมือนครัวเรือนเฉลี่ย จะเป็น ${v} บาท`,
      breakTitle: "จ่ายเพิ่มรวม 12 เดือน แยกตามหมวด (บาท)", breakSub: (s) => `คิดจากค่าใช้จ่าย ${s} บาทต่อเดือน และสัดส่วนที่ตั้งไว้`,
      pathTitle: "ผลต่อเงินเฟ้อไทยใน 24 เดือนข้างหน้า (จุดเปอร์เซ็นต์ของอัตราเงินเฟ้อเทียบปีก่อน)",
      pathSubObserved: (s) => `รวมผลจากการเปลี่ยนแปลงราคาน้ำมันดิบที่เกิดขึ้นแล้วใน 24 เดือนล่าสุด รวมเดือนนี้ (${s})`,
      pathSubCustom: (s) => `ถ้าราคาน้ำมันดิบเปลี่ยน ${s} ในเดือนนี้ครั้งเดียว`,
      pathSeries: "ดัชนี", tableView: "ดูเป็นตาราง", month: "เดือน", impact: "ผล (จุด)", low: "ต่ำสุด", high: "สูงสุด", extra: "จ่ายเพิ่ม (บาท/เดือน)", category: "หมวด", share: "สัดส่วน", peak: "สูงสุดต่อเดือน", year1: "รวม 12 เดือน", total: "รวม",
      pumpTitle: "ที่ปั๊มน้ำมัน",
      pumpIntro: "สำนักงานนโยบายและแผนพลังงานเผยแพร่โครงสร้างราคาน้ำมันทุกวัน ภาษีสรรพสามิต ภาษีเทศบาล เงินกองทุน และค่าการตลาดคิดเป็นบาทต่อลิตรคงที่ ส่วนที่ขยับตามตลาดโลกคือราคาหน้าโรงกลั่น บวกภาษีมูลค่าเพิ่ม 7% ด้านล่างคำนวณว่าถ้าน้ำมันดิบเปลี่ยนเท่ากับที่เลือกไว้ข้างบน หน้าปั๊มจะขยับกี่บาท ก่อนที่รัฐจะใช้กองทุนน้ำมันพยุงหรือไม่",
      pumpProduct: "ชนิดน้ำมัน", pumpPrice: "ราคาหน้าปั๊มวันนี้ (บาทต่อลิตร)", pumpPass: "กองทุนน้ำมันพยุงแค่ไหน",
      passFull: "ไม่พยุง ส่งผ่านเต็มที่ (100%)", passHalf: "พยุงครึ่งหนึ่ง (50%)", passMost: "ตรึงราคาเกือบทั้งหมด (25%)",
      pumpResult: "ราคาหน้าปั๊มโดยประมาณ", thbL: "บาทต่อลิตร",
      pumpDelta: (d) => `น้ำมันดิบเปลี่ยน ${d.pct} จาก ${d.from} เป็น ${d.to} บาทต่อลิตร ราคาหน้าโรงกลั่นขยับ ${d.exref} บาท รวมภาษีมูลค่าเพิ่มและการพยุง หน้าปั๊มขยับ ${d.pump} บาทต่อลิตร`,
      structTitle: (p, d) => `โครงสร้างราคา${p} วันที่ ${d}`, structSub: (v) => `ราคาหน้าโรงกลั่นคิดเป็น ${v} ของราคาขายปลีก ส่วนที่เหลือคือภาษี กองทุน และค่าการตลาด`,
      oilTitle: "ราคาน้ำมันดิบ", brentChartTitle: "เบรนท์ ราคาตลาดจรรายวัน ดอลลาร์ต่อบาร์เรล",
      crudeChartTitle: "ดูไบกับเบรนท์ เฉลี่ยรายเดือน ดอลลาร์ต่อบาร์เรล", crudeChartSub: "โรงกลั่นไทยซื้อน้ำมันดิบตะวันออกกลางที่อ้างอิงราคาดูไบ ส่วนต่างระหว่างสองราคานี้บางช่วงกว้างมาก",
      retailChartTitle: "ราคาขายปลีกในกรุงเทพ เฉลี่ยรายเดือน บาทต่อลิตร",
      d1w: "1 สัปดาห์", d1m: "1 เดือน", d3m: "3 เดือน", d1y: "1 ปี", dubaiLegend: "ดูไบ", brentLegend: "เบรนท์",
      modelTitle: "แบบจำลองบอกอะไร",
      modelSummary: (m) => `ประมาณด้วยวิธี local projections จากข้อมูลรายเดือน ${m.first} ถึง ${m.last} (${m.n} เดือน) น้ำมันดิบดูไบในรูปเงินบาทแพงขึ้น 10% ทำให้เงินเฟ้อทั่วไปเทียบปีก่อนสูงขึ้นประมาณ ${m.h1} จุดในเดือนถัดไป สูงสุด ${m.peak} จุดในเดือนที่ ${m.peakH} แล้วค่อย ๆ หายไปภายในสองปี ดัชนีพลังงานขึ้นแรงและเร็ว (สูงสุด ${m.energy} จุด) ส่วนอาหารและเงินเฟ้อพื้นฐานขยับช้ากว่าแต่นานกว่า (อาหารสูงสุด ${m.food} จุดในเดือนที่ ${m.foodH}) แบบจำลองประมาณใหม่ทุกครั้งที่ข้อมูลอัปเดต`,
      irfTitle: "ถ้าน้ำมันดิบแพงขึ้น 10% ดัชนีแต่ละตัวเปลี่ยนกี่จุดในแต่ละเดือนถัดไป", irfSub: "เส้นคือค่าประมาณ แถบคือช่วงความเชื่อมั่น 95%",
      histTitle: "ข้อมูลที่ใช้ประมาณ ตั้งแต่ปี 2543", cpiLegendHead: "เงินเฟ้อทั่วไป เทียบปีก่อน (%)", cpiLegendEnergy: "ดัชนีพลังงาน เทียบปีก่อน (%)", shockLegend: "การเปลี่ยนแปลงราคาดูไบเป็นบาท จากเดือนก่อน (%)",
      horizon: (h) => `เดือนที่ ${h}`,
      aboutTitle: "วิธีคิดและข้อจำกัด",
      aboutBody: `<p>แบบจำลองวัดว่าในอดีต เมื่อราคาน้ำมันดิบดูไบในรูปเงินบาทเฉลี่ยรายเดือนเปลี่ยนไป 1% ดัชนีราคาผู้บริโภคแต่ละชุด (เทียบปีก่อน) เปลี่ยนไปกี่จุดในแต่ละเดือนถัดไปจนถึง 24 เดือน โดยควบคุมค่าในอดีต 12 เดือนของทั้งดัชนีและราคาน้ำมัน (Jordà 2005, ค่าคลาดเคลื่อนมาตรฐานแบบ Newey–West) ตัวเลขในหน้านี้คือค่าประมาณนั้นคูณกับการเปลี่ยนแปลงของราคาน้ำมันที่เกิดขึ้นจริงในแต่ละเดือนย้อนหลัง หรือที่คุณสมมติ</p>
<p>ข้อควรรู้</p><ul>
<li>ใช้ราคาดูไบเพราะโรงกลั่นไทยนำเข้าน้ำมันดิบตะวันออกกลางที่อ้างอิงดูไบเป็นหลัก และคิดเป็นเงินบาทเพื่อรวมผลค่าเงิน ราคาดูไบรายเดือนมาจากธนาคารโลก ส่วนเดือนปัจจุบันประมาณจากเบรนท์รายวันคูณสัดส่วนดูไบต่อเบรนท์ล่าสุด ซึ่งคลาดเคลื่อนได้ถ้าส่วนต่างเปลี่ยนเร็ว</li>
<li>เป็นความสัมพันธ์ทางสถิติจากอดีต ไม่ใช่คำพยากรณ์ และไม่รวมนโยบายในปัจจุบัน เช่น การตรึงราคาดีเซลด้วยกองทุนน้ำมัน มาตรการค่าไฟ หรือดอกเบี้ย ซึ่งทำให้ผลจริงเล็กกว่าหรือช้ากว่านี้ได้</li>
<li>สมมติว่าผลเป็นเส้นตรงและสมมาตร ช็อกขนาดใหญ่มากหรือราคาที่ลดลงอาจไม่เป็นไปตามนี้ ช่วงความเชื่อมั่นของเส้นทางที่รวมหลายช็อกเป็นค่าประมาณที่ไม่รวมความสัมพันธ์ระหว่างสัมประสิทธิ์</li>
<li>ค่าใช้จ่ายที่เพิ่มคิดจากค่าใช้จ่ายรวมคูณสัดส่วนแต่ละหมวดคูณผลต่อดัชนีของหมวดนั้น หมวดอื่น ๆ ใช้เงินเฟ้อพื้นฐานเป็นตัวแทน</li>
<li>ดัชนีราคาผู้บริโภคและน้ำหนักตะกร้ามาจาก API ของสำนักงานนโยบายและยุทธศาสตร์การค้า กระทรวงพาณิชย์ ราคาหน้าปั๊มและโครงสร้างราคาจากสำนักงานนโยบายและแผนพลังงาน ทั้งหมดอัปเดตอัตโนมัติทุกวัน</li></ul>`,
      sourcesTitle: "แหล่งข้อมูลและสถานะการอัปเดต",
      srcCpi: "ดัชนีราคาผู้บริโภคไทย รายเดือน ทุกหมวด", srcCrude: "น้ำมันดิบดูไบ เบรนท์ รายเดือน", srcFx: "ค่าเงินบาท รายเดือน", srcBrent: "เบรนท์ รายวัน", srcFxDaily: "ค่าเงินบาท รายวัน",
      srcRetail: "ราคาหน้าปั๊ม รายวัน", srcStruct: "โครงสร้างราคาน้ำมัน", srcRetailHist: "ราคาขายปลีก รายเดือน", srcModel: "ประมาณแบบจำลองล่าสุด",
      lastObs: (d) => `ข้อมูลล่าสุด ${d}`, fromCache: "ใช้ข้อมูลที่เก็บไว้ล่าสุด",
      foot: "แบบจำลองโดย Thai Leetrakul เผยแพร่ภายใต้สัญญาอนุญาต MIT ตัวเลขทั้งหมดเป็นการประมาณเชิงสถิติ ไม่ใช่คำพยากรณ์",
      loadError: "โหลดข้อมูลไม่สำเร็จ ลองรัน python -m thai_oil_cpi run แล้วเปิดหน้านี้ใหม่",
    },
    en: {
      brand: "Oil and the cost of living", navHome: "Your calculation", navMethod: "Why trust it", navAdvanced: "Charts and details",  backSimple: "Back to the simple page", howLink: "How it works",
      h1: "When oil prices go up, how much more will your household pay, and when",
      lede: "This page follows Dubai crude, the benchmark Thai refineries actually buy against, alongside daily Brent and the baht. It uses the Ministry of Commerce's monthly consumer price indices since 2000 to estimate how an oil price move feeds into inflation, energy prices, travel costs and food prices, how many months later, and what that means in baht per month for your household.",
      boardTitle: "Today's board", tileDubai: (m) => `Dubai crude, ${m} average`, unitUsdBbl: "US dollars per barrel", perLitre: (v) => `≈ ${v} baht per litre`,
      tileBrent: "Brent spot, latest", brentSub: (d) => `${d}, dollars per barrel (EIA)`, tileFx: "Exchange rate", unitThbUsd: "baht per dollar",
      tileG95: "Gasohol 95 at the pump", tileDiesel: "Diesel at the pump", pumpSub: (d) => `baht per litre, ${d}, Bangkok`,
      tileShock: "Crude in baht versus last month", shockSub: "month to date, estimated",
      boardNote: (d) => `The latest monthly Dubai price is ${d.m} at ${d.dubai} dollars, while Brent averaged ${d.brent} dollars, an unusually wide gap. Dubai for the current month is not published yet, so it is estimated from daily Brent (averaging ${d.brentMtd} dollars over ${d.days} trading days) times last month's Dubai-to-Brent ratio (${d.ratio}): about ${d.nowcast} dollars, or ${d.nowcastL} baht per litre. If today's price held all month the shock would be ${d.spot}.`,
      nowTitle: "Thai inflation, latest", yoyLabel: "year on year", prevMonth: (v) => `previous month ${v}`,
      calcTitle: "For your household", spendLabel: "Household spending per month (baht)",
      basisLegend: "Which oil price to use", basisMtd: "What has already happened, including this month to date", basisSpot: "What has already happened, with today's price held all month", basisCustom: "My own one-off change in crude",
      sharesTitle: "Your household's spending shares", sharesHint: "Defaults are the Ministry of Commerce CPI basket weights. Adjust them to match your household.",
      shareOther: (v) => `The remaining ${v} of spending is everything else, proxied by the effect on core inflation.`,
      advanced: "Model options", shockCombined: "Middle of the two models (default)", shockRetail: "From actual pump prices (government cushioning included)", shockDubaiThb: "From Dubai crude in baht", shockDubaiUsd: "From Dubai crude in dollars", shockBrentUsd: "From Brent in dollars",
      combinedNote: "The middle estimate averages the model driven by actual pump prices and the model driven by crude. The band shown covers the confidence intervals of both.",
      btTitle: "How accurate has the model been over the last 3 years", btSub: "Pseudo out-of-sample test: re-estimated every month without future data, then the projected change in headline inflation is compared with what happened (percentage points)",
      btModel: "Model", btH: "Ahead", btRmse: "Typical error (RMSE)", btNaive: "If you guessed no change", btCorr: "Correlation", btMonths: (h) => `${h} months`,
      btChartTitle: "6 months ahead, projected versus actual (change in headline inflation, percentage points)", btProjected: "Projected", btActual: "Actual",
      asymNote: (d) => `Splitting rises from falls, a 10% rise in crude moves headline inflation by ${d.up} points after 12 months and a 10% fall by ${d.down} points. The difference is within the estimation error, so one response is used for both directions.`,
      ansPeak: "At the worst point you would pay about", perMonth: "baht more per month", ansYear: "Over the next 12 months", baht: "baht",
      ansInfl: "Headline inflation would run higher than otherwise by", pp: "percentage points",
      inMonth: (m) => `in ${m}`, yearSub: (v) => `If your basket matched the average household: ${v} baht`,
      breakTitle: "Extra spending over 12 months by category (baht)", breakSub: (s) => `Based on ${s} baht per month and the shares set above`,
      pathTitle: "Effect on Thai inflation over the next 24 months (percentage points of year-on-year inflation)",
      pathSubObserved: (s) => `Combined effect of crude price moves already seen in the last 24 months, including this one (${s})`,
      pathSubCustom: (s) => `If crude changes by ${s} this month, once`,
      pathSeries: "Index", tableView: "Show as a table", month: "Month", impact: "Effect (pp)", low: "Low", high: "High", extra: "Extra (baht/month)", category: "Category", share: "Share", peak: "Peak per month", year1: "12-month total", total: "Total",
      pumpTitle: "At the pump",
      pumpIntro: "The Energy Policy and Planning Office publishes the official pump price build-up every day. Excise, municipal tax, fund levies and the marketing margin are fixed baht per litre; the part that moves with world markets is the ex-refinery price, plus 7% VAT. Below is what a crude move equal to the one selected above would do at the pump, before any Oil Fund cushioning.",
      pumpProduct: "Fuel", pumpPrice: "Pump price today (baht per litre)", pumpPass: "How much the Oil Fund cushions",
      passFull: "No cushion, full pass-through (100%)", passHalf: "Half cushioned (50%)", passMost: "Mostly capped (25%)",
      pumpResult: "Estimated pump price", thbL: "baht per litre",
      pumpDelta: (d) => `Crude changes ${d.pct}, from ${d.from} to ${d.to} baht per litre. The ex-refinery price moves ${d.exref} baht; with VAT and the cushion, the pump price moves ${d.pump} baht per litre.`,
      structTitle: (p, d) => `${p} price structure, ${d}`, structSub: (v) => `The ex-refinery price is ${v} of the retail price; the rest is taxes, funds and margin.`,
      oilTitle: "Crude oil prices", brentChartTitle: "Brent spot, daily, US dollars per barrel",
      crudeChartTitle: "Dubai and Brent, monthly averages, US dollars per barrel", crudeChartSub: "Thai refineries buy Middle East crude priced off Dubai. The gap between the two can be wide.",
      retailChartTitle: "Bangkok retail prices, monthly averages, baht per litre",
      d1w: "1 week", d1m: "1 month", d3m: "3 months", d1y: "1 year", dubaiLegend: "Dubai", brentLegend: "Brent",
      modelTitle: "What the model says",
      modelSummary: (m) => `Estimated with local projections on monthly data from ${m.first} to ${m.last} (${m.n} months). A 10% rise in Dubai crude in baht raises headline year-on-year inflation by about ${m.h1} points the next month, peaking at ${m.peak} points in month ${m.peakH}, then fading within two years. Energy prices react hard and fast (peak ${m.energy} points); food and core move later but for longer (food peaks at ${m.food} points in month ${m.foodH}). The model is re-estimated whenever the data updates.`,
      irfTitle: "If crude rises 10%, how many points does each index change in each following month", irfSub: "Line is the estimate, band is the 95% confidence interval",
      histTitle: "Estimation data since 2000", cpiLegendHead: "Headline inflation, year on year (%)", cpiLegendEnergy: "Energy index, year on year (%)", shockLegend: "Dubai crude in baht, change from previous month (%)",
      horizon: (h) => `month ${h}`,
      aboutTitle: "Method and limits",
      aboutBody: `<p>The model measures how, historically, a 1% change in the monthly average Dubai crude price in baht changed each consumer price index (year on year) in each of the following 24 months, controlling for 12 months of the index's own past and of past oil moves (Jordà 2005, Newey–West standard errors). The numbers on this page are those estimates multiplied by the crude price change that actually happened in each recent month, or the one you set.</p>
<p>Things to know</p><ul>
<li>Dubai is used because Thai refineries import mostly Middle East crude priced off Dubai, and it is converted to baht so the exchange rate is included. Monthly Dubai comes from the World Bank; the current month is estimated from daily Brent times the latest Dubai-to-Brent ratio, which can be off when that spread moves quickly.</li>
<li>It is a statistical relationship from the past, not a forecast, and it excludes current policy such as diesel caps financed by the Oil Fund, electricity tariff measures or interest rates, which can make the real effect smaller or slower.</li>
<li>Effects are assumed linear and symmetric. Very large shocks or price falls may not follow the pattern. Confidence bands on paths that combine several shocks ignore the covariance between coefficients and are approximate.</li>
<li>Extra spending is total spending times each category's share times the effect on that category's index. Everything else is proxied by core inflation.</li>
<li>Consumer price indices and basket weights come from the Trade Policy and Strategy Office (Ministry of Commerce) API; pump prices and the price structure from the Energy Policy and Planning Office. All refresh automatically every day.</li></ul>`,
      sourcesTitle: "Data sources and update status",
      srcCpi: "Thai CPI, monthly, all categories", srcCrude: "Dubai and Brent crude, monthly", srcFx: "USD/THB, monthly", srcBrent: "Brent, daily", srcFxDaily: "USD/THB, daily",
      srcRetail: "Pump prices, daily", srcStruct: "Pump price structure", srcRetailHist: "Retail prices, monthly", srcModel: "Model last estimated",
      lastObs: (d) => `latest observation ${d}`, fromCache: "serving the last cached copy",
      foot: "Model by Thai Leetrakul, MIT licence. All figures are statistical estimates, not forecasts.",
      loadError: "Could not load data. Run python -m thai_oil_cpi run and reload this page.",
    },
  };

  let lang = "th";
  try { lang = localStorage.getItem("lang") || "th"; } catch (e) {}
  const t = (k, ...a) => { const v = T[lang][k]; return typeof v === "function" ? v(...a) : (v ?? k); };
  const oname = (k) => OUTCOME_NAMES[lang][k] || k;
  const cname = (k) => CAT_NAMES[lang][k] || k;
  const pname = (k) => PRODUCT_NAMES[lang][k] || k;

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
  const pct = (x, d = 0) => num(x * 100, d) + "%";
  const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const TH_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parseM = (m) => { const [y, mo] = m.slice(0, 7).split("-").map(Number); return { y, mo }; };
  const mLabel = (m, full = false) => { const { y, mo } = parseM(m); return lang === "th" ? `${(full ? TH_MONTHS_FULL : TH_MONTHS)[mo - 1]} ${y + 543}` : `${EN_MONTHS[mo - 1]} ${y}`; };
  const mTick = (m) => { const { y, mo } = parseM(m); return lang === "th" ? `${TH_MONTHS[mo - 1]} ${String(y + 543).slice(2)}` : `${EN_MONTHS[mo - 1]} ${String(y).slice(2)}`; };
  const addMonths = (m, n) => { const { y, mo } = parseM(m); const k = mo - 1 + n; return `${y + Math.floor(k / 12)}-${String(((k % 12) + 12) % 12 + 1).padStart(2, "0")}`; };
  const dateLabel = (d) => { if (!d) return ""; const [y, mo, da] = d.split("-").map(Number); return lang === "th" ? `${da} ${TH_MONTHS[mo - 1]} ${y + 543}` : `${da} ${EN_MONTHS[mo - 1]} ${y}`; };
  const dirClass = (x) => (x > 0 ? "up" : x < 0 ? "down" : "");
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

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

  function drawChart(container, opts) {
    container.innerHTML = "";
    const W = Math.max(280, container.clientWidth || 600), H = opts.height || Math.min(300, Math.max(200, W * 0.42));
    const m = { top: 14, right: opts.endLabels ? 70 : 28, bottom: 30, left: 46 };
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
    for (let i = 0; i < n; i++) { const lab = opts.xTick(i); if (lab != null) el("text", { x: x(i), y: ph + 20, "text-anchor": "middle" }, xa).textContent = lab; }
    if (opts.band) {
      const up = [], dn = [];
      for (let i = 0; i < n; i++) { if (opts.band.upper[i] != null) up.push(`${x(i)},${y(opts.band.upper[i])}`); if (opts.band.lower[i] != null) dn.unshift(`${x(i)},${y(opts.band.lower[i])}`); }
      el("polygon", { class: "band", points: up.concat(dn).join(" "), fill: opts.band.color }, g);
    }
    opts.series.forEach((s) => {
      if (s.kind === "bar") {
        const bw = Math.min(24, step * 0.6);
        s.values.forEach((v, i) => {
          if (v == null) return; const y0 = y(0), y1 = y(v), top = Math.min(y0, y1), h = Math.abs(y1 - y0), r = Math.min(4, h / 2);
          const d = v >= 0
            ? `M${x(i) - bw / 2},${y0} V${top + r} a${r},${r} 0 0 1 ${r},-${r} H${x(i) + bw / 2 - r} a${r},${r} 0 0 1 ${r},${r} V${y0} Z`
            : `M${x(i) - bw / 2},${y0} V${y0 + h - r} a${r},${r} 0 0 0 ${r},${r} H${x(i) + bw / 2 - r} a${r},${r} 0 0 0 ${r},-${r} V${y0} Z`;
          el("path", { class: "bar", d, fill: s.color }, g);
        });
      } else {
        let d = "", pen = false;
        s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + x(i) + "," + y(v); pen = true; });
        el("path", { class: "line", d, stroke: s.color }, g);
        if (s.dots && n <= 30) s.values.forEach((v, i) => v != null && el("circle", { class: "dot", cx: x(i), cy: y(v), r: 4, fill: s.color }, g));
        if (s.endLabel) { const last = s.values.length - 1; const v = s.values[last]; if (v != null) el("text", { class: "end-label", x: x(last) + 8, y: y(v) + 4 }, g).textContent = s.endLabel(v); }
      }
    });
    const hover = el("g", { style: "pointer-events:none" }, g);
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

  function drawHBars(container, rows, fmt) {
    // rows: [{label, value}], single series, direct labels; negative values drawn leftwards.
    container.innerHTML = "";
    const wrap = document.createElement("div"); wrap.className = "hbars";
    const maxAbs = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)));
    rows.forEach((r) => {
      const row = document.createElement("div"); row.className = "row" + (r.total ? " total" : "");
      const lab = document.createElement("span"); lab.textContent = r.label;
      const track = document.createElement("div"); track.className = "track";
      const fill = document.createElement("div"); fill.className = "fill" + (r.value < 0 ? " neg" : ""); fill.style.width = (Math.abs(r.value) / maxAbs * 100) + "%";
      if (r.value < 0) track.style.justifyContent = "flex-end";
      track.appendChild(fill);
      const val = document.createElement("span"); val.className = "val"; val.textContent = fmt(r.value);
      row.appendChild(lab); row.appendChild(track); row.appendChild(val); wrap.appendChild(row);
      row.title = r.label + ": " + fmt(r.value);
    });
    container.appendChild(wrap);
  }

  const tableHtml = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  // ---------------------------------------------------------------- state
  let D = null;
  const state = { basis: "mtd", shock: "combined", custom: 20, irfModel: "retail_fuel", spend: 24000, shares: null, pumpProduct: "gasohol95", pumpPrice: null, pass: 1, pathOutcome: "headline", irfOutcome: "headline" };
  const $ = (id) => document.getElementById(id);

  function shockPct() {
    if (state.basis === "custom") return state.custom;
    const key = state.shock === "combined" ? D.model.primary_shock : state.shock;
    const p = D.projections[key]["observed_" + state.basis]; const s = p.shocks; return s.length ? s[s.length - 1][1] : null;
  }
  function pathsFor() {
    const irfs = D.irfs[state.shock === "combined" ? D.model.primary_shock : state.shock];
    if (state.basis === "custom") {
      const out = {}; for (const oc in irfs) out[oc] = irfs[oc].map((r) => ({ h: r.h, impact_pp: r.beta * state.custom, lower_pp: r.lower * state.custom, upper_pp: r.upper * state.custom })); return out;
    }
    return D.projections[state.shock]["observed_" + state.basis].paths;
  }
  function household(paths) {
    const cats = D.household_categories; const H = 24; const total = new Array(H).fill(0); const rows = [];
    cats.forEach((c) => {
      const path = paths[c.outcome]; if (!path) return;
      const share = state.shares[c.key] || 0; const spend = state.spend * share;
      const byH = path.map((r) => spend * r.impact_pp / 100);
      byH.forEach((v, i) => { total[i] += v; });
      rows.push({ key: c.key, share, spend, byH, peak: Math.max(...byH), year1: byH.slice(0, 12).reduce((a, b) => a + b, 0) });
    });
    const peak = Math.max(...total); const peakH = total.indexOf(peak) + 1;
    return { rows, total, peak, peakH, year1: total.slice(0, 12).reduce((a, b) => a + b, 0) };
  }

  // ---------------------------------------------------------------- renderers
  function renderBoard() {
    const c = D.current, nc = c.nowcast, r = D.retail;
    $("boardDate").textContent = dateLabel(nc.brent_latest_date);
    $("lblDubai").textContent = t("tileDubai", mLabel(c.dubai_last_month));
    $("tDubai").textContent = num(c.dubai_last_usd, 1); $("subDubai").textContent = t("perLitre", num(c.dubai_last_thb_per_litre, 2));
    $("tBrent").textContent = num(nc.brent_latest, 2); $("subBrent").textContent = t("brentSub", dateLabel(nc.brent_latest_date));
    $("tFx").textContent = num(nc.usdthb_latest, 2);
    if (r && r.prices) {
      $("tG95").textContent = num(r.prices.gasohol95, 2); $("subG95").textContent = t("pumpSub", dateLabel(r.date));
      $("tDiesel").textContent = num(r.prices.diesel_b7, 2); $("subDiesel").textContent = t("pumpSub", dateLabel(r.date));
    }
    const s = c.shock_mtd_pct; const tv = $("tShock"); tv.textContent = signed(s, 1, "%"); tv.classList.toggle("neg", s < 0); $("subShock").textContent = t("shockSub");
    const cur = (nc.months || []).find((m) => m.partial) || {};
    $("boardNote").textContent = t("boardNote", { m: mLabel(c.dubai_last_month, true), dubai: num(c.dubai_last_usd, 1), brent: num(c.brent_last_usd, 1), brentMtd: num(cur.brent_usd, 1), days: cur.days || 0, ratio: num(nc.dubai_brent_ratio, 2), nowcast: num(cur.dubai_usd_nowcast, 1), nowcastL: num(cur.dubai_thb_nowcast / 158.987, 2), spot: signed(c.shock_spot_pct, 1, "%") });
  }

  function renderNow() {
    const c = D.cpi_latest; $("nowMonth").textContent = mLabel(c.month, true);
    const items = [["headline", c.headline_yoy, t("prevMonth", signed(c.headline_yoy_prev, 2, "%"))], ["energy", c.energy_yoy, null], ["food", c.food_yoy, null], ["core", c.core_yoy, null]];
    $("cpiStats").innerHTML = items.map(([k, v, sub]) => `<div class="stat"><span class="stat-label">${oname(k)} ${t("yoyLabel")}</span><span class="stat-value ${dirClass(v)}">${signed(v, 2, "%")}</span><span class="stat-sub">${sub || ""}</span></div>`).join("");
  }

  function renderShares() {
    const keys = ["vehicles_fuel", "electricity_fuel_water", "public_transport", "food"];
    $("shares").innerHTML = keys.map((k) => `<label class="share-row"><span>${cname(k)}</span><input type="range" min="0" max="60" step="0.5" value="${(state.shares[k] * 100).toFixed(1)}" data-key="${k}"><output>${pct(state.shares[k], 1)}</output></label>`).join("");
    $("shares").querySelectorAll("input").forEach((inp) => inp.addEventListener("input", (e) => {
      state.shares[e.target.dataset.key] = +e.target.value / 100;
      const used = keys.reduce((a, k) => a + state.shares[k], 0);
      if (used > 1) { state.shares[e.target.dataset.key] -= used - 1; e.target.value = (state.shares[e.target.dataset.key] * 100).toFixed(1); }
      state.shares.other = Math.max(0, 1 - keys.reduce((a, k) => a + state.shares[k], 0));
      e.target.nextElementSibling.textContent = pct(state.shares[e.target.dataset.key], 1);
      $("shareOther").textContent = t("shareOther", pct(state.shares.other, 1));
      renderCalc();
    }));
    $("shareOther").textContent = t("shareOther", pct(state.shares.other, 1));
  }

  function renderCalc() {
    const paths = pathsFor(); const s = shockPct(); const hh = household(paths);
    const base = D.current.month; const months = Array.from({ length: 24 }, (_, i) => addMonths(base, i + 1));
    const head = paths.headline; const headPeak = head.reduce((a, b) => (b.impact_pp > a.impact_pp ? b : a), head[0]);
    const avgYear = 3 * 0 + head.slice(0, 12).reduce((a, r) => a + state.spend * r.impact_pp / 100, 0);
    const pk = $("aPeak"); pk.textContent = signed(hh.peak, 0); pk.className = dirClass(hh.peak); $("aPeakWhen").textContent = t("inMonth", mLabel(months[hh.peakH - 1], true));
    const yv = $("aYear"); yv.textContent = signed(hh.year1, 0); yv.className = dirClass(hh.year1); $("aYearSub").textContent = t("yearSub", signed(avgYear, 0));
    const iv = $("aInfl"); iv.textContent = signed(headPeak.impact_pp, 2); iv.className = dirClass(headPeak.impact_pp); $("aInflWhen").textContent = t("inMonth", mLabel(months[headPeak.h - 1], true));
    $("pathSub").textContent = state.basis === "custom" ? t("pathSubCustom", signed(s, 0, "%")) : (state.shock === "combined" ? t("combinedNote") : t("pathSubObserved", signed(s, 1, "%")));
    $("breakSub").textContent = t("breakSub", num(state.spend));
    // breakdown
    const rows = hh.rows.map((r) => ({ label: cname(r.key), value: r.year1 })).concat([{ label: t("total"), value: hh.year1, total: true }]);
    drawHBars($("breakChart"), rows, (v) => signed(v, 0));
    $("breakTable").innerHTML = tableHtml([t("category"), t("share"), t("peak"), t("year1")], hh.rows.map((r) => [cname(r.key), pct(r.share, 1), signed(r.peak, 0), signed(r.year1, 0)]).concat([[t("total"), "100%", signed(hh.peak, 0), signed(hh.year1, 0)]]));
    // path chart for the selected outcome
    const oc = state.pathOutcome; const path = paths[oc] || head; const color = css("--series-1");
    drawChart($("pathChart"), {
      n: path.length, xTick: (i) => (i % 3 === 0 ? mTick(months[i]) : null), zero: true,
      series: [{ values: path.map((r) => r.impact_pp), color, dots: true }],
      band: { lower: path.map((r) => r.lower_pp), upper: path.map((r) => r.upper_pp), color }, yFmt: (v) => signed(v, 1), height: 240,
      tip: (i) => `<b>${mLabel(months[i])}</b><br>${oname(oc)}: ${signed(path[i].impact_pp, 2)} (${signed(path[i].lower_pp, 2)} … ${signed(path[i].upper_pp, 2)})${path[i].retail_pp != null ? `<br>${t("shockRetail")}: ${signed(path[i].retail_pp, 2)}<br>${t("shockDubaiThb")}: ${signed(path[i].crude_pp, 2)}` : ""}<br>${t("extra")}: ${signed(hh.total[i], 0)}`,
    });
    $("pathTable").innerHTML = tableHtml([t("month"), t("impact"), t("low"), t("high"), t("extra")], path.map((r, i) => [mLabel(months[i]), signed(r.impact_pp, 2), signed(r.lower_pp, 2), signed(r.upper_pp, 2), signed(hh.total[i], 0)]));
    renderPump();
  }

  function renderPumpControls() {
    const r = D.retail; const prods = Object.keys(r.prices || {}).filter((k) => r.prices[k] != null && (r.structure ? r.structure.products[k] : true));
    const sel = $("pumpProduct"); sel.innerHTML = prods.map((k) => `<option value="${k}" ${k === state.pumpProduct ? "selected" : ""}>${pname(k)}</option>`).join("");
    if (!prods.includes(state.pumpProduct)) state.pumpProduct = prods[0];
    state.pumpPrice = r.prices[state.pumpProduct]; $("pumpPrice").value = state.pumpPrice;
  }

  function renderPump() {
    const nc = D.current.nowcast; const s = shockPct(); if (s == null || !nc.dubai_spot_nowcast_thb) return;
    const fromL = nc.dubai_spot_nowcast_thb / 158.987, toL = fromL * Math.exp(s / 100);
    const dExref = toL - fromL, dPump = dExref * 1.07 * state.pass;
    const nv = $("pumpNew"); nv.textContent = num((state.pumpPrice || 0) + dPump, 2); nv.className = dirClass(dPump);
    $("pumpDelta").textContent = t("pumpDelta", { pct: signed(100 * (Math.exp(s / 100) - 1), 1, "%"), from: num(fromL, 2), to: num(toL, 2), exref: signed(dExref, 2), pump: signed(dPump, 2) });
    const st = D.retail.structure; const prod = st && st.products[state.pumpProduct];
    if (prod) {
      const order = ["ex_refinery", "discount", "excise", "municipal_tax", "oil_fund", "conservation_fund", "vat_ws", "marketing", "vat_mm"];
      const parts = order.filter((k) => prod[k] != null && prod[k] !== 0).map((k) => ({ k, v: prod[k] }));
      const maxAbs = Math.max(...parts.map((p) => Math.abs(p.v)));
      $("structTitle").textContent = t("structTitle", pname(state.pumpProduct), dateLabel(st.date));
      $("structSub").textContent = t("structSub", pct(prod.ex_refinery / prod.retail, 0));
      $("structure").innerHTML = `<table class="struct">${parts.map((p) => `<tr><td>${STRUCT_NAMES[lang][p.k] || p.k}</td><td><div class="bar-wrap ${p.v < 0 ? "neg" : ""}"><div class="bar ${p.v < 0 ? "neg" : ""}" style="width:${Math.abs(p.v) / maxAbs * 100}%"></div></div></td><td>${signed(p.v, 2)}</td></tr>`).join("")}<tr class="total"><td>${STRUCT_NAMES[lang].retail}</td><td></td><td>${num(prod.retail, 2)}</td></tr></table>`;
    } else { $("structure").innerHTML = ""; $("structTitle").textContent = ""; $("structSub").textContent = ""; }
  }

  function renderOil() {
    const pts = D.data.brent_daily; const ch = D.current.brent_changes_pct || {};
    $("brentDeltas").innerHTML = ["1w", "1m", "3m", "1y"].filter((k) => ch[k] != null).map((k) => `<div class="delta"><b class="${dirClass(ch[k])}">${signed(ch[k], 1, "%")}</b><span>${t("d" + k)}</span></div>`).join("");
    const c1 = css("--series-1"), c2 = css("--series-2");
    if (pts.length) {
      const every = ($("brentChart").clientWidth || 600) < 520 ? 6 : 3;
      const first = pts.map((p, i) => i > 0 && p[0].slice(0, 7) !== pts[i - 1][0].slice(0, 7) && (+p[0].slice(5, 7) - 1) % every === 0);
      drawChart($("brentChart"), { n: pts.length, xTick: (i) => (first[i] ? mTick(pts[i][0]) : null), series: [{ values: pts.map((p) => p[1]), color: c2, endLabel: (v) => num(v, 1) }], endLabels: true, height: 240, tip: (i) => `<b>${dateLabel(pts[i][0])}</b><br>${num(pts[i][1], 2)} USD/bbl` });
    }
    const mo = D.data.monthly.filter((r) => r.month >= "2015-01");
    const xt = (i) => (mo[i].month.endsWith("-01") ? mTick(mo[i].month).split(" ").pop().replace(/^/, lang === "th" ? "25" : "20") : null);
    drawChart($("crudeChart"), { n: mo.length, xTick: xt, height: 240, series: [{ values: mo.map((r) => r.dubai_usd), color: c1 }, { values: mo.map((r) => r.brent_usd), color: c2 }], legend: [{ color: c1, label: t("dubaiLegend") }, { color: c2, label: t("brentLegend") }], tip: (i) => `<b>${mLabel(mo[i].month)}</b><br>${t("dubaiLegend")}: ${num(mo[i].dubai_usd, 1)}<br>${t("brentLegend")}: ${num(mo[i].brent_usd, 1)}<br>USD/THB ${num(mo[i].usdthb, 2)}` });
    const rh = (D.retail.history || []).filter((r) => r.month >= "2015-01");
    if (rh.length) drawChart($("retailChart"), { n: rh.length, xTick: (i) => (rh[i].month.endsWith("-01") ? (lang === "th" ? String(+rh[i].month.slice(0, 4) + 543) : rh[i].month.slice(0, 4)) : null), height: 220, series: [{ values: rh.map((r) => r.gasohol95), color: c1 }, { values: rh.map((r) => r.diesel_b7), color: c2 }], legend: [{ color: c1, label: pname("gasohol95") }, { color: c2, label: pname("diesel_b7") }], tip: (i) => `<b>${mLabel(rh[i].month)}</b><br>${pname("gasohol95")}: ${num(rh[i].gasohol95, 2)}<br>${pname("diesel_b7")}: ${num(rh[i].diesel_b7, 2)}` });
  }

  function renderModel() {
    const mk = state.irfModel; const irfs = D.irfs[mk]; const meta = D.model.samples[`${mk}/headline`] || {};
    const pk = (oc) => irfs[oc].reduce((a, b) => (b.beta > a.beta ? b : a), irfs[oc][0]);
    const hp = pk("headline"), ep = pk("energy"), fp = pk("food");
    $("modelSummary").textContent = t("modelSummary", { first: mLabel(meta.first || ""), last: mLabel(meta.last || ""), n: meta.n, h1: num(irfs.headline[0].beta * 10, 2), peak: num(hp.beta * 10, 2), peakH: hp.h, energy: num(ep.beta * 10, 1), food: num(fp.beta * 10, 2), foodH: fp.h });
    const oc = state.irfOutcome; const irf = irfs[oc]; const c1 = css("--series-1"), c2 = css("--series-2");
    drawChart($("irfChart"), { n: irf.length, xTick: (i) => (i % 3 === 2 ? t("horizon", irf[i].h) : null), zero: true, height: 230, series: [{ values: irf.map((r) => r.beta * 10), color: c1, dots: true }], band: { lower: irf.map((r) => r.lower * 10), upper: irf.map((r) => r.upper * 10), color: c1 }, yFmt: (v) => signed(v, 1), tip: (i) => `<b>${t("horizon", irf[i].h)}</b><br>${oname(oc)}: ${signed(irf[i].beta * 10, 2)} pp (${signed(irf[i].lower * 10, 2)} … ${signed(irf[i].upper * 10, 2)})<br>n = ${irf[i].n}` });
    $("irfTable").innerHTML = tableHtml([t("month"), t("impact"), t("low"), t("high")], irf.map((r) => [t("horizon", r.h), signed(r.beta * 10, 3), signed(r.lower * 10, 3), signed(r.upper * 10, 3)]));
    const q = D.data.monthly; const col = ({ dubai_thb: "shock_dubai_thb", dubai_usd: "shock_dubai_usd", brent_usd: "shock_brent_usd", retail_fuel: "shock_retail_fuel" })[mk];
    const asym = D.asymmetric && D.asymmetric.headline;
    if (asym) { const up = asym.up.find((r) => r.h === 12), dn = asym.down.find((r) => r.h === 12); $("asymNote").textContent = t("asymNote", { up: signed(up.beta * 10, 2), down: signed(dn.beta * -10, 2) }); }
    renderBacktest();
    const xt = (i) => (q[i].month.endsWith("-01") && (+q[i].month.slice(0, 4)) % 2 === 0 ? (lang === "th" ? String(+q[i].month.slice(0, 4) + 543) : q[i].month.slice(0, 4)) : null);
    drawChart($("cpiChart"), { n: q.length, xTick: xt, zero: true, height: 200, series: [{ values: q.map((r) => r.yoy_headline), color: c1 }, { values: q.map((r) => r.yoy_energy), color: c2 }], legend: [{ color: c1, label: t("cpiLegendHead") }, { color: c2, label: t("cpiLegendEnergy") }], yFmt: (v) => num(v, 0) + "%", tip: (i) => `<b>${mLabel(q[i].month)}</b><br>${t("cpiLegendHead")}: ${signed(q[i].yoy_headline, 2, "%")}<br>${t("cpiLegendEnergy")}: ${signed(q[i].yoy_energy, 1, "%")}` });
    drawChart($("shockChart"), { n: q.length, xTick: xt, zero: true, bars: true, height: 180, series: [{ kind: "bar", values: q.map((r) => r[col]), color: c2 }], legend: [{ color: c2, label: t("shockLegend") }], yFmt: (v) => num(v, 0) + "%", tip: (i) => `<b>${mLabel(q[i].month)}</b><br>${t("shockLegend")}: ${signed(q[i][col], 1, "%")}<br>Dubai ${num(q[i].dubai_usd, 1)} USD, ${num(q[i].dubai_thb_per_litre, 2)} THB/L` });
  }

  function renderBacktest() {
    const bt = D.backtests; if (!bt) return;
    const order = ["combined", "retail_fuel", "dubai_thb"].filter((k) => bt[k]);
    const names = { combined: t("shockCombined"), retail_fuel: t("shockRetail"), dubai_thb: t("shockDubaiThb") };
    const rows = [];
    order.forEach((k) => bt[k].headline.by_h.forEach((r) => rows.push([names[k], t("btMonths", r.h), num(r.rmse, 2), num(r.rmse_no_change, 2), num(r.corr, 2)])));
    $("btTable").innerHTML = tableHtml([t("btModel"), t("btH"), t("btRmse"), t("btNaive"), t("btCorr")], rows);
    const r6 = bt.combined ? bt.combined.headline.rows : bt[order[0]].headline.rows; const c1 = css("--series-1"), c2 = css("--series-2");
    drawChart($("btChart"), { n: r6.length, xTick: (i) => (i % 6 === 0 ? mTick(addMonths(r6[i].origin, 6)) : null), zero: true, height: 220,
      series: [{ values: r6.map((r) => r.actual), color: c2 }, { values: r6.map((r) => r.projected), color: c1 }],
      legend: [{ color: c2, label: t("btActual") }, { color: c1, label: t("btProjected") }], yFmt: (v) => signed(v, 1),
      tip: (i) => `<b>${mLabel(r6[i].origin)} → ${mLabel(addMonths(r6[i].origin, 6))}</b><br>${t("btProjected")}: ${signed(r6[i].projected, 2)}<br>${t("btActual")}: ${signed(r6[i].actual, 2)}` });
  }

  function renderSources() {
    const s = D.sources || {};
    const line = (st) => { if (!st) return "–"; let txt = st.source || ""; if (st.last_obs) txt += (txt ? ", " : "") + t("lastObs", st.last_obs); if (st.from_cache) txt += ` (${t("fromCache")})`; return txt || "–"; };
    const rows = [[t("srcCpi"), line(s.tpso_cpi)], [t("srcCrude"), line(s.crude_monthly)], [t("srcFx"), line(s.usdthb_monthly_imf)], [t("srcBrent"), line(s.brent_daily)], [t("srcFxDaily"), line(s.usdthb_daily)], [t("srcRetail"), line(s.eppo_retail_daily)], [t("srcStruct"), line(s.eppo_price_structure)], [t("srcRetailHist"), line(s.eppo_retail_monthly)], [t("srcModel"), (D.generated_at || "").replace("T", " ").slice(0, 16) + " UTC"]];
    $("sources").innerHTML = `<table class="src-table">${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>`;
  }

  function fillOutcomeSelects() {
    const ocs = Object.keys(D.irfs[D.model.primary_shock]);
    for (const [id, key] of [["pathOutcome", "pathOutcome"], ["irfOutcome", "irfOutcome"]]) {
      $(id).innerHTML = ocs.map((o) => `<option value="${o}" ${o === state[key] ? "selected" : ""}>${oname(o)}</option>`).join("");
    }
    const models = ["retail_fuel", "dubai_thb", "dubai_usd", "brent_usd"].filter((k) => D.irfs[k]);
    const names = { retail_fuel: t("shockRetail"), dubai_thb: t("shockDubaiThb"), dubai_usd: t("shockDubaiUsd"), brent_usd: t("shockBrentUsd") };
    $("irfModel").innerHTML = models.map((k) => `<option value="${k}" ${k === state.irfModel ? "selected" : ""}>${names[k]}</option>`).join("");
  }

  function renderAll() { applyI18n(); fillOutcomeSelects(); renderBoard(); renderNow(); renderShares(); renderPumpControls(); renderCalc(); renderOil(); renderModel(); renderSources(); }

  // ---------------------------------------------------------------- wiring
  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} if (D) renderAll(); else applyI18n(); });
  $("spend").addEventListener("input", (e) => { state.spend = +e.target.value || 0; if (D) renderCalc(); });
  document.querySelectorAll("input[name=basis]").forEach((r) => r.addEventListener("change", (e) => { state.basis = e.target.value; $("customRow").hidden = state.basis !== "custom"; if (D) renderCalc(); }));
  document.querySelectorAll("input[name=shock]").forEach((r) => r.addEventListener("change", (e) => { state.shock = e.target.value; if (D) renderCalc(); }));
  $("shockSlider").addEventListener("input", (e) => { state.custom = +e.target.value; $("shockOut").textContent = signed(state.custom, 0, "%"); if (D) renderCalc(); });
  $("pathOutcome").addEventListener("change", (e) => { state.pathOutcome = e.target.value; if (D) renderCalc(); });
  $("irfOutcome").addEventListener("change", (e) => { state.irfOutcome = e.target.value; if (D) renderModel(); });
  $("irfModel").addEventListener("change", (e) => { state.irfModel = e.target.value; if (D) renderModel(); });
  $("pumpProduct").addEventListener("change", (e) => { state.pumpProduct = e.target.value; state.pumpPrice = D.retail.prices[state.pumpProduct]; $("pumpPrice").value = state.pumpPrice; renderPump(); });
  $("pumpPrice").addEventListener("input", (e) => { state.pumpPrice = +e.target.value || 0; if (D) renderPump(); });
  $("pumpPass").addEventListener("change", (e) => { state.pass = +e.target.value; if (D) renderPump(); });
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => D && renderAll(), 150); });
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => D && renderAll());

  applyI18n();
  fetch("data/latest.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { D = d; state.shares = { ...d.default_shares }; renderAll(); })
    .catch((err) => { console.error(err); const p = document.createElement("p"); p.className = "muted"; p.textContent = t("loadError"); document.querySelector("main").prepend(p); });
})();
