(function(){
  document.querySelectorAll('.side nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.side nav a').forEach(x=>x.classList.remove('active'));a.classList.add('active')}));
  const dateBox=document.querySelector('.date');
  if(dateBox){
    const dayNames=['Неділя','Понеділок','Вівторок','Середа','Четвер','П’ятниця','Субота'];
    function pad(n){return String(n).padStart(2,'0')}
    function updateClock(){
      const d=new Date();
      const b=dateBox.querySelector('b');
      const s=dateBox.querySelector('small');
      if(b)b.textContent=`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
      if(s)s.textContent=`${dayNames[d.getDay()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    updateClock();
    setInterval(updateClock,15000);
  }
})();