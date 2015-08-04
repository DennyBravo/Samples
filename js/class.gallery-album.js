var cGalleryModel = Backbone.Model.extend({

	defaults: {
		title: null,
		description: null,
		html: null,
		cover: null,
		page_id: null,
		parent_id: null,
		page_type: null,
		items: {},
		sort: []
	},

	initialize: function(){
		var keys = this.keys(),
			$provider = this.get('$dataProvider'),
			updatePatch = {};

		keys.forEach(function(key){
			if (key != '$dataProvider'){
				updatePatch[key] = $provider.data(key);
			}
		}, this);

		this.set(updatePatch);
	},

	addPictureItem: function(item){
		var items = _.clone(this.get('items')),
			sort = _.clone(this.get('sort')),
			newImageId = item['imageId'];

		if (typeof items.length === "number")
			items = {};

		if (items[newImageId] === undefined){
			sort.push(newImageId);
			this.set('sort', sort);

			items[newImageId] = item;
			this.set('items', items);
		}else{
			//message about double
		}
	}
});

var cGalleryEditorModel = cGalleryModel.extend({
	changeGalleryCover: function(cover){
		this.set('cover', cover);
	},

	removePictureItem: function(itemId){
		var sort = _.clone(this.get('sort')),
			index = sort.indexOf(itemId);
		sort.splice(index, 1);
		this.set({'sort': sort});

		var items = _.clone(this.get('items'));
		delete items[itemId];
		this.set({'items': items});
	},

	getClearedData: function(){
		var data = {};
		data['title'] = this.get('title');
		data['description'] = this.get('description').replace(/\"/gi, "\\\"");
		data['html'] = this.get('html');
		data['page_id'] = this.get('page_id');
		data['parent_id'] = this.get('parent_id');
		data['page_type'] = this.get('page_type');
		data['cover'] = this.get('cover');
		data['sort'] = this.get('sort');

		data['items'] = _.clone(this.get('items'));
		_.each(data['items'], function(item, id){
			delete item.isRendered;
		}, this);

		return data;
	},

	getContent: function(html, length){
		var replaced = html
			.replace(/<br[\/ ]*>/gi, "\n")
			.replace(/[\n]+/gi, "\n")
			.replace(/<[^>]*>/gi, "");

		if (length){
			if (replaced.length <= length){
				return replaced;
			}
			if (replaced[length] == " "){
				replaced = replaced.substr(0, length);
				return replaced + "...";
			}else{
				replaced = replaced.substr(0, length);
				replaced = replaced.substr(0, replaced.lastIndexOf(" "));
				return replaced + "...";
			}
		}

		return replaced;
	},

	sync: function(){
		$.post(
			'/api/Page/Save/',
			{
				title: this.get('title'),
				description: this.getContent(this.get('description'), 250),
				page_id: this.get('page_id'),
				data: this.getClearedData(),
				parent_id: this.get('parent_id'),
				page_type: this.get('page_type')
			},
			function(data){
				if (data.result){
					swal({
						title: 'Success!',
						text: 'Page saved successfully',
						type: 'success'
					}, function(){
						var sPath = location.pathname.split("/").slice(0, -2).join("/") + "/";
						location.assign(sPath);
					});
				}else{
					swal({
						title: 'Error!',
						text: 'Something wrong. Page NOT saved',
						type: 'error'
					});
				}
			}
		);
	}
});

var cGalleryRenderer = {
	items: function(items){
		var renderedItems = [];
		$('.gallery-item').each(function(index, item){
			renderedItems.push($(item).data('id'));
		});

		//console.error(this.model.get('sort').reverse());

		var itemsForRender = [];
		this.model.get('sort').forEach(function(itemId){
			if (renderedItems.indexOf(parseInt(itemId)) == -1 && items[itemId]){
				itemsForRender.push(items[itemId]);
			}
		}, this);

		itemsForRender.forEach(function(item){
			if (renderedItems.indexOf(parseInt(item["imageId"])) > -1) return;

			var mainClass = parseInt(item['width']) > parseInt(item['height']) ? 'horizontal' : 'vertical',
				html = System.fillPlaceholders(this.vars.template, {
					cls: mainClass,
					id: item['imageId'],
					src: item['filelink']
				});

			this.dom['items'].prepend(html);

			//item.isRendered = true;
		}, this);

		var keys = Object.keys(items);
		renderedItems.forEach(function(itemId){
			if (keys.indexOf(itemId.toString()) == -1)
				this.removeItemFromLayout(itemId);
		}, this);

		//this.model.set('items', items, {silent: true}); //@todo: wtf? dont need set to model
	},
	title: function(title){
		this.dom['title'].val(title);
	},
	description: function(description){
		this.dom['description'].val(description);
	},
	extend: function(object){
		return _.extend(_.clone(this), object);
	}
};

