/**
	Open Innovations line charts in SVG
	Version 0.4.7
  */
(function(root){
	// Part of the OI namespace
	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}
	function LineChart(el,attr){
		if(!el){
			console.error('No element to attach to');
			return this;
		}
		var w,h,ns,loader,svg,series,xmin,ymin,xmax,ymax,defs,key,duration,opt,axes,fo,lbl,events;
		if(!attr) attr = {};

		// Add loader icon to chart
		loader = (new Loader(el)).loading();

		this.el = el;
		lbl = 'linechart';
		ns = 'http://www.w3.org/2000/svg';
		duration = (typeof attr.duration==="number" ? attr.duration : "0s");
		w = el.clientWidth;
		h = el.clientHeight;
		var sty = getComputedStyle(el);
		h -= parseFloat(sty.paddingTop) + parseFloat(sty.paddingBottom);
		w -= parseFloat(sty.paddingLeft) + parseFloat(sty.paddingRight);
		series = [];
		events = {};
		opt = {
			'left':0,'top':0,'right':0,'bottom':0,'tick':5,'font-size': 16,'tooltip':{},
			'key':{'show':false,'border':{'stroke':'black','stroke-width':1,'fill':'none'},'text':{'text-anchor':'start','dominant-baseline':'hanging','font-weight':'bold','fill':'black','stroke-width':0,'font-family':'sans-serif'}},
			'axis':{'x':{},'y':{}}
		};
		merge(opt,attr);

		// Create SVG container
		if(!svg){
			svg = svgEl('svg');
			setAttr(svg,{'xmlns':ns,'version':'1.1','width':w,'height':h,'viewBox':'0 0 '+w+' '+h,'overflow':'visible','style':'max-width:100%;','preserveAspectRatio':'xMinYMin meet'});
			defs = svgEl('defs');
			add(defs,svg);
			add(svg,el);
			el.addEventListener('mouseleave',function(e){ clearTooltip(); });
			fo = svgEl("foreignObject");
			setAttr(fo,{'width':1,'height':1,'overflow':'visible'});
			add(fo,svg);
		}
		axes = {x:new Axis("x",opt.left,w-opt.right-opt.left),y:new Axis("y",opt.bottom,h-opt.top-opt.bottom)};
		axes.x.setProperties(opt.axis.x||{});
		axes.y.setProperties(opt.axis.y||{});

		this.on = function(ev,attr,cb){
			if(typeof attr==="function"){
				cb = clone(attr);
				delete attr;
			}
			events[ev] = new Event(attr,cb);
			return this;
		};
		this.off = function(ev){
			delete events[ev];
			return this;
		}
		this.getSVG = function(){
			svg.querySelectorAll('animate').forEach(function(e){ e.parentNode.removeChild(e); });
			return svg.outerHTML;
		};
		this.setProperties = function(a){
			merge(opt, a||{});
			axes.x.setProperties(opt.axis.x||{});
			axes.y.setProperties(opt.axis.y||{});
			return this;
		};
		function Event(attr,cb){
			if(typeof attr==="function"){
				cb = attr;
				attr = {};
			}
			this.trigger = function(props){
				var a = attr;
				merge(a,props);
				cb.call(a['this']||this,a);
			}
		}
		function onClick(e,i){
			if(fo && events.click) events.click.trigger({'i':i});
		}
		function showTooltip(e,s,i,d,tt){
			var txt,tip,c,bb,bbo;
			if(!fo) return;
			tip = qs(fo,'.'+lbl+'-tooltip');
			if(!tip){
				tip = document.createElement('div');
				addClasses(tip,[lbl+'-tooltip']);
				add(tip,fo);
			}
			// Set the contents
			txt = qs(e,'title').innerHTML;
			if(!d.label) d.label = txt;
			if(typeof tt.label==="function") txt = tt.label.call(e,{'series':s,'i':i,'data':d});
			else if(typeof tt.label==="string") txt = tt.label;
			txt = txt.replace(/\n/g,"<br />");
			tip.innerHTML = (txt);

			// Update the class
			c = "";
			if(typeof tt.class==="function") c = tt.class.call(e,{'series':s,'i':i,'data':d});
			else if(typeof tt.class==="string") c = tt.class;
			if(c) tip.setAttribute('class',c);

			// Position the tooltip
			bb = e.getBoundingClientRect();	// Bounding box of the element
			bbo = svg.getBoundingClientRect(); // Bounding box of SVG holder
			tip.setAttribute('style','position:absolute;left:'+Math.round(bb.left + bb.width/2 - bbo.left + el.scrollLeft)+'px;top:'+Math.round(bb.top + bb.height/2 - bbo.top)+'px;transform:translate3d(-50%,-100%,0);display:'+(txt ? 'block':'none'));
			add(fo,svg);
			if(events.showtooltip) events.showtooltip.trigger({'i':i});
			return true;
		}
		function clearTooltip(){
			var tip = qs(svg,'.'+lbl+'-tooltip');
			if(tip) tip.parentNode.removeChild(tip);
			if(events.hidetooltip) events.hidetooltip.trigger();
			return true;
		}
		function getXY(x,y){
			x = opt.left + ((x-xmin)/(xmax-xmin))*(w-opt.left-opt.right);
			y = opt.top + (1-(y-ymin)/(ymax-ymin))*(h-opt.bottom-opt.top);
			return {x:x,y:y};
		}
		function svgEl(t){ return document.createElementNS(ns,t); }
		function Axis(ax,a,b){
			var attr = {line:{'show':true,stroke:'black','stroke-width':1,'stroke-linecap':'round','stroke-dasharray':''},grid:{'show':false,'stroke':'black','stroke-width':1,'stroke-linecap':'round','stroke-dasharray':''},title:{},ticks:{'show':true},labels:{}};
			this.ticks = {};
			this.line = {};
			this.el = svgEl("g");
			addClasses(this.el,[lbl+'-grid',lbl+'-grid-'+ax]);
			this.title = svgEl("text");
			this.title.classList.add(lbl+'-grid-title');
			add(this.title,this.el);
			var fs = opt['font-size']||16;
			var p = 4;
			add(this.el,svg);
			this.setProperties = function(myopt){
				merge(attr,myopt);
				return this;
			};
			this.getProperty = function(pid){
				if(attr.hasOwnProperty(pid)) return attr[pid];
				else return null;
			};
			this.update = function(){
				var t,x,y,pos,len,align,talign,tx,ty;
				if(!attr.labels) attr.labels = {};
				this.title.innerHTML = attr.title.label||"";
				x = (ax=="x" ? (opt.left + (w-opt.right-opt.left)/2):fs/2);
				y = (ax=="y" ? (opt.top + (h-opt.top-opt.bottom)/2):(h-fs/2));
				setAttr(this.title,{'x':x,'y':y,'transform':(ax=="y"?'rotate(-90,'+x+','+y+')':'')});
				this.el.removeAttribute('style');
				// Check if we need to add a line
				if(!this.line.el){
					this.line.el = svgEl("path");
					this.line.el.classList.add('line');
					this.line.el.setAttribute('vector-effect','non-scaling-stroke');
					// Add it to the element
					add(this.line.el,this.el);
					// Create an animation for the line
					this.line.animate = new Animate(this.line.el);
				}
				pos = [{x:(opt.left-0.5),y:(h-opt.bottom-0.5)},{x:(ax=="x" ? (w-opt.right) : (opt.left-0.5)),y:(ax=="x" ? (h-opt.bottom-0.5) : (opt.top-0.5))}];
				this.line.animate.set({'d':{'from':'','to':pos}});
				setAttr(this.line.el,{'style':(attr.line.show ? 'display:block':'display:none'),'stroke':attr.line.stroke,'stroke-width':attr.line['stroke-width'],'stroke-dasharray':attr.line['stroke-dasharray']});
				// Loop over existing ticks removing any that no longer exist
				for(t in this.ticks){
					if(t && !attr.ticks.show){
						if(this.ticks[t].line) this.ticks[t].line.parentNode.removeChild(this.ticks[t].line);
						if(this.ticks[t].text) this.ticks[t].text.parentNode.removeChild(this.ticks[t].text);
						delete this.ticks[t];
					}
				}
				for(t in attr.labels){
					// Check if this tick exists
					if(typeof t!=="undefined"){
						align = attr.labels[t].align||(ax=="x" ? "bottom" : "left");
						talign = attr.labels[t]['text-anchor']||(ax=="y" ? (align=="left" ? "end":"start") : "middle");
						len = (typeof attr.labels[t].length==="number" ? attr.labels[t].length:5);
						x = (ax=="x" ? parseFloat(t) : (align=="left" ? xmin:xmax));
						y = (ax=="x" ? (align=="bottom" ? ymin:ymax) : parseFloat(t));
						a = getXY(x,y);
						a.x = Math.round(a.x);
						b.x = Math.round(b.x);
						b = clone(a);
						if(ax=="x"){
							if(attr.grid.show && x!=xmin) a.y = (align=="bottom" ? opt.top : h-opt.bottom);
							b.y += (align=="bottom" ? len : -len);
						}else{
							if(attr.grid.show && y!=ymin) a.x = (align=="left" ? w-opt.right :opt.left);
							b.x += (align=="left" ? -len : len);
						}
						if((ax=="x" && (x<xmin || x>xmax)) || (ax=="y" && (y<ymin || y>ymax))){
							if(this.ticks[t]){
								if(this.ticks[t].line) this.ticks[t].line.el.setAttribute('style','display:none');
								if(this.ticks[t].text) this.ticks[t].text.el.setAttribute('style','display:none');
							}
						}else{
							if(!this.ticks[t]){
								this.ticks[t] = {'text':{'el':svgEl('text')}};
								if(len>0){
									this.ticks[t].line = {'el':svgEl('line')};
									this.ticks[t].line.animate = new Animate(this.ticks[t].line.el);
									add(this.ticks[t].line.el,this.el);
								}
								this.ticks[t].text.animate = new Animate(this.ticks[t].text.el);
								this.ticks[t].text.el.setAttribute('text-anchor',(attr['text-anchor'] || talign));
								add(this.ticks[t].text.el,this.el);
							}else{
								if(this.ticks[t].line) this.ticks[t].line.el.removeAttribute('style');
								this.ticks[t].text.el.removeAttribute('style');
							}
							if(this.ticks[t].line){
								this.ticks[t].line.animate.set({
									'x1':{'to':a.x-0.5},
									'x2':{'to':b.x-0.5},
									'y1':{'to':a.y-0.5},
									'y2':{'to':b.y-0.5}
								});
								setAttr(this.ticks[t].line.el,{'stroke':attr.grid.stroke,'stroke-width':attr.grid['stroke-width']});
							}
							this.ticks[t].text.el.innerHTML = attr.labels[t].label;
							setAttr(this.ticks[t].text.el,{'stroke':attr.labels[t].stroke||"black",'stroke-width':attr.labels[t]['stroke-width']||0,'fill':attr.labels[t].fill||"black"});
							tx = b.x+(attr.labels[t].dx||0)+(ax=="y" ? (attr.labels[t].align=="right" ? 1:-1)*p : 0);
							ty = b.y+(attr.labels[t].dy||0)+(ax=="x" ? (attr.labels[t].align=="bottom" ? -1:1)*p : 0);
							this.ticks[t].text.animate.set({'x':{'to':tx},'y':{'to':ty}});
						}
					}
				}
				add(this.line.el,this.el); // simulate z-index
			};
			return this;
		}
		// Define a data series
		function Series(s,data,props){
			if(!data) data = [];
			var attr,line,path,pts,o;
			attr = {points:{show:true,color:'black','stroke-linecap':'round','stroke':'black','stroke-width':0,'fill-opacity':1},line:{show:true,color:'#000000','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round','stroke-dasharray':'','fill':'none'}};
			line = {};
			path = "";
			pts = [];
			label = "";

			// Build group
			this.el = svgEl("g");
			o = {'id':(attr.id||'series-'+(s+1))};
			o[lbl+'-series'] = (s+1);
			setAttr(this.el,o);
			addClasses(this.el,[lbl+'-series',lbl+'-series-'+(s+1)]);

			function ptooltip(e){
				var i = parseInt(e.target.getAttribute('data-i'));
				if(data[i]) showTooltip(e.target,attr,i,data[i],attr.tooltip);
				else console.error('Bad tooltip '+i,e);
			}
			this.select = function(){
				line.el.classList.add('on');
				return this;
			};
			this.selectItem = function(i){
				if(i >= 0 && pts[i].el) ptooltip({'target':pts[i].el});
				else clearTooltip();
				return this;
			}
			this.deselect = function(){
				line.el.classList.remove('on');
				return this;
			};
			this.setData = function(d){ data = d||[]; return this; };
			this.updateRange = function(){
				for(var i = 0; i < data.length; i++){
					xmin = Math.min(xmin,data[i].x);
					ymin = Math.min(ymin,data[i].y);
					xmax = Math.max(xmax,data[i].x);
					ymax = Math.max(ymax,data[i].y);
				}
				return this;
			};
			this.getStyle = function(t,p){
				if(attr.hasOwnProperty(t)){
					if(attr[t].hasOwnProperty(p)) return attr[t][p];
				}
				return null;
			};
			this.getProperty = function(pid){
				if(attr.hasOwnProperty(pid)) return attr[pid];
				else return null;
			};
			this.getProperties = function(){ return attr; };
			this.setProperties = function(a){
				if(!a) a = {};
				merge(attr, a);
				if(attr.class){
					var c = attr.class.split(/ /);
					addClasses(this.el,c);
				}
				return this;
			};
			this.update = function(){
				var c,i,pt,txt,p,r,ps,o;
				// Check if we need to add a line
				if(!line.el){
					line.el = svgEl("path");
					line.el.classList.add('line');
					setAttr(line.el,{'d':'M0 0 L 100,100','stroke':(attr.line.color||'black')});
					add(line.el,this.el); // Add it to the element
					// Create an animation for the line
					line.animate = new Animate(line.el);
					line.el.addEventListener('click',selectSeries);
				}
				setAttr(line.el,{'style':(attr.line.show ? 'display:block':'display:none'),'stroke':(attr.line.color||'black'),'stroke-width':this.getStyle('line','stroke-width'),'stroke-linecap':this.getStyle('line','stroke-linecap'),'stroke-linejoin':this.getStyle('line','stroke-linejoin'),'stroke-dasharray':this.getStyle('line','stroke-dasharray'),'fill':this.getStyle('line','fill'),'vector-effect':'non-scaling-stroke'});
				// Remove extraneous points
				if(pts.length > data.length){
					for(c = pts.length-1; c >= data.length; c--){
						pts[c].el.remove();
						pts.pop();
					}
				}
				// Add new points
				if(pts.length < data.length){
					for(i = pts.length; i < data.length; i++){
						pt = svgEl("circle");
						o = {'cx':0,'cy':0,'data-i':i,'tabindex':0};
						o[lbl+'-series'] = s+1;
						setAttr(pt,o);
						pts[i] = {'el':pt,'title':svgEl("title"),'old':{}};
						if(!data[i].label) data[i].label = "Point "+(i+1);
						if(!attr.tooltip) attr.tooltip = {};
						txt = data[i].label+": "+data[i].y.toFixed(2);
						if(typeof attr.tooltip.label==="function") txt = attr.tooltip.label.call(pt,{'series':attr,'i':i,'data':data[i]});
						else if(typeof attr.tooltip.label==="string") txt = attr.tooltip.label;
						pts[i].title.innerHTML = txt;
						add(pts[i].title,pt);

						if(attr.tooltip.label){
							pt.addEventListener('mouseover',function(e){ e.target.focus(); });
							pt.addEventListener('focus',ptooltip);
						}
						pt.addEventListener('click',function(e){
							var i = parseInt(e.target.getAttribute('data-i'));
							if(data[i]) onClick(e.target,i);
							else console.error('Bad click '+i,e);
						});
						add(pt,this.el);
						// Add animations
						pts[i].c = new Animate(pts[i].el);
					}
					if(attr.line.label){
						label = svgEl("text");
						label.innerHTML = attr.title;
						var props = getXY(data[pts.length-1].x,data[pts.length-1].y);
						props['dominant-baseline'] = "middle";
						props.fill = (attr.line.color||'black');
						if(attr.line.label.padding) props.x += attr.line.label.padding;
						setAttr(label,props);
						add(label,this.el);
					}
				}

				// Update points
				p = [];
				for(i = 0; i < pts.length; i++){
					r = (attr['stroke-width']||1)/2;
					if(attr.points){
						if(typeof attr.points.size==="number") r = Math.max(attr.points.size,r);
						if(typeof attr.points.size==="function") r = attr.points.size.call(pt,{'series':s,'i':i,'data':data[i]});
					}
					setAttr(pts[i].el,{'r':r,'fill':attr.points.color,'fill-opacity':attr.points['fill-opacity'],'stroke':attr.points.stroke,'stroke-width':attr.points['stroke-width']});
					ps = getXY(data[i].x,data[i].y);
					p.push(ps);

					// Update point position
					pts[i].c.set({'cx':{'from':pts[i].old.x||null,'to':ps.x},'cy':{'from':pts[i].old.y||null,'to':ps.y}});
					pts[i].old = ps;
				}

				// Update animation
				line.animate.set({'d':{'from':path,'to':p}});

				// Store a copy of the current path
				path = clone(p);
				return this;
			};
			this.remove = function(){
				if(line.el.parentNode) line.el.parentNode.removeChild(line.el);
				for(i = 0; i < pts.length; i++){
					if(pts[i].el.parentNode) pts[i].el.parentNode.removeChild(pts[i].el);
				}
			};

			this.setData(data);
			this.setProperties(props);
			add(this.el,svg);

			return this;
		}
		function Animate(e,attr){
			var sty,tag,as;
			sty = window.getComputedStyle(el);
			tag = e.tagName.toLowerCase();
			if(!attr) attr = {};
			as = {};
			// Find duration
			if(sty['animation-duration']) this.duration = sty['animation-duration'];
			if(attr.duration) this.duration = attr.duration;
			if(!this.duration) this.duration = duration;
			this.duration = parseFloat(this.duration);
			this.set = function(props){
				var n,i,a2,b2,a,b;
				e.querySelectorAll('animate').forEach(function(ev){ ev.parentNode.removeChild(ev); });
				for(n in props){
					if(n){
						a = props[n].from||"";
						b = props[n].to;
						if(!a && as[n]) a = as[n].value;
						a2 = null;
						b2 = null;
						if(tag=="path"){
							a2 = "";
							b2 = "";
							for(i = 0; i < a.length; i++) a2 += (i>0 ? 'L':'M')+a[i].x.toFixed(2)+','+a[i].y.toFixed(2);
							for(i = 0; i < b.length; i++) b2 += (i>0 ? 'L':'M')+b[i].x.toFixed(2)+','+b[i].y.toFixed(2);
							if(!a2) a2 = null;
						}else{
							if(a) a2 = clone(a);
							b2 = clone(b);
						}
						if(this.duration && a2!==null){
							// Create a new animation
							if(!as[n]) as[n] = {};
							as[n].el = svgEl("animate");
							setAttr(as[n].el,{"attributeName":n,"dur":(this.duration||0),"repeatCount":"1"});
							add(as[n].el,e);
						}
						// Set the final value
						e.setAttribute(n,b2);
						if(this.duration && a2!==null){
							setAttr(as[n].el,{"from":a2,"to":b2,"values":a2+';'+b2}); 
							as[n].el.beginElement();
							as[n].value = b;
						}
					}
				}
				return this;
			};
			return this;
		}
		this.addSeries = function(d,attr){
			if(!d){ loader.error('No data in series'); return this; }
			if(!attr) attr = {};
			series.push(new Series(series.length,d,attr));
			updateRange();
			this.series = series;
			return this;
		};
		this.clear = function(){
			for(var s = 0; s < series.length; s++) series[s].remove();
			series = [];
			this.series = [];
			return this.draw();
		};
		function updateRange(){
			xmin = 1e100;
			ymin = 1e100;
			xmax = -1e100;
			ymax = -1e100;			
			// Calculate graph range
			for(var s = 0; s < series.length; s++) series[s].updateRange();
			if(typeof axes.x.getProperty('min')==="number") xmin = axes.x.getProperty('min');
			if(typeof axes.x.getProperty('max')==="number") xmax = axes.x.getProperty('max');
			if(typeof axes.y.getProperty('min')==="number") ymin = axes.y.getProperty('min');
			if(typeof axes.y.getProperty('max')==="number") ymax = axes.y.getProperty('max');
		}
		function selectSeries(e){
			var s = parseInt(e.currentTarget.closest('g').getAttribute(lbl+'-series'))-1;
			for(var i = 0; i < series.length; i++){
				if(s==i) series[i].select();
				else series[i].deselect();
			}
			// Move series to top
			add(series[s].el,series[s].el.closest('svg'));
			if(key) add(key.el,key.el.closest('svg'));
			// Keep tooltip on top
			qs(e.target.parentNode,'circle').focus();
			add(fo,svg);
		}
		this.draw = function(){
			var t,i,fs,pd,hkey,wkey,x,y,s,text,line,circ,p,cl;

			clearTooltip();

			updateRange();

			// Update axes
			axes.x.update();
			axes.y.update();

			t = '<style>';
			t += '\t.'+lbl+'-series circle { transition: transform '+duration+' linear, r '+duration+' linear; }\n';
			t += '\t.'+lbl+'-series circle:focus { stroke-width: 4; }\n';
			t += '\t.'+lbl+'-series:hover path.line, .'+lbl+'-series.on path.line { cursor:pointer; }\n';
			for(i = 0; i < series.length; i++){
				series[i].update();
				t += '\t.'+lbl+'-series-'+(i+1)+':hover path.line, .'+lbl+'-series-'+(i+1)+'.on path.line { stroke-width: '+(series[i].getProperty('stroke-width-hover')||4)+'; }\n';
			}

			if(opt.key.show){
				fs = opt['font-size']||16;
				pd = opt.key.padding||5;
				hkey = (opt.key.label ? 1:0)*fs +(2*pd) + (series.length*fs);
				x = 0;
				y = 0;
				if(!key){
					key = {'el':svgEl("g"),'g':[],'border':svgEl("rect")};
					key.el.classList.add('key');
					setAttr(key.border,{'x':0,'y':opt.top,'width':w,'height':hkey});
					if(typeof opt.key.border==="object"){
						for(p in opt.key.border) key.border.setAttribute(p,opt.key.border[p]);
					}
					add(key.border,key.el);
					add(key.el,svg);
				}
	
				wkey = 0;
				for(s = 0; s < series.length; s++){
					if(!key.g[s]){
						key.g[s] = svgEl("g");
						key.g[s].setAttribute(lbl+'-series',s);
						// Update class of line
						cl = [lbl+'-series',lbl+'-series-'+(s+1)];
						if(series[s].getProperty('class')) cl.concat(series[s].getProperty('class').split(/ /));
						addClasses(key.g[s],cl);

						add(key.g[s],key.el);
						key.g[s].addEventListener('mouseover',selectSeries);
					}
					key.g[s].innerHTML = '<text><tspan dx="'+(fs*2)+'" dy="0">'+(series[s].getProperty('title')||"Series "+(s+1))+'</tspan></text><path d="M0 0 L 1 0" class="line" class="" stroke-width="3" stroke-linecap="round"></path><circle cx="0" cy="0" r="5" fill="silver"></circle>';
					wkey = Math.max(wkey,key.g[s].getBoundingClientRect().width);
				}

				x = (w-opt.right-wkey-pd);
				y = (opt.top);
				setAttr(key.border,{'x':x,'width':wkey+pd});
				y += pd;
				x += pd;
				for(s = 0; s < series.length; s++){
					text = qs(key.g[s],'text');
					line = qs(key.g[s],'path');
					circ = qs(key.g[s],'circle');
					text.setAttribute('x',x);
					text.setAttribute('y',(y + s*fs + fs*0.2));
					if(typeof opt.key.text==="object"){
						for(p in opt.key.text) text.setAttribute(p,opt.key.text[p]);
					}
					line.setAttribute('d','M'+(x)+','+(y+(0.5+s)*fs)+' l '+(fs*1.5)+' 0');
					p = series[s].getProperties();
					setAttr(circ,{'cx':(x+fs*0.75),'cy':(y+(0.5+s)*fs),'fill':(p.points.color||""),'stroke-width':p.points['stroke-width']||0,'stroke':p.points.stroke||""});
					if(p.line.color) line.setAttribute('stroke',p.line.color);
				}
			}
			t += '\t.'+lbl+'-grid.'+lbl+'-grid-x .'+lbl+'-grid-title,.'+lbl+'-grid.'+lbl+'-grid-y .'+lbl+'-grid-title { text-anchor: middle; dominant-baseline: central; }\n';
			t += '\t.'+lbl+'-grid.'+lbl+'-grid-x text { dominant-baseline: hanging; }\n';
			t += '\t.'+lbl+'-grid.'+lbl+'-grid-y text { dominant-baseline: '+((opt.axis.y.labels ? opt.axis.y.labels.baseline : '')||"middle")+'; }\n';
			t += '\t.'+lbl+'-tooltip { background: black; color: white; padding: 0.25em 0.5em; margin-top: -1em; transition: left 0.1s linear, top 0.1s linear; border-radius: 4px; white-space: nowrap; }\n';
			t += '\t.'+lbl+'-tooltip::after { content: ""; position: absolute; bottom: auto; width: 0; height: 0; border: 0.5em solid transparent; left: 50%; top: 100%; transform: translate3d(-50%,0,0); border-color: transparent; border-top-color: black; }\n';
			t += '\t</style>\n';
			if(defs) defs.innerHTML = t;

			return this;
		};

		loader.remove();

		return this;
	}
	// Recursively merge properties of two objects 
	function merge(obj1, obj2){
		for(var p in obj2){
			try{
				if(obj2[p].constructor==Object) obj1[p] = merge(obj1[p], obj2[p]);
				else obj1[p] = obj2[p];
			}catch(e){ obj1[p] = obj2[p]; }
		}
		return obj1;
	}
	function qs(el,t){ return el.querySelector(t); }
	function add(el,to){ return to.appendChild(el); }
	function clone(a){ return JSON.parse(JSON.stringify(a)); }
	function setAttr(el,prop){
		for(var p in prop) el.setAttribute(p,prop[p]);
		return el;
	}
	function addClasses(el,cl){
		for(var i = 0; i < cl.length; i++) el.classList.add(cl[i]);
		return el;
	}
	function Loader(_parent){
		// Version 1.1
		var el = document.createElement('div');
		el.classList.add('spinner');
		el.setAttribute('style','position:absolute;left:50%;top:50%;transform:translate3d(-50%,-50%,0);');
		add(el,_parent);
		this.loading = function(){ el.innerHTML = 'Loading...'; return this; };
		this.loaded = function(){ el.innerHTML = ''; return this; };
		this.remove = function(){ if(el){ el.parentNode.removeChild(el); } return this; };
		this.error = function(msg){ if(el){ console.error(msg); el.innerHTML = '<span class="error">ERROR: '+msg+'</span>'; } return this; };
		return this;
	}
	OI.linechart = function(el,attr){ return new LineChart(el,attr); };
	root.OI = OI;
})(window || this);
