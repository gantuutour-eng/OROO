/* Isolated activation page: no third-party scripts or analytics. */
(()=>{
 let token=new URLSearchParams(location.hash.slice(1)).get('token')||'';
 history.replaceState(null,'',location.pathname);
 const form=document.getElementById('activation-form'),status=document.getElementById('activation-status'),button=form.querySelector('button');
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)){button.disabled=true;status.textContent='Идэвхжүүлэх холбоос хүчингүй. Шинэ холбоос авна уу.'}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;
  const password=form.elements.password.value;if(password!==form.elements.confirm.value){status.textContent='Нууц үгүүд таарахгүй байна.';return}
  button.disabled=true;status.textContent='Идэвхжүүлж байна…';
  try{const response=await fetch('/api/auth/activate-admin',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({token,password})});const result=await response.json();if(!response.ok)throw new Error(result.error==='password_length'?'Нууц үг 15–128 тэмдэгттэй байна.':result.message||'Идэвхжүүлж чадсангүй.');token='';form.reset();status.textContent='Амжилттай. Админы самбар руу шилжиж байна…';location.replace('/index.html#/admin')}
  catch(error){status.textContent=error.message||'Холболтоо шалгаад дахин оролдоно уу.';button.disabled=false}
 });
})();
