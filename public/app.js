
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
function go(v){stop();$('chat').classList.remove('open');document.querySelector('.app').classList.remove('chatting');document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));views[v]();main.scrollTop=0}
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
function copeHome(){stop();main.innerHTML=`<h1>Coping Library</h1><p class="sub">Intense feelings rise and fall. Pick one small thing to try right now.</p>${LIB.map(e=>`<button class="tile" data-id="${e[0]}"><b>${e[1]}</b><span>${e[2]}</span></button>`).join('')}`;
 main.querySelectorAll('.tile').forEach(b=>b.onclick=()=>{stop();const e=LIB.find(x=>x[0]===b.dataset.id);main.innerHTML=`<button class="back" id="bk">← Back to library</button><div class="card" id="c"></div>`;$('bk').onclick=copeHome;e[3]($('c'));main.scrollTop=0})}
function breathing(c){c.innerHTML=`<h2>Slow breathing</h2><p>Breathe in gently through your nose, then out slowly through your mouth. Never strain. If you feel dizzy, breathe normally.</p><div class="orb" id="o">Ready</div><div class="center"><button class="btn" id="go">Start</button></div>`;
 $('go').onclick=e=>{stop();const o=$('o');let n=0;const s=()=>{const i=n%2===0;o.style.transform=i?'scale(1.5)':'scale(1)';o.textContent=i?'Breathe in…':'Breathe out…';n++};s();timer=setInterval(s,4500);e.target.textContent='Restart'}}
function ground(c){const S=[['5','things you can SEE','Look around slowly and name five, even small ones.'],['4','things you can TOUCH','Feel your clothes, the chair, the floor under your feet.'],['3','things you can HEAR','Near sounds, far sounds, even your own breathing.'],['2','things you can SMELL','Or remember two smells you like.'],['1','thing you can TASTE','Or take a slow sip of a warm drink.']];let i=0;
 const r=()=>{if(i>=S.length){c.innerHTML=`<h2>You’re here, in this moment 💙</h2><p>Notice how your body feels compared to a few minutes ago. Even a small change counts.</p><button class="btn" id="a">Do it again</button> <button class="btn alt" id="h">Library</button>`;$('a').onclick=()=>{i=0;r()};$('h').onclick=copeHome;return}
 const s=S[i];c.innerHTML=`<h2>5-4-3-2-1 grounding</h2><div class="big">${s[0]}</div><p class="center"><b>${s[1]}</b></p><p class="center">${s[2]}</p><div class="center"><button class="btn" id="n">Next</button></div>`;$('n').onclick=()=>{i++;r()}};r()}
