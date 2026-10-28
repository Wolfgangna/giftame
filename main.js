let letters=[], index=0, timer=null, loading=false, slideshowPaused=false, currentFilter="Tất cả", searchTerm="", sortOrder="newest", deleteEnabled=false, adminToken="";
const form=document.querySelector("#form"), nameEl=document.querySelector("#name"), typeEl=document.querySelector("#type"), msgEl=document.querySelector("#message");
const screen=document.querySelector("#screen"), info=document.querySelector("#info"), currentType=document.querySelector("#currentType"), count=document.querySelector("#count"), fx=document.querySelector("#fx");
const musicToggle=document.querySelector("#music-toggle"), backgroundMusic=document.querySelector("#background-music");
const shareLinkButton=document.querySelector("#share-link");
const anonymousEl=document.querySelector("#anonymous"), submitButton=document.querySelector("#submit-button"), toast=document.querySelector("#toast"), letterCount=document.querySelector("#letter-count");
const filterButtons=[...document.querySelectorAll(".filter-chip")];
const searchInput=document.querySelector("#letter-search"), sortOrderSelect=document.querySelector("#sort-order");

function wordCount(value){return value.trim()?value.trim().split(/\s+/).length:0}
function getVisibleLetters(){
  let result = currentFilter==="Tất cả" ? [...letters] : letters.filter(letter=>letter.type===currentFilter);
  const query = searchTerm.trim().toLowerCase();
  if(query){
    result = result.filter(letter => {
      const haystack = `${letter.name||""} ${letter.type||""} ${letter.message||""}`.toLowerCase();
      return haystack.includes(query);
    });
  }
  result.sort((a,b)=>sortOrder === "oldest" ? new Date(a.createdAt)-new Date(b.createdAt) : new Date(b.createdAt)-new Date(a.createdAt));
  return result;
}
function clampIndex(list=getVisibleLetters()){if(!list.length){index=0;return}index=Math.max(0,Math.min(index,list.length-1))}
msgEl.addEventListener("input",()=>count.textContent=wordCount(msgEl.value));
searchInput.addEventListener("input",e=>{searchTerm=e.target.value;index=0;render();restart();});
sortOrderSelect.addEventListener("change",e=>{sortOrder=e.target.value;index=0;render();restart();});
document.querySelector("#clear-form").onclick=()=>{form.reset();count.textContent="0";msgEl.focus()};
function notify(message,type="success"){toast.textContent=message;toast.className=`toast show ${type}`;clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove("show"),3200)}
function saveLocal(){localStorage.setItem("letters",JSON.stringify(letters))}
function localLetters(){try{const saved=JSON.parse(localStorage.getItem("letters")||"[]");return Array.isArray(saved)?saved:[]}catch{return []}}

