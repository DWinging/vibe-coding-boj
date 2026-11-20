import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CATEGORIZED_TAGS } from '../js/api.js';
const turn = () => new Promise(r => setImmediate(r));
test('options cap selection at five across categories, search, reset and saved presets', async () => {
  let boxes = [], sections = [], chips = [], deletes = [];
  const alerts = [], data = { customPresets: { Five:['stack','queue','deque','bfs','dfs'], Legacy:['stack','queue','deque','bfs','dfs','dp'] } };
  function element() {
    return { value:'',style:{},dataset:{},handlers:{},addEventListener(t,fn){this.handlers[t]=fn;},
      dispatchEvent(e){return this.handlers[e.type]?.({target:this});},click(){return this.onclick?.({target:this});} };
  }
  const els = Object.fromEntries(['searchInput','presetName','savePresetBtn','resetBtn','presetList','algoContainer'].map(id=>[id,element()]));
  Object.defineProperty(els.algoContainer,'innerHTML',{set(html){
    assert.ok(!html.includes('select-all'),'removed select-all must not render');
    boxes=[];sections=Object.values(CATEGORIZED_TAGS).map(tags=>{
      const section={style:{}};
      const cards=tags.map(tag=>{
        const cb={value:tag.key,checked:false,disabled:false,title:''};
        const card={style:{},title:tag.key,innerText:tag.name};
        cb.closest=()=>card;card.cb=cb;boxes.push(cb);return card;
      });
      section.querySelectorAll=selector=>selector==='.tag-card'?cards:cards.map(c=>c.cb);
      return section;
    });
  }});
  Object.defineProperty(els.presetList,'innerHTML',{set(html){
    chips=[...html.matchAll(/class="preset-chip preset-load-trigger" data-name="([^"]+)"/g)].map(m=>({dataset:{name:m[1]}}));
    deletes=[...html.matchAll(/class="del-btn" data-name="([^"]+)"/g)].map(m=>({dataset:{name:m[1]}}));
  }});
  globalThis.document={
    getElementById:id=>els[id],
    querySelectorAll:selector=>({
      '.tag-cb':boxes,'.tag-cb:checked':boxes.filter(b=>b.checked),'.category-section':sections,
      '.preset-load-trigger':chips,'.del-btn':deletes
    })[selector] || []
  };
  globalThis.chrome={storage:{sync:{get:async()=>structuredClone(data),set:async next=>Object.assign(data,structuredClone(next))}}};
  globalThis.alert=message=>alerts.push(message);globalThis.confirm=()=>true;
  let src=await readFile(new URL('../js/options.js',import.meta.url),'utf8');
  for(const name of ['api','protocol']) src=src.replace("'./"+name+".js'",JSON.stringify(new URL('../js/'+name+'.js',import.meta.url).href));
  try {
    await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));await turn();
    const find=key=>boxes.find(b=>b.value===key);
    for(const key of data.customPresets.Five){const cb=find(key);cb.checked=true;cb.onchange();}
    assert.ok(boxes.filter(b=>b.checked).every(b=>!b.disabled));
    assert.ok(boxes.filter(b=>!b.checked).every(b=>b.disabled));
    // Filtering must not count just the visible tags or unlock hidden selections.
    els.searchInput.value='dp';els.searchInput.dispatchEvent(new Event('input'));
    assert.equal(find('dp').disabled,true);
    find('stack').checked=false;find('stack').onchange();
    assert.ok(boxes.every(b=>!b.disabled));
    find('dp').checked=true;find('dp').onchange();
    assert.ok(find('stack').disabled);
    // Defensive guard if a sixth change is dispatched despite disabled state.
    find('stack').checked=true;find('stack').onchange();
    assert.equal(find('stack').checked,false);
    assert.equal(alerts.at(-1),'알고리즘은 최대 5개 까지 선택 가능합니다.');

    els.resetBtn.click();
    assert.ok(boxes.every(b=>!b.checked&&!b.disabled));
    assert.equal(els.searchInput.value,'');
    assert.ok(sections.every(s=>s.style.display==='block'));
    chips.find(c=>c.dataset.name==='Five').onclick({currentTarget:chips.find(c=>c.dataset.name==='Five')});
    assert.equal(boxes.filter(b=>b.checked).length,5);
    assert.ok(find('dp').disabled);
    chips.find(c=>c.dataset.name==='Legacy').onclick({currentTarget:chips.find(c=>c.dataset.name==='Legacy')});
    assert.equal(boxes.filter(b=>b.checked).length,6,'do not silently truncate an old preset');
    const writesBefore=JSON.stringify(data);
    await els.savePresetBtn.onclick();
    assert.equal(JSON.stringify(data),writesBefore);
    assert.equal(alerts.at(-1),'알고리즘은 최대 5개 까지 선택 가능합니다.');
    find('dp').checked=false;find('dp').onchange();
    assert.equal(find('dp').disabled,true);
    els.presetName.value='Edited';await els.savePresetBtn.onclick();
    assert.equal(data.customPresets.Edited.length,5);
    assert.ok(boxes.every(b=>!b.checked&&!b.disabled));
  } finally {
    delete globalThis.document;delete globalThis.chrome;delete globalThis.alert;delete globalThis.confirm;
  }
});
