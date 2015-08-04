var cSetting = Backbone.Model.extend({

	defaults: {
		id: null,
		name: null,
		label: null,
		value: null
	},

	serialize: function(){
		var serialized = {};
		this.keys().forEach(function(key){
			serialized[key] = this.get(key);
		}, this);
		return serialized;
	}

});

var cSettingsList = Backbone.Model.extend({

	defaults: {
		$dataProvider: null,
		items: {}
	},

	initialize: function(){
		var $provider = this.get('$dataProvider'),
			updatePatch = {};

		this.keys().forEach(function(key){
			if (key != '$dataProvider' && $provider.data(key) !== undefined){
				if (key == 'items'){
					var items = {};
					_.each($provider.data(key), function(itemData){
						var setting = new cSetting({
							id: itemData['id'],
							name: itemData['name'],
							label: itemData['label'],
							value: itemData['value']
						});
						items[itemData['name']] = setting;
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
			'/api/Setting/Save/',
			{
				items: this.serialize()
			},
			function(data){
				if (data.result){
					swal({
						title: 'Success!',
						text: 'Settings saved successfully',
						type: 'success'
					});
				}else{
					swal({
						title: 'Error!',
						text: 'Something wrong. Settings NOT saved',
						type: 'error'
					});
				}
			}
		);
	}

});

var cSettingsView = Backbone.View.extend({

	el: 'body',

	vars: {
		template: "<li class='setting-edit-item' data-id='{$id}'>" +
						"<div class='label'>" +
							"<span>{$label}</span>" +
						"</div>" +
						"<div class='input-container'>" +
							"<input type='text' data-role='input' data-key='value' data-name='{$name}' value='{$value}' placeholder='{$name}' />" +
						"</div>" +
					"</li>"
	},

	dom: {},

	events: {
		"keyup *[data-role='input']": "changeTextValue",
		"click a[data-action='save-data']": "saveModelRequest"
	},

	initialize: function(){
		var self = this;

		this.model.keys().forEach(function(key){
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

	changeTextValue: function(e){
		var name = e.target.getAttribute('data-name'),
			key = e.target.getAttribute("data-key"),
			item = this.model.get("items")[name],
			value = e.target.value,
			changes = {};

		if (item){
			changes[key] = value;
			item.set(changes, {silent:true});
		}
	},

	saveModelRequest: function(){
		this.model.sync();
	},

	render: {
		items: function(items){

			var renderedItems = [];
			$('.setting-edit-item').each(function(index, item){
				renderedItems.push($(item).data('id'));
			});

			var itemsForRender = [];
			_.each(this.model.get('items'), function(item, key){
				if (renderedItems.indexOf(parseInt(key)) == -1){
					itemsForRender.push(item);
				}
			}, this);

			itemsForRender.forEach(function(item){
				if (renderedItems.indexOf(item.get("id")) > -1) return;

				var html = System.fillPlaceholders(this.vars.template, {
					id: item.get('id'),
					name: item.get('name'),
					label: item.get('label'),
					value: item.get('value')
				});

				this.dom['items'].prepend(html);
			}, this);

			var keys = Object.keys(items);
			renderedItems.forEach(function(itemId){
				if (keys.indexOf(itemId.toString()) == -1)
					this.removeItemFromLayout(itemId);
			}, this);
		}
	}

});

$(function(){
	(function(){
		var settingsListModel = this.model = new cSettingsList({
			$dataProvider: $('#settings-edit')
		});
		var settingsListView = this.view = new cSettingsView({
			model: settingsListModel
		});
	}).call(window);
});