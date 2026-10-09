
const $=id=>document.getElementById(id),main=$('main');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clean=p=>p.replace(/[^\d+]/g,'');
const RISK=/(suicid|kill myself|end my life|end it all|want to die|wanna die|don'?t want to (live|be here)|better off dead|self[- ]?harm|cut myself|hurt myself|no reason to live|take my own life)/i;
let accountScope=null;
const st={get(k,d){if(!accountScope)return d;try{const v=localStorage.getItem('ss_'+accountScope+'_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){if(!accountScope)return false;try{localStorage.setItem('ss_'+accountScope+'_'+k,JSON.stringify(v));return true}catch(e){return false}}};
let timer=null;const stop=()=>{if(timer){clearInterval(timer);timer=null}};
const careHTML=`<div class="care"><b>Thank you for sharing this. That took courage.</b><br>You don’t have to carry it alone. Please talk to someone now: <a href="tel:14416">Tele-MANAS 14416</a> (free, 24/7), iCall <a href="tel:9152987821">9152987821</a>, AASRA <a href="tel:+919820466726">+91-9820466726</a>, or <a href="tel:112">112</a> in an emergency. If you can, move away from anything you could use to hurt yourself and be near another person.</div>`;

/* ---------- navigation ---------- */
const views={help:helpHome,cope:copeHome,jour:jourWrite};
function go(v){stop();window.safeSpaceChat?.hide();window.safeSpaceJournal?.unmount();document.querySelector('.app').classList.toggle('journaling',v==='jour');document.querySelector('.app').classList.toggle('coping',v==='cope');if(accountScope)history.replaceState(null,'',location.pathname+(v==='jour'?'#journal':v==='cope'?'#coping':''));$('chat').classList.remove('open');document.querySelector('.app').classList.remove('chatting');document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));views[v]();main.scrollTop=0}
document.querySelectorAll('nav button[data-v]').forEach(b=>b.onclick=()=>go(b.dataset.v));

/* ---------- HELP NOW ---------- */
let C=st.get('hn_contacts',[]);
const DEF=[['Emergency services','112','Police · Ambulance','em'],['Tele-MANAS','14416','Free mental health support · 24/7',''],['iCall','9152987821','Counselling helpline',''],['AASRA','+919820466726','Suicide prevention helpline','']];
function helpHome(){stop();
 main.innerHTML=`<h1>Help Now</h1><p class="sub">If you are in extreme pain or thinking of ending your life, press the button. Help is one tap away.</p>
 <button class="sos" id="sos">I NEED HELP NOW<small>Tap to see who to call</small></button>
 <button class="link" id="set">⚙️ My trusted contacts (${C.length} saved)</button>
 <p class="note">Save your trusted people while you feel steadier so they are ready in a hard moment. Contacts stay on this device only. Verify helpline numbers for your region.</p>`;
 $('sos').onclick=crisis;$('set').onclick=contacts}
function crisis(){stop();
 const mine=C.map(c=>`<a class="call me" href="tel:${clean(c.p)}"><div>${esc(c.n)}<span>Your trusted person · tap to call</span></div><b>📞</b></a>`).join('');
 const txt=C.length?`<a class="txt" href="sms:${clean(C[0].p)}?body=${encodeURIComponent("I'm not okay right now and I need you. Please call me or come be with me.")}">💬 Text ${esc(C[0].n)}: “I'm not okay, please call me”</a>`:'';
 main.innerHTML=`<button class="back" id="bk">← Back</button><h1>You reached out. That matters.</h1><p class="sub">You don't have to go through this alone. Call someone right now.</p>
 ${DEF.slice(0,2).map(d=>`<a class="call ${d[3]}" href="tel:${d[1]}"><div>${d[0]}<span>${d[2]}</span></div><b>${d[1]}</b></a>`).join('')}
 ${mine||'<p class="center meta">No trusted contacts saved yet. Add them from the Help Now home screen.</p>'}${txt}
 ${DEF.slice(2).map(d=>`<a class="call" href="tel:${d[1]}"><div>${d[0]}<span>${d[2]}</span></div><b>📞</b></a>`).join('')}
 <div class="card"><h2>While you wait for help</h2><ol><li>Move away from anything you could use to hurt yourself.</li><li>Go to a room with other people, or step outside.</li><li>Stay on the phone with someone. You only need to get through the next few minutes.</li></ol></div>
 <div class="card center"><h2>Breathe with me</h2><div class="orb" id="o">Ready</div><button class="btn" id="b">Start</button></div>`;
 $('bk').onclick=helpHome;$('b').onclick=e=>{stop();const o=$('o');let n=0;const s=()=>{const i=n%2===0;o.style.transform=i?'scale(1.45)':'scale(1)';o.textContent=i?'In…':'Out…';n++};s();timer=setInterval(s,4500);e.target.textContent='Restart'}}
function contacts(){
 main.innerHTML=`<button class="back" id="bk">← Back</button><h1>My trusted contacts</h1><p class="sub">People who care about you. They appear at the top when you press Help Now.</p>
 <div class="card">${C.length?C.map((c,i)=>`<div class="row"><div><b>${esc(c.n)}</b><br><span class="meta">${esc(c.p)}</span></div><button class="btn alt sm" data-i="${i}">Remove</button></div>`).join(''):'<p class="meta" style="margin:0">None saved yet.</p>'}</div>
 <div class="card"><h2>Add a person</h2><label>Name (e.g. Mom, Priya)</label><input id="n" autocomplete="off"><label>Phone number</label><input id="p" type="tel" inputmode="tel" autocomplete="off"><button class="btn" id="a">Save contact</button><p id="m" class="meta"></p></div>`;
 $('bk').onclick=helpHome;
 main.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{C.splice(+b.dataset.i,1);st.set('hn_contacts',C);contacts()});
 $('a').onclick=()=>{const n=$('n').value.trim(),p=$('p').value.trim();if(!n||clean(p).length<5){$('m').textContent='Please enter a name and a valid number.';return}if(C.length>=5){$('m').textContent='You can save up to 5 contacts.';return}C.push({n,p});st.set('hn_contacts',C);contacts()}}

/* ---------- COPING LIBRARY ---------- */
const LIB=[['breath','Slow breathing','2 min · settle your body',breathing],['ground','5-4-3-2-1 grounding','3 min · come back to the room',ground],['wait','Wait 15 minutes','Let the intensity pass',wait],['safe','Make your space safer','Create distance from danger',safer],['reach','Reach out to one person','You don’t have to carry this alone',reach],['body','Gentle body release','Relax tight muscles, step by step',body],['kind','Talk to yourself like a friend','A softer inner voice',kind],['plan','My reasons & my plan','Saved only on this device',plan]];
const COPING_ICONS={
 breath:'<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h5a3 3 0 1 1-3 3"/>',
 ground:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
 wait:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 safe:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
 reach:'<path d="M21 11a8 8 0 0 1-8 8H6l-4 3 1-6a8 8 0 0 1 10-12"/><path d="M17 2v6m-3-3h6M7 10h6m-6 4h9"/>',
 body:'<circle cx="12" cy="4" r="2"/><path d="m4 9 8 2 8-2m-8 2v5m-5 6 5-6 5 6"/>',
 kind:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 2 10 8 15 6-5 12-11 8-15Z"/>',
 plan:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6m-6 4h6m-6 4h3"/>'
};
const copingIcon=id=>`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${COPING_ICONS[id]}</svg>`;
function copeHome(){stop();main.innerHTML=`<section class="coping-home" aria-labelledby="coping-title"><div class="coping-heading"><div><div class="coping-eyebrow"><i></i> A LITTLE SPACE TO RESET</div><h1 id="coping-title">Coping Library<span>One small step at a time.</span></h1><p>Intense feelings rise and fall. Choose something gentle to try right now.</p></div><div class="coping-motif" aria-hidden="true"><i></i><i></i>${copingIcon('breath')}</div></div><div class="coping-grid-label"><span>YOUR EVERYDAY TOOLKIT</span><span>8 gentle practices</span></div><div class="coping-grid">${LIB.map((e,i)=>`<button class="tile coping-tile" data-id="${e[0]}" style="--step:${i}"><span class="coping-tile-top"><span class="coping-icon">${copingIcon(e[0])}</span><span class="coping-number">0${i+1}</span></span><b>${e[1]}</b><span class="coping-description">${e[2]}</span><svg class="coping-arrow" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></button>`).join('')}</div><p class="coping-footnote">No perfect way to do this. Just start where you are.</p></section>`;
 main.querySelectorAll('.coping-tile').forEach(b=>b.onclick=()=>openCopingTool(b.dataset.id))}
function openCopingTool(id){const e=LIB.find(x=>x[0]===id);if(!e)return;stop();main.innerHTML=`<section class="coping-exercise"><button class="back" id="bk">← Back to library</button><div class="coping-exercise-label"><span class="coping-icon">${copingIcon(id)}</span><span>YOUR MOMENT TO RESET</span><span>${String(LIB.indexOf(e)+1).padStart(2,'0')} / 08</span></div><div class="card" id="c"></div><p class="coping-footnote">Go gently. You can pause or try another practice anytime.</p></section>`;$('bk').onclick=copeHome;e[3]($('c'));main.scrollTop=0}
function breathing(c){c.innerHTML=`<h2>Slow breathing</h2><p>Breathe in gently through your nose, then out slowly through your mouth. Never strain. If you feel dizzy, breathe normally.</p><div class="orb" id="o" role="status">Ready</div><div class="center"><button class="btn" id="go">Start</button></div>`;
 $('go').onclick=e=>{stop();const o=$('o');let n=0;const s=()=>{const i=n%2===0;o.style.transform=i?'scale(1.5)':'scale(1)';o.textContent=i?'Breathe in…':'Breathe out…';n++};s();timer=setInterval(s,4500);e.target.textContent='Restart'}}
function ground(c){const S=[['5','things you can SEE','Look around slowly and name five, even small ones.'],['4','things you can TOUCH','Feel your clothes, the chair, the floor under your feet.'],['3','things you can HEAR','Near sounds, far sounds, even your own breathing.'],['2','things you can SMELL','Or remember two smells you like.'],['1','thing you can TASTE','Or take a slow sip of a warm drink.']];let i=0;
 const r=()=>{if(i>=S.length){c.innerHTML=`<h2>You’re here, in this moment</h2><p>Notice how your body feels compared to a few minutes ago. Even a small change counts.</p><button class="btn" id="a">Do it again</button> <button class="btn alt" id="h">Library</button>`;$('a').onclick=()=>{i=0;r()};$('h').onclick=copeHome;return}
 const s=S[i];c.innerHTML=`<h2>5-4-3-2-1 grounding</h2>${copingProgress(i,S.length)}<div class="big">${s[0]}</div><p class="center"><b>${s[1]}</b></p><p class="center">${s[2]}</p><div class="center"><button class="btn" id="n">Next</button></div>`;$('n').onclick=()=>{i++;r()}};r()}
function copingProgress(step,total){return `<div class="coping-progress" aria-label="Step ${step+1} of ${total}">${Array.from({length:total},(_,i)=>`<i class="${i<=step?'complete':''}"></i>`).join('')}</div>`}
function wait(c){let s=900;c.innerHTML=`<h2>Wait 15 minutes</h2><p>The urge can come in waves. You don’t have to solve everything. Just stay safe for the next 15 minutes: be near someone, listen to music, or breathe.</p><div class="big" id="tm">15:00</div><div class="center"><button class="btn" id="st">Start timer</button></div><p id="msg" class="center"></p>`;
 const show=()=>{$('tm').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
 $('st').onclick=()=>{stop();s=900;show();timer=setInterval(()=>{s--;show();if(s<=0){stop();$('msg').innerHTML='You made it through 15 minutes. That took strength. If the thoughts are still strong, call <a href="tel:14416">14416</a> or tell someone near you now. You can start another 15.'}},1000)}}
function safer(c){c.innerHTML=`<h2>Make your space safer</h2><p>Putting distance between you and anything you could use to hurt yourself can save your life in a hard moment.</p><ul><li>Move away from anything dangerous, or ask someone to hold it for now.</li><li>Go to a room with other people, or step outside somewhere public.</li><li>Call or message someone: “I’m not okay. Can you stay with me?”</li><li>If you have taken something or are in immediate danger, call <a href="tel:112">112</a> now.</li></ul>`}
function reach(c){c.innerHTML=`<h2>Reach out to one person</h2><p>You don’t need perfect words. Send one of these:</p><ul><li>“I’m having a really hard time and don’t want to be alone. Can I call you?”</li><li>“I’m not okay tonight. Can you stay on the phone with me?”</li><li>“Can I come over? I just need company.”</li></ul><p>No one to message? Trained listeners are free: <a href="tel:14416">Tele-MANAS 14416</a>, iCall <a href="tel:9152987821">9152987821</a>, AASRA <a href="tel:+919820466726">+91-9820466726</a>.</p>`}
function body(c){const P=['Hands: squeeze your fists gently for 5 seconds, then let go.','Shoulders: lift them toward your ears, hold 5 seconds, then drop them.','Face: scrunch softly, hold, then release your jaw.','Stomach: tighten gently, hold, then let it soften.','Legs and feet: press your feet into the floor, hold, then relax.','Take one slow breath. Notice any tension that has loosened.'];let i=0;
 const r=()=>{const l=i>=P.length;c.innerHTML=`<h2>Gentle body release</h2><p>Tense gently (never to the point of pain), then let go.</p>${l?'':copingProgress(i,P.length)}<p><b>${l?'Done. Take a moment to notice how you feel.':P[i]}</b></p><button class="btn" id="n">${l?'Back to library':'Next'}</button>`;$('n').onclick=()=>{if(l)copeHome();else{i++;r()}}};r()}
function kind(c){c.innerHTML=`<h2>Talk to yourself like a friend</h2><p>Imagine a close friend felt exactly like you do. What would you say to them? Write it, then read it back as if it were for you.</p><label for="k">A few kind words for yourself</label><textarea rows="4" id="k" placeholder="You deserve the same kindness you give others…"></textarea><p class="meta">Starters: “This pain is real, and it is not your fault.” “You don’t have to figure out your whole life tonight.” “Feelings change, even the ones that feel permanent.”</p><button class="btn" id="b">Read it back</button><p id="o" role="status"></p>`;
 $('b').onclick=()=>{const v=$('k').value.trim();$('o').innerHTML=v?`<b>Hear it as if it was meant for you:</b><br>“${esc(v)}”`:'Even one sentence is enough.'}}
function plan(c){const F=[['why','Reasons I want to stay (people, pets, hopes, even tiny ones)'],['signs','Warning signs that I’m getting worse'],['calm','Things that calm me (songs, places, people)'],['ppl','People I can contact (name + number)']];
 c.innerHTML=`<h2>My reasons & my plan</h2><p>Fill this in when you can, so it’s ready for hard moments. Saved on this device only.</p>${F.map(f=>`<label for="plan-${f[0]}">${f[1]}</label><textarea id="plan-${f[0]}" rows="2" data-k="${f[0]}">${esc(st.get('cl_'+f[0],''))}</textarea>`).join('')}<p>Crisis line <a href="tel:14416">14416</a> · Emergency <a href="tel:112">112</a></p><button class="btn" id="sv">Save</button> <span id="ok" role="status"></span>`;
 $('sv').onclick=()=>{c.querySelectorAll('textarea').forEach(t=>st.set('cl_'+t.dataset.k,t.value));$('ok').textContent='Saved ✓'}}

/* ---------- JOURNAL ---------- */
let mem=[],journalTrash=[],journalDraft={mood:null,tx:'',gd:''};
function readJournal(key){
 const value=st.get(key,[]);
 return Array.isArray(value)?value.filter(e=>e&&Number.isFinite(e.id)&&!Number.isNaN(new Date(e.id).getTime())&&typeof e.tx==='string'&&typeof e.gd==='string').map(e=>({...e,mood:Number.isInteger(e.mood)&&e.mood>=1&&e.mood<=5?e.mood:null})):[];
}
function jourWrite(){
 main.innerHTML='<div id="journal-root"></div>';
 if(!window.safeSpaceJournal){main.textContent='Journal is loading. Please refresh the page.';return}
 window.safeSpaceJournal.mount($('journal-root'),{
  entries:()=>mem,trash:()=>journalTrash.filter(e=>!mem.some(m=>m.id===e.id)),
  draft:()=>journalDraft,setDraft:d=>{journalDraft=d},careHTML,
  theme:()=>{const saved=st.get('journal_theme',null);return saved==='light'||saved==='dark'?saved:(document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light')},
  setTheme:theme=>st.set('journal_theme',theme),
  needsCare:d=>RISK.test(d.tx+' '+d.gd)||d.mood===1,
  save(entry){const next=[entry,...readJournal('journal_entries')];if(!st.set('journal_entries',next))return false;mem=next;return true},
  remove(id){
   const current=readJournal('journal_entries'),entry=current.find(e=>e.id===id);if(!entry)return false;
   const deleted=[entry,...readJournal('journal_trash').filter(e=>e.id!==id)];
   if(!st.set('journal_trash',deleted))return false;journalTrash=deleted;
   const next=current.filter(e=>e.id!==id);if(!st.set('journal_entries',next))return false;mem=next;return true;
  },
  restore(id){
   const deleted=readJournal('journal_trash'),entry=deleted.find(e=>e.id===id);if(!entry)return false;
   const next=[entry,...readJournal('journal_entries').filter(e=>e.id!==id)].sort((a,b)=>b.id-a.id);
   if(!st.set('journal_entries',next))return false;mem=next;
   journalTrash=deleted.filter(e=>e.id!==id);st.set('journal_trash',journalTrash);return true;
  }
 });
}

/* ---------- CHAT ---------- */
const SYSTEM=`You are "Safe Space", a warm, gentle, non-judgmental peer-support companion for people who may be struggling emotionally or having thoughts of suicide. You are NOT a licensed therapist and never claim to be or to diagnose; you offer caring, non-professional support.
Draw on broad understanding of emotional pain: loneliness, grief, trauma, bullying, abuse, family conflict, breakups, academic/job pressure, shame, burnout, anxiety, depression, self-worth, financial stress, identity struggles.
Style: short replies (2-5 sentences), plain warm language, no lists or lectures. First reflect and validate, then gently offer ONE small thing: a question, a grounding idea, reaching out to one trusted person, or a tiny next step. Ask one question at a time. Never be dismissive, never say "just think positive", never say their wish to die is reasonable. You may mention the app's Coping Library, Journal or Help Now tabs when useful.
Safety: if they mention suicide, self-harm, a plan, or hopelessness, respond calmly and directly: thank them for telling you, say you care, ask plainly whether they are thinking of ending their life and whether they are safe right now, gently encourage them to call Tele-MANAS 14416 or 112 (India) or a trusted person, and suggest moving away from anything they could use to hurt themselves. Never give methods or details of self-harm. Stay with them; do not end the conversation abruptly.
Respond only with your message to the person.`;
window.safeSpaceChatContext={system:SYSTEM,isRisk:text=>RISK.test(text)};
function openChat(){
 stop();window.safeSpaceJournal?.unmount();document.querySelector('.app').classList.remove('journaling','coping');
 $('chat').classList.add('open');document.querySelector('.app').classList.add('chatting');
 if(accountScope)history.replaceState(null,'',location.pathname+'#chat');
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.id==='chatnav'));
 window.safeSpaceChat?.open();
}
$('chatnav').onclick=openChat;
go('help');
setTimeout(()=>{const sp=$('splash');if(!sp)return;sp.classList.add('hide');setTimeout(()=>sp.remove(),800)},2600);

(function(){const sp=document.getElementById('splash');if(!sp)return;const cols=['#ffd1dc','#c7f9cc','#bde0fe','#fff1a8','#e0c3fc'];
for(let k=0;k<18;k++){const b=document.createElement('div');b.className='sp-b';const z=14+Math.random()*46;b.style.cssText=`width:${z}px;height:${z}px;left:${Math.random()*100}%;background:${cols[k%5]}66;animation-duration:${3+Math.random()*4}s;animation-delay:${Math.random()*2}s`;sp.appendChild(b)}})();


function loadAccountData(userId){
 stop();window.safeSpaceJournal?.unmount();accountScope=userId;C=st.get('hn_contacts',[]);mem=readJournal('journal_entries');journalTrash=readJournal('journal_trash');journalDraft={mood:null,tx:'',gd:''};
 window.safeSpaceChat?.reset();
}

window.safeSpaceUI={
 setAccount(user){
  const panel=$('login'),app=document.querySelector('.app');
  $('splash')?.remove();loadAccountData(user?.id||null);if(user&&location.hash==='#chat')openChat();else go(user&&location.hash==='#journal'?'jour':user&&location.hash==='#coping'?'cope':'help');
  document.querySelector('header b').textContent=user?'💙 Hi, '+user.name:'💙 Safe Space';
  panel.classList.toggle('show',!user);app.inert=!user;
  if(user)app.removeAttribute('aria-hidden');else app.setAttribute('aria-hidden','true');
  $('auth-status').hidden=true;
 },
 showStatus(message){$('auth-status').textContent=message;$('auth-status').hidden=false},
navigate:go,
openCoping(id){go('cope');openCopingTool(id)}
};