function wait(c){let s=900;c.innerHTML=`<h2>Wait 15 minutes</h2><p>The urge can come in waves. You don’t have to solve everything. Just stay safe for the next 15 minutes: be near someone, listen to music, or breathe.</p><div class="big" id="tm">15:00</div><div class="center"><button class="btn" id="st">Start timer</button></div><p id="msg" class="center"></p>`;
 const show=()=>{$('tm').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
 $('st').onclick=()=>{stop();s=900;show();timer=setInterval(()=>{s--;show();if(s<=0){stop();$('msg').innerHTML='You made it through 15 minutes. That took strength. If the thoughts are still strong, call <a href="tel:14416">14416</a> or tell someone near you now. You can start another 15.'}},1000)}}
function safer(c){c.innerHTML=`<h2>Make your space safer</h2><p>Putting distance between you and anything you could use to hurt yourself can save your life in a hard moment.</p><ul><li>Move away from anything dangerous, or ask someone to hold it for now.</li><li>Go to a room with other people, or step outside somewhere public.</li><li>Call or message someone: “I’m not okay. Can you stay with me?”</li><li>If you have taken something or are in immediate danger, call <a href="tel:112">112</a> now.</li></ul>`}
function reach(c){c.innerHTML=`<h2>Reach out to one person</h2><p>You don’t need perfect words. Send one of these:</p><ul><li>“I’m having a really hard time and don’t want to be alone. Can I call you?”</li><li>“I’m not okay tonight. Can you stay on the phone with me?”</li><li>“Can I come over? I just need company.”</li></ul><p>No one to message? Trained listeners are free: <a href="tel:14416">Tele-MANAS 14416</a>, iCall <a href="tel:9152987821">9152987821</a>, AASRA <a href="tel:+919820466726">+91-9820466726</a>.</p>`}
function body(c){const P=['Hands: squeeze your fists gently for 5 seconds, then let go.','Shoulders: lift them toward your ears, hold 5 seconds, then drop them.','Face: scrunch softly, hold, then release your jaw.','Stomach: tighten gently, hold, then let it soften.','Legs and feet: press your feet into the floor, hold, then relax.','Take one slow breath. Notice any tension that has loosened.'];let i=0;
 const r=()=>{const l=i>=P.length;c.innerHTML=`<h2>Gentle body release</h2><p>Tense gently (never to the point of pain), then let go.</p><p><b>${l?'Done 💙':P[i]}</b></p><button class="btn" id="n">${l?'Back to library':'Next'}</button>`;$('n').onclick=()=>{if(l)copeHome();else{i++;r()}}};r()}
function kind(c){c.innerHTML=`<h2>Talk to yourself like a friend</h2><p>Imagine a close friend felt exactly like you do. What would you say to them? Write it, then read it back as if it were for you.</p><textarea rows="4" id="k"></textarea><p class="meta">Starters: “This pain is real, and it is not your fault.” “You don’t have to figure out your whole life tonight.” “Feelings change, even the ones that feel permanent.”</p><button class="btn" id="b">Read it back</button><p id="o"></p>`;
 $('b').onclick=()=>{const v=$('k').value.trim();$('o').innerHTML=v?`<b>Hear it as if it was meant for you:</b><br>“${esc(v)}”`:'Even one sentence is enough.'}}
function plan(c){const F=[['why','Reasons I want to stay (people, pets, hopes, even tiny ones)'],['signs','Warning signs that I’m getting worse'],['calm','Things that calm me (songs, places, people)'],['ppl','People I can contact (name + number)']];
 c.innerHTML=`<h2>My reasons & my plan</h2><p>Fill this in when you can, so it’s ready for hard moments. Saved on this device only.</p>${F.map(f=>`<label>${f[1]}</label><textarea rows="2" data-k="${f[0]}">${esc(st.get('cl_'+f[0],''))}</textarea>`).join('')}<p>Crisis line <a href="tel:14416">14416</a> · Emergency <a href="tel:112">112</a></p><button class="btn" id="sv">Save</button> <span id="ok"></span>`;
 $('sv').onclick=()=>{c.querySelectorAll('textarea').forEach(t=>st.set('cl_'+t.dataset.k,t.value));$('ok').textContent='Saved ✓'}}

/* ---------- JOURNAL ---------- */
const MOODS=[['😞','Very low',1],['😔','Low',2],['😐','Okay',3],['🙂','Better',4],['😊','Good',5]];
const PROMPTS=['What is weighing on me most right now?','One small thing that was a little okay today…','Someone who would care if they knew how I feel…','What I need most in this moment…','A hard moment I got through before…','What I would tell a friend who felt this way…','One tiny thing I can do for myself in the next hour…'];
let mem=st.get('journal_entries',[]),mood=null;
function jourTabs(on){return`<div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn ${on==='w'?'':'alt'}" id="jw" style="flex:1;margin:0">Write</button><button class="btn ${on==='l'?'':'alt'}" id="jl" style="flex:1;margin:0">My entries</button></div>`}
function jourBind(){$('jw').onclick=jourWrite;$('jl').onclick=jourList}
function jourWrite(){
 main.innerHTML=`<h1>My Journal</h1><p class="sub">A private place for your thoughts. Nothing leaves this device.</p>${jourTabs('w')}<div class="card" style="margin-top:0"><b>How are you feeling right now?</b><div class="moods" style="margin-top:8px">${MOODS.map(m=>`<button class="mood${mood===m[2]?' on':''}" data-m="${m[2]}"><span>${m[0]}</span><small>${m[1]}</small></button>`).join('')}</div>
 <label>Need a starting point? Tap one:</label><div>${PROMPTS.map((p,i)=>`<button class="chip" data-p="${i}">${esc(p)}</button>`).join('')}</div>
 <label for="tx">Write whatever is on your mind. No one is judging you.</label><textarea id="tx" rows="7" placeholder="Start here…"></textarea>
 <label for="gd">One thing that helped, even a little, today (optional)</label><textarea id="gd" rows="2"></textarea><button class="btn" id="sv">Save entry</button><div id="after"></div></div>`;
 jourBind();
 main.querySelectorAll('.mood').forEach(b=>b.onclick=()=>{mood=+b.dataset.m;main.querySelectorAll('.mood').forEach(x=>x.classList.toggle('on',x===b))});
 main.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{const t=$('tx');t.value+=(t.value?'\n\n':'')+PROMPTS[+b.dataset.p]+'\n';t.focus()});
 $('sv').onclick=()=>{const tx=$('tx').value.trim(),gd=$('gd').value.trim(),a=$('after');if(!tx&&!gd&&!mood){a.innerHTML='<p class="meta">Write a few words or pick a mood first.</p>';return}
  mem.unshift({id:Date.now(),mood,tx,gd});const ok=st.set('journal_entries',mem);let h=`<p>${ok?'Saved ✓ You showed up for yourself today.':'Saved for this session, but your browser blocked permanent storage.'}</p>`;
  if(RISK.test(tx+' '+gd)||mood===1)h+=careHTML;a.innerHTML=h;$('tx').value='';$('gd').value='';mood=null;main.querySelectorAll('.mood').forEach(x=>x.classList.remove('on'))}}
