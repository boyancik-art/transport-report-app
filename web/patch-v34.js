(()=>{
  const css=document.createElement('style');
  css.textContent=`
    .login{
      min-height:100dvh!important;
      display:grid!important;
      place-items:center!important;
      padding:24px 16px!important;
      background:
        radial-gradient(circle at 18% 0%,rgba(83,113,255,.22),transparent 34%),
        radial-gradient(circle at 100% 8%,rgba(51,210,184,.12),transparent 28%),
        linear-gradient(180deg,#080d14 0%,#0b1119 55%,#070b10 100%)!important;
    }
    .loginbox{
      width:min(430px,100%)!important;
      padding:34px 28px 30px!important;
      border-radius:28px!important;
      background:linear-gradient(160deg,rgba(24,32,44,.98),rgba(14,20,29,.98))!important;
      border:1px solid rgba(255,255,255,.09)!important;
      box-shadow:0 30px 90px rgba(0,0,0,.46)!important;
      text-align:center!important;
      color:#f6f8fc!important;
      backdrop-filter:blur(24px)!important;
    }
    .loginbox .logo{
      width:96px!important;
      height:96px!important;
      padding:10px!important;
      margin:0 auto 20px!important;
      display:block!important;
      object-fit:contain!important;
      object-position:center!important;
      border-radius:24px!important;
      background:#fff!important;
      box-shadow:0 16px 42px rgba(0,0,0,.30)!important;
    }
    .loginbox h1{
      margin:0!important;
      color:#f7f9fc!important;
      font-size:29px!important;
      line-height:1.1!important;
      letter-spacing:-.8px!important;
      font-weight:950!important;
    }
    .loginbox .note{
      margin:10px 0 28px!important;
      color:#93a0b4!important;
      font-size:13px!important;
      line-height:1.45!important;
    }
    .loginbox input{
      width:100%!important;
      min-height:56px!important;
      margin:0 0 12px!important;
      padding:0 16px!important;
      color:#f6f8fc!important;
      background:#111925!important;
      border:1px solid #2b3748!important;
      border-radius:16px!important;
      outline:none!important;
      box-shadow:none!important;
      transition:border-color .18s ease,box-shadow .18s ease,background .18s ease!important;
    }
    .loginbox input::placeholder{color:#7f8a9a!important;opacity:1!important}
    .loginbox input:focus{
      border-color:#6c88ff!important;
      background:#121c2a!important;
      box-shadow:0 0 0 4px rgba(95,124,255,.13)!important;
    }
    .loginbox .btn{
      width:100%!important;
      min-height:56px!important;
      margin-top:4px!important;
      border:0!important;
      border-radius:16px!important;
      background:linear-gradient(135deg,#5f7cff 0%,#4f70ee 58%,#4b65d9 100%)!important;
      color:#fff!important;
      font-size:16px!important;
      font-weight:950!important;
      letter-spacing:.01em!important;
      box-shadow:0 14px 32px rgba(79,112,238,.28)!important;
    }
    .loginbox .btn:active{transform:translateY(1px)!important}
    #loginErr{
      margin:12px 2px 0!important;
      min-height:18px!important;
      color:#ff9cab!important;
      font-size:12px!important;
      text-align:left!important;
    }
    @media(max-width:430px){
      .login{padding:18px 14px!important;align-items:center!important}
      .loginbox{padding:30px 20px 24px!important;border-radius:24px!important}
      .loginbox .logo{width:86px!important;height:86px!important;margin-bottom:18px!important}
      .loginbox h1{font-size:25px!important}
      .loginbox .note{margin-bottom:24px!important}
    }
  `;
  document.head.appendChild(css);
})();