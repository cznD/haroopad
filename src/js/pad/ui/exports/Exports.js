define([
		'viewer/Viewer',
		'txt!tpl/exports.html'
	],
	function(Viewer, html) {
		var fs = require('fs'),
			path = require('path'),
			os = require('os'),
			CleanCss = require('clean-css');
		var gui = require('nw.gui');
		var manifest = global.Manifest;
		var saveEl = $("#exportHTML");
		var cleanCss = new CleanCss();
		var shadow = document.createElement('body');
				shadow.style.display = 'none';

		var res;
		
		function save(file) {
			if(path.extname(file).indexOf('.htm') < 0) {
				file += '.html';
			}

			if(fs.existsSync(file)) {
				//TODO overwriting confirm dialog
				fs.writeFileSync(file, res, 'utf8');
			} else {
				fs.writeFileSync(file, res, 'utf8');
			}
		}

		function _clone() {
			var contentDocument = Viewer.getContentDocument();

			shadow.setAttribute('class', contentDocument.body.getAttribute('class'));
			shadow.innerHTML = contentDocument.getElementById('root').innerHTML;
		}

		function getGenerator() {
			return manifest.name +' '+ manifest.version;
		}

		function getStyleSheets() {
			var href, cssText = '';
			var contentDocument = Viewer.getContentDocument();

			_.each(contentDocument.styleSheets, function(item) {
				href = item.href;

				if (!href) {
					cssText += item.ownerNode.innerHTML;
					return;
				}
				
				href = href.split('?')[0];
				href = decodeURIComponent(href);
				href = href.replace('file:///', '');

				if (getPlatformName() !== 'windows') {
					href = '/' + href;
				}

				if (fs.existsSync(href)) {
					cssText += fs.readFileSync(href, 'utf8');
				}
			});
			
			cssText += '\n footer {position:fixed; font-size:.8em; text-align:right; bottom:0px; margin-left:-25px; height:20px; width:100%;}';
			cssText = cleanCss.minify(cssText);

			//exception user-style theme
			cssText = cssText.replace(new RegExp('#root', 'g'), '.markdown');

			return cssText;
		}

		function _replaceOriginalEmbed() {
			var str, type, provider, 
					tweets = shadow.querySelectorAll('[data-provider=twitter]');
	  			tweets = Array.prototype.slice.call(tweets, 0);

			_.each(tweets, function(tweet) {
				tweet.innerHTML = tweet.getAttribute('data-replace');
			});
		}

		function _removeDataProperties() {
			var frags, attrs;

			frags = shadow.querySelectorAll(':scope>*');
			frags = Array.prototype.slice.call(frags, 0);

			_.each(frags, function(el) {
				el.removeAttribute('data-url');
				el.removeAttribute('data-prop');
				el.removeAttribute('data-replace');
				el.removeAttribute('data-type');
				el.removeAttribute('data-provider');
				el.removeAttribute('data-origin');
			});
		}

		/**
		 * replace data-echo
		 */
		function _replaceLazyLoading() {
			var frags, data;
			frags = shadow.querySelectorAll('[data-echo]');
			frags = Array.prototype.slice.call(frags, 0);

			_.each(frags, function(frag) {
				data = frag.getAttribute('data-echo');
				frag.setAttribute('src', data);
				frag.removeAttribute('data-echo');
			});
		}

		/**
		 * replace absolute path to relative path
		 */
		function _replaceAbsolutePath() {
			var els, prefx = process.platform != 'win32' ? 'file://' : 'file:///',
					dirname = nw.file.get('dirname'),
					dirname = process.platform != 'win32' ? dirname : dirname.replace(/\\/g, '/'),
					re = new RegExp(prefx + dirname +'/', 'g');

			els = shadow.querySelectorAll('img[src], source[src]');
			els = Array.prototype.slice.call(els, 0);

			els.forEach(function(el) {
				el.src = el.src.replace(re, '');
			});
		}


		function getBodyHtml() {
			_replaceOriginalEmbed();
			_removeDataProperties();
			_replaceLazyLoading();

			shadow.removeAttribute('style');

			return shadow.innerHTML;
		}

		function getBodyClass() {
			return shadow.getAttribute('class');
		}

		function getTitle() {
			var title = nw.file.get('title');
			var basename = nw.file.get('basename');
			var extname = nw.file.get('extname');
			
			title = basename ? basename.replace(extname, '') : title;
			title = title || i18n.t('pad:untitled');
			title += '.html';

			return title;
		}

		function getFooterHtml() {
			return _glo.exportHtmlFooter();
		}

		function saveHandler(e) {
			var file = $(e.target).val();
			var title = getTitle();

			if (nw.file.get('dirname') == path.dirname(file)) {
				_replaceAbsolutePath();
			}

			res = html.replace('@@style', getStyleSheets());
			res = res.replace('@@body', getBodyHtml());
			res = res.replace('@@class', getBodyClass());
			res = res.replace('@@footer', getFooterHtml());
			res = res.replace('@@title', title);
			res = res.replace('@@generator', getGenerator());

			save(file);

			saveEl.off('change', saveHandler);
			saveEl.val("");
		}

		window.ee.on('file.exports.html', function() {
			var title = getTitle();

			_clone();

  		saveEl.attr('nwsaveas', title );
  		saveEl.attr('nwworkingdir', nw.file.get('dirname') );
			saveEl.trigger("click");
			saveEl.on('change', saveHandler);
		});
});