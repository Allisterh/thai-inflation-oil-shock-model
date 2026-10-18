/* Simple front page v3: concrete inputs, "already happened" from real data, "still to come" from the model. */
(function () {
  "use strict";
  const T = {
    th: {
      brand: "น้ำมันกับค่าครองชีพ", navHome: "คำนวณของคุณ", navMethod: "ทำไมถึงเชื่อถือได้", navAdvanced: "กราฟและรายละเอียด", 
      h1: "น้ำมันแพงขึ้นแล้ว ครอบครัวคุณจ่ายเพิ่มเดือนละกี่บาท",
      lede: "ตอบ 5 ข้อสั้น ๆ แล้วเราจะบอกสองอย่าง หนึ่ง ตอนนี้คุณจ่ายเพิ่มไปแล้วเดือนละกี่บาทเมื่อเทียบกับปีก่อน (คิดจากราคาจริง) สอง อีกไม่กี่เดือนข้างหน้าน่าจะเพิ่มอีกเท่าไร (คิดจากสิ่งที่เคยเกิดขึ้นทุกครั้งที่น้ำมันแพง)",
      pumpFact: (d) => `${d.prod} หน้าปั๊มวันนี้ ${d.now} บาทต่อลิตร เทียบกับ ${d.ago} บาทเมื่อปีก่อน`,
      cpiFact: (m) => `ของแพงขึ้นจากปีก่อน (เงินเฟ้อ) ล่าสุดเดือน${m}`,
      oilFact: (d) => `น้ำมันดิบคิดเป็นเงินบาท เดือนนี้เทียบกับเดือนก่อน ข้อมูลถึง ${d}`,
      factsTitle: "ตัวเลขวันนี้", asOf: (d) => `อัปเดตล่าสุด ${d}`, panelTitle: "ครอบครัวคุณ", perMonthHint: "ตัวเลขทั้งหมดเป็นรายเดือน ใส่ค่าประมาณก็พอ",
      qFuel: "เติมน้ำมันเดือนละ", litres: "ลิตร", baht: "บาท", nowKicker: "วันนี้ เทียบกับปีก่อน", nextKicker: "ที่ยังตามมาอีก",
      copy: "คัดลอกผลลัพธ์", shareLine: "แชร์ทาง LINE", copied: "คัดลอกแล้ว",
      shareText: (d) => `น้ำมันแพงขึ้น ครอบครัวฉันจ่ายเพิ่มแล้วประมาณ ${d.now} บาทต่อเดือนเทียบกับปีก่อน และน่าจะตามมาอีกราว ${d.next} บาทต่อเดือน ลองคำนวณของคุณ: `,
      whyCards: (d) => [[d.pump, `${d.prod} หน้าปั๊มแพงขึ้นเท่านี้จากปีก่อน เพราะน้ำมันดิบที่ไทยซื้อ คิดเป็นเงินบาท ${d.dir}ประมาณ ${d.crude} ในปีที่ผ่านมา`], [d.energy, `ทุกครั้งที่น้ำมันดิบแพงขึ้น 10% ค่าพลังงานในไทย (น้ำมัน ไฟฟ้า ก๊าซ) จะแพงขึ้นราวนี้ภายในไม่กี่เดือน และของทั้งหมดโดยเฉลี่ยแพงขึ้นราว ${d.head} นี่คือค่าเฉลี่ยจากทุกครั้งตั้งแต่ปี 2543`], [d.foodH, `อาหารขึ้นช้ากว่า มักแพงที่สุดราวเดือนนี้หลังน้ำมันขึ้น เพราะค่าขนส่ง ค่าปุ๋ย และค่าอาหารสัตว์ค่อย ๆ ไหลไปถึงราคาในตลาด และเมื่อขึ้นแล้วมักไม่ลงง่าย นี่คือส่วนที่ "ยังตามมาอีก"`]],
      litresPerMonth: "ลิตรต่อเดือน", fuelType: "ชนิด",
      fuelNone: "ไม่มีรถ", fuelMoto: "มอเตอร์ไซค์", fuelCar: "รถยนต์", fuelHeavy: "ขับเยอะ",
      qFood: "ค่าอาหารและเครื่องดื่ม", qElec: "ค่าไฟ ก๊าซหุงต้ม น้ำประปา", qOther: "ค่าใช้จ่ายอื่น ๆ",
      otherHint: "ค่าเช่า ของใช้ เสื้อผ้า ค่ารถสาธารณะ ค่ารักษา ค่าเทอม", bahtPerMonth: "บาทต่อเดือน",
      nowLead: "เทียบกับปีที่แล้ว ตอนนี้คุณจ่ายเพิ่มไปแล้วประมาณ", nowLeadLess: "เทียบกับปีที่แล้ว ตอนนี้คุณจ่ายน้อยลงประมาณ",
      nowNote: (d) => `คิดเป็น ${d.pct} ของค่าใช้จ่าย ${d.total} บาทต่อเดือนของคุณ ราคา ณ เดือน${d.m}`,
      nowSource: "ส่วนนี้ไม่มีการคาดเดา เราเอาราคาน้ำมันวันนี้ลบราคาเมื่อปีก่อน แล้วคูณจำนวนลิตรที่คุณเติม ส่วนอาหาร ค่าไฟ และของอื่น ๆ ใช้ตัวเลขทางการล่าสุดของกระทรวงพาณิชย์ว่าแพงขึ้นกี่เปอร์เซ็นต์จากปีก่อน",
      itemFuel: "น้ำมันรถ", itemFood: "อาหารและเครื่องดื่ม", itemElec: "ค่าไฟ ก๊าซ น้ำประปา", itemOther: "ของอื่น ๆ",
      noteFuel: (d) => `${d.prod} ${d.ago} → ${d.now} บาท/ลิตร × ${d.l} ลิตร`, noteIdx: (d) => `ดัชนีราคา${d.what} ${d.pct} จากปีก่อน`,
      idxFood: "อาหาร", idxElec: "ค่าไฟ ก๊าซ น้ำประปา", idxOther: "สินค้าทั่วไป (เงินเฟ้อพื้นฐาน)",
      nextLeadUp: "ยังไม่จบแค่นี้ อีกไม่กี่เดือนของน่าจะแพงขึ้นอีกประมาณ", nextLeadDown: "ข่าวดีคือ อีกไม่กี่เดือนราคาน่าจะลดลงนิดหน่อย ประมาณ",
      nextWhen: (d) => `ตัวเลขนี้คือส่วนที่จะเพิ่มขึ้นอีกจากที่คุณจ่ายอยู่วันนี้ และน่าจะมากที่สุดราวเดือน${d.m}`,
      nextRange: (d) => `เราคิดอย่างไร ทุกครั้งที่น้ำมันแพงขึ้นตั้งแต่ปี 2546 เราดูว่าราคาอาหาร ค่าไฟ และของอื่น ๆ ของ${d.where}ขยับตามเท่าไรในเดือนต่อ ๆ มา แล้วเอาแบบแผนนั้นมาใช้กับราคาน้ำมันที่ขึ้นมาแล้วในปีนี้ ถ้าคิดจากราคาน้ำมันดิบโลกแทนราคาหน้าปั๊มจะได้ ${d.alt} บาท ส่วนใหญ่ตัวเลขจริงจะห่างจากที่เราประมาณไม่เกิน ${d.err} บาทต่อเดือน`,
      accuracy: (d) => `แม่นแค่ไหน เราทดสอบย้อนหลัง 3 ปีโดยให้แบบจำลองใช้เฉพาะข้อมูลที่รู้ ณ ตอนนั้น ตัวเลข 6 เดือนล่วงหน้าคลาดเฉลี่ย ${d.rmse} จุดของอัตราเงินเฟ้อ พูดง่าย ๆ ถ้าเราบอกว่าของจะแพงขึ้น 3.0% ของจริงมักอยู่ระหว่าง ${d.lo}% ถึง ${d.hi}% ถ้าเดาว่าไม่มีอะไรเปลี่ยนเลยจะคลาด ${d.naive} จุด`,
      whatifTitle: "แล้วถ้าน้ำมันดิบเปลี่ยนอีก", up10: "ขึ้นอีก 10%", up20: "ขึ้นอีก 20%", up50: "ขึ้นอีก 50%", down10: "ลดลง 10%",
      whatif: (d) => `ถ้าน้ำมันดิบ${d.dir} จากวันนี้ ${d.prod} น่าจะ${d.pumpDir}ราวลิตรละ ${d.pump} บาท และในช่วงที่หนักที่สุด ครอบครัวคุณจะจ่าย${d.more}อีกราว ${d.peak} บาทต่อเดือน (ถ้ารัฐไม่ตรึงราคาเพิ่ม)`,
      up: "ขึ้น", down: "ลง", moreWord: "เพิ่ม", lessWord: "น้อยลง", pumpUp: "แพงขึ้น", pumpDown: "ถูกลง",
      whyTitle: "ทำไมถึงเป็นแบบนี้",
      why1: (d) => `น้ำมันดิบที่โรงกลั่นไทยซื้อ (ดูไบ) คิดเป็นเงินบาท${d.dir}ประมาณ ${d.pct} ใน 12 เดือนที่ผ่านมา และราคาหน้าปั๊ม${d.prod}ขึ้นมาแล้ว ${d.pump} จากปีก่อน`,
      why2: (d) => `จากข้อมูลตั้งแต่ปี 2543 ทุกครั้งที่น้ำมันดิบแพงขึ้น 10% ราคาพลังงานในไทยจะขึ้นราว ${d.energy}% ภายในไม่กี่เดือน และของทั้งตะกร้าแพงขึ้นราว ${d.head}%`,
      why3: "อาหารและของอื่น ๆ ขึ้นช้ากว่าเพราะต้นทุนขนส่งและวัตถุดิบค่อย ๆ ส่งผ่าน แต่อยู่นานกว่า นี่คือส่วนที่ยังตามมาอีก",
      caveat: "ตัวเลขใน \"ที่ยังตามมาอีก\" และ \"แล้วถ้า\" เป็นการประมาณจากสิ่งที่เคยเกิดขึ้นในอดีต ไม่ใช่คำทำนาย ถ้ารัฐออกมาตรการใหม่ เช่น ตรึงดีเซลหรือลดค่าไฟเพิ่ม ของจะแพงน้อยกว่านี้หรือช้ากว่านี้",
      more: "ดูกราฟและรายละเอียดทั้งหมด", how: "ทำไมตัวเลขนี้เชื่อถือได้ ดูหลักฐานและวิธีคิด",
      foot: (d) => `ข้อมูล: กระทรวงพาณิชย์ (ดัชนีราคาผู้บริโภค) สนพ. (ราคาน้ำมัน) ธนาคารโลก EIA อัปเดต ${d}`,
      loadError: "โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง",
      qWhere: "คุณอยู่ที่ไหน", whereHint: "ใช้ดัชนีราคาของภาคคุณ หรือดัชนีผู้มีรายได้น้อย",
      whereNational: "ทั่วประเทศ", whereBangkok: "กรุงเทพฯ และปริมณฑล", whereCentral: "ภาคกลาง", whereNorth: "ภาคเหนือ", whereNortheast: "ภาคอีสาน", whereSouth: "ภาคใต้", whereLow: "ครัวเรือนรายได้น้อย",
      typeNote: (d) => `อาหาร ค่าไฟ และของอื่น ๆ ใช้ตัวเลขของ${d.where} ส่วนราคาน้ำมันใช้ราคากรุงเทพฯ (ต่างจังหวัดแพงกว่าไม่กี่สิบสตางค์ตามค่าขนส่ง)`,
      elecKnown: (d) => `ค่าไฟ รัฐกำหนดค่าไฟล่วงหน้าทีละ 4 เดือน งวด ${d.period} กำหนดไว้แล้วที่หน่วยละ ${d.tariff} บาท ${d.change} ดังนั้นค่าไฟจนถึงเดือน${d.until} เราใช้ตัวเลขที่ประกาศจริง ไม่ได้ประมาณ`,
      elecSame: "เท่าเดิมกับงวดก่อน", elecUp: (x) => `เพิ่มขึ้น ${x} จากงวดก่อน`, elecDown: (x) => `ลดลง ${x} จากงวดก่อน`,
      whatifNote: (d) => `ทำไมราคาหน้าปั๊มไม่ขึ้นเท่าน้ำมันดิบ ตั้งแต่ปี 2546 เมื่อน้ำมันดิบแพงขึ้น ราคาหน้าปั๊มในไทยมักขึ้นแค่ราว ${d.pt} ของที่น้ำมันดิบขึ้น ภายใน 3 เดือน ที่เหลือกองทุนน้ำมันและการลดภาษีช่วยรับไว้ ${d.regime}`,
      regimeSub: (d) => `ตอนนี้ (${d.date}) กองทุนน้ำมันกำลังช่วยจ่ายค่าดีเซลให้ลิตรละ ${d.levy} บาท ในช่วงแบบนี้ที่ผ่านมา ราคาหน้าปั๊มขยับตามน้ำมันดิบราว ${d.pt}`,
      regimeCol: (d) => `ตอนนี้ (${d.date}) กองทุนน้ำมันเก็บเงินจากดีเซลลิตรละ ${d.levy} บาท ในช่วงแบบนี้ที่ผ่านมา ราคาหน้าปั๊มขยับตามน้ำมันดิบราว ${d.pt}`,
      fbTitle: "ตัวเลขนี้ช่วยคุณได้ไหม", fbYes: "ช่วยได้", fbSome: "ช่วยได้บ้าง", fbNo: "ไม่ช่วย",
      fbPrompt: "อยากบอกอะไรเพิ่มไหม เช่น มันเปลี่ยนวิธีวางแผนค่าใช้จ่ายของคุณอย่างไร หรืออะไรที่ยังงงอยู่ (ไม่บังคับ)",
      fbSend: "ส่งความเห็น", fbPrivacy: "ไม่เก็บชื่อหรืออีเมล ความเห็นอาจถูกนำมาแสดงบนหน้านี้", fbThanks: "ขอบคุณมาก ความเห็นของคุณช่วยให้เราทำเว็บนี้ให้ดีขึ้น", fbFail: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง",
      fbSaid: "คนอื่นบอกว่า",
      counters: (d) => `มีคนเข้ามาดูแล้ว <b>${d.visits}</b> ครั้ง${d.helped ? ` และ <b>${d.helped}</b> คนบอกว่าช่วยได้` : ""}`, fbEmpty: "พิมพ์ความเห็นก่อนส่ง",
      prod: { gasohol95: "แก๊สโซฮอล์ 95", gasohol91: "แก๊สโซฮอล์ 91", gasohol_e20: "แก๊สโซฮอล์ E20", diesel_b7: "ดีเซล" },
    },
    en: {
      brand: "Oil and the cost of living", navHome: "Your calculation", navMethod: "Why trust it", navAdvanced: "Charts and details", 
      h1: "Oil prices went up. How much more is your family paying each month?",
      lede: "Answer five quick questions and we will tell you two things. One: how much more you are already paying each month than a year ago, worked out from real prices. Two: how much more is likely to come over the next few months, worked out from what has happened every time oil got expensive before.",
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
      nowSource: "No guessing in this part. We take today's pump price, subtract the price a year ago, and multiply by the litres you buy. For food, electricity and everything else we use the Commerce Ministry's latest official figure for how much prices are up on a year ago.",
      itemFuel: "Fuel for your vehicle", itemFood: "Food and drinks", itemElec: "Electricity, gas, water", itemOther: "Everything else",
      noteFuel: (d) => `${d.prod} went from ${d.ago} to ${d.now} baht a litre, times ${d.l} litres`, noteIdx: (d) => `${d.what} prices are ${d.pct} compared with a year ago`,
      idxFood: "Food", idxElec: "Electricity, gas and water", idxOther: "General goods",
      nextLeadUp: "On top of that, prices will probably go up by about another", nextLeadDown: "The good news: prices should come down a little, by about",
      nextWhen: (d) => `This is on top of what you pay today, and it should be at its highest around ${d.m}.`,
      nextRange: (d) => `How we work this out: every time fuel got more expensive since 2003, we looked at how much food, electricity and other prices in the ${d.where} followed over the months after, and we apply that pattern to this year's fuel price rise. Working from world crude oil instead of pump prices gives ${d.alt} baht. Most of the time the real figure ends up within ${d.err} baht a month of our estimate.`,
      accuracy: (d) => `How accurate is it? We tested it over the past 3 years, letting the model see only what was known at the time. Its 6-month estimates were off by ${d.rmse} points of the inflation rate on average. In plain terms, if we say prices will be up 3.0%, the real figure is usually between ${d.lo}% and ${d.hi}%. Guessing that nothing changes would have been off by ${d.naive} points.`,
      whatifTitle: "What if oil prices move again?", up10: "Up another 10%", up20: "Up another 20%", up50: "Up another 50%", down10: "Down 10%",
      whatif: (d) => `If crude oil goes ${d.dir} from today, ${d.prod} should be about ${d.pump} baht a litre ${d.pumpDir}, and at the worst point your family would pay about ${d.peak} baht a month ${d.more} (unless the government steps in to hold prices down).`,
      up: "up", down: "down", moreWord: "more", lessWord: "less", pumpUp: "more expensive", pumpDown: "cheaper",
      whyTitle: "Why this is happening",
      whyCards: (d) => [[d.pump, `That is how much more ${d.prod} costs at the pump than a year ago, because the crude oil Thailand buys, counted in baht, is ${d.dir} about ${d.crude} over the past year.`], [d.energy, `Every time crude oil has risen 10%, energy prices in Thailand (fuel, electricity, gas) have gone up by about this much within a few months, and prices overall by about ${d.head}. That is the average of every episode since 2000.`], [d.foodH, `Food is slower. It usually peaks about this long after oil goes up, because transport, fertiliser and animal-feed costs take time to reach market prices, and once up they rarely come back down. That is the part "still coming".`]],
      caveat: "The \"still coming\" and \"what if\" figures are estimates based on what happened in the past. They are not predictions. If the government brings in new measures, such as a diesel cap or a bigger electricity discount, prices will rise less, or more slowly, than this.",
      more: "See all the charts and details", how: "Why you can trust these numbers: the evidence and the method",
      foot: (d) => `Sources: Ministry of Commerce (price index), Energy Policy and Planning Office (fuel prices), World Bank, US EIA. Updated ${d}`,
      loadError: "Could not load the data. Please try again.",
      qWhere: "Where do you live?", whereHint: "Uses the price index for your region, or the low-income index",
      whereNational: "Whole country", whereBangkok: "Bangkok area", whereCentral: "Central", whereNorth: "North", whereNortheast: "Northeast", whereSouth: "South", whereLow: "Low-income household",
      typeNote: (d) => `Food, electricity and other items use figures for the ${d.where}. Fuel uses the Bangkok pump price (upcountry is a few satang higher because of transport).`,
      elecKnown: (d) => `Electricity: the government sets the electricity price four months at a time. For ${d.period} it is already fixed at ${d.tariff} baht a unit, ${d.change}. So for electricity up to ${d.until} we use the announced figure, not an estimate.`,
      elecSame: "the same as the previous period", elecUp: (x) => `up ${x} on the previous period`, elecDown: (x) => `down ${x} on the previous period`,
      whatifNote: (d) => `Why pump prices do not rise as much as crude: since 2003, when crude oil has gone up, Thai pump prices have usually risen by only about ${d.pt} of that within three months. The Oil Fund and tax cuts absorb the rest. ${d.regime}`,
      regimeSub: (d) => `Right now (${d.date}) the Oil Fund is paying ${d.levy} baht of every litre of diesel for you. In periods like this, pump prices followed about ${d.pt} of crude moves.`,
      regimeCol: (d) => `Right now (${d.date}) the Oil Fund is collecting ${d.levy} baht on every litre of diesel. In periods like this, pump prices followed about ${d.pt} of crude moves.`,
      fbTitle: "Did this help you?", fbYes: "Yes, it helped", fbSome: "A little", fbNo: "No",
      fbPrompt: "Anything you want to add? For example how it changed the way you plan your spending, or what was still confusing. (Optional)",
      fbSend: "Send", fbPrivacy: "No name or email is collected. Comments may be shown on this page.", fbThanks: "Thank you. Your comment helps us make this better.", fbFail: "Could not send. Please try again.",
      fbSaid: "What people said",
      counters: (d) => `<b>${d.visits}</b> visits so far${d.helped ? `, and <b>${d.helped}</b> people said it helped` : ""}`, fbEmpty: "Type a comment before sending",
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
  const WHERE = [["national", "whereNational"], ["bangkok", "whereBangkok"], ["central", "whereCentral"], ["north", "whereNorth"], ["northeast", "whereNortheast"], ["south", "whereSouth"], ["low_income", "whereLow"]];
  let D = null; const state = { litres: 80, product: "gasohol95", food: 8000, elec: 1000, other: 8000, whatif: 10, where: "national" };
  try { const w = localStorage.getItem("where"); if (w) state.where = w; } catch (e) {}

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
  // Household type: regional CPI or the low-income CPI. Each has its own latest inflation figures and its
  // own response curves (estimated in the pipeline); national is the fallback.
  const typ = () => (D.types && (D.types[state.where] || D.types.national)) || null;
  const cpiNow = () => (typ() ? typ().cpi_latest : D.cpi_latest);
  const MODEL = () => (D.projections.retail_fuel ? "retail_fuel" : D.model.primary_shock);
  // Fuel uses the fuel-only index (TPSO 52200) rather than the wider "vehicles and fuel" group.
  const ITEMS = [["fuel", "fuel", "itemFuel", "vehicles_fuel"], ["food", "food", "itemFood"], ["elec", "electricity_fuel_water", "itemElec"], ["other", "core", "itemOther"]];
  const levelPaths = (key) => { const ty = typ(); if (ty && ty.projections[key]) return ty.projections[key].level_ahead_pct; return D.projections[key].observed_mtd.level_ahead_pct; };
  // Electricity: where the regulator has already announced the tariff, that known change replaces the
  // model for the electricity share of the "electricity, gas, water" group; the model takes over after.
  function elecPath(lv) {
    const grp = lv.electricity_fuel_water; if (!grp) return { path: null, covered: 0 };
    const ft = D.electricity_tariff; const el = lv.electricity || grp;
    if (!ft || !ft.months_covered) return { path: grp, covered: 0 };
    const w = (typ() && typ().weights) || D.weights; const we = w && w.electricity && w.electricity_fuel_water ? w.electricity / w.electricity_fuel_water : 0.7;
    const known = ft.known_change_pct, n = known.length;
    const path = grp.map((g, i) => { const e = i < n ? known[i] : known[n - 1] + (el[i] - el[n - 1]); return we * e + (1 - we) * g; });
    return { path, covered: n };
  }
  function ahead(key) {
    // further price-level change from today (percent) × what the household spends on each item
    const lv = levelPaths(key); const sp = spends(); const total = new Array(24).fill(0); const rows = {};
    ITEMS.forEach(([item, oc, , alt]) => {
      let p = item === "elec" ? elecPath(lv).path : (lv[oc] || (alt && lv[alt])); if (!p) return;
      rows[item] = p.map((pct) => sp[item] * pct / 100); rows[item].forEach((v, i) => { total[i] += v; });
    });
    const peak = total.slice(0, 12).reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), total[0]); const peakH = total.indexOf(peak) + 1;
    return { total, rows, peak, peakH };
  }
  // What-if: a crude move is chained through the estimated crude -> pump pass-through, then through the
  // pump-price model (the most accurate one in testing). Falls back to the crude model if either is missing.
  const passThrough = () => (D.pass_through && D.pass_through.all ? D.pass_through.all.cumulative : null);
  function scenario(pct) {
    const pt = passThrough(); const key = pt != null && D.irfs.retail_fuel ? "retail_fuel" : D.model.primary_shock;
    const irfs = D.irfs[key]; const eff = key === "retail_fuel" ? pct * pt : pct; const sp = spends(); const total = new Array(24).fill(0);
    ITEMS.forEach(([item, oc, , alt]) => { const irf = irfs[oc] || (alt && irfs[alt]); if (irf) irf.forEach((r, i) => { total[i] += sp[item] * r.beta * eff / 100; }); });
    const peak = total.slice(0, 12).reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), total[0]); return { peak, pumpPct: eff, chained: key === "retail_fuel" };
  }
  const whereLabel = () => { const l = t(WHERE.find(([k]) => k === state.where)[1]); return lang === "en" ? l.toLowerCase().replace("whole country", "whole country").replace("low-income household", "low-income household group") : l; };

  // ---- shared counters and comments (Netlify function at /api/count and /api/feedback, backed by
  // Netlify Blobs). Every page load counts one visit; every "did this help" click counts one answer.
  // Silent when the function is absent, e.g. when the page is served locally.
  const COUNT_URL = "/api/count", FEEDBACK_URL = "/api/feedback";
  let counts = null;
  const postJSON = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const bump = (event) => postJSON(COUNT_URL, { event }).then((r) => (r.ok ? r.json() : null)).then((c) => { if (c) { counts = c; renderCounters(); } }).catch(() => {});
  function renderCounters() {
    const el = $("counters"); if (!counts || !counts.visit) { el.hidden = true; return; }
    const helped = (counts.helped_yes || 0) + (counts.helped_some || 0);
    el.innerHTML = t("counters", { visits: num(counts.visit), helped: helped ? num(helped) : 0 }); el.hidden = false;
  }
  let fbAnswer = null;
  function renderFeedback() {
    chips($("fbChips"), [["fbYes", "yes"], ["fbSome", "some"], ["fbNo", "no"]].map(([k, v]) => [t(k), v]), fbAnswer, (v) => {
      if (v === fbAnswer) return;
      fbAnswer = v; $("fbMore").hidden = false; $("fbDone").hidden = true;
      bump(v === "yes" ? "helped_yes" : v === "some" ? "helped_some" : "helped_no");
      postJSON(FEEDBACK_URL, { helped: v, where: state.where, lang, comment: "", website: $("fbHp").value }).catch(() => {});
    });
  }
  function renderTestimonials(items) {
    const list = (items || []).filter((q) => q && q.text && (!q.lang || q.lang === lang)).slice(0, 6);
    $("testimonials").hidden = list.length === 0;
    $("quoteList").innerHTML = list.map((q) => `<blockquote class="quote">${q.text.replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[ch]))}<small>${[q.where, q.when].filter(Boolean).join(" · ")}</small></blockquote>`).join("");
  }
  let testimonials = [];

  function render() {
    document.documentElement.lang = lang; document.title = t("brand");
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $("langToggle").textContent = lang === "th" ? "EN" : "ไทย";
    if (!D) return;
    const c = D.current, nc = c.nowcast, cpi = cpiNow(), r = D.retail; const pn = pumpNow(), pa = pumpAgo(); const pname = T[lang].prod[state.product];
    // facts
    $("dateline").textContent = t("asOf", dateLabel((D.generated_at || "").slice(0, 10)));
    const dl = pn - pa; const f = $("fPump"); f.textContent = signed(dl, 2); f.classList.toggle("neg", dl < 0); $("fPumpText").textContent = t("pumpFact", { prod: pname, now: num(pn, 2), ago: num(pa, 2) });
    $("fCpi").textContent = signed(D.cpi_latest.headline_yoy, 1, "%"); $("fCpiText").textContent = t("cpiFact", mLabel(D.cpi_latest.month));
    const s = c.shock_mtd_pct; const fo = $("fOil"); fo.textContent = signed(s, 1, "%"); fo.classList.toggle("neg", s < 0); $("fOilText").textContent = t("oilFact", dateLabel(nc.brent_latest_date));
    // inputs
    chips($("fuelChips"), FUEL_PRESETS.map(([k, v]) => [t(k), v]), state.litres, (v) => { state.litres = v; $("litres").value = v; });
    $("fuelType").innerHTML = PRODUCTS.filter((p) => r.prices[p] != null).map((p) => `<option value="${p}" ${p === state.product ? "selected" : ""}>${T[lang].prod[p]}</option>`).join("");
    chips($("foodChips"), FOOD.map((v) => [num(v), v]), state.food, (v) => { state.food = v; $("food").value = v; });
    chips($("elecChips"), ELEC.map((v) => [num(v), v]), state.elec, (v) => { state.elec = v; $("elec").value = v; });
    chips($("otherChips"), OTHER.map((v) => [num(v), v]), state.other, (v) => { state.other = v; $("other").value = v; });
    chips($("whereChips"), WHERE.filter(([k]) => !D.types || D.types[k]).map(([k, lab]) => [t(lab), k]), state.where, (v) => { state.where = v; try { localStorage.setItem("where", v); } catch (e) {} });
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
    $("typeNote").textContent = t("typeNote", { where: whereLabel() });
    bars($("nowBars"), [
      { label: t("itemFuel"), note: t("noteFuel", { prod: pname, ago: num(pa, 2), now: num(pn, 2), l: num(state.litres) }), value: now.fuel },
      { label: t("itemFood"), note: t("noteIdx", { what: t("idxFood"), pct: signed(cpi.food_yoy, 1, "%") }), value: now.food },
      { label: t("itemElec"), note: t("noteIdx", { what: t("idxElec"), pct: signed(cpi.electricity_fuel_water_yoy, 1, "%") }), value: now.elec },
      { label: t("itemOther"), note: t("noteIdx", { what: t("idxOther"), pct: signed(cpi.core_yoy, 1, "%") }), value: now.other },
    ]);
    // ---- still to come. The pump-price model is the headline estimate: in the rolling backtest it
    // beats both the crude model and their average on every measure. Crude is shown as the alternative.
    const key = MODEL();
    const ah = ahead(key);
    const months = Array.from({ length: 24 }, (_, i) => addMonths(c.month, i + 1));
    $("nextLead").textContent = ah.peak >= 0 ? t("nextLeadUp") : t("nextLeadDown");
    const nb = $("nextTotal"); nb.textContent = num(round10(Math.abs(ah.peak))); nb.className = ah.peak >= 0 ? "up" : "down";
    $("nextWhen").textContent = t("nextWhen", { m: mLabel(months[ah.peakH - 1]), total: num(round10(nowTotal + ah.peak)) });
    if (D.projections.retail_fuel) {
      const b = ahead(D.model.primary_shock).total[ah.peakH - 1];
      const r6 = D.backtests && D.backtests.retail_fuel ? D.backtests.retail_fuel.headline.by_h.find((x) => x.h === 6) : null;
      $("nextRange").textContent = t("nextRange", { alt: num(round10(b)), err: num(round10(0.01 * total * (r6 ? r6.rmse : 1))), where: whereLabel() });
    }
    const ft = D.electricity_tariff;
    if (ft && ft.months_covered) {
      const ch = ft.change_from_previous_pct; const chTxt = ch == null ? "" : Math.abs(ch) < 0.05 ? t("elecSame") : ch > 0 ? t("elecUp", num(ch, 1) + "%") : t("elecDown", num(Math.abs(ch), 1) + "%");
      const per = lang === "th" ? `${mLabel(ft.current.start)} ถึง ${mLabel(ft.current.end)}` : `${mLabel(ft.current.start)} to ${mLabel(ft.current.end)}`;
      $("nextElec").textContent = t("elecKnown", { period: per, tariff: num(ft.current.tariff_thb_per_kwh, 2), change: chTxt, until: mLabel(ft.covered_until) });
    } else { $("nextElec").textContent = ""; }
    bars($("nextBars"), ITEMS.map(([item, oc, lab]) => ({ label: t(lab), value: ah.rows[item] ? ah.rows[item][ah.peakH - 1] : 0 })));
    const bt = D.backtests && (D.backtests.retail_fuel || D.backtests[D.model.primary_shock]); if (bt) { const r6 = bt.headline.by_h.find((x) => x.h === 6); if (r6) $("nextAccuracy").textContent = t("accuracy", { rmse: num(r6.rmse, 1), naive: num(r6.rmse_no_change, 1), lo: num(3 - r6.rmse, 1), hi: num(3 + r6.rmse, 1) }); }
    // ---- what if
    chips($("whatifChips"), WHATIF.map(([k, v]) => [t(k), v]), state.whatif, (v) => { state.whatif = v; });
    const sc = scenario(state.whatif);
    const pt = passThrough();
    const dPump = sc.chained ? pn * (Math.exp(sc.pumpPct / 100) - 1) : (nc.dubai_spot_nowcast_thb / 158.987) * (Math.exp(state.whatif / 100) - 1) * 1.07;
    $("whatifAnswer").textContent = t("whatif", { dir: `${t(state.whatif > 0 ? "up" : "down")} ${num(Math.abs(state.whatif))}%`, more: sc.peak >= 0 ? t("moreWord") : t("lessWord"), peak: num(round10(Math.abs(sc.peak))), prod: pname, pump: num(Math.abs(dPump), 1), pumpDir: dPump >= 0 ? t("pumpUp") : t("pumpDown") });
    if (sc.chained) {
      const rg = D.regime_now; let regime = "";
      if (rg && rg.diesel_levy_thb_per_litre != null && D.pass_through) {
        const sub = D.pass_through[rg.subsidy ? "subsidy" : "collecting"];
        regime = t(rg.subsidy ? "regimeSub" : "regimeCol", { date: dateLabel(rg.date), levy: num(Math.abs(rg.diesel_levy_thb_per_litre), 2), pt: sub ? num(100 * sub.cumulative, 0) + "%" : "–" });
      }
      $("whatifNote").textContent = t("whatifNote", { pt: num(100 * pt, 0) + "%", regime });
    } else { $("whatifNote").textContent = ""; }
    // ---- why
    const irfs = D.irfs[D.model.primary_shock]; const pk = (oc) => irfs[oc].reduce((a, b) => (b.beta > a.beta ? b : a), irfs[oc][0]);
    const yoy = c.dubai_thb_yoy_pct;
    const cards = t("whyCards", { pump: signed(100 * (pn / pa - 1), 0, "%"), prod: pname, dir: yoy >= 0 ? (lang === "th" ? "แพงขึ้น" : "up") : (lang === "th" ? "ถูกลง" : "down"), crude: num(Math.abs(yoy), 0) + "%", energy: signed(pk("energy").beta * 10, 1, "%"), head: signed(pk("headline").beta * 10, 1, "%"), foodH: (lang === "th" ? "เดือนที่ " : "Month ") + pk("food").h });
    $("whyList").innerHTML = cards.map(([b, p]) => `<div class="why-card"><b>${b}</b><p>${p}</p></div>`).join("");
    // share
    const shareText = t("shareText", { now: num(round10(nowTotal)), next: num(round10(ah.peak)) });
    const url = location.href.split("#")[0];
    $("lineBtn").href = "https://social-plugins.line.me/lineit/share?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(shareText);
    $("copyBtn").onclick = () => { bump("share"); navigator.clipboard && navigator.clipboard.writeText(shareText + url).then(() => { $("copyDone").textContent = t("copied"); setTimeout(() => { $("copyDone").textContent = ""; }, 2000); }); };
    $("footSources").textContent = t("foot", (D.generated_at || "").slice(0, 10));
    renderCounters(); renderFeedback(); renderTestimonials(testimonials);
  }

  $("langToggle").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; try { localStorage.setItem("lang", lang); } catch (e) {} render(); });
  $("lineBtn").addEventListener("click", () => bump("share"));
  $("fbForm").addEventListener("submit", (e) => {
    e.preventDefault(); const text = $("fbText").value.trim(); const done = $("fbDone");
    if (!text) { done.textContent = t("fbEmpty"); done.hidden = false; return; }
    postJSON(FEEDBACK_URL, { helped: fbAnswer || "", where: state.where, lang, comment: text, website: $("fbHp").value })
      .then((r) => { const ok = r.ok; done.textContent = ok ? t("fbThanks") : t("fbFail"); done.hidden = false; if (ok) { $("fbText").value = ""; $("fbMore").hidden = true; bump("comment"); } })
      .catch(() => { done.textContent = t("fbFail"); done.hidden = false; });
  });
  $("litres").addEventListener("input", (e) => { state.litres = +e.target.value || 0; render(); });
  $("fuelType").addEventListener("change", (e) => { state.product = e.target.value; render(); });
  $("food").addEventListener("input", (e) => { state.food = +e.target.value || 0; render(); });
  $("elec").addEventListener("input", (e) => { state.elec = +e.target.value || 0; render(); });
  $("other").addEventListener("input", (e) => { state.other = +e.target.value || 0; render(); });
  render();
  bump("visit");
  fetch("data/testimonials.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && Array.isArray(j.items)) { testimonials = j.items; if (D) renderTestimonials(testimonials); } }).catch(() => {});
  fetch("data/latest.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { D = d; render(); })
    .catch((err) => { console.error(err); const p = document.createElement("p"); p.className = "muted"; p.textContent = t("loadError"); document.querySelector("main").prepend(p); });
})();
