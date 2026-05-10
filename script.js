const CS=56,NS=10;

const LADDERS={3:38,8:30,15:44,21:42,28:76,36:57,51:67,71:91};
const SNAKES={17:7,54:34,62:19,64:59,87:24,93:73,95:56,99:78};
const SNAKE_COLORS={17:'#ff6b35',54:'#c77dff',62:'#ff2d78',64:'#ffbe0b',87:'#06d6a0',93:'#ff3a3a',95:'#4cc9f0',99:'#f72585'};

let pos=[0,0],cur=0,active=true,busy=false;

const PIP_MAP={
  1:['pd'],
  2:['pa','pg'],
  3:['pa','pd','pg'],
  4:['pa','pb','pf','pg'],
  5:['pa','pb','pd','pf','pg'],
  6:['pa','pb','pc','pe','pf','pg']
};

function cellPos(n){
  const rb=Math.floor((n-1)/10);
  const cl=(rb%2===0)?(n-1)%10:9-(n-1)%10;
  return{x:cl*CS+CS/2,y:(NS-1-rb)*CS+CS/2};
}

function buildBoard(){
  const g=document.getElementById('grid');
  for(let vr=0;vr<10;vr++){
    const rb=9-vr;
    const even=rb%2===0;
    for(let col=0;col<10;col++){
      const n=even?(rb*10+1+col):(rb*10+10-col);
      const c=document.createElement('div');
      c.className='cell';
      c.id='c'+n;
      if(LADDERS[n])c.style.background='rgba(0,255,136,.06)';
      if(SNAKES[n])c.style.background='rgba(255,58,58,.06)';
      const num=document.createElement('div');
      num.className='cell-num';num.textContent=n;
      const toks=document.createElement('div');
      toks.className='cell-tokens';toks.id='t'+n;
      c.appendChild(num);c.appendChild(toks);
      g.appendChild(c);
    }
  }
  drawOverlay();
}

function drawOverlay(){
  const svg=document.getElementById('svg');
  svg.innerHTML='';

  for(const[f,t]of Object.entries(LADDERS)){
    const a=cellPos(+f),b=cellPos(+t);
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.sqrt(dx*dx+dy*dy);
    const nx=-dy/len*5,ny=dx/len*5;
    const gl=mkEl('line');
    setA(gl,{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#00ff88','stroke-width':14,'stroke-linecap':'round',opacity:.06});
    svg.appendChild(gl);
    for(const s of[1,-1]){
      const l=mkEl('line');
      setA(l,{x1:a.x+s*nx,y1:a.y+s*ny,x2:b.x+s*nx,y2:b.y+s*ny,stroke:'#00ff88','stroke-width':2.5,'stroke-linecap':'round',opacity:.9});
      svg.appendChild(l);
    }
    const rungs=Math.floor(len/18);
    for(let i=1;i<=rungs;i++){
      const t2=i/(rungs+1);
      const rx=a.x+dx*t2,ry=a.y+dy*t2;
      const r=mkEl('line');
      setA(r,{x1:rx+nx,y1:ry+ny,x2:rx-nx,y2:ry-ny,stroke:'#00ff88','stroke-width':2,opacity:.6});
      svg.appendChild(r);
    }
  }

  for(const[f,t]of Object.entries(SNAKES)){
    const col=SNAKE_COLORS[+f]||'#ff3a3a';
    const h=cellPos(+f),tail=cellPos(+t);
    const dx=tail.x-h.x,dy=tail.y-h.y,len=Math.sqrt(dx*dx+dy*dy);
    const px=-dy/len*28,py=dx/len*28;
    const mx=(h.x+tail.x)/2,my=(h.y+tail.y)/2;
    const d=`M${h.x} ${h.y} C${h.x+px+dx*.25} ${h.y+py+dy*.25},${mx-px} ${my-py},${mx} ${my} S${tail.x+px} ${tail.y+py},${tail.x} ${tail.y}`;
    const glp=mkEl('path');
    setA(glp,{d,stroke:col,'stroke-width':14,fill:'none','stroke-linecap':'round',opacity:.07});
    svg.appendChild(glp);
    const p=mkEl('path');
    setA(p,{d,stroke:col,'stroke-width':5,fill:'none','stroke-linecap':'round',opacity:.9});
    svg.appendChild(p);
    const hc=mkEl('circle');
    setA(hc,{cx:h.x,cy:h.y,r:8,fill:col,opacity:.95});
    svg.appendChild(hc);
    for(const s of[-1,1]){
      const eye=mkEl('circle');
      setA(eye,{cx:h.x+s*3,cy:h.y-2,r:2,fill:'#fff'});
      svg.appendChild(eye);
    }
  }
}

function mkEl(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag);}
function setA(el,attrs){for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);}

