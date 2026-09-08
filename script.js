const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

const tools=[
  ["image-convert","图片格式转换","JPG、PNG、WebP互转"],["image-compress","图片压缩","减小图片文件体积"],
  ["image-resize","调整图片尺寸","按像素或比例缩放"],["image-crop","图片裁剪","裁剪图片可见区域"],
  ["image-rotate","图片旋转","90°、180°旋转图片"],["image-pdf","图片转 PDF","把图片制作成 PDF"],
  ["pdf-merge","PDF 合并","多个 PDF 合成一个文件"],["pdf-split","PDF 拆分","提取 PDF 指定页面"],
  ["pdf-compress","PDF 压缩","降低 PDF 文件大小"],["pdf-jpg","PDF → JPG","将 PDF 页面转成图片"],
  ["word-count","字数统计","统计字符、单词和行数"],["json","JSON 格式化","美化、压缩和校验 JSON"],
  ["base64","Base64 编解码","文本 Base64 编码与解码"],["url","URL 编解码","URL Encode / Decode"],
  ["markdown","Markdown 编辑器","实时预览 Markdown"],["qr","二维码生成","输入文字或网址生成二维码"],
  ["timestamp","时间戳转换","Unix 时间戳与日期互转"],["unit","单位转换","长度、重量、温度等转换"],
  ["password","随机密码","生成安全随机密码"],["uuid","UUID 生成","生成 UUID v4"]
];

const modal=$("#modal"), modalContent=$("#modalContent");
function openModal(id){
  const t=tools.find(x=>x[0]===id); if(!t)return;
  modalContent.innerHTML=`<h2>${toolTitle(id)}</h2><p class="hint">${toolDesc(id)} · ${tr("尽量在浏览器本地处理")}</p>${ui[id]||`<p>${tr("该工具正在完善中。")}</p>`}`;
  modal.classList.remove("hidden"); bindTool(id); translateModal();
}
function closeModal(){modal.classList.add("hidden")}
$("#modalClose").onclick=closeModal; $(".modal-backdrop").onclick=closeModal;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#searchInput").focus()}});
$$("[data-tool]").forEach(x=>x.onclick=()=>openModal(x.dataset.tool));

$("#themeToggle").onclick=()=>{document.body.classList.toggle("dark");$("#themeToggle").textContent=document.body.classList.contains("dark")?"☀️":"🌙";localStorage.setItem("dark",document.body.classList.contains("dark"))};
if(localStorage.getItem("dark")==="true"){document.body.classList.add("dark");$("#themeToggle").textContent="☀️"}

function fileInput(accept,multiple=false){return `<input id="file" type="file" accept="${accept}" ${multiple?"multiple":""} hidden><div class="drop" id="drop">点击选择文件${multiple?"（可多选）":""}</div>`}
function wireFile(){const i=$("#file"),d=$("#drop");d.onclick=()=>i.click();i.onchange=()=>d.textContent=i.files.length?`已选择 ${i.files.length} 个文件`:"点击选择文件"}

const ui={
"image-convert":`${fileInput("image/*")}<div class="row"><select id="fmt"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></select><button class="btn" id="go">转换并下载</button></div><div id="msg" class="output">请选择图片。</div>`,
"image-compress":`${fileInput("image/*")}<label>质量：<input id="quality" type="range" min=".1" max="1" step=".05" value=".75"></label><button class="btn" id="go">压缩并下载</button><div id="msg" class="output">浏览器本地压缩。</div>`,
"image-resize":`${fileInput("image/*")}<div class="row"><input id="w" type="number" placeholder="宽度 px"><input id="h" type="number" placeholder="高度 px"></div><label><input id="keep" type="checkbox" checked> 保持比例</label><button class="btn" id="go">调整并下载</button><div id="msg" class="output">请输入尺寸。</div>`,
"image-crop":`${fileInput("image/*")}<div class="row"><input id="x" type="number" placeholder="X"><input id="y" type="number" placeholder="Y"><input id="w" type="number" placeholder="宽"><input id="h" type="number" placeholder="高"></div><button class="btn" id="go">裁剪并下载</button><div id="msg" class="output">请输入裁剪区域。</div>`,
"image-rotate":`${fileInput("image/*")}<select id="angle"><option>90</option><option>180</option><option>270</option></select><button class="btn" id="go">旋转并下载</button><div id="msg" class="output">请选择图片。</div>`,
"image-pdf":`${fileInput("image/*",true)}<button class="btn" id="go">生成 PDF</button><div id="msg" class="output">第一版使用浏览器打印功能生成 PDF。</div>`,
"pdf-merge":`${fileInput(".pdf",true)}<button class="btn" id="go">合并 PDF</button><div class="output">说明：纯静态版本暂不直接修改 PDF 二进制内容。后续可接入 PDF.js / pdf-lib。</div>`,
"pdf-split":`${fileInput(".pdf")}<input id="pages" placeholder="页面，例如 1-3"><button class="btn" id="go">拆分</button><div class="output">说明：纯静态版本暂不直接修改 PDF 二进制内容。</div>`,
"pdf-compress":`${fileInput(".pdf")}<button class="btn" id="go">压缩</button><div class="output">说明：PDF 压缩需要进一步接入浏览器 PDF 库。</div>`,
"pdf-jpg":`${fileInput(".pdf")}<button class="btn" id="go">转换</button><div class="output">说明：PDF 转图片需要 PDF.js；可在下一版加入。</div>`,
"word-count":`<textarea id="text" placeholder="在这里输入或粘贴文字..."></textarea><div id="msg" class="output">字符：0 · 不含空格：0 · 单词：0 · 行：0</div>`,
"json":`<textarea id="text" placeholder='{"name":"万能工具箱","version":1}'></textarea><div class="row"><button class="btn" id="format">格式化</button><button class="btn secondary" id="minify">压缩</button></div><div id="msg" class="output"></div>`,
"base64":`<textarea id="text" placeholder="输入文本..."></textarea><div class="row"><button class="btn" id="enc">编码</button><button class="btn secondary" id="dec">解码</button></div><div id="msg" class="output"></div>`,
"url":`<textarea id="text" placeholder="输入网址或文字..."></textarea><div class="row"><button class="btn" id="enc">URL编码</button><button class="btn secondary" id="dec">URL解码</button></div><div id="msg" class="output"></div>`,
"markdown":`<div class="row"><textarea id="md" placeholder="# 标题&#10;&#10;输入 Markdown..."></textarea><div id="preview" class="output" style="flex:1;min-height:180px"></div></div>`,
"qr":`<input id="qrText" placeholder="输入网址、文字或联系方式"><button class="btn" id="go">生成二维码</button><div id="qrBox"></div><p class="hint">二维码使用浏览器联网加载 QRCode.js；离线时可直接输入文字生成。</p>`,
"timestamp":`<div class="row"><input id="date" type="datetime-local"><button class="btn" id="toTs">日期 → 时间戳</button><button class="btn secondary" id="nowTs">当前时间戳</button></div><input id="ts" type="number" placeholder="输入 Unix 时间戳（秒）"><button class="btn" id="toDate">时间戳 → 日期</button><div id="msg" class="output"></div>`,
"unit":`<div class="row"><select id="type"><option value="length">长度</option><option value="weight">重量</option><option value="temp">温度</option></select><input id="num" type="number" value="1"></div><div class="row"><select id="from"></select><select id="to"></select></div><button class="btn" id="go">转换</button><div id="msg" class="output"></div>`,
"password":`<div class="row"><input id="len" type="number" min="4" max="128" value="16"><label><input id="sym" type="checkbox" checked> 特殊字符</label></div><button class="btn" id="go">生成密码</button><div id="msg" class="output"></div>`,
"uuid":`<button class="btn" id="go">生成 UUID</button><div id="msg" class="output"></div>`
};