function jourList(){const last=mem.filter(e=>e.mood).slice(0,14).reverse();let h=`<h1>My Journal</h1>${jourTabs('l')}`;
 if(last.length>1)h+=`<div class="card"><b>Your recent moods</b><div class="meta">Feelings move up and down. Low days pass.</div><div class="bars">${last.map(e=>`<div style="height:${e.mood*20}%"></div>`).join('')}</div></div>`;
 if(!mem.length)h+='<div class="card">No entries yet. Your first one can be just one sentence.</div>';
 h+=mem.map(e=>`<div class="card entry"><div class="meta">${new Date(e.id).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}${e.mood?' · '+MOODS[e.mood-1][0]+' '+MOODS[e.mood-1][1]:''}</div>${e.tx?`<p>${esc(e.tx)}</p>`:''}${e.gd?`<p class="meta">✨ Helped: ${esc(e.gd)}</p>`:''}<button class="btn alt sm" data-d="${e.id}">Delete</button></div>`).join('');
 main.innerHTML=h;jourBind();
 main.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{if(b.dataset.s){mem=mem.filter(e=>e.id!=b.dataset.d);st.set('journal_entries',mem);jourList()}else{b.dataset.s=1;b.textContent='Tap again to delete for good'}})}

/* ---------- CHAT ---------- */
const SYSTEM=`You are "Safe Space", a warm, gentle, non-judgmental peer-support companion for people who may be struggling emotionally or having thoughts of suicide. You are NOT a licensed therapist and never claim to be or to diagnose; you offer caring, non-professional support.
Draw on broad understanding of emotional pain: loneliness, grief, trauma, bullying, abuse, family conflict, breakups, academic/job pressure, shame, burnout, anxiety, depression, self-worth, financial stress, identity struggles.
Style: short replies (2-5 sentences), plain warm language, no lists or lectures. First reflect and validate, then gently offer ONE small thing: a question, a grounding idea, reaching out to one trusted person, or a tiny next step. Ask one question at a time. Never be dismissive, never say "just think positive", never say their wish to die is reasonable. You may mention the app's Coping Library, Journal or Help Now tabs when useful.
Safety: if they mention suicide, self-harm, a plan, or hopelessness, respond calmly and directly: thank them for telling you, say you care, ask plainly whether they are thinking of ending their life and whether they are safe right now, gently encourage them to call Tele-MANAS 14416 or 112 (India) or a trusted person, and suggest moving away from anything they could use to hurt themselves. Never give methods or details of self-harm. Stay with them; do not end the conversation abruptly.
Respond only with your message to the person.`;
const log=$('log'),ct=$('ct'),cs=$('cs'),hist=[];let sample=null,busy=false,started=false,chatGeneration=0;
function add(t,c){const d=document.createElement('div');d.className='m '+c;d.textContent=t;log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
async function openChat(){stop();$('chat').classList.add('open');document.querySelector('.app').classList.add('chatting');document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.id==='chatnav'));if(!started){started=true;add('Heyy 💙 how was your day?','bot');try{sample=await claude.use('sample')}catch(e){sample=null}}ct.focus()}
$('chatnav').onclick=openChat;$('cx').onclick=()=>go('help');
const FB=["Thank you for sharing that with me. It sounds really heavy. Do you want to tell me more about what's been weighing on you?","I'm here and listening. What part of this is hurting the most right now?","That sounds really hard, and your feelings make sense. Is there one person you trust that you could reach out to today?"];
async function send(){const generation=chatGeneration;const v=ct.value.trim();if(!v||busy)return;ct.value='';add(v,'me');hist.push({role:'user',content:v});busy=true;cs.disabled=true;
 if(RISK.test(v))add("You're not alone, and your life matters. If you're in danger right now, please call 112. You can also talk to a trained person any time, free: Tele-MANAS 14416 (24/7), iCall 9152987821, or AASRA +91-9820466726. You can also tap Help Now below.",'crisis');
 const b=add('…','bot');let r;
 try{if(!sample)throw 0;const msgs=[{role:'user',content:SYSTEM+"\n\n(Conversation begins. You already asked: 'Heyy how was your day?')"},{role:'assistant',content:"Understood. I'll respond warmly and safely."},...hist.slice(-20)];
  const x=await sample(msgs,{cache:false,onText:({text})=>{if(generation!==chatGeneration)return;b.textContent=text;log.scrollTop=log.scrollHeight}});r=x.text}catch(e){r=FB[hist.length%3]}
 if(generation!==chatGeneration)return;
 b.textContent=r;hist.push({role:'assistant',content:r});busy=false;cs.disabled=false;ct.focus();log.scrollTop=log.scrollHeight}
cs.onclick=send;ct.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});

go('help');
setTimeout(()=>{const sp=$('splash');sp.classList.add('hide');setTimeout(()=>sp.remove(),800)},2600);

(function(){const sp=document.getElementById('splash');if(!sp)return;const cols=['#ffd1dc','#c7f9cc','#bde0fe','#fff1a8','#e0c3fc'];
for(let k=0;k<18;k++){const b=document.createElement('div');b.className='sp-b';const z=14+Math.random()*46;b.style.cssText=`width:${z}px;height:${z}px;left:${Math.random()*100}%;background:${cols[k%5]}66;animation-duration:${3+Math.random()*4}s;animation-delay:${Math.random()*2}s`;sp.appendChild(b)}})();


function loadAccountData(userId){
 stop();accountScope=userId;C=st.get('hn_contacts',[]);mem=st.get('journal_entries',[]);mood=null;
 chatGeneration++;hist.length=0;log.replaceChildren();ct.value='';busy=false;cs.disabled=false;started=false;sample=null;
}
