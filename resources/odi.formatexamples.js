(function(root){

	var ODI = root.ODI || {};
	if(!ODI.ready){
		ODI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}

	// Update anchor now that we've updated the page		
	if(location.hash) document.location = location.hash;

	var d = new Date(document.lastModified);
	str = d.toUTCString().replace(/[^\,]+\, /,"").replace(/ [0-9]{2}\:[0-9]{2}\:[0-9]{2} [^\s]+/,"").replace(/^0/,"");

	function tidy(t){ return t.replace(/===NEWLINE===/g,"\n").replace(/\n*$/,"").replace(/^\n*/,"").replace(/[\n\t]*$/,""); }
	function sanitise(t){ return t.replace(/\</g,"&lt;").replace(/\>/g,"&gt;"); }
	function deindent(t){ var n = 0; for(i = 0; i < t.length; i++){ if(t[i]=='\t'){ n++; }else{ break; } } return t.replace(new RegExp("(^|\n)[\\t]{"+n+"}",'g'),function(m,p1){ return p1; }); }

	function highlight(el){

		html = el.innerHTML;

		// Add styling to code blocks
		if(typeof hljs !== 'undefined'){
			hljs.highlightBlock(el);

			// Get the final markup
			markup = el.innerHTML;

			// Make JSON files into links
			markup = markup.replace(/([\"\'])([^\"\']*\.json)([\"\'])/g,function(m,p1,p2,p3){ return p1+'<a href="'+p2+'">'+p2+'</a>'+p3; });
			
			markup = deindent(markup).replace(/[\n\t]*$/,"").replace(/^[\n\t]*/,"");

			// Add back to the document
			el.innerHTML = markup;
		}
	}

	function makeExamples(examples,opt){
		if(!opt) opt = {};
		if(!opt.order) opt.order = ["how","result"];

		for(var i = 0; i < examples.length; i++){
			html = examples[i].innerHTML;
			css = "";
			js = "";
			json = "";
			temp = html.replace(/\n/g,"===NEWLINE===").replace(/<!-- HTML -->/i,"");
			temp = temp.replace(/<!-- Javascript -->/i,"").replace(/<script>(.*)<\/script>/,function(m,p1){
				js = js+tidy(p1);
				return "";
			})
			
			temp = temp.replace(/<!-- CSS -->/i,"").replace(/<style>(.*)<\/style>/,function(m,p1){
				css = tidy(p1);
				return "";
			});
			css = (css);
			js = (js);

			code = sanitise((tidy(temp)));
			code = code.replace(/(src|href)=\"([^\"]+)\"/g,function(m,p1,p2){ return p1+'="<a href="'+p2+'">'+p2+'</a>"'; });
			
			showtitle = true;
			if(examples[i].getAttribute('data-title')=="false") showtitle = false;

			output = (showtitle ? '<h3>How to do it</h3>':'')+(css ? (showtitle ? '<h4>CSS</h4>':'')+'<pre class="prettyprint lang-css">'+(sanitise(css))+'</pre>':'')+(js ? (showtitle ? '<h4>Javascript</h4>':'')+'<pre class="prettyprint lang-js">'+(sanitise(js))+'</pre>':'')+(code && showtitle ? '<h4>HTML</h4>':'')+(code ? '<pre class="prettyprint lang-html">'+(code)+'</pre>':'');

			div = document.createElement('div');
			div.classList.add('howto');
			div.innerHTML = (opt.order[0] == "how" ? output+'<h3>Result</h3>' : output);

			// Append the 'How to do it' content
			if(opt.order[0] == "how") examples[i].insertBefore(div,examples[i].firstChild);
			else examples[i].appendChild(div);

			examples[i].querySelectorAll('.prettyprint').forEach(function(e){ highlight(e); });
		}
	}

	ODI.ready(function(){
		// Style any existing prettyprint areas
		pretty = document.querySelectorAll('.prettyprint');
		pretty.forEach(function(e){ highlight(e); });
		
		// Format examples nicely to show how they were done
		var examples = document.querySelectorAll('.example-code');
		makeExamples(examples,{"order":["result","how"]});
	});
	root.ODI = ODI;
})(window || this);