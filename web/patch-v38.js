(()=>{
  const BUILD='v38';
  const email=document.getElementById('email');
  const password=document.getElementById('password');
  const formBox=document.querySelector('.loginbox');

  if(email){
    email.setAttribute('name','username');
    email.setAttribute('autocomplete','username');
    email.setAttribute('autocapitalize','none');
    email.setAttribute('spellcheck','false');
    email.setAttribute('inputmode','email');
  }
  if(password){
    password.setAttribute('name','password');
    password.setAttribute('autocomplete','current-password');
  }

  // Browsers/password managers recognize an actual form more reliably than loose inputs.
  if(formBox && !formBox.querySelector('form')){
    const fields=[email,password,formBox.querySelector('button.btn')].filter(Boolean);
    if(fields.length){
      const form=document.createElement('form');
      form.id='loginForm';
      form.setAttribute('autocomplete','on');
      form.addEventListener('submit',e=>{
        e.preventDefault();
        if(typeof window.signIn==='function') window.signIn();
      });
      fields[0].parentNode.insertBefore(form,fields[0]);
      fields.forEach(el=>form.appendChild(el));
      const button=form.querySelector('button.btn');
      if(button){
        button.type='submit';
        button.removeAttribute('onclick');
      }
    }
  }

  // Keep the existing Supabase access token between app launches.
  try{
    if(window.token && !localStorage.getItem('trts_token')) localStorage.setItem('trts_token',window.token);
  }catch(e){}

  document.documentElement.dataset.trtsBuild=BUILD;
})();