function showFace(v){
  ['pa','pb','pc','pd','pe','pf','pg'].forEach(id=>document.getElementById(id).classList.remove('on'));
  PIP_MAP[v].forEach(id=>document.getElementById(id).classList.add('on'));
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

async function roll(){
  if(!active||busy)return;
  busy=true;
  document.getElementById('rollBtn').disabled=true;

  const dice=document.getElementById('dice');
  dice.classList.add('spin');
  let flips=0;
  const fi=setInterval(()=>{showFace(Math.ceil(Math.random()*6));flips++;if(flips>=10)clearInterval(fi);},55);
  await sleep(600);
  dice.classList.remove('spin');

  const val=Math.ceil(Math.random()*6);
  showFace(val);
  await sleep(250);
  await movePlayer(cur,val);
  busy=false;
}

async function movePlayer(p,val){
  const old=pos[p];
  let nxt=old+val;

  if(nxt>100){
    addLog(`P${p+1} rolled ${val} — needs exact roll!`,`l${p+1}`);
    nxt=old;
    renderTokens(p,nxt,true);
    await sleep(300);
  } else {
    addLog(`P${p+1} rolled ${val}: ${old||'START'} → ${nxt}`,`l${p+1}`);
    // Step pawn cell by cell
    for(let step=old+1;step<=nxt;step++){
      pos[p]=step;
      renderTokens(p,step,true);
      flash(step);
      await sleep(step===nxt?120:130);
    }
  }

  await sleep(280);

  if(LADDERS[nxt]){
    const dest=LADDERS[nxt];
    addLog(`🪜 Ladder! P${p+1} climbs ${nxt}→${dest}`,'lladder');
    await sleep(180);
    // Glide up the ladder quickly
    const dir=dest>nxt?1:-1;
    for(let s=nxt+dir;s!==dest+dir;s+=dir){
      pos[p]=s;
      renderTokens(p,s,true);
      await sleep(60);
    }
    flash(dest);
    await sleep(300);
  } else if(SNAKES[nxt]){
    const dest=SNAKES[nxt];
    addLog(`🐍 Snake! P${p+1} slides ${nxt}→${dest}`,'lsnake');
    await sleep(180);
    // Slide down the snake
    const dir=dest>nxt?1:-1;
    for(let s=nxt+dir;s!==dest+dir;s+=dir){
      pos[p]=s;
      renderTokens(p,s,false);
      await sleep(55);
    }
    flash(dest);
    await sleep(300);
  }

  updateUI();

  if(pos[p]>=100){
    pos[p]=100;renderTokens(p,100,true);
    addLog(`🏆 PLAYER ${p+1} WINS!`,'lwin');
    await sleep(600);
    showWin(p);
    return;
  }

  cur=1-cur;
  updateTurnUI();
  document.getElementById('rollBtn').disabled=false;
}

function renderTokens(movedPlayer,movedCell,bounce){
  document.querySelectorAll('.cell-tokens').forEach(e=>e.innerHTML='');
  for(let p=0;p<2;p++){
    if(pos[p]<=0)continue;
    const tk=document.createElement('div');
    const isMoving=(p===movedPlayer&&pos[p]===movedCell&&bounce);
    tk.className=`token tok${p+1}${isMoving?' tok-bounce':''}`;
    tk.textContent=`P${p+1}`;
    const cont=document.getElementById('t'+pos[p]);
    if(cont)cont.appendChild(tk);
  }
  document.getElementById('ps1').textContent=pos[0]||'START';
  document.getElementById('ps2').textContent=pos[1]||'START';
}

function flash(n){
  const c=document.getElementById('c'+n);
  if(!c)return;
  c.classList.remove('hl');
  void c.offsetWidth;
  c.classList.add('hl');
  setTimeout(()=>c.classList.remove('hl'),750);
}

function updateUI(){
  document.getElementById('ps1').textContent=pos[0]||'START';
  document.getElementById('ps2').textContent=pos[1]||'START';
}

function updateTurnUI(){
  document.getElementById('c1').classList.toggle('active',cur===0);
  document.getElementById('c2').classList.toggle('active',cur===1);
  document.getElementById('tb1').style.display=cur===0?'inline-block':'none';
  document.getElementById('tb2').style.display=cur===1?'inline-block':'none';
}

function addLog(msg,cls){
  const log=document.getElementById('log');
  const e=document.createElement('div');
  e.className=`log-entry ${cls}`;e.textContent=msg;
  log.insertBefore(e,log.firstChild);
  if(log.children.length>25)log.removeChild(log.lastChild);
}

function showWin(p){
  active=false;
  document.getElementById('winSub').textContent=`Player ${p+1} Wins!`;
  document.getElementById('winSub').style.color=p===0?'var(--p1)':'var(--p2)';
  document.getElementById('winOverlay').classList.add('show');
}

function restart(){
  pos=[0,0];cur=0;active=true;busy=false;
  document.getElementById('winOverlay').classList.remove('show');
  document.getElementById('rollBtn').disabled=false;
  document.getElementById('log').innerHTML='';
  renderTokens(-1,-1,false);updateTurnUI();showFace(6);
  addLog('Game started! Player 1 goes first.','l1');
}

buildBoard();
showFace(6);
renderTokens(-1,-1,false);
addLog('Game started! Player 1 goes first.','l1');