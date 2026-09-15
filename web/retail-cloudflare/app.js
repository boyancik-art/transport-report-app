(function(){
  document.querySelectorAll('.side nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.side nav a').forEach(x=>x.classList.remove('active'));a.classList.add('active')}));
  const dateBox=document.querySelector('.date');
  if(dateBox){
    dateBox.style.display='flex';
    dateBox.style.flexDirection='column';
    dateBox.style.alignItems='flex-start';
    dateBox.style.justifyContent='center';
    dateBox.style.whiteSpace='nowrap';
    function updateClock(){
      const now=new Date();
      const parts=new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Kyiv',weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(now);
      const val=t=>parts.find(p=>p.type===t)?.value||'';
      const weekday=val('weekday');
      const day=val('day'),month=val('month'),year=val('year'),hour=val('hour'),minute=val('minute');
      const b=dateBox.querySelector('b');
      const s=dateBox.querySelector('small');
      if(b)b.textContent=`${day}.${month}.${year}`;
      if(s)s.textContent=`${weekday.charAt(0).toUpperCase()+weekday.slice(1)}, ${hour}:${minute}`;
    }
    updateClock();
    setInterval(updateClock,15000);
  }
})();