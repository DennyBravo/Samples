var cClip = Backbone.Model.extend({

	defaults: {
		title: null,
		video_id: null
	},

	templates: {
		preview: "http://img.youtube.com/vi/{$video_id}/0.jpg",
		link: "http://www.youtube.com/watch?v={$video_id}",
		embed: '<iframe width="1000" height="668" src="https://www.youtube.com/embed/{$video_id}" frameborder="0" allowfullscreen></iframe>'
	},

	getPreview: function(){
		return System.fillPlaceholders(this.templates.preview, {video_id: this.get('video_id')});
	},

	getVideoCode: function(){
		return System.fillPlaceholders(this.templates.embed, {video_id: this.get('video_id')});
	},

	getLink: function(){
		return System.fillPlaceholders(this.templates.link, {video_id: this.get('video_id')})
	},

	getInfo: function(callback){
		var self = this;

		$.getJSON("https://www.googleapis.com/youtube/v3/videos", {
			key: "AIzaSyAVrVnfsDfGuGDKg_qflraCCbWQCLCw8SM",
			part: "snippet,statistics",
			id: this.get('video_id')
		}, function(data){
			callback.call(self, data);
		});
	},

	initialize: function(){
		if (this.attributes['video_id'])
			this.set('video_id', this.attributes['video_id']);

		if (this.attributes['title']){
			this.set('title', this.attributes['title']);
		}else{
			this.getInfo(function(data){
				this.set('title', data.items[0].snippet.title);
				try{

				}catch(e){}
			});
		}
	},

	serialize: function(){
		return {
			title: this.get('title'),
			video_id: this.get('video_id')
		};
	}

});