function bindTool(id){
  if(id.startsWith("image-")) {wireFile(); if(id==="image-convert") imageConvert(); if(id==="image-compress") imageCompress(); if(id==="image-resize") imageResize(); if(id==="image-crop") imageCrop(); if(id==="image-rotate") imageRotate(); if(id==="image-pdf") imagePdf(); return}
  if(id==="word-count"){const t=$("#text");const f=()=>{const v=t.value;$("#msg").textContent=`字符：${v.length} · 不含空格：${v.replace(/\s/g,"").length} · 单词：${v.trim()?v.trim().split(/\s+/).length:0} · 行：${v? v.split(/\n/).length:0}`};t.oninput=f;return}
  if(id==="json"){$("#format").onclick=()=>jsonDo(2);$("#minify").onclick=()=>jsonDo(0);return}
  if(id==="base64"){$("#enc").onclick=()=>$("#msg").textContent=btoa(unescape(encodeURIComponent($("#text").value)));$("#dec").onclick=()=>{try{$("#msg").textContent=decodeURIComponent(escape(atob($("#text").value)))}catch(e){$("#msg").textContent="解码失败，请检查内容。"}};return}
  if(id==="url"){$("#enc").onclick=()=>$("#msg").textContent=encodeURIComponent($("#text").value);$("#dec").onclick=()=>{try{$("#msg").textContent=decodeURIComponent($("#text").value)}catch(e){$("#msg").textContent="解码失败。"}};return}
  if(id==="markdown"){const render=()=>{$("#preview").innerHTML=simpleMd($("#md").value)};$("#md").oninput=render;render();return}
  if(id==="qr"){$("#go").onclick=()=>{const v=$("#qrText").value.trim();if(!v)return;$("#qrBox").innerHTML=`<img class="qr" alt="二维码" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(v)}">`};return}
  if(id==="timestamp"){const now=()=>Math.floor(Date.now()/1000);$("#nowTs").onclick=()=>$("#msg").textContent=now();$("#toTs").onclick=()=>$("#msg").textContent=$("#date").value?Math.floor(new Date($("#date").value).getTime()/1000):"请选择日期";$("#toDate").onclick=()=>{const n=Number($("#ts").value);$("#msg").textContent=n?new Date(n*1000).toLocaleString():"请输入时间戳"};return}
  if(id==="unit"){unitInit();$("#type").onchange=unitInit;$("#go").onclick=unitConvert;return}
  if(id==="password"){$("#go").onclick=genPass;return}
  if(id==="uuid"){$("#go").onclick=()=>$("#msg").textContent=crypto.randomUUID();return}
}
function jsonDo(space){try{$("#msg").textContent=JSON.stringify(JSON.parse($("#text").value),null,space)}catch(e){$("#msg").textContent="JSON 格式错误："+e.message}}
function simpleMd(s){let x=s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");x=x.replace(/^### (.*)$/gm,"<h4>$1</h4>").replace(/^## (.*)$/gm,"<h3>$1</h3>").replace(/^# (.*)$/gm,"<h2>$1</h2>").replace(/\*\*(.*?)\*\*/g,"<b>$1</b>").replace(/\*(.*?)\*/g,"<i>$1</i>").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\n/g,"<br>");return x}
function loadImage(file){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(file)})}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function canvasFile(file,w,h,angle=0,quality=.9,type="image/png",crop=null){const im=await loadImage(file);let cw=w||im.naturalWidth,ch=h||im.naturalHeight;if(angle%180!==0)[cw,ch]=[ch,cw];const c=document.createElement("canvas");c.width=cw;c.height=ch;const ctx=c.getContext("2d");ctx.translate(cw/2,ch/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(im,-(w||im.naturalWidth)/2,-(h||im.naturalHeight)/2,w||im.naturalWidth,h||im.naturalHeight);return new Promise(r=>c.toBlob(r,type,quality))}
function imageConvert(){const go=async()=>{const f=$("#file").files[0];if(!f)return $("#msg").textContent="请选择图片";const b=await canvasFile(f);downloadBlob(b,`converted.${$("#fmt").value.split("/")[1]}`);$("#msg").textContent="已下载。"};$("#go").onclick=go}
function imageCompress(){$("#go").onclick=async()=>{const f=$("#file").files[0];if(!f)return;const b=await canvasFile(f,null,null,0,Number($("#quality").value),"image/jpeg");downloadBlob(b,"compressed.jpg");$("#msg").textContent=`原文件：${(f.size/1024).toFixed(1)} KB → 新文件：${(b.size/1024).toFixed(1)} KB`}}
function imageResize(){$("#go").onclick=async()=>{const f=$("#file").files[0];if(!f)return;const im=await loadImage(f);let w=Number($("#w").value)||im.naturalWidth,h=Number($("#h").value)||im.naturalHeight;if($("#keep").checked){if($("#w").value)h=Math.round(w*im.naturalHeight/im.naturalWidth);else w=Math.round(h*im.naturalWidth/im.naturalHeight)}const b=await canvasFile(f,w,h);downloadBlob(b,"resized.png")}}
function imageCrop(){$("#go").onclick=async()=>{const f=$("#file").files[0];if(!f)return;const im=await loadImage(f),x=Number($("#x").value)||0,y=Number($("#y").value)||0,w=Number($("#w").value)||im.naturalWidth,h=Number($("#h").value)||im.naturalHeight,c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(im,x,y,w,h,0,0,w,h);c.toBlob(b=>downloadBlob(b,"cropped.png"))}}
function imageRotate(){$("#go").onclick=async()=>{const f=$("#file").files[0];if(!f)return;const im=await loadImage(f),a=Number($("#angle").value),c=document.createElement("canvas");c.width=a%180?im.naturalHeight:im.naturalWidth;c.height=a%180?im.naturalWidth:im.naturalHeight;const x=c.getContext("2d");x.translate(c.width/2,c.height/2);x.rotate(a*Math.PI/180);x.drawImage(im,-im.naturalWidth/2,-im.naturalHeight/2);c.toBlob(b=>downloadBlob(b,"rotated.png"))}}
function imagePdf(){ $("#go").onclick=()=>window.print() }

function unitInit(){const sets={length:["米","千米","厘米","英寸","英尺"],weight:["千克","克","磅"],temp:["摄氏度","华氏度","开尔文"]};const arr=sets[$("#type").value];["#from","#to"].forEach(s=>$(s).innerHTML=arr.map(x=>`<option>${x}</option>`).join(""))}
function unitConvert(){const n=Number($("#num").value),t=$("#type").value,f=$("#from").value,to=$("#to").value;let v=n;if(t==="length"){const m={"米":1,"千米":1000,"厘米":.01,"英寸":.0254,"英尺":.3048};v=n*m[f]/m[to]}else if(t==="weight"){const m={"千克":1,"克":.001,"磅":.45359237};v=n*m[f]/m[to]}else{let c=f==="摄氏度"?n:f==="华氏度"?(n-32)*5/9:n-273.15;v=to==="摄氏度"?c:to==="华氏度"?c*9/5+32:c+273.15}$("#msg").textContent=`${n} ${f} = ${Number(v.toFixed(8))} ${to}`}
function genPass(){const len=Math.min(128,Math.max(4,Number($("#len").value)||16));let chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";if($("#sym").checked)chars+="!@#$%^&*_-+=?";const a=new Uint32Array(len);crypto.getRandomValues(a);let p=[...a].map(n=>chars[n%chars.length]).join("");$("#msg").textContent=p;navigator.clipboard?.writeText(p)}

const search=$("#searchInput"),result=$("#searchResult");
function doSearch(q){q=q.trim().toLowerCase();if(!q){result.classList.add("hidden");$$(".tool-section").forEach(s=>s.style.display="");return}const hits=tools.filter(t=>t.join(" ").toLowerCase().includes(q));$$(".tool-section").forEach(s=>s.style.display="none");result.classList.remove("hidden");result.innerHTML=`<h2>搜索结果（${hits.length}）</h2><div class="search-grid">${hits.map(t=>`<a class="tool-card" href="javascript:void(0)" data-tool="${t[0]}"><span>🛠️</span><h3>${t[1]}</h3><p>${t[2]}</p></a>`).join("")}</div>`;$$(".search-grid [data-tool]").forEach(x=>x.onclick=()=>openModal(x.dataset.tool))}
search.oninput=e=>doSearch(e.target.value);$$(".quick-tags button").forEach(b=>b.onclick=()=>{search.value=b.dataset.search;doSearch(search.value);window.scrollTo({top:result.offsetTop-90,behavior:"smooth"})});

/* ===== 多语言系统 ===== */
const LANGS=["zh","en","ja","ko","es","fr","de","pt"];
const LANG_NAMES={zh:"中文",en:"English",ja:"日本語",ko:"한국어",es:"Español",fr:"Français",de:"Deutsch",pt:"Português"};
const I18N={
zh:{
brand:"万能工具箱",navImage:"图片",navPdf:"PDF",navText:"文字",navUtility:"实用",eyebrow:"100+ 实用工具 · 持续增加",
heroTitle:"简单、快速的",heroTitle2:"万能在线工具箱",heroDesc:"图片、PDF、文字、开发者工具和日常小工具，一站式完成。",
search:"搜索工具，例如：图片压缩、二维码、JSON...",q1:"图片压缩",q2:"JPG转换",q3:"PDF工具",q4:"二维码",q5:"JSON格式化",
image:"图片工具",imageDesc:"常见图片格式和尺寸处理",pdf:"PDF 工具",pdfDesc:"常用 PDF 文件处理",text:"文字 & 开发者工具",textDesc:"编码、格式化和文本处理",utility:"实用工具",utilityDesc:"日常工作和生活小工具",
footer1:"© 2026 万能工具箱",footer2:"本网站持续增加更多免费工具",result:"搜索结果",local:"尽量在浏览器本地处理",develop:"该工具正在完善中。"
},
en:{
brand:"All-in-One Tools",navImage:"Images",navPdf:"PDF",navText:"Text",navUtility:"Utilities",eyebrow:"100+ useful tools · More coming",
heroTitle:"Simple, fast",heroTitle2:"Online Toolbox",heroDesc:"Images, PDFs, text, developer tools and everyday utilities — all in one place.",
search:"Search tools, e.g. image compressor, QR code, JSON...",q1:"Image compression",q2:"JPG converter",q3:"PDF tools",q4:"QR code",q5:"JSON formatter",
image:"Image Tools",imageDesc:"Convert, resize and edit common image formats",pdf:"PDF Tools",pdfDesc:"Common PDF processing tools",text:"Text & Developer Tools",textDesc:"Encoding, formatting and text utilities",utility:"Utilities",utilityDesc:"Useful tools for work and everyday life",
footer1:"© 2026 All-in-One Tools",footer2:"More free tools are added continuously",result:"Search results",local:"Processed in your browser when possible",develop:"This tool is being improved."
},
ja:{
brand:"万能ツールボックス",navImage:"画像",navPdf:"PDF",navText:"文字",navUtility:"便利ツール",eyebrow:"100以上の便利ツール · 続々追加",
heroTitle:"シンプルで高速な",heroTitle2:"オンラインツールボックス",heroDesc:"画像、PDF、文字、開発者ツール、日常ツールを一か所で利用できます。",
search:"ツールを検索（画像圧縮、QRコード、JSONなど）",q1:"画像圧縮",q2:"JPG変換",q3:"PDFツール",q4:"QRコード",q5:"JSON整形",
image:"画像ツール",imageDesc:"画像形式の変換・サイズ変更・編集",pdf:"PDFツール",pdfDesc:"よく使うPDF処理ツール",text:"文字・開発者ツール",textDesc:"エンコード、整形、テキスト処理",utility:"便利ツール",utilityDesc:"仕事や日常で役立つツール",
footer1:"© 2026 万能ツールボックス",footer2:"無料ツールを継続的に追加します",result:"検索結果",local:"可能な限りブラウザ内で処理します",develop:"このツールは現在改善中です。"
},
ko:{
brand:"올인원 도구함",navImage:"이미지",navPdf:"PDF",navText:"텍스트",navUtility:"유틸리티",eyebrow:"100개 이상의 유용한 도구 · 계속 추가",
heroTitle:"간단하고 빠른",heroTitle2:"온라인 도구함",heroDesc:"이미지, PDF, 텍스트, 개발자 도구와 일상 도구를 한곳에서 사용하세요.",
search:"도구 검색 (이미지 압축, QR 코드, JSON 등)",q1:"이미지 압축",q2:"JPG 변환",q3:"PDF 도구",q4:"QR 코드",q5:"JSON 포맷터",
image:"이미지 도구",imageDesc:"이미지 형식 변환 및 크기 조정",pdf:"PDF 도구",pdfDesc:"자주 사용하는 PDF 처리",text:"텍스트 & 개발자 도구",textDesc:"인코딩, 포맷팅 및 텍스트 처리",utility:"유틸리티",utilityDesc:"업무와 일상에 유용한 도구",
footer1:"© 2026 올인원 도구함",footer2:"무료 도구를 계속 추가합니다",result:"검색 결과",local:"가능한 경우 브라우저에서 처리합니다",develop:"이 도구는 현재 개선 중입니다."
},
es:{
brand:"Caja de Herramientas",navImage:"Imágenes",navPdf:"PDF",navText:"Texto",navUtility:"Utilidades",eyebrow:"Más de 100 herramientas · Más próximamente",
heroTitle:"Simple y rápido",heroTitle2:"Kit de herramientas online",heroDesc:"Imágenes, PDF, texto, herramientas para desarrolladores y utilidades diarias en un solo lugar.",
search:"Buscar herramientas, por ejemplo: comprimir imagen, código QR, JSON...",q1:"Comprimir imagen",q2:"Convertir JPG",q3:"Herramientas PDF",q4:"Código QR",q5:"Formatear JSON",
image:"Herramientas de imagen",imageDesc:"Convertir, cambiar tamaño y editar imágenes",pdf:"Herramientas PDF",pdfDesc:"Procesamiento habitual de PDF",text:"Texto y herramientas para desarrolladores",textDesc:"Codificación, formato y texto",utility:"Utilidades",utilityDesc:"Herramientas útiles para el trabajo y la vida diaria",
footer1:"© 2026 Caja de Herramientas",footer2:"Añadimos más herramientas gratuitas continuamente",result:"Resultados de búsqueda",local:"Procesado en tu navegador cuando es posible",develop:"Esta herramienta está en desarrollo."
},
fr:{
brand:"Boîte à outils",navImage:"Images",navPdf:"PDF",navText:"Texte",navUtility:"Utilitaires",eyebrow:"100+ outils utiles · Plus à venir",
heroTitle:"Simple et rapide",heroTitle2:"Boîte à outils en ligne",heroDesc:"Images, PDF, texte, outils pour développeurs et utilitaires quotidiens au même endroit.",
search:"Rechercher un outil, ex. compression d'image, QR code, JSON...",q1:"Compression d'image",q2:"Convertisseur JPG",q3:"Outils PDF",q4:"QR code",q5:"Formater JSON",
image:"Outils image",imageDesc:"Convertir, redimensionner et modifier les images",pdf:"Outils PDF",pdfDesc:"Traitement courant des fichiers PDF",text:"Texte & outils développeur",textDesc:"Encodage, formatage et traitement du texte",utility:"Utilitaires",utilityDesc:"Outils pratiques pour le travail et la vie quotidienne",
footer1:"© 2026 Boîte à outils",footer2:"De nouveaux outils gratuits sont ajoutés régulièrement",result:"Résultats de recherche",local:"Traité dans votre navigateur lorsque possible",develop:"Cet outil est en cours d'amélioration."
},
de:{
brand:"All-in-One Werkzeuge",navImage:"Bilder",navPdf:"PDF",navText:"Text",navUtility:"Werkzeuge",eyebrow:"100+ nützliche Tools · Weitere folgen",
heroTitle:"Einfach und schnell",heroTitle2:"Online-Werkzeugkasten",heroDesc:"Bilder, PDFs, Text, Entwickler-Tools und praktische Helfer an einem Ort.",
search:"Tool suchen, z. B. Bild komprimieren, QR-Code, JSON...",q1:"Bild komprimieren",q2:"JPG-Konverter",q3:"PDF-Tools",q4:"QR-Code",q5:"JSON formatieren",
image:"Bild-Tools",imageDesc:"Gängige Bildformate konvertieren und bearbeiten",pdf:"PDF-Tools",pdfDesc:"Häufige PDF-Bearbeitung",text:"Text- & Entwickler-Tools",textDesc:"Kodierung, Formatierung und Textverarbeitung",utility:"Werkzeuge",utilityDesc:"Nützliche Tools für Arbeit und Alltag",
footer1:"© 2026 All-in-One Werkzeuge",footer2:"Wir fügen laufend weitere kostenlose Tools hinzu",result:"Suchergebnisse",local:"Wenn möglich direkt im Browser verarbeitet",develop:"Dieses Tool wird derzeit verbessert."
},
pt:{
brand:"Caixa de Ferramentas",navImage:"Imagens",navPdf:"PDF",navText:"Texto",navUtility:"Utilidades",eyebrow:"Mais de 100 ferramentas · Novidades em breve",
heroTitle:"Simples e rápido",heroTitle2:"Caixa de ferramentas online",heroDesc:"Imagens, PDF, texto, ferramentas para desenvolvedores e utilidades diárias em um só lugar.",
search:"Pesquisar ferramentas, por exemplo: compactar imagem, QR code, JSON...",q1:"Compactar imagem",q2:"Conversor JPG",q3:"Ferramentas PDF",q4:"QR code",q5:"Formatar JSON",
image:"Ferramentas de imagem",imageDesc:"Converter, redimensionar e editar imagens",pdf:"Ferramentas PDF",pdfDesc:"Processamento comum de PDF",text:"Texto e ferramentas de desenvolvedor",textDesc:"Codificação, formatação e texto",utility:"Utilidades",utilityDesc:"Ferramentas úteis para trabalho e vida diária",
footer1:"© 2026 Caixa de Ferramentas",footer2:"Novas ferramentas gratuitas são adicionadas continuamente",result:"Resultados da pesquisa",local:"Processado no navegador sempre que possível",develop:"Esta ferramenta está em desenvolvimento."
}};
const TOOL_I18N={
"image-convert":["图片格式转换","JPG、PNG、WebP 互转","Image format converter","Convert JPG, PNG and WebP","画像形式変換","JPG、PNG、WebPを相互変換","이미지 형식 변환","JPG, PNG, WebP 변환","Convertidor de formatos","Convierte JPG, PNG y WebP","Convertisseur d’images","Convertit JPG, PNG et WebP","Bildformat-Konverter","JPG, PNG und WebP konvertieren","Conversor de formatos","Converta JPG, PNG e WebP"],
"image-compress":["图片压缩","减小图片文件体积","Image compressor","Reduce image file size","画像圧縮","画像ファイルサイズを削減","이미지 압축","이미지 파일 크기 줄이기","Compresor de imágenes","Reduce el tamaño de las imágenes","Compresseur d’image","Réduit la taille des images","Bildkompressor","Dateigröße von Bildern reduzieren","Compressor de imagens","Reduza o tamanho dos arquivos"],
"image-resize":["调整图片尺寸","按像素或比例缩放","Resize image","Scale by pixels or ratio","画像サイズ変更","ピクセルまたは比率で拡大縮小","이미지 크기 조정","픽셀 또는 비율로 크기 변경","Cambiar tamaño","Escala por píxeles o proporción","Redimensionner l’image","Mise à l’échelle par pixels ou ratio","Bildgröße ändern","Nach Pixeln oder Verhältnis skalieren","Redimensionar imagem","Altere por pixels ou proporção"],
"image-crop":["图片裁剪","裁剪图片可见区域","Crop image","Crop the visible area","画像切り抜き","表示領域を切り抜き","이미지 자르기","이미지 영역 자르기","Recortar imagen","Recorta el área visible","Rogner l’image","Rognez la zone visible","Bild zuschneiden","Sichtbaren Bereich zuschneiden","Cortar imagem","Corte a área visível"],
"image-rotate":["图片旋转","90°、180°旋转图片","Rotate image","Rotate images by 90°, 180°","画像回転","90°、180°回転","이미지 회전","90°, 180° 회전","Girar imagen","Gira 90° o 180°","Faire pivoter","Rotation à 90° ou 180°","Bild drehen","Um 90° oder 180° drehen","Girar imagem","Gire 90° ou 180°"],
"image-pdf":["图片转 PDF","把图片制作成 PDF","Images to PDF","Create a PDF from images","画像をPDFに変換","画像からPDFを作成","이미지를 PDF로","이미지로 PDF 만들기","Imágenes a PDF","Crea un PDF desde imágenes","Images en PDF","Créez un PDF à partir d’images","Bilder zu PDF","PDF aus Bildern erstellen","Imagens para PDF","Crie um PDF com imagens"],
"pdf-merge":["PDF 合并","多个 PDF 合成一个文件","Merge PDF","Combine multiple PDFs","PDF結合","複数のPDFを結合","PDF 병합","여러 PDF를 하나로 결합","Unir PDF","Combina varios PDF","Fusionner des PDF","Combinez plusieurs PDF","PDF zusammenfügen","Mehrere PDFs kombinieren","Mesclar PDF","Combine vários PDFs"],
"pdf-split":["PDF 拆分","提取 PDF 指定页面","Split PDF","Extract selected PDF pages","PDF分割","指定ページを抽出","PDF 분할","PDF 페이지 추출","Dividir PDF","Extrae páginas seleccionadas","Diviser un PDF","Extraire des pages","PDF teilen","Ausgewählte Seiten extrahieren","Dividir PDF","Extraia páginas"],
"pdf-compress":["PDF 压缩","降低 PDF 文件大小","Compress PDF","Reduce PDF file size","PDF圧縮","PDFサイズを削減","PDF 압축","PDF 파일 크기 줄이기","Comprimir PDF","Reduce el tamaño del PDF","Compresser PDF","Réduire la taille du PDF","PDF komprimieren","PDF-Dateigröße reduzieren","Comprimir PDF","Reduza o tamanho do PDF"],
"pdf-jpg":["PDF → JPG","将 PDF 页面转成图片","PDF to JPG","Convert PDF pages to images","PDF→JPG","PDFページを画像に変換","PDF → JPG","PDF 페이지를 이미지로 변환","PDF a JPG","Convierte páginas PDF en imágenes","PDF en JPG","Convertit les pages PDF en images","PDF → JPG","PDF-Seiten in Bilder umwandeln","PDF → JPG","Converta páginas PDF em imagens"],
"word-count":["字数统计","统计字符、单词和行数","Word counter","Count characters, words and lines","文字数カウント","文字・単語・行数を数える","글자 수 세기","문자, 단어, 줄 수 계산","Contador de palabras","Cuenta caracteres, palabras y líneas","Compteur de mots","Comptez caractères, mots et lignes","Wortzähler","Zeichen, Wörter und Zeilen zählen","Contador de palavras","Conte caracteres, palavras e linhas"],
"json":["JSON 格式化","美化、压缩和校验 JSON","JSON formatter","Format, minify and validate JSON","JSON整形","JSONを整形・圧縮・検証","JSON 포맷터","JSON 서식 지정 및 검증","Formateador JSON","Formatea y valida JSON","Formateur JSON","Formatez et validez JSON","JSON-Formatter","JSON formatieren und prüfen","Formatador JSON","Formate e valide JSON"],
"base64":["Base64 编解码","文本 Base64 编码与解码","Base64 encoder/decoder","Encode and decode Base64 text","Base64エンコード/デコード","Base64をエンコード・デコード","Base64 인코더/디코더","Base64 인코딩 및 디코딩","Codificador Base64","Codifica y decodifica Base64","Encodeur/décodeur Base64","Encodez et décodez Base64","Base64-Kodierung","Base64 kodieren und dekodieren","Codificador Base64","Codifique e decodifique Base64"],
"url":["URL 编解码","URL Encode / Decode","URL encoder/decoder","URL Encode / Decode","URLエンコード/デコード","URLのエンコードとデコード","URL 인코더/디코더","URL 인코딩 및 디코딩","Codificador URL","Codifica y decodifica URL","Encodeur/décodeur URL","Encodez et décodez des URL","URL-Kodierung","URL kodieren und dekodieren","Codificador URL","Codifique e decodifique URLs"],
"markdown":["Markdown 编辑器","实时预览 Markdown","Markdown editor","Live Markdown preview","Markdownエディター","Markdownをリアルタイムプレビュー","Markdown 편집기","실시간 Markdown 미리보기","Editor Markdown","Vista previa en vivo","Éditeur Markdown","Aperçu en direct","Markdown-Editor","Live-Vorschau","Editor Markdown","Visualização em tempo real"],
"qr":["二维码生成","输入文字或网址生成二维码","QR code generator","Generate a QR code from text or URL","QRコード生成","文字やURLからQRコードを生成","QR 코드 생성","텍스트 또는 URL로 QR 코드 생성","Generador de QR","Genera un QR desde texto o URL","Générateur QR","Générez un QR à partir d’un texte ou URL","QR-Code-Generator","QR-Code aus Text oder URL erstellen","Gerador de QR","Gere QR a partir de texto ou URL"],
"timestamp":["时间戳转换","Unix 时间戳与日期互转","Timestamp converter","Convert Unix timestamps and dates","タイムスタンプ変換","Unixタイムスタンプと日付を変換","타임스탬프 변환","Unix 타임스탬프와 날짜 변환","Conversor de marcas de tiempo","Convierte timestamps Unix y fechas","Convertisseur d’horodatage","Convertit les timestamps Unix et dates","Zeitstempel-Konverter","Unix-Zeitstempel und Datum umwandeln","Conversor de timestamp","Converta timestamps Unix e datas"],
"unit":["单位转换","长度、重量、温度等转换","Unit converter","Convert length, weight and temperature","単位変換","長さ・重量・温度などを変換","단위 변환","길이, 무게, 온도 변환","Conversor de unidades","Longitud, peso y temperatura","Convertisseur d’unités","Longueur, poids, température","Einheitenumrechner","Länge, Gewicht und Temperatur","Conversor de unidades","Converta comprimento, peso e temperatura"],
"password":["随机密码","生成安全随机密码","Random password","Generate a secure random password","ランダムパスワード","安全なランダムパスワードを生成","랜덤 비밀번호","안전한 랜덤 비밀번호 생성","Contraseña aleatoria","Genera una contraseña segura","Mot de passe aléatoire","Générez un mot de passe sécurisé","Zufälliges Passwort","Sicheres Passwort erzeugen","Senha aleatória","Gere uma senha segura"],
"uuid":["UUID 生成","生成 UUID v4","UUID generator","Generate UUID v4","UUID生成","UUID v4を生成","UUID 생성","UUID v4 생성","Generador UUID","Genera UUID v4","Générateur UUID","Générez un UUID v4","UUID-Generator","UUID v4 erzeugen","Gerador UUID","Gere UUID v4"]};

function tr(key){return (I18N[currentLang]&&I18N[currentLang][key])||key}
let currentLang=localStorage.getItem("toolboxLang")||"zh";
function toolTitle(id){const a=TOOL_I18N[id];if(!a)return tools.find(x=>x[0]===id)?.[1]||id;return a[LANGS.indexOf(currentLang)*2]||a[0]}
function toolDesc(id){const a=TOOL_I18N[id];if(!a)return tools.find(x=>x[0]===id)?.[2]||"";return a[LANGS.indexOf(currentLang)*2+1]||a[1]}
function translatePage(){
 document.documentElement.lang={zh:"zh-CN",en:"en",ja:"ja",ko:"ko",es:"es",fr:"fr",de:"de",pt:"pt-BR"}[currentLang];
 document.title=tr("brand")+" · All-in-One Online Tools";
 $(".brand span:last-child").textContent=tr("brand");
 const nav=$$(".nav-links a"); if(nav.length>=4){nav[0].textContent=tr("navImage");nav[1].textContent=tr("navPdf");nav[2].textContent=tr("navText");nav[3].textContent=tr("navUtility")}
 $(".eyebrow").textContent=tr("eyebrow");$(".hero h1").childNodes[0].textContent=tr("heroTitle")+" ";$(".hero h1 span").textContent=tr("heroTitle2");$(".hero p").textContent=tr("heroDesc");
 $("#searchInput").placeholder=tr("search");
 const qs=$$(".quick-tags button");[tr("q1"),tr("q2"),tr("q3"),tr("q4"),tr("q5")].forEach((v,i)=>{if(qs[i])qs[i].textContent=v});
 const sec=[["image","image","imageDesc"],["pdf","pdf","pdfDesc"],["text","text","textDesc"],["utility","utility","utilityDesc"]];
 sec.forEach(([id,title,desc])=>{const s=$("#"+id);if(s){s.querySelector("h2").textContent=tr(title);s.querySelector("p").textContent=tr(desc)}});
 $$(".tool-card[data-tool]").forEach(c=>{const id=c.dataset.tool;c.querySelector("h3").textContent=toolTitle(id);c.querySelector("p").textContent=toolDesc(id)});
 const ft=$$("footer span");if(ft.length>1){ft[0].textContent=tr("footer1");ft[1].textContent=tr("footer2")}
 $("#languageSelect").value=currentLang;
 if(!$("#searchInput").value) result.classList.add("hidden"); else doSearch($("#searchInput").value);
 if(!modal.classList.contains("hidden")){const id=modalContent.querySelector("[data-current-tool]")?.dataset.currentTool}
}
function translateModal(){
 const map={
"点击选择文件":"Select file","点击选择文件（可多选）":"Select files (multiple)","请选择图片。":"Please select an image.","转换并下载":"Convert & Download","压缩并下载":"Compress & Download","调整并下载":"Resize & Download","裁剪并下载":"Crop & Download","旋转并下载":"Rotate & Download","生成 PDF":"Create PDF","合并 PDF":"Merge PDF","拆分":"Split","压缩":"Compress","转换":"Convert","格式化":"Format","压缩":"Minify","编码":"Encode","解码":"Decode","URL编码":"URL Encode","URL解码":"URL Decode","生成二维码":"Generate QR Code","当前时间戳":"Current timestamp","日期 → 时间戳":"Date → Timestamp","时间戳 → 日期":"Timestamp → Date","生成密码":"Generate password","生成 UUID":"Generate UUID","请选择日期":"Please select a date","请输入时间戳":"Enter a timestamp","请输入尺寸。":"Enter dimensions.","浏览器本地压缩。":"Compressed locally in your browser.","说明：纯静态版本暂不直接修改 PDF 二进制内容。后续可接入 PDF.js / pdf-lib。":"Note: PDF binary editing is not included in this static version yet.","第一版使用浏览器打印功能生成 PDF。":"The first version uses the browser print dialog to create a PDF。","二维码使用浏览器联网加载 QRCode.js；离线时可直接输入文字生成。":"The QR code library is loaded online; offline generation can be added later。"};
 if(currentLang==="zh")return;
 const dicts={
 en:map,ja:{"点击选择文件":"ファイルを選択","请选择图片。":"画像を選択してください。","转换并下载":"変換してダウンロード","压缩并下载":"圧縮してダウンロード","调整并下载":"サイズ変更してダウンロード","裁剪并下载":"切り抜いてダウンロード","旋转并下载":"回転してダウンロード","生成 PDF":"PDFを作成","格式化":"整形","压缩":"圧縮","编码":"エンコード","解码":"デコード","生成二维码":"QRコードを生成","生成密码":"パスワードを生成","生成 UUID":"UUIDを生成"},
 ko:{"点击选择文件":"파일 선택","请选择图片。":"이미지를 선택하세요.","转换并下载":"변환 및 다운로드","压缩并下载":"압축 및 다운로드","调整并下载":"크기 조정 및 다운로드","裁剪并下载":"자르고 다운로드","旋转并下载":"회전 및 다운로드","生成 PDF":"PDF 만들기","格式化":"서식 지정","压缩":"압축","编码":"인코딩","解码":"디코딩","生成二维码":"QR 코드 생성","生成密码":"비밀번호 생성","生成 UUID":"UUID 생성"},
 es:{"点击选择文件":"Seleccionar archivo","请选择图片。":"Selecciona una imagen.","转换并下载":"Convertir y descargar","压缩并下载":"Comprimir y descargar","调整并下载":"Redimensionar y descargar","裁剪并下载":"Recortar y descargar","旋转并下载":"Girar y descargar","生成 PDF":"Crear PDF","格式化":"Formatear","压缩":"Comprimir","编码":"Codificar","解码":"Decodificar","生成二维码":"Generar QR","生成密码":"Generar contraseña","生成 UUID":"Generar UUID"},
 fr:{"点击选择文件":"Choisir un fichier","请选择图片。":"Sélectionnez une image.","转换并下载":"Convertir et télécharger","压缩并下载":"Compresser et télécharger","调整并下载":"Redimensionner et télécharger","裁剪并下载":"Rogner et télécharger","旋转并下载":"Pivoter et télécharger","生成 PDF":"Créer un PDF","格式化":"Formater","压缩":"Compresser","编码":"Encoder","解码":"Décoder","生成二维码":"Générer un QR","生成密码":"Générer un mot de passe","生成 UUID":"Générer un UUID"},
 de:{"点击选择文件":"Datei auswählen","请选择图片。":"Bild auswählen.","转换并下载":"Konvertieren & herunterladen","压缩并下载":"Komprimieren & herunterladen","调整并下载":"Größe ändern & herunterladen","裁剪并下载":"Zuschneiden & herunterladen","旋转并下载":"Drehen & herunterladen","生成 PDF":"PDF erstellen","格式化":"Formatieren","压缩":"Komprimieren","编码":"Kodieren","解码":"Dekodieren","生成二维码":"QR-Code erzeugen","生成密码":"Passwort erzeugen","生成 UUID":"UUID erzeugen"},
 pt:{"点击选择文件":"Selecionar arquivo","请选择图片。":"Selecione uma imagem.","转换并下载":"Converter e baixar","压缩并下载":"Comprimir e baixar","调整并下载":"Redimensionar e baixar","裁剪并下载":"Cortar e baixar","旋转并下载":"Girar e baixar","生成 PDF":"Criar PDF","格式化":"Formatar","压缩":"Comprimir","编码":"Codificar","解码":"Decodificar","生成二维码":"Gerar QR Code","生成密码":"Gerar senha","生成 UUID":"Gerar UUID"}};
 const d=dicts[currentLang]||{};
 $$("#modalContent .btn").forEach(b=>{if(d[b.textContent])b.textContent=d[b.textContent]});
 $$("#modalContent .drop").forEach(x=>{if(d[x.textContent])x.textContent=d[x.textContent]});
}
function doSearch(q){
 q=q.trim().toLowerCase();if(!q){result.classList.add("hidden");$$(".tool-section").forEach(s=>s.style.display="");return}
 const hits=tools.filter(t=>(t[0]+" "+toolTitle(t[0])+" "+toolDesc(t[0])).toLowerCase().includes(q)||t.join(" ").toLowerCase().includes(q));
 $$(".tool-section").forEach(s=>s.style.display="none");result.classList.remove("hidden");
 result.innerHTML=`<h2>${tr("result")}（${hits.length}）</h2><div class="search-grid">${hits.map(t=>`<a class="tool-card" href="javascript:void(0)" data-tool="${t[0]}"><span>🛠️</span><h3>${toolTitle(t[0])}</h3><p>${toolDesc(t[0])}</p></a>`).join("")}</div>`;
 $$(".search-grid [data-tool]").forEach(x=>x.onclick=()=>openModal(x.dataset.tool));
}
$("#languageSelect").addEventListener("change",e=>{currentLang=e.target.value;localStorage.setItem("toolboxLang",currentLang);translatePage()});
translatePage();