async function load(){
  try{
    const r=await fetch("/api/letters");
    if(!r.ok)throw new Error("API unavailable");
    const data=await r.json();
    letters=Array.isArray(data)?data:[];
    deleteEnabled=r.headers.get("X-Admin-Delete-Enabled")==="true";
    saveLocal();
  }catch(e){
    letters=localLetters();
    deleteEnabled=false;
  }finally{
    clampIndex();
    render();
    restart();
  }
}
form.addEventListener("submit",async e=>{
  e.preventDefault();
  const message=msgEl.value.trim(); const words=wordCount(message);
  if(!message){notify("Bạn hãy viết một lời nhắn trước nhé.","error");msgEl.focus();return}
  if(words>1000){notify("Tâm thư chỉ được tối đa 1.000 từ.","error");return}
  if(loading)return;
  loading=true;submitButton.disabled=true;submitButton.textContent="Đang gửi...";
  const item={id:Date.now(),name:anonymousEl.checked?"":nameEl.value.trim(),type:typeEl.value,message,privacyConsent:true,createdAt:new Date().toISOString()};
  try{
    const r=await fetch("/api/letters",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item)});
    if(!r.ok){const result=await r.json().catch(()=>({}));notify(result.error||"Không thể gửi tâm thư.","error");return}
    letters.push(await r.json());
    index=letters.length-1;form.reset();count.textContent="0";render();burst();restart();
    notify("Tâm thư đã được lưu và đồng bộ.");
  }catch(e){notify("Không kết nối được máy chủ. Tâm thư chưa được gửi; nội dung vẫn còn trong biểu mẫu.","error")}
  finally{loading=false;submitButton.disabled=false;submitButton.textContent="Gửi tâm thư 💖"}
});
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function render(){
 const visible=getVisibleLetters();
 clampIndex(visible);
 if(!letters.length){
   screen.innerHTML='<div class="empty">💗<strong>Đang chờ những lời nhắn...</strong><small>Hãy gửi tâm thư đầu tiên.</small></div>';
   info.textContent="0 / 0";
   currentType.textContent="💌 Tâm thư";
   letterCount.textContent="0";
   document.querySelector("#play-status").textContent="Đang chờ";
   return;
 }
 if(!visible.length){
   screen.innerHTML=`<div class="empty"><strong>Không có lời nhắn nào trong loại ${esc(currentFilter)}</strong><small>Hãy thử chọn một loại khác hoặc gửi một tâm thư mới.</small></div>`;
   info.textContent="0 / 0";
   currentType.textContent=currentFilter;
   letterCount.textContent=String(letters.length);
   document.querySelector("#play-status").textContent="Không có bài phù hợp";
   return;
 }
 const x=visible[index];
 const deleteButton=deleteEnabled?'<button class="delete-letter" id="delete-letter" type="button">🗑 Xóa tâm thư này</button>':"";
 screen.dataset.type=x.type; screen.innerHTML=`<article class="letter"><span class="tag">${esc(x.type)}</span><h2>${esc(x.name||"Một người bạn")}</h2><p>${esc(x.message)}</p><small>Gửi lúc ${new Date(x.createdAt).toLocaleString("vi-VN")}</small>${deleteButton}</article>`;
 info.textContent=`${index+1} / ${visible.length}`;currentType.textContent=x.type;
 letterCount.textContent=letters.length;document.querySelector("#play-status").textContent=visible.length>1?"Đang phát":"Đã sẵn sàng";
 if(deleteEnabled)document.querySelector("#delete-letter").onclick=deleteCurrent;
}
async function deleteCurrent(){
 const item=getVisibleLetters()[index];
 if(!item)return;
 if(!adminToken){adminToken=window.prompt("Nhập mã quản trị để xóa tâm thư:")||"";if(!adminToken)return}
 if(!confirm("Bạn có chắc muốn xóa tâm thư này không?"))return;
 const originalIndex=letters.findIndex(letter=>letter.id===item.id);
 try{
   const r=await fetch(`/api/letters/${encodeURIComponent(item.id)}`,{method:"DELETE",headers:{Authorization:`Bearer ${adminToken}`}});
   if(r.status===401){adminToken="";notify("Mã quản trị không đúng.","error");return}
   if(!r.ok){const result=await r.json().catch(()=>({}));notify(result.error||"Không thể xóa tâm thư.","error");return}
 }catch(error){
   notify("Không kết nối được máy chủ để xóa tâm thư.","error");
   return;
 }
 letters.splice(originalIndex,1);
 if(index>=getVisibleLetters().length){index=Math.max(0,getVisibleLetters().length-1)}
 saveLocal();
 render();
 restart();
 notify("Đã xóa tâm thư.");
}
function next(){const visible=getVisibleLetters();if(!visible.length)return;index=(index+1)%visible.length;render();burst()}
function prev(){const visible=getVisibleLetters();if(!visible.length)return;index=(index-1+visible.length)%visible.length;render();burst()}
function restart(){clearInterval(timer);timer=null;const visible=getVisibleLetters();if(visible.length>1&&!slideshowPaused)timer=setInterval(next,5000)}
document.querySelector("#next").onclick=()=>{next();restart()};
document.querySelector("#prev").onclick=()=>{prev();restart()};
document.querySelector("#pause-slideshow").onclick=()=>{
  slideshowPaused=!slideshowPaused;
  const button=document.querySelector("#pause-slideshow");
  button.setAttribute("aria-pressed",String(slideshowPaused));
  button.textContent=slideshowPaused?"▶ Phát tiếp":"⏸ Tạm dừng";
  if(slideshowPaused){clearInterval(timer);timer=null}else restart();
};
filterButtons.forEach(button=>{
  button.addEventListener("click",()=>{
    currentFilter=button.dataset.filter;
    filterButtons.forEach(item=>item.classList.toggle("active", item===button));
    index=0;
    render();
    restart();
  });
});