var cClipList = Backbone.Model.extend({

	defaults: {
		$dataProvider: null,
		parser_link: null,
		page_id: null,
		items: {},
		sort: []
	},

	initialize: function(){
		var keys = this.keys(),
			$provider = this.get('$dataProvider'),
			updatePatch = {};

		keys.forEach(function(key){
			if (key != '$dataProvider' && $provider.data(key) !== undefined){
				if (key == 'items'){
					var items = {};
					_.each($provider.data(key), function(itemData){
						items[itemData['video_id']] = new cClip({
							title: itemData['title'] || "",
							video_id: itemData['video_id']
						});
					});
					updatePatch[key] = items;
				}else{
					updatePatch[key] = $provider.data(key);
				}
			}
		}, this);

		this.set(updatePatch);
	},

	onChangeItem: function(e){
		this.trigger('change', e);
	},

	addItem: function(item){
		var items = _.clone(this.get('items')),
			sort = _.clone(this.get('sort')),
			video_id = item.get('video_id');

		if (typeof items.length === "number")
			items = {};

		if (items[video_id] === undefined){
			item.on('change', this.onChangeItem, this);

			sort.push(video_id);
			this.set('sort', sort);

			items[video_id] = item;
			this.set('items', items);
		}else{
			//message about double
		}
	},

	removeItem: function(video_id){
		var sort = _.clone(this.get('sort')),
			index = sort.indexOf(video_id);

		sort.splice(index, 1);
		this.set({'sort': sort});

		var items = _.clone(this.get('items'));
		delete items[video_id];
		this.set({'items': items});
	},

	serialize: function(){
		var items = this.get('items'),
			serialized = [];
		_.each(items, function(item, key){
			serialized.push(item.serialize());
		});
		return serialized;
	},

	sync: function(){
		$.post(
			'/api/Page/Save/',
			{
				page_id: this.get('page_id'),
				data: {
					html: "",
					items: this.serialize(),
					sort: this.get("sort")
				}
			},
			function(data){
				if (data.result){
					swal({
						title: 'Success!',
						text: 'Page saved successfully',
						type: 'success'
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

var cCLipView = Backbone.View.extend({

	el: 'body',

	vars: {
		template: "<li class='clips-edit-item' data-video_id='{$video_id}'>" +
					"<div class='clips-edit-preview' style='background-image:url(\"{$preview}\")'></div>" +
					"<div class='clips-edit-title'>" +
						"<input type='text' data-role='input' data-key='title' data-video_id='{$video_id}' placeholder='Video title' value='{$title}' />" +
						"<i data-role='remover' data-video_id='{$video_id}' class='fa fa-remove fa-2x'></i>" +
					"</div>" +
					"<div class='clips-edit-link'>" +
						"<input type='text' data-role='input' data-key='link' data-video_id='{$video_id}' placeholder='Video link' value='{$link}' />" +
					"</div>" +
				"</li>"
	},

	dom: {},

	events: {
		"keyup *[data-role='parser']": "parseInputLink",
		"keyup *[data-role='input']": "changeTextValue",
		"click *[data-role='remover']": "removeItemFromModel",
		"click a[data-action='save-data']": "saveModelRequest"
	},

	parseInputLink: function(e){
		this.dom['parser_link'].removeClass('error');
		if (!e.target.value) return;

		var reg = new RegExp(/http[s]*:\/\/www\.youtube\.com\/watch\?v=([a-z0-9_-]{11})/i),
			result = reg.exec(e.target.value);

		if (result){
			this.model.addItem(new cClip({video_id: result[1]}));
			this.dom['parser_link'].val("");
		}else{
			this.dom['parser_link'].addClass('error');
		}
	},

	changeTextValue: function(e){
		var video_id = e.target.getAttribute('data-video_id'),
			key = e.target.getAttribute("data-key"),
			item = this.model.get("items")[video_id],
			value = e.target.value,
			changes = {};

		if (item){
			changes[key] = value;
			item.set(changes, {silent:true});
		}
	},

	removeItemFromModel: function(e){
		var video_id = e.target.getAttribute('data-video_id'),
			key = e.target.getAttribute("data-key"),
			item = this.model.get("items")[video_id],
			value = e.target.value,
			changes = {},
			self = this;

		swal({
			title: "Are you sure?",
			type: "warning",
			showCancelButton: true,
			confirmButtonColor: "#DD6B55",
			confirmButtonText: "Yes, delete it!"
		}, function(){
			self.model.removeItem(e.target.getAttribute('data-video_id'));
		});
	},

	removeItemFromLayout: function(video_id){
		var $el = this.dom['items'].find(".clips-edit-item[data-video_id='" + video_id + "']");
		$el.remove();
	},

	initialize: function(){
		var self = this;

		this.model.keys().forEach(function(key){
			//console.error(this.dom);
			if (!this.dom[key])
				this.dom[key] = $('*[data-key="' + key + '"]');
		}, this);

		this.model.on('change', function(e){
			self.onChangeModelValue(e);
		});
		this.onChangeModelValue(this.model);
	},

	onChangeModelValue: function(event){
		_.each(event.changed, function(value, key){
			if (this.render[key] !== undefined){
				this.render[key].call(this, value, event);
			}
		}, this);
	},

	saveModelRequest: function(){
		this.model.sync();
	},

	render: {
		items: function(items){

			var renderedItems = [];
			$('.clips-edit-item').each(function(index, item){
				renderedItems.push($(item).data('video_id'));
			});

			var itemsForRender = [];
			this.model.get('sort').forEach(function(itemId){
				if (renderedItems.indexOf(parseInt(itemId)) == -1 && items[itemId]){
					itemsForRender.push(items[itemId]);
				}
			}, this);

			itemsForRender.forEach(function(item){
				if (renderedItems.indexOf(item.get("video_id")) > -1) return;

				var html = System.fillPlaceholders(this.vars.template, {
						video_id: item.get('video_id'),
						preview: item.getPreview(),
						link: item.getLink(),
						title: item.get('title') || ""
					});

				this.dom['items'].prepend(html);
			}, this);

			var keys = Object.keys(items);
			renderedItems.forEach(function(itemId){
				if (keys.indexOf(itemId.toString()) == -1)
					this.removeItemFromLayout(itemId);
			}, this);
		},
		title: function(title, item){
			var $el = this.dom['items'].find("*[data-key='title'][data-video_id='" + item.get('video_id') + "']");
			$el.val(title || "");
		}
	}

});

$(function(){
	(function() {
		/* data models */
		var clipListModel = this.clips = new cClipList({
			$dataProvider: $('#clips-view')
		});
		var clipGallery = new cCLipView({
			model: clipListModel
		});
	}).call(window);
});