var cGalleryEditorRenderer = cGalleryRenderer.extend( {
	cover: function(cover){
		this.dom['cover'].attr('src', cover['square300']);
	}
});

var cBlogEditorRenderer = cGalleryEditorRenderer.extend({
	description: function(description){
		this.dom['description'].redactor('code.set', description || "");
	}
});

var cGallery = Backbone.View.extend({

	el: 'body',

	vars: {
		template: "<div class='gallery-item {$cls}' data-id='{$id}' style='background-image:url(\"{$src}\")'>" +
			"<i data-role='remover' data-id='{$id}' class='fa fa-remove fa-2x'></i>" +
			"</div><!-- -->"
	},

	dom: {},

	initialize: function(){
		var self = this;

		//extend options to this View
		_.each(this.options, function(value, key){
			if (['model'].indexOf(key) == -1){
				_.extend(this[key], this.options[key]);
			}
		}, this);

		this.model.keys().forEach(function(key){
			//console.error(this.dom);
			if (!this.dom[key])
				this.dom[key] = $('*[data-key="' + key + '"]');
		}, this);

		this.model.on('change', function(e){
			self.onChangeModelValue(e.changed);
		});
		this.onChangeModelValue(this.model.changed);
	},

	onChangeModelValue: function(changed){
		_.each(changed, function(value, key){
			if (this.render[key] !== undefined){
				this.render[key].call(this, value);
			}
		}, this);
	},

	render: cGalleryRenderer
});

var cGalleryEditor = cGallery.extend({

	events: {
		"keyup *[data-role='input']": "changeTextValue",
		"change *[data-role='input']": "changeTextValue",
		"click a[data-action='save-data'],a[data-action='add-new']": "saveModelRequest",
		"click *[data-role='remover']": "removeItemFromModel"
	},

	removeItemFromModel: function(e){
		var self = this;

		swal({
			title: "Are you sure?",
			type: "warning",
			showCancelButton: true,
			confirmButtonColor: "#DD6B55",
			confirmButtonText: "Yes, delete it!"
		}, function(){
			self.model.removePictureItem(e.target.getAttribute('data-id'));
		});
	},

	removeItemFromLayout: function(itemId){
		$('.gallery-item[data-id="' + itemId + '"]').remove();
	},

	changeTextValue: function(e){
		var changes = {};
		changes[e.target.name] = e.target.value;
		this.model.set(changes, {silent: true});
	},

	saveModelRequest: function(){
		this.model.sync();
	},

	render: cGalleryEditorRenderer
});

var cUploader = Backbone.Model.extend({

	view: null,

	dom: {
		$ghost: null,
		$caller: null
	},

	callback: {},

	initialize: function(){
		var self = this,
			callback = null,
			$lastCaller = null;

		_.each(this.attributes, function(value, key){
			if (['model', 'view'].indexOf(key) == -1){
				_.extend(this[key] = this.attributes[key]);
			}else{
				this[key] = this.attributes[key];
			}
		}, this);

		/* uploader */
		this.uploader  = new plupload.Uploader({
			runtimes : 'html5,flash,silverlight',
			browse_button : 'uploadPictureButtonGhost',
			multi_selection: false,
			container : 'body',
			max_file_size : '8mb',
			flash_swf_url : '/js/lib/plupload/plupload.flash.swf',
			silverlight_xap_url : '/js/lib/plupload/plupload.silverlight.xap',
			url: '/api/Image/Upload/',
			filters : [
				{title : "Picture", extensions : "jpg,jpeg,png"}
			]
		});

		this.dom.$ghost.on('mouseleave', function(){
			$(this).css({
				left: -300,
				top: -300
			});
			$lastCaller = null;
		});

		this.dom.$caller.on('mouseenter', function(){
			var $el = $(this),
				offset = $el.offset();

			self.dom.$ghost.css({
				left: offset.left + parseInt(window.getComputedStyle($el[0], null).getPropertyValue('padding-left')),
				top: offset.top,
				width: $el.width(),
				height: $el.height()
			});

			function revertClass(){
				$el.removeClass('hover');
				self.dom.$ghost.off('mouseleave', revertClass);
			}

			$el.addClass('hover');
			self.dom.$ghost.on('mouseleave', revertClass);
			$lastCaller = $el;
		});

		self.dom.$ghost.on('click', function(){
			callback = self.callback[$lastCaller.data('uploader')];
		});

		self.uploader.init();
		self.uploader.bind('FilesAdded', function(up, files) {
			self.uploader.disabled = true;
			self.uploader.start();
		});
		self.uploader.bind('FileUploaded', function(Up, File, Response) {
			var result = $.parseJSON(Response.response);
			self.uploader.disabled = false;
			if (result.result && typeof(callback) === "function"){
				callback.call(self.view.model, result);
				callback = null;
			}
			self.uploader.refresh();
		});
		self.uploader.bind('Error', function(Up, ErrorObj) {
			self.uploader.disabled = false;
		});
	}
});