const symbols=["❤️","💖","💕","✨","🎉","🌸","⭐","🥳"];
function setMusicState(isPlaying){
  musicToggle.setAttribute("aria-pressed",String(isPlaying));
  musicToggle.textContent=isPlaying?"⏸ Tắt nhạc":"🎵 Bật nhạc";
}
backgroundMusic.addEventListener("error",()=>{
  musicToggle.disabled=true;
  musicToggle.title="File nhạc không có sẵn";
  musicToggle.textContent="🎵 Không có nhạc";
  musicToggle.setAttribute("aria-pressed","false");
});
if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)setInterval(()=>{
 const el=document.createElement("div");el.className="float";el.textContent=symbols[Math.floor(Math.random()*symbols.length)];
 el.style.left=Math.random()*100+"%";el.style.fontSize=14+Math.random()*24+"px";el.style.animationDuration=6+Math.random()*7+"s";
 fx.appendChild(el);setTimeout(()=>el.remove(),14000);
},2400);
function burst(){
 if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 for(let i=0;i<18;i++){const el=document.createElement("div");el.className="spark";el.textContent=symbols[Math.floor(Math.random()*symbols.length)];
 el.style.left=(35+Math.random()*30)+"%";el.style.top=(40+Math.random()*20)+"%";fx.appendChild(el);setTimeout(()=>el.remove(),1000)}
}
document.querySelector("#presentation").onclick=()=>{
 document.documentElement.requestFullscreen?.();
};
async function shareCurrentLink(){
  const url = new URL(window.location.href);
  url.hash = "#send";
  const message = letters.length ? `Hãy xem lời nhắn yêu thương này: ${url.toString()}` : `Tham gia gửi tâm thư tại: ${url.toString()}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Góc Tâm Thư", text: "Mình muốn chia sẻ một nơi để gửi lời yêu thương.", url: url.toString() });
      notify("Đã chia sẻ liên kết thành công.");
      return;
    }
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(message);
      notify("Đã sao chép liên kết chia sẻ.");
      return;
    }
    const copied = window.prompt("Sao chép liên kết này:", url.toString());
    if (copied !== null) notify("Liên kết đã sẵn sàng để chia sẻ.");
  } catch (error) {
    if (error && error.name !== "AbortError") notify("Không thể chia sẻ lúc này. Hãy thử lại sau.", "error");
  }
}
shareLinkButton.addEventListener("click", shareCurrentLink);
musicToggle.onclick=async()=>{
 if(musicToggle.disabled){
   notify("Tệp nhạc chưa sẵn sàng trên máy chủ này.","error");
   return;
 }
 const playing=!backgroundMusic.paused;
 if(playing){
   backgroundMusic.pause();
   setMusicState(false);
   return;
 }
 try{
   await backgroundMusic.play();
   setMusicState(true);
 }catch(error){
   notify("Không thể phát file nhạc. Hãy kiểm tra file MP3 trong thư mục dự án.","error");
 }
};
document.addEventListener("keydown",e=>{
 if(e.key==="ArrowRight")next();
 if(e.key==="ArrowLeft")prev();
});
load();
setInterval(load,10000